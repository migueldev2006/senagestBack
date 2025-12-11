import {
  Injectable,
  Logger,
  OnModuleInit,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { BrokerConfigService } from '../psicultura/Broker/broker-config.service';
import mqtt, { MqttClient } from 'mqtt';
import { ModuleRef } from '@nestjs/core';
import { PsiculturaService } from 'src/psicultura/psicultura.service';

interface PendingMessage {
  topic: string;
  payload: any;
}

@Injectable()
export class MqttService implements OnModuleInit {
  publishSignals(signal1: boolean, signal2: boolean) {
    if (!this.TOPIC_SIGNALS) {
      this.logger.warn('No hay tópico de señales configurado');
      return;
    }
    this.publish(this.TOPIC_SIGNALS, { signal1, signal2 });
  }
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient | null = null;

  private HOST = '';
  private PORT = 0;
  private USER = '';
  private PASS = '';
  private TOPIC_SIGNALS = '';
  private PROTOCOL = '';

  constructor(
    private readonly configService: BrokerConfigService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async onModuleInit() {
    await this.reloadFromDatabase();
  }

  async reloadFromDatabase() {
    const cfg = await this.configService.getActiveConfig();

    if (!cfg) {
      this.logger.warn('⚠ No hay configuración MQTT activa.');
      return;
    }

    // Datos que te proporcionaron
    this.HOST = cfg.url; // ej: 3f187645294a400cbe2d87a2ec16ec53.s1.eu.hivemq.cloud
    this.PORT = cfg.port || 8883; // TLS MQTT
    this.USER = cfg.username;
    this.PASS = cfg.password;
    this.TOPIC_SIGNALS = cfg.base_topic || 'signals';
    this.PROTOCOL = cfg.protocol;

    this.logger.log(
      `🔄 Cargando nueva configuración MQTT: ${this.HOST}:${this.PORT}`,
    );
    this.connect();
  }

  private connect() {
    if (this.client && this.client.connected) {
      this.logger.log('MQTT ya está conectado, no se reconecta.');
      return;
    }

    if (!this.HOST || !this.PORT) {
      this.logger.warn('Configuración MQTT incompleta, no se conecta.');
      return;
    }

    const options: any = {
      host: this.HOST,
      port: this.PORT,
      protocol: this.PROTOCOL,
      reconnectPeriod: 2000,
      rejectUnauthorized: false, // si no tienes certificado válido
    };

    if (this.USER) options.username = this.USER;
    if (this.PASS) options.password = this.PASS;

    this.logger.log(
      `🔌 Intentando conectar a MQTT: ${this.PROTOCOL}://${this.HOST}:${this.PORT}${this.USER ? ` (usuario: ${this.USER})` : ' (sin autenticación)'}`,
    );

    this.client = mqtt.connect(options);

    this.client.on('connect', async () => {
      this.logger.log(
        `✅ MQTT backend conectado exitosamente a ${this.PROTOCOL}://${this.HOST}:${this.PORT}`,
      );

      // Suscribirse a todos los topics configurados
      await this.subscribeToAllConfiguredTopics();
    });

    this.client.on('reconnect', () => {
      this.logger.warn('🔄 MQTT intentando reconectar...');
    });

    this.client.on('offline', () => {
      this.logger.warn('📴 MQTT offline - sin conexión');
    });

    this.client.on('error', (err) => {
      this.logger.error(`❌ Error MQTT: ${err.message}`, err);
    });

    this.client.on('close', () => {
      this.logger.warn(
        '🔌 MQTT conexión cerrada - esperando reconexión automática',
      );
    });

    this.client.on('message', async (topic, message, packet) => {
      const messageStr = message.toString();
      this.logger.log(
        `📨 [EXTERNO] Mensaje recibido del broker en tópico '${topic}': ${messageStr}`,
      );
      this.logger.log(
        `📊 Detalles: QoS=${packet.qos}, Retain=${packet.retain}, DUP=${packet.dup}, Timestamp=${new Date().toISOString()}`,
      );

      // Procesar el mensaje según el tópico
      try {
        const parsedMessage = JSON.parse(messageStr);
        this.logger.log(
          `🔍 Contenido parseado: ${JSON.stringify(parsedMessage, null, 2)}`,
        );

        // Si es un tópico de psicultura, guardar los datos
        if (topic.startsWith('psicultura/') || topic.includes('Picicultura')) {
          this.logger.log(
            `🔄 Procesando mensaje para psicultura desde tópico ${topic}`,
          );
          const psiculturaService = this.moduleRef.get(PsiculturaService, {
            strict: false,
          });
          // Handle estado field - could be boolean or string
          let estado =
            parsedMessage.status ??
            parsedMessage.states ??
            parsedMessage.estado;

          if (typeof estado === 'string') {
            estado = estado.toLowerCase() === 'true';
          }

          const dataToSave = {
            psiculturaId: parsedMessage.id || parsedMessage.psiculturaId || 1, // Default to 1 if not specified
            estado: estado, // Now properly handled as boolean
            topico: topic,
            modo: parsedMessage.modo || 'manual',
          };
          this.logger.log(`📋 Datos a guardar: ${JSON.stringify(dataToSave)}`);
          await psiculturaService.guardarDatoDesdeBroker(dataToSave);
          this.logger.log(
            `💾 Datos guardados en base de datos para psicultura desde tópico ${topic}`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `⚠️ No se pudo parsear el mensaje como JSON: ${messageStr}`,
        );
      }
    });

    this.client.on('packetsend', (packet) => {
      if (packet.cmd === 'publish') {
        this.logger.debug(
          `📤 Enviando paquete PUBLISH a tópico: ${packet.topic}`,
        );
      }
    });

    this.client.on('packetreceive', (packet) => {
      if (packet.cmd === 'publish') {
        this.logger.debug(
          `📥 Recibiendo paquete PUBLISH del tópico: ${packet.topic}`,
        );
      }
    });
  }

  private async subscribeToAllConfiguredTopics() {
    const cfg = await this.configService.getActiveConfig();
    if (!cfg || !cfg.subscribed_topics || cfg.subscribed_topics.length === 0) {
      this.logger.log('📡 No hay topics configurados para suscribirse');
      return;
    }

    for (const topic of cfg.subscribed_topics) {
      this.client?.subscribe(topic, (err) => {
        if (err) {
          this.logger.error(
            `❌ Error suscribiéndose a tópico ${topic}`,
            err.message,
          );
        } else {
          this.logger.log(`📡 Suscripción exitosa a tópico: ${topic}`);
        }
      });
    }
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.logger.log('MQTT desconectado manualmente');
    }
  }

  getClient(): MqttClient | null {
    return this.client;
  }

  publish(topic: string, message: any) {
    if (!this.client?.connected) {
      this.logger.warn(
        `❌ MQTT no conectado, no se puede publicar en tópico '${topic}'`,
      );
      return;
    }

    const messageStr = JSON.stringify(message);
    this.logger.log(`📤 Publicando en tópico '${topic}': ${messageStr}`);

    this.client.publish(topic, messageStr, (err) => {
      if (err) {
        this.logger.error(
          `❌ Error al publicar en tópico '${topic}': ${err.message}`,
          err,
        );
      } else {
        this.logger.log(
          `✅ Mensaje publicado exitosamente en tópico '${topic}'`,
        );
      }
    });
  }

  subscribe(topic: string) {
    if (!this.client?.connected) {
      this.logger.warn(
        `❌ MQTT no conectado, no se puede suscribir a tópico '${topic}'`,
      );
      return;
    }

    this.logger.log(`📡 Intentando suscribirse a tópico: ${topic}`);

    this.client.subscribe(topic, (err) => {
      if (err) {
        this.logger.error(
          `❌ Error suscribiéndose a tópico '${topic}': ${err.message}`,
          err,
        );
      } else {
        this.logger.log(`✅ Suscripción exitosa a tópico: ${topic}`);
      }
    });
  }

  async subscribeToTopics(topics: string[]): Promise<void> {
    if (!this.client?.connected) {
      this.logger.warn('❌ MQTT no conectado, no se puede suscribir a tópicos');
      return;
    }

    for (const topic of topics) {
      this.subscribe(topic);
    }
  }

  unsubscribeFromTopics(topics: string[]): Promise<void> {
    return new Promise((resolve) => {
      if (!this.client?.connected) {
        this.logger.warn('❌ MQTT no conectado, no se puede desuscribir');
        resolve();
        return;
      }

      if (topics.length === 0) {
        resolve();
        return;
      }

      let completed = 0;
      const total = topics.length;

      topics.forEach(topic => {
        this.client?.unsubscribe(topic, (err) => {
          if (err) {
            this.logger.error(`❌ Error desuscribiéndose de ${topic}`, err.message);
          } else {
            this.logger.log(`🚫 Desuscrito de ${topic}`);
          }
          completed++;
          if (completed === total) {
            resolve();
          }
        });
      });
    });
  }

  unsubscribe(topic: string) {
    if (!this.client?.connected) {
      this.logger.warn('MQTT no conectado, no se puede desuscribir.');
      return;
    }

    this.client.unsubscribe(topic, (err) => {
      if (err) {
        this.logger.error(`Error desuscribiéndose de ${topic}`, err.message);
      } else {
        this.logger.log(`🚫 Desuscrito de ${topic}`);
      }
    });
  }

  async waitForConnection(timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.client?.connected) return resolve();

      const timer = setTimeout(
        () => reject(new Error('MQTT no se conectó a tiempo')),
        timeout,
      );

      this.client?.once('connect', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
}

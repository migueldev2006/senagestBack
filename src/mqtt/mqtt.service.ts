import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
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

  private pendingMessages: PendingMessage[] = [];

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
    this.PORT = cfg.port || 8883;    // TLS MQTT
    this.USER = cfg.username;
    this.PASS = cfg.password;
    this.TOPIC_SIGNALS = cfg.base_topic || 'signals';

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

    if (!this.HOST || !this.PORT || !this.USER || !this.PASS) {
      this.logger.warn('Configuración MQTT incompleta, no se conecta.');
      return;
    }

    this.client = mqtt.connect({
      host: this.HOST,
      port: this.PORT,
      protocol: 'mqtts', // importante: usar mqtts para TLS
      username: this.USER,
      password: this.PASS,
      reconnectPeriod: 2000,
      rejectUnauthorized: false, // si no tienes certificado válido
    });

    this.client.on('connect', () => {
      this.logger.log('✅ MQTT backend conectado');

      if (this.TOPIC_SIGNALS) {
        this.client?.subscribe(this.TOPIC_SIGNALS, (err) => {
          if (err) this.logger.error('Error suscribiéndose a tópico', err.message);
          else this.logger.log(`📡 Suscrito a ${this.TOPIC_SIGNALS}`);
        });
      }
    });

    this.client.on('message', async (topic, message) => {
      const msg = message.toString();
      this.logger.log(`📨 MQTT recibido -> ${topic}: ${msg}`);

      try {
        const payload = JSON.parse(msg);

        // Obtener el ID desde el tópico: psicultura/10/estado
        const partes = topic.split('/');
        const psiculturaId = Number(partes[1]);

        // Crear objeto de datos completo
        const data = {
          ...payload,
          psiculturaId,
          topico: topic,
        };

        // Obtener servicio sin error
        const psiculturaService = this.moduleRef.get(PsiculturaService, {
          strict: false,
        });

        // Guardar en tabla psicultura_data
        await psiculturaService.guardarDatoDesdeBroker(data);
      } catch (e) {
        this.logger.error(`❌ Error procesando mensaje MQTT: ${e.message}`);
      }
    });
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
      this.logger.warn('MQTT no conectado, no se puede publicar.');
      return;
    }
    this.client.publish(topic, JSON.stringify(message));
    this.logger.log(`📤 Publicado en ${topic}: ${JSON.stringify(message)}`);
  }

  subscribe(topic: string) {
    if (!this.client?.connected) {
      this.logger.warn('MQTT no conectado, no se puede suscribir.');
      return;
    }

    this.client.subscribe(topic, (err) => {
      if (err) {
        this.logger.error(`Error suscribiéndose a ${topic}`, err.message);
      } else {
        this.logger.log(`📡 Suscrito a ${topic}`);
      }
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

  private flushPendingMessages() {
    if (!this.client || !this.client.connected) return;

    for (const msg of this.pendingMessages) {
      this.client.publish(msg.topic, JSON.stringify(msg.payload));
    }

    this.pendingMessages = [];
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

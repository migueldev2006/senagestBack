import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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
  publishSignals(arg0: boolean, arg1: boolean) {
    throw new Error('Method not implemented.');
  }
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient | null = null;

  private HOST = '';
  private PORT = 8883; // Puerto MQTT TLS
  private USER = '';
  private PASS = '';
  private TOPIC_SIGNALS = 'lab/diego/signals';

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
    this.PORT = 8883; // TLS MQTT
    this.USER = cfg.username;
    this.PASS = cfg.password;

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

    this.client = mqtt.connect({
      host: this.HOST,
      port: this.PORT,
      protocol: 'mqtts', // importante: usar mqtts para TLS
      username: this.USER,
      password: this.PASS,
      reconnectPeriod: 2000,
      rejectUnauthorized: false, // si no tienes certificado válido
    });

    this.client?.subscribe(['lab/diego/signals', 'psicultura/#'], (err) => {
      if (err) this.logger.error('Error suscribiéndose a tópicos', err.message);
      else this.logger.log(`📡 Suscrito a lab/diego/signals y psicultura/#`);
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
    this.client?.publish(topic, JSON.stringify(message));
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

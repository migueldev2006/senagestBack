import { Injectable, Logger } from '@nestjs/common';
import { BrokerConfigService } from '../psicultura/Broker/broker-config.service';
import mqtt, { MqttClient } from 'mqtt';
import { ModuleRef } from '@nestjs/core';

interface PendingMessage {
  topic: string;
  payload: any;
}

@Injectable()
export class MqttService {
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient | null = null;

  private HOST = '';
  private PORT = 0;
  private USER = '';
  private PASS = '';
  private TOPIC_SIGNALS = 'lab/diego/signals'

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

    this.HOST = cfg.url;
    this.PORT = cfg.port;
    this.USER = cfg.username;
    this.PASS = cfg.password;

    this.logger.log(`🔄 Cargando nueva configuración MQTT: ${this.HOST}:${this.PORT}`);
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
      protocol: 'mqtts',
      username: this.USER,
      password: this.PASS,
      reconnectPeriod: 2000, // reintento cada 2s
      rejectUnauthorized: false, // para certificados autofirmados
    });

    this.client.on('connect', () => {
      this.logger.log('✅ MQTT backend conectado');
      this.flushPendingMessages();

      this.client?.subscribe(this.TOPIC_SIGNALS, (err) => {
        if (err) this.logger.error('Error suscribiéndose a tópico', err.message);
        else this.logger.log(`📡 Suscrito a ${this.TOPIC_SIGNALS}`);
      });
    });

    this.client.on('error', (err) => this.logger.error('MQTT error', err.message));
    this.client.on('close', () => this.logger.warn('MQTT cerrado'));
    this.client.on('offline', () => this.logger.warn('MQTT offline'));
    this.client.on('reconnect', () => this.logger.log('MQTT reconectando...'));
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
    if (this.client?.connected) {
      this.client.publish(topic, JSON.stringify(message), (err) => {
        if (err) this.logger.error(`Error publicando en ${topic}`, err.message);
        else this.logger.log(`MQTT publicado -> ${topic}: ${JSON.stringify(message)}`);
      });
    } else {
      // Guardamos el mensaje para enviarlo cuando se reconecte
      this.pendingMessages.push({ topic, payload: message });
      this.logger.warn(`MQTT NO conectado, mensaje agregado a buffer: ${topic}`);
    }
  }

  private flushPendingMessages() {
    if (!this.client?.connected) return;
    this.logger.log(`Enviando ${this.pendingMessages.length} mensajes pendientes...`);
    while (this.pendingMessages.length > 0) {
      const msg = this.pendingMessages.shift();
      if (msg) {
        this.client.publish(msg.topic, JSON.stringify(msg.payload), (err) => {
          if (err) this.logger.error(`Error publicando pendiente ${msg.topic}`, err.message);
          else this.logger.log(`Mensaje pendiente enviado -> ${msg.topic}`);
        });
      }
    }
  }
}

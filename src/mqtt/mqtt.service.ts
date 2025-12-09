import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BrokerConfigService } from '../psicultura/Broker/broker-config.service';
import mqtt, { MqttClient } from 'mqtt';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class MqttService implements OnModuleInit {
  publishSignals(arg0: boolean, arg1: boolean) {
    throw new Error('Method not implemented.');
  }
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient | null = null;

  private HOST = '';
  private PORT = 0;
  private USER = '';
  private PASS = '';
  private TOPIC_SIGNALS = '';

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
    this.PORT = 8883;    // TLS MQTT
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

    this.client.on('error', (err) => this.logger.error('MQTT error', err.message));
    this.client.on('close', () => this.logger.warn('MQTT cerrado — esperando reconexión automática'));
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
  }

  async waitForConnection(timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.client?.connected) return resolve();

      const timer = setTimeout(() => reject(new Error('MQTT no se conectó a tiempo')), timeout);

      this.client?.once('connect', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
}

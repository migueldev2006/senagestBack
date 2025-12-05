import { Injectable, Logger } from '@nestjs/common';
import { BrokerConfigService } from '../psicultura/Broker/broker-config.service';
import mqtt, { MqttClient } from 'mqtt';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class MqttService {
  publishSignals(arg0: boolean, arg1: boolean) {
    throw new Error('Method not implemented.');
  }
  waitForConnection() {
    throw new Error('Method not implemented.');
  }
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient | null = null;

  private HOST = '';
  private PORT = 0;
  private USER = '';
  private PASS = '';
  private TOPIC_SIGNALS = 'lab/diego/signals';

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
      reconnectPeriod: 2000,
      rejectUnauthorized: false,
    });

    this.client.on('connect', () => {
      this.logger.log('✅ MQTT backend conectado');

      this.client?.subscribe(this.TOPIC_SIGNALS, (err) => {
        if (err) this.logger.error('Error suscribiéndose a tópico', err.message);
        else this.logger.log(`📡 Suscrito a ${this.TOPIC_SIGNALS}`);
      });
    });

    this.client.on('error', (err) => this.logger.error('MQTT error', err.message));
    this.client.on('close', () => this.logger.warn('MQTT cerrado'));
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
}

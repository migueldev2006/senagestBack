import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import mqtt, { MqttClient } from 'mqtt';
import { ModuleRef } from '@nestjs/core';
import { PsiculturaService } from '../psicultura.service';

@Injectable()
export class MqttService implements OnModuleInit {
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient | null = null;

  // Ajusta si tu instancia es distinta
  private readonly HOST = '3f187645294a400cbe2d87a2ec16ec53.s1.eu.hivemq.cloud';
  private readonly PORT = 8883;
  private readonly USER = 'diegokld';
  private readonly PASS = 'Don_diego123';
  private readonly TOPIC_SIGNALS = 'lab/diego/signals';

  constructor(private readonly moduleRef: ModuleRef) {}

  onModuleInit() {
    this.connect();
  }

  private connect() {
    if (this.client && this.client.connected) return this.client;

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
      this.logger.log('MQTT backend conectado');
      this.client?.subscribe(this.TOPIC_SIGNALS, (err) => {
        if (err)
          this.logger.error('Error suscribiéndose a topic', err.message || err);
        else this.logger.log(`Suscrito a ${this.TOPIC_SIGNALS}`);
      });
    });

    this.client.on('reconnect', () => this.logger.log('MQTT reconectando...'));
    this.client.on('close', () => this.logger.warn('MQTT cerrado'));
    this.client.on('error', (err) =>
      this.logger.error('MQTT error', err?.message || err),
    );

    this.client.on('message', async (topic, message) => {
      const payload = message.toString();
      this.logger.log(`Mensaje recibido [${topic}] ${payload}`);

      // Intentamos parsear JSON; aceptamos formatos: { id, estado } o "true"/"false"
      let parsed: any = null;
      try {
        parsed = JSON.parse(payload);
      } catch {
        parsed = payload;
      }

      try {
        // resolvemos PsiculturaService dinámicamente (evita circular import)
        const psiculturaService = this.moduleRef.get(PsiculturaService, {
          strict: false,
        });
        if (!psiculturaService) {
          this.logger.warn('PsiculturaService no disponible en ModuleRef');
          return;
        }

        // Si viene objeto y trae id o estado
        if (parsed && typeof parsed === 'object') {
          if (parsed.id && parsed.estado !== undefined) {
            await psiculturaService.handleBrokerPayload(
              Number(parsed.id),
              String(parsed.estado),
              topic,
            );
            return;
          }
          if (parsed.estado !== undefined) {
            const infos = await psiculturaService.getPsiculturaInfo();
            if (Array.isArray(infos) && infos.length > 0) {
              await psiculturaService.handleBrokerPayload(
                Number(infos[0].id),
                String(parsed.estado),
                topic,
              );
            }
            return;
          }
        }

        // payload string 'true'/'false' or '1'/'0'
        const infos = await psiculturaService.getPsiculturaInfo();
        if (Array.isArray(infos) && infos.length > 0) {
          await psiculturaService.handleBrokerPayload(
            Number(infos[0].id),
            String(parsed),
            topic,
          );
        }
      } catch (err) {
        this.logger.error(
          'Error procesando mensaje MQTT -> PsiculturaService',
          err?.message || err,
        );
      }
    });

    return this.client;
  }

  publishSignals(s1_raw: boolean, s2_raw: boolean) {
    const mensaje = {
      ts: new Date().toISOString(),
      s1_raw,
      s1: s1_raw ? 5 : 0,
      s2_raw,
      s2: s2_raw ? 5 : 0,
    };
    this.ensureConnected();
    this.client?.publish(this.TOPIC_SIGNALS, JSON.stringify(mensaje), (err) => {
      if (err) this.logger.error('Error publicando MQTT', err.message || err);
      else
        this.logger.log(
          `Publicado en ${this.TOPIC_SIGNALS}: ${JSON.stringify(mensaje)}`,
        );
    });
  }

  isConnected(): boolean {
    return !!(this.client && this.client.connected);
  }

  mqttClient(): MqttClient | null {
    this.ensureConnected();
    return this.client;
  }

  private ensureConnected() {
    if (!this.client) this.connect();
  }

  async waitForConnection(timeoutMs = 8000): Promise<void> {
    const start = Date.now();

    return new Promise((resolve, reject) => {
      const check = () => {
        if (this.client && this.client.connected) {
          return resolve();
        }

        if (Date.now() - start > timeoutMs) {
          return reject(new Error('MQTT timeout esperando conexión'));
        }

        setTimeout(check, 300); // vuelve a intentar
      };

      check();
    });
  }
}

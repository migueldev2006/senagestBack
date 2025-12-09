import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BrokerConfig, BrokerProtocol } from "./entities/broker-config.entity";

@Injectable()
export class BrokerConfigService {
  constructor(
    @InjectRepository(BrokerConfig)
    private repo: Repository<BrokerConfig>
  ) {}

  async getAllConfigs(): Promise<BrokerConfig[]> {
    return this.repo.find();
  }

  async setConfig(data: {
    name: string;
    url: string;
    port: number;
    protocol: BrokerProtocol;
    username?: string;
    password?: string;
    base_topic?: string;
  }) {
    // Desactivar todas las configuraciones activas
    await this.repo.update({ is_active: true }, { is_active: false, is_connected: false, is_subscribed: false, is_publishing: false });

    const config = this.repo.create({
      name: data.name,
      url: data.url,
      port: data.port,
      protocol: data.protocol,
      username: data.username,
      password: data.password,
      base_topic: data.base_topic,
      is_active: true,
    });

    if (!data.name || !data.url || !data.port) {
      throw new Error("Campos obligatorios: name, url, port");
    }

    return this.repo.save(config);
  }

  async getActiveConfig(): Promise<BrokerConfig | null> {
    return this.repo.findOne({ where: { is_active: true } });
  }

  async updateConfig(id: number, data: Partial<{
    name: string;
    url: string;
    port: number;
    protocol: BrokerProtocol;
    username: string;
    password: string;
    base_topic: string;
    is_active: boolean;
  }>) {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) {
      throw new Error("Configuración no encontrada");
    }

    // Si se está activando, desactivar las demás
    if (data.is_active) {
      await this.repo.update({ is_active: true }, { is_active: false, is_connected: false, is_subscribed: false, is_publishing: false });
    }

    await this.repo.update(id, {
      ...data,
      updated_at: new Date(),
    });

    return this.repo.findOne({ where: { id } });
  }

  async deleteConfig(id: number) {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) {
      throw new Error("Configuración no encontrada");
    }

    // Si es la activa, no permitir eliminar
    if (config.is_active) {
      throw new Error("No se puede eliminar la configuración activa");
    }

    return this.repo.delete(id);
  }

  async updateConnectionStatus(id: number, is_connected: boolean) {
    await this.repo.update(id, { is_connected, updated_at: new Date() });
  }

  async updateSubscriptionStatus(id: number, is_subscribed: boolean) {
    await this.repo.update(id, { is_subscribed, updated_at: new Date() });
  }

  async updatePublishingStatus(id: number, is_publishing: boolean) {
    await this.repo.update(id, { is_publishing, updated_at: new Date() });
  }

  async testConnection(id: number): Promise<{ success: boolean; message: string }> {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) {
      return { success: false, message: "Configuración no encontrada" };
    }

    try {
      // Lógica de prueba de conexión (se implementará en MqttService)
      // Por ahora, simular éxito
      await this.updateConnectionStatus(id, true);
      return { success: true, message: "Conexión exitosa" };
    } catch (error) {
      await this.updateConnectionStatus(id, false);
      return { success: false, message: `Error de conexión: ${error.message}` };
    }
  }

  async subscribe(id: number): Promise<{ success: boolean; message: string }> {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) {
      return { success: false, message: "Configuración no encontrada" };
    }

    if (!config.is_connected) {
      return { success: false, message: "Debe estar conectado para suscribirse" };
    }

    try {
      // Lógica de suscripción (se implementará en MqttService)
      await this.updateSubscriptionStatus(id, true);
      return { success: true, message: "Suscripción exitosa" };
    } catch (error) {
      await this.updateSubscriptionStatus(id, false);
      return { success: false, message: `Error en suscripción: ${error.message}` };
    }
  }

  async publish(id: number, topic: string, message: any): Promise<{ success: boolean; message: string }> {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) {
      return { success: false, message: "Configuración no encontrada" };
    }

    if (!config.is_connected) {
      return { success: false, message: "Debe estar conectado para publicar" };
    }

    try {
      // Lógica de publicación (se implementará en MqttService)
      await this.updatePublishingStatus(id, true);
      return { success: true, message: "Publicación exitosa" };
    } catch (error) {
      await this.updatePublishingStatus(id, false);
      return { success: false, message: `Error en publicación: ${error.message}` };
    }
  }

  async disconnect(id: number): Promise<{ success: boolean; message: string }> {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) {
      return { success: false, message: "Configuración no encontrada" };
    }

    try {
      // Lógica de desconexión (se implementará en MqttService)
      await this.updateConnectionStatus(id, false);
      await this.updateSubscriptionStatus(id, false);
      await this.updatePublishingStatus(id, false);
      return { success: true, message: "Desconexión exitosa" };
    } catch (error) {
      return { success: false, message: `Error en desconexión: ${error.message}` };
    }
  }
}

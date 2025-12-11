import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BrokerConfig, BrokerProtocol } from './entities/broker-config.entity';

@Injectable()
export class BrokerConfigService {
  private readonly logger = new Logger(BrokerConfigService.name);

  constructor(
    @InjectRepository(BrokerConfig)
    private repo: Repository<BrokerConfig>,
  ) {}

  async getAllConfigs(): Promise<
    (BrokerConfig & { statusMessage: string; actions: any })[]
  > {
    const configs = await this.repo.find();
    const activeConfig = await this.getActiveConfig();

    return Promise.all(
      configs.map(async (config) => {
        let statusMessage = '';
        let actions = {
          canConnect: false,
          canSubscribe: false,
          canPublish: false,
          canDisconnect: false,
          canDelete: true,
          canEdit: true,
        };

        if (config.is_active) {
          if (config.is_connected) {
            statusMessage = `✅ Conectado a ${config.name || 'configuración sin nombre'}`;
            const activities: string[] = [];

            if (config.is_subscribed && config.subscribed_topics?.length) {
              activities.push(
                `📡 Suscrito a: ${config.subscribed_topics.join(', ')}`,
              );
            }

            if (config.is_publishing && config.published_topics?.length) {
              activities.push(
                `📤 Publicando en: ${config.published_topics.join(', ')}`,
              );
            }

            if (activities.length > 0) {
              statusMessage += ` - ${activities.join(', ')}`;
            }

            actions = {
              canConnect: false,
              canSubscribe: !config.is_publishing,
              canPublish: !config.is_subscribed,
              canDisconnect: true,
              canDelete: false,
              canEdit: false,
            };
          } else {
            statusMessage = `Configuración ${config.name || 'sin nombre'} guardada pero no conectada`;
            actions = {
              canConnect: true,
              canSubscribe: false,
              canPublish: false,
              canDisconnect: false,
              canDelete: true,
              canEdit: true,
            };
          }
        } else {
          statusMessage = `Configuración ${config.name || 'sin nombre'} inactiva`;
          actions = {
            canConnect: false,
            canSubscribe: false,
            canPublish: false,
            canDisconnect: false,
            canDelete: true,
            canEdit: true,
          };
        }

        return {
          ...config,
          statusMessage,
          actions,
        };
      }),
    );
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
    await this.repo.update(
      { is_active: true },
      {
        is_active: false,
        is_connected: false,
        is_subscribed: false,
        is_publishing: false,
        subscribed_topics: [],
        published_topics: [],
      },
    );

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
      throw new Error('Campos obligatorios: name, url, port');
    }

    return this.repo.save(config);
  }

  async getActiveConfig(): Promise<BrokerConfig | null> {
    return this.repo.findOne({ where: { is_active: true } });
  }

  async getActiveConfigStatus(): Promise<{
    config: BrokerConfig | null;
    statusMessage: string;
    actions: {
      canConnect: boolean;
      canSubscribe: boolean;
      canPublish: boolean;
      canDisconnect: boolean;
      canDelete: boolean;
      canEdit: boolean;
    };
  }> {
    const config = await this.getActiveConfig();
    if (!config) {
      return {
        config: null,
        statusMessage: 'No hay configuración activa',
        actions: {
          canConnect: false,
          canSubscribe: false,
          canPublish: false,
          canDisconnect: false,
          canDelete: true,
          canEdit: true,
        },
      };
    }

    if (!config.is_connected) {
      return {
        config,
        statusMessage: `Configuración ${config.name || 'sin nombre'} guardada pero no conectada`,
        actions: {
          canConnect: true,
          canSubscribe: false,
          canPublish: false,
          canDisconnect: false,
          canDelete: true,
          canEdit: true,
        },
      };
    }

    let statusMessage = `✅ Conectado a ${config.name || 'configuración sin nombre'}`;
    const activities: string[] = [];

    if (config.is_subscribed && config.subscribed_topics?.length) {
      activities.push(`📡 Suscrito a: ${config.subscribed_topics.join(', ')}`);
    }

    if (config.is_publishing && config.published_topics?.length) {
      activities.push(
        `📤 Publicando en: ${config.published_topics.join(', ')}`,
      );
    }

    if (activities.length > 0) {
      statusMessage += ` - ${activities.join(', ')}`;
    }

    // Si está conectado, no puede conectar de nuevo, ni editar, ni eliminar
    // Puede suscribir solo si no está publicando
    // Puede publicar solo si no está suscrito
    // Siempre puede desconectar
    const actions = {
      canConnect: false,
      canSubscribe: !config.is_publishing,
      canPublish: !config.is_subscribed,
      canDisconnect: true,
      canDelete: false,
      canEdit: false,
    };

    return {
      config,
      statusMessage,
      actions,
    };
  }

  async updateConfig(
    id: number,
    data: Partial<{
      name: string;
      url: string;
      port: number;
      protocol: BrokerProtocol;
      username: string;
      password: string;
      base_topic: string;
      is_active: boolean;
    }>,
  ) {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) {
      throw new Error('Configuración no encontrada');
    }

    // Si se está activando, desactivar las demás
    if (data.is_active) {
      await this.repo.update(
        { is_active: true },
        {
          is_active: false,
          is_connected: false,
          is_subscribed: false,
          is_publishing: false,
          subscribed_topics: [],
          published_topics: [],
        },
      );
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
      throw new Error('Configuración no encontrada');
    }

    // Si es la activa, no permitir eliminar
    if (config.is_active) {
      throw new Error('No se puede eliminar la configuración activa');
    }

    // Si está publicando o suscrito, no permitir eliminar
    if (config.is_publishing || config.is_subscribed) {
      throw new Error(
        'No se puede eliminar la configuración mientras esté publicando o suscrita',
      );
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

  async testConnection(
    id: number,
  ): Promise<{ success: boolean; message: string }> {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) {
      return { success: false, message: 'Configuración no encontrada' };
    }

    try {
      // Lógica de prueba de conexión (se implementará en MqttService)
      // Por ahora, simular éxito
      await this.updateConnectionStatus(id, true);
      return { success: true, message: 'Conexión exitosa' };
    } catch (error) {
      await this.updateConnectionStatus(id, false);
      return { success: false, message: `Error de conexión: ${error.message}` };
    }
  }

  async subscribe(id: number): Promise<{ success: boolean; message: string }> {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) {
      return { success: false, message: 'Configuración no encontrada' };
    }

    if (!config.is_connected) {
      return {
        success: false,
        message: 'Debe estar conectado para suscribirse',
      };
    }

    if (config.is_publishing) {
      return {
        success: false,
        message:
          'No se puede suscribir mientras se está publicando en el tópico',
      };
    }

    try {
      // Aquí se implementará la lógica real de suscripción usando MqttService
      // Por ahora, marcar como suscrito y loggear
      const topic = config.base_topic || 'signals';
      this.logger.log(
        `📡 Suscripción solicitada para config ${id} en tópico ${topic}`,
      );
      await this.updateSubscriptionStatus(id, true);
      // Agregar tópico a la lista de suscritos
      const currentTopics = config.subscribed_topics || [];
      if (!currentTopics.includes(topic)) {
        currentTopics.push(topic);
        await this.repo.update(id, { subscribed_topics: currentTopics });
      }
      return { success: true, message: 'Suscripción exitosa' };
    } catch (error) {
      this.logger.error(
        `Error al suscribirse para config ${id}`,
        error.message,
      );
      await this.updateSubscriptionStatus(id, false);
      return {
        success: false,
        message: `Error en suscripción: ${error.message}`,
      };
    }
  }

  async publish(
    id: number,
    topic: string,
    message: any,
  ): Promise<{ success: boolean; message: string }> {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) {
      return { success: false, message: 'Configuración no encontrada' };
    }

    if (!config.is_connected) {
      return { success: false, message: 'Debe estar conectado para publicar' };
    }

    try {
      // Lógica de publicación (se implementará en MqttService)
      this.logger.log(
        `📤 Publicación solicitada para config ${id} en tópico ${topic} con mensaje: ${JSON.stringify(message)}`,
      );
      await this.updatePublishingStatus(id, true);
      // Agregar tópico a la lista de publicados
      const currentTopics = config.published_topics || [];
      if (!currentTopics.includes(topic)) {
        currentTopics.push(topic);
        await this.repo.update(id, { published_topics: currentTopics });
      }
      return { success: true, message: 'Publicación exitosa' };
    } catch (error) {
      this.logger.error(`Error al publicar para config ${id}`, error.message);
      await this.updatePublishingStatus(id, false);
      return {
        success: false,
        message: `Error en publicación: ${error.message}`,
      };
    }
  }

  async disconnect(id: number): Promise<{ success: boolean; message: string }> {
    const config = await this.repo.findOne({ where: { id } });
    if (!config) {
      return { success: false, message: 'Configuración no encontrada' };
    }

    try {
      // Lógica de desconexión (se implementará en MqttService)
      await this.updateConnectionStatus(id, false);
      await this.updateSubscriptionStatus(id, false);
      await this.updatePublishingStatus(id, false);
      // Limpiar listas de tópicos
      await this.repo.update(id, {
        subscribed_topics: [],
        published_topics: [],
      });
      return { success: true, message: 'Desconexión exitosa' };
    } catch (error) {
      return {
        success: false,
        message: `Error en desconexión: ${error.message}`,
      };
    }
  }
}

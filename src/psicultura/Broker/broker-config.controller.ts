import {
  Body,
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
} from '@nestjs/common';
import { BrokerConfigService } from './broker-config.service';
import { MqttService } from '../../mqtt/mqtt.service';
import { BrokerProtocol } from './entities/broker-config.entity';

@Controller('psicultura/broker/config')
export class BrokerConfigController {
  constructor(
    private readonly configService: BrokerConfigService,
    private readonly mqttService: MqttService,
  ) {}

  // Guardar configuración
  @Post('save')
  async saveConfig(
    @Body()
    body: {
      name: string;
      url: string;
      port: number;
      protocol: BrokerProtocol;
      username?: string;
      password?: string;
      base_topic?: string;
    },
  ) {
    const saved = await this.configService.setConfig(body);
    await this.mqttService.reloadFromDatabase();
    return { ok: true, saved };
  }

  // Listar todas las configuraciones
  @Get('list')
  async listConfigs() {
    const configs = await this.configService.getAllConfigs();
    return { ok: true, configs };
  }

  // Actualizar configuración
  @Put('update/:id')
  async updateConfig(
    @Param('id') id: string,
    @Body()
    body: Partial<{
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
    const updated = await this.configService.updateConfig(Number(id), body);
    await this.mqttService.reloadFromDatabase();
    return { ok: true, updated };
  }

  // Eliminar configuración
  @Delete('delete/:id')
  async deleteConfig(@Param('id') id: string) {
    const deleted = await this.configService.deleteConfig(Number(id));
    await this.mqttService.reloadFromDatabase();
    return { ok: true, deleted };
  }

  // Probar conexión
  @Post('test-connection/:id')
  async testConnection(@Param('id') id: string) {
    const result = await this.configService.testConnection(Number(id));
    return { ok: result.success, message: result.message };
  }

  // Suscribirse
  @Post('subscribe/:id')
  async subscribe(@Param('id') id: string) {
    const result = await this.configService.subscribe(Number(id));
    return { ok: result.success, message: result.message };
  }

  // Publicar
  @Post('publish/:id')
  async publish(
    @Param('id') id: string,
    @Body() body: { topic: string; message: any },
  ) {
    const result = await this.configService.publish(
      Number(id),
      body.topic,
      body.message,
    );
    return { ok: result.success, message: result.message };
  }

  // Desconectar
  @Post('disconnect/:id')
  async disconnect(@Param('id') id: string) {
    const result = await this.configService.disconnect(Number(id));
    return { ok: result.success, message: result.message };
  }

  // Obtener estado de la configuración activa
  @Get('active-status')
  async getActiveStatus() {
    const status = await this.configService.getActiveConfigStatus();
    return { ok: true, ...status };
  }
}

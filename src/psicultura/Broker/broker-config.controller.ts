import { Body, Controller, Post, Get } from "@nestjs/common";
import { BrokerConfigService } from "./broker-config.service";
import { MqttService } from "../../mqtt/mqtt.service";

@Controller("psicultura/broker/config")
export class BrokerConfigController {
  constructor(
    private readonly configService: BrokerConfigService,
    private readonly mqttService: MqttService
  ) {}

  // Guardar configuración
  @Post("save")
  async saveConfig(@Body() body: any) {
    const saved = await this.configService.setConfig(body);
    await this.mqttService.reloadFromDatabase();
    return { ok: true, saved };
  }

  // Listar todas las configuraciones
  @Get("list")
  async listConfigs() {
    const configs = await this.configService.getAllConfigs();
    return { ok: true, configs };
  }
}

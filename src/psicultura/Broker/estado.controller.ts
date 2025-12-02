import { Controller, Post, Body, Get } from '@nestjs/common';
import { EstadoService } from './estado.service';
import { MqttService } from './mqtt.service';

@Controller('psicultura')
export class EstadoController {
  constructor(
    private readonly estadoService: EstadoService,
    private readonly mqttService: MqttService,
  ) {}

  @Post('toggle')
  async toggle(@Body('nuevoEstado') nuevoEstado: boolean) {
    const registro = await this.estadoService.guardarEstado(nuevoEstado);
    this.mqttService.enviar(nuevoEstado);
    return registro;
  }

  @Get('estado')
  async obtener() {
    return this.estadoService.obtenerEstado();
  }
}

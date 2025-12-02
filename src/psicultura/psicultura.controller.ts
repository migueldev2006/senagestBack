import { Controller, Post, Body, Param, Get, Patch } from '@nestjs/common';
import { PsiculturaService } from './psicultura.service';
import { CreatePsiculturaDto, TimerDto, ValidarBrokerDto } from './dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';

@Controller('psicultura')
export class PsiculturaController {
  constructor(private readonly service: PsiculturaService) {}

  @Post('validar')
  validarBroker(@Body() dto: ValidarBrokerDto) {
    return this.service.validarBroker(dto);
  }

  @Patch(':id/timer')
  actualizarTimer(@Param('id') id: number, @Body() dto: TimerDto) {
    return this.service.actualizarTimer(Number(id), dto);
  }

  @Get('info')
  getPsiculturaInfo() {
    return this.service.getPsiculturaInfo();
  }

  // historial del psicultura
  @Get(':id/historial')
  getHistorial(@Param('id') id: number) {
    return this.service.getHistorial(Number(id));
  }

  @Get(':id/estado')
  obtenerEstado(@Param('id') id: number) {
    return this.service.obtenerEstado(Number(id));
  }

  @Patch(':id/estado')
  cambiarEstado(@Param('id') id: number, @Body() body: CambiarEstadoDto) {
    return this.service.cambiarEstado(Number(id), Boolean(body.activo), Boolean(body.manual));
  }

  @Post(':id/broker-payload')
  brokerPayload(@Param('id') id: number, @Body() body: { payload: string }) {
    return this.service.handleBrokerPayload(Number(id), body.payload);
  }

  @Post(':id/broker/lost')
  brokerLost(@Param('id') id: number) {
    return this.service.handleBrokerConnectionLost(Number(id));
  }

  @Post(':id/broker/restored')
  brokerRestored(@Param('id') id: number) {
    return this.service.handleBrokerRestored(Number(id));
  }

  @Post(':id/power/loss')
  powerLoss(@Param('id') id: number) {
    return this.service.reportPowerLoss(Number(id));
  }

  @Post(':id/power/restore')
  powerRestore(@Param('id') id: number) {
    return this.service.reportPowerRestore(Number(id));
  }
}
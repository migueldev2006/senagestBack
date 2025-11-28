import { Controller, Post, Body, Param, Get, Patch } from '@nestjs/common';
import { PsiculturaService } from './psicultura.service';
import { TimerDto, ValidarBrokerDto } from './dto';

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
  getPsiculturaInfo(@Param('id') id: number) {
    return this.service.getPsiculturaInfo();
  }

  @Get(':id/estado')
  obtenerEstado(@Param('id') id: number) {
    return this.service.obtenerEstado(Number(id));
  }

  @Patch(':id/estado')
  cambiarEstado(@Param('id') id: number, @Body() body: { activo: boolean; manual?: boolean }) {
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

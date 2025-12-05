import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  ParseIntPipe,
} from '@nestjs/common';
import { PsiculturaService } from './psicultura.service';
import { TimerDto } from './dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';

@Controller('psicultura')
export class PsiculturaController {
  constructor(private readonly service: PsiculturaService) {}


  @Post(':id/timer')
  actualizarTimer(
    @Param('id') id: string,
    @Body() dto: TimerDto,
  ) {
    const parsedId = id === 'null' || id === 'new' ? null : Number(id);
    return this.service.actualizarTimer(parsedId, dto);
  }

  @Get('info')
  getPsiculturaInfo() {
    return this.service.getPsiculturaInfo();
  }

  @Get(':id/historial')
  getHistorial(@Param('id', ParseIntPipe) id: number) {
    return this.service.getHistorial(id);
  }

  @Get('historial')
  getHistorialInfo() {
    return this.service.getHistorialInfo();
  }

  @Get(':id/estado')
  obtenerEstado(@Param('id', ParseIntPipe) id: number) {
    return this.service.obtenerEstado(id);
  }

  @Post(':id/estado')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CambiarEstadoDto,
  ) {
    return this.service.cambiarEstado({
      psiculturaId: id,
      estado: Boolean(body.activo),
      manual: Boolean(body.manual),
    });
  }

  @Post(':id/manual')
  toggleManual(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CambiarEstadoDto,
  ) {
    return this.service.cambiarEstado({
      psiculturaId: id,
      estado: Boolean(body.activo),
      manual: true,
    });
  }

  @Post(':id/broker/lost')
  brokerLost(@Param('id', ParseIntPipe) id: number) {
    return this.service.handleBrokerConnectionLost(id);
  }

  @Post(':id/broker/restored')
  brokerRestored(@Param('id', ParseIntPipe) id: number) {
    return this.service.handleBrokerRestored(id);
  }

  @Post(':id/power/loss')
  powerLoss(@Param('id', ParseIntPipe) id: number) {
    return this.service.reportPowerLoss(id);
  }

  @Post(':id/power/restore')
  powerRestore(@Param('id', ParseIntPipe) id: number) {
    return this.service.reportPowerRestore(id);
  }
}

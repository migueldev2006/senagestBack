import { Controller, Post, Patch, Body, Param, Get } from '@nestjs/common';
import { PsiculturaService } from './psicultura.service';
import { TimerDto, ValidarBrokerDto } from './dto';


@Controller('psicultura')
export class PsiculturaController {
  constructor(private readonly psiculturaService: PsiculturaService) {}
  @Get('info')
  getPsiculturaInfo() {
    return this.psiculturaService.getPsiculturaInfo();
  }
  @Get('estado/:id')
  obtenerEstado(@Param('id') id: number) {
    return this.psiculturaService.obtenerEstado(id);
  }

  @Post('validar')
  validarBroker(@Body() dto: ValidarBrokerDto) {
    return this.psiculturaService.validarBroker(dto);
  }

  @Patch('timer/:id')
  actualizarTimer(@Param('id') id: number, @Body() dto: TimerDto) {
    return this.psiculturaService.actualizarTimer(id, dto);
  }

  @Patch('estado/:id')
  cambiarEstado(@Param('id') id: number, @Body('estado') estado: boolean) {
    return this.psiculturaService.cambiarEstado(id, estado, true);
  }
}

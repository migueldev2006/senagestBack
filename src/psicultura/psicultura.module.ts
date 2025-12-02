import { Module } from '@nestjs/common';
import { PsiculturaService } from './psicultura.service';
import { PsiculturaController } from './psicultura.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Psicultura } from './entities/psicultura.entity';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { PsiculturaHistorial } from './entities/psicultura-historial.entity';

@Module({
  controllers: [PsiculturaController],
  providers: [PsiculturaService],
  imports:[TypeOrmModule.forFeature([Psicultura, Usuario, PsiculturaHistorial])],
  exports:[TypeOrmModule]
})
export class PsiculturaModule {}

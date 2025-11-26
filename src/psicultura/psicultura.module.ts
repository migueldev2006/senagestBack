import { Module } from '@nestjs/common';
import { PsiculturaService } from './psicultura.service';
import { PsiculturaController } from './psicultura.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Psicultura } from './entities/psicultura.entity';
import { Usuario } from 'src/usuarios/entities/usuario.entity';

@Module({
  controllers: [PsiculturaController],
  providers: [PsiculturaService],
  imports:[TypeOrmModule.forFeature([Psicultura, Usuario])],
  exports:[TypeOrmModule]
})
export class PsiculturaModule {}

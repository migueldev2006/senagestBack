import { Module,  } from '@nestjs/common';
import { PsiculturaController } from './psicultura.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Psicultura } from './entities/psicultura.entity';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { PsiculturaHistorial } from './entities/psicultura-historial.entity';
import { PsiculturaService } from './psicultura.service';


@Module({
  controllers: [PsiculturaController],
  providers: [PsiculturaService],
  imports: [
    TypeOrmModule.forFeature([
      Psicultura,
      Usuario,
      PsiculturaHistorial,
    ]),
  ],
  exports: [PsiculturaService, TypeOrmModule],
})
export class PsiculturaModule {}

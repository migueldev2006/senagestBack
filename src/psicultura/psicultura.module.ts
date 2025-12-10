import { Module, forwardRef } from '@nestjs/common';
import { PsiculturaService } from './psicultura.service';
import { PsiculturaController } from './psicultura.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Psicultura } from './entities/psicultura.entity';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { PsiculturaHistorial } from './entities/psicultura-historial.entity';
import { PsiculturaData } from './entities/psicultura-data.entity';
import { MqttModule } from '../mqtt/mqtt.module';


@Module({
  controllers: [PsiculturaController],
  providers: [PsiculturaService],
  imports: [TypeOrmModule.forFeature([Psicultura, Usuario, PsiculturaHistorial, PsiculturaData]), forwardRef(() => MqttModule)],
  exports: [PsiculturaService, TypeOrmModule],
})
export class PsiculturaModule {}
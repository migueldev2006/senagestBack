import { Module } from '@nestjs/common';
import { RutasController } from './rutas.controller';
import { RutasService } from './rutas.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RutaFront } from './entities/ruta.entity';
import { Modulo } from 'src/modulos/entities/modulo.entity';
import { RolPermiso } from 'src/rolpermiso/entities/rolpermiso.entity';
import { PermisosGuard } from 'src/auth/guards/permisos.guard';

@Module({
  controllers: [RutasController],
  providers: [RutasService, PermisosGuard],
  imports: [TypeOrmModule.forFeature([RutaFront, Modulo, RolPermiso])],
  exports: [TypeOrmModule, PermisosGuard]
})
export class RutasModule {}

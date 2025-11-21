import { Module } from '@nestjs/common';
import { PermisosController } from './permisos.controller';
import { PermisosService } from './permisos.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permiso } from './entities/permiso.entity';
import { RutaFront } from 'src/rutas/entities/ruta.entity';
import { Modulo } from 'src/modulos/entities/modulo.entity';
import { RolPermiso } from 'src/rolpermiso/entities/rolpermiso.entity';
import { PermisosGuard } from 'src/auth/guards/permisos.guard';


@Module({
  controllers: [PermisosController],
  providers: [PermisosService, PermisosGuard],
  imports: [TypeOrmModule.forFeature([Permiso, RutaFront, Modulo, RolPermiso])],
  exports: [TypeOrmModule, PermisosGuard]
})
export class PermisosModule {}

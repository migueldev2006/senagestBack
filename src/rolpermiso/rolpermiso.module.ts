import { Module } from '@nestjs/common';
import { RolpermisoService } from './rolpermiso.service';
import { RolpermisoController } from './rolpermiso.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolPermiso } from './entities/rolpermiso.entity';
import { Modulo } from 'src/modulos/entities/modulo.entity';
import { Permiso } from 'src/permisos/entities/permiso.entity';
import { Rol } from 'src/roles/entities/rol.entity';

@Module({
  controllers: [RolpermisoController],
  providers: [RolpermisoService],
  imports: [TypeOrmModule.forFeature([RolPermiso, Modulo, Permiso, Rol])],
  exports: [TypeOrmModule],
})
export class RolpermisoModule {}

import { Module } from '@nestjs/common';
import { ModulosService } from './modulos.service';
import { ModulosController } from './modulos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Modulo } from './entities/modulo.entity';
import { RolPermiso } from 'src/rolpermiso/entities/rolpermiso.entity';
import { PermisosGuard } from 'src/auth/guards/permisos.guard';

@Module({
  providers: [ModulosService, PermisosGuard],
  controllers: [ModulosController],
  imports: [TypeOrmModule.forFeature([Modulo, RolPermiso])],
  exports: [TypeOrmModule, PermisosGuard]
})
export class ModulosModule {}

import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rol } from './entities/rol.entity';
import { RolPermiso } from 'src/rolpermiso/entities/rolpermiso.entity';
import { PermisosGuard } from 'src/auth/guards/permisos.guard';


@Module({
  controllers: [RolesController],
  providers: [RolesService, PermisosGuard],
  imports: [TypeOrmModule.forFeature([Rol, RolPermiso])],
  exports: [TypeOrmModule, PermisosGuard]
})
export class RolesModule {}

import { Module } from '@nestjs/common';
import { FichasController } from './fichas.controller';
import { FichasService } from './fichas.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ficha } from './entities/ficha.entity';
import { RolPermiso } from 'src/rolpermiso/entities/rolpermiso.entity';
import { PermisosGuard } from 'src/auth/guards/permisos.guard';

@Module({
  controllers: [FichasController],
  providers: [FichasService, PermisosGuard],
  imports: [TypeOrmModule.forFeature([Ficha, RolPermiso])],
  exports: [TypeOrmModule, PermisosGuard],
})
export class FichasModule {}

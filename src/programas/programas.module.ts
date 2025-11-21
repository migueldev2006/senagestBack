import { Module } from '@nestjs/common';
import { ProgramasController } from './programas.controller';
import { ProgramasService } from './programas.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Programa } from './entities/programa.entity';
import { RolPermiso } from 'src/rolpermiso/entities/rolpermiso.entity';
import { PermisosGuard } from 'src/auth/guards/permisos.guard';

@Module({
  controllers: [ProgramasController],
  providers: [ProgramasService, PermisosGuard],
  imports: [TypeOrmModule.forFeature([Programa, RolPermiso])],
  exports: [TypeOrmModule, PermisosGuard]
})
export class ProgramasModule {}

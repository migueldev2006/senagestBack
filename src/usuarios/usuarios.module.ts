import { Module } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';
import { Ficha } from 'src/fichas/entities/ficha.entity';
import { RolPermiso } from 'src/rolpermiso/entities/rolpermiso.entity';
import { Rol } from 'src/roles/entities/rol.entity';
import { Permiso } from 'src/permisos/entities/permiso.entity';

@Module({
  controllers: [UsuariosController],
  providers: [UsuariosService, ConfigService],
  imports: [TypeOrmModule.forFeature([Usuario, Ficha, RolPermiso, Rol, Permiso])],
  exports: [TypeOrmModule],
})
export class UsuariosModule {}

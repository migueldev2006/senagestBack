import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ModulosModule } from './modulos/modulos.module';
import { PermisosModule } from './permisos/permisos.module';
import { ProgramasModule } from './programas/programas.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { RolesModule } from './roles/roles.module';
import { RolpermisoModule } from './rolpermiso/rolpermiso.module';
import { RutasModule } from './rutas/rutas.module';
import { ConfigModule } from '@nestjs/config';
import { FichasModule } from './fichas/fichas.module';
import { TypeOrmModule } from '@nestjs/typeorm';

console.log('🚀 Variables de entorno:');
console.log('HOST:', process.env.HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DATABASE:', process.env.DATABASE);
console.log('USERNAME:', process.env.DB_USERNAME);
console.log('PASSWORD:', process.env.PASSWORD);
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DATABASE,
      username: process.env.DB_USERNAME,
      password: process.env.PASSWORD,
      entities: [__dirname + '/**/*.entity.{ts,js}'],
      autoLoadEntities: true,
      synchronize:true,
      // dropSchema:true
    }),

    AuthModule,
    UsuariosModule,
    ModulosModule,
    PermisosModule,
    ProgramasModule,
    RolesModule,
    RolpermisoModule,
    RutasModule,
    FichasModule,
  ],
})
export class AppModule {}

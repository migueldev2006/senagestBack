import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { Rol } from 'src/roles/entities/rol.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolPermiso } from 'src/rolpermiso/entities/rolpermiso.entity';
import { Modulo } from 'src/modulos/entities/modulo.entity';
import { Permiso } from 'src/permisos/entities/permiso.entity';
import { RutaFront } from 'src/rutas/entities/ruta.entity';

@Module({
  imports : [
    ConfigModule.forRoot(),
    PassportModule,
    TypeOrmModule.forFeature([Usuario, Rol, RolPermiso,Modulo,Permiso, RutaFront]),
    JwtModule.registerAsync({
      imports : [ConfigModule],
      inject : [ConfigService],
      useFactory : (configService : ConfigService) => ({
        secret : configService.get<string>('JWT_SECRET'),
        signOptions : {
          expiresIn : configService.get<string>('JWT_EXPIRATION')
        }
      })
    })
  ],
  providers: [AuthService, JwtStrategy, ConfigService],
  controllers: [AuthController]
})
export class AuthModule {}

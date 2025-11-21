import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './types/jwtPayload';
import { ConfigService } from '@nestjs/config';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { Rol } from 'src/roles/entities/rol.entity';
import { Modulo } from 'src/modulos/entities/modulo.entity';
import { RutaFront } from 'src/rutas/entities/ruta.entity';
import { Permiso } from 'src/permisos/entities/permiso.entity';
import { RolPermiso } from 'src/rolpermiso/entities/rolpermiso.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepo: Repository<Usuario>,

    @InjectRepository(Rol)
    private rolRepo: Repository<Rol>,

    @InjectRepository(Modulo)
    private moduloRepo: Repository<Modulo>,

    @InjectRepository(RutaFront)
    private rutaRepo: Repository<RutaFront>,

    @InjectRepository(Permiso)
    private permisoRepo: Repository<Permiso>,

    @InjectRepository(RolPermiso)
    private rolPermisoRepo: Repository<RolPermiso>,

    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async comparePasswords(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // ---------------------------------------------------
  // 🔐 LOGIN
  // ---------------------------------------------------
  async login(data: LoginDto): Promise<any> {
    const user = await this.usuarioRepo.findOne({
      where: { correo: data.correo, estado: true },
      relations: ['rol'],
    });

    if (!user)
      throw new HttpException(
        { status: 404, message: 'User not found.' },
        HttpStatus.NOT_FOUND,
      );

    if (!(await this.comparePasswords(data.contrasena, user.contrasena)))
      throw new HttpException(
        { status: 401, message: 'Wrong password. Please try again.' },
        HttpStatus.UNAUTHORIZED,
      );

    const payload: JwtPayload = {
      sub: user.id,
      identificacion: String(user.identificacion),
      correo: user.correo,
      img: user.img,
      rolId: user.rol!.id,
      rol: user.rol!.nombre,
      nombre: `${user.primerNombre} ${user.primerApellido}`,
    };

    const modulos = await this.getModulosPorRol(user.rol!.id);

    return {
      status: 200,
      message: 'Login successful',
      access_token: this.jwtService.sign(payload),
      modulos,
    };
  }

  // ---------------------------------------------------
  // 🔥 OBTENER MÓDULOS + RUTAS + PERMISOS (TYPEORM)
  // ---------------------------------------------------
  async getModulosPorRol(rolId?: number) {
    const modulos = await this.moduloRepo.find({
      where: { estado: true },
      relations: [
        'rutas',
        'rutas.permisos',
        'rutas.permisos.roles',
        'rutas.permisos.roles.rol',
      ],
    });

    return modulos
      .map((mod) => ({
        ...mod,
        rutas: mod.rutas
          .filter(
            (r) =>
              r.estado &&
              r.permisos.some(
                (p) =>
                  p.estado &&
                  p.roles.some(
                    (rp) =>
                      rp.rol.id === rolId &&
                      rp.valor === true &&
                      rp.rol.estado === true,
                  ),
              ),
          )
          .map((r) => ({
            ...r,
            permisos: r.permisos
              .filter(
                (p) =>
                  p.estado &&
                  p.roles.some(
                    (rp) =>
                      rp.rol.id === rolId &&
                      rp.valor === true &&
                      rp.rol.estado === true,
                  ),
              )
              .map((p) => ({
                id: p.id,
                nombre: p.nombre,
                descripcion: p.descripcion,
                tipo: p.tipo,
              })),
          })),
      }))
      .filter((mod) => mod.rutas.length > 0);
  }

  // ---------------------------------------------------
  // 🔄 REFETCH PERMISOS
  // ---------------------------------------------------
  async refetchPermisos(rolId: number) {
    const modulos = await this.getModulosPorRol(rolId);
    return {
      status: 200,
      message: 'User permisos fetched successfully',
      modulos,
    };
  }

  // ---------------------------------------------------
  // 📧 EMAIL
  // ---------------------------------------------------
  async sendEmail(email: string, subject: string, html: string) {
    const transporter = nodemailer.createTransport({
      service: this.configService.get<string>('MAILER_SERVICE'),
      auth: {
        user: this.configService.get<string>('MAILER_USER'),
        pass: this.configService.get<string>('MAILER_PASS'),
      },
    });

    return transporter.sendMail({
      from: this.configService.get<string>('MAILER_USER'),
      to: email,
      subject,
      html,
    });
  }

  // ---------------------------------------------------
  // 🔒 FORGOT PASSWORD
  // ---------------------------------------------------
  async forgotPassword(email: string) {
    const user = await this.usuarioRepo.findOne({ where: { correo: email } });

    if (!user)
      throw new HttpException(
        { status: 404, message: 'E-mail not registered' },
        HttpStatus.NOT_FOUND,
      );

    const token = this.jwtService.sign({ email }, { expiresIn: '1h' });

    const HOST = this.configService.get<string>('FRONTHOST');
    const PORT = this.configService.get<string>('FRONTPORT');

    await this.sendEmail(
      email,
      'Reestablecimiento de contraseña - SENAGEST',
      `<h1>Para reestablecer su contraseña, haga click aquí</h1>
      <a href='http://${HOST}:${PORT}/reset-password?token=${token}'>Reestablecer contraseña</a>`,
    );

    return { status: 200, message: 'Mail sent, check your E-mail' };
  }

  // ---------------------------------------------------
  // 🔑 RESET PASSWORD
  // ---------------------------------------------------
  async resetPassword(data: { token: string; password: string }) {
    try {
      const payload = this.jwtService.verify(data.token);
      if (!payload) return { status: 400, message: 'Invalid token' };

      const hash = await bcrypt.hash(data.password, 10);

      await this.usuarioRepo.update(
        { correo: payload.email },
        { contrasena: hash },
      );

      return { status: 200, message: 'Password updated successfully' };
    } catch {
      throw new HttpException(
        { status: 400, message: 'Invalid token' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ---------------------------------------------------
  // 🔐 CAMBIAR CONTRASEÑA
  // ---------------------------------------------------
  async updatePassword(data: UpdatePasswordDto, userId: number) {
    const user = await this.usuarioRepo.findOne({ where: { id: userId } });

    if (!user)
      throw new HttpException(
        { status: 404, message: 'This userId is invalid' },
        HttpStatus.NOT_FOUND,
      );

    const verify = await bcrypt.compare(data.oldPassword, user.contrasena);
    if (!verify)
      throw new HttpException(
        { status: 400, message: 'Wrong password' },
        HttpStatus.BAD_REQUEST,
      );

    const newHash = await bcrypt.hash(data.newPassword, 10);

    const updated = await this.usuarioRepo.save({
      ...user,
      contrasena: newHash,
    });

    return {
      status: 200,
      message: 'Password updated successfully',
      data: { ...updated, identificacion: `${updated.identificacion}` },
    };
  }
}

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { ConfigService } from '@nestjs/config';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Usuario } from './entities/usuario.entity';
import { Ficha } from 'src/fichas/entities/ficha.entity';
import { Rol } from 'src/roles/entities/rol.entity';
import { Permiso } from 'src/permisos/entities/permiso.entity';
import { RolPermiso } from 'src/rolpermiso/entities/rolpermiso.entity';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepo: Repository<Usuario>,

    @InjectRepository(Ficha)
    private fichaRepo: Repository<Ficha>,

    @InjectRepository(Rol)
    private rolRepo: Repository<Rol>,

    @InjectRepository(Permiso)
    private permisoRepo: Repository<Permiso>,

    @InjectRepository(RolPermiso)
    private rolPermisoRepo: Repository<RolPermiso>,

    private configService: ConfigService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  generatePassword(length = 6) {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    return password;
  }

  async sendEmail(email: string, password: string) {
    const transporter = nodemailer.createTransport({
      service: this.configService.get<string>('MAILER_SERVICE'),
      auth: {
        user: this.configService.get<string>('MAILER_USER'),
        pass: this.configService.get<string>('MAILER_PASS'),
      },
    });

    await transporter.sendMail({
      from: this.configService.get<string>('MAILER_USER'),
      to: email,
      subject: 'SENAGEST - Nueva cuenta',
      text: 'Usted ha sido registrado en SENAGEST. Su contraseña es: ' + password,
    });
  }

  async updateProfilePicture(userId: number, file: Express.Multer.File) {
    await this.usuarioRepo.update(
      { id: userId },
      { img: `resize-${file.filename}` },
    );

    return {
      status: 200,
      message: 'Profile picture updated successfully',
    };
  }

  async createUsuario(data: CreateUsuarioDto, file?: Express.Multer.File) {
    if (data.fichaId) {
      const ficha = await this.fichaRepo.findOne({
        where: { codigo: data.fichaId },
      });

      if (!ficha)
        throw new HttpException(
          { status: 404, message: 'Ficha not found.' },
          HttpStatus.NOT_FOUND,
        );
    }

    const existingUser = await this.usuarioRepo.findOne({
      where: [
        { identificacion: String(data.identificacion) },
        { correo: data.correo },
      ],
    });

    if (existingUser)
      throw new HttpException(
        { status: 400, message: 'User already exists' },
        HttpStatus.BAD_REQUEST,
      );

    const newPassword = this.generatePassword();
    const hash = await this.hashPassword(newPassword);

    const newUserSaved = await this.usuarioRepo.save({
      ...data,
      identificacion: String(data.identificacion),
      contrasena: hash,
      img: file ? `resize-${file.filename}` : 'defaultpfp.png',
    });

    await this.sendEmail(data.correo, newPassword);

    return {
      status: 201,
      message: 'User registered successfully.',
      data: {
        ...newUserSaved,
        identificacion: String(newUserSaved.identificacion),
      },
    };
  }

  async getUsuarios(page: number, search?: string) {
    const records = 10;

    let where: any = {};

    if (search) {
      if (isNaN(Number(search))) {
        where = [
          { primerNombre: Like(`%${search}%`) },
          { segundoNombre: Like(`%${search}%`) },
          { primerApellido: Like(`%${search}%`) },
          { segundoApellido: Like(`%${search}%`) },
        ];
      } else {
        where = { identificacion: String(search) };
      }
    }

    const [users, total] = await this.usuarioRepo.findAndCount({
      where,
      take: records,
      skip: (page - 1) * records,
      order: { id: 'ASC' },
      relations: ['ficha', 'rol'],
    });

    const processed = users.map((u) => ({
      ...u,
      identificacion: String(u.identificacion),
      fichaId: u.ficha?.codigo ?? null,
      rolId: u.rol?.id ?? null,
    }));

    return {
      status: 200,
      message: 'Users fetched successfully',
      data: processed,
      currentPage: page,
      totalPages: Math.ceil(total / records),
    };
  }

  async updateUsuario(userId: number, data: UpdateUsuarioDto) {
    const user = await this.usuarioRepo.findOne({
      where: { id: userId },
    });

    if (!user)
      throw new HttpException(
        { status: 404, message: 'User not found' },
        HttpStatus.NOT_FOUND,
      );

const updated = await this.usuarioRepo.save({
  ...user,
  ...data,
  identificacion: data.identificacion
    ? String(data.identificacion)
    : user.identificacion,
});


    return {
      status: 200,
      message: 'User updated successfully',
      data: {
        ...updated,
        identificacion: String(updated.identificacion),
      },
    };
  }

  async getProfile(userId: number) {
    const user = await this.usuarioRepo.findOne({
      where: { id: userId },
      relations: ['rol', 'rol.permisos', 'rol.permisos.permiso'],
    });

    if (!user)
      throw new HttpException(
        { status: 404, message: 'User not found' },
        HttpStatus.NOT_FOUND,
      );

    const permisosCount = await this.rolPermisoRepo.count({
      where: { rol: { id: user.rol?.id } },
    });

    const parsed = {
      ...user,
      identificacion: String(user.identificacion),
      rol: user.rol
        ? {
            ...user.rol,
            permisos: user.rol.permisos.map((p) => p.permiso),
            numberOfPermissions: permisosCount,
          }
        : null,
    };

    return {
      status: 200,
      message: 'Profile fetched successfully',
      data: parsed,
    };
  }

  async updateStatus(id: number) {
    const user = await this.usuarioRepo.findOne({
      where: { id },
    });

    if (!user)
      throw new HttpException(
        { status: 404, message: 'User not found' },
        HttpStatus.NOT_FOUND,
      );

    user.estado = !user.estado;

    const updated = await this.usuarioRepo.save(user);

    return {
      status: 200,
      message: 'Status updated successfully',
      data: {
        ...updated,
        identificacion: String(updated.identificacion),
      },
    };
  }
}

// seed.ts
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TipoPermiso } from './src/enums/tipo-permiso.enum';
import { Ficha } from './src/fichas/entities/ficha.entity';
import { Modulo } from './src/modulos/entities/modulo.entity';
import { Permiso } from './src/permisos/entities/permiso.entity';
import { Programa } from './src/programas/entities/programa.entity';
import { Rol } from './src/roles/entities/rol.entity';
import { RolPermiso } from './src/rolpermiso/entities/rolpermiso.entity';
import { RutaFront } from './src/rutas/entities/ruta.entity';
import { Usuario } from './src/usuarios/entities/usuario.entity';
import * as dotenv from 'dotenv';
dotenv.config();


const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.PASSWORD,
  entities: [Usuario, Rol, Permiso, Modulo, RolPermiso, Ficha, RutaFront, Programa],
  synchronize: false, // true si quieres sincronizar las entidades
});
console.log('PASSWORD:', process.env.PASSWORD);

  async function seed() {
    try {
           console.log("Conectando a la base de datos...");
    await AppDataSource.initialize();

    const moduloRepo = AppDataSource.getRepository(Modulo);
    const programaRepo = AppDataSource.getRepository(Programa);
    const fichaRepo = AppDataSource.getRepository(Ficha);
    const rutaRepo = AppDataSource.getRepository(RutaFront);
    const permisoRepo = AppDataSource.getRepository(Permiso);
    const rolRepo = AppDataSource.getRepository(Rol);
    const rpRepo = AppDataSource.getRepository(RolPermiso);
    const usuarioRepo = AppDataSource.getRepository(Usuario);

    const modulos = await moduloRepo.save([
      { id: 1, nombre: 'Modulos', descripcion: 'Administración global de módulos', icono: 'Server' },
      { id: 2, nombre: 'Permisos', descripcion: 'Permite administrar y asignar permisos', icono: 'Ban' },
      { id: 3, nombre: 'Roles', descripcion: 'Modulo de creación y administración de roles', icono: 'GraduationCap' },
      { id: 4, nombre: 'Usuarios', descripcion: 'Permite asignación de roles', icono: 'UsersRound' },
      { id: 5, nombre: 'Rutas', descripcion: 'Registro de rutas para el front', icono: 'Atom' },
    ]);

    // 2) Programa
    const programa = await programaRepo.save({
      id: 1,
      nombre: 'Análisis y Desarrollo de Software',
      abreviacion: 'ADSO',
    });

    // 3) Ficha
    await fichaRepo.save({
      codigo: 1,
      programa,
    });

    // 4) Rutas
    const rutas = await rutaRepo.save([
      { id: 1, ruta: 'home', nombre: 'Administrar módulos', modulo: modulos[0] },
      { id: 2, ruta: 'home', nombre: 'Administrar permisos', modulo: modulos[1] },
      { id: 3, ruta: 'asign', nombre: 'Asignar permisos', modulo: modulos[1] },
      { id: 4, ruta: 'home', nombre: 'Administrar roles', modulo: modulos[2] },
      { id: 5, ruta: 'home', nombre: 'Administrar usuarios', modulo: modulos[3] },
      { id: 6, ruta: 'home', nombre: 'Administrar rutas', modulo: modulos[4] },
    ]);

    // 5) Permisos
    const permisosData = [
      { id: 1,  nombre: 'Crear Módulo', descripcion: 'Permite la creación de módulos', tipo: TipoPermiso.write, ruta: rutas[0] },
      { id: 2,  nombre: 'Leer Módulos', descripcion: 'Permite obtener módulos', tipo: TipoPermiso.read, ruta: rutas[0] },
      { id: 3,  nombre: 'Actualizar Módulo', descripcion: 'Actualizar módulo', tipo: TipoPermiso.update, ruta: rutas[0] },
      { id: 4,  nombre: 'Desactivar Módulo', descripcion: 'Act/Des módulo', tipo: TipoPermiso.delete, ruta: rutas[0] },
      { id: 5,  nombre: 'Crear Permiso', descripcion: 'Crear permisos', tipo: TipoPermiso.write, ruta: rutas[1] },
      { id: 6,  nombre: 'Leer Permisos', descripcion: 'Leer permisos', tipo: TipoPermiso.read, ruta: rutas[1] },
      { id: 7,  nombre: 'Actualizar Permiso', descripcion: 'Actualizar permiso', tipo: TipoPermiso.update, ruta: rutas[1] },
      { id: 8,  nombre: 'Desactivar Permiso', descripcion: 'Desactivar permiso', tipo: TipoPermiso.delete, ruta: rutas[1] },
      { id: 9,  nombre: 'Asignar Permiso', descripcion: 'Asignar permiso', tipo: TipoPermiso.write, ruta: rutas[2] },
      { id: 10, nombre: 'Crear Rol', descripcion: 'Crear rol', tipo: TipoPermiso.write, ruta: rutas[3] },
      { id: 11, nombre: 'Leer Roles', descripcion: 'Leer roles', tipo: TipoPermiso.read, ruta: rutas[3] },
      { id: 12, nombre: 'Actualizar Rol', descripcion: 'Actualizar rol', tipo: TipoPermiso.update, ruta: rutas[3] },
      { id: 13, nombre: 'Desactivar Rol', descripcion: 'Desactivar rol', tipo: TipoPermiso.delete, ruta: rutas[3] },
      { id: 14, nombre: 'Crear Usuario', descripcion: 'Crear usuario', tipo: TipoPermiso.write, ruta: rutas[4] },
      { id: 15, nombre: 'Leer Usuarios', descripcion: 'Leer usuarios', tipo: TipoPermiso.read, ruta: rutas[4] },
      { id: 16, nombre: 'Actualizar Usuario', descripcion: 'Actualizar usuario', tipo: TipoPermiso.update, ruta: rutas[4] },
      { id: 17, nombre: 'Desactivar Usuario', descripcion: 'Desactivar usuario', tipo: TipoPermiso.delete, ruta: rutas[4] },
      { id: 18, nombre: 'Crear Ruta', descripcion: 'Crear ruta', tipo: TipoPermiso.write, ruta: rutas[5] },
      { id: 19, nombre: 'Leer Rutas', descripcion: 'Leer rutas', tipo: TipoPermiso.read, ruta: rutas[5] },
      { id: 20, nombre: 'Actualizar Ruta', descripcion: 'Actualizar ruta', tipo: TipoPermiso.update, ruta: rutas[5] },
      { id: 21, nombre: 'Desactivar Ruta', descripcion: 'Desactivar ruta', tipo: TipoPermiso.delete, ruta: rutas[5] },
    ];

    const permisos = await permisoRepo.save(permisosData);

    // 6) Rol
    const adminRol = await rolRepo.save({
      id: 1,
      nombre: 'Administrador',
      descripcion: 'Acceso total al sistema',
      icono: 'ShieldUser',
    });

    // 7) RolPermiso (todos en 1)
    for (const p of permisos) {
      await rpRepo.save({
        permiso: p,
        rol: adminRol,
        valor: true,
      });
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    await usuarioRepo.save({
      identificacion: "1081729282",
      primerNombre: 'Admin',
      primerApellido: 'Account',
      correo: 'admin',
      contrasena: hashedPassword,
      rol: adminRol,
      fechaNacimiento: new Date('2000-01-01'),
      img: 'defaultpfp.png',
    });

    console.log('SEED COMPLETO EJECUTADO ✔');
   process.exit();
    } catch (error) {
          console.error('Error ejecutando seed:', error);
    process.exit(1);
    }
    

}

seed()

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Permiso } from './entities/permiso.entity';
import { RutaFront } from 'src/rutas/entities/ruta.entity';
import { Modulo } from 'src/modulos/entities/modulo.entity';
import { CreatePermisoDto } from './dto/create-permiso.dto';
import { UpdatePermisoDto } from './dto/update-permiso.dto';

@Injectable()
export class PermisosService {
  constructor(
    @InjectRepository(Permiso)
    private readonly permisoRepo: Repository<Permiso>,

    @InjectRepository(RutaFront)
    private readonly rutaRepo: Repository<RutaFront>,

    @InjectRepository(Modulo)
    private readonly moduloRepo: Repository<Modulo>,
  ) {}

  async createPermiso(data: CreatePermisoDto) {
    const ruta = await this.rutaRepo.findOne({
      where: { id: data.rutaId },
    });
    if (!ruta)
      throw new HttpException('Ruta not found', HttpStatus.NOT_FOUND);

    const permiso = this.permisoRepo.create({
      ...data,
      ruta,
    });

    await this.permisoRepo.save(permiso);

    return {
      status: 201,
      message: 'Permiso created successfully',
      data: permiso,
    };
  }

  async getPermisos(id: number, page: number, search?: string) {
    const modulo = await this.moduloRepo.findOne({
      where: { id },
      relations: ['rutas', 'rutas.permisos'], // <– FIX
    });

    if (!modulo)
      throw new HttpException('Modulo not found', HttpStatus.NOT_FOUND);

    let permisos = modulo.rutas.flatMap((r) => r.permisos);

    if (search) {
      permisos = permisos.filter((p) =>
        p.nombre.toLowerCase().includes(search.toLowerCase()),
      );
    }

    const records = 10;
    const start = (page - 1) * records;

    return {
      status: 200,
      message: 'Permisos fetched successfully',
      data: {
        id: modulo.id,
        nombre: modulo.nombre,
        icono: modulo.icono,
        permisos: permisos.slice(start, start + records),
      },
      totalPages: Math.ceil(permisos.length / records),
      currentPage: page,
    };
  }

  async updatePermiso(id: number, data: UpdatePermisoDto) {
    await this.permisoRepo.update({ id }, { ...data });

    const updated = await this.permisoRepo.findOne({
      where: { id },
      relations: ['ruta'],
    });

    return {
      status: 200,
      message: 'Permiso updated successfully',
      data: updated,
    };
  }

  async updateStatus(id: number) {
    const permiso = await this.permisoRepo.findOne({ where: { id } });

    if (!permiso)
      throw new HttpException('Permiso not found', HttpStatus.NOT_FOUND);

    permiso.estado = !permiso.estado;
    await this.permisoRepo.save(permiso);

    return {
      status: 200,
      message: 'Status updated successfully',
      data: permiso,
    };
  }
}

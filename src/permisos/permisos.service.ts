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
    const permiso = this.permisoRepo.create({
      ...data,
      tipo: data.tipo as any,
    });
    await this.permisoRepo.save(permiso);
    return {
      status: 201,
      message: 'Permiso created successfully',
      data: permiso,
    };
  }

  async getPermisos(id: number, page: number, search?: string) {
    const records = 10;
    const skip = (page - 1) * records;

    const modulo = await this.moduloRepo.findOne({
      where: { id },
      relations: ['rutas', 'rutas.permisos'],
    });

    if (!modulo)
      throw new HttpException(
        { status: 404, message: 'Modulo not found' },
        HttpStatus.NOT_FOUND,
      );

    const permisos = modulo.rutas.flatMap((ruta) =>
      ruta.permisos.filter((p) =>
        search ? p.nombre.toLowerCase().includes(search.toLowerCase()) : true,
      ),
    );

    const permisosCount = permisos.length;
    const paginatedPermisos = permisos.slice(skip, skip + records);

    return {
      status: 200,
      message: 'Permisos fetched successfully',
      data: {
        id: modulo.id,
        nombre: modulo.nombre,
        icono: modulo.icono,
        permisos: paginatedPermisos,
      },
      currentPage: page,
      totalPages: Math.ceil(permisosCount / records),
    };
  }

  async updatePermiso(id: number, data: UpdatePermisoDto) {
    await this.permisoRepo.update({ id }, { ...data, tipo: data.tipo as any });
    const updatedPermiso = await this.permisoRepo.findOne({ where: { id } });

    return {
      status: 200,
      message: 'Permiso updated successfully',
      data: updatedPermiso,
    };
  }

  async updateStatus(id: number) {
    const permiso = await this.permisoRepo.findOne({ where: { id } });

    if (!permiso)
      throw new HttpException(
        { status: 404, message: 'Permiso not found' },
        HttpStatus.NOT_FOUND,
      );

    await this.permisoRepo.update({ id }, { estado: !permiso.estado });

    const updatedPermiso = await this.permisoRepo.findOne({ where: { id } });

    return {
      status: 200,
      message: 'status updated successfully',
      data: updatedPermiso,
    };
  }
}

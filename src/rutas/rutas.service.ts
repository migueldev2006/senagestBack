import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { RutaFront } from './entities/ruta.entity';
import { Modulo } from 'src/modulos/entities/modulo.entity';
import { CreateRutaDto } from './dto/create-ruta.dto';
import { UpdateRutaDto } from './dto/update-ruta.dto';

@Injectable()
export class RutasService {
  constructor(
    @InjectRepository(RutaFront)
    private rutaRepo: Repository<RutaFront>,

    @InjectRepository(Modulo)
    private moduloRepo: Repository<Modulo>,
  ) {}

  async createRuta(data: CreateRutaDto) {
    const modulo = await this.moduloRepo.findOne({
      where: { id: data.moduloId },
    });
    if (!modulo)
      throw new HttpException('Modulo not found', HttpStatus.NOT_FOUND);

    const ruta = this.rutaRepo.create({
      ...data,
      modulo,
    });

    await this.rutaRepo.save(ruta);

    return {
      status: 201,
      message: 'Ruta created successfully',
      data: ruta,
    };
  }

  async getRutasByModule(id: number, page: number, search?: string) {
    const records = 10;
    const skip = (page - 1) * records;

    const rutas = await this.rutaRepo.find({
      where: {
        modulo: { id },
        ...(search ? { nombre: Like(`%${search}%`) } : {}),
      },
      relations: ['modulo', 'permisos'], // <– FIX
      take: records,
      skip,
    });

    const total = await this.rutaRepo.count({
      where: { modulo: { id } },
    });

    return {
      status: 200,
      message: 'Rutas fetched successfully',
      data: rutas,
      totalPages: Math.ceil(total / records),
      currentPage: page,
    };
  }

  async getAllRutasByModule(id: number) {
    const rutas = await this.rutaRepo.find({
      where: { modulo: { id } },
      relations: ['modulo', 'permisos'], // <– FIX
    });

    return {
      status: 200,
      message: 'Rutas found successfully',
      data: rutas,
    };
  }

  async updateRuta(id: number, data: UpdateRutaDto) {
    const ruta = await this.rutaRepo.findOne({ where: { id } });
    if (!ruta)
      throw new HttpException('Ruta not found', HttpStatus.NOT_FOUND);

    let modulo:Modulo|null = null;
    if (data.moduloId) {
      modulo = await this.moduloRepo.findOne({ where: { id: data.moduloId } });
      if (!modulo)
        throw new HttpException('Modulo not found', HttpStatus.NOT_FOUND);
    }

    const updated = await this.rutaRepo.save({
      ...ruta,
      ...data,
      ...(modulo ? { modulo } : {}),
    });

    return {
      status: 200,
      message: 'Ruta updated successfully',
      data: updated,
    };
  }

  async updateStatus(id: number) {
    const ruta = await this.rutaRepo.findOne({ where: { id } });
    if (!ruta)
      throw new HttpException('Ruta not found', HttpStatus.NOT_FOUND);

    ruta.estado = !ruta.estado;
    await this.rutaRepo.save(ruta);

    return {
      status: 200,
      message: 'Status updated successfully',
      data: ruta,
    };
  }
}

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { Rol } from './entities/rol.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
  ) {}

  async createRol(data: CreateRolDto) {
    const newRole = this.rolRepo.create(data);
    await this.rolRepo.save(newRole);

    return { status: 201, message: 'Rol created successfully', data: newRole };
  }

  async getRoles(page: number, search?: string) {
    const records = 10;
    const skip = (page - 1) * records;

    const [roles, roleCount] = await this.rolRepo.findAndCount({
      where: search ? { nombre: search } : {},
      take: records,
      skip,
    });

    const totalPages = Math.ceil(roleCount / records);

    return {
      status: 200,
      message: 'Roles fetched successfully',
      data: roles,
      currentPage: page,
      totalPages,
    };
  }

  async getAllRoles() {
    const roles = await this.rolRepo.find();
    return { status: 200, message: 'Roles fetched successfully', data: roles };
  }

  async updateRol(id: number, data: UpdateRolDto) {
    await this.rolRepo.update(id, data);
    const updatedRol = await this.rolRepo.findOne({ where: { id } });

    return {
      status: 200,
      message: 'Rol updated successfully',
      data: updatedRol,
    };
  }

  async updateStatus(id: number) {
    const existingRol = await this.rolRepo.findOne({ where: { id } });

    if (!existingRol)
      throw new HttpException(
        { status: 404, message: 'Rol not found' },
        HttpStatus.NOT_FOUND,
      );

    existingRol.estado = !existingRol.estado;
    const updatedRol = await this.rolRepo.save(existingRol);

    return {
      status: 200,
      message: 'Status updated successfully',
      data: updatedRol,
    };
  }
}

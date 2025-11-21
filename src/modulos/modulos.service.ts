import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Modulo } from './entities/modulo.entity';
import { CreateModuloDto } from './dto/create-modulo.dto';
import { UpdateModuloDto } from './dto/update-modulo.dto';

@Injectable()
export class ModulosService {
    
    constructor(
        @InjectRepository(Modulo)
        private readonly moduloRepo: Repository<Modulo>,
    ) {}

    async createModulo(data: CreateModuloDto) {
        const newModulo = this.moduloRepo.create(data);
        await this.moduloRepo.save(newModulo);
        return { status: 201, message: "Modulo created successfully.", data: newModulo };
    }

    async getModulos(page: number, search?: string) {
        const records = 10;

        const [modulos, total] = await this.moduloRepo.findAndCount({
            where: search ? { nombre: Like(`%${search}%`) } : {},
            take: records,
            skip: (page - 1) * records
        });

        const totalPages = Math.ceil(total / records);

        return {
            status: 200,
            message: "Modulos fetched successfully",
            data: modulos,
            currentPage: page,
            totalPages
        };
    }

    async getAllModulos() {
        const modules = await this.moduloRepo.find();
        return {
            status: 200,
            message: 'Modules found successfully',
            data: modules,
        };
    }

    async updateModulo(id: number, data: UpdateModuloDto) {
        await this.moduloRepo.update({ id }, data);
        const updated = await this.moduloRepo.findOne({ where: { id } });
        return { status: 200, message: "Modulo updated succesfully", data: updated };
    }

    async updateStatus(id: number) {
        const modulo = await this.moduloRepo.findOne({ where: { id } });

        if (!modulo)
            throw new HttpException(
                { status: 404, message: "Modulo not found" },
                HttpStatus.NOT_FOUND
            );

        await this.moduloRepo.update(
            { id },
            { estado: !modulo.estado }
        );

        const updated = await this.moduloRepo.findOne({ where: { id } });

        return {
            status: 200,
            message: "status updated successfully",
            data: updated
        };
    }
}

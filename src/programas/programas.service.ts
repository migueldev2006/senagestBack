import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProgramaDto } from './dto/create-programa.dto';
import { Programa } from './entities/programa.entity';

@Injectable()
export class ProgramasService {
  constructor(
    @InjectRepository(Programa)
    private readonly programaRepo: Repository<Programa>,
  ) {}

  async createPrograma(data: CreateProgramaDto) {
    const programa = this.programaRepo.create(data);
    await this.programaRepo.save(programa);

    return {
      status: 201,
      message: 'Programa created successfully',
      data: programa,
    };
  }

  async getProgramas(page: number) {
    const records = 10;
    const skip = (page - 1) * records;

    const [programas, programaCount] = await this.programaRepo.findAndCount({
      take: records,
      skip,
    });

    const totalPages = Math.ceil(programaCount / records);

    return {
      status: 200,
      message: 'Programas fetched successfully',
      data: programas,
      currentPage: page,
      totalPages,
    };
  }
}

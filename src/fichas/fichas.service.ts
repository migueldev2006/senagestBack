import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Ficha } from './entities/ficha.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class FichasService {
    constructor(
        @InjectRepository(Ficha)
        private readonly fichaRepo: Repository<Ficha>
    ) {}

    async getAllFichas() {
        const fichas = await this.fichaRepo.find();
        return {
        status: 200,
        message: 'Fichas found successfully',
        data: fichas,
        };
    }
}

import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PsiculturaData } from './psicultura/entities/psicultura-data.entity';

@Controller()
export class RootController {
  constructor(
    @InjectRepository(PsiculturaData)
    private readonly dataRepo: Repository<PsiculturaData>,
  ) {}

  @Get('/')
  async obtenerTodosDatos() {
    try {
      const datos = await this.dataRepo.find({
        relations: ['psicultura'],
        order: { fechaCreacion: 'DESC' },
        take: 1000,
      });

      return {
        ok: true,
        total: datos.length,
        datos: datos,
      };
    } catch (err) {
      return {
        ok: false,
        error: err?.message || 'Error al obtener datos',
      };
    }
  }

  @Get('/api/datos-broker')
  async obtenerDatosBroker() {
    try {
      const datos = await this.dataRepo.find({
        relations: ['psicultura'],
        order: { fechaCreacion: 'DESC' },
        take: 500,
      });

      const resumen = {
        ok: true,
        totalRegistros: datos.length,
        ultimoRegistro: datos[0] || null,
        registrosPorTopico: {} as any,
        registrosPorPsicultura: {} as any,
        datos: datos,
      };

      // Agrupar por tópico
      datos.forEach((d) => {
        if (!resumen.registrosPorTopico[d.topico]) {
          resumen.registrosPorTopico[d.topico] = 0;
        }
        resumen.registrosPorTopico[d.topico]++;
      });

      // Agrupar por psicultura
      datos.forEach((d) => {
        const key = `${d.psicultura.id} - ${d.psicultura.estadoActual}`;
        if (!resumen.registrosPorPsicultura[key]) {
          resumen.registrosPorPsicultura[key] = 0;
        }
        resumen.registrosPorPsicultura[key]++;
      });

      return resumen;
    } catch (err) {
      return {
        ok: false,
        error: err?.message || 'Error al obtener datos del broker',
      };
    }
  }
}

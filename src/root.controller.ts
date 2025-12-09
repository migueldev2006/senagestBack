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
        registrosPorTopico: {} as Record<string, number>,
        registrosPorPsicultura: {} as Record<string, number>,
        datos: datos,
      };

      // Agrupar por tópico
      datos.forEach((d) => {
        if (d.psicultura.topic) {
          resumen.registrosPorTopico[d.psicultura.topic] = (resumen.registrosPorTopico[d.psicultura.topic] || 0) + 1;
        }
      });

      // Agrupar por psicultura
      datos.forEach((d) => {
        const key = `${d.psicultura.id} - ${d.psicultura.estadoActual}`;
        resumen.registrosPorPsicultura[key] = (resumen.registrosPorPsicultura[key] || 0) + 1;
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

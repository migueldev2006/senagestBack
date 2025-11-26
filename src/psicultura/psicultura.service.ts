import { Injectable, HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Psicultura } from './entities/psicultura.entity';
import { TimerDto, ValidarBrokerDto } from './dto';

@Injectable()
export class PsiculturaService {
  private ciclos: Record<number, NodeJS.Timeout> = {};

  constructor(
    @InjectRepository(Psicultura)
    private readonly psiculturaRepo: Repository<Psicultura>,
  ) {}
async validarBroker(dto: ValidarBrokerDto) {
  const { url, usuario, contrasena } = dto;
  try {
    const response = await axios.get(url, {
      auth: { username: usuario, password: contrasena },
      timeout: 5000,
      validateStatus: () => true
    });

    if (response.status !== 200) {
      throw new HttpException('Credenciales incorrectas', 400);
    }

    return { ok: true, message: 'Broker validado correctamente' };
  } catch {
    throw new HttpException('Error conectando al broker', 500);
  }
}


  async actualizarTimer(id: number, dto: TimerDto) {
    const registro = await this.psiculturaRepo.findOne({ where: { id } });
    if (!registro) throw new HttpException('Registro no encontrado', 404);
    registro.TiempoEncendido = dto.TiempoEncendido;
    registro.tiempoApagado = dto.tiempoApagado;
    await this.psiculturaRepo.save(registro);
    this.iniciarCicloAutomatico(id);
    return { ok: true, message: 'Timer actualizado y ciclo reiniciado' };
  }

  async iniciarCicloAutomatico(id: number) {
      console.log("🚀 Iniciando ciclo automático de", id);
    if (this.ciclos[id]) clearTimeout(this.ciclos[id]);
    const registro = await this.psiculturaRepo.findOne({ where: { id } });
    if (!registro) return;
    const encenderMs = this.convertirAms(
      registro.TiempoEncendido ?? '00:00:00',
    );
    const apagarMs = this.convertirAms(registro.tiempoApagado ?? '00:00:00');
    await this.cambiarEstado(id, true, false);
    this.ciclos[id] = setTimeout(async () => {
      await this.cambiarEstado(id, false, false);
      this.ciclos[id] = setTimeout(() => {
        this.iniciarCicloAutomatico(id);
      }, apagarMs);
    }, encenderMs);
  }

  convertirAms(interval: string): number {
    const [h, m, s] = interval.split(':').map(Number);
    return h * 3600000 + m * 60000 + s * 1000;
  }

  async cambiarEstado(id: number, estado: boolean, manual = false) {
    const registro = await this.psiculturaRepo.findOne({ where: { id } });
    if (!registro) throw new HttpException('Registro no encontrado', 404);
    registro.estado = estado;
    await this.psiculturaRepo.save(registro);
    if (manual) {
      if (this.ciclos[id]) {
        clearTimeout(this.ciclos[id]);
        delete this.ciclos[id];
      }
    }
    return { ok: true, estado };
  }
}

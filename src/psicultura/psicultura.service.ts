import { Injectable, HttpException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Psicultura } from './entities/psicultura.entity';
import { TimerDto, ValidarBrokerDto } from './dto';

@Injectable()
export class PsiculturaService implements OnModuleInit {
  private ciclos: Record<number, NodeJS.Timeout> = {};

  constructor(
    @InjectRepository(Psicultura)
    private readonly psiculturaRepo: Repository<Psicultura>,
  ) {}

  async getPsiculturaInfo(){
    return await this.psiculturaRepo.find()
  }

  async onModuleInit() {
    const registros = await this.psiculturaRepo.find();
    for (const item of registros) this.iniciarCicloAutomatico(item.id);
  }

  async validarBroker(dto: ValidarBrokerDto) {
    const { url, usuario, contrasena } = dto;
    try {
      const response = await axios.get(url, {
        auth: { username: usuario, password: contrasena },
        timeout: 5000,
        validateStatus: () => true,
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

  if (this.ciclos[id]) {
    clearTimeout(this.ciclos[id]);
    delete this.ciclos[id];
  }

  const nuevo = this.psiculturaRepo.create({
    url: registro.url,
    usuario: registro.usuario,
    contrasena: registro.contrasena,
    TiempoEncendido: dto.TiempoEncendido,
    tiempoApagado: dto.tiempoApagado,
    estado: false
  });

  const guardado = await this.psiculturaRepo.save(nuevo);

  this.iniciarCicloAutomatico(guardado.id);

  return { ok: true, message: 'Nuevo timer creado y ciclo iniciado', id: guardado.id };
}


  async iniciarCicloAutomatico(id: number) {
    console.log('🚀 Iniciando ciclo automático de', id);
    if (this.ciclos[id]) clearTimeout(this.ciclos[id]);
    const registro = await this.psiculturaRepo.findOne({ where: { id } });
    if (!registro) return;

const encenderMs = this.convertirAms(registro.TiempoEncendido);
const apagarMs = this.convertirAms(registro.tiempoApagado);


    console.log(`💡 Encender por ${encenderMs} ms, apagar por ${apagarMs} ms`);

    await this.cambiarEstado(id, true, false);

    this.ciclos[id] = setTimeout(async () => {
      console.log('🔌 Apagando...', id);
      await this.cambiarEstado(id, false, false);

      this.ciclos[id] = setTimeout(() => {
        console.log("♻ Re-iniciando ciclo para", id);
        this.iniciarCicloAutomatico(id);
      }, apagarMs);
    }, encenderMs);
  }

convertirAms(interval: string | null | undefined): number {
  if (!interval) interval = '00:00:00';
  const [h = 0, m = 0, s = 0] = interval.split(':').map(Number);
  return h * 3600000 + m * 60000 + s * 1000;
}

async obtenerEstado(id: number) {
  const registro = await this.psiculturaRepo.findOne({ where: { id } });
  if (!registro) throw new HttpException('Registro no encontrado', 404);
  return { estado: registro.estado };
}

async cambiarEstado(id: number, estado: boolean, manual = false) {
  const registro = await this.psiculturaRepo.findOne({ where: { id } });
  if (!registro) throw new HttpException('Registro no encontrado', 404);

  registro.estado = estado;
  await this.psiculturaRepo.save(registro);

  if (manual) {
    if (this.ciclos[id]) clearTimeout(this.ciclos[id]);
    delete this.ciclos[id];
    this.iniciarCicloAutomatico(id);
  }

  return registro.estado;
}

}

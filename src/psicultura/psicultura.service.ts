import { Injectable, HttpException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Psicultura } from './entities/psicultura.entity';
import { TimerDto, ValidarBrokerDto } from './dto';

@Injectable()
export class PsiculturaService implements OnModuleInit {
  private ciclos: Record<number, NodeJS.Timeout | NodeJS.Timeout[]> = {};
  private manualTimers: Record<number, { inicio: Date | null }> = {};


  constructor(
    @InjectRepository(Psicultura)
    private readonly psiculturaRepo: Repository<Psicultura>,
  ) {}

  async getPsiculturaInfo(){
    return await this.psiculturaRepo.find();
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

 async actualizarTimer(id: number | null, dto: TimerDto) {
  let registro:Psicultura | null = null;

  if (id) {
    registro = await this.psiculturaRepo.findOne({ where: { id } });
  }

  if (!registro) {
    const nuevo = this.psiculturaRepo.create({
      url: '',
      usuario: '',
      contrasena: '',
      tiempoEncendido: dto.tiempoEncendido ?? '00:00:00',
      tiempoApagado: dto.tiempoApagado ?? '00:00:00',
      estado: false,
      estadoActual: 'inactivo',
      modo: 'auto'
    });
    const guardado = await this.psiculturaRepo.save(nuevo);
    this.iniciarCicloAutomatico(guardado.id);
    return { ok: true, message: 'Registro creado y ciclo iniciado', id: guardado.id };
  }

  if (this.ciclos[registro.id]) {
    const val = this.ciclos[registro.id];
    if (Array.isArray(val)) val.forEach((t) => clearTimeout(t));
    else clearTimeout(val);
    delete this.ciclos[registro.id];
  }

  const nuevo = this.psiculturaRepo.create({
    url: registro.url,
    usuario: registro.usuario,
    contrasena: registro.contrasena,
    tiempoEncendido: dto.tiempoEncendido ?? registro.tiempoEncendido,
    tiempoApagado: dto.tiempoApagado ?? registro.tiempoApagado,
    estado: false,
    estadoActual: 'inactivo',
    modo: 'auto'
  });

  const guardado = await this.psiculturaRepo.save(nuevo);
  this.iniciarCicloAutomatico(guardado.id);

  return { ok: true, message: 'Nuevo timer creado y ciclo iniciado', id: guardado.id };
}


  async iniciarCicloAutomatico(id: number) {
    const registro = await this.psiculturaRepo.findOne({ where: { id } });
    if (!registro) return;
    if (registro.modo !== 'auto') return;
    try {
      await axios.get(registro.url, {
        auth: { username: registro.usuario, password: registro.contrasena },
        timeout: 3000,
        validateStatus: () => true,
      });
    } catch {
      registro.estado = false;
      registro.estadoActual = 'broker_down';
      registro.ultimaDesactivacion = new Date();
      await this.psiculturaRepo.save(registro);
      console.log(`estado ${registro.estado}`);
      return;
    }
    if (this.ciclos[id]) {
      const val = this.ciclos[id];
      if (Array.isArray(val)) val.forEach((t) => clearTimeout(t));
      else clearTimeout(val);
      delete this.ciclos[id];
    }
    const encenderMs = this.convertirAms(registro.tiempoEncendido);
    const apagarMs = this.convertirAms(registro.tiempoApagado);
    registro.estado = true;
    registro.estadoActual = 'automatico';
    registro.ultimaActivacion = new Date();
    await this.psiculturaRepo.save(registro);
    console.log(`estado ${registro.estado}`);
    const apagarTimeout = setTimeout(async () => {
      const r = await this.psiculturaRepo.findOne({ where: { id } });
      if (!r) return;
      r.estado = false;
      r.estadoActual = 'automatico';
      r.ultimaDesactivacion = new Date();
      await this.psiculturaRepo.save(r);
      console.log(`estado ${r.estado}`);
      const reiniciarTimeout = setTimeout(() => {
        this.iniciarCicloAutomatico(id);
      }, apagarMs);
      this.ciclos[id] = [reiniciarTimeout];
    }, encenderMs);
    this.ciclos[id] = apagarTimeout;
  }

  convertirAms(interval: string | null | undefined): number {
    if (!interval) interval = '00:00:00';
    const [h = 0, m = 0, s = 0] = interval.split(':').map(Number);
    return h * 3600000 + m * 60000 + s * 1000;
  }

  async obtenerEstado(id: number) {
    const registro = await this.psiculturaRepo.findOne({ where: { id } });
    if (!registro) throw new HttpException('Registro no encontrado', 404);
    return { estado: registro.estado, estadoActual: registro.estadoActual };
  }

async cambiarEstado(id: number, estado: boolean, manual = false) {
  const registro = await this.psiculturaRepo.findOne({ where: { id } });
  if (!registro) throw new HttpException('Registro no encontrado', 404);

  // 1. Detener ciclos automáticos si existían
  if (this.ciclos[id]) {
    const val = this.ciclos[id];
    if (Array.isArray(val)) val.forEach((t) => clearTimeout(t));
    else clearTimeout(val);
    delete this.ciclos[id];
  }

  // 2. Registrar cambio de estado
  const ahora = new Date();

  if (estado) {
    registro.estado = true;
    registro.estadoActual = manual ? 'manual' : 'automatico';
    registro.ultimaActivacion = ahora;

    // ---- INICIO DE CRONOMETRAJE MANUAL ----
    if (manual) {
      this.manualTimers[id] = { inicio: ahora };
      console.log(`[MANUAL] Inicio de activación manual: ${ahora}`);
    }

  } else {
    registro.estado = false;
    registro.estadoActual = manual ? 'manual' : 'automatico';
    registro.ultimaDesactivacion = ahora;

    // ---- FIN DE CRONOMETRAJE MANUAL ----
    if (manual && this.manualTimers[id]?.inicio) {
      const inicio = this.manualTimers[id].inicio;
      const fin = ahora;

      const duracionMs = fin.getTime() - inicio.getTime();
      const duracionSeg = Math.floor(duracionMs / 1000);

      console.log(`[MANUAL] Duración del estado manual ON: ${duracionSeg} segundos`);

      // Aquí puedes GUARDAR LA DURACIÓN en BD si quieres
      delete this.manualTimers[id];
    }
  }

  await this.psiculturaRepo.save(registro);

  console.log(`estado ${registro.estado}`);

  return { estado: registro.estado, estadoActual: registro.estadoActual };
}


  async handleBrokerPayload(id: number, payload: string) {
    const value = payload === '1' || payload === 'true' || payload === 'True';
    const registro = await this.psiculturaRepo.findOne({ where: { id } });
    if (!registro) throw new HttpException('Registro no encontrado', 404);
    registro.estado = value;
    registro.estadoActual = 'manual';
    if (value) registro.ultimaActivacion = new Date();
    else registro.ultimaDesactivacion = new Date();
    await this.psiculturaRepo.save(registro);
    return { estado: registro.estado };
  }

  async handleBrokerConnectionLost(id: number) {
    const registro = await this.psiculturaRepo.findOne({ where: { id } });
    if (!registro) throw new HttpException('Registro no encontrado', 404);
    registro.estado = false;
    registro.estadoActual = 'broker_down';
    registro.ultimaDesactivacion = new Date();
    await this.psiculturaRepo.save(registro);
    return { ok: true };
  }

  async handleBrokerRestored(id: number) {
    const registro = await this.psiculturaRepo.findOne({ where: { id } });
    if (!registro) throw new HttpException('Registro no encontrado', 404);
    const nuevo = this.psiculturaRepo.create({
      url: registro.url,
      usuario: registro.usuario,
      contrasena: registro.contrasena,
      tiempoEncendido: registro.tiempoEncendido,
      tiempoApagado: registro.tiempoApagado,
      estado: false,
      estadoActual: 'inactivo',
      modo: registro.modo
    });
    const guardado = await this.psiculturaRepo.save(nuevo);
    this.iniciarCicloAutomatico(guardado.id);
    return { ok: true, id: guardado.id };
  }

  async reportPowerLoss(id: number) {
    const registro = await this.psiculturaRepo.findOne({ where: { id } });
    if (!registro) throw new HttpException('Registro no encontrado', 404);
    registro.estado = false;
    registro.estadoActual = 'power_down';
    registro.ultimaDesactivacion = new Date();
    await this.psiculturaRepo.save(registro);
    return { ok: true };
  }

  async reportPowerRestore(id: number) {
    const registro = await this.psiculturaRepo.findOne({ where: { id } });
    if (!registro) throw new HttpException('Registro no encontrado', 404);
    registro.estadoActual = 'power_restored_no_activity';
    await this.psiculturaRepo.save(registro);
    return { ok: true };
  }
}

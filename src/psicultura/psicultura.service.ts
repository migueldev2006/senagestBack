import {
  Injectable,
  HttpException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Psicultura } from './entities/psicultura.entity';
import { PsiculturaHistorial } from './entities/psicultura-historial.entity';
import { TimerDto } from './dto';

@Injectable()
export class PsiculturaService implements OnModuleInit {
  private readonly logger = new Logger(PsiculturaService.name);
  private ciclos: Record<number, NodeJS.Timeout | NodeJS.Timeout[]> = {};
  private manualTimers: Record<
    number,
    { ultimoEstado: boolean; inicio: Date }
  > = {};

  constructor(
    @InjectRepository(Psicultura)
    private readonly psiculturaRepo: Repository<Psicultura>,

    @InjectRepository(PsiculturaHistorial)
    private readonly historialRepo: Repository<PsiculturaHistorial>,
  ) {}

  async onModuleInit() {
    const ultimo = await this.psiculturaRepo.findOne({
      where: { modo: 'auto' },
      order: { id: 'DESC' },
    });

    if (ultimo) {
      this.logger.log(
        `Iniciando ciclo automático SOLO con el último registro id=${ultimo.id}`,
      );
      void this.iniciarCicloAutomatico(ultimo.id).catch((e) =>
        this.logger.error(e),
      );
    }
  }

  async getPsiculturaInfo() {
    return await this.psiculturaRepo.find();
  }

  async getHistorial(psiculturaId: number) {
    return await this.historialRepo.find({
      where: { psicultura: { id: psiculturaId } as any },
      order: { id: 'DESC' },
    });
  }

  async getHistorialInfo() {
    return await this.historialRepo.find();
  }

  async iniciarCicloAutomatico(id: number, startEncendido = true) {
    this.logger.log(
      `[AUTO] iniciarCicloAutomatico id=${id} startEncendido=${startEncendido}`,
    );

    const registro = await this.psiculturaRepo.findOne({ where: { id } });
    if (!registro) return;

    if (registro.modo !== 'auto') {
      this.logger.log(`[AUTO] modo != auto id=${id} -> saltear`);
      return;
    }

    // Cancelar cualquier ciclo previo
    if (this.ciclos[id]) {
      const val = this.ciclos[id];
      if (Array.isArray(val)) val.forEach((t) => clearTimeout(t));
      else clearTimeout(val as unknown as NodeJS.Timeout);
      delete this.ciclos[id];
    }

    const encenderMs = this.convertirAms(registro.tiempoEncendido);
    const apagarMs = this.convertirAms(registro.tiempoApagado);

    // Iniciar con el estado definido
    if (startEncendido) {
      registro.estado = true;
      registro.estadoActual = 'automatico';
      registro.ultimaActivacion = new Date();
      await this.psiculturaRepo.save(registro);
    } else {
      registro.estado = false;
      registro.estadoActual = 'automatico';
      registro.ultimaDesactivacion = new Date();
      await this.psiculturaRepo.save(registro);
    }

    // Programar apagado si estaba encendido
    if (startEncendido && encenderMs > 0) {
      const timeout = setTimeout(async () => {
        const r = await this.psiculturaRepo.findOne({ where: { id } });
        if (!r) return;

        r.estado = false;
        r.estadoActual = 'automatico';
        r.ultimaDesactivacion = new Date();
        await this.psiculturaRepo.save(r);

        // Una vez apagado, el ciclo termina, NO se reinicia
        delete this.ciclos[id];
      }, encenderMs);

      this.ciclos[id] = timeout;
    }
  }

  async actualizarTimer(id: number | null, dto: TimerDto) {
    if (id == null) {
      throw new Error('El ID no puede ser null');
    }

    const abierto = await this.buscarHistorialAbierto(id);

    if (abierto) {
      const fin = new Date();
      abierto.fin = fin;
      abierto.tiempoMs = fin.getTime() - abierto.inicio.getTime();
      await this.historialRepo.save(abierto);
    }

    if (id != null) {
      delete this.manualTimers[id];
    }

    const nuevo = this.psiculturaRepo.create();
    Object.assign(nuevo, {
      url: '',
      usuario: '',
      contrasena: '',
      tiempoEncendido: dto.tiempoEncendido ?? '00:00:00',
      tiempoApagado: dto.tiempoApagado ?? '00:00:00',
      estado: true,
      estadoActual: 'automatico',
      modo: 'auto',
      usuarios: { id: 1 },
    });

    const guardado = await this.psiculturaRepo.save(nuevo);
    await this.iniciarCicloAutomatico(guardado.id, true);

    return {
      ok: true,
      message: 'Nuevo timer creado y ciclo iniciado',
      id: guardado.id,
    };
  }

  convertirAms(interval: string | null | undefined): number {
    if (!interval) interval = '00:00:00';
    const [h = 0, m = 0, s = 0] = interval.split(':').map(Number);
    return (h * 3600 + m * 60 + s) * 1000;
  }

  async obtenerEstado(id: number) {
    const registro = await this.psiculturaRepo.findOne({ where: { id } });
    if (!registro) throw new HttpException('Registro no encontrado', 404);
    return { estado: registro.estado, estadoActual: registro.estadoActual };
  }

  private async buscarHistorialAbierto(psiculturaId: number) {
    return await this.historialRepo.findOne({
      where: { psicultura: { id: psiculturaId } as any, fin: IsNull() },
      order: { id: 'DESC' },
    });
  }

  cancelarTodosLosCiclos() {
    for (const key of Object.keys(this.ciclos)) {
      const val = this.ciclos[key];
      if (val) {
        if (Array.isArray(val)) val.forEach((t) => clearTimeout(t));
        else clearTimeout(val as unknown as NodeJS.Timeout);
      }
      delete this.ciclos[key];
    }
  }

async cambiarEstado(dto: {
  psiculturaId: number;
  estado: boolean;
  manual?: boolean;
}) {
  const { psiculturaId, estado, manual = false } = dto;
  const ahora = new Date();

  const registro = await this.psiculturaRepo.findOne({ where: { id: psiculturaId } });
  if (!registro) throw new HttpException('Psicultura no encontrada', 404);

  // Cancelar cualquier ciclo automático previo
  this.cancelarTodosLosCiclos();

  // Cerrar historial abierto
  const historialAbierto = await this.historialRepo.findOne({
    where: { psicultura: { id: psiculturaId } as any, fin: IsNull() },
    order: { id: 'DESC' },
  });
  if (historialAbierto) {
    historialAbierto.fin = ahora;
    historialAbierto.tiempoMs = ahora.getTime() - historialAbierto.inicio.getTime();
    await this.historialRepo.save(historialAbierto);
  }
if (manual) {
  // Guardar historial manual
  const nuevoHistorial = this.historialRepo.create({
    psicultura: registro,
    estado,
    inicio: ahora,
    fin: null,
    tiempoMs: null,
    modo: 'manual',
    fechaCreacion: ahora,
  });
  await this.historialRepo.save(nuevoHistorial);

  // Actualizar el registro original para reflejar toggle manual
  registro.estado = estado;
  registro.estadoActual = 'manual';
  registro.ultimaActivacion = estado ? ahora : registro.ultimaActivacion;
  registro.ultimaDesactivacion = !estado ? ahora : registro.ultimaDesactivacion;

  await this.psiculturaRepo.save(registro);

  return { ok: true, estado };
}

 else {
    // --- AUTOMÁTICO (una sola vez) ---
    const nuevoAuto = this.psiculturaRepo.create();
    Object.assign(nuevoAuto, {
      tiempoEncendido: registro.tiempoEncendido,
      tiempoApagado: registro.tiempoApagado,
      estado: true, // empieza encendido
      estadoActual: 'automatico',
      modo: 'auto',
      ultimaActivacion: ahora,
      ultimaDesactivacion: null,
    });

    const guardado = await this.psiculturaRepo.save(nuevoAuto);

    // Ejecutar ciclo automático UNA sola vez y terminar
    const encenderMs = this.convertirAms(guardado.tiempoEncendido);
    const apagarMs = this.convertirAms(guardado.tiempoApagado);

    // Encendido inicial
    setTimeout(async () => {
      const r = await this.psiculturaRepo.findOne({ where: { id: guardado.id } });
      if (!r) return;
      r.estado = false;
      r.estadoActual = 'automatico';
      r.ultimaDesactivacion = new Date();
      await this.psiculturaRepo.save(r);
    }, encenderMs); // se apaga después del tiempo de encendido

    return {
      ok: true,
      estado: true,
      modo: 'automatico',
      nuevoId: guardado.id,
    };
  }
}

async toggleManual(id: number, estado: boolean) {
  // Llama directamente a cambiarEstado con manual = true
  return this.cambiarEstado({ psiculturaId: id, estado, manual: true });
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

    registro.estado = false;
    registro.estadoActual = 'inactivo';
    await this.psiculturaRepo.save(registro);

    if (registro.modo === 'auto') {
      await this.iniciarCicloAutomatico(id);
    }

    return { ok: true, id };
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

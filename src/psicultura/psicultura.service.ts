// File: src/psicultura/psicultura.service.ts
import { Injectable, HttpException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Psicultura } from './entities/psicultura.entity';
import { PsiculturaHistorial } from './entities/psicultura-historial.entity';
import { TimerDto, ValidarBrokerDto } from './dto';
import { MqttService } from './Broker/mqtt.service';


@Injectable()
export class PsiculturaService implements OnModuleInit {
  private readonly logger = new Logger(PsiculturaService.name);
  private ciclos: Record<number, NodeJS.Timeout | NodeJS.Timeout[]> = {};
  private manualTimers: Record<number, { ultimoEstado: boolean; inicio: Date }> = {};

  constructor(
    @InjectRepository(Psicultura)
    private readonly psiculturaRepo: Repository<Psicultura>,

    @InjectRepository(PsiculturaHistorial)
    private readonly historialRepo: Repository<PsiculturaHistorial>,

    private readonly mqttService: MqttService,
  ) {}

  async onModuleInit() {
    const registros = await this.psiculturaRepo.find();
    for (const item of registros) {
      if (item.modo === 'auto') {
        this.logger.log(`Iniciando ciclo automático en onModuleInit id=${item.id}`);
        void this.iniciarCicloAutomatico(item.id).catch(e => this.logger.error(e));
      }
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

  async validarBroker(dto: ValidarBrokerDto) {
    return { ok: true };
  }

  /**
   * actualizarTimer:
   * - Si id == null => crea nuevo registro psicultura (nuevo timer) y lo inicia en automático.
   * - Si id != null => crea un NUEVO registro igualmente (porque tú quieres que cada actualización cree un nuevo registro).
   *
   * Nota: el registro anterior queda en BD y visible (opción A).
   */
  async actualizarTimer(id: number | null, dto: TimerDto) {
    this.logger.log(`[TIMER] actualizarTimer invoked id=${id}`);

    // Crear nuevo registro siempre (según tu requisito: cada actualización crea un registro nuevo)
    const nuevo = this.psiculturaRepo.create({
      url: '',
      usuario: '',
      contrasena: '',
      tiempoEncendido: dto.tiempoEncendido ?? '00:00:00',
      tiempoApagado: dto.tiempoApagado ?? '00:00:00',
      estado: false,
      estadoActual: 'inactivo',
      modo: 'auto',
    });

    const guardado = await this.psiculturaRepo.save(nuevo);

    // Cancelar ciclos previos si existieran para el nuevo id (no habrán) y
    // opcional: podrías marcar el anterior como inactivo, aquí solo dejamos visible en BD.
    this.logger.log(`[TIMER] Nuevo registro creado id=${guardado.id} — iniciando automático`);
    await this.iniciarCicloAutomatico(guardado.id);

    return { ok: true, message: 'Nuevo timer creado y ciclo iniciado', id: guardado.id };
  }

 async iniciarCicloAutomatico(id: number) {
  this.logger.log(`[AUTO] iniciarCicloAutomatico id=${id}`);

  // ⏳ 1. Esperar conexión MQTT
  try {
    await this.mqttService.waitForConnection();
  } catch (err) {
    this.logger.warn(`[AUTO] MQTT NO disponible tras esperar. id=${id} -> ciclo pausado.`);
    return; // NO iniciar ciclo si no hay broker
  }

  // 2. Buscar registro
  const registro = await this.psiculturaRepo.findOne({ where: { id } });
  if (!registro) {
    this.logger.warn(`[AUTO] registro no encontrado id=${id}`);
    return;
  }

  if (registro.modo !== 'auto') {
    this.logger.log(`[AUTO] modo != auto id=${id} -> saltear`);
    return;
  }

  // 3. Cancelar timers previos
  if (this.ciclos[id]) {
    const val = this.ciclos[id];
    if (Array.isArray(val)) val.forEach(t => clearTimeout(t));
    else clearTimeout(val);
    delete this.ciclos[id];
  }

  const encenderMs = this.convertirAms(registro.tiempoEncendido);
  const apagarMs = this.convertirAms(registro.tiempoApagado);

  this.logger.log(`[AUTO] encenderMs=${encenderMs} apagarMs=${apagarMs} id=${id}`);

  // ➤ REGLA TUYA: NO crear historial automático
  registro.estado = true;
  registro.modo = 'auto';
  registro.estadoActual = 'automatico';
  registro.ultimaActivacion = new Date();
  await this.psiculturaRepo.save(registro);

  // ⛽ 4. Publicar encendido (ya con MQTT listo)
  try {
    this.mqttService.publishSignals(true, false);
  } catch (err) {
    this.logger.error('[AUTO] fallo publicando encendido', err?.message || err);
  }

  // 5. Programar apagado
  const apagarTimeout = setTimeout(async () => {
    const r = await this.psiculturaRepo.findOne({ where: { id } });
    if (!r) return;

    r.estado = false;
    r.estadoActual = 'automatico';
    r.ultimaDesactivacion = new Date();
    await this.psiculturaRepo.save(r);

    // publicar apagado
    try {
      this.mqttService.publishSignals(false, true);
    } catch (err) {
      this.logger.error('[AUTO] fallo publicando apagado', err?.message || err);
    }

    // 🔁 6. Reiniciar ciclo (MISMO ID)
    const reiniciarTimeout = setTimeout(() => {
      void this.iniciarCicloAutomatico(id);
    }, apagarMs);

    this.ciclos[id] = [reiniciarTimeout];
  }, encenderMs);

  this.ciclos[id] = apagarTimeout;
  this.logger.log(`[AUTO] ciclo programado para id=${id}`);
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

  /**
   * cambiarEstado:
   * - Si manual === true => crea/gestiona historial (manual only).
   * - Si manual === false & existe manualTimers[id] => cierra historial manual y arranca auto en el mismo id.
   */
  async cambiarEstado(id: number, estado: boolean, manual = false) {
    const registro = await this.psiculturaRepo.findOne({ where: { id } });
    if (!registro) throw new HttpException('Registro no encontrado', 404);

    const ahora = new Date();

    // MANUAL
    if (manual) {
      const previo = this.manualTimers[id];

      if (!previo) {
        const h = this.historialRepo.create({
          psicultura: registro,
          estado,
          inicio: ahora,
          fin: null,
          tiempoMs: null,
          modo: 'manual',
          fechaCreacion: new Date(),
        });
        const creado = await this.historialRepo.save(h);
        this.manualTimers[id] = { ultimoEstado: estado, inicio: ahora };

        registro.estado = estado;
        registro.estadoActual = 'manual';
        if (estado) registro.ultimaActivacion = ahora;
        else registro.ultimaDesactivacion = ahora;
        await this.psiculturaRepo.save(registro);

        this.mqttService.publishSignals(estado, !estado);

        return { ok: true, estado, historialIdCreated: creado.id };
      }

      // sin cambio
      if (previo.ultimoEstado === estado) return { ok: true, estado };

      // cerrar historial anterior
      const histAbierto = await this.buscarHistorialAbierto(id);
      if (histAbierto) {
        const fin = ahora;
        histAbierto.fin = fin;
        histAbierto.tiempoMs = fin.getTime() - histAbierto.inicio.getTime();
        await this.historialRepo.save(histAbierto);
      }

      // crear nuevo historial manual
      const nuevo = this.historialRepo.create({
        psicultura: registro,
        estado,
        inicio: ahora,
        fin: null,
        tiempoMs: null,
        modo: 'manual',
        fechaCreacion: new Date(),
      });
      const creado = await this.historialRepo.save(nuevo);
      this.manualTimers[id] = { ultimoEstado: estado, inicio: ahora };

      registro.estado = estado;
      registro.estadoActual = 'manual';
      if (estado) registro.ultimaActivacion = ahora;
      else registro.ultimaDesactivacion = ahora;
      await this.psiculturaRepo.save(registro);

      this.mqttService.publishSignals(estado, !estado);

      return { ok: true, estado, historialIdCreated: creado.id };
    }

    // PASO DE MANUAL -> AUTO: cerrar manual y arrancar automático
    if (!manual && this.manualTimers[id]) {
      const histAbierto = await this.buscarHistorialAbierto(id);
      if (histAbierto) {
        const fin = ahora;
        histAbierto.fin = fin;
        histAbierto.tiempoMs = fin.getTime() - histAbierto.inicio.getTime();
        await this.historialRepo.save(histAbierto);
      }
      delete this.manualTimers[id];

      // iniciar ciclo automatico en el mismo id
      await this.iniciarCicloAutomatico(id);
    }

    // MODO AUTOMÁTICO: actualizar estado y publicar
    registro.estado = estado;
    registro.estadoActual = 'automatico';
    if (estado) registro.ultimaActivacion = ahora;
    else registro.ultimaDesactivacion = ahora;
    await this.psiculturaRepo.save(registro);

    this.mqttService.publishSignals(estado, !estado);

    return { ok: true, estado: registro.estado, estadoActual: registro.estadoActual };
  }

async handleBrokerPayload(id: number, payload: string) {
  const value = payload === '1' || payload === 'true';

  const registro = await this.psiculturaRepo.findOne({ where: { id } });
  if (!registro) throw new HttpException('Registro no encontrado', 404);

  // Guardamos TAL CUAL llega del broker
  registro.topic = payload;

    // Broker payloads se tratan como manual (según tu regla)
    registro.estado = value;
    registro.estadoActual = 'manual';
    if (value) registro.ultimaActivacion = new Date();
    else registro.ultimaDesactivacion = new Date();
    await this.psiculturaRepo.save(registro);

    if (value) {
      const abierto = await this.buscarHistorialAbierto(id);
      if (!abierto) {
        const h = this.historialRepo.create({
          psicultura: registro,
          estado: true,
          inicio: new Date(),
          fin: null,
          tiempoMs: null,
          modo: 'manual',
          fechaCreacion: new Date(),
        });
        await this.historialRepo.save(h);
      }
    } else {
      const abierto = await this.buscarHistorialAbierto(id);
      if (abierto) {
        const fin = new Date();
        abierto.fin = fin;
        abierto.tiempoMs = fin.getTime() - abierto.inicio.getTime();
        await this.historialRepo.save(abierto);
      }
    }

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

  async toggleManual(id: number, estado: boolean) {
    return this.cambiarEstado(id, estado, true);
  }
}

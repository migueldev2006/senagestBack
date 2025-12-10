// File: src/psicultura/psicultura.service.ts
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
import { PsiculturaData } from './entities/psicultura-data.entity';
import { TimerDto, ValidarBrokerDto } from './dto';
import { MqttService } from '../mqtt/mqtt.service';
import { BrokerConfigService } from './Broker/broker-config.service';

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

    @InjectRepository(PsiculturaData)
    private readonly dataRepo: Repository<PsiculturaData>,

    private readonly mqttService: MqttService,
  ) {}

  async onModuleInit() {
    const ultimo = await this.psiculturaRepo.findOne({
      where: { modo: 'auto' },
      order: { id: 'DESC' }, // ← EL ÚLTIMO REGISTRO
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
    this.logger.log(`[TRANSICIÓN] Manual → Automático iniciado para id=${id}`);

    // Cerrar historial manual si estaba en manual
    if (id == null) {
      throw new Error('El ID no puede ser null');
    }

    const abierto = await this.buscarHistorialAbierto(id);

    this.logger.log(
      `[HISTORIAL] Cerrando historial manual previo idHistorial=${abierto?.id}`,
    );

    if (abierto) {
      const fin = new Date();
      abierto.fin = fin;
      abierto.tiempoMs = fin.getTime() - abierto.inicio.getTime();
      await this.historialRepo.save(abierto);
    }

    if (id != null) {
      delete this.manualTimers[id];
    }

    // Crear nuevo registro siempre (según tu requisito: cada actualización crea un registro nuevo)
    const nuevo = this.psiculturaRepo.create({
      url: process.env.MQTTURL,
      usuario: process.env.MQTTUSER,
      contrasena: process.env.MQTTPASSWORD,
      tiempoEncendido: dto.tiempoEncendido ?? '00:00:00',
      tiempoApagado: dto.tiempoApagado ?? '00:00:00',
      estado: false,
      estadoActual: 'inactivo',
      modo: 'auto',
    });

    const guardado = await this.psiculturaRepo.save(nuevo);
    this.logger.log(
      `[AUTO] Registro automático creado → nuevoId=${guardado.id}`,
    );

    // Cancelar ciclos previos si existieran para el nuevo id (no habrán) y
    // opcional: podrías marcar el anterior como inactivo, aquí solo dejamos visible en BD.
    this.logger.log(
      `[TIMER] Nuevo registro creado id=${guardado.id} — iniciando automático`,
    );
    await this.iniciarCicloAutomatico(guardado.id, false);

    return {
      ok: true,
      message: 'Nuevo timer creado y ciclo iniciado',
      id: guardado.id,
    };
  }

  async iniciarCicloAutomatico(id: number, startImmediately = true) {
    this.logger.log(
      `[AUTO] iniciarCicloAutomatico id=${id} startImmediately=${startImmediately}`,
    );

    try {
      await this.mqttService.waitForConnection();
    } catch (err) {
      this.logger.warn(
        `[AUTO] MQTT NO disponible tras esperar. id=${id} -> ciclo pausado.`,
      );
      return;
    }

    const registro = await this.psiculturaRepo.findOne({ where: { id } });
    if (!registro) {
      this.logger.warn(`[AUTO] registro no encontrado id=${id}`);
      return;
    }

    if (registro.modo !== 'auto') {
      this.logger.log(`[AUTO] modo != auto id=${id} -> saltear`);
      return;
    }

    for (const key of Object.keys(this.ciclos)) {
      const kid = Number(key);
      if (kid === id) continue;
      const val = this.ciclos[kid];
      if (val) {
        if (Array.isArray(val)) val.forEach((t) => clearTimeout(t));
        else clearTimeout(val as unknown as NodeJS.Timeout);
        delete this.ciclos[kid];
      }
    }

    if (this.ciclos[id]) {
      const val = this.ciclos[id];
      if (Array.isArray(val)) val.forEach((t) => clearTimeout(t));
      else clearTimeout(val as unknown as NodeJS.Timeout);
      delete this.ciclos[id];
    }

    const encenderMs = this.convertirAms(registro.tiempoEncendido);
    const apagarMs = this.convertirAms(registro.tiempoApagado);

    this.logger.log(
      `[AUTO] encenderMs=${encenderMs} apagarMs=${apagarMs} id=${id}`,
    );

    if (startImmediately) {
      registro.estado = true;
      registro.modo = 'auto';
      registro.estadoActual = 'automatico';
      registro.ultimaActivacion = new Date();
      await this.psiculturaRepo.save(registro);

      try {
        this.mqttService.publishSignals(true, false);
      } catch (err) {
        this.logger.error(
          '[AUTO] fallo publicando encendido',
          err?.message || err,
        );
      }

      const apagarTimeout = setTimeout(async () => {
        const r = await this.psiculturaRepo.findOne({ where: { id } });
        if (!r) return;

        r.estado = false;
        r.estadoActual = 'automatico';
        r.ultimaDesactivacion = new Date();
        await this.psiculturaRepo.save(r);

        try {
          this.mqttService.publishSignals(false, true);
        } catch (err) {
          this.logger.error(
            '[AUTO] fallo publicando apagado',
            err?.message || err,
          );
        }

        const reiniciarTimeout = setTimeout(() => {
          void this.iniciarCicloAutomatico(id, true);
        }, apagarMs);

        this.ciclos[id] = [reiniciarTimeout];
      }, encenderMs);

      this.ciclos[id] = apagarTimeout;
      this.logger.log(`[AUTO] ciclo programado para id=${id}`);
      return;
    }

    registro.estado = false;
    registro.modo = 'auto';
    registro.estadoActual = 'automatico';
    await this.psiculturaRepo.save(registro);

    const encenderTimeout = setTimeout(async () => {
      const r = await this.psiculturaRepo.findOne({ where: { id } });
      if (!r) return;

      r.estado = true;
      r.estadoActual = 'automatico';
      r.ultimaActivacion = new Date();
      await this.psiculturaRepo.save(r);

      try {
        this.mqttService.publishSignals(true, false);
      } catch (err) {
        this.logger.error(
          '[AUTO] fallo publicando encendido',
          err?.message || err,
        );
      }

      const apagarTimeout = setTimeout(async () => {
        const r2 = await this.psiculturaRepo.findOne({ where: { id } });
        if (!r2) return;

        r2.estado = false;
        r2.estadoActual = 'automatico';
        r2.ultimaDesactivacion = new Date();
        await this.psiculturaRepo.save(r2);

        try {
          this.mqttService.publishSignals(false, true);
        } catch (err) {
          this.logger.error(
            '[AUTO] fallo publicando apagado',
            err?.message || err,
          );
        }

        const reiniciarTimeout = setTimeout(() => {
          void this.iniciarCicloAutomatico(id, false);
        }, apagarMs);

        this.ciclos[id] = [reiniciarTimeout];
      }, encenderMs);

      this.ciclos[id] = apagarTimeout;
    }, apagarMs);

    this.ciclos[id] = encenderTimeout;
    this.logger.log(`[AUTO] ciclo programado (start OFF) para id=${id}`);
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
  cancelarTodosLosCiclos() {
    for (const key of Object.keys(this.ciclos)) {
      const val = this.ciclos[key];
      if (val) {
        if (Array.isArray(val)) val.forEach((t) => clearTimeout(t));
        else clearTimeout(val as unknown as NodeJS.Timeout);
      }
      delete this.ciclos[key];
    }
    // Desconectar del broker MQTT al cancelar ciclos
    this.mqttService.disconnect();
  }

async cambiarEstado(id: number, estado: boolean, manual = false) {
  let registro = await this.psiculturaRepo.findOne({ where: { id } });

  if (!registro && manual) {
    await this.historialRepo.save({
      psiculturaId: null,
      estado: false,
      tiempoMs: null,
      inicio: new Date(),
      fin: null,
      modo: 'manual',
      fechaCreacion: new Date()
    });

    return { ok: true, mensaje: 'Historial creado sin registro base' };
  }

  if (!registro) throw new HttpException('Registro no encontrado', 404);

  const ahora = new Date();

  if (manual) {
    this.cancelarTodosLosCiclos();

    await this.psiculturaRepo
      .createQueryBuilder()
      .update(Psicultura)
      .set({
        estado: false,
        estadoActual: 'inactivo'
      })
      .where("modo = 'auto'")
      .execute();

    registro.modo = 'manual';
    await this.psiculturaRepo.save(registro);

    const previo = this.manualTimers[id];

    if (!previo) {
      const h = this.historialRepo.create({
        psicultura: registro,
        estado,
        inicio: ahora,
        fin: null,
        tiempoMs: null,
        modo: 'manual',
        fechaCreacion: ahora
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

    if (previo.ultimoEstado === estado) return { ok: true, estado };

    const histAbierto = await this.buscarHistorialAbierto(id);
    if (histAbierto) {
      histAbierto.fin = ahora;
      histAbierto.tiempoMs = ahora.getTime() - histAbierto.inicio.getTime();
      await this.historialRepo.save(histAbierto);
    }

    const nuevo = this.historialRepo.create({
      psicultura: registro,
      estado,
      inicio: ahora,
      fin: null,
      tiempoMs: null,
      modo: 'manual',
      fechaCreacion: ahora
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

  if (!manual && this.manualTimers[id]) {
    const histAbierto = await this.buscarHistorialAbierto(id);
    if (histAbierto) {
      histAbierto.fin = ahora;
      histAbierto.tiempoMs = ahora.getTime() - histAbierto.inicio.getTime();
      await this.historialRepo.save(histAbierto);
    }

    delete this.manualTimers[id];

    const nuevoAuto = this.psiculturaRepo.create();
    Object.assign(nuevoAuto, {
      url: process.env.MQTTURL,
      usuario: process.env.MQTTUSER,
      contrasena: process.env.MQTTPASSWORD,
      tiempoEncendido: registro.tiempoEncendido,
      tiempoApagado: registro.tiempoApagado,
      estado: false,
      estadoActual: 'automatico',
      modo: 'auto',
      ultimaActivacion: null,
      ultimaDesactivacion: null
    });

    const guardado = await this.psiculturaRepo.save(nuevoAuto);
    await this.iniciarCicloAutomatico(guardado.id, false);

    return {
      ok: true,
      estado: false,
      modo: 'automatico',
      nuevoId: guardado.id
    };
  }
}


  async handleBrokerPayload(id: number, payload: string, topic?: string) {
    console.log('⚡ [BROKER] Payload recibido:', payload, 'Topic:', topic);
    this.logger.log(`⚡ [BROKER] Payload recibido id=${id} payload=${payload}`);

    const registro = await this.psiculturaRepo.findOne({ where: { id } });
    if (!registro) {
      console.log('❌ Registro no encontrado:', id);
      throw new HttpException('Registro no encontrado', 404);
    }

    console.log('📌 Estado actual antes de procesar:', registro.estadoActual);

    let parsed: any = null;

    console.log('🔍 Tipo de payload recibido:', typeof payload);

    // FIX → payload ya viene como objeto
    if (typeof payload === 'object' && payload !== null) {
      console.log('📦 Payload YA ES un objeto → se usa sin parsear');
      parsed = payload;
    } else if (typeof payload === 'string') {
      // Intentar parsear JSON si es string
      try {
        parsed = JSON.parse(payload);
        console.log('📦 JSON válido →', parsed);
      } catch {
        console.log('📦 Texto plano (no JSON)');
        parsed = payload; // conservar texto
      }
    }

    // ---------------------------------------------------
    // 1) AUTOMÁTICO: JSON CON CMD
    // ---------------------------------------------------
    if (parsed && !parsed.cmd) {
      console.log('📡 Datos de SENSORES detectados');

      try {
        const row = this.dataRepo.create({
          psicultura: registro,
          estado: false, // Default value
          fechaCreacion: new Date(),
        });

        await this.dataRepo.save(row);

        console.log('💾 Datos guardados en BD:', row.id);
      } catch (err) {
        console.log('❌ Error guardando datos:', err?.message);
        this.logger.error('Error guardando datos', err?.message);
      }

      return { estado: registro.estado, modo: registro.estadoActual };
    }

    // ---------------------------------------------------
    // 2) JSON DE SENSORES (SIN cmd)
    // ---------------------------------------------------
   // 2) JSON DE SENSORES (SIN cmd)
if (parsed && !parsed.cmd) {
  console.log('📡 Datos de SENSORES detectados');
  this.logger.log(
    `[BROKER-SENSORES] Datos recibidos, guardando registro de sensor id=${id}`,
  );

  try {
    const row = this.dataRepo.create({
      psicultura: registro,
      estado: false, // Default value
      fechaCreacion: new Date(),
    });

    await this.dataRepo.save(row);

    console.log('💾 Datos guardados en BD:', row.id);
  } catch (err) {
    console.log('❌ Error guardando datos:', err?.message);
    this.logger.error('Error guardando datos', err?.message);
  }

  return { estado: registro.estado, modo: registro.estadoActual };
}


    // ---------------------------------------------------
    // 3) MANUAL → 1/0 true/false
    // ---------------------------------------------------
    console.log('🎛️ Se detectó posible comando MANUAL (1/0)');
    this.logger.log(
      `[BROKER-MANUAL] Payload manual recibido → ${payload} (id=${id})`,
    );

    const isOn =
      payload === '1' ||
      payload === 'true' ||
      payload === 'on' ||
      payload === 'True' ||
      payload === 'ON';

    const isOff =
      payload === '0' ||
      payload === 'false' ||
      payload === 'off' ||
      payload === 'False' ||
      payload === 'OFF';

    console.log('🧐 Interpretación manual → ON?', isOn, 'OFF?', isOff);

    if (!isOn && !isOff) {
      console.log('⛔ Payload manual inválido, ignorado');
      return { estado: registro.estado };
    }

    registro.estado = isOn;
    registro.estadoActual = 'manual';

    if (isOn) {
      registro.ultimaActivacion = new Date();
      console.log('🔥 MANUAL → Encendido');
    } else {
      registro.ultimaDesactivacion = new Date();
      console.log('🧊 MANUAL → Apagado');
    }

    await this.psiculturaRepo.save(registro);
    console.log('💾 Estado manual actualizado en BD');

    // HISTORIAL MANUAL
    if (isOn) {
      const abierto = await this.buscarHistorialAbierto(id);
      if (!abierto) {
        console.log('📝 Creando historial MANUAL (encendido)');
        await this.historialRepo.save(
          this.historialRepo.create({
            psicultura: registro,
            estado: true,
            inicio: new Date(),
            modo: 'manual',
          }),
        );
      } else {
        console.log('📌 Ya había un historial abierto manual');
      }
    } else {
      const abierto = await this.buscarHistorialAbierto(id);
      if (abierto) {
        console.log('📝 Cerrando historial MANUAL (apagado)');
        const fin = new Date();
        abierto.fin = fin;
        abierto.tiempoMs = fin.getTime() - abierto.inicio.getTime();
        await this.historialRepo.save(abierto);
      } else {
        console.log('⚠️ No había historial manual abierto');
      }
    }

    return { estado: registro.estado, modo: 'manual' };
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

  async obtenerDatosGuardados(psiculturaId: number, limite: number = 100) {
    const registro = await this.psiculturaRepo.findOne({
      where: { id: psiculturaId },
    });
    if (!registro) throw new HttpException('Registro no encontrado', 404);

    const datos = await this.dataRepo.find({
      where: { psicultura: { id: psiculturaId } as any },
      order: { fechaCreacion: 'DESC' },
      take: limite,
    });

    return datos;
  }

  async obtenerEstadisticas(psiculturaId: number, horas: number = 24) {
    const registro = await this.psiculturaRepo.findOne({
      where: { id: psiculturaId },
    });
    if (!registro) throw new HttpException('Registro no encontrado', 404);

    const ahora = new Date();
    const hace = new Date(ahora.getTime() - horas * 60 * 60 * 1000);

    const datos = await this.dataRepo.find({
      where: { psicultura: { id: psiculturaId } as any },
      order: { fechaCreacion: 'DESC' },
    });

    const filtrados = datos.filter((d) => d.fechaCreacion >= hace);

    if (filtrados.length === 0) {
      return {
        totalRegistros: 0,
      };
    }

    const calcularStats = (valores: (number | null)[]) => {
      const numeros = valores.filter((v) => v !== null) as number[];
      if (numeros.length === 0) return null;
      return {
        promedio: numeros.reduce((a, b) => a + b, 0) / numeros.length,
        minimo: Math.min(...numeros),
        maximo: Math.max(...numeros),
      };
    };

    return {
      totalRegistros: filtrados.length,
    };
  }
}

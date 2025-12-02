import { Injectable, HttpException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import axios from 'axios';
import { Psicultura } from './entities/psicultura.entity';
import { PsiculturaHistorial } from './entities/psicultura-historial.entity';
import { TimerDto, ValidarBrokerDto } from './dto';
import { enviarEstado, mqttClient } from '../Broker/brokerClient';

@Injectable()
export class PsiculturaService implements OnModuleInit {
  private ciclos: Record<number, NodeJS.Timeout | NodeJS.Timeout[]> = {};
  // manualTimers guarda estado y inicio del ciclo actual en memoria
  private manualTimers: Record<number, { ultimoEstado: boolean; inicio: Date }> = {};

async toggleManual(id: number, estado: boolean) {
  // Guardar el estado en la DB
  const registro = await this.psiculturaRepo.findOne({ where: { id } });
  if (!registro) throw new Error('Registro no encontrado');

  registro.estado = estado;
  registro.estadoActual = 'manual';
  if (estado) registro.ultimaActivacion = new Date();
  else registro.ultimaDesactivacion = new Date();

  await this.psiculturaRepo.save(registro);

  // Enviar mensaje al broker
  try {
    enviarEstado(estado, !estado); // s1=estado, s2=contrario (ajusta según tu lógica)
    console.log(`📤 Estado manual publicado en broker: ${estado}`);
  } catch (err) {
    console.error('❌ Error al enviar estado al broker:', err);
  }

  return { ok: true, estado };
}



  constructor(
    @InjectRepository(Psicultura)
    private readonly psiculturaRepo: Repository<Psicultura>,

    @InjectRepository(PsiculturaHistorial)
    private readonly historialRepo: Repository<PsiculturaHistorial>,
  ) {}

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
    return await this.historialRepo.find()
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

  console.log(`\n🟦 [TIMER] Actualizando Timer → ID=${id}`);

  let registro: Psicultura | null = null;

  if (id) {
    registro = await this.psiculturaRepo.findOne({ where: { id } });
    console.log(`📀 Registro existente encontrado: ${!!registro}`);
  }

  // --------------------------------
  // CREAR NUEVO
  // --------------------------------
  if (!registro) {
    console.log(`🆕 [TIMER] Creando nuevo registro...`);
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

    console.log(`📌 Nuevo registro creado con ID: ${guardado.id}`);
    this.iniciarCicloAutomatico(guardado.id);

    return { ok: true, message: 'Registro creado y ciclo iniciado', id: guardado.id };
  }

  // --------------------------------
  // CANCELAR CICLO PREVIO
  // --------------------------------
  if (this.ciclos[registro.id]) {
    console.log(`🛑 [TIMER] Eliminando ciclos previos para ID:${registro.id}`);
    const val = this.ciclos[registro.id];
    if (Array.isArray(val)) val.forEach((t) => clearTimeout(t));
    else clearTimeout(val);
    delete this.ciclos[registro.id];
  }

  // --------------------------------
  // CREAR NUEVO TIMER
  // --------------------------------
  console.log(`🔁 [TIMER] Creando nuevo timer basado en ID:${registro.id}`);

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

  console.log(`🚀 [TIMER] Nuevo timer guardado con ID:${guardado.id}`);
  console.log(`🚀 [TIMER] Iniciando ciclo automático…`);

  this.iniciarCicloAutomatico(guardado.id);

  return { ok: true, message: 'Nuevo timer creado y ciclo iniciado', id: guardado.id };
}



 async iniciarCicloAutomatico(id: number) {
  console.log(`\n🚀 [AUTO] Iniciando ciclo automático para ID: ${id}`);

  const registro = await this.psiculturaRepo.findOne({ where: { id } });
  if (!registro) {
    console.log(`❌ [AUTO] Registro no encontrado para ID: ${id}`);
    return;
  }

  console.log(`📄 [AUTO] Registro cargado → modo=${registro.modo} estado=${registro.estado}`);

  if (registro.modo !== 'auto') {
    console.log(`⛔ [AUTO] No se inicia ciclo porque modo ≠ auto (${registro.modo})`);
    return;
  }

  // ---------------------------------------------
  //  Verificación del broker
  // ---------------------------------------------
  console.log(`🌐 [AUTO] Verificando broker para ID: ${id}...`);
const client = mqttClient();

if (!client.connected) {
  console.log(`❌ [AUTO] Broker no conectado → deteniendo y guardando estado...`);
  registro.estado = false;
  registro.estadoActual = 'broker_down';
  registro.ultimaDesactivacion = new Date();
  await this.psiculturaRepo.save(registro);
  return;
}

console.log(`✅ [AUTO] Broker conectado → ID: ${id}`);

  // ---------------------------------------------
  //  Cancelar ciclos previos
  // ---------------------------------------------
  if (this.ciclos[id]) {
    console.log(`🛑 [AUTO] Cancelando timeouts previos para ID: ${id}`);
    const val = this.ciclos[id];
    if (Array.isArray(val)) val.forEach((t) => clearTimeout(t));
    else clearTimeout(val);
    delete this.ciclos[id];
  }

  // ---------------------------------------------
  //  Parsear tiempos
  // ---------------------------------------------
  const encenderMs = this.convertirAms(registro.tiempoEncendido);
  const apagarMs = this.convertirAms(registro.tiempoApagado);

  console.log(`⏱ [AUTO] Encender=${encenderMs}ms | Apagar=${apagarMs}ms`);

  // ---------------------------------------------
  //  Encender automáticamente
  // ---------------------------------------------
  registro.estado = true;
  registro.estadoActual = 'automatico';
  registro.ultimaActivacion = new Date();
  await this.psiculturaRepo.save(registro);

  console.log(`💡 [AUTO] ENCENDIDO → ID:${id} estado=${registro.estado}`);

  // ---------------------------------------------
  //  Timeout para apagar
  // ---------------------------------------------
  const apagarTimeout = setTimeout(async () => {
    console.log(`🔻 [AUTO] Apagando ID:${id} después de ${encenderMs}ms...`);

    const r = await this.psiculturaRepo.findOne({ where: { id } });
    if (!r) return;

    r.estado = false;
    r.estadoActual = 'automatico';
    r.ultimaDesactivacion = new Date();
    await this.psiculturaRepo.save(r);

    console.log(`🧯 [AUTO] APAGADO Guardado → ID:${id}`);

    // ------------------------------------------------
    // Reiniciar de nuevo el ciclo
    // ------------------------------------------------
    const reiniciarTimeout = setTimeout(() => {
      console.log(`🔄 [AUTO] Reiniciando ciclo automático para ID:${id}`);
      this.iniciarCicloAutomatico(id);
    }, apagarMs);

    this.ciclos[id] = [reiniciarTimeout];
  }, encenderMs);

  this.ciclos[id] = apagarTimeout;
  console.log(`⏳ [AUTO] Timeout programado para apagar en ${encenderMs}ms`);
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

  // helper: buscar historial abierto
  private async buscarHistorialAbierto(psiculturaId: number) {
    return await this.historialRepo.findOne({
      where: { psicultura: { id: psiculturaId } as any, fin: IsNull() },
      order: { id: 'DESC' },
    });
  }

  async cambiarEstado(id: number, estado: boolean, manual = false) {
    const registro = await this.psiculturaRepo.findOne({ where: { id } });
    if (!registro) throw new HttpException('Registro no encontrado', 404);

    const ahora = new Date();

    // detener ciclos automáticos
    if (this.ciclos[id]) {
      const val = this.ciclos[id];
      if (Array.isArray(val)) val.forEach((t) => clearTimeout(t));
      else clearTimeout(val);
      delete this.ciclos[id];
      console.log(`🛑 [AUTO] Ciclo automático detenido para ID ${id}`);
    }

    // ---------- MODO MANUAL ----------
    if (manual) {
      const previo = this.manualTimers[id];

      // PRIMER CAMBIO MANUAL: iniciar contador en memoria y crear historial "inicio"
      if (!previo) {
        // crear historial abierto (inicio)
        const h = this.historialRepo.create({
          psicultura: registro,
          estado: estado,
          inicio: ahora,
          fin: null,
          tiempoMs: null,
          modo: 'manual',
          fechaCreacion:new Date()
        });
        const creado = await this.historialRepo.save(h);

        // guardar en memoria para rápida referencia
        this.manualTimers[id] = { ultimoEstado: estado, inicio: ahora };

        console.log(`🔵 [MANUAL] INICIO CICLO (historialId=${creado.id}) ID:${id} estado:${estado}`);

        return {
          ok: true,
          estado,
          estadoActual: 'manual',
          historialIdCreated: creado.id,
        };
      }

      // si el estado no cambió — nada que hacer
      if (previo.ultimoEstado === estado) {
        console.log(`🟦 [MANUAL] SIN CAMBIO ID:${id} estado:${estado}`);
        return { ok: true, estado, estadoActual: 'manual' };
      }

      // cambio: cerrar historial abierto y crear uno nuevo (reiniciar conteo)
      const historialAbierto = await this.buscarHistorialAbierto(id);
let cerradoInfo: { historialIdClosed: number; tiempoManualMs: number } | null = null;
        if (historialAbierto) {
        const fin = ahora;
        const tiempoMs = fin.getTime() - historialAbierto.inicio.getTime();
        historialAbierto.fin = fin;
        historialAbierto.tiempoMs = tiempoMs;
        await this.historialRepo.save(historialAbierto);

        cerradoInfo = { historialIdClosed: historialAbierto.id, tiempoManualMs: tiempoMs };
        console.log(`🟧 [MANUAL] CERRADO historialId=${historialAbierto.id} tiempoMs=${tiempoMs}`);
      }

      // crear nuevo historial que inicia ahora con el nuevo estado
      const nuevoHist = this.historialRepo.create({
        psicultura: registro,
        estado: estado,
        inicio: ahora,
        fin: null,
        tiempoMs: null,
        modo: 'manual',
        fechaCreacion:new Date()
      });
      const creado = await this.historialRepo.save(nuevoHist);

      // actualizar memoria
      this.manualTimers[id] = { ultimoEstado: estado, inicio: ahora };

      console.log(`🔵 [MANUAL] NUEVO CICLO INICIADO historialId=${creado.id} estado:${estado}`);

      return {
        ok: true,
        estado,
        estadoActual: 'manual',
        historialIdCreated: creado.id,
        closed: cerradoInfo,
      };
    }

    // ---------- PASO DE MANUAL → AUTOMÁTICO: cerrar historial si existe ----------
    if (!manual && this.manualTimers[id]) {
      const historialAbierto = await this.buscarHistorialAbierto(id);
      if (historialAbierto) {
        const fin = ahora;
        const tiempoMs = fin.getTime() - historialAbierto.inicio.getTime();
        historialAbierto.fin = fin;
        historialAbierto.tiempoMs = tiempoMs;
        await this.historialRepo.save(historialAbierto);

        console.log(`🟥 [SWITCH] MANUAL->AUTO cerrado historialId=${historialAbierto.id} tiempoMs=${tiempoMs}`);
      }
      delete this.manualTimers[id];
    }

    // ---------- MODO AUTOMÁTICO ----------
    registro.estado = estado;
    registro.estadoActual = 'automatico';
    if (estado) registro.ultimaActivacion = ahora;
    else registro.ultimaDesactivacion = ahora;
    await this.psiculturaRepo.save(registro);

    console.log(`🟨 [AUTO] CAMBIO AUTOMÁTICO ID:${id} estado:${estado}`);

    return {
      ok: true,
      estado: registro.estado,
      estadoActual: registro.estadoActual,
    };
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

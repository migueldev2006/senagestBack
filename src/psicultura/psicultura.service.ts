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
import { MqttService } from 'src/mqtt/mqtt.service';
import { PsiculturaData } from './entities/psicultura-data.entity';
import { ValidarBrokerDto } from './dto/validar-broker.dto';
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

    private readonly mqttService: MqttService, // <-- inyectamos MQTT
    private readonly brokerConfigService: BrokerConfigService,
  ) {}

  private async publicarMQTT(id: number, payload: any) {
    // Publicar en tópicos internos para el frontend
    this.mqttService.publish(`psicultura/${id}/estado`, payload);
    this.mqttService.publish(`psicultura/${id}/historial`, payload);
    this.logger.log(
      `MQTT interno -> psicultura/${id}/estado: ${JSON.stringify(payload)}`,
    );
    this.logger.log(
      `MQTT interno -> psicultura/${id}/historial: ${JSON.stringify(payload)}`,
    );

    // Publicar en tópico externo del broker si está configurado
    try {
      const activeConfig = await this.brokerConfigService.getActiveConfig();
      if (activeConfig && activeConfig.base_topic) {
        const externalPayload = {
          id: id,
          estado: payload.estado,
          modo: payload.modo,
          timestamp: new Date().toISOString(),
        };
        this.mqttService.publish(activeConfig.base_topic, externalPayload);
        this.logger.log(
          `📤 MQTT externo -> ${activeConfig.base_topic}: ${JSON.stringify(externalPayload)}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `⚠️ Error publicando en tópico externo: ${error.message}`,
      );
    }
  }

  async validarBroker(dto: ValidarBrokerDto) {
    return { ok: true };
  }
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

    if (this.ciclos[id]) {
      const val = this.ciclos[id];
      if (Array.isArray(val)) val.forEach((t) => clearTimeout(t));
      else clearTimeout(val as unknown as NodeJS.Timeout);
      delete this.ciclos[id];
    }

    const encenderMs = this.convertirAms(registro.tiempoEncendido);
    const apagarMs = this.convertirAms(registro.tiempoApagado);

    if (startEncendido) {
      registro.estado = true;
      registro.estadoActual = 'automatico';
      registro.ultimaActivacion = new Date();
      await this.psiculturaRepo.save(registro);
    } else {
      registro.estado = false;
      registro.estadoActual = 'inactivo';
      registro.ultimaDesactivacion = new Date();
      await this.psiculturaRepo.save(registro);
    }

    this.publicarMQTT(id, { estado: registro.estado, modo: registro.modo });

    if (startEncendido && encenderMs > 0) {
      const timeout = setTimeout(async () => {
        const r = await this.psiculturaRepo.findOne({ where: { id } });
        if (!r) return;

        const ahora = new Date();

        // 1. Registro se apaga
        r.estado = false;
        r.estadoActual = 'inactivo';
        r.ultimaDesactivacion = ahora;
        await this.psiculturaRepo.save(r);

        // 2. Cerrar historial abierto (si existe)
        const abierto = await this.historialRepo.findOne({
          where: { psicultura: { id } as any, fin: IsNull() },
          order: { id: 'DESC' },
        });

        if (abierto) {
          abierto.fin = ahora;
          abierto.tiempoMs = ahora.getTime() - abierto.inicio.getTime();
          await this.historialRepo.save(abierto);
        }

        // 3. Crear historial de inactividad
        const historialInactivo = this.historialRepo.create({
          psicultura: r,
          estado: false,
          inicio: ahora,
          fin: null,
          tiempoMs: null,
          modo: 'auto',
          fechaCreacion: ahora,
        });

        await this.historialRepo.save(historialInactivo);

        // 4. Publicar MQTT
        this.publicarMQTT(id, { estado: false, modo: historialInactivo.modo });

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
      tiempoEncendido: dto.tiempoEncendido ?? '00:00:00',
      tiempoApagado: dto.tiempoApagado ?? '00:00:00',
      estado: true,
      estadoActual: 'automatico',
      modo: 'auto',
      usuarios: { id: 1 },
    });

    const guardado = await this.psiculturaRepo.save(nuevo);
    await this.iniciarCicloAutomatico(guardado.id, true);

    this.publicarMQTT(guardado.id, { estado: true, modo: guardado.modo });

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

    const registro = await this.psiculturaRepo.findOne({
      where: { id: psiculturaId },
    });
    if (!registro) throw new HttpException('Psicultura no encontrada', 404);

    // 1) Cancelar ciclo específico y cerrar historial abierto
    if (this.ciclos[psiculturaId]) {
      const val = this.ciclos[psiculturaId];
      if (Array.isArray(val)) val.forEach((t) => clearTimeout(t));
      else clearTimeout(val as unknown as NodeJS.Timeout);
      delete this.ciclos[psiculturaId];
    }

    const historialAbierto = await this.historialRepo.findOne({
      where: { psicultura: { id: psiculturaId } as any, fin: IsNull() },
      order: { id: 'DESC' },
    });
    if (historialAbierto) {
      historialAbierto.fin = ahora;
      historialAbierto.tiempoMs =
        ahora.getTime() - historialAbierto.inicio.getTime();
      await this.historialRepo.save(historialAbierto);
    }

    // 2) Rama manual: registrar historial manual y actualizar el estado del registro
    if (manual) {
      // Actualizar el estado del registro principal
      registro.estado = estado;
      registro.estadoActual = estado ? 'encendido_manual' : 'apagado_manual';
      registro.ultimaActivacion = estado ? ahora : registro.ultimaActivacion;
      registro.ultimaDesactivacion = estado
        ? registro.ultimaDesactivacion
        : ahora;
      await this.psiculturaRepo.save(registro);

      // Crear historial manual (inicio ahora)
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

      // Publicar con el nuevo estado
      this.publicarMQTT(psiculturaId, { estado, modo: 'manual' });

      return { ok: true, estado };
    }

    // 3) Rama auto: crear nuevo ciclo automático (igual a tu implementación anterior)
    const nuevoAuto = this.psiculturaRepo.create();
    Object.assign(nuevoAuto, {
      tiempoEncendido: registro.tiempoEncendido,
      tiempoApagado: registro.tiempoApagado,
      estado: true,
      estadoActual: 'automatico',
      modo: 'auto',
      ultimaActivacion: ahora,
      ultimaDesactivacion: null,
    });

    const guardado = await this.psiculturaRepo.save(nuevoAuto);

    this.publicarMQTT(guardado.id, { estado: true, modo: 'automatico' });

    const encenderMs = this.convertirAms(guardado.tiempoEncendido);

    setTimeout(async () => {
      const r = await this.psiculturaRepo.findOne({
        where: { id: guardado.id },
      });
      if (!r) return;
      r.estado = false;
      r.estadoActual = 'automatico';
      r.ultimaDesactivacion = new Date();
      await this.psiculturaRepo.save(r);

      this.publicarMQTT(r.id, { estado: false, modo: r.modo });
    }, encenderMs);

    return {
      ok: true,
      estado: true,
      modo: 'automatico',
      nuevoId: guardado.id,
    };
  }

  async toggleManual(id: number, estado: boolean) {
    return this.cambiarEstado({ psiculturaId: id, estado, manual: true });
  }

  async handleBrokerConnectionLost(id: number) {
    const registro = await this.psiculturaRepo.findOne({ where: { id } });
    if (!registro) throw new HttpException('Registro no encontrado', 404);
    registro.estado = false;
    registro.estadoActual = 'broker_down';
    registro.ultimaDesactivacion = new Date();
    await this.psiculturaRepo.save(registro);

    this.publicarMQTT(id, { estado: false, modo: 'broker_down' });

    return { ok: true };
  }

  async handleBrokerRestored(id: number) {
    const registro = await this.psiculturaRepo.findOne({ where: { id } });
    if (!registro) throw new HttpException('Registro no encontrado', 404);

    registro.estado = false;
    registro.estadoActual = 'inactivo';
    await this.psiculturaRepo.save(registro);

    this.publicarMQTT(id, { estado: false, modo: 'inactivo' });

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

    this.publicarMQTT(id, { estado: false, modo: 'power_down' });

    return { ok: true };
  }

  async reportPowerRestore(id: number) {
    const registro = await this.psiculturaRepo.findOne({ where: { id } });
    if (!registro) throw new HttpException('Registro no encontrado', 404);
    registro.estadoActual = 'power_restored_no_activity';
    await this.psiculturaRepo.save(registro);

    this.publicarMQTT(id, {
      estado: registro.estado,
      modo: 'power_restored_no_activity',
    });

    return { ok: true };
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

  async guardarDatoDesdeBroker(data: any) {
    if (!data.psiculturaId) {
      this.logger.warn(
        `⚠️ Intento de guardar dato sin psiculturaId: ${JSON.stringify(data)}`,
      );
      return;
    }

    try {
      const nuevo = this.dataRepo.create();
      Object.assign(nuevo, {
        psicultura: { id: data.psiculturaId },
        estado: data.estado,
        topico: data.topico,
        modo: data.modo,
        fechaCreacion: new Date(),
      });

      await this.dataRepo.save(nuevo);

      this.logger.log(
        `📥 [EXTERNO] Dato guardado desde broker para psicultura ${data.psiculturaId} - Estado: ${data.estado}, Tópico: ${data.topico}, Modo: ${data.modo}`,
      );
      this.logger.log(
        `💾 Registro creado en PsiculturaData con ID: ${nuevo.id}`,
      );

      // Toggle automático basado en el estado recibido
      this.logger.log(
        `🔍 Datos recibidos para toggle: ${JSON.stringify(data)}`,
      );
      if (typeof data.estado === 'boolean') {
        this.logger.log(
          `🔄 Ejecutando toggle automático para psicultura ${data.psiculturaId} al estado: ${data.estado}`,
        );
        await this.toggleManual(data.psiculturaId, data.estado);
        this.logger.log(
          `✅ Toggle automático completado para psicultura ${data.psiculturaId}`,
        );
      } else {
        this.logger.warn(
          `⚠️ Estado recibido no es booleano, no se ejecuta toggle: ${data.estado} (tipo: ${typeof data.estado})`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Error guardando dato desde broker para psicultura ${data.psiculturaId}: ${error.message}`,
        error,
      );
    }
  }
}

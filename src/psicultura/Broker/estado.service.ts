import { Injectable } from '@nestjs/common';

@Injectable()
export class EstadoService {
  private estadoActual = false;

  async guardarEstado(nuevoEstado: boolean) {
    this.estadoActual = nuevoEstado;
    return { estado: nuevoEstado, ts: new Date() };
  }

  async obtenerEstado() {
    return { estado: this.estadoActual };
  }
}

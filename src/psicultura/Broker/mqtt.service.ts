import { Injectable } from '@nestjs/common';
import { enviarEstado } from '../../Broker/brokerClient'; // tu archivo MQTT

@Injectable()
export class MqttService {
  enviar(nuevoEstado: boolean) {
    enviarEstado(nuevoEstado, false); // segundo valor según tu lógica
  }
}

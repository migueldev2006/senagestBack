import mqtt, { MqttClient } from 'mqtt';

// ================================
// CONFIGURACIÓN DEL BROKER
// ================================
const BROKER_URL = 'mqtts://3f187645294a400cbe2d87a2ec16ec53.s1.eu.hivemq.cloud:8883';
const USERNAME = 'diegokld';
const PASSWORD = 'Don_diego123';
const TOPIC_SIGNALS = 'lab/diego/signals';

let client: MqttClient | null = null;

// ================================
// CONEXIÓN AL BROKER
// ================================
export function connectBroker(): MqttClient {
  if (client) return client; // Retorna el cliente si ya está conectado

  client = mqtt.connect(BROKER_URL, {
    username: USERNAME,
    password: PASSWORD,
    protocol: 'mqtts',
  });

  client.on('connect', () => {
    console.log('✅ Conectado al broker MQTT');

    client?.subscribe(TOPIC_SIGNALS, (err) => {
      if (err) console.error('❌ Error al suscribirse:', err);
      else console.log('📡 Escuchando mensajes en:', TOPIC_SIGNALS);
    });
  });

  client.on('error', (err) => {
    console.error('❌ Error de conexión MQTT:', err);
  });

  client.on('message', (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`📥 Llegó mensaje en ${topic}:`, data);
    } catch {
      console.log(`📥 Mensaje en ${topic}:`, message.toString());
    }
  });

  return client;
}

// ================================
// PUBLICAR MENSAJES
// ================================
export function enviarEstado(s1_raw: boolean, s2_raw: boolean) {
  const mensaje = {
    ts: new Date().toISOString(),
    s1_raw,
    s1: s1_raw ? 5 : 0,
    s2_raw,
    s2: s2_raw ? 5 : 0,
  };

  connectBroker().publish(TOPIC_SIGNALS, JSON.stringify(mensaje), () => {
    console.log('📤 Publicado:', mensaje);
  });
}

// ================================
// EXPORTAR CLIENTE
// ================================
export function mqttClient(): MqttClient {
  return connectBroker();
}

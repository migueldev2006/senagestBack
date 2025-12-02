// brokerClient.js
const mqtt = require("mqtt");

// ================================
// CONFIGURACIÓN DEL BROKER
// ================================
const BROKER_URL = "mqtts://3f187645294a400cbe2d87a2ec16ec53.s1.eu.hivemq.cloud:8883"; 
const USERNAME = "diegokld";       
const PASSWORD = "Don_diego123";       

// Tópicos
const TOPIC_SIGNALS = "lab/diego/signals";

// ================================
// CONEXIÓN AL BROKER
// ================================
const client = mqtt.connect(BROKER_URL, {
  username: USERNAME,
  password: PASSWORD,
  protocol: "mqtts",
});

client.on("connect", () => {
  console.log("✅ Conectado al broker MQTT");

  // Nos suscribimos al mismo topic para recibir mensajes si queremos
  client.subscribe(TOPIC_SIGNALS, () => {
    console.log("📡 Escuchando mensajes en:", TOPIC_SIGNALS);
  });
});

client.on("error", (err) => {
  console.log("❌ Error de conexión:", err);
});

// ================================
// FUNCIÓN PARA PUBLICAR ESTADO
// ================================
function enviarEstado(s1_raw, s2_raw) {
  const mensaje = {
    ts: new Date().toISOString(),
    s1_raw,
    s1: s1_raw ? 5 : 0, // ejemplo según tu JSON
    s2_raw,
    s2: s2_raw ? 5 : 0, // ejemplo
  };

  client.publish(TOPIC_SIGNALS, JSON.stringify(mensaje), () => {
    console.log("📤 Publicado:", mensaje);
  });
}

// ================================
// LEER INFORMACIÓN DEL BROKER
// ================================
client.on("message", (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    console.log(`📥 Llegó mensaje en ${topic}:`, data);
  } catch {
    console.log(`📥 Mensaje en ${topic}:`, message.toString());
  }
});

// ================================
// EXPORTAR FUNCIÓN
// ================================
module.exports = { enviarEstado };

// ================================
// EJEMPLO: publicar cada 1s
// ================================
setInterval(() => {
  enviarEstado(true, false);  // aquí decides qué valores enviar
}, 1000);

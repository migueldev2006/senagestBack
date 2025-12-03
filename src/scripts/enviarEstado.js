const { enviarEstado } = require("../Broker/brokerClient");

// Enviar TRUE
enviarEstado(true);

// Enviar FALSE
setTimeout(() => {
  enviarEstado(false);
}, 5000);

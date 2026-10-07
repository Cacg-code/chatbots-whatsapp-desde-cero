// Automatización: qué recordar y a quién. Funciones puras (reciben datos, devuelven listas).
// Quien las llama (worker.js, en el cron) es quien envía los mensajes.
//
// Regla de oro de WhatsApp: solo puedes enviar texto libre durante las 24 horas siguientes
// al último mensaje del cliente. Fuera de esa ventana solo valen las plantillas aprobadas.

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;

export const VENTANA_MS = 24 * HORA;
const ESPERA_PEDIDO_MS = 30 * MINUTO;
const ESPERA_CARRITO_MS = 60 * MINUTO;
const LIMITE_SEGURO_MS = 23 * HORA; // 1 hora antes de que se cierre la ventana

/**
 * Pedidos 'recibido' sin movimiento hace más de 30 min y menos de 23 h
 * (y que aún no recordamos).
 */
export function pedidosParaRecordar(pedidos, ahora) {
  return pedidos.filter((p) => {
    if (p.estado !== 'recibido' || p.recordadoEn) return false;
    const edad = ahora - (p.actualizadoEn ?? p.creadoEn);
    return edad > ESPERA_PEDIDO_MS && edad < LIMITE_SEGURO_MS;
  });
}

/**
 * Sesiones con carrito lleno que el cliente dejó a medias hace más de 1 h y menos de 23 h,
 * a las que aún no avisamos.
 */
export function carritosAbandonados(sesiones, ahora) {
  const enCompra = ['ELIGIENDO', 'CARRITO', 'TIPO_ENTREGA', 'DIRECCION', 'PAGO', 'CONFIRMAR'];
  return sesiones.filter((s) => {
    if (!enCompra.includes(s.estado) || s.carrito.length === 0 || s.recordatorioEnviado) return false;
    const inactivo = ahora - s.ultimoMensajeCliente;
    return inactivo > ESPERA_CARRITO_MS && inactivo < LIMITE_SEGURO_MS;
  });
}

/** ¿Seguimos dentro de la ventana de 24 h para escribir texto libre? */
export function puedeEnviarTexto(ultimoMensajeCliente, ahora) {
  if (ultimoMensajeCliente == null) return false;
  return ahora - ultimoMensajeCliente < VENTANA_MS;
}

// Todos los textos del bot en un solo lugar. Si quieres cambiar cómo habla, es aquí.
// Regla: sin emojis. Cada función devuelve un string.

import { NEGOCIO } from './catalogo.js';
import { formatoSoles } from './carrito.js';

export const mensajes = {
  bienvenida: () =>
    `Hola, bienvenido a ${NEGOCIO.nombre}. Soy el asistente virtual y puedo tomar tu pedido.\n` +
    'Puedes escribir lo que necesitas, por ejemplo: "quiero 2 leches y media docena de huevos".',

  menu: () => '¿Qué deseas hacer?',

  horario: () =>
    `${NEGOCIO.nombre}\nHorario: ${NEGOCIO.horario}\nDirección: ${NEGOCIO.direccion}\n` +
    `Delivery a: ${NEGOCIO.zonas.join(', ')}.`,

  ayuda: () =>
    'Puedes escribir cosas como:\n' +
    '- "quiero 2 leches y 1 arroz"\n' +
    '- "catalogo" para ver los productos\n' +
    '- "carrito" para ver lo que llevas\n' +
    '- "cancelar" para empezar de nuevo\n' +
    '- "hablar con una persona" para que te atienda alguien',

  elegirCategoria: () => 'Elige una categoría o escribe directamente lo que necesitas, por ejemplo: "2 leches".',
  elegirProducto: (categoria) => `${categoria}: elige un producto de la lista.`,

  preguntarCantidad: (producto) =>
    `${producto.nombre} cuesta ${formatoSoles(producto.precio)} por ${producto.unidad}. ¿Cuántas quieres? Toca un botón o escribe el número.`,

  cantidadInvalida: (max) => `Escribe una cantidad entre 1 y ${max}.`,
  cantidadExcedida: (max) => `Por pedido solo puedo anotar hasta ${max} unidades de cada producto.`,

  agregado: (lineas, cantidadTotal, subtotal) =>
    `${lineas.join('\n')}\nLlevas ${cantidadTotal} producto(s). Subtotal: ${formatoSoles(subtotal)}.`,

  quitado: (nombres) => `Quité del carrito: ${nombres.join(', ')}.`,
  nadaQuitar: () => 'No encontré ese producto en tu carrito.',

  elegirEntreVarios: () => 'Encontré varios productos parecidos. ¿Cuál quieres?',

  carritoVacio: () => 'Tu carrito está vacío. Escribe lo que necesitas o elige del catálogo.',
  carrito: (resumenTexto) => `Esto llevas:\n${resumenTexto}`,
  carritoVaciado: () => 'Listo, vacié tu carrito.',

  tipoEntrega: (subtotal) =>
    `Tu subtotal es ${formatoSoles(subtotal)}. ¿Cómo quieres recibir tu pedido?\n` +
    '- Recojo en tienda: sin costo.\n' +
    `- Delivery: ${formatoSoles(NEGOCIO.costoDelivery)} (pedido mínimo ${formatoSoles(NEGOCIO.minimoDelivery)}).`,

  bajoElMinimo: (subtotal) =>
    `Para delivery el pedido mínimo es ${formatoSoles(NEGOCIO.minimoDelivery)} y llevas ${formatoSoles(subtotal)}. ` +
    `Te faltan ${formatoSoles(NEGOCIO.minimoDelivery - subtotal)}. Puedes agregar más productos o elegir recojo en tienda.`,

  pedirDireccion: () =>
    `Escribe tu dirección de entrega (calle, número y referencia). Atendemos: ${NEGOCIO.zonas.join(', ')}.`,
  direccionInvalida: () => 'Esa dirección parece muy corta. Escríbela completa, con calle y número (mínimo 8 caracteres).',

  pedirPago: () => '¿Cómo vas a pagar?',

  confirmar: (resumenTexto, entrega, direccion, pago, costoEntrega, totalPedido) =>
    'Revisa tu pedido:\n' +
    `${resumenTexto}\n` +
    (entrega === 'delivery'
      ? `Delivery a: ${direccion} (${formatoSoles(costoEntrega)})\n`
      : `Recojo en tienda: ${NEGOCIO.direccion}\n`) +
    `Pago: ${pago}\n` +
    `Total a pagar: ${formatoSoles(totalPedido)}`,

  pedidoRecibido: (pedido) =>
    `Pedido ${pedido.id} recibido. Total: ${formatoSoles(pedido.total)}.\n` +
    (pedido.entrega === 'delivery'
      ? 'Lo llevaremos a tu dirección en unos 40 minutos.'
      : 'Estará listo para recoger en unos 15 minutos.') +
    '\n' + instruccionesPago(pedido) + '\nGracias por comprar en ' + NEGOCIO.nombre + '.',

  cancelado: () => 'Cancelé tu pedido. Cuando quieras empezar de nuevo, escribe "hola".',

  esperandoHumano: () =>
    'Listo, avisé a una persona del equipo. Te responderá en este chat lo antes posible. Para volver al asistente escribe "menu".',

  noSoportado: () => 'Por ahora solo entiendo texto y botones. Escríbeme lo que necesitas.',

  noEntendi: () => 'No te entendí bien. Puedes escribir, por ejemplo, "2 leches", o usar los botones.',
  noEntendiDeNuevo: () => 'Sigo sin entenderte. ¿Quieres que te atienda una persona?',

  opcionNoDisponible: () => 'Esa opción ya no está disponible en este paso.',
};

function instruccionesPago(pedido) {
  if (pedido.pago === 'yape') return `Yape: envía ${formatoSoles(pedido.total)} al ${NEGOCIO.yape} y avísanos por este chat.`;
  if (pedido.pago === 'transferencia') return `Transferencia: ${NEGOCIO.cuentaTransferencia}. Avísanos por este chat al pagar.`;
  return 'Pagas en efectivo al recibir tu pedido.';
}

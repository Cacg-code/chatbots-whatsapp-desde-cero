// Carrito de compras: funciones PURAS e inmutables.
// "Inmutable" = nunca modificamos el carrito que nos pasan; devolvemos uno nuevo.
//
// Un carrito es un arreglo de líneas: { id, nombre, precio, cantidad } (precio en soles).
// Para evitar errores de decimales (0.1 + 0.2 = 0.30000000000000004) las sumas
// se hacen en CÉNTIMOS enteros y solo al final se vuelve a soles.

const aCentimos = (soles) => Math.round(soles * 100);
const aSoles = (centimos) => centimos / 100;

/** Agrega `cantidad` unidades del producto (si ya estaba, suma a su línea). */
export function agregar(carrito, producto, cantidad = 1) {
  const existe = carrito.some((l) => l.id === producto.id);
  if (existe) {
    return carrito.map((l) => (l.id === producto.id ? { ...l, cantidad: l.cantidad + cantidad } : l));
  }
  return [...carrito, { id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad }];
}

/** Quita la línea completa de un producto. */
export function quitar(carrito, productoId) {
  return carrito.filter((l) => l.id !== productoId);
}

/** Cambia la cantidad de una línea. Con cantidad 0 o menos, la línea desaparece. */
export function cambiarCantidad(carrito, productoId, cantidad) {
  if (cantidad <= 0) return quitar(carrito, productoId);
  return carrito.map((l) => (l.id === productoId ? { ...l, cantidad } : l));
}

/** Total en soles, redondeado a 2 decimales. */
export function total(carrito) {
  const centimos = carrito.reduce((suma, l) => suma + aCentimos(l.precio) * l.cantidad, 0);
  return aSoles(centimos);
}

/** Cantidad total de unidades. */
export function cantidadItems(carrito) {
  return carrito.reduce((suma, l) => suma + l.cantidad, 0);
}

/** 12.5 -> "S/ 12.50" */
export function formatoSoles(monto) {
  return `S/ ${monto.toFixed(2)}`;
}

/** Texto legible del carrito, listo para enviar por WhatsApp. */
export function resumen(carrito) {
  if (carrito.length === 0) return 'Tu carrito está vacío.';
  const lineas = carrito.map((l) => {
    const subtotal = aSoles(aCentimos(l.precio) * l.cantidad);
    return `- ${l.cantidad} x ${l.nombre}: ${formatoSoles(subtotal)}`;
  });
  return `${lineas.join('\n')}\nSubtotal: ${formatoSoles(total(carrito))}`;
}

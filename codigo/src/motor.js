// El cerebro del bot. Es una función PURA: no envía nada, no lee archivos, no usa red.
//   procesar(sesion, entrada, ahora) -> { sesion, respuestas }
// La capa de entrada/salida (worker.js o consola.js) guarda la sesión y envía las respuestas.
//
// Máquina de estados:
//   INICIO -> MENU -> ELIGIENDO -> CARRITO -> TIPO_ENTREGA -> (DIRECCION) -> PAGO -> CONFIRMAR -> FIN
//   En cualquier momento: "cancelar" -> FIN, "persona" -> ESPERANDO_HUMANO.

import { NEGOCIO, CATEGORIAS, PRODUCTOS, productoPorId, productosDeCategoria } from './catalogo.js';
import * as Carrito from './carrito.js';
import { mensajes } from './mensajes.js';
import { cantidadSola, detectarIntencion, mencionaAlguna, normalizar, buscarProductos, separarPedidos } from './texto.js';

export const ESTADOS = {
  INICIO: 'INICIO',
  MENU: 'MENU',
  ELIGIENDO: 'ELIGIENDO',
  CARRITO: 'CARRITO',
  TIPO_ENTREGA: 'TIPO_ENTREGA',
  DIRECCION: 'DIRECCION',
  PAGO: 'PAGO',
  CONFIRMAR: 'CONFIRMAR',
  FIN: 'FIN',
  ESPERANDO_HUMANO: 'ESPERANDO_HUMANO',
};
const E = ESTADOS;

const MAX_POR_PRODUCTO = 20;
const MIN_DIRECCION = 8;

// ---------- Constructores de respuestas (formato propio del motor) ----------

const texto = (t) => ({ tipo: 'texto', texto: t });
const botones = (t, lista) => ({ tipo: 'botones', texto: t, botones: lista });
const lista = (t, boton, secciones) => ({ tipo: 'lista', texto: t, boton, secciones });
const recortar = (s, max) => (s.length <= max ? s : s.slice(0, max - 1) + '.');

// ---------- Sesión ----------

export function crearSesion(telefono, ahora = Date.now()) {
  return {
    telefono,
    estado: E.INICIO,
    carrito: [],
    entrega: null, // 'recojo' | 'delivery'
    direccion: null,
    pago: null, // 'efectivo' | 'yape' | 'transferencia'
    fallos: 0, // mensajes seguidos que no entendimos
    productoPendiente: null, // producto elegido, falta la cantidad
    cantidadPendiente: null, // cantidad pedida, falta elegir cuál producto
    pedidoNuevo: null, // lo llena el motor al confirmar; la capa de E/S lo guarda
    derivadoHumano: false,
    recordatorioEnviado: false,
    creadoEn: ahora,
    ultimoMensajeCliente: ahora,
    actualizadoEn: ahora,
  };
}

// ---------- Función principal ----------

export function procesar(sesionPrevia, entrada, ahora = Date.now()) {
  const sesion = structuredClone(sesionPrevia); // nunca modificamos la sesión original
  sesion.pedidoNuevo = null;
  sesion.ultimoMensajeCliente = ahora;
  sesion.actualizadoEn = ahora;
  sesion.recordatorioEnviado = false;

  // Una conversación terminada empieza de cero con el siguiente mensaje.
  if (sesion.estado === E.FIN) Object.assign(sesion, crearSesion(sesion.telefono, ahora));

  if (entrada.tipo === 'no_soportado') {
    return { sesion, respuestas: sesion.derivadoHumano ? [] : [texto(mensajes.noSoportado())] };
  }

  const accion = entrada.tipo === 'interactivo' ? accionDeId(entrada.id) : accionDeTexto(sesion, entrada.texto);

  // Con una persona atendiendo, el bot calla (salvo "menu" o "cancelar").
  const quiereSalir = accion.tipo === 'cancelar' || (accion.tipo === 'menu' && !accion.saludo);
  if (sesion.estado === E.ESPERANDO_HUMANO && !quiereSalir) {
    return { sesion, respuestas: [] };
  }

  const respuestas = ejecutar(sesion, accion);
  return { sesion, respuestas };
}

// ---------- 1) Entender: convertir la entrada en una "acción" ----------

function accionDeId(id) {
  const [clave, valor] = String(id).split(':');
  const simples = {
    menu_pedir: 'pedir', seguir: 'pedir', menu_menu: 'menu', menu_horario: 'horario',
    menu_humano: 'humano', ver_carrito: 'carrito', cerrar: 'cerrar', vaciar: 'vaciar',
    pedido_confirmar: 'confirmarPedido', pedido_editar: 'editar', pedido_cancelar: 'cancelar',
  };
  if (simples[clave]) return { tipo: simples[clave] };
  if (clave === 'cat' && CATEGORIAS[valor]) return { tipo: 'categoria', categoria: valor };
  if (clave === 'prod' && productoPorId(valor)) return { tipo: 'producto', id: valor };
  if (clave === 'cant' && Number.isInteger(Number(valor))) return { tipo: 'cantidad', cantidad: Number(valor) };
  if (clave === 'entrega' && ['recojo', 'delivery'].includes(valor)) return { tipo: 'entrega', entrega: valor };
  if (clave === 'pago' && ['efectivo', 'yape', 'transferencia'].includes(valor)) return { tipo: 'pago', pago: valor };
  return { tipo: 'desconocida' };
}

function accionDeTexto(sesion, textoCliente) {
  const t = normalizar(textoCliente);
  if (!t) return { tipo: 'desconocida' };
  const intencion = detectarIntencion(textoCliente);

  // Estas dos funcionan en cualquier estado.
  if (intencion === 'cancelar' || intencion === 'humano') return { tipo: intencion };

  // Pidiendo la dirección, TODO lo demás es la dirección.
  if (sesion.estado === E.DIRECCION) return { tipo: 'direccion', texto: textoCliente.trim() };

  // Respuestas libres propias de cada paso.
  if (sesion.estado === E.TIPO_ENTREGA) {
    if (mencionaAlguna(t, ['delivery', 'domicilio', 'envio', 'enviar'])) return { tipo: 'entrega', entrega: 'delivery' };
    if (mencionaAlguna(t, ['recojo', 'recoger', 'recojer', 'tienda'])) return { tipo: 'entrega', entrega: 'recojo' };
  }
  if (sesion.estado === E.PAGO) {
    if (mencionaAlguna(t, ['efectivo'])) return { tipo: 'pago', pago: 'efectivo' };
    if (mencionaAlguna(t, ['yape'])) return { tipo: 'pago', pago: 'yape' };
    if (mencionaAlguna(t, ['transferencia', 'transfer', 'deposito'])) return { tipo: 'pago', pago: 'transferencia' };
  }
  if (sesion.estado === E.ELIGIENDO && sesion.productoPendiente) {
    const n = cantidadSola(textoCliente);
    if (n !== null) return { tipo: 'cantidad', cantidad: n };
  }
  if (sesion.estado === E.CONFIRMAR && mencionaAlguna(t, ['no', 'cambiar', 'modificar'])) return { tipo: 'editar' };

  // "quita las leches"
  if (/^(quita|quitar|saca|sacar|elimina|eliminar|borra|borrar)\b/.test(t)) {
    return { tipo: 'quitar', productos: buscarProductos(t, PRODUCTOS) };
  }

  // Texto que nombra productos: "quiero 2 leches y 1 arroz"
  const pedidos = separarPedidos(textoCliente, PRODUCTOS);
  if (pedidos.length > 0) return { tipo: 'agregarTexto', pedidos };

  switch (intencion) {
    case 'saludo': case 'menu': return { tipo: 'menu', saludo: intencion === 'saludo' };
    case 'catalogo': return { tipo: 'pedir' };
    case 'carrito': return { tipo: 'carrito' };
    case 'confirmar': return { tipo: sesion.estado === E.CONFIRMAR ? 'confirmarPedido' : 'cerrar' };
    case 'ayuda': return { tipo: 'ayuda' };
    case 'horario': return { tipo: 'horario' };
    default: return { tipo: 'desconocida' };
  }
}

// ---------- 2) Actuar: cambiar la sesión y preparar respuestas ----------

// Acciones que solo tienen sentido en un paso concreto (un botón viejo no debe romper el flujo).
const SOLO_EN = {
  entrega: E.TIPO_ENTREGA,
  pago: E.PAGO,
  confirmarPedido: E.CONFIRMAR,
};

function ejecutar(sesion, accion) {
  if (accion.tipo !== 'desconocida') sesion.fallos = 0;

  if (SOLO_EN[accion.tipo] && sesion.estado !== SOLO_EN[accion.tipo]) {
    return [texto(mensajes.opcionNoDisponible()), ...repetirPaso(sesion)];
  }
  if (accion.tipo === 'cantidad' && !sesion.productoPendiente) {
    return [texto(mensajes.opcionNoDisponible()), ...repetirPaso(sesion)];
  }

  switch (accion.tipo) {
    case 'menu': return mostrarMenu(sesion, accion.saludo || sesion.estado === E.INICIO);
    case 'pedir': return mostrarCategorias(sesion);
    case 'categoria': return mostrarProductos(sesion, accion.categoria);
    case 'producto': return elegirProducto(sesion, productoPorId(accion.id));
    case 'cantidad': return cantidadElegida(sesion, accion.cantidad);
    case 'agregarTexto': return agregarDesdeTexto(sesion, accion.pedidos);
    case 'quitar': return quitarDelCarrito(sesion, accion.productos);
    case 'carrito': return mostrarCarrito(sesion);
    case 'vaciar': sesion.carrito = []; return [texto(mensajes.carritoVaciado()), ...mostrarCategorias(sesion)];
    case 'cerrar': return cerrarCarrito(sesion);
    case 'entrega': return elegirEntrega(sesion, accion.entrega);
    case 'direccion': return recibirDireccion(sesion, accion.texto);
    case 'pago': return elegirPago(sesion, accion.pago);
    case 'editar': return mostrarCarrito(sesion);
    case 'confirmarPedido': return confirmarPedido(sesion);
    case 'horario': return [texto(mensajes.horario())];
    case 'ayuda': return [texto(mensajes.ayuda())];
    case 'humano':
      sesion.estado = E.ESPERANDO_HUMANO;
      sesion.derivadoHumano = true;
      return [texto(mensajes.esperandoHumano())];
    case 'cancelar':
      Object.assign(sesion, { ...crearSesion(sesion.telefono, sesion.actualizadoEn), estado: E.FIN, creadoEn: sesion.creadoEn });
      return [texto(mensajes.cancelado())];
    default: return noEntendido(sesion);
  }
}

function noEntendido(sesion) {
  // Primer mensaje de la conversación: no es un fallo, es la bienvenida.
  if (sesion.estado === E.INICIO) return mostrarMenu(sesion, true);
  sesion.fallos += 1;
  if (sesion.fallos >= 2) {
    return [botones(mensajes.noEntendiDeNuevo(), [
      { id: 'menu_humano', titulo: 'Hablar con alguien' },
      { id: 'menu_menu', titulo: 'Ver el menú' },
    ])];
  }
  return [texto(mensajes.noEntendi()), ...repetirPaso(sesion)];
}

// ---------- Pasos del flujo ----------

function mostrarMenu(sesion, conBienvenida) {
  sesion.estado = E.MENU;
  sesion.productoPendiente = null;
  sesion.cantidadPendiente = null;
  sesion.derivadoHumano = false;
  const menu = botones(mensajes.menu(), [
    { id: 'menu_pedir', titulo: 'Hacer pedido' },
    { id: 'menu_horario', titulo: 'Horario y ubicación' },
    { id: 'menu_humano', titulo: 'Hablar con alguien' },
  ]);
  return conBienvenida ? [texto(mensajes.bienvenida()), menu] : [menu];
}

function mostrarCategorias(sesion) {
  sesion.estado = E.ELIGIENDO;
  sesion.productoPendiente = null;
  sesion.cantidadPendiente = null;
  const filas = Object.entries(CATEGORIAS).map(([id, nombre]) => ({
    id: `cat:${id}`,
    titulo: nombre,
    descripcion: `${productosDeCategoria(id).length} productos`,
  }));
  return [lista(mensajes.elegirCategoria(), 'Ver categorías', [{ titulo: 'Categorías', filas }])];
}

function mostrarProductos(sesion, categoria) {
  sesion.cantidadPendiente = null;
  sesion.estado = E.ELIGIENDO;
  const filas = productosDeCategoria(categoria).slice(0, 10).map(filaDeProducto);
  return [lista(mensajes.elegirProducto(CATEGORIAS[categoria]), 'Ver productos', [{ titulo: CATEGORIAS[categoria], filas }])];
}

function filaDeProducto(p) {
  return {
    id: `prod:${p.id}`,
    titulo: recortar(p.nombre, 24),
    descripcion: recortar(`${Carrito.formatoSoles(p.precio)} por ${p.unidad}`, 72),
  };
}

function elegirProducto(sesion, producto) {
  sesion.estado = E.ELIGIENDO;
  // Si ya sabíamos la cantidad (ej. "2 leches" y hubo que elegir tipo), agregamos de una vez.
  if (sesion.cantidadPendiente) {
    const cantidad = sesion.cantidadPendiente;
    sesion.cantidadPendiente = null;
    return cantidadConProducto(sesion, producto, cantidad);
  }
  sesion.productoPendiente = producto.id;
  return [botones(mensajes.preguntarCantidad(producto), [
    { id: 'cant:1', titulo: '1' },
    { id: 'cant:2', titulo: '2' },
    { id: 'cant:3', titulo: '3' },
  ])];
}

function cantidadElegida(sesion, cantidad) {
  const producto = productoPorId(sesion.productoPendiente);
  return cantidadConProducto(sesion, producto, cantidad);
}

function cantidadConProducto(sesion, producto, cantidad) {
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    sesion.productoPendiente = producto.id;
    return [texto(mensajes.cantidadInvalida(MAX_POR_PRODUCTO))];
  }
  const yaTiene = sesion.carrito.find((l) => l.id === producto.id)?.cantidad ?? 0;
  if (yaTiene + cantidad > MAX_POR_PRODUCTO) {
    sesion.productoPendiente = null;
    return [texto(mensajes.cantidadExcedida(MAX_POR_PRODUCTO))];
  }
  sesion.carrito = Carrito.agregar(sesion.carrito, producto, cantidad);
  sesion.productoPendiente = null;
  return [avisoAgregado(sesion, [`Agregué ${cantidad} x ${producto.nombre}.`])];
}

function avisoAgregado(sesion, lineas) {
  sesion.estado = E.ELIGIENDO;
  return botones(
    mensajes.agregado(lineas, Carrito.cantidadItems(sesion.carrito), Carrito.total(sesion.carrito)),
    [
      { id: 'seguir', titulo: 'Seguir comprando' },
      { id: 'ver_carrito', titulo: 'Ver carrito' },
      { id: 'cerrar', titulo: 'Finalizar pedido' },
    ],
  );
}

// "quiero 2 leches y 1 arroz": agrega lo claro y pregunta solo por lo ambiguo.
function agregarDesdeTexto(sesion, pedidos) {
  const lineas = [];
  sesion.cantidadPendiente = null;
  let ambiguo = null;
  for (const { cantidad, productos } of pedidos) {
    if (productos.length > 1) { ambiguo ??= { cantidad, productos }; continue; }
    const producto = productos[0];
    const yaTiene = sesion.carrito.find((l) => l.id === producto.id)?.cantidad ?? 0;
    if (cantidad < 1 || yaTiene + cantidad > MAX_POR_PRODUCTO) {
      lineas.push(`No pude agregar ${producto.nombre}: ${mensajes.cantidadExcedida(MAX_POR_PRODUCTO)}`);
      continue;
    }
    sesion.carrito = Carrito.agregar(sesion.carrito, producto, cantidad);
    lineas.push(`Agregué ${cantidad} x ${producto.nombre}.`);
  }
  const respuestas = [];
  if (lineas.length > 0) respuestas.push(avisoAgregado(sesion, lineas));
  if (ambiguo) {
    sesion.estado = E.ELIGIENDO;
    sesion.cantidadPendiente = ambiguo.cantidad;
    const filas = ambiguo.productos.slice(0, 10).map(filaDeProducto);
    respuestas.push(lista(mensajes.elegirEntreVarios(), 'Elegir', [{ titulo: 'Opciones', filas }]));
  }
  return respuestas;
}

function quitarDelCarrito(sesion, productos) {
  const enCarrito = productos.filter((p) => sesion.carrito.some((l) => l.id === p.id));
  if (enCarrito.length === 0) return [texto(mensajes.nadaQuitar())];
  for (const p of enCarrito) sesion.carrito = Carrito.quitar(sesion.carrito, p.id);
  return [texto(mensajes.quitado(enCarrito.map((p) => p.nombre))), ...mostrarCarrito(sesion)];
}

function mostrarCarrito(sesion) {
  if (sesion.carrito.length === 0) {
    return [texto(mensajes.carritoVacio()), ...mostrarCategorias(sesion)];
  }
  sesion.estado = E.CARRITO;
  return [botones(mensajes.carrito(Carrito.resumen(sesion.carrito)), [
    { id: 'cerrar', titulo: 'Continuar' },
    { id: 'seguir', titulo: 'Seguir comprando' },
    { id: 'vaciar', titulo: 'Vaciar carrito' },
  ])];
}

function cerrarCarrito(sesion) {
  // Si ya estamos más adelante, "listo" o "ok" solo repite la pregunta pendiente.
  if ([E.TIPO_ENTREGA, E.PAGO, E.DIRECCION].includes(sesion.estado)) return repetirPaso(sesion);
  if (sesion.carrito.length === 0) return [texto(mensajes.carritoVacio()), ...mostrarCategorias(sesion)];
  sesion.estado = E.TIPO_ENTREGA;
  return preguntaEntrega(sesion);
}

function preguntaEntrega(sesion) {
  return [botones(mensajes.tipoEntrega(Carrito.total(sesion.carrito)), [
    { id: 'entrega:recojo', titulo: 'Recojo en tienda' },
    { id: 'entrega:delivery', titulo: 'Delivery' },
    { id: 'seguir', titulo: 'Agregar más' },
  ])];
}

function elegirEntrega(sesion, entrega) {
  const subtotal = Carrito.total(sesion.carrito);
  if (entrega === 'delivery' && subtotal < NEGOCIO.minimoDelivery) {
    return [botones(mensajes.bajoElMinimo(subtotal), [
      { id: 'entrega:recojo', titulo: 'Recojo en tienda' },
      { id: 'seguir', titulo: 'Agregar más' },
    ])];
  }
  sesion.entrega = entrega;
  if (entrega === 'delivery') {
    sesion.estado = E.DIRECCION;
    return [texto(mensajes.pedirDireccion())];
  }
  sesion.direccion = null;
  return preguntaPago(sesion);
}

function recibirDireccion(sesion, direccion) {
  if (direccion.length < MIN_DIRECCION) return [texto(mensajes.direccionInvalida())];
  sesion.direccion = direccion;
  return preguntaPago(sesion);
}

function preguntaPago(sesion) {
  sesion.estado = E.PAGO;
  return [botones(mensajes.pedirPago(), [
    { id: 'pago:efectivo', titulo: 'Efectivo' },
    { id: 'pago:yape', titulo: 'Yape' },
    { id: 'pago:transferencia', titulo: 'Transferencia' },
  ])];
}

function costoEntrega(sesion) {
  return sesion.entrega === 'delivery' ? NEGOCIO.costoDelivery : 0;
}

function totalPedido(sesion) {
  // En céntimos para no arrastrar decimales raros.
  return (Math.round(Carrito.total(sesion.carrito) * 100) + Math.round(costoEntrega(sesion) * 100)) / 100;
}

function elegirPago(sesion, pago) {
  sesion.pago = pago;
  return resumenFinal(sesion);
}

function resumenFinal(sesion) {
  sesion.estado = E.CONFIRMAR;
  const t = mensajes.confirmar(
    Carrito.resumen(sesion.carrito), sesion.entrega, sesion.direccion, sesion.pago, costoEntrega(sesion), totalPedido(sesion),
  );
  return [botones(t, [
    { id: 'pedido_confirmar', titulo: 'Confirmar pedido' },
    { id: 'pedido_editar', titulo: 'Modificar pedido' },
    { id: 'pedido_cancelar', titulo: 'Cancelar' },
  ])];
}

function confirmarPedido(sesion) {
  const pedido = {
    id: `LE-${sesion.actualizadoEn.toString(36).toUpperCase().slice(-6)}`,
    telefono: sesion.telefono,
    items: sesion.carrito.map((l) => ({ ...l })),
    total: totalPedido(sesion),
    entrega: sesion.entrega,
    direccion: sesion.direccion,
    pago: sesion.pago,
    estado: 'recibido',
    creadoEn: sesion.actualizadoEn,
  };
  sesion.pedidoNuevo = pedido; // la capa de E/S lo guarda
  sesion.carrito = [];
  sesion.estado = E.FIN;
  return [texto(mensajes.pedidoRecibido(pedido))];
}

// Vuelve a mostrar la pregunta del paso actual (sin cambiar de estado).
function repetirPaso(sesion) {
  switch (sesion.estado) {
    case E.INICIO: case E.MENU: return mostrarMenu(sesion, false);
    case E.ELIGIENDO:
      if (sesion.productoPendiente) return elegirProducto(sesion, productoPorId(sesion.productoPendiente));
      return mostrarCategorias(sesion);
    case E.CARRITO: return mostrarCarrito(sesion);
    case E.TIPO_ENTREGA: return preguntaEntrega(sesion);
    case E.DIRECCION: return [texto(mensajes.pedirDireccion())];
    case E.PAGO: return preguntaPago(sesion);
    case E.CONFIRMAR: return resumenFinal(sesion);
    default: return [];
  }
}

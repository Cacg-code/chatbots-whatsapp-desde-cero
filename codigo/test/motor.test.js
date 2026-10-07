import test from 'node:test';
import assert from 'node:assert/strict';
import { crearSesion, procesar, ESTADOS } from '../src/motor.js';
import { conversacion, AHORA } from './ayudas.js';

// ---------- Conversaciones completas ----------

test('pedido completo con recojo, usando solo botones y listas', () => {
  const c = conversacion();
  c.decir('hola');
  assert.equal(c.sesion.estado, ESTADOS.MENU);
  assert.match(c.transcripcion[0].texto, /Minimarket La Esquina/);

  c.tocar('menu_pedir');
  assert.equal(c.respuestas[0].tipo, 'lista');
  c.tocar('cat:lacteos');
  c.tocar('prod:leche');
  assert.equal(c.respuestas[0].tipo, 'botones');
  c.tocar('cant:2');
  assert.deepEqual(c.sesion.carrito.map((l) => [l.id, l.cantidad]), [['leche', 2]]);

  c.tocar('cerrar');
  assert.equal(c.sesion.estado, ESTADOS.TIPO_ENTREGA);
  c.tocar('entrega:recojo');
  assert.equal(c.sesion.estado, ESTADOS.PAGO);
  c.tocar('pago:efectivo');
  assert.equal(c.sesion.estado, ESTADOS.CONFIRMAR);
  assert.match(c.texto, /Total a pagar: S\/ 8\.60/);

  c.tocar('pedido_confirmar');
  const pedido = c.sesion.pedidoNuevo;
  assert.equal(c.sesion.estado, ESTADOS.FIN);
  assert.equal(pedido.estado, 'recibido');
  assert.equal(pedido.total, 8.6);
  assert.equal(pedido.entrega, 'recojo');
  assert.equal(pedido.direccion, null);
  assert.equal(pedido.pago, 'efectivo');
  assert.equal(pedido.telefono, '51999000111');
  assert.equal(pedido.items[0].cantidad, 2);
  assert.match(pedido.id, /^LE-/);
  assert.equal(typeof pedido.creadoEn, 'number');
  assert.match(c.texto, new RegExp(pedido.id));
});

test('pedido completo con delivery escribiendo texto libre', () => {
  const c = conversacion();
  c.decir('Buenas');
  c.decir('quiero 3 leches y 2 arroces');
  assert.equal(c.sesion.carrito.length, 2);
  c.decir('finalizar pedido');
  assert.equal(c.sesion.estado, ESTADOS.TIPO_ENTREGA);
  c.decir('delivery por favor'); // 12.90 + 8.40 = 21.30 < 25
  assert.equal(c.sesion.estado, ESTADOS.TIPO_ENTREGA, 'no debe avanzar bajo el mínimo');
  assert.match(c.texto, /pedido mínimo es S\/ 25\.00/);
  assert.match(c.texto, /Te faltan S\/ 3\.70/);

  c.decir('2 aceites'); // +19.00 = 40.30
  c.decir('listo');
  c.decir('delivery');
  assert.equal(c.sesion.estado, ESTADOS.DIRECCION);

  c.decir('Av 1'); // muy corta
  assert.equal(c.sesion.estado, ESTADOS.DIRECCION);
  assert.match(c.texto, /muy corta/);

  c.decir('Av. Los Pinos 456, casa verde');
  assert.equal(c.sesion.estado, ESTADOS.PAGO);
  c.decir('con yape');
  assert.match(c.texto, /Total a pagar: S\/ 43\.30/); // 40.30 + 3.00 de delivery

  c.decir('sí');
  const pedido = c.sesion.pedidoNuevo;
  assert.equal(pedido.total, 43.3);
  assert.equal(pedido.entrega, 'delivery');
  assert.equal(pedido.direccion, 'Av. Los Pinos 456, casa verde');
  assert.equal(pedido.pago, 'yape');
  assert.match(c.texto, /Yape: envía S\/ 43\.30 al 51999000111/);
});

test('delivery justo en el mínimo sí se permite', () => {
  const c = conversacion();
  // 5 x 5.00 (chicha) = 25.00 exactos
  c.decir('5 chichas');
  c.decir('finalizar');
  c.decir('delivery');
  assert.equal(c.sesion.estado, ESTADOS.DIRECCION);
});

test('transferencia muestra la cuenta de ejemplo', () => {
  const c = conversacion();
  c.decir('2 arroz');
  c.decir('listo');
  c.tocar('entrega:recojo');
  c.tocar('pago:transferencia');
  c.tocar('pedido_confirmar');
  assert.match(c.texto, /Transferencia: Cuenta de ejemplo/);
});

test('"Modificar pedido" vuelve al carrito y se puede cambiar', () => {
  const c = conversacion();
  c.decir('2 arroz');
  c.decir('listo');
  c.tocar('entrega:recojo');
  c.tocar('pago:efectivo');
  c.tocar('pedido_editar');
  assert.equal(c.sesion.estado, ESTADOS.CARRITO);
  c.decir('quita el arroz');
  assert.equal(c.sesion.carrito.length, 0);
});

test('después de FIN, el siguiente mensaje empieza una conversación nueva', () => {
  const c = conversacion();
  c.decir('1 arroz');
  c.decir('listo');
  c.tocar('entrega:recojo');
  c.tocar('pago:efectivo');
  c.tocar('pedido_confirmar');
  c.decir('hola');
  assert.equal(c.sesion.estado, ESTADOS.MENU);
  assert.equal(c.sesion.carrito.length, 0);
  assert.equal(c.sesion.pedidoNuevo, null);
});

// ---------- Cancelar en cualquier paso ----------

const pasos = {
  MENU: (c) => c.decir('hola'),
  ELIGIENDO: (c) => { c.decir('hola'); c.tocar('menu_pedir'); },
  'ELIGIENDO con producto pendiente': (c) => { c.tocar('prod:leche'); },
  CARRITO: (c) => { c.decir('2 leches'); c.tocar('ver_carrito'); },
  TIPO_ENTREGA: (c) => { c.decir('2 leches'); c.decir('listo'); },
  DIRECCION: (c) => { c.decir('10 chichas'); c.decir('listo'); c.decir('delivery'); },
  PAGO: (c) => { c.decir('2 leches'); c.decir('listo'); c.decir('recojo'); },
  CONFIRMAR: (c) => { c.decir('2 leches'); c.decir('listo'); c.decir('recojo'); c.decir('efectivo'); },
};

for (const [nombre, preparar] of Object.entries(pasos)) {
  test(`cancelar funciona en el paso ${nombre}`, () => {
    const c = conversacion();
    preparar(c);
    c.decir('cancelar');
    assert.equal(c.sesion.estado, ESTADOS.FIN);
    assert.equal(c.sesion.carrito.length, 0);
    assert.equal(c.sesion.pedidoNuevo, null);
    assert.match(c.texto, /Cancelé tu pedido/);
  });
}

test('el botón Cancelar de la confirmación también cancela', () => {
  const c = conversacion();
  pasos.CONFIRMAR(c);
  c.tocar('pedido_cancelar');
  assert.equal(c.sesion.estado, ESTADOS.FIN);
});

// ---------- Texto libre ----------

test('texto libre con saludo y pedido a la vez agrega el producto', () => {
  const c = conversacion();
  c.decir('hola quiero 2 leches');
  assert.equal(c.sesion.carrito[0].cantidad, 2);
});

test('"menú" funciona desde otros pasos', () => {
  const c = conversacion();
  c.decir('2 leches');
  c.decir('menú');
  assert.equal(c.sesion.estado, ESTADOS.MENU);
  assert.equal(c.sesion.carrito.length, 1, 'el carrito se conserva');
});

test('"carrito" muestra lo que llevas', () => {
  const c = conversacion();
  c.decir('2 leches y 1 arroz');
  c.decir('carrito');
  assert.equal(c.sesion.estado, ESTADOS.CARRITO);
  assert.match(c.texto, /2 x Leche entera 1 L/);
  assert.match(c.texto, /Subtotal: S\/ 12\.80/);
});

test('carrito vacío ofrece el catálogo', () => {
  const c = conversacion();
  c.decir('hola');
  c.decir('carrito');
  assert.match(c.texto, /vacío/);
});

test('"horario" responde sin cambiar de paso', () => {
  const c = conversacion();
  c.decir('2 leches');
  const antes = c.sesion.estado;
  c.decir('a qué hora abren?');
  assert.match(c.texto, /Horario:/);
  assert.equal(c.sesion.estado, antes);
});

test('errores de tipeo se entienden', () => {
  const c = conversacion();
  c.decir('quiero 2 mantequila');
  assert.equal(c.sesion.carrito[0].id, 'mantequilla');
});

test('media docena de huevos', () => {
  const c = conversacion();
  c.decir('media docena de huevos');
  assert.equal(c.sesion.carrito[0].cantidad, 6);
});

test('producto ambiguo: pregunta cuál y recuerda la cantidad', () => {
  const c = conversacion();
  c.decir('quiero 2 gaseosas');
  assert.equal(c.respuestas[0].tipo, 'lista');
  assert.deepEqual(c.idsOfrecidos(), ['prod:gaseosa-cola', 'prod:gaseosa-naranja']);
  c.tocar('prod:gaseosa-naranja');
  assert.deepEqual(c.sesion.carrito.map((l) => [l.id, l.cantidad]), [['gaseosa-naranja', 2]]);
});

test('quitar un producto por texto', () => {
  const c = conversacion();
  c.decir('2 leches y 1 arroz');
  c.decir('quita la leche');
  assert.deepEqual(c.sesion.carrito.map((l) => l.id), ['arroz']);
  c.decir('quita el aceite');
  assert.match(c.texto, /No encontré/);
});

test('vaciar carrito', () => {
  const c = conversacion();
  c.decir('2 leches');
  c.tocar('ver_carrito');
  c.tocar('vaciar');
  assert.equal(c.sesion.carrito.length, 0);
});

// ---------- Cantidades ----------

test('el cliente escribe la cantidad tras elegir un producto', () => {
  const c = conversacion();
  c.tocar('prod:leche');
  c.decir('cuatro');
  assert.equal(c.sesion.carrito[0].cantidad, 4);
});

test('cantidad inválida: 0 se rechaza y se vuelve a preguntar', () => {
  const c = conversacion();
  c.tocar('prod:leche');
  c.decir('0');
  assert.equal(c.sesion.carrito.length, 0);
  assert.match(c.texto, /entre 1 y 20/);
  c.decir('2');
  assert.equal(c.sesion.carrito[0].cantidad, 2);
});

test('máximo 20 unidades por producto', () => {
  const c = conversacion();
  c.decir('15 leches');
  c.decir('10 leches');
  assert.equal(c.sesion.carrito[0].cantidad, 15);
  assert.match(c.texto, /hasta 20/);
});

// ---------- No entendidos y humano ----------

test('mensaje incomprensible x2 ofrece hablar con una persona', () => {
  const c = conversacion();
  c.decir('hola');
  c.decir('asdfgh qwerty');
  assert.equal(c.sesion.fallos, 1);
  assert.match(c.texto, /No te entendí/);
  c.decir('zzzz xxxx');
  assert.equal(c.sesion.fallos, 2);
  assert.equal(c.respuestas[0].tipo, 'botones');
  assert.ok(c.idsOfrecidos().includes('menu_humano'));
  c.tocar('menu_humano');
  assert.equal(c.sesion.estado, ESTADOS.ESPERANDO_HUMANO);
});

test('entender algo reinicia el contador de fallos', () => {
  const c = conversacion();
  c.decir('hola');
  c.decir('asdfgh');
  c.decir('2 leches');
  assert.equal(c.sesion.fallos, 0);
});

test('"hablar con una persona" funciona en cualquier paso y el bot calla', () => {
  const c = conversacion();
  c.decir('2 leches');
  c.decir('quiero hablar con una persona');
  assert.equal(c.sesion.estado, ESTADOS.ESPERANDO_HUMANO);
  assert.equal(c.sesion.derivadoHumano, true);
  c.decir('hola? alguien?');
  assert.deepEqual(c.respuestas, []);
  c.decir('menú');
  assert.equal(c.sesion.estado, ESTADOS.MENU);
  assert.equal(c.sesion.derivadoHumano, false);
});

test('imágenes o audios: el bot avisa que solo entiende texto', () => {
  const c = conversacion();
  c.decir('hola');
  c.enviar({ tipo: 'no_soportado', subtipo: 'image' });
  assert.match(c.texto, /solo entiendo texto/);
  assert.equal(c.sesion.estado, ESTADOS.MENU);
});

test('un botón viejo fuera de su paso no rompe el flujo', () => {
  const c = conversacion();
  c.decir('hola');
  c.tocar('pedido_confirmar');
  assert.equal(c.sesion.pedidoNuevo, null);
  assert.match(c.texto, /ya no está disponible/);
  c.tocar('id-que-no-existe');
  assert.equal(c.sesion.fallos, 1);
});

// ---------- Propiedades del motor ----------

test('procesar es puro: no modifica la sesión recibida', () => {
  const s = crearSesion('51999000111', AHORA);
  const copia = JSON.stringify(s);
  procesar(s, { tipo: 'texto', texto: '2 leches' }, AHORA + 1000);
  assert.equal(JSON.stringify(s), copia);
});

test('procesar es determinista: misma entrada, misma salida', () => {
  const s = crearSesion('51999000111', AHORA);
  const a = procesar(s, { tipo: 'texto', texto: '2 leches' }, AHORA + 1000);
  const b = procesar(s, { tipo: 'texto', texto: '2 leches' }, AHORA + 1000);
  assert.deepEqual(a, b);
});

test('cada respuesta respeta los límites de WhatsApp en una conversación larga', () => {
  const c = conversacion();
  c.decir('hola');
  c.tocar('menu_pedir');
  for (const cat of ['abarrotes', 'bebidas', 'lacteos', 'panaderia', 'limpieza', 'snacks']) c.tocar(`cat:${cat}`);
  c.tocar('menu_horario');
  c.decir('ayuda');
  c.decir('asdf');
  c.decir('asdf');
  // si algo rompe un límite, conversacion() lanza una excepción: llegar aquí es la prueba
  assert.ok(c.transcripcion.length > 10);
  for (const r of c.transcripcion) {
    if (r.tipo === 'botones') assert.ok(r.botones.length <= 3 && r.botones.every((b) => b.titulo.length <= 20));
    if (r.tipo === 'lista') assert.ok(r.secciones.flatMap((s) => s.filas).length <= 10);
    assert.doesNotMatch(r.texto, /\p{Extended_Pictographic}/u, 'sin emojis');
  }
});

test('el pedido guardado es independiente del carrito', () => {
  const c = conversacion();
  c.decir('2 leches');
  c.decir('listo');
  c.decir('recojo');
  c.decir('efectivo');
  c.decir('confirmar');
  const pedido = c.sesion.pedidoNuevo;
  assert.equal(pedido.items.length, 1);
  assert.equal(c.sesion.carrito.length, 0);
});

test('pedidoNuevo solo existe en el turno en que se confirma', () => {
  const c = conversacion();
  c.decir('2 leches');
  c.decir('listo');
  c.decir('recojo');
  c.decir('efectivo');
  c.decir('confirmar');
  assert.ok(c.sesion.pedidoNuevo);
  c.decir('hola');
  assert.equal(c.sesion.pedidoNuevo, null);
});

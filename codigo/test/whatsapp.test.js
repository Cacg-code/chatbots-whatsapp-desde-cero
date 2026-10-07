import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GRAPH_VERSION, parsearWebhook, construirEnvio, construirPlantilla, construirLeido, verificarFirma, firmar, enviarMensaje,
} from '../src/whatsapp.js';

const cargar = (nombre) => JSON.parse(readFileSync(new URL(`./payloads/${nombre}.json`, import.meta.url), 'utf8'));
const TO = '51999000111';

// ---------- Parseo ----------

test('parsea un mensaje de texto', () => {
  const [e] = parsearWebhook(cargar('texto'));
  assert.equal(e.tipo, 'mensaje');
  assert.equal(e.de, '51999000111');
  assert.equal(e.nombre, 'Cliente Ejemplo');
  assert.equal(e.id, 'wamid.TEXTO001');
  assert.equal(e.timestamp, 1791360000);
  assert.equal(e.phoneNumberId, '106540352242922');
  assert.deepEqual(e.entrada, { tipo: 'texto', texto: 'Quiero 2 leches' });
});

test('parsea la respuesta a un botón', () => {
  const [e] = parsearWebhook(cargar('boton'));
  assert.deepEqual(e.entrada, { tipo: 'interactivo', id: 'menu_pedir', titulo: 'Hacer pedido' });
});

test('parsea la respuesta a una lista', () => {
  const [e] = parsearWebhook(cargar('lista'));
  assert.deepEqual(e.entrada, { tipo: 'interactivo', id: 'prod:leche', titulo: 'Leche entera 1 L' });
});

test('una imagen se marca como no soportada', () => {
  const [e] = parsearWebhook(cargar('imagen'));
  assert.deepEqual(e.entrada, { tipo: 'no_soportado', subtipo: 'image' });
});

test('un mensaje "unsupported" se marca como no soportado', () => {
  const [e] = parsearWebhook(cargar('no-soportado'));
  assert.equal(e.entrada.tipo, 'no_soportado');
  assert.equal(e.entrada.subtipo, 'unsupported:poll_update');
});

test('parsea actualizaciones de estado', () => {
  const [e] = parsearWebhook(cargar('estado-entregado'));
  assert.deepEqual(
    { tipo: e.tipo, id: e.id, estado: e.estado, destinatario: e.destinatario, timestamp: e.timestamp },
    { tipo: 'estado', id: 'wamid.SALIDA001', estado: 'delivered', destinatario: '51999000111', timestamp: 1791360050 },
  );
});

test('un estado fallido trae sus errores', () => {
  const [e] = parsearWebhook(cargar('estado-fallido'));
  assert.equal(e.estado, 'failed');
  assert.equal(e.errores[0].code, 131047);
});

test('parsearWebhook ignora basura sin romperse', () => {
  for (const basura of [null, undefined, {}, [], 'texto', 42, { object: 'otra_cosa' }, { object: 'whatsapp_business_account' },
    { object: 'whatsapp_business_account', entry: [null, {}, { changes: [null, { field: 'otro' }, { field: 'messages' }] }] },
    { object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: { messages: [{}, null, { type: 'text' }] } }] }] }]) {
    assert.deepEqual(parsearWebhook(basura), []);
  }
});

test('un payload con varios mensajes devuelve varios eventos', () => {
  const p = cargar('texto');
  const msg = p.entry[0].changes[0].value.messages[0];
  p.entry[0].changes[0].value.messages.push({ ...msg, id: 'wamid.TEXTO002' });
  assert.deepEqual(parsearWebhook(p).map((e) => e.id), ['wamid.TEXTO001', 'wamid.TEXTO002']);
});

// ---------- Construcción de envíos ----------

test('envío de texto', () => {
  assert.deepEqual(construirEnvio(TO, { tipo: 'texto', texto: 'Hola' }), {
    messaging_product: 'whatsapp', recipient_type: 'individual', to: TO, type: 'text',
    text: { preview_url: false, body: 'Hola' },
  });
});

test('envío de botones', () => {
  const cuerpo = construirEnvio(TO, {
    tipo: 'botones', texto: 'Elige', botones: [{ id: 'a', titulo: 'Uno' }, { id: 'b', titulo: 'Dos' }],
  });
  assert.equal(cuerpo.type, 'interactive');
  assert.equal(cuerpo.interactive.type, 'button');
  assert.deepEqual(cuerpo.interactive.body, { text: 'Elige' });
  assert.deepEqual(cuerpo.interactive.action.buttons, [
    { type: 'reply', reply: { id: 'a', title: 'Uno' } },
    { type: 'reply', reply: { id: 'b', title: 'Dos' } },
  ]);
});

test('envío de lista', () => {
  const cuerpo = construirEnvio(TO, {
    tipo: 'lista', texto: 'Elige', boton: 'Ver',
    secciones: [{ titulo: 'Lácteos', filas: [{ id: 'prod:leche', titulo: 'Leche', descripcion: 'S/ 4.30' }, { id: 'prod:queso', titulo: 'Queso' }] }],
  });
  assert.equal(cuerpo.interactive.type, 'list');
  assert.equal(cuerpo.interactive.action.button, 'Ver');
  const [seccion] = cuerpo.interactive.action.sections;
  assert.equal(seccion.title, 'Lácteos');
  assert.deepEqual(seccion.rows[0], { id: 'prod:leche', title: 'Leche', description: 'S/ 4.30' });
  assert.deepEqual(seccion.rows[1], { id: 'prod:queso', title: 'Queso' }); // sin descripción no se inventa el campo
});

test('rechaza más de 3 botones, títulos largos y títulos repetidos', () => {
  const b = (n, t = `B${n}`) => ({ id: `id${n}`, titulo: t });
  assert.throws(() => construirEnvio(TO, { tipo: 'botones', texto: 'x', botones: [b(1), b(2), b(3), b(4)] }), /entre 1 y 3/);
  assert.throws(() => construirEnvio(TO, { tipo: 'botones', texto: 'x', botones: [b(1, 'a'.repeat(21))] }), /20 caracteres/);
  assert.throws(() => construirEnvio(TO, { tipo: 'botones', texto: 'x', botones: [b(1, 'Si'), b(2, 'Si')] }), /únicos/);
});

test('rechaza listas con más de 10 filas o textos largos', () => {
  const filas = (n) => Array.from({ length: n }, (_, i) => ({ id: `f${i}`, titulo: `Fila ${i}` }));
  assert.throws(() => construirEnvio(TO, { tipo: 'lista', texto: 'x', boton: 'Ver', secciones: [{ titulo: 'S', filas: filas(11) }] }), /10 filas/);
  assert.throws(() => construirEnvio(TO, { tipo: 'lista', texto: 'x', boton: 'Ver', secciones: [{ titulo: 'S', filas: [{ id: 'a', titulo: 'x'.repeat(25) }] }] }), /24/);
  assert.throws(() => construirEnvio(TO, { tipo: 'lista', texto: 'x', boton: 'Ver', secciones: [{ titulo: 'S', filas: [{ id: 'a', titulo: 'x', descripcion: 'd'.repeat(73) }] }] }), /72/);
  // 10 filas repartidas en 2 secciones sí vale
  assert.ok(construirEnvio(TO, { tipo: 'lista', texto: 'x', boton: 'Ver', secciones: [{ titulo: 'A', filas: filas(5) }, { titulo: 'B', filas: filas(5) }] }));
});

test('rechaza texto vacío y tipos desconocidos', () => {
  assert.throws(() => construirEnvio(TO, { tipo: 'texto', texto: '' }));
  assert.throws(() => construirEnvio(TO, { tipo: 'video' }), /desconocido/);
});

test('plantilla con variables', () => {
  assert.deepEqual(construirPlantilla(TO, 'recordatorio_pedido', 'es', ['LE-123']), {
    messaging_product: 'whatsapp', recipient_type: 'individual', to: TO, type: 'template',
    template: {
      name: 'recordatorio_pedido', language: { code: 'es' },
      components: [{ type: 'body', parameters: [{ type: 'text', text: 'LE-123' }] }],
    },
  });
});

test('plantilla sin variables no lleva components', () => {
  const p = construirPlantilla(TO, 'carrito_pendiente');
  assert.equal(p.template.components, undefined);
  assert.equal(p.template.language.code, 'es');
});

test('mensaje de leído', () => {
  assert.deepEqual(construirLeido('wamid.X'), { messaging_product: 'whatsapp', status: 'read', message_id: 'wamid.X' });
});

// ---------- Firma ----------

const SECRETO = 'secreto-de-ejemplo';
const CUERPO = JSON.stringify(cargar('texto'));

test('firma válida', async () => {
  assert.equal(await verificarFirma(SECRETO, CUERPO, await firmar(SECRETO, CUERPO)), true);
});

test('firma con vector conocido (HMAC-SHA256 estándar)', async () => {
  // Calculado con: echo -n "Hola" | openssl dgst -sha256 -hmac "clave"
  const esperada = 'sha256=' + (await import('node:crypto')).createHmac('sha256', 'clave').update('Hola').digest('hex');
  assert.equal(await firmar('clave', 'Hola'), esperada);
});

test('firma inválida: cuerpo alterado, secreto equivocado o cabecera mal formada', async () => {
  const buena = await firmar(SECRETO, CUERPO);
  assert.equal(await verificarFirma(SECRETO, CUERPO + ' ', buena), false);
  assert.equal(await verificarFirma('otro-secreto', CUERPO, buena), false);
  assert.equal(await verificarFirma(SECRETO, CUERPO, buena.replace('sha256=', 'sha1=')), false);
  assert.equal(await verificarFirma(SECRETO, CUERPO, 'sha256=abc'), false);
  assert.equal(await verificarFirma(SECRETO, CUERPO, null), false);
  assert.equal(await verificarFirma(SECRETO, CUERPO, undefined), false);
  assert.equal(await verificarFirma('', CUERPO, buena), false);
});

// ---------- Red (con fetch falso) ----------

test('enviarMensaje usa la versión de Graph API, el token y el id de teléfono', async () => {
  let pedido;
  const falso = async (url, opciones) => { pedido = { url, opciones }; return { ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid.OK' }] }) }; };
  const r = await enviarMensaje({ WA_TOKEN: 'TOKEN', WA_PHONE_ID: '123' }, { hola: 1 }, falso);
  assert.equal(pedido.url, `https://graph.facebook.com/${GRAPH_VERSION}/123/messages`);
  assert.equal(pedido.opciones.method, 'POST');
  assert.equal(pedido.opciones.headers.Authorization, 'Bearer TOKEN');
  assert.deepEqual(JSON.parse(pedido.opciones.body), { hola: 1 });
  assert.equal(r.messages[0].id, 'wamid.OK');
});

test('enviarMensaje lanza error claro sin revelar el token', async () => {
  const falso = async () => ({ ok: false, status: 401, json: async () => ({ error: { message: 'Invalid OAuth access token' } }) });
  await assert.rejects(enviarMensaje({ WA_TOKEN: 'TOKEN-SECRETO', WA_PHONE_ID: '1' }, {}, falso), (e) => {
    assert.match(e.message, /401/);
    assert.doesNotMatch(e.message, /TOKEN-SECRETO/);
    return true;
  });
});

test('GRAPH_VERSION tiene el formato vNN.0', () => {
  assert.match(GRAPH_VERSION, /^v\d+\.0$/);
});

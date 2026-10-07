// Pruebas del Worker con un KV falso (un Map) y un fetch falso. No sale a internet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker, { ejecutarRecordatorios } from '../src/worker.js';
import { firmar } from '../src/whatsapp.js';

const cuerpoTexto = readFileSync(new URL('./payloads/texto.json', import.meta.url), 'utf8');

function crearEntorno() {
  const datos = new Map();
  const BOT_KV = {
    get: async (k) => datos.get(k) ?? null,
    put: async (k, v) => { datos.set(k, v); },
    delete: async (k) => { datos.delete(k); },
    list: async ({ prefix }) => ({ keys: [...datos.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })) }),
  };
  return { BOT_KV, datos, VERIFY_TOKEN: 'verifica', WA_TOKEN: 'tok', WA_PHONE_ID: '123', APP_SECRET: 'secreto' };
}

function crearCtx() {
  const tareas = [];
  return { waitUntil: (p) => tareas.push(p), terminar: () => Promise.all(tareas) };
}

// Sustituye fetch global por uno falso que anota las llamadas.
function simularGraph(prueba) {
  return async () => {
    const llamadas = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (url, op) => {
      llamadas.push({ url, cuerpo: JSON.parse(op.body) });
      return { ok: true, status: 200, json: async () => ({}) };
    };
    try { await prueba(llamadas); } finally { globalThis.fetch = original; }
  };
}

const postFirmado = async (cuerpo, secreto = 'secreto') =>
  new Request('https://bot.example/webhook', {
    method: 'POST', body: cuerpo, headers: { 'X-Hub-Signature-256': await firmar(secreto, cuerpo) },
  });

test('GET / y /salud responden ok', async () => {
  const env = crearEntorno();
  assert.equal(await (await worker.fetch(new Request('https://bot.example/'), env, crearCtx())).text(), 'Bot Minimarket: ok');
  assert.deepEqual(await (await worker.fetch(new Request('https://bot.example/salud'), env, crearCtx())).json(), { ok: true });
});

test('ruta desconocida: 404', async () => {
  const r = await worker.fetch(new Request('https://bot.example/otra'), crearEntorno(), crearCtx());
  assert.equal(r.status, 404);
});

test('verificación del webhook: token correcto devuelve el challenge', async () => {
  const r = await worker.fetch(
    new Request('https://bot.example/webhook?hub.mode=subscribe&hub.verify_token=verifica&hub.challenge=1158201444'),
    crearEntorno(), crearCtx(),
  );
  assert.equal(r.status, 200);
  assert.equal(await r.text(), '1158201444');
});

test('verificación del webhook: token incorrecto es 403', async () => {
  const r = await worker.fetch(
    new Request('https://bot.example/webhook?hub.mode=subscribe&hub.verify_token=malo&hub.challenge=1'),
    crearEntorno(), crearCtx(),
  );
  assert.equal(r.status, 403);
});

test('POST con firma inválida: 401 y no se procesa nada', async () => {
  const env = crearEntorno();
  const ctx = crearCtx();
  const r = await worker.fetch(await postFirmado(cuerpoTexto, 'secreto-equivocado'), env, ctx);
  assert.equal(r.status, 401);
  await ctx.terminar();
  assert.equal(env.datos.size, 0);
});

test('POST sin cabecera de firma: 401', async () => {
  const r = await worker.fetch(new Request('https://bot.example/webhook', { method: 'POST', body: cuerpoTexto }), crearEntorno(), crearCtx());
  assert.equal(r.status, 401);
});

test('POST válido: responde 200, guarda sesión, marca leído y responde al cliente', simularGraph(async (llamadas) => {
  const env = crearEntorno();
  const ctx = crearCtx();
  const r = await worker.fetch(await postFirmado(cuerpoTexto), env, ctx);
  assert.equal(r.status, 200);
  await ctx.terminar();

  const sesion = JSON.parse(env.datos.get('sesion:51999000111'));
  assert.equal(sesion.carrito[0].id, 'leche'); // "Quiero 2 leches"
  assert.equal(sesion.carrito[0].cantidad, 2);

  assert.equal(llamadas[0].cuerpo.status, 'read');
  assert.equal(llamadas[0].cuerpo.message_id, 'wamid.TEXTO001');
  assert.match(llamadas[0].url, /graph\.facebook\.com\/v\d+\.0\/123\/messages$/);
  assert.equal(llamadas[1].cuerpo.to, '51999000111');
  assert.equal(llamadas[1].cuerpo.type, 'interactive');
}));

test('idempotencia: el mismo mensaje reenviado se ignora', simularGraph(async (llamadas) => {
  const env = crearEntorno();
  for (let i = 0; i < 2; i++) {
    const ctx = crearCtx();
    await worker.fetch(await postFirmado(cuerpoTexto), env, ctx);
    await ctx.terminar();
  }
  const sesion = JSON.parse(env.datos.get('sesion:51999000111'));
  assert.equal(sesion.carrito[0].cantidad, 2, 'no debe sumar 4');
  assert.equal(llamadas.filter((l) => l.cuerpo.status === 'read').length, 1);
}));

test('si el envío falla, se deshace y el reintento de Meta se procesa', async () => {
  const env = crearEntorno();
  const original = globalThis.fetch;
  const llamadas = [];
  let fallar = true;
  globalThis.fetch = async (url, op) => {
    const cuerpo = JSON.parse(op.body);
    llamadas.push(cuerpo);
    if (fallar && cuerpo.type) return { ok: false, status: 500, json: async () => ({ error: { message: 'caído' } }) };
    return { ok: true, status: 200, json: async () => ({}) };
  };
  try {
    let ctx = crearCtx();
    await worker.fetch(await postFirmado(cuerpoTexto), env, ctx);
    await ctx.terminar();
    assert.equal(env.datos.has('visto:wamid.TEXTO001'), false, 'la marca visto se debe borrar');
    fallar = false;
    ctx = crearCtx();
    await worker.fetch(await postFirmado(cuerpoTexto), env, ctx);
    await ctx.terminar();
    assert.equal(llamadas.filter((c) => c.type).length >= 2, true, 'el reintento sí responde');
    assert.equal(JSON.parse(env.datos.get('sesion:51999000111')).carrito[0].cantidad, 2, 'sin duplicar el carrito');
  } finally { globalThis.fetch = original; }
});

test('al confirmar, el pedido se guarda en KV', simularGraph(async () => {
  const env = crearEntorno();
  const turnos = ['2 leches', 'listo', 'recojo', 'efectivo', 'confirmar'];
  for (const [i, texto] of turnos.entries()) {
    const payload = JSON.parse(cuerpoTexto);
    const msg = payload.entry[0].changes[0].value.messages[0];
    msg.id = `wamid.T${i}`;
    msg.text.body = texto;
    const cuerpo = JSON.stringify(payload);
    const ctx = crearCtx();
    await worker.fetch(await postFirmado(cuerpo), env, ctx);
    await ctx.terminar();
  }
  const claves = [...env.datos.keys()].filter((k) => k.startsWith('pedido:'));
  assert.equal(claves.length, 1);
  assert.equal(JSON.parse(env.datos.get(claves[0])).total, 8.6);
}));

test('recordatorios: texto si la ventana está abierta, plantilla si está cerrada', simularGraph(async (llamadas) => {
  const env = crearEntorno();
  const ahora = Date.UTC(2026, 9, 7, 18, 0, 0);
  const HORA = 3600 * 1000;
  // Cliente A escribió hace 3 h (ventana abierta) y tiene un pedido de hace 2 h.
  env.datos.set('sesion:51999000111', JSON.stringify({ telefono: '51999000111', estado: 'FIN', carrito: [], ultimoMensajeCliente: ahora - 3 * HORA }));
  env.datos.set('pedido:LE-A', JSON.stringify({ id: 'LE-A', telefono: '51999000111', estado: 'recibido', creadoEn: ahora - 2 * HORA }));
  // Cliente B: pedido de hace 2 h pero su último mensaje fue hace 30 h (ventana cerrada).
  env.datos.set('sesion:51999000333', JSON.stringify({ telefono: '51999000333', estado: 'FIN', carrito: [], ultimoMensajeCliente: ahora - 30 * HORA }));
  env.datos.set('pedido:LE-B', JSON.stringify({ id: 'LE-B', telefono: '51999000333', estado: 'recibido', creadoEn: ahora - 2 * HORA }));

  await ejecutarRecordatorios(env, ahora);

  const aA = llamadas.find((l) => l.cuerpo.to === '51999000111');
  const aB = llamadas.find((l) => l.cuerpo.to === '51999000333');
  assert.equal(aA.cuerpo.type, 'text');
  assert.equal(aB.cuerpo.type, 'template');
  assert.equal(aB.cuerpo.template.components[0].parameters[0].text, 'LE-B');

  // No se vuelve a recordar.
  llamadas.length = 0;
  await ejecutarRecordatorios(env, ahora + 1000);
  assert.equal(llamadas.length, 0);
}));

test('recordatorios: carrito abandonado se avisa una sola vez', simularGraph(async (llamadas) => {
  const env = crearEntorno();
  const ahora = Date.UTC(2026, 9, 7, 18, 0, 0);
  env.datos.set('sesion:51999000111', JSON.stringify({
    telefono: '51999000111', estado: 'CARRITO', carrito: [{ id: 'leche', cantidad: 1 }],
    ultimoMensajeCliente: ahora - 2 * 3600 * 1000, recordatorioEnviado: false,
  }));
  await ejecutarRecordatorios(env, ahora);
  await ejecutarRecordatorios(env, ahora + 1000);
  assert.equal(llamadas.length, 1);
  assert.match(llamadas[0].cuerpo.text.body, /carrito/);
}));

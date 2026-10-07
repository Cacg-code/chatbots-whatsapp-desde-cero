// Cloudflare Worker: la "capa de entrada/salida" del bot.
// Aquí SÍ hay red y almacenamiento; la lógica de la conversación vive en motor.js.
//
// Bindings/variables que necesita (ver wrangler.toml y .dev.vars.example):
//   BOT_KV (KV), VERIFY_TOKEN, WA_TOKEN, WA_PHONE_ID, APP_SECRET

import { crearSesion, procesar } from './motor.js';
import {
  parsearWebhook, construirEnvio, construirPlantilla, construirLeido, verificarFirma, enviarMensaje,
} from './whatsapp.js';
import { pedidosParaRecordar, carritosAbandonados, puedeEnviarTexto } from './recordatorios.js';

const SEGUNDOS_DIA = 24 * 60 * 60;
const TTL_SESION = 2 * SEGUNDOS_DIA; // la sesión vive 2 días sin actividad
const TTL_PEDIDO = 30 * SEGUNDOS_DIA;
const TTL_VISTO = SEGUNDOS_DIA; // ids de mensajes ya procesados

// ---------- Utilidades de KV ----------

async function leerJson(kv, clave) {
  const texto = await kv.get(clave);
  return texto ? JSON.parse(texto) : null;
}

const guardarJson = (kv, clave, valor, ttl) => kv.put(clave, JSON.stringify(valor), { expirationTtl: ttl });

// Lista todo lo que empieza con un prefijo. Basta para una demo (hasta 1000 claves);
// con más volumen conviene una base de datos (D1).
async function listarJson(kv, prefijo) {
  const { keys } = await kv.list({ prefix: prefijo });
  const valores = await Promise.all(keys.map((k) => leerJson(kv, k.name)));
  return valores.filter(Boolean);
}

// ---------- fetch: lo que Meta nos manda ----------

export async function manejarFetch(request, env, ctx) {
  const url = new URL(request.url);

  // Verificación del webhook: GET con hub.mode (en /webhook o en la raíz).
  if (request.method === 'GET' && url.searchParams.has('hub.mode')) return verificarWebhook(url, env);

  if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/salud')) {
    return new Response(url.pathname === '/' ? 'Bot Minimarket: ok' : JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': url.pathname === '/' ? 'text/plain' : 'application/json' },
    });
  }
  if (request.method === 'POST' && ['/', '/webhook'].includes(url.pathname)) return recibirWebhook(request, env, ctx);
  if (request.method === 'GET' && url.pathname === '/webhook') return verificarWebhook(url, env);
  return new Response('No encontrado', { status: 404 });
}

// Meta llama con GET cuando registras el webhook: hay que devolver hub.challenge si el token coincide.
function verificarWebhook(url, env) {
  const modo = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const reto = url.searchParams.get('hub.challenge');
  if (modo === 'subscribe' && env.VERIFY_TOKEN && token === env.VERIFY_TOKEN && reto) {
    return new Response(reto, { status: 200 });
  }
  return new Response('Prohibido', { status: 403 });
}

async function recibirWebhook(request, env, ctx) {
  // 1) Leemos el cuerpo como TEXTO crudo: la firma se calcula sobre esos bytes exactos.
  const cuerpoCrudo = await request.text();
  const firmaValida = await verificarFirma(env.APP_SECRET, cuerpoCrudo, request.headers.get('X-Hub-Signature-256'));
  if (!firmaValida) return new Response('Firma inválida', { status: 401 });

  let payload;
  try { payload = JSON.parse(cuerpoCrudo); } catch { return new Response('JSON inválido', { status: 400 }); }

  // 2) Respondemos 200 YA y trabajamos en segundo plano. Si tardamos, Meta reintenta.
  const eventos = parsearWebhook(payload);
  ctx.waitUntil(procesarEventos(env, eventos).catch((e) => console.error('Error procesando webhook:', e.message)));
  return new Response('ok', { status: 200 });
}

async function procesarEventos(env, eventos) {
  for (const evento of eventos) {
    if (evento.tipo === 'mensaje') await procesarMensaje(env, evento);
    // Los eventos 'estado' (sent/delivered/read/failed) solo los registramos.
    else if (evento.tipo === 'estado' && evento.estado === 'failed') console.error('Mensaje fallido', evento.id, evento.errores);
  }
}

export async function procesarMensaje(env, evento, ahora = Date.now(), llamar = fetch) {
  const kv = env.BOT_KV;

  // Idempotencia: Meta puede entregar el mismo mensaje más de una vez.
  // (KV no es atómico: para tráfico alto usa Durable Objects.)
  const claveVisto = `visto:${evento.id}`;
  if (await kv.get(claveVisto)) return;
  await kv.put(claveVisto, '1', { expirationTtl: TTL_VISTO });

  const claveSesion = `sesion:${evento.de}`;
  const sesionPrevia = (await leerJson(kv, claveSesion)) ?? crearSesion(evento.de, ahora);
  const { sesion, respuestas } = procesar(sesionPrevia, evento.entrada, ahora);

  await guardarJson(kv, claveSesion, sesion, TTL_SESION);
  if (sesion.pedidoNuevo) await guardarJson(kv, `pedido:${sesion.pedidoNuevo.id}`, sesion.pedidoNuevo, TTL_PEDIDO);

  // Marcamos como leído y enviamos las respuestas en orden.
  await enviarMensaje(env, construirLeido(evento.id), llamar).catch((e) => console.error(e.message));
  try {
    for (const respuesta of respuestas) {
      await enviarMensaje(env, construirEnvio(evento.de, respuesta), llamar);
    }
  } catch (error) {
    // Si el envío falla, deshacemos: así el reintento de Meta se procesa de nuevo
    // y el cliente no se queda sin respuesta ni con el estado avanzado a medias.
    await guardarJson(kv, claveSesion, sesionPrevia, TTL_SESION);
    await kv.delete(claveVisto);
    throw error;
  }
}

// ---------- scheduled: recordatorios (cron cada 15 min) ----------

export async function ejecutarRecordatorios(env, ahora = Date.now(), llamar = fetch) {
  const kv = env.BOT_KV;
  const sesiones = await listarJson(kv, 'sesion:');
  const sesionDe = (tel) => sesiones.find((s) => s.telefono === tel);

  // Pedidos recibidos que siguen sin atenderse.
  const pedidos = await listarJson(kv, 'pedido:');
  for (const pedido of pedidosParaRecordar(pedidos, ahora)) {
    const ventanaAbierta = puedeEnviarTexto(sesionDe(pedido.telefono)?.ultimoMensajeCliente, ahora);
    const cuerpo = ventanaAbierta
      ? construirEnvio(pedido.telefono, { tipo: 'texto', texto: `Tu pedido ${pedido.id} sigue en preparación. Si necesitas algo, escríbenos por aquí.` })
      : construirPlantilla(pedido.telefono, 'recordatorio_pedido', 'es', [pedido.id]); // plantilla aprobada previamente
    await enviarMensaje(env, cuerpo, llamar);
    await guardarJson(kv, `pedido:${pedido.id}`, { ...pedido, recordadoEn: ahora }, TTL_PEDIDO);
  }

  // Carritos abandonados.
  for (const sesion of carritosAbandonados(sesiones, ahora)) {
    const ventanaAbierta = puedeEnviarTexto(sesion.ultimoMensajeCliente, ahora);
    const cuerpo = ventanaAbierta
      ? construirEnvio(sesion.telefono, { tipo: 'texto', texto: 'Dejaste productos en tu carrito. Escribe "carrito" para retomar tu pedido.' })
      : construirPlantilla(sesion.telefono, 'carrito_pendiente', 'es', []);
    await enviarMensaje(env, cuerpo, llamar);
    await guardarJson(kv, `sesion:${sesion.telefono}`, { ...sesion, recordatorioEnviado: true }, TTL_SESION);
  }
}

export default {
  fetch: manejarFetch,
  scheduled(_evento, env, ctx) {
    ctx.waitUntil(ejecutarRecordatorios(env).catch((e) => console.error('Error en recordatorios:', e.message)));
  },
};

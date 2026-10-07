// Traductor entre el motor y la WhatsApp Cloud API de Meta.
// No tiene lógica de negocio: solo convierte formatos y firma/verifica.
//
// Documentación usada (verificada el 2026-10-07):
//  - Webhooks (payloads): developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
//  - Mensajes entrantes: .../webhooks/reference/messages/{interactive,image,unsupported} y .../status
//  - Enviar listas: developers.facebook.com/docs/whatsapp/cloud-api/messages/interactive-list-messages
//  - Enviar botones: developers.facebook.com/docs/whatsapp/cloud-api/messages/interactive-reply-buttons-messages
//  - Marcar como leído: developers.facebook.com/docs/whatsapp/cloud-api/guides/mark-message-as-read
//  - Firma y verificación del webhook: developers.facebook.com/docs/graph-api/webhooks/getting-started

// Versión de Graph API: la más reciente según https://developers.facebook.com/docs/graph-api/changelog/
// es v26.0 (lanzada el 29-jul-2026). Verificado el 2026-10-07.
// Las versiones duran ~2 años; revisa el changelog antes de desplegar.
export const GRAPH_VERSION = 'v26.0';

// Límites oficiales (ver enlaces de arriba).
const LIMITES = {
  texto: 4096,
  cuerpoBotones: 1024,
  cuerpoLista: 4096,
  tituloBoton: 20,
  textoBotonLista: 20,
  tituloSeccion: 24,
  tituloFila: 24,
  descripcionFila: 72,
  idFila: 200,
  idBoton: 256,
};

function exigir(condicion, mensaje) {
  if (!condicion) throw new Error(`Respuesta inválida para WhatsApp: ${mensaje}`);
}

// ---------- Entrada: webhook -> eventos ----------

/**
 * Convierte el JSON que manda Meta en una lista de eventos simples.
 * Ignora (sin romperse) todo lo que no entiende.
 *  - { tipo: 'mensaje', de, nombre, id, timestamp, phoneNumberId, entrada }
 *      entrada = { tipo: 'texto', texto } | { tipo: 'interactivo', id, titulo }
 *              | { tipo: 'no_soportado', subtipo }
 *  - { tipo: 'estado', id, estado, timestamp, destinatario, errores }
 */
export function parsearWebhook(payload) {
  const eventos = [];
  if (!payload || payload.object !== 'whatsapp_business_account' || !Array.isArray(payload.entry)) return eventos;

  for (const entrada of payload.entry) {
    for (const cambio of entrada?.changes ?? []) {
      if (cambio?.field !== 'messages') continue;
      const valor = cambio.value ?? {};
      const phoneNumberId = valor.metadata?.phone_number_id;

      for (const msg of valor.messages ?? []) {
        const evento = parsearMensaje(msg, valor.contacts ?? [], phoneNumberId);
        if (evento) eventos.push(evento);
      }
      for (const st of valor.statuses ?? []) {
        if (!st?.id) continue;
        eventos.push({
          tipo: 'estado',
          id: st.id,
          estado: st.status, // sent | delivered | read | failed (| played)
          timestamp: Number(st.timestamp) || null,
          destinatario: st.recipient_id,
          errores: st.errors ?? [],
        });
      }
    }
  }
  return eventos;
}

function parsearMensaje(msg, contactos, phoneNumberId) {
  if (!msg?.id || !msg.from) return null;
  const contacto = contactos.find((c) => c.wa_id === msg.from) ?? contactos[0];
  return {
    tipo: 'mensaje',
    de: msg.from,
    nombre: contacto?.profile?.name ?? null,
    id: msg.id,
    timestamp: Number(msg.timestamp) || null, // segundos Unix
    phoneNumberId,
    entrada: parsearEntrada(msg),
  };
}

function parsearEntrada(msg) {
  switch (msg.type) {
    case 'text':
      return { tipo: 'texto', texto: msg.text?.body ?? '' };
    case 'interactive': {
      const i = msg.interactive ?? {};
      if (i.type === 'button_reply') return { tipo: 'interactivo', id: i.button_reply?.id, titulo: i.button_reply?.title };
      if (i.type === 'list_reply') return { tipo: 'interactivo', id: i.list_reply?.id, titulo: i.list_reply?.title };
      return { tipo: 'no_soportado', subtipo: `interactive:${i.type}` };
    }
    case 'button':
      // Respuesta rápida a una PLANTILLA.
      // VERIFICAR: no pude abrir la página oficial de este tipo; revisa que el campo sea button.text.
      return { tipo: 'texto', texto: msg.button?.text ?? '' };
    default:
      // image, audio, video, document, sticker, location, reaction, unsupported...
      return { tipo: 'no_soportado', subtipo: msg.type === 'unsupported' ? `unsupported:${msg.unsupported?.type}` : msg.type };
  }
}

// ---------- Salida: respuestas del motor -> cuerpo JSON de POST /{PHONE_NUMBER_ID}/messages ----------

const base = (to) => ({ messaging_product: 'whatsapp', recipient_type: 'individual', to });

/** Convierte una respuesta del motor ({tipo:'texto'|'botones'|'lista'}) al cuerpo JSON de la API. */
export function construirEnvio(to, respuesta) {
  switch (respuesta.tipo) {
    case 'texto': return envioTexto(to, respuesta);
    case 'botones': return envioBotones(to, respuesta);
    case 'lista': return envioLista(to, respuesta);
    default: throw new Error(`Tipo de respuesta desconocido: ${respuesta.tipo}`);
  }
}

function envioTexto(to, { texto }) {
  exigir(texto && texto.length <= LIMITES.texto, 'texto vacío o de más de 4096 caracteres');
  return { ...base(to), type: 'text', text: { preview_url: false, body: texto } };
}

function envioBotones(to, { texto, botones }) {
  exigir(texto && texto.length <= LIMITES.cuerpoBotones, 'el cuerpo de botones va de 1 a 1024 caracteres');
  exigir(botones.length >= 1 && botones.length <= 3, 'entre 1 y 3 botones');
  const titulos = new Set();
  for (const b of botones) {
    exigir(b.id && b.id.length <= LIMITES.idBoton, 'id de botón vacío o muy largo');
    exigir(b.titulo && b.titulo.length <= LIMITES.tituloBoton, `título de botón de más de 20 caracteres: "${b.titulo}"`);
    exigir(!titulos.has(b.titulo), 'los títulos de botón deben ser únicos');
    titulos.add(b.titulo);
  }
  return {
    ...base(to),
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: texto },
      action: { buttons: botones.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.titulo } })) },
    },
  };
}

function envioLista(to, { texto, boton, secciones }) {
  exigir(texto && texto.length <= LIMITES.cuerpoLista, 'el cuerpo de la lista va de 1 a 4096 caracteres');
  exigir(boton && boton.length <= LIMITES.textoBotonLista, 'el botón de la lista va de 1 a 20 caracteres');
  exigir(secciones.length >= 1 && secciones.length <= 10, 'entre 1 y 10 secciones');
  const totalFilas = secciones.reduce((suma, s) => suma + s.filas.length, 0);
  exigir(totalFilas >= 1 && totalFilas <= 10, 'entre 1 y 10 filas en total');
  for (const s of secciones) {
    // El título de sección es obligatorio cuando hay más de una sección.
    exigir(s.titulo && s.titulo.length <= LIMITES.tituloSeccion, 'título de sección vacío o de más de 24 caracteres');
    for (const f of s.filas) {
      exigir(f.id && f.id.length <= LIMITES.idFila, 'id de fila vacío o muy largo');
      exigir(f.titulo && f.titulo.length <= LIMITES.tituloFila, `título de fila de más de 24 caracteres: "${f.titulo}"`);
      exigir(!f.descripcion || f.descripcion.length <= LIMITES.descripcionFila, 'descripción de más de 72 caracteres');
    }
  }
  return {
    ...base(to),
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: texto },
      action: {
        button: boton,
        sections: secciones.map((s) => ({
          title: s.titulo,
          rows: s.filas.map((f) => ({ id: f.id, title: f.titulo, ...(f.descripcion ? { description: f.descripcion } : {}) })),
        })),
      },
    },
  };
}

/**
 * Mensaje de PLANTILLA (único tipo permitido fuera de la ventana de 24 h).
 * `variables` = textos que reemplazan {{1}}, {{2}}... del cuerpo de la plantilla.
 * Estructura según https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview
 * VERIFICAR: las plantillas con variables NOMBRADAS usan además "parameter_name"; aquí usamos las posicionales.
 */
export function construirPlantilla(to, nombre, idioma = 'es', variables = []) {
  const template = { name: nombre, language: { code: idioma } };
  if (variables.length > 0) {
    template.components = [{ type: 'body', parameters: variables.map((v) => ({ type: 'text', text: String(v) })) }];
  }
  return { ...base(to), type: 'template', template };
}

/** Marca un mensaje entrante como leído (doble check azul). */
export function construirLeido(messageId) {
  return { messaging_product: 'whatsapp', status: 'read', message_id: messageId };
}

// ---------- Seguridad: firma del webhook ----------

const codificador = new TextEncoder();

function hexABytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

/**
 * Meta firma el cuerpo CRUDO con HMAC-SHA256 usando el "App Secret" y manda
 * la cabecera  X-Hub-Signature-256: sha256=<hex>.
 * Importante: se verifica con el texto exacto recibido, antes de hacer JSON.parse.
 * crypto.subtle.verify compara en tiempo constante.
 * VERIFICAR: la página de "getting started" solo dice "SHA256 + App Secret"; HMAC-SHA256 en hex es el
 * formato que usan todos los ejemplos oficiales de Meta (y lo confirman las pruebas con la firma de ejemplo).
 */
export async function verificarFirma(secretoApp, cuerpoCrudo, cabecera) {
  if (!secretoApp || typeof cabecera !== 'string') return false;
  const coincidencia = /^sha256=([0-9a-f]{64})$/i.exec(cabecera.trim());
  if (!coincidencia) return false;
  const clave = await crypto.subtle.importKey(
    'raw', codificador.encode(secretoApp), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
  );
  return crypto.subtle.verify('HMAC', clave, hexABytes(coincidencia[1].toLowerCase()), codificador.encode(cuerpoCrudo));
}

/** Calcula la firma (solo se usa en pruebas y para generar ejemplos). */
export async function firmar(secretoApp, cuerpoCrudo) {
  const clave = await crypto.subtle.importKey(
    'raw', codificador.encode(secretoApp), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const firma = new Uint8Array(await crypto.subtle.sign('HMAC', clave, codificador.encode(cuerpoCrudo)));
  return 'sha256=' + [...firma].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------- Red ----------

/**
 * Envía un cuerpo ya construido. `env` necesita WA_TOKEN y WA_PHONE_ID.
 * `llamar` permite inyectar un fetch falso en las pruebas.
 */
export async function enviarMensaje(env, cuerpo, llamar = fetch) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${env.WA_PHONE_ID}/messages`;
  const respuesta = await llamar(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    // Nunca incluimos el token en el error.
    throw new Error(`WhatsApp respondió ${respuesta.status}: ${datos?.error?.message ?? 'sin detalle'}`);
  }
  return datos;
}

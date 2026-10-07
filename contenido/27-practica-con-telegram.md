---
titulo: Practica con Telegram sin cuenta de Meta
resumen: Conecta el mismo motor de reglas a un bot de Telegram para practicar webhooks, botones y sesiones sin esperar aprobaciones de Meta ni gastar un sol.
minutos: 55
nivel: intermedio
objetivos:
- Explicar por qué Telegram sirve como campo de práctica del mismo motor de reglas que usarás en WhatsApp.
- Crear un bot con BotFather y registrar un webhook con `setWebhook` y un secreto.
- Traducir un `Update` de Telegram a la entrada del motor y las respuestas del motor a llamadas `sendMessage` con teclado en línea.
- Probar el adaptador en local con un `fetch` falso, sin red ni credenciales.
- Reconocer qué se parece y qué no entre Telegram y la Cloud API de WhatsApp.
fuentes:
- Telegram Bot API | https://core.telegram.org/bots/api
- Tutorial de bots de Telegram | https://core.telegram.org/bots/tutorial
---
## Por qué practicar con Telegram

Conectar un bot a WhatsApp exige una cuenta de Meta, un portafolio comercial, un número y, para cosas reales, aprobaciones y plantillas (lecciones [12](../12-cuenta-y-app-de-meta/) a [14](../14-enviar-mensajes/)). Es normal que esa parte te tome días. Mientras tanto no tienes forma de ver tu bot conversando con un teléfono de verdad.

**Telegram** es otra app de mensajería con una API de bots gratuita y mucho más simple de activar: hablas con un bot llamado BotFather, él te da un token y en minutos tu servidor recibe mensajes. Telegram **no es WhatsApp**, pero la forma del problema es la misma:

```flujo
Cliente|Telegram
-> mensaje
Servidores de Telegram|Bot API
-> webhook (HTTPS)
Tu servidor|adaptador + motor
-> sendMessage
Cliente|Telegram
```

Recuerda la idea central del curso: el motor (`procesar(sesion, entrada)`) **no sabe de ningún canal**. Recibe una entrada simple y devuelve respuestas simples. Lo que cambia entre WhatsApp y Telegram es solo la «carcasa» que traduce formatos. Si el motor funciona con Telegram, funcionará igual con WhatsApp en cuanto tengas tu cuenta; el adaptador de WhatsApp (`whatsapp.js`) y el de Telegram son hermanos.

> [!importante] Qué es y qué no es esta práctica
> Telegram sirve para **ensayar** flujo, estados y botones. No reemplaza a WhatsApp: no tiene ventana de 24 horas, plantillas aprobadas ni opt-in de Meta, así que **no practicas** esas reglas aquí. Y los clientes reales del minimarket están en WhatsApp. Úsalo como laboratorio y como demo rápida para mostrar el flujo a un cliente.

## Crear el bot con BotFather

**BotFather** es el bot oficial de Telegram para crear bots. Los pasos, según la [documentación de funciones para bots](https://core.telegram.org/bots/features):

1. En Telegram busca `@BotFather` y ábrelo.
2. Envía `/newbot`.
3. Te pide un **nombre** (el que ven los clientes) y un **usuario**, que debe terminar en `bot` (por ejemplo `la_esquina_demo_bot`) y no se puede cambiar después.
4. Te entrega un **token**, que parece `123456:ABC-DEF...`. Quien tenga ese token controla el bot.

> [!importante] El token es una contraseña
> Trátalo igual que el token de WhatsApp: se guarda como secreto (variable de entorno o `wrangler secret put`), nunca en el código ni en un repositorio. Si se filtra, BotFather permite generar uno nuevo. Lo repasarás en la [lección 24](../24-seguridad-y-privacidad/). En esta lección todos los tokens son falsos.

No hace falta una cuenta empresarial ni un número extra: basta tu cuenta personal de Telegram.

## Cómo habla la API de Telegram

Toda llamada es una petición HTTPS a:

```text
https://api.telegram.org/bot<TOKEN>/<METODO>
```

Los parámetros pueden ir como JSON. Cada respuesta es un JSON con un campo `ok`: si es `true`, los datos van en `result`; si es `false`, viene un `description` y un `error_code`. Son cuatro piezas las que necesitas.

**1. `setWebhook`.** Le dices a Telegram a qué URL HTTPS entregar los mensajes. Parámetros que importan (verificados en la [referencia oficial](https://core.telegram.org/bots/api#setwebhook)):

| Parámetro | Para qué sirve |
|---|---|
| `url` | La dirección HTTPS de tu servidor. |
| `secret_token` | Texto de 1 a 256 caracteres (solo `A-Z`, `a-z`, `0-9`, `_` y `-`). Telegram lo envía en la cabecera `X-Telegram-Bot-Api-Secret-Token` de cada petición. |
| `allowed_updates` | Qué tipos de evento quieres recibir. |

Los puertos admitidos son 443, 80, 88 y 8443. Y mientras haya un webhook, `getUpdates` (el método de consulta periódica) no funciona.

**2. El `Update`.** Es el JSON que Telegram te entrega. Trae un `update_id` creciente y **uno** de varios campos opcionales; usarás dos: `message` (alguien escribió) y `callback_query` (alguien tocó un botón en línea).

```json
{
  "update_id": 1,
  "message": {
    "message_id": 10,
    "date": 1790000000,
    "chat": { "id": 5551001, "type": "private" },
    "from": { "id": 5551001, "first_name": "Cliente" },
    "text": "quiero 2 leches"
  }
}
```

**3. `sendMessage`.** Envía texto a un `chat_id`. Acepta `text` (1 a 4096 caracteres) y un `reply_markup` opcional con un **teclado en línea**: `inline_keyboard`, un arreglo de filas, cada fila un arreglo de botones `{ text, callback_data }`. El `callback_data` mide de 1 a 64 bytes.

**4. `answerCallbackQuery`.** Cuando alguien toca un botón, llega un `callback_query` con un `id` y el `data` del botón. Telegram indica responder esos eventos con `answerCallbackQuery` (parámetro `callback_query_id`) para que el botón deje de mostrar el indicador de espera.

> [!importante] Verifica este dato
> La API de Telegram evoluciona con frecuencia (campos nuevos, cambios de límites). Antes de llevar esto a producción, contrasta con la [referencia oficial de la Bot API](https://core.telegram.org/bots/api). Los datos de esta lección se revisaron contra ella el 2026-10-07.

## Mapa: del motor a Telegram

El motor tiene su propio lenguaje (lección [8](../08-flujo-de-pedido/) y `API.md`). El adaptador solo traduce:

| Motor | WhatsApp (Cloud API) | Telegram |
|---|---|---|
| Entrada `{tipo:'texto'}` | `messages[].text.body` | `message.text` |
| Entrada `{tipo:'interactivo', id}` | `interactive.button_reply.id` o `list_reply.id` | `callback_query.data` |
| Respuesta `texto` | `type: "text"` | `sendMessage` con `text` |
| Respuesta `botones` (máx. 3) | `interactive` tipo `button` | `inline_keyboard` con una fila |
| Respuesta `lista` | `interactive` tipo `list` | `inline_keyboard` con un botón por fila |
| Identificador del cliente | número de teléfono | `chat.id` |
| Autenticación del webhook | firma `X-Hub-Signature-256` | cabecera con tu `secret_token` |
| Orden y duplicados | `id` del mensaje (`wamid`) | `update_id` |

Tres detalles de diseño:

- **El identificador de sesión.** El motor guarda una sesión por «teléfono». En Telegram no hay teléfono: usaremos `tg:<chat_id>` como clave, que evita choques con números reales.
- **La lista.** Telegram no tiene listas desplegables como WhatsApp; las convertimos en un teclado con un botón por fila (`título - descripción`). El motor no se entera.
- **El comando `/start`.** Es lo primero que se envía al abrir un bot. Lo traducimos a `hola` para que el motor muestre su bienvenida.

Como los `id` del motor (`menu_pedir`, `prod:leche`, `cant:2`...) caben de sobra en 64 bytes, viajan tal cual como `callback_data`.

## El adaptador completo

Crea `src/telegram.js` junto al resto de los módulos. Son unas 70 líneas y solo usa `fetch`, que ya existe en Node 22 y en los Workers:

```js src/telegram.js
// Adaptador entre Telegram y el motor de reglas.
import { crearSesion, procesar } from './motor.js';

const MAX_TEXTO = 4096; // límite de sendMessage

// Compara el secreto en tiempo constante (evita filtrar información por tiempos).
export function secretoValido(esperado, cabecera) {
  if (!esperado || typeof cabecera !== 'string') return false;
  if (cabecera.length !== esperado.length) return false;
  let diff = 0;
  for (let i = 0; i < esperado.length; i++) diff |= esperado.charCodeAt(i) ^ cabecera.charCodeAt(i);
  return diff === 0;
}

// Update de Telegram -> { updateId, chatId, callbackId, entrada } (o null si no nos sirve)
export function parsearUpdate(update) {
  if (!update || typeof update.update_id !== 'number') return null;
  const cb = update.callback_query;
  if (cb && typeof cb.data === 'string' && cb.message?.chat?.id != null) {
    return { updateId: update.update_id, chatId: cb.message.chat.id, callbackId: cb.id,
      entrada: { tipo: 'interactivo', id: cb.data } };
  }
  const msg = update.message;
  if (!msg || msg.chat?.id == null) return null;
  if (typeof msg.text === 'string') {
    const t = msg.text.trim();
    const texto = /^\/start(@\w+)?(\s|$)/.test(t) ? 'hola' : t;
    return { updateId: update.update_id, chatId: msg.chat.id, callbackId: null,
      entrada: { tipo: 'texto', texto } };
  }
  return { updateId: update.update_id, chatId: msg.chat.id, callbackId: null,
    entrada: { tipo: 'no_soportado', subtipo: 'otro' } };
}

// Respuesta del motor -> cuerpo de sendMessage
export function construirEnvio(chatId, r) {
  const base = { chat_id: chatId };
  if (r.tipo === 'texto') return { ...base, text: r.texto.slice(0, MAX_TEXTO) };
  if (r.tipo === 'botones') {
    return { ...base, text: r.texto.slice(0, MAX_TEXTO),
      reply_markup: { inline_keyboard: [r.botones.map((b) => ({ text: b.titulo, callback_data: b.id }))] } };
  }
  if (r.tipo === 'lista') {
    const filas = r.secciones.flatMap((s) => s.filas.map((f) => [{
      text: f.descripcion ? `${f.titulo} - ${f.descripcion}` : f.titulo, callback_data: f.id }]));
    return { ...base, text: r.texto.slice(0, MAX_TEXTO), reply_markup: { inline_keyboard: filas } };
  }
  throw new Error(`Respuesta desconocida: ${r.tipo}`);
}

export async function llamarTelegram(token, metodo, cuerpo, llamar = fetch) {
  const res = await llamar(`https://api.telegram.org/bot${token}/${metodo}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });
  const datos = await res.json();
  if (!datos.ok) throw new Error(`Telegram ${metodo}: ${datos.error_code} ${datos.description}`);
  return datos.result;
}

// Todo el recorrido de un webhook. `sesiones` y `vistos` son un Map y un Set en memoria
// (para practicar); en producción serían KV, como en la lección 15.
export async function manejarWebhook({ cuerpo, cabecera, env, sesiones, vistos, llamar = fetch, ahora = Date.now() }) {
  if (!secretoValido(env.SECRETO, cabecera)) return { estado: 401 };
  const ev = parsearUpdate(cuerpo);
  if (!ev) return { estado: 200 };                      // algo que no usamos: 200 y seguimos
  if (vistos.has(ev.updateId)) return { estado: 200 };  // Telegram reintenta: ignora repetidos
  vistos.add(ev.updateId);
  const clave = `tg:${ev.chatId}`;
  const previa = sesiones.get(clave) ?? crearSesion(clave, ahora);
  const { sesion, respuestas } = procesar(previa, ev.entrada, ahora);
  sesiones.set(clave, sesion);
  if (ev.callbackId) await llamarTelegram(env.TOKEN, 'answerCallbackQuery', { callback_query_id: ev.callbackId }, llamar);
  for (const r of respuestas) await llamarTelegram(env.TOKEN, 'sendMessage', construirEnvio(ev.chatId, r), llamar);
  return { estado: 200 };
}
```

Fíjate en las decisiones de seguridad, idénticas en espíritu a las de WhatsApp: se **verifica quién llama** antes de hacer nada (aquí con el secreto, allá con la firma HMAC), se **ignoran duplicados** (Telegram reintenta si tu servidor no responde con un código 2xx, y no conserva los eventos más de 24 horas) y se responde 200 incluso a eventos que no entiendes, para que no se queden reintentando.

## Probarlo sin red: un `fetch` falso

El adaptador recibe `llamar` como parámetro, así que en las pruebas le pasas una función que **registra** lo que se enviaría en lugar de salir a internet. Crea `probar-telegram.mjs` en la carpeta del proyecto:

```js probar-telegram.mjs
import { manejarWebhook } from './src/telegram.js';

const enviados = [];
const fetchFalso = async (url, opciones) => {
  enviados.push({ metodo: url.split('/').pop(), cuerpo: JSON.parse(opciones.body) });
  return { json: async () => ({ ok: true, result: {} }) };
};
const env = { SECRETO: 'secreto_de_prueba', TOKEN: '111111:TOKEN_FALSO' };
const sesiones = new Map();
const vistos = new Set();
const enviar = (cuerpo, cabecera = env.SECRETO) =>
  manejarWebhook({ cuerpo, cabecera, env, sesiones, vistos, llamar: fetchFalso });

const chat = { id: 5551001, type: 'private' };
await enviar({ update_id: 1, message: { message_id: 1, date: 0, chat, text: '/start' } });
console.log('1. /start ->', enviados.map((e) => e.metodo).join(', '));

const boton = enviados[1].cuerpo.reply_markup.inline_keyboard[0][0];
enviados.length = 0;
await enviar({ update_id: 2, callback_query: { id: 'cq1', from: { id: 5551001 }, data: boton.callback_data, message: { message_id: 2, chat } } });
console.log('2. toque en "' + boton.text + '" ->', enviados.map((e) => e.metodo).join(', '));

enviados.length = 0;
await enviar({ update_id: 3, message: { message_id: 3, date: 0, chat, text: 'quiero 2 leches' } });
console.log('3. texto libre ->', enviados[0].cuerpo.text.split('\n')[0]);

enviados.length = 0;
const r = await enviar({ update_id: 3, message: { message_id: 3, date: 0, chat, text: 'quiero 2 leches' } });
console.log('4. update repetido -> estado', r.estado, 'envios', enviados.length);

const m = await enviar({ update_id: 4, message: { message_id: 4, date: 0, chat, text: 'hola' } }, 'otro');
console.log('5. secreto incorrecto -> estado', m.estado, 'envios', enviados.length);
```

Al ejecutarlo con `node probar-telegram.mjs` la salida real fue:

```salida
1. /start -> sendMessage, sendMessage
2. toque en "Hacer pedido" -> answerCallbackQuery, sendMessage
3. texto libre -> Agregué 2 x Leche entera 1 L.
4. update repetido -> estado 200 envios 0
5. secreto incorrecto -> estado 401 envios 0
```

Cada línea prueba una promesa del adaptador: el `/start` produce bienvenida y menú; el toque de un botón se responde con `answerCallbackQuery` más la siguiente pantalla; un texto libre entra al motor; un `update_id` repetido no reenvía nada y un secreto incorrecto se rechaza con 401.

## Conectarlo de verdad

Para ver el bot en tu teléfono necesitas una URL pública HTTPS. Tienes dos caminos:

- **Publicar el Worker** de la [lección 11](../11-despliegue-en-cloudflare/) con una ruta `POST /telegram` que llame a `manejarWebhook` (con `env.TOKEN` y `env.SECRETO` como secretos y KV en lugar del `Map`).
- **Un túnel temporal** hacia tu PC (por ejemplo Cloudflare Tunnel o ngrok) mientras desarrollas.

Luego registras el webhook una sola vez desde la terminal (con tu token y tu URL reales; aquí van de ejemplo):

```bash
curl -s "https://api.telegram.org/bot<TU_TOKEN>/setWebhook" \
  -H "content-type: application/json" \
  -d '{"url":"https://bot-minimarket.ejemplo.workers.dev/telegram","secret_token":"un_secreto_largo_123","allowed_updates":["message","callback_query"]}'
```

Si todo va bien responde `{"ok":true,"result":true,...}`. Con `getWebhookInfo` puedes ver la URL registrada y el último error de entrega, que es lo primero que debes mirar si el bot calla.

> [!nota] Esto no se ejecutó contra la red
> El adaptador está probado con un `fetch` falso, no contra los servidores de Telegram: no hay token real en este curso. Es la misma política que seguimos con Meta. Cuando lo conectes, el primer mensaje real es tu prueba de integración.

## Qué sí y qué no se traslada a WhatsApp

| Se traslada tal cual | Cambia o no existe en Telegram |
|---|---|
| El motor, los estados, el carrito y los textos | Ventana de 24 horas y plantillas aprobadas |
| La separación adaptador / motor | Opt-in y calidad del número |
| Verificar al remitente y evitar duplicados | La firma HMAC (aquí es un secreto en cabecera) |
| Botones y respuestas por id | Los límites de WhatsApp (3 botones, listas nativas) |
| Pruebas con `fetch` falso | Costos por mensaje de plantilla |

Una buena rutina: desarrolla y demuestra el flujo en Telegram y, cuando el cliente acepte, cambia solo la carcasa. Si más adelante comparas proveedores de WhatsApp, la [lección 28](../28-otros-proveedores/) te muestra qué cambia también allí.

## Errores frecuentes

- **Dejar el token en el código o en un repositorio.** Quien lo tenga controla el bot. Genera uno nuevo en BotFather si se filtra.
- **No poner `secret_token`.** Cualquiera que conozca tu URL podría enviarle «mensajes» falsos a tu motor.
- **Intentar usar `getUpdates` con un webhook activo.** No funciona mientras haya un webhook registrado.
- **Olvidar `answerCallbackQuery`.** El botón queda con el indicador de espera y parece que el bot se colgó.
- **Usar una URL sin HTTPS.** El webhook exige HTTPS en uno de los puertos admitidos (443, 80, 88 u 8443).
- **Creer que si funciona en Telegram ya cumple las reglas de WhatsApp.** Telegram acepta mensajes que Meta rechazaría; verifica los límites de WhatsApp aparte.

## Apuntes para llevar

- Telegram permite ensayar **el mismo motor** sin cuenta de Meta: solo cambia la carcasa que traduce formatos.
- BotFather crea el bot y entrega un **token** que se trata como contraseña.
- `setWebhook` registra la URL; `secret_token` llega en la cabecera `X-Telegram-Bot-Api-Secret-Token` y debes verificarla.
- Un `Update` trae `message` (texto) o `callback_query` (botón); las respuestas salen por `sendMessage` con `inline_keyboard`.
- Responde 200 siempre que puedas y descarta los `update_id` repetidos.
- Con un `fetch` falso pruebas todo el flujo sin red ni credenciales.
- Telegram no practica ventana de 24 horas, plantillas ni opt-in.

## Glosario

| Término | Significado |
|---|---|
| BotFather | Bot oficial de Telegram para crear bots y obtener su token. |
| Bot API | API HTTPS de Telegram para controlar bots. |
| `Update` | Evento que Telegram entrega a tu webhook (mensaje, botón, etc.). |
| `callback_query` | Evento que se genera al tocar un botón de teclado en línea. |
| `callback_data` | Texto de 1 a 64 bytes que lleva el botón y vuelve a tu bot al tocarlo. |
| Teclado en línea | Botones bajo un mensaje del bot (`inline_keyboard`). |
| `secret_token` | Secreto que defines en `setWebhook` y Telegram repite en cada petición. |
| Adaptador | Módulo que traduce entre el formato de un canal y el del motor. |

```quiz
? ¿Qué parte del proyecto cambia al pasar de Telegram a WhatsApp?
- El motor de reglas completo
- Los estados del carrito
+ Solo el adaptador que traduce formatos de entrada y salida
- La lógica de los precios
= El motor no conoce el canal; el adaptador es la única pieza que habla el idioma de cada plataforma.

? ¿Para qué sirve el `secret_token` de `setWebhook`?
- Para cifrar los mensajes
+ Para que tu servidor compruebe, en la cabecera `X-Telegram-Bot-Api-Secret-Token`, que la petición viene de Telegram
- Para dar permiso a otros bots
- Para cambiar el nombre del bot
= Telegram lo repite en cada petición; si no coincide, rechazas con 401.

? Un cliente toca un botón en línea. ¿Qué llega a tu webhook?
- Un `message` con el texto del botón
+ Un `callback_query` con un `id` y el `data` del botón
- Nada, los botones no avisan al bot
- Un archivo de imagen
= Los botones en línea generan `callback_query`; conviene responder con `answerCallbackQuery`.

? ¿Qué regla de WhatsApp NO puedes practicar con Telegram?
- Enviar botones
+ La ventana de 24 horas y las plantillas aprobadas
- Guardar sesiones por cliente
- Verificar el origen del webhook
= Telegram no tiene ventana ni plantillas de Meta; esas reglas se practican solo con WhatsApp.

? ¿Por qué el adaptador descarta los `update_id` ya vistos?
- Porque ocupan mucha memoria
+ Porque Telegram reintenta entregas y no quieres responder dos veces el mismo mensaje
- Porque el `update_id` es secreto
- Porque Telegram lo exige para el token
= Si tu servidor tarda o falla, Telegram reintenta; ignorar repetidos evita duplicar respuestas.
```

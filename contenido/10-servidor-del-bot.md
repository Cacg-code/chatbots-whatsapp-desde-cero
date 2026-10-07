---
titulo: El servidor del bot
resumen: Cómo un Cloudflare Worker une webhook, motor y KV: rutas, firma, idempotencia, respuesta rápida con ctx.waitUntil y pruebas locales con wrangler dev.
minutos: 65
nivel: intermedio
objetivos:
- Explicar qué es un Cloudflare Worker y por qué sirve para un bot sin administrar servidores.
- Leer `worker.js` y describir qué hace cada ruta (`/`, `/salud`, `GET /webhook`, `POST /webhook`).
- Justificar la idempotencia con claves `visto:<wamid>` y el uso de `ctx.waitUntil` para responder 200 de inmediato.
- Levantar el Worker en tu computadora con `wrangler dev` y probarlo con `curl` y una firma real.
- Probar la lógica del servidor sin red usando un KV falso y un `fetch` falso.
---
## Una carcasa alrededor del motor

En la [lección anterior](../09-webhooks-y-json-de-whatsapp/) aprendiste a leer el JSON de Meta y a validar su firma. Ahora falta la pieza que lo reúne todo y vive en internet: **el servidor del bot**.

La arquitectura del proyecto de referencia se resume en una idea que conviene tatuarse: **`motor.js` no hace entrada/salida; `worker.js` sí**. El motor recibe una sesión y un mensaje y devuelve una sesión nueva y respuestas; no sabe nada de HTTP, de WhatsApp ni de bases de datos. El Worker es una *carcasa* que:

1. recibe la petición HTTP,
2. verifica que venga de Meta,
3. carga la sesión del cliente,
4. se la pasa al motor,
5. guarda la sesión nueva,
6. envía las respuestas.

```flujo
Meta|POST /webhook
-> firma + JSON
worker.js|carcasa (red + KV)
-> sesión + entrada
motor.js|procesar()
-> sesión nueva + respuestas
worker.js|guarda y envía
```

La consola de la [lección 4](../04-primer-bot-en-consola/) (`consola.js`) es *otra* carcasa del mismo motor. Esa separación es la que te permite probar toda la conversación sin internet y cambiar de plataforma (otro hosting, otro canal) reescribiendo solo la carcasa.

## Qué es un Cloudflare Worker

Un **Worker** es un programa de JavaScript que corre en la red de Cloudflare, cerca del usuario, sin que tengas que alquilar ni mantener un servidor. No hay máquina que encender: Cloudflare lo ejecuta cuando llega una petición y lo apaga después.

Para un bot de negocio pequeño eso encaja muy bien:

- **Siempre encendido para ti**: el webhook de Meta necesita una dirección pública con HTTPS, y el Worker la trae lista.
- **Sin servidor que mantener**: ni parches, ni reinicios.
- **Plan gratuito generoso** para empezar (consulta los límites actuales, abajo).
- **API estándar de la web**: `Request`, `Response`, `fetch`, `crypto.subtle`. Lo que aprendes sirve fuera de Cloudflare.

Un Worker exporta un objeto con «manejadores». El del bot tiene dos:

```js src/worker.js
export default {
  fetch: manejarFetch,
  scheduled(_evento, env, ctx) {
    ctx.waitUntil(ejecutarRecordatorios(env).catch((e) => console.error('Error en recordatorios:', e.message)));
  },
};
```

- `fetch(request, env, ctx)`: se ejecuta con cada petición HTTP (Meta llamando a tu webhook).
- `scheduled(...)`: se ejecuta por **cron** (una hora programada). La usaremos en la [lección 18](../18-recordatorios-y-seguimiento/) para los recordatorios.

Los tres parámetros de `fetch` son: `request` (la petición), `env` (las **variables y recursos** que configuraste: secretos y la base KV) y `ctx` (utilidades de contexto, como `waitUntil`). En un Worker no hay variables globales de configuración ni `process.env`: todo llega por `env`.

> [!importante] Verifica este dato
> Los límites del plan gratuito (peticiones por día, tiempo de CPU, operaciones de KV) cambian. Consúltalos en la documentación oficial: [Workers: Limits](https://developers.cloudflare.com/workers/platform/limits/) y [precios de Workers](https://developers.cloudflare.com/workers/platform/pricing/). Para un bot de un negocio pequeño suelen sobrar, pero compruébalo antes de prometer nada a un cliente.

## Las rutas del servidor

`manejarFetch` es un enrutador de pocas líneas: mira el método HTTP y la ruta, y decide.

```js src/worker.js
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
```

| Método y ruta | Para qué sirve | Respuesta |
|---|---|---|
| `GET /` | Comprobar a ojo que el bot está vivo | `Bot Minimarket: ok` |
| `GET /salud` | Chequeo automático de salud (monitores) | `{"ok":true}` |
| `GET /webhook?hub.mode=...` | Verificación del webhook por Meta | `hub.challenge` (200) o `Prohibido` (403) |
| `POST /webhook` (o `POST /`) | Eventos reales: mensajes y estados | `ok` (200), `401` o `400` |
| Cualquier otra | — | `No encontrado` (404) |

El `POST` también se acepta en `/` porque a veces se registra el webhook con la dirección raíz del Worker; así no importa cuál pongas en el panel de Meta, mientras la verificación GET y el POST usen la misma.

> [!nota] Una ruta de salud no es un lujo
> `/salud` no toca la base ni a Meta: solo responde. Sirve para que tú o un monitor automático pregunten «¿el Worker está desplegado y contesta?» sin gastar mensajes ni cuota.

## recibirWebhook: seguridad primero, rapidez después

El `POST` es la ruta importante. Léela con calma, porque cada línea tiene una razón:

```js src/worker.js
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
```

**Orden de las decisiones:**

1. **Texto crudo** (`request.text()`), no `request.json()`: la firma se calcula sobre los bytes originales, como viste en la lección 9.
2. **Firma antes que JSON.** Si no es de Meta, ni siquiera intentamos interpretarlo: `401`. Así un atacante no puede gastar tu CPU con cuerpos enormes que obligue a parsear (y tampoco sabe si su JSON era «válido»).
3. **JSON roto → 400.** Una firma válida con JSON inválido casi nunca pasa en la práctica, pero el código no confía en eso.
4. **200 inmediato.** Aquí aparece `ctx.waitUntil`.

### ctx.waitUntil: responder ya, trabajar después

Procesar un mensaje implica leer KV, ejecutar el motor, guardar y **enviar respuestas a Meta por red**. Eso puede tardar uno o varios segundos. Si Meta no recibe tu `200` a tiempo, asume que falló y **reintenta** la entrega (y tu cliente verá respuestas duplicadas, o ninguna).

La solución es separar «acuso recibo» de «hago el trabajo». `ctx.waitUntil(promesa)` le dice a Cloudflare: «ya puedes devolver la respuesta HTTP, pero mantén vivo el Worker hasta que esta promesa termine». El `.catch` evita que un error en el procesamiento quede sin registrar.

```flujo
POST de Meta|llega el mensaje
-> firma OK
Worker|devuelve 200 enseguida
-> en segundo plano (waitUntil)
Trabajo|KV, motor, envío
```

> [!importante] Verifica este dato
> `ctx.waitUntil` tiene un tiempo máximo después de que se envía la respuesta, y los límites de CPU y de «subpeticiones» dependen del plan. Revisa [la documentación de `waitUntil`](https://developers.cloudflare.com/workers/runtime-apis/context/) y los límites antes de procesar cosas pesadas (por ejemplo, llamadas largas a una IA).

## Idempotencia: el mismo mensaje no se procesa dos veces

Meta garantiza «al menos una vez», no «exactamente una». Si tu servidor tarda, hay un corte o Meta duda, **puede entregar el mismo mensaje otra vez**. Si el cliente escribió «quiero 2 leches» y tu bot lo procesa dos veces, agregará 4 leches al carrito.

Una operación **idempotente** es la que da el mismo resultado aunque se ejecute varias veces. El truco: cada mensaje trae un `id` único (`wamid.…`). Lo anotamos en KV al procesarlo, y si ya está anotado, lo ignoramos:

```js src/worker.js
export async function procesarMensaje(env, evento, ahora = Date.now(), llamar = fetch) {
  const kv = env.BOT_KV;

  // Idempotencia: Meta puede entregar el mismo mensaje más de una vez.
  const claveVisto = `visto:${evento.id}`;
  if (await kv.get(claveVisto)) return;
  await kv.put(claveVisto, '1', { expirationTtl: TTL_VISTO });

  const claveSesion = `sesion:${evento.de}`;
  const sesionPrevia = (await leerJson(kv, claveSesion)) ?? crearSesion(evento.de, ahora);
  const { sesion, respuestas } = procesar(sesionPrevia, evento.entrada, ahora);

  await guardarJson(kv, claveSesion, sesion, TTL_SESION);
  if (sesion.pedidoNuevo) await guardarJson(kv, `pedido:${sesion.pedidoNuevo.id}`, sesion.pedidoNuevo, TTL_PEDIDO);

  await enviarMensaje(env, construirLeido(evento.id), llamar).catch((e) => console.error(e.message));
  for (const respuesta of respuestas) {
    await enviarMensaje(env, construirEnvio(evento.de, respuesta), llamar);
  }
}
```

Observa los cuatro parámetros: `env` (recursos), `evento` (lo que produjo `parsearWebhook`), `ahora` (el reloj) y `llamar` (el `fetch`). Los dos últimos tienen valores por defecto y existen **para poder probar**: en producción son `Date.now()` y el `fetch` real; en una prueba inyectas un reloj fijo y un `fetch` falso. Es una técnica que usarás mucho: *inyección de dependencias* sin frameworks, solo parámetros.

### Las claves de KV

El Worker guarda tres tipos de datos en el KV llamado `BOT_KV`:

| Clave | Contenido | Vida (TTL) |
|---|---|---|
| `sesion:<teléfono>` | La sesión de conversación del cliente (JSON) | 2 días sin actividad |
| `pedido:<id>` | Un pedido confirmado | 30 días |
| `visto:<wamid>` | Marca de «mensaje ya procesado» | 1 día |

El **TTL** (*time to live*, `expirationTtl` en segundos) hace que KV borre solo las claves viejas. Los ids de mensajes `visto:` solo necesitan vivir lo que dure un posible reintento de Meta, por eso un día basta y KV no se llena de basura. (La [lección 15](../15-memoria-con-kv/) profundiza en KV.)

### Probado de verdad: el mismo mensaje dos veces

Para demostrarlo sin tocar Meta, usé un KV falso (un `Map`) y un `fetch` falso que solo anota las llamadas. Se entrega el mismo evento (`wamid.TEXTO001`, «Quiero 2 leches») dos veces:

```salida
llamadas tras 1.ª entrega: 2 [ 'read', 'interactive' ]
llamadas tras entrega repetida: 2
claves guardadas: [ 'visto:wamid.TEXTO001', 'sesion:51999000111' ]
```

La primera entrega produjo dos llamadas a Meta (marcar leído y un mensaje con botones). La repetida no produjo ninguna: seguimos en 2.

> [!nota] Una decisión con cuidado
> El código anota `visto:` **antes** de enviar para que dos entregas casi simultáneas no respondan dos veces. Pero si el envío a Meta falla (token vencido, por ejemplo), Meta reintentará, y una marca que ya existe haría que ese reintento se ignorara y el mensaje del cliente se perdiera. Por eso `procesarMensaje` envuelve los envíos en un `try/catch`: si algo falla, **restaura la sesión anterior, borra la marca `visto:` y relanza el error**. Así el reintento de Meta se procesa como si fuera la primera vez. La prueba «si el envío falla, se deshace y el reintento de Meta se procesa» lo comprueba (verás las pruebas en la [lección 23](../23-pruebas-y-errores/)). Y recuerda el límite del propio KV: **no es atómico**, así que dos mensajes simultáneos del mismo cliente pueden pisarse (para mucho volumen existen los *Durable Objects*).

## Probarlo en local con wrangler dev

**Wrangler** es la herramienta de línea de comandos de Cloudflare. Con `wrangler dev` levantas tu Worker en `http://127.0.0.1:8787` (o el puerto que elijas), con un KV **simulado en tu disco**: no necesitas cuenta ni internet para esta parte.

En la carpeta `codigo/` del proyecto:

```bash
npm install
cp .dev.vars.example .dev.vars
```

Edita `.dev.vars` (está en `.gitignore`, **nunca** se sube a Git) con tus valores de práctica:

```text .dev.vars
VERIFY_TOKEN=minimarket-123
WA_TOKEN=token-de-acceso-de-la-api-de-whatsapp
WA_PHONE_ID=id-del-numero-de-telefono-de-whatsapp
APP_SECRET=secreto
```

Los cuatro valores se llaman igual que los nombres que lee el código (`env.VERIFY_TOKEN`…). En local, `.dev.vars` hace el papel que en la nube cumplen los secretos (lección 11). Ahora arranca el servidor:

```bash
npx wrangler dev --port 8799
```

```salida
 ⛅️ wrangler 4.148.0
Using secrets defined in .dev.vars
Your Worker has access to the following bindings:
env.BOT_KV (11111111111111111111111111111111)   KV Namespace    local
env.WA_PHONE_ID ("(hidden)")                    Environment Variable    local
env.VERIFY_TOKEN ("(hidden)")                   Environment Variable    local
env.WA_TOKEN ("(hidden)")                       Environment Variable    local
env.APP_SECRET ("(hidden)")                     Environment Variable    local
⎔ Starting local server...
[wrangler:info] Ready on http://127.0.0.1:8799
```

Fíjate en que `BOT_KV` dice `local`: es un KV de mentira en tu disco (carpeta `.wrangler/`), por eso los ids de ejemplo de `wrangler.toml` no importan todavía. (Wrangler también avisa de que los Workers programados no se disparan solos en local; para probarlos llamas a `http://127.0.0.1:8799/cdn-cgi/local/scheduled`.)

> [!importante] Verifica este dato
> Los mensajes exactos de `wrangler`, sus banderas y la dirección de la prueba de cron cambian entre versiones. Esta salida es de Wrangler 4.148.0. Ante cualquier diferencia, mira `npx wrangler dev --help` y la [documentación de Wrangler](https://developers.cloudflare.com/workers/wrangler/commands/).

### Probar cada ruta con curl

Con el servidor corriendo, desde otra terminal. Estas son las salidas reales:

```bash
curl -s http://127.0.0.1:8799/
curl -s http://127.0.0.1:8799/salud
curl -s -w ' [%{http_code}]\n' "http://127.0.0.1:8799/webhook?hub.mode=subscribe&hub.verify_token=minimarket-123&hub.challenge=1158201444"
curl -s -w ' [%{http_code}]\n' "http://127.0.0.1:8799/webhook?hub.mode=subscribe&hub.verify_token=malo&hub.challenge=1"
curl -s -w ' [%{http_code}]\n' http://127.0.0.1:8799/otra
curl -s -w ' [%{http_code}]\n' -X POST http://127.0.0.1:8799/webhook -d '{}'
```

```salida
Bot Minimarket: ok
{"ok":true}
1158201444 [200]
Prohibido [403]
No encontrado [404]
Firma inválida [401]
```

Cada uno cuenta una historia: raíz y salud responden; el token correcto recibe su reto y el incorrecto un 403; una ruta desconocida da 404; un POST sin firma, 401.

### Un POST firmado, como Meta

Para probar el camino feliz necesitas firmar el cuerpo con el mismo `APP_SECRET`. Con `openssl` (viene con Git para Windows, macOS y Linux):

```bash
F=test/payloads/texto.json
SIG=$(openssl dgst -sha256 -hmac secreto -hex < $F | sed 's/.* //')
curl -s -w ' [%{http_code}]\n' -X POST http://127.0.0.1:8799/webhook \
  -H "X-Hub-Signature-256: sha256=$SIG" --data-binary @$F
```

```salida
ok [200]
```

Y en la terminal donde corre `wrangler dev` aparece el registro:

```salida
[wrangler:info] POST /webhook 401 Unauthorized (9ms)
[wrangler:info] POST /webhook 200 OK (23ms)
✘ [ERROR] WhatsApp respondió 401: Invalid OAuth access token - Cannot parse access token
✘ [ERROR] Error procesando webhook: WhatsApp respondió 401: Invalid OAuth access token - Cannot parse access token
```

El `200` es correcto: la firma era buena y el trabajo se encoló. El error que sigue **es lo esperado** en esta prueba: el motor procesó el mensaje, guardó la sesión y trató de contestar, pero `WA_TOKEN` es un texto de relleno, así que Meta respondió «token inválido». Ese error, además, nos enseña algo: el mensaje de error no contiene el token (`enviarMensaje` nunca lo incluye), y el fallo del segundo plano no cambió el `200` que ya se había entregado. Con credenciales reales (lección 13), esa misma petición enviaría los botones al cliente.

> [!consejo] Mira la base mientras pruebas
> La API local de Wrangler permite explorar el KV simulado. Es opcional, pero útil: al arrancar `wrangler dev` imprime las rutas del «Local Explorer». Verás las claves `sesion:51999000111` y `visto:wamid.TEXTO001` que acabamos de generar.

## Probar el Worker sin servidor: KV falso y fetch falso

`wrangler dev` es un ensayo general. Pero lo que protege tu bot a largo plazo son las **pruebas automáticas**, y `test/worker.test.js` prueba el Worker entero sin red ni Cloudflare. La clave es lo que viste en `procesarMensaje`: todo lo externo entra por parámetros.

```js test/worker.test.js
function crearEntorno() {
  const datos = new Map();
  const BOT_KV = {
    get: async (k) => datos.get(k) ?? null,
    put: async (k, v) => { datos.set(k, v); },
    list: async ({ prefix }) => ({ keys: [...datos.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })) }),
  };
  return { BOT_KV, datos, VERIFY_TOKEN: 'verifica', WA_TOKEN: 'tok', WA_PHONE_ID: '123', APP_SECRET: 'secreto' };
}
```

Un KV, para el código, es «algo con `get`, `put` y `list`». Un `Map` de JavaScript con tres funciones cumple ese contrato, así que el Worker no nota la diferencia. Corriendo solo esa suite:

```bash
node --test test/worker.test.js
```

```salida
✔ GET / y /salud responden ok
✔ ruta desconocida: 404
✔ verificación del webhook: token correcto devuelve el challenge
✔ verificación del webhook: token incorrecto es 403
✔ POST con firma inválida: 401 y no se procesa nada
✔ POST sin cabecera de firma: 401
✔ POST válido: responde 200, guarda sesión, marca leído y responde al cliente
✔ idempotencia: el mismo mensaje reenviado se ignora
✔ al confirmar, el pedido se guarda en KV
✔ recordatorios: texto si la ventana está abierta, plantilla si está cerrada
✔ recordatorios: carrito abandonado se avisa una sola vez
ℹ tests 11
ℹ pass 11
ℹ fail 0
```

Si un día cambias algo en el Worker y rompes la verificación de firma, una de esas líneas se pondrá roja antes de que lo sepa un cliente.

## Errores frecuentes

- **Esperar al envío antes de responder 200.** Si Meta no recibe respuesta pronto, reintenta y duplica. Usa `ctx.waitUntil`.
- **Olvidar `ctx.waitUntil`.** Sin él, Cloudflare puede cortar el trabajo en cuanto devuelves la respuesta y el bot «recibe pero no contesta».
- **Leer `request.json()` y luego querer verificar la firma.** El cuerpo ya se consumió y, además, ya no es el texto original. Lee `request.text()` una vez.
- **No manejar duplicados.** Un mismo `wamid` puede llegar dos veces: sin idempotencia el cliente ve pedidos dobles.
- **Subir `.dev.vars` a Git.** Contiene secretos. Está en `.gitignore`: no lo quites, y no copies su contenido al código.
- **Confiar en `process.env` o variables globales.** En un Worker la configuración llega por `env`.
- **Mezclar lógica del negocio en el Worker.** Si `worker.js` empieza a decidir precios o textos, ya no podrás probar el motor sin red. Mantén esa frontera.

## Apuntes para llevar

- El servidor del bot es una **carcasa**: valida, carga la sesión, llama a `procesar()`, guarda y envía; la lógica vive en el motor.
- Un **Cloudflare Worker** exporta `fetch` (peticiones HTTP) y `scheduled` (cron), y recibe su configuración en `env`.
- El `POST /webhook` lee el **cuerpo crudo**, verifica la firma (401 si falla), parsea y responde **200 enseguida**.
- `ctx.waitUntil` mantiene vivo el trabajo en segundo plano después de responder.
- La **idempotencia** con `visto:<wamid>` evita procesar dos veces el mismo mensaje; las claves tienen TTL para limpiarse solas.
- `wrangler dev` + `.dev.vars` + `curl` permiten probar todo en tu máquina; `node --test` prueba el Worker con un KV y un `fetch` falsos.

## Glosario

| Término | Significado |
|---|---|
| Worker | Programa JavaScript que se ejecuta en la red de Cloudflare sin que administres un servidor. |
| `env` | Objeto con las variables, secretos y recursos (como KV) que recibe el Worker. |
| `ctx.waitUntil` | Pide mantener vivo el Worker hasta que termine una tarea, aun después de responder. |
| Idempotencia | Propiedad de una operación que da el mismo resultado aunque se repita. |
| KV | Almacén clave-valor de Cloudflare, simple y de lectura rápida. |
| TTL | «Tiempo de vida» tras el cual KV borra una clave (`expirationTtl`). |
| Wrangler | Herramienta de línea de comandos de Cloudflare para probar y desplegar Workers. |
| `.dev.vars` | Archivo local (fuera de Git) con los secretos que usa `wrangler dev`. |
| Cron trigger | Programación que ejecuta `scheduled()` a horas fijas. |
| Doble de prueba | Objeto falso (KV, `fetch`) que reemplaza a un recurso real en las pruebas. |

```quiz
? ¿Por qué el Worker responde 200 enseguida y procesa el mensaje con `ctx.waitUntil`?
- Para ahorrar dinero en el plan de Cloudflare
- Porque `waitUntil` hace que el motor sea más rápido
+ Para que Meta no reintente la entrega por demora mientras el bot guarda y envía en segundo plano
- Porque Meta exige que las respuestas se envíen antes del 200
= Si Meta no recibe el 200 a tiempo, reenvía el mensaje y el cliente puede ver duplicados.

? ¿Para qué sirve guardar `visto:<wamid>` en KV?
- Para saber cuántos clientes tiene el negocio
+ Para ignorar un mensaje que Meta entrega más de una vez
- Para cifrar el mensaje del cliente
- Para reiniciar la sesión del cliente
= Es la clave de idempotencia: si ya existe, el mensaje ya se procesó.

? Un POST llega sin cabecera `X-Hub-Signature-256`. ¿Qué responde el Worker?
- 200, porque igual podría ser un mensaje real
- 404
+ 401 y no procesa nada
- 500
= Sin firma válida no se puede confiar en que venga de Meta.

? ¿Qué ventaja da inyectar `ahora` y `llamar` como parámetros de `procesarMensaje`?
+ Permite probar con un reloj fijo y un `fetch` falso, sin red ni cuenta de Meta
- Hace que el mensaje llegue más rápido
- Evita tener que usar KV
- Es obligatorio para que Cloudflare acepte el Worker
= Los parámetros con valor por defecto permiten sustituir lo externo en las pruebas.

? ¿Qué papel cumple `.dev.vars` en `wrangler dev`?
- Es el archivo de configuración del cron
+ Contiene los secretos de prueba (VERIFY_TOKEN, WA_TOKEN, APP_SECRET...) que el Worker lee desde `env` en local
- Lista las rutas permitidas
- Se sube a Cloudflare al desplegar
= Es el equivalente local de los secretos; debe quedar fuera de Git.
```

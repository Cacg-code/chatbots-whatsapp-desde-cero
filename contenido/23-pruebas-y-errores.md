---
titulo: Pruebas, registros y errores comunes
resumen: Cómo probar un bot con node:test, conversaciones completas y payloads reales, qué registrar en los logs, cómo reintentar bien y qué significan los errores 131xxx de WhatsApp.
minutos: 60
nivel: intermedio
objetivos:
- Escribir pruebas con node:test que recorran una conversación completa del bot sin usar WhatsApp.
- Probar el parser del webhook con payloads de ejemplo, incluidos los de basura y los de estado fallido.
- Registrar eventos útiles en el log sin filtrar tokens ni teléfonos completos.
- Reintentar un envío fallido con espera creciente, y saber cuándo no conviene reintentar.
- Interpretar los errores 131xxx más comunes y decidir qué hacer con cada uno.
fuentes:
- Node.js: módulo de pruebas | https://nodejs.org/docs/latest-v22.x/api/test.html
- Documentación de WhatsApp Cloud API (Meta) | https://developers.facebook.com/docs/whatsapp/cloud-api/
---
## Por qué probar un bot es distinto

Un bot es un programa que **otros** usan a cualquier hora y de maneras que no imaginaste. Si lo cambias a las 11 de la noche para arreglar el texto de la dirección y sin querer rompes el paso del pago, lo descubrirás cuando un cliente real te escriba. Las pruebas automáticas son tu red de seguridad: las ejecutas en un segundo y te dicen si lo que funcionaba sigue funcionando.

La buena noticia es que en este curso diseñaste el bot para que sea fácil de probar. Recuerda la idea central de la [lección 5](../05-estado-de-la-conversacion/): `procesar(sesion, entrada, ahora)` es una **función pura**. No envía nada, no lee archivos y no usa red. Le das una sesión y un mensaje, y te devuelve la sesión nueva y las respuestas. Probarlo es llamar a una función y mirar el resultado: no necesitas WhatsApp, ni internet, ni un teléfono.

Hay tres capas que conviene probar, de la más barata a la más cara:

```flujo
Motor|conversaciones completas
-> payloads de ejemplo
Traductor|parser y envío a WhatsApp
-> fetch falso
Servidor|Worker, firma y reintentos
```

1. **El motor**: simulas a un cliente que escribe y toca botones.
2. **El traductor** (`whatsapp.js`): le das JSON reales de Meta y compruebas qué eventos salen; le das respuestas del motor y compruebas que respetan los límites de WhatsApp.
3. **El servidor**: usas un `fetch` y un KV falsos para ver qué enviaría el Worker sin salir a internet.

## node:test: pruebas sin instalar nada

Node trae su propio ejecutor de pruebas, `node:test`, desde hace años. No necesitas Jest ni Vitest. Una prueba es una función con un nombre, y dentro usas `assert` para afirmar lo que esperas:

```js ejemplo.test.js
import test from 'node:test';
import assert from 'node:assert/strict';

test('sumar soles sin decimales raros', () => {
  assert.equal(0.1 + 0.2 === 0.3, false); // JavaScript guarda decimales en binario
  assert.equal(Math.round((0.1 + 0.2) * 100) / 100, 0.3);
});
```

Se ejecuta con `node --test` (busca solo los archivos `*.test.js`) o con `npm test` si lo definiste en `package.json`. El código de referencia del curso ya trae sus pruebas. Si corres `npm test` en la carpeta `codigo/`, el final de la salida es:

```salida
ℹ tests 113
ℹ suites 0
ℹ pass 113
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
```

Tres reglas que ahorran dolores de cabeza:

- **Una prueba, una idea.** Si falla, el nombre te dice qué se rompió.
- **Nombres en lenguaje de negocio**: «delivery bajo el mínimo no avanza» es mejor que «test 7».
- **Sin sorpresas externas.** Nada de relojes reales ni redes: el tiempo (`ahora`) y el `fetch` se pasan como parámetros, justamente para poder falsearlos.

> [!nota] Dónde se corre todo esto
> Los ejemplos de esta lección importan los módulos del código de referencia (`src/motor.js`, `src/whatsapp.js`). En tu proyecto, guarda tus pruebas en `test/` y ajusta las rutas `../src/...`. Todo lo que ves aquí se ejecutó con Node 24.

## Probar una conversación completa

El código de referencia incluye una ayuda en `test/ayudas.js`: `conversacion(telefono)` crea un «cliente falso» con métodos `decir(texto)` y `tocar(id)`. Cada respuesta del bot se valida además contra los límites de WhatsApp (por ejemplo, títulos de botón de 20 caracteres como máximo): si el bot responde algo que Meta rechazaría, la prueba falla aunque la lógica esté bien.

Escribamos dos pruebas del minimarket y una tercera que falle a propósito, para ver cómo se ve un fallo:

```js pedido.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { conversacion } from './ayudas.js';

test('pedido completo con recojo y efectivo', () => {
  const c = conversacion('51999000111');
  c.decir('hola');
  c.decir('quiero 2 leches');
  c.tocar('cerrar');
  c.tocar('entrega:recojo');
  c.tocar('pago:efectivo');
  assert.match(c.texto, /Total a pagar: S\/ 8\.60/);
  c.tocar('pedido_confirmar');
  assert.match(c.texto, /Pedido LE-[A-Z0-9]+ recibido/);
  assert.equal(c.sesion.pedidoNuevo.total, 8.6);
});

test('delivery bajo el mínimo no avanza', () => {
  const c = conversacion('51999000111');
  c.decir('1 arroz');
  c.tocar('cerrar');
  c.tocar('entrega:delivery');
  assert.match(c.texto, /pedido mínimo S\/ 25\.00/);
  assert.equal(c.sesion.estado, 'TIPO_ENTREGA');
});
```

Al ejecutarla, una de las dos falla. Lee con calma el informe, porque es el que verás cuando algo se rompa de verdad:

```salida
✔ pedido completo con recojo y efectivo (5.0089ms)
✖ delivery bajo el mínimo no avanza (1.2161ms)
...
AssertionError [ERR_ASSERTION]: The input did not match the regular expression /pedido mínimo S\/ 25\.00/. Input:

'Para delivery el pedido mínimo es S/ 25.00 y llevas S/ 4.20. Te faltan S/ 20.80. Puedes agregar más productos o elegir recojo en tienda.'
```

Node te muestra el texto real que dijo el bot. El error era mío: el mensaje dice «pedido mínimo **es** S/ 25.00». Corrijo la expresión regular a `/pedido mínimo es S\/ 25\.00/` y la prueba pasa. Fíjate en lo útil del informe: ves **lo esperado y lo recibido** lado a lado.

> [!consejo] Prueba el texto con moderación
> Comprobar frases exactas hace que la prueba se rompa cada vez que mejoras la redacción. Verifica lo importante (el total, el estado, que se mencione el mínimo) y deja libre el resto. Si algún día cambias «Te faltan» por «Faltan», tus pruebas no deberían enterarse.

### Recorrer todos los botones

Una prueba muy rentable es la «de humo»: tocar **todo** lo que el bot ofrece y confirmar que nada explota. Parte del saludo, anota los ids de botones y filas que aparecen, tócalos uno por uno (en una conversación nueva con un producto en el carrito) y repite con los ids nuevos que vayan saliendo:

```js recorrido.test.js
test('todo lo que el bot ofrece se puede tocar sin que nada se rompa', () => {
  const vistos = new Set();
  const c = conversacion('51999000111');
  c.decir('hola');
  const pendientes = [...c.idsOfrecidos()];
  let toques = 0;
  while (pendientes.length && toques < 100) {
    const id = pendientes.shift();
    if (vistos.has(id)) continue;
    vistos.add(id);
    const c2 = conversacion('51999000111');
    c2.decir('hola'); c2.decir('2 leches');
    c2.tocar(id); // lanza si el bot responde algo que WhatsApp rechazaría
    assert.ok(c2.respuestas.length > 0 || c2.sesion.estado === 'ESPERANDO_HUMANO', id);
    pendientes.push(...c2.idsOfrecidos());
    toques++;
  }
  console.log('ids probados:', toques);
  assert.ok(toques >= 30);
});
```

```salida
ids probados: 43
✔ todo lo que el bot ofrece se puede tocar sin que nada se rompa (28.5662ms)
```

Con 43 ids distintos (categorías, productos, entrega, pago, confirmación) el bot respondió siempre algo válido. Si mañana agregas una categoría con un nombre de 30 caracteres, esta prueba lo detecta antes que Meta.

### Entradas hostiles

Los clientes escriben cosas absurdas: vacío, emojis, 5.000 letras, cantidades negativas o código HTML. El bot no debe lanzar errores:

```js recorrido.test.js
test('mensajes raros no tumban al bot', () => {
  const c = conversacion('51999000111');
  for (const t of ['', '   ', '🙂', 'a'.repeat(5000), '<script>', '0', '-5 leches', '999999 leches', 'null', '{"x":1}']) {
    c.decir(t);
  }
  assert.ok(c.sesion.estado);
});
```

Pasó a la primera. Si hubiera fallado, habrías encontrado un error que un cliente real habría encontrado por ti.

## Probar el webhook con payloads reales

El segundo tipo de prueba usa **JSON de ejemplo** copiados de la documentación de Meta. En `test/payloads/` el código de referencia trae siete: `texto.json`, `boton.json`, `lista.json`, `imagen.json`, `no-soportado.json`, `estado-entregado.json` y `estado-fallido.json`. Cada uno es el cuerpo exacto que Meta te enviaría (con números falsos).

Con ellos pruebas que `parsearWebhook` entiende lo que debe y que **ignora sin romperse** lo que no entiende. Esto último es vital: Meta puede añadir campos nuevos o enviar eventos que no esperabas, y tu servidor debe seguir respondiendo `200`.

```js fiabilidad.test.js
import { readFileSync } from 'node:fs';
import { parsearWebhook } from '../src/whatsapp.js';

const cargar = (n) => JSON.parse(readFileSync(new URL('./payloads/' + n, import.meta.url), 'utf8'));

test('payload de estado fallido se interpreta', () => {
  const [ev] = parsearWebhook(cargar('estado-fallido.json'));
  assert.equal(ev.tipo, 'estado');
  assert.equal(ev.estado, 'failed');
  assert.equal(ev.errores[0].code, 131047);
});

test('basura no rompe el parser', () => {
  for (const x of [null, {}, 'hola', { object: 'otra', entry: 5 }, { object: 'whatsapp_business_account', entry: [null, {}] }]) {
    assert.deepEqual(parsearWebhook(x), []);
  }
});
```

Ambas pasan. Mira el primer caso: el payload `estado-fallido.json` trae `"code": 131047`. Es un error real y muy común, que descifrarás en la sección de errores más abajo.

> [!importante] Guarda payloads reales
> Cuando conectes tu número de prueba ([lección 13](../13-recibir-mensajes-reales/)), copia los JSON que realmente llegan (reemplazando los datos personales por números falsos) a `test/payloads/`. Cada vez que Meta te sorprenda con un formato nuevo, ese archivo se vuelve una prueba permanente.

## Qué registrar en los logs (y qué nunca)

Cuando algo falla en producción no tienes un depurador: tienes **registros** (*logs*). En Cloudflare los ves con `npx wrangler tail` mientras el Worker corre. Para que sirvan, necesitan estructura. Una línea JSON por evento es fácil de leer y de filtrar:

```js fiabilidad.js
const BEARER = /(Bearer\s+)[A-Za-z0-9_\-.]+/gi;
const CLAVES = /("?(?:token|app_secret|verify_token)"?\s*[:=]\s*"?)[^"\s,}]+/gi;

export function ocultarSecretos(texto) {
  return String(texto).replace(BEARER, '$1***').replace(CLAVES, '$1***');
}

export function ocultarTelefono(tel) {
  const s = String(tel);
  return s.length <= 6 ? '***' : `${s.slice(0, 3)}***${s.slice(-3)}`;
}

export function registrar(nivel, evento, datos = {}, salida = console.log) {
  const linea = { ts: new Date().toISOString(), nivel, evento, ...datos };
  if (linea.de) linea.de = ocultarTelefono(linea.de);
  salida(ocultarSecretos(JSON.stringify(linea)));
}
```

Y su prueba. Mi primera versión de `ocultarSecretos` tenía un solo patrón y la prueba **falló**: la expresión se comió `Authorization: ` como si fuera una clave y dejó pasar el token tras la palabra `Bearer`. Es justo el tipo de error que las pruebas encuentran. La versión de arriba separa los dos patrones, y con ella:

```js fiabilidad.test.js
test('el log no deja pasar tokens ni teléfonos completos', () => {
  const lineas = [];
  registrar('error', 'envio_fallido', { de: '51999000111', detalle: 'Authorization: Bearer EAAGexample123' }, (l) => lineas.push(l));
  console.log(lineas[0]);
  assert.ok(!lineas[0].includes('EAAG'));
  assert.ok(!lineas[0].includes('51999000111'));
});
```

```salida
{"ts":"2026-10-07T19:02:19.674Z","nivel":"error","evento":"envio_fallido","de":"519***111","detalle":"Authorization: Bearer ***"}
```

**Qué sí registrar:** el tipo de evento (mensaje recibido, respuesta enviada, estado fallido), el id del mensaje (`wamid...`), el estado de la conversación, la duración y los códigos de error. **Qué no:** tokens, el App Secret, ni el texto completo de los mensajes de los clientes ni sus teléfonos enteros (los datos personales no deben vivir en un log; verás el porqué en la [lección 24](../24-seguridad-y-privacidad/)). El código de referencia ya cuida lo mínimo: `enviarMensaje` nunca incluye el token en sus errores.

## Reintentos: cuándo sí y cuándo no

Las redes fallan. Una petición a la API de Meta puede devolver un `500` porque sus servidores están ocupados un segundo. Reintentar suele resolverlo, pero hacerlo mal empeora las cosas. Reglas:

| Respuesta | ¿Reintentar? | Por qué |
|---|---|---|
| `429` (demasiadas peticiones) | Sí, con espera | Es temporal: Meta te pide bajar el ritmo. |
| `500`, `502`, `503` | Sí, con espera | Fallo del servidor, normalmente pasajero. |
| `400`, `401`, `403`, `404` | **No** | Tu petición está mal o te falta permiso; repetirla da el mismo error. |

La espera debe **crecer** en cada intento (500 ms, 1 s, 2 s...), con un tope, para no martillar a un servidor que ya está en problemas. A eso se le llama *backoff exponencial*:

```js fiabilidad.js
export function esReintentable(estadoHttp) {
  return estadoHttp === 429 || estadoHttp >= 500;
}

export function esperaReintento(intento, baseMs = 500, maxMs = 8000) {
  return Math.min(baseMs * 2 ** (intento - 1), maxMs);
}

export async function conReintentos(tarea, { intentos = 3, baseMs = 500, dormir = (ms) => new Promise((r) => setTimeout(r, ms)), alFallar = () => {} } = {}) {
  let ultimo;
  for (let n = 1; n <= intentos; n++) {
    try {
      return await tarea(n);
    } catch (e) {
      ultimo = e;
      const reintentable = e.estado === undefined || esReintentable(e.estado);
      alFallar(n, e, reintentable);
      if (!reintentable || n === intentos) break;
      await dormir(esperaReintento(n, baseMs));
    }
  }
  throw ultimo;
}
```

Fíjate en el parámetro `dormir`: en producción espera de verdad, pero en las pruebas le pasas una función vacía y el test no tarda ni medio segundo.

Hay un detalle del código de referencia: `enviarMensaje` lanza un `Error` cuyo texto es `WhatsApp respondió 500: ...` pero **no** guarda el número en una propiedad. Lo extraemos del mensaje con una función pequeña y envolvemos el envío:

```js fiabilidad.js
export function estadoDeError(e) {
  const m = /respondió (\d{3})/.exec(e?.message ?? '');
  return m ? Number(m[1]) : undefined;
}

export function enviarConReintentos(env, cuerpo, llamar = fetch, opciones = {}) {
  return conReintentos(async () => {
    try {
      return await enviarMensaje(env, cuerpo, llamar);
    } catch (e) {
      e.estado = estadoDeError(e);
      throw e;
    }
  }, opciones);
}
```

Con un `fetch` falso que responde `500`, `503` y por fin `200`, comprobamos los tres casos de la tabla:

```salida
intentos usados: 3
✔ 500, 500, 200: entrega al tercer intento (10.4468ms)
✔ 400 no se reintenta (2.8786ms)
✔ 429 se reintenta y al final se rinde (1.3067ms)
```

> [!importante] Reintentar no es lo mismo que duplicar
> Si un `500` ocurre **después** de que Meta entregó el mensaje, el reintento enviará el texto dos veces. Tampoco hay forma perfecta de evitarlo: por eso conviene reintentar pocas veces (2 o 3) y registrar cada intento. Y del lado de la **entrada**, recuerda la idempotencia del Worker (`visto:<wamid>`): Meta también reintenta sus webhooks si no le respondes `200` rápido, y el código ya ignora los mensajes repetidos.

## Errores 131xxx de WhatsApp

Cuando un envío falla, la API devuelve un JSON con un `code` y un `message`. También los verás en los eventos de estado `failed` del webhook. Esta es la guía de los más frecuentes, con la acción que casi siempre corresponde:

| Código | Qué significa | Qué hacer |
|---|---|---|
| `131047` | Pasaron más de 24 horas desde el último mensaje del cliente (*re-engagement*) | Enviar una **plantilla** aprobada en lugar de texto libre ([lección 17](../17-plantillas/)). |
| `131030` | El destinatario no está en la lista de permitidos (código que citan muchos tutoriales; **no figura en la lista oficial** consultada el 2026-10-07, así que confía en el `message` de la respuesta) | Con el número de prueba, agrega el teléfono en la lista de Meta o usa un número real verificado. |
| `131026` | Mensaje no entregable (el número no tiene WhatsApp, usa una versión muy vieja o no aceptó las condiciones) | No reintentar; anotar al cliente como inalcanzable. |
| `131056` | Demasiados mensajes seguidos entre tu número y ese cliente | Esperar y bajar el ritmo. |
| `131048` | Límite por calidad o posible spam | Revisar tu contenido y tu lista de opt-in ([lección 20](../20-marketing-responsable/)). |
| `131008` / `131009` | Falta un parámetro obligatorio / un parámetro tiene un valor inválido | Corregir tu código: revisa el JSON que construiste. |
| `131031` | Cuenta bloqueada o restringida | Revisar el estado de la cuenta en el administrador de Meta. |
| `131051` | Tipo de mensaje no soportado | Revisar que el tipo y el formato del mensaje existan. |
| `190` | Token de acceso vencido o inválido (no empieza por 131, pero es muy común) | Generar un token nuevo ([lección 12](../12-cuenta-y-app-de-meta/)). |

> [!importante] Verifica este dato
> Los códigos y sus descripciones los define Meta y se amplían con el tiempo. Esta tabla sirve de orientación, no de contrato. La lista oficial y vigente está en la [documentación de códigos de error de la Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes). Si el enlace cambia de sitio, búscala dentro de `developers.facebook.com` por «WhatsApp Cloud API error codes».

Convertimos la tabla en código para que el bot (o tú, al leer los logs) sepa qué hacer sin consultar nada:

```js fiabilidad.js
const ERRORES = {
  131047: { accion: 'plantilla', causa: 'Pasaron más de 24 h desde el último mensaje del cliente.' },
  131030: { accion: 'corregir', causa: 'El destinatario no está en la lista de permitidos (número de prueba).' },
  131026: { accion: 'ignorar', causa: 'Mensaje no entregable.' },
  131056: { accion: 'esperar', causa: 'Demasiados mensajes seguidos al mismo cliente.' },
  131048: { accion: 'esperar', causa: 'Límite por calidad: Meta frena tus envíos por posible spam.' },
  190: { accion: 'corregir', causa: 'Token de acceso vencido o inválido.' },
};

export function clasificarError(codigo) {
  return ERRORES[codigo] ?? { accion: 'revisar', causa: 'Código desconocido: búscalo en la documentación oficial.' };
}
```

Con el payload de ejemplo, `clasificarError(ev.errores[0].code).accion` devuelve `'plantilla'`, y la prueba lo confirma. Un error `131047` en el estado de un mensaje del Worker de la [lección 18](../18-recordatorios-y-seguimiento/) significa que tu recordatorio salió como texto cuando la ventana ya estaba cerrada: el código de referencia evita eso decidiendo con `puedeEnviarTexto`, pero la ventana puede cerrarse justo entre la decisión y el envío.

## Una lista de pruebas antes de publicar

Antes de cada despliegue, repasa esta lista. Las primeras líneas las automatizan tus pruebas; las últimas son manuales con tu número de prueba:

1. `npm test` pasa completo.
2. Una conversación de punta a punta (recojo y delivery) con pago en efectivo, Yape y transferencia.
3. Entradas raras: vacío, emoji, audio, imagen. El bot responde sin romperse.
4. El mismo webhook enviado dos veces no duplica el pedido.
5. Un POST con firma incorrecta devuelve `401`.
6. En tu teléfono real, un pedido completo y la lectura de los logs con `wrangler tail`.

## Errores frecuentes

- **Probar solo el «camino feliz».** El cliente que escribe «dos lehces» o manda una nota de voz es el normal, no el raro.
- **Pruebas que dependen del reloj o de internet.** Pasa `ahora` y el `fetch` como parámetros para que cualquiera pueda repetirlas.
- **Comprobar frases exactas.** Cualquier mejora de redacción rompe las pruebas; verifica datos y estados.
- **Reintentar errores `4xx`.** Si el cuerpo está mal, el segundo intento falla igual y solo gastas tiempo.
- **Registrar tokens o mensajes completos en el log.** Los logs se comparten y se guardan: trátalos como datos sensibles.
- **Ignorar los eventos `failed`.** Son la única forma de enterarte de que un mensaje no llegó. Al menos regístralos.

## Apuntes para llevar

- El motor es una función pura, así que se prueba sin WhatsApp: simula una conversación y comprueba estado, totales y textos clave.
- Las pruebas de humo (tocar todos los botones, mandar entradas raras) encuentran errores de forma barata.
- Guarda payloads reales de Meta en `test/payloads/` y haz que el parser ignore lo desconocido.
- Los logs deben ser estructurados y **sin secretos** ni teléfonos completos.
- Reintenta solo `429` y `5xx`, con espera creciente y pocos intentos; nunca los `4xx`.
- Aprende los códigos `131047`, `131026`, `131056` y `190`, y consulta la lista oficial de Meta para el resto.

## Glosario

| Término | Significado |
|---|---|
| node:test | Ejecutor de pruebas incluido en Node; se usa con `node --test`. |
| Aserción | Afirmación dentro de una prueba (`assert.equal`); si no se cumple, la prueba falla. |
| Prueba de humo | Prueba rápida que recorre lo principal para ver que nada explota. |
| Payload | Cuerpo JSON que Meta envía a tu webhook. |
| Log | Registro de lo que ocurre en el servidor, útil para depurar. |
| Backoff exponencial | Esperar cada vez más entre reintentos (500 ms, 1 s, 2 s...). |
| Idempotencia | Procesar dos veces el mismo evento da el mismo resultado que procesarlo una vez. |
| Código 131xxx | Familia de códigos de error de la Cloud API de WhatsApp para fallos de envío. |

```quiz
? ¿Por qué se puede probar el motor del bot sin conectarlo a WhatsApp?
- Porque Meta ofrece un simulador oficial dentro de Node
+ Porque `procesar` es una función pura: recibe sesión y mensaje y devuelve sesión y respuestas, sin red ni archivos
- Porque las pruebas se hacen siempre con el teléfono real
- Porque el motor guarda los datos en KV automáticamente
= Al no tener entrada/salida, basta llamar a la función y comprobar el resultado.

? Una petición de envío devuelve 400. ¿Qué haces?
- Reintentas tres veces con espera creciente
+ No reintentas: el cuerpo o los permisos están mal y repetirlo dará el mismo error
- Esperas 24 horas y repites
- Cambias el token por uno nuevo siempre
= Los 4xx indican un problema de tu petición; solo se reintentan 429 y 5xx.

? Un estado `failed` trae el código 131047. ¿Qué significa?
+ Pasaron más de 24 horas desde el último mensaje del cliente y hay que usar una plantilla
- El número de teléfono no tiene WhatsApp
- El token de acceso venció
- El cliente bloqueó tu número
= 131047 es el error de re-engagement: fuera de la ventana solo valen las plantillas.

? ¿Qué NO debe aparecer en tus logs?
- El id del mensaje (`wamid...`)
- El código de error de Meta
+ El token de acceso y los teléfonos de los clientes completos
- El tipo de evento
= Los logs se comparten y se guardan: los secretos y los datos personales no van ahí.

? ¿Para qué sirve guardar payloads reales en `test/payloads/`?
- Para aumentar la velocidad del servidor
- Para no necesitar el App Secret
+ Para convertir cada formato inesperado de Meta en una prueba permanente del parser
- Para enviar mensajes sin firma
= Los payloads reales son la mejor documentación viva de lo que Meta envía.
```

---
titulo: Enviar mensajes
resumen: Envía texto, botones y listas con la Graph API usando las funciones del código del curso, respeta los límites de WhatsApp y diagnostica los errores comunes.
minutos: 55
nivel: intermedio
objetivos:
- Describir la petición POST a /{PHONE_NUMBER_ID}/messages y sus cabeceras.
- Construir cuerpos de texto, botones y lista con construirEnvio y respetar los límites de cada tipo.
- Enviar un mensaje con enviarMensaje sin filtrar el token en los errores.
- Interpretar los códigos de error más comunes de la API y decidir qué hacer en cada caso.
- Explicar por qué una respuesta 200 no garantiza que el cliente recibió el mensaje.
---
## La petición básica

Enviar un mensaje con la Cloud API es una sola petición HTTPS. Tu bot ya sabe **qué** responder (el motor devuelve una lista de respuestas); esta lección es la última pieza: **cómo** se convierten esas respuestas en peticiones a Meta.

```flujo
Motor|respuestas del bot
-> construirEnvio
Cuerpo JSON|formato de la API
-> enviarMensaje (POST)
Graph API|graph.facebook.com
-> mensaje
Cliente|WhatsApp
```

Según la [documentación oficial de envío de mensajes](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages):

- El método y la ruta son `POST /<PHONE_NUMBER_ID>/messages` sobre `graph.facebook.com`, con la versión de la API en la ruta (por ejemplo `v26.0`).
- La cabecera `Authorization: Bearer <token>` lleva tu token.
- La cabecera `Content-Type: application/json` indica el formato.
- El cuerpo siempre incluye `messaging_product: "whatsapp"`, el destinatario en `to` y el `type` del mensaje.

Lo que el código del curso aplica en `src/whatsapp.js`:

```js src/whatsapp.js (fragmento)
export const GRAPH_VERSION = 'v26.0';

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
```

Tres decisiones merecen atención:

1. **`llamar = fetch`**: la función recibe como parámetro el `fetch` que usará. En producción es el real; en las pruebas es uno falso, así pruebas el envío sin tocar internet ni gastar mensajes (lo verás en la [lección 23](../23-pruebas-y-errores/)).
2. **El mensaje de error nunca contiene el token.** Un error registrado en la consola o en un panel de logs no debe filtrar una credencial.
3. **Se lee el `error.message` de la respuesta de Meta**, que suele explicar el problema.

> [!importante] Verifica este dato
> La versión de la Graph API cambia y cada versión tiene fecha de retiro. El ejemplo de la documentación de envío usa una versión distinta a la del código del curso: ambas existen y funcionan, pero conviene revisar el [registro de cambios](https://developers.facebook.com/docs/graph-api/changelog/) y actualizar `GRAPH_VERSION` antes de desplegar.

## Texto simple

El tipo más simple. El motor devuelve `{ tipo: 'texto', texto: '...' }` y `construirEnvio` lo transforma:

```js ejemplo.js
import { construirEnvio } from './src/whatsapp.js';

const cuerpo = construirEnvio('51999000111', {
  tipo: 'texto',
  texto: 'Hola, bienvenido a Minimarket La Esquina.',
});
console.log(JSON.stringify(cuerpo));
```

```salida
{"messaging_product":"whatsapp","recipient_type":"individual","to":"51999000111","type":"text","text":{"preview_url":false,"body":"Hola, bienvenido a Minimarket La Esquina."}}
```

`preview_url: false` evita que WhatsApp genere una vista previa de enlaces. Si quieres que un enlace muestre su vista previa, tendrías que ponerlo en `true` (la documentación oficial usa `true` en su ejemplo cuando el texto incluye un enlace). Respecto al límite, el código impone 4096 caracteres de texto.

> [!importante] Verifica este dato
> Los límites de caracteres (4096 en texto, 1024 en el cuerpo de botones, 20 en el título de un botón, etc.) son los que figuran en las páginas oficiales de cada tipo de mensaje al escribir este curso. Confírmalos en la documentación de [mensajes interactivos con botones](https://developers.facebook.com/docs/whatsapp/cloud-api/messages/interactive-reply-buttons-messages) y de [listas](https://developers.facebook.com/docs/whatsapp/cloud-api/messages/interactive-list-messages).

Una respuesta exitosa contiene el id del mensaje (`wamid...`) y el contacto:

```json
{
  "messaging_product": "whatsapp",
  "contacts": [{ "input": "51999000111", "wa_id": "51999000111" }],
  "messages": [{ "id": "wamid.EJEMPLO123" }]
}
```

Guarda ese id si más adelante quieres relacionarlo con los estados `sent`, `delivered` o `read` que llegarán a tu webhook ([lección 13](../13-recibir-mensajes-reales/)).

## Botones de respuesta

Los **botones de respuesta** (*reply buttons*) muestran hasta tres opciones tocables bajo el mensaje. Son ideales para decisiones cortas: «Recojo» o «Delivery», «Confirmar» o «Cancelar». Cuando el cliente toca uno, tu webhook recibe un mensaje `interactive` con el `id` del botón, no con su texto. Por eso el motor usa ids como `entrega:recojo` y `pedido_confirmar`: son identificadores estables, mientras el título es solo lo que se ve.

Reglas que valida `construirEnvio` antes de enviar (si se rompe una, lanza un error claro **antes** de llamar a Meta):

| Regla | Valor en el código |
|---|---|
| Cantidad de botones | de 1 a 3 |
| Título del botón | hasta 20 caracteres, único dentro del mensaje |
| Id del botón | hasta 256 caracteres |
| Cuerpo del mensaje | de 1 a 1024 caracteres |

Estas validaciones producen mensajes como los siguientes (reales, ejecutados con el código del curso):

```salida
Respuesta inválida para WhatsApp: título de botón de más de 20 caracteres: "Un titulo demasiado largo para boton"
Respuesta inválida para WhatsApp: entre 1 y 3 botones
```

Y un envío válido de dos botones produce este cuerpo:

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "51999000111",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": { "text": "¿Cómo quieres recibir tu pedido?" },
    "action": {
      "buttons": [
        { "type": "reply", "reply": { "id": "entrega:recojo", "title": "Recojo en tienda" } },
        { "type": "reply", "reply": { "id": "entrega:delivery", "title": "Delivery" } }
      ]
    }
  }
}
```

> [!consejo] Falla antes, no después
> Validar en tu código ahorra una ida y vuelta a Meta y te da un error legible en tus pruebas. Si dejaras que la API rechace un título largo, recibirías un error genérico de parámetros (código 100, como verás abajo) y tendrías que adivinar cuál campo falló.

## Listas

Cuando tienes más de tres opciones, usa una **lista**: un mensaje con un botón que abre un menú con filas. Es lo que usa el bot para mostrar las categorías del catálogo. Límites del código:

| Regla | Valor |
|---|---|
| Texto del botón que abre la lista | hasta 20 caracteres |
| Secciones | de 1 a 10 |
| Filas en total | de 1 a 10 |
| Título de sección | hasta 24 caracteres (obligatorio si hay más de una) |
| Título de fila | hasta 24 caracteres |
| Descripción de fila | hasta 72 caracteres (opcional) |
| Id de fila | hasta 200 caracteres |

Un ejemplo mínimo con el estilo del minimarket:

```js ejemplo.js
const cuerpo = construirEnvio('51999000111', {
  tipo: 'lista',
  texto: 'Elige una categoria',
  boton: 'Ver categorias',
  secciones: [{
    titulo: 'Categorias',
    filas: [{ id: 'cat:abarrotes', titulo: 'Abarrotes', descripcion: 'Arroz, azucar, aceite' }],
  }],
});
```

```salida
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "51999000111",
  "type": "interactive",
  "interactive": {
    "type": "list",
    "body": { "text": "Elige una categoria" },
    "action": {
      "button": "Ver categorias",
      "sections": [{
        "title": "Categorias",
        "rows": [{ "id": "cat:abarrotes", "title": "Abarrotes", "description": "Arroz, azucar, aceite" }]
      }]
    }
  }
}
```

(El bloque de salida está reformateado en menos líneas para ahorrar espacio; el contenido es el mismo.)

Nota la diferencia de nombres entre el motor y la API: el motor usa `botones`, `titulo`, `secciones` y `filas`; la API usa `buttons`, `title`, `sections` y `rows`. `construirEnvio` es precisamente el traductor, y ese es el motivo por el que el motor no sabe nada de Meta: si Meta cambia un campo, solo tocas `whatsapp.js`.

> [!nota] Cuando el cliente responde
> Al tocar un botón o una fila, el cliente genera un mensaje entrante de tipo `interactive` con `button_reply` o `list_reply`. `parsearEntrada` lo convierte en `{ tipo: 'interactivo', id, titulo }`, y el motor decide según el `id`. Así cierras el ciclo completo: enviar opciones, recibir la elección.

## Enviar varias respuestas en orden

Un turno del motor puede producir varias respuestas (por ejemplo, un texto y luego un menú). El Worker las envía **una por una, esperando cada una**, para que lleguen en el orden correcto:

```js src/worker.js (fragmento)
await enviarMensaje(env, construirLeido(evento.id), llamar).catch((e) => console.error(e.message));
for (const respuesta of respuestas) {
  await enviarMensaje(env, construirEnvio(evento.de, respuesta), llamar);
}
```

Antes marca el mensaje del cliente como leído (los dos checks azules) con `construirLeido`; si eso falla, solo se registra y no se interrumpe la respuesta, porque es un detalle cosmético. Si lanzaras todas las peticiones a la vez con `Promise.all`, podrían llegar desordenadas.

## Cuando algo falla: errores comunes

Cuando la API rechaza una petición, responde con un código HTTP y un JSON con un objeto `error` que incluye `message` y un `code`. La [página oficial de códigos de error de WhatsApp](https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes) lista cientos; estos son los que más verás al empezar:

| Código | Qué significa (según la documentación) | Qué hacer |
|---|---|---|
| `190` | El token de acceso venció o no es válido | Genera un token nuevo (lección 12) |
| `100` | Parámetros no admitidos o mal escritos | Revisa nombres y formato del cuerpo |
| `131047` | Pasaron más de 24 horas desde la última respuesta del cliente | Envía una plantilla ([lección 17](../17-plantillas/)) |
| `131026` | El mensaje no se pudo entregar (número sin WhatsApp, términos sin aceptar, cliente desactualizado) | Pide al cliente que confirme que puede escribirte |
| `131051` | Tipo de mensaje no soportado | Usa un tipo admitido |
| `130429` | Alcanzaste el límite de velocidad de la Cloud API | Espera o reduce el ritmo |
| `131056` | Demasiados mensajes en poco tiempo al mismo destinatario | Espera y reintenta solo para ese cliente |
| `132000` | Faltan o sobran valores de variables en la plantilla | Pasa todos los parámetros que la plantilla define |

El error de token lo viste en la lección 13. Esto fue lo que el código del curso registró con un token falso (real, ejecutado con el Worker):

```salida
WhatsApp respondió 401: Invalid OAuth access token - Cannot parse access token
```

Nota que muestra el **estado HTTP** y el **mensaje**, pero ni rastro del token.

> [!importante] Verifica este dato
> Hay otro error muy frecuente al usar el número de prueba: intentar escribir a un destinatario que no registraste en el panel. En muchos tutoriales aparece como código `131030`, pero la página de errores que consulté al escribir esta lección no lo detallaba. Búscalo en la [lista oficial](https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes) antes de basarte en él, y si tu error trae otro código, confía en el `message` de la respuesta.

Una regla práctica para decidir qué hacer con un error:

- **No reintentes** los errores de petición (`100`, `131051`, `132000`): el cuerpo está mal y fallará siempre.
- **No reintentes** `190` hasta renovar el token.
- **Reintenta con espera** los de límite de velocidad (`130429`, `131056`).
- **Cambia de estrategia** con `131047`: pasa de texto libre a plantilla.

## Una respuesta 200 no significa «entregado»

Cuando `enviarMensaje` devuelve datos sin lanzar error, solo sabes que Meta **aceptó** tu petición. La documentación oficial lo dice así: la respuesta únicamente confirma que la API aceptó el pedido, y la entrega real se informa por webhook. Un mensaje aceptado puede fallar después (por ejemplo, el cliente cambió de número o no tiene conexión mucho tiempo). Por eso el Worker registra los eventos de estado `failed` con su lista de errores:

```js src/worker.js (fragmento)
else if (evento.tipo === 'estado' && evento.estado === 'failed') console.error('Mensaje fallido', evento.id, evento.errores);
```

Más adelante, las lecciones de [memoria](../15-memoria-con-kv/) y [pruebas y errores](../23-pruebas-y-errores/) usarán estos estados para reintentar o avisar al dueño.

## Errores frecuentes

- **Mandar más de tres botones.** Pasa a una lista: el límite es de 3 botones de respuesta.
- **Títulos demasiado largos.** 20 caracteres en botones y 24 en filas de lista; acorta o mueve el detalle a la descripción.
- **Usar el título del botón como identificador.** El título cambia con el idioma o el diseño; decide siempre por el `id`.
- **Enviar en paralelo varias respuestas.** Pueden llegar desordenadas; envíalas en secuencia.
- **Reintentar a ciegas.** Un error de formato o de token se repetirá infinitamente; clasifica antes de reintentar.
- **Dar por entregado un 200.** Revisa los estados del webhook.
- **Registrar el token en logs.** Al construir mensajes de error, nunca incluyas cabeceras ni credenciales.

## Apuntes para llevar

- Enviar es un `POST` a `graph.facebook.com/<versión>/<PHONE_NUMBER_ID>/messages` con `Authorization: Bearer`.
- `construirEnvio` traduce las respuestas del motor (texto, botones, lista) al cuerpo de la API y valida los límites antes de enviar.
- Máximo 3 botones de respuesta; para más opciones, una lista (hasta 10 filas).
- Decide por el **id** de botones y filas, no por su título.
- Envía las respuestas en orden, una por una.
- Clasifica los errores: algunos se corrigen, otros se reintentan y otros piden una plantilla.
- Un `200` solo significa que Meta aceptó el mensaje; la entrega la dicen los estados del webhook.

## Glosario

| Término | Significado |
|---|---|
| Graph API | API de Meta a la que se envían los mensajes de WhatsApp. |
| Phone Number ID | Identificador del número que envía; va en la ruta de la petición. |
| Bearer token | Esquema de la cabecera Authorization que lleva el token de acceso. |
| Botón de respuesta | Opción tocable (máximo 3) bajo un mensaje interactivo. |
| Lista | Mensaje con un botón que despliega hasta 10 filas organizadas en secciones. |
| wamid | Identificador que WhatsApp asigna a cada mensaje. |
| Estado de mensaje | Aviso posterior de entrega: sent, delivered, read o failed. |
| Límite de velocidad | Tope de mensajes por periodo que Meta permite a tu número. |

```quiz
? ¿Dónde viaja el token de acceso en la petición de envío?
- En la URL como parámetro público
+ En la cabecera Authorization: Bearer
- Dentro del texto del mensaje
- En el nombre del número
= La API usa el esquema Bearer en la cabecera Authorization.

? Quieres ofrecer 6 categorías de productos. ¿Qué tipo de mensaje usas?
- Seis botones de respuesta
+ Una lista, porque los botones admiten máximo 3
- Un texto largo sin interacción
- Una plantilla de autenticación
= Los botones de respuesta están limitados a tres; la lista admite hasta 10 filas.

? Tu código lanza "título de botón de más de 20 caracteres". ¿Qué ocurrió?
- Meta rechazó el mensaje
+ construirEnvio detectó el límite antes de llamar a la API
- El token venció
- El cliente bloqueó el número
= La validación local evita una llamada inútil y da un error legible.

? Recibes el error 131047. ¿Qué significa y qué haces?
- El token venció; generas otro
+ Pasaron más de 24 horas desde la última respuesta del cliente; envías una plantilla
- Hay demasiados mensajes; esperas un minuto
- El tipo de mensaje no existe
= Fuera de la ventana de 24 horas solo se permiten plantillas aprobadas.

? enviarMensaje devolvió un id wamid sin errores. ¿Qué garantiza?
- Que el cliente leyó el mensaje
+ Solo que Meta aceptó la petición; la entrega se confirma con los estados del webhook
- Que el cliente respondió
- Que no habrá más errores
= Un mensaje aceptado puede fallar después; escucha los estados sent, delivered, read y failed.
```

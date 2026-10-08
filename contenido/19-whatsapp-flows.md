---
titulo: Formularios dentro de WhatsApp con Flows
resumen: Qué son los WhatsApp Flows, cómo es su JSON, cómo se envían y se leen sus respuestas, cuándo hace falta un endpoint y cuándo bastan botones.
minutos: 60
nivel: avanzado
objetivos:
- Explicar qué es un Flow y en qué se diferencia de botones, listas y texto libre.
- Leer y escribir el JSON de un Flow de dos pantallas, con campos, `navigate` y `complete`.
- Construir el mensaje que abre un Flow y leer la respuesta (`nfm_reply`) que llega al webhook.
- Distinguir un Flow sin endpoint de uno con endpoint y saber qué exige este último (cifrado, respuestas rápidas).
- Decidir con criterio cuándo usar un Flow y cuándo basta con botones o texto.
fuentes:
- WhatsApp Flows (Meta) | https://developers.facebook.com/docs/whatsapp/flows
---
## El problema: pedir tres datos por chat es incómodo

En la [lección 8](../08-flujo-de-pedido/) el bot pide los datos del delivery uno por uno: «¿Zona?», «¿Dirección?», «¿Referencia?». Funciona, pero tiene un costo real: cada pregunta es un mensaje, el cliente puede responder fuera de orden, escribir la dirección en el campo de la zona o abandonar a la mitad. Y si el bot necesita seis datos, la conversación se vuelve un interrogatorio.

Un **WhatsApp Flow** resuelve justo eso: es un **formulario con pantallas que se abre dentro del chat**, con campos de texto, listas desplegables, casillas, selectores de fecha, y un botón de enviar. El cliente lo llena de una vez, ve los errores en el mismo formulario y, al terminar, tu bot recibe **todos los datos juntos** en un solo mensaje.

```flujo
Bot|envía el mensaje con Flow
-> botón "Pedir delivery"
Cliente|llena el formulario
-> enviar
Webhook|recibe nfm_reply
-> datos juntos
Bot|continúa el pedido
```

Un Flow **no reemplaza** al bot: es una herramienta más, como los botones. Útil sobre todo para reservas, solicitudes de cotización, encuestas y pedidos con varios datos.

> [!importante] Verifica este dato
> Los Flows evolucionan rápido: aparecen componentes nuevos, cambian las versiones del JSON y los requisitos de la cuenta. Todo lo de esta lección se contrastó con la [documentación oficial de Flows](https://developers.facebook.com/docs/whatsapp/flows/gettingstarted) el 2026-10-07. Antes de construir, confirma la versión actual del Flow JSON y los requisitos de tu cuenta en esa documentación.

## Flows frente a botones, listas y texto libre

Ya conoces tres formas de interactuar. Este es el mapa:

| Herramienta | Ideal para | Límite |
|---|---|---|
| **Texto libre** | Que el cliente diga lo que quiere con sus palabras | Hay que interpretarlo ([lección 6](../06-entender-texto-libre/)) |
| **Botones de respuesta** | Elegir entre 1 y 3 opciones | Máximo 3 botones |
| **Lista** | Elegir entre hasta 10 opciones | Una sola elección por mensaje |
| **Flow** | Reunir varios datos con validación | Más trabajo: diseñar, probar, mantener |

Una regla práctica para decidir:

- **1 o 2 datos y sin validación especial:** botones o preguntas sueltas. Un Flow es demasiado.
- **3 o más datos relacionados** (zona + dirección + referencia, o fecha + hora + servicio): un Flow.
- **Datos que solo tu servidor puede validar** (¿hay cobertura en esa zona?, ¿hay cupo en esa hora?): Flow con endpoint.

En el ejercicio escribirás esa regla como una función. No te enamores del Flow por ser vistoso: **un bot sencillo que funciona bate a un Flow elaborado que nadie mantiene**.

## Las dos formas de Flow: sin endpoint y con endpoint

Esta es la decisión técnica más importante.

**Flow sin endpoint.** Todo el comportamiento vive en el JSON del Flow. Las pantallas se navegan solas, los campos se validan con lo que ofrece el propio formulario (campo obligatorio, tipo de entrada) y al terminar, WhatsApp te manda los datos por el webhook. **No tienes que programar un servidor extra.** Es suficiente para el 80 % de los formularios.

**Flow con endpoint.** Cada vez que el cliente pasa de pantalla, WhatsApp llama a una URL tuya (el *endpoint*) para preguntar «¿qué muestro ahora?». Sirve cuando las pantallas dependen de datos dinámicos: horarios disponibles hoy, stock, cobertura de una dirección. A cambio exige:

- Un servidor que responda **rápido**, con una estructura de petición y respuesta fija.
- **Cifrado**: las peticiones llegan cifradas y las respuestas deben cifrarse (el estándar descrito en la documentación usa RSA-OAEP con SHA-256 para la clave y AES-GCM para los datos).
- Una respuesta al «ping» de salud que WhatsApp envía de vez en cuando.

```flujo
Flow|pantalla DATOS
-> data_exchange
Tu endpoint|valida la zona
-> siguiente pantalla
Flow|pantalla RESUMEN
```

> [!nota] Empieza sin endpoint
> En el curso construimos el Flow **sin endpoint**: aprendes el formato sin la complejidad del cifrado. Cuando tengas un caso real que lo necesite, lee la guía oficial de [implementación del endpoint](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/implementingyourflowendpoint) y reserva una jornada para pruebas. El código de referencia del curso **no incluye** un endpoint de Flows.

## El JSON de un Flow

Un Flow se describe con un JSON: una lista de **pantallas** y, dentro de cada una, una lista de **componentes**. Este es el Flow de «datos de delivery» del minimarket, ejecutado y validado con la función que escribirás en el ejercicio:

```json flow-delivery.json
{
  "version": "5.1",
  "screens": [
    {
      "id": "DATOS",
      "title": "Datos de entrega",
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          { "type": "TextHeading", "text": "Dónde te lo llevamos" },
          { "type": "Dropdown", "name": "zona", "label": "Zona", "required": true,
            "data-source": [
              { "id": "Urb. Los Olivos", "title": "Urb. Los Olivos" },
              { "id": "Urb. Las Palmeras", "title": "Urb. Las Palmeras" },
              { "id": "Centro", "title": "Centro" }
            ] },
          { "type": "TextInput", "name": "direccion", "label": "Dirección", "input-type": "text", "required": true },
          { "type": "TextInput", "name": "referencia", "label": "Referencia", "input-type": "text", "required": false },
          { "type": "Footer", "label": "Continuar",
            "on-click-action": {
              "name": "navigate",
              "next": { "type": "screen", "name": "RESUMEN" },
              "payload": { "zona": "${form.zona}", "direccion": "${form.direccion}", "referencia": "${form.referencia}" }
            } }
        ]
      }
    },
    {
      "id": "RESUMEN",
      "title": "Confirma",
      "terminal": true,
      "success": true,
      "data": {
        "zona": { "type": "string", "__example__": "Centro" },
        "direccion": { "type": "string", "__example__": "Av. Ejemplo 123" },
        "referencia": { "type": "string", "__example__": "Frente al parque" }
      },
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          { "type": "TextBody", "text": "Entregamos en ${data.zona}: ${data.direccion}" },
          { "type": "Footer", "label": "Enviar datos",
            "on-click-action": {
              "name": "complete",
              "payload": { "zona": "${data.zona}", "direccion": "${data.direccion}", "referencia": "${data.referencia}" }
            } }
        ]
      }
    }
  ]
}
```

Lectura guiada:

- **`version`**: la versión del formato del Flow JSON. Aquí usamos `"5.1"`, que sigue estando soportada para Flows de envío, pero el [registro de cambios oficial](https://developers.facebook.com/docs/whatsapp/flows/changelogs) (actualizado el 7 de noviembre de 2025) recomienda la **7.3**. Para un Flow real, parte de la versión recomendada y comprueba que cada componente que uses exista en ella; el `flow_message_version` recomendado sigue siendo `"3"`. Verifica la versión vigente en la [referencia del Flow JSON](https://developers.facebook.com/docs/whatsapp/flows/reference/flowjson).
- **`screens`**: la lista de pantallas. Cada una tiene un `id` único (en mayúsculas y con guiones bajos, por convención) y un `layout`.
- **`layout` y `children`**: el layout `SingleColumnLayout` apila los componentes en una columna. Los hijos son los componentes visibles.
- **Componentes de texto** (`TextHeading`, `TextBody`): muestran información.
- **Componentes de entrada** (`TextInput`, `Dropdown`, ...): cada uno lleva un `name`. Ese nombre es la **clave** con la que llegará el dato. `"required": true` impide continuar con el campo vacío.
- **`Footer`**: el botón de la parte inferior. Su `on-click-action` dice qué pasa al tocarlo.
- **`navigate`**: va a otra pantalla (`next`) y le pasa datos con `payload`. La sintaxis `${form.zona}` significa «el valor del campo `zona` de esta pantalla».
- **`complete`**: termina el Flow y envía el `payload` al webhook. Solo se usa en la pantalla final, marcada `"terminal": true`.
- **`data` en la pantalla `RESUMEN`**: declara qué datos recibe la pantalla desde la anterior (con un `__example__` para la vista previa del constructor) y se leen como `${data.zona}`.

> [!importante] Verifica este dato
> Los nombres exactos de las propiedades de cada componente (`data-source`, `input-type`, `__example__`, etc.) deben contrastarse con la [referencia de componentes](https://developers.facebook.com/docs/whatsapp/flows/reference/components) de Meta. Pega el JSON en el **Flow Builder** de WhatsApp Manager: te marcará con claridad qué propiedad no acepta tu versión.

### Validar el JSON antes de subirlo

Un error típico: una pantalla terminal sin `Footer`, o un `navigate` hacia un `id` mal escrito. Subir el Flow solo para descubrirlo es lento. Con una función de unas veinte líneas (la `validarFlow` de tu ejercicio) lo detectas en local. Resultado real al validar el Flow anterior y una versión con dos errores introducidos a propósito:

```salida
[]
["navigate hacia una pantalla inexistente: RESUMN","La pantalla terminal RESUMEN no tiene Footer"]
```

El primer arreglo vacío significa «sin errores». El segundo muestra los dos fallos que se inyectaron: un `id` mal escrito (`RESUMN`) y la eliminación del `Footer` final. Esta validación **no sustituye** al Flow Builder (que valida las reglas oficiales completas), solo te ahorra viajes.

## Enviar el Flow al cliente

El Flow se envía como un **mensaje interactivo** de tipo `flow`. Es un mensaje normal de la API, así que **solo puedes enviarlo dentro de la ventana de 24 horas** (como los botones) o dentro de una **plantilla** si quieres abrirlo fuera de ella. Para el caso del minimarket el cliente ya está conversando, así que usamos el mensaje libre. Este es el cuerpo que genera la función `armarMensajeFlow` del ejercicio:

```json mensaje-flow.json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "51999000111",
  "type": "interactive",
  "interactive": {
    "type": "flow",
    "body": { "text": "Completa tus datos de entrega." },
    "action": {
      "name": "flow",
      "parameters": {
        "flow_message_version": "3",
        "flow_token": "tok-ejemplo-9f3a",
        "flow_id": "123456",
        "flow_cta": "Pedir delivery",
        "flow_action": "navigate",
        "flow_action_payload": { "screen": "DATOS" }
      }
    }
  }
}
```

Los parámetros que importan, según la [guía de envío de Flows](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/sendingaflow):

| Parámetro | Para qué sirve |
|---|---|
| `flow_message_version` | Debe ser `"3"` |
| `flow_id` (o `flow_name`) | El Flow que se abre; usa uno de los dos, no ambos |
| `flow_token` | Un identificador **que generas tú** para reconocer esta conversación cuando vuelva la respuesta |
| `flow_cta` | Texto del botón que abre el formulario; la documentación aconseja **30 caracteres o menos y sin emojis** |
| `flow_action` | `navigate` (abre una pantalla) o `data_exchange` (consulta primero tu endpoint) |
| `flow_action_payload.screen` | El `id` de la primera pantalla |
| `mode` | `draft` para probar el borrador, `published` (por omisión) para el Flow publicado |

El **`flow_token`** merece atención. Piensa en él como un **ticket**: lo generas cuando envías el Flow (por ejemplo, ligado al teléfono y al pedido en curso, con una parte aleatoria) y lo guardas. Cuando llegue la respuesta, lo comparas: si no coincide, **ignoras** el mensaje. Así evitas que alguien rellene un Flow viejo o ajeno. Más sobre este tipo de defensas en la [lección 24](../24-seguridad-y-privacidad/).

> [!importante] Verifica este dato
> Para enviar Flows la documentación menciona prerequisitos de la cuenta (verificación del negocio y calidad de mensajes) y que un Flow debe estar **publicado** para usarse en producción. Confírmalos en la [guía de envío](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/sendingaflow). Mientras practicas, `mode: "draft"` permite probar el borrador.

## La respuesta: `nfm_reply` en tu webhook

Cuando el cliente toca «Enviar datos», tu webhook recibe un mensaje entrante **interactivo** distinto a los de botones y listas. Su `interactive.type` es `nfm_reply` y los datos llegan en `response_json`, **como texto** (un JSON dentro de un JSON). Un ejemplo:

```json
{
  "from": "51999000111",
  "id": "wamid.X",
  "timestamp": "1790000000",
  "type": "interactive",
  "interactive": {
    "type": "nfm_reply",
    "nfm_reply": {
      "name": "flow",
      "body": "Sent",
      "response_json": "{\"flow_token\":\"tok-ejemplo-9f3a\",\"zona\":\"Centro\",\"direccion\":\"Av. Ejemplo 123\",\"referencia\":\"Frente al parque\"}"
    }
  }
}
```

> [!importante] Verifica este dato
> La estructura exacta de `nfm_reply` y de `response_json` no estaba en las páginas de documentación que se pudieron consultar para escribir esta lección. El ejemplo sigue el formato más habitual en la práctica. Confírmalo con la [documentación de webhooks de Flows](https://developers.facebook.com/documentation/business-messaging/whatsapp/flows/guides/flowswebhooks) y con un envío real de prueba.

### ¿Qué hace hoy el bot de referencia con eso?

Esta es la parte honesta: el `parsearWebhook` del repositorio **no conoce** `nfm_reply`. Lo trata como «no soportado». Lo comprobé con el mensaje anterior:

```salida
{"tipo":"no_soportado","subtipo":"interactive:nfm_reply"}
```

Eso es lo correcto por diseño (el bot no se rompe ante algo desconocido), pero significa que, para usar Flows, tienes que añadir soporte. La idea es convertir el mensaje en una entrada nueva del motor. Esta adaptación, ejecutada con el mismo mensaje, produce:

```js adaptar-flow.mjs
function adaptar(evento, msgCrudo) {
  if (evento.entrada.subtipo !== 'interactive:nfm_reply') return evento;
  const datos = JSON.parse(msgCrudo.interactive.nfm_reply.response_json);
  return { ...evento, entrada: { tipo: 'flow', datos } };
}
```

```salida
{"tipo":"flow","datos":{"flow_token":"tok-ejemplo-9f3a","zona":"Centro","direccion":"Av. Ejemplo 123"}}
```

En tu proyecto lo harías **dentro** de `parsearEntrada` (en `whatsapp.js`) y con `try/catch`: el cliente controla ese JSON, así que puede llegar roto. La función `leerRespuestaFlow` del ejercicio ya hace eso y devuelve `null` si algo no cuadra.

## Validar siempre en tu servidor

Hay una regla que debes grabarte: **los datos de un Flow son entrada del usuario, igual que un texto escrito**. Que el formulario marque «obligatorio» no significa que el dato sea válido: un cliente malicioso puede enviar un `response_json` armado a mano. Por eso, al recibir la respuesta:

1. Comprueba el `flow_token` contra el que guardaste.
2. Valida cada campo como si viniera de texto libre.
3. Si algo falla, vuelve a pedir ese dato con un mensaje normal.

En el minimarket eso es `validarDatosDelivery`: la zona debe estar en `NEGOCIO.zonas` y la dirección debe tener al menos 8 caracteres (la misma regla que ya aplica el motor). Resultado real con las zonas ficticias del curso:

```salida
{"ok":true}
{"ok":false,"error":"Esa zona no tiene reparto."}
{"ok":false,"error":"La direccion es muy corta."}
```

El orden de las comprobaciones es: **token, zonas, dirección, y solo entonces** el siguiente paso del pedido (pago, confirmación). Si alguna falla, el bot responde en la conversación con un texto claro, sin emojis, y sin perder el carrito.

## Cómo encaja un Flow en el motor del minimarket

El motor de reglas es una máquina de estados ([lección 5](../05-estado-de-la-conversacion/)). Un Flow es **un estado más** con su propia entrada. El recorrido de delivery quedaría así:

1. El cliente elige «Delivery». El motor pasa al estado `DIRECCION` y responde con el **mensaje de Flow** (en vez de preguntar «¿cuál es tu dirección?»).
2. El cliente llena el formulario. Llega `nfm_reply` → entrada `{ tipo: 'flow', datos }`.
3. El motor valida (`validarDatosDelivery`). Si es válido, guarda `entrega: 'delivery'`, `direccion` y pasa a `PAGO`. Si no, vuelve a pedir ese dato.
4. **Plan B:** si el cliente nunca abre el Flow o prefiere escribir, el bot debe aceptar también la dirección como **texto libre**. No todos los clientes (ni todas las versiones de WhatsApp) soportan Flows igual de bien.

Ese plan B es una regla de diseño: **todo Flow necesita una ruta alternativa con botones o texto**. Un bot cuyo único camino es un formulario falla justo cuando alguien lo necesita.

## Cuánto cuesta y qué mantener

Tres puntos que condicionan la decisión de usar Flows en un proyecto real:

- **Mantenimiento.** Cada Flow es un JSON que versionas y pruebas. Si cambias un `name` de campo, debes cambiar el código que lo lee; se rompe en silencio. Guarda el JSON en tu repositorio y escribe una prueba con `validarFlow`.
- **Pruebas.** El Flow Builder de Meta ofrece vista previa; el cifrado del endpoint exige pruebas con la herramienta de Meta. Planifica horas, no minutos.
- **Costo.** Cómo se factura el uso de Flows y de los mensajes que los llevan cambia con el tiempo. Revisa la [página de precios](https://developers.facebook.com/docs/whatsapp/pricing) y la [lección 21](../21-costos-y-metricas/) antes de ofrecerlo a un cliente.

> [!ejemplo] Cuándo SÍ y cuándo NO en el minimarket
> **Sí:** pedido de delivery con zona, dirección, referencia y hora de entrega (cuatro datos relacionados). **Sí:** encuesta de satisfacción de cuatro preguntas. **No:** «¿recojo o delivery?» (un botón basta). **No:** «¿efectivo, Yape o transferencia?» (tres botones). **No:** consultar el horario (un texto).

## Errores frecuentes

- **Usar un Flow para todo.** Más pantallas no son más profesionalismo. Si 2 botones resuelven, usa 2 botones.
- **No validar la respuesta.** `required: true` es comodidad para el cliente, no seguridad para ti.
- **Olvidar el plan B.** Sin ruta alternativa, el cliente que no puede abrir el Flow queda varado.
- **Cambiar un `name` de campo y no actualizar el código.** El dato llega con otra clave y el bot cree que falta.
- **Pantalla terminal sin `Footer` o `navigate` hacia un id mal escrito.** El Flow Builder lo marca y tu `validarFlow` también.
- **Confiar en un `flow_token` predecible.** Debe ser único y difícil de adivinar.
- **Meter un endpoint sin necesitarlo.** El cifrado y las pruebas añaden trabajo; empieza sin endpoint.
- **Emojis y textos largos en el botón.** La documentación aconseja un CTA de 30 caracteres o menos y sin emojis.

## Apuntes para llevar

- Un **Flow** es un formulario con pantallas dentro del chat; el bot recibe todos los datos **juntos** al terminar.
- Úsalo con **3 o más datos** relacionados; con 1 o 2, botones o preguntas sueltas.
- **Sin endpoint:** todo en el JSON, ideal para empezar. **Con endpoint:** pantallas dinámicas, a cambio de cifrado y respuestas rápidas.
- El JSON: `screens` con `id` único, `layout`, componentes con `name`, `Footer` con `navigate` o `complete`, y pantalla final `terminal`.
- Se envía como mensaje interactivo `flow` con un **`flow_token`** que generas tú; la respuesta llega como `nfm_reply` con `response_json` **en texto**.
- Los datos del Flow son **entrada de usuario**: valídalos en tu servidor y ten siempre un plan B con botones o texto.
- Versión del JSON, componentes y costos cambian: verifica en la documentación oficial de Meta.

## Glosario

| Término | Significado |
|---|---|
| Flow | Formulario con pantallas que se abre dentro de una conversación de WhatsApp. |
| Flow JSON | Descripción en JSON de las pantallas y componentes de un Flow. |
| Endpoint | URL de tu servidor a la que el Flow consulta datos pantalla a pantalla (opcional). |
| `navigate` | Acción que lleva a otra pantalla del Flow pasando datos. |
| `complete` | Acción que cierra el Flow y envía las respuestas al webhook. |
| `flow_token` | Identificador que generas tú para reconocer a qué conversación pertenece una respuesta. |
| `nfm_reply` | Tipo de mensaje entrante que contiene las respuestas del Flow. |
| `response_json` | Texto JSON con los valores que llenó el cliente. |

```quiz
? ¿Cuándo conviene más un Flow que unas preguntas sueltas con botones?
- Cuando solo hay que elegir entre «recojo» y «delivery»
+ Cuando hay tres o más datos relacionados que se pueden reunir y validar en un solo formulario
- Cuando el cliente escribe en texto libre
- Cuando quieres evitar el cobro por mensajes
= Un Flow vale la pena para varios datos juntos; para uno o dos, botones son más simples.

? ¿Cómo llegan al webhook los datos que el cliente llenó en un Flow?
- Meta los envía a tu correo
+ Como un mensaje interactivo `nfm_reply` cuyo `response_json` es un texto con los valores
- Como una imagen del formulario
- Tu bot los consulta cada minuto en la API
= La respuesta llega por el webhook como `nfm_reply`, y `response_json` viene como texto que hay que convertir con `JSON.parse`.

? ¿Qué diferencia a un Flow con endpoint de uno sin endpoint?
- El que tiene endpoint no necesita pantallas
+ En el de endpoint, WhatsApp consulta tu servidor en cada paso (con cifrado) para decidir qué mostrar; el otro se resuelve solo con el JSON
- El que no tiene endpoint no puede enviar datos al bot
- Ninguna, solo cambia el precio
= El endpoint sirve para datos dinámicos (cupos, cobertura) y exige cifrado y respuestas rápidas.

? ¿Para qué sirve el `flow_token`?
- Para pagar el mensaje
+ Para reconocer a qué conversación o pedido corresponde una respuesta y descartar las que no coinciden
- Para dar permiso a Meta de leer los mensajes
- Para elegir el idioma del formulario
= Es un identificador que generas tú, difícil de adivinar, y que comparas al recibir la respuesta.

? Un campo marcado `required: true` en el Flow, ¿te exime de validar el dato en tu servidor?
- Sí, el formulario ya garantiza que es correcto
+ No: un cliente puede enviar datos armados a mano, así que validas siempre como si fuera texto libre
- Solo si el Flow tiene endpoint
- Solo si el campo es una lista desplegable
= Los datos del Flow son entrada del usuario y deben validarse en tu servidor.

? ¿Qué debe tener todo bot que use un Flow además del formulario?
- Un segundo número de WhatsApp
+ Una ruta alternativa con botones o texto por si el cliente no puede o no quiere usar el formulario
- Un endpoint cifrado
- Un emoji en el botón
= Un plan B evita dejar varado al cliente cuyo WhatsApp no soporta el Flow o que prefiere escribir.
```

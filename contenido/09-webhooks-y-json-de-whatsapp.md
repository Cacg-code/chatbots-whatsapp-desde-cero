---
titulo: Webhooks y JSON de WhatsApp
resumen: Cómo Meta te entrega los mensajes: forma del JSON, parser que lo convierte en eventos simples, verificación GET del webhook y firma HMAC-SHA256.
minutos: 60
nivel: intermedio
objetivos:
- Describir el recorrido de un webhook de WhatsApp y qué trae el JSON de un mensaje de texto, de un botón y de un estado.
- Leer un payload anidado con seguridad y convertirlo en eventos simples con `parsearWebhook`.
- Explicar y probar el handshake de verificación (`hub.mode`, `hub.verify_token`, `hub.challenge`).
- Calcular y comprobar la firma `X-Hub-Signature-256` con HMAC-SHA256 sobre el cuerpo crudo.
- Justificar por qué un servidor de bot debe ignorar con elegancia todo lo que no entiende.
---
## Del bot en consola al bot que escucha

Hasta la [lección 8](../08-flujo-de-pedido/) tu bot vivía en tu terminal: tú escribías una línea y el motor (`procesar(sesion, entrada)`) devolvía respuestas. Para que lo use un cliente real falta una pieza: algo que reciba lo que Meta le entrega y lo convierta en la `entrada` que el motor entiende.

Meta no le entrega los mensajes a tu bot «preguntándole». Hace lo contrario: **te llama él a ti**. Cada vez que un cliente escribe, los servidores de Meta hacen una petición `POST` a una dirección de tu servidor. Esa dirección se llama **webhook** (en español, «gancho web»). Es el mismo patrón de cualquier servicio que avisa de un evento: tú das una URL y ellos llaman cuando pasa algo.

```flujo
Cliente|escribe "Quiero 2 leches"
-> mensaje
Meta|WhatsApp Cloud API
-> POST /webhook + JSON
Tu servidor|verifica, parsea
-> entrada del motor
Motor|procesar()
```

En esta lección trabajamos la **mitad de entrada**: qué JSON llega, cómo leerlo sin que el servidor se caiga, cómo demostrar que viene de Meta y no de un impostor. La mitad de salida (enviar) la verás en la [lección 14](../14-enviar-mensajes/), y todo ensamblado en un servidor en la [lección 10](../10-servidor-del-bot/).

Todo el código de esta lección vive en `src/whatsapp.js` del proyecto de referencia, y se prueba con los archivos de `test/payloads/`. No necesitas cuenta de Meta: trabajaremos con los mismos ejemplos que usa la documentación oficial.

> [!importante] Verifica este dato
> La forma exacta de los payloads (nombres de campos, tipos de mensaje nuevos) la define Meta y puede ampliarse. Los ejemplos de esta lección se contrastaron el 2026-10-07 con la [documentación oficial de payloads](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples). Si algo no coincide con lo que recibes, la documentación manda.

## Anatomía de un payload de mensaje

Un webhook de WhatsApp es un JSON **muy anidado**. Este es el que usamos como ejemplo (`test/payloads/texto.json`): el cliente escribió «Quiero 2 leches».

```json texto.json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "102290129340398",
    "changes": [{
      "field": "messages",
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "51999000222",
          "phone_number_id": "106540352242922"
        },
        "contacts": [{ "profile": { "name": "Cliente Ejemplo" }, "wa_id": "51999000111" }],
        "messages": [{
          "from": "51999000111",
          "id": "wamid.TEXTO001",
          "timestamp": "1791360000",
          "text": { "body": "Quiero 2 leches" },
          "type": "text"
        }]
      }
    }]
  }]
}
```

(Está recortado en espacios para que quepa; el archivo del repositorio tiene el mismo contenido.) Lee de afuera hacia adentro:

| Campo | Qué significa |
|---|---|
| `object` | Siempre `"whatsapp_business_account"` para esta API. Si es otra cosa, no es para ti. |
| `entry[]` | Una lista: Meta puede agrupar varias cuentas o varios cambios en una sola llamada. |
| `changes[].field` | Qué cambió. Para mensajes y estados es `"messages"`; otros campos existen (plantillas, calidad del número…) y los ignoraremos. |
| `value.metadata.phone_number_id` | El **id interno** de tu número de negocio (no es el teléfono). Lo usarás para responder. |
| `value.contacts[]` | Datos del cliente: su `wa_id` (su teléfono) y el nombre de perfil. |
| `value.messages[]` | Los mensajes nuevos. También es una lista. |
| `messages[].from` | Teléfono del cliente, con código de país y sin `+`. |
| `messages[].id` | Identificador único del mensaje (`wamid.…`). Clave para evitar duplicados. |
| `messages[].timestamp` | Segundos Unix, **como texto**: `"1791360000"`. |
| `messages[].type` | `text`, `interactive`, `image`, `audio`, `unsupported`… |

Fíjate en que casi todo son **listas**. No hay garantía de que `messages` tenga un solo elemento, ni de que `entry` tenga uno. Tu código debe recorrerlas siempre.

> [!nota] Los números de teléfono del curso
> `51999000111` (cliente) y `51999000222` (negocio) son números inventados, claramente falsos. Usa siempre rangos así en tus ejemplos y pruebas: nunca pegues teléfonos reales de clientes en el código ni en un repositorio.

## Cuatro formas de «mensaje» y los estados

El mismo sobre (`entry/changes/value`) transporta cosas distintas. En el proyecto hay un archivo por cada caso en `test/payloads/`:

| Archivo | Qué representa |
|---|---|
| `texto.json` | El cliente escribió un texto. |
| `boton.json` | El cliente tocó un botón de respuesta (`type: "interactive"`, `button_reply`). |
| `lista.json` | El cliente eligió una fila de una lista (`list_reply`). |
| `imagen.json` | El cliente mandó una foto (`type: "image"`). |
| `no-soportado.json` | Algo que la API no entrega, como una actualización de encuesta (`type: "unsupported"`). |
| `estado-entregado.json` | **No es un mensaje**: Meta avisa que un mensaje *tuyo* se entregó. Viene en `statuses[]`, no en `messages[]`. |
| `estado-fallido.json` | Un envío tuyo falló; trae `errors[]` con el motivo. |

La diferencia más importante: cuando tu bot **envía** un mensaje, Meta te sigue llamando después para decirte qué pasó con él (`sent`, `delivered`, `read`, `failed`). Esas llamadas llegan al mismo webhook. Si tu código asume que *toda* llamada trae un mensaje de cliente, se romperá con la primera confirmación de lectura.

Veamos el cuerpo de un botón pulsado, que es lo que llega cuando el cliente toca «Hacer pedido»:

```json
{ "context": { "from": "51999000222", "id": "wamid.ORIGEN001" },
  "from": "51999000111", "id": "wamid.BOTON001", "timestamp": "1791360010",
  "type": "interactive",
  "interactive": { "type": "button_reply",
                   "button_reply": { "id": "menu_pedir", "title": "Hacer pedido" } } }
```

El campo que importa es `button_reply.id`: es el **mismo id** que tu motor puso en el botón (`menu_pedir`). Por eso en el motor las entradas interactivas se manejan por id y no por el texto visible: el título puede cambiar de idioma o de redacción, el id no.

## parsearWebhook: de JSON anidado a eventos simples

Recorrer `entry → changes → value → messages` en medio del código del bot lo volvería ilegible. La solución es una función **pura** (sin red, sin disco) que haga solo esa traducción. En el proyecto se llama `parsearWebhook(payload)` y devuelve una lista de eventos planos. Su núcleo es este recorrido:

```js src/whatsapp.js
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
        eventos.push({ tipo: 'estado', id: st.id, estado: st.status,
          timestamp: Number(st.timestamp) || null, destinatario: st.recipient_id, errores: st.errors ?? [] });
      }
    }
  }
  return eventos;
}
```

Tres decisiones de diseño merecen atención:

1. **`?.` y `?? []` por todas partes.** Cada nivel puede faltar. Con `valor.messages ?? []` un cambio sin mensajes (por ejemplo solo estados) simplemente no recorre nada, en vez de lanzar un error.
2. **Nunca lanza excepciones por basura.** Si el payload no es de WhatsApp, devuelve `[]`. Un servidor público recibe de todo: escáneres, pruebas, versiones nuevas del formato. Un bot que se cae por un campo inesperado es un bot caído para todos sus clientes.
3. **Solo traduce.** No decide qué responder: eso es del motor. La función de traducir el contenido a una `entrada` es esta:

```js src/whatsapp.js
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
    default:
      return { tipo: 'no_soportado', subtipo: msg.type === 'unsupported' ? `unsupported:${msg.unsupported?.type}` : msg.type };
  }
}
```

(En el archivo real hay además un caso `button` para las respuestas rápidas de plantillas, marcado con un comentario `VERIFICAR`; lo retomaremos en la [lección 17](../17-plantillas/).)

Cada tipo que no manejamos se reduce a `{ tipo: 'no_soportado', subtipo }`, y el motor contesta con un texto amable («Por ahora solo entiendo texto y botones»). Así una foto o un audio nunca rompen la conversación.

### Resultado real

Ejecutando `parsearWebhook` sobre cada archivo de `test/payloads/` (Node 24), esto es lo que salió:

```salida
texto            → { tipo:'mensaje', de:'51999000111', nombre:'Cliente Ejemplo', id:'wamid.TEXTO001',
                     timestamp:1791360000, phoneNumberId:'106540352242922',
                     entrada:{ tipo:'texto', texto:'Quiero 2 leches' } }
boton            → ... entrada:{ tipo:'interactivo', id:'menu_pedir', titulo:'Hacer pedido' }
lista            → ... entrada:{ tipo:'interactivo', id:'prod:leche', titulo:'Leche entera 1 L' }
imagen           → ... entrada:{ tipo:'no_soportado', subtipo:'image' }
no-soportado     → ... entrada:{ tipo:'no_soportado', subtipo:'unsupported:poll_update' }
estado-entregado → { tipo:'estado', id:'wamid.SALIDA001', estado:'delivered',
                     timestamp:1791360050, destinatario:'51999000111', errores:[] }
estado-fallido   → { tipo:'estado', id:'wamid.SALIDA002', estado:'failed', timestamp:1791360060,
                     destinatario:'51999000111',
                     errores:[{ code:131047, title:'Re-engagement message', ... }] }
```

(Las líneas con `...` repiten los mismos campos `tipo`, `de`, `nombre`, `id`, `timestamp` y `phoneNumberId` del primer evento; los acorté solo para que quepan.)

Y con basura:

```salida
parsearWebhook({ object: 'x' })        → []
parsearWebhook(null)                   → []
parsearWebhook({ object:'whatsapp_business_account', entry:'raro' })  → []
mensaje sin id ni from                 → []
```

Fíjate en el estado fallido: el código de error `131047` con la explicación «han pasado más de 24 horas desde que el cliente respondió». Es la regla de la ventana de 24 horas de la [lección 1](../01-como-funciona-un-bot/) hablándote directamente. Los códigos de error cambian con el tiempo; consulta la [lista oficial de errores](https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes).

## La verificación GET: «¿este webhook es tuyo?»

Cuando registres tu URL en el panel de Meta (lo harás en la [lección 13](../13-recibir-mensajes-reales/)), Meta no confía a ciegas: antes de empezar a mandarte mensajes, comprueba que **tú controlas esa dirección**. Lo hace con una petición `GET` con tres parámetros:

```text
GET /webhook?hub.mode=subscribe&hub.verify_token=minimarket-123&hub.challenge=1158201444
```

| Parámetro | Quién lo pone | Qué debes hacer |
|---|---|---|
| `hub.mode` | Meta | Debe ser `subscribe`. |
| `hub.verify_token` | Tú, en el panel de Meta, al registrar el webhook | Compararlo con el valor que guardaste en tu servidor (`VERIFY_TOKEN`). |
| `hub.challenge` | Meta (un número al azar) | Devolverlo **tal cual**, como texto, con estado 200. |

El `verify_token` es una frase larga que inventas tú. No es un secreto de Meta: es un acuerdo entre las dos partes («si me llamas con esta frase, soy yo»). Si no coincide, respondes `403` y Meta rechaza el registro. La implementación del proyecto:

```js src/worker.js
function verificarWebhook(url, env) {
  const modo = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const reto = url.searchParams.get('hub.challenge');
  if (modo === 'subscribe' && env.VERIFY_TOKEN && token === env.VERIFY_TOKEN && reto) {
    return new Response(reto, { status: 200 });
  }
  return new Response('Prohibido', { status: 403 });
}
```

Observa `env.VERIFY_TOKEN &&`: si olvidaste configurar la variable, **nadie** pasa la verificación, en vez de «pasar todos porque `undefined === undefined`». Ese es el tipo de detalle que separa un código que funciona de uno seguro.

Probado contra el Worker corriendo en local (lección 10), con los resultados reales:

```salida
GET /webhook?hub.mode=subscribe&hub.verify_token=minimarket-123&hub.challenge=1158201444  →  1158201444 [200]
GET /webhook?hub.mode=subscribe&hub.verify_token=malo&hub.challenge=1                    →  Prohibido [403]
```

> [!nota] El punto sutil de los parámetros con punto
> En una URL, `hub.mode` es el nombre del parámetro, con el punto incluido. Con `URLSearchParams` se lee con `url.searchParams.get('hub.mode')`; no existe «`hub` con propiedad `mode`». En frameworks como Express, algunos transforman los puntos en objetos anidados y rompen la lectura; con la API estándar de `URL` no pasa.

## La firma: «¿este POST viene de Meta?»

La verificación GET ocurre una vez. Pero tu webhook es una **URL pública**: cualquiera que la conozca puede enviarle un `POST` con un JSON inventado que diga «el cliente 51999000111 confirmó un pedido de 500 soles». Necesitas una forma de distinguir el POST auténtico del falso.

Meta la ofrece: **firma cada llamada**. Calcula un **HMAC-SHA256** del cuerpo usando el **App Secret** de tu app (un secreto que solo conocen Meta y tú) y lo envía en la cabecera:

```text
X-Hub-Signature-256: sha256=58646b68861070c92a00276f31a1ab94d217826c2cf997a571b05468af1cc813
```

Un **HMAC** es una «huella» del mensaje que depende de una clave. Quien no conoce la clave no puede producir una huella válida, y si alguien cambia aunque sea una coma del cuerpo, la huella ya no coincide. Tu servidor repite el cálculo con su copia del secreto y compara.

El proyecto lo implementa con la API estándar `crypto.subtle`, que existe tanto en Node como en Cloudflare Workers (sin instalar nada):

```js src/whatsapp.js
export async function verificarFirma(secretoApp, cuerpoCrudo, cabecera) {
  if (!secretoApp || typeof cabecera !== 'string') return false;
  const coincidencia = /^sha256=([0-9a-f]{64})$/i.exec(cabecera.trim());
  if (!coincidencia) return false;
  const clave = await crypto.subtle.importKey(
    'raw', codificador.encode(secretoApp), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
  );
  return crypto.subtle.verify('HMAC', clave, hexABytes(coincidencia[1].toLowerCase()), codificador.encode(cuerpoCrudo));
}
```

Detalles que importan:

- **Formato primero.** Si la cabecera no es `sha256=` seguido de 64 caracteres hexadecimales, ni se calcula nada: es falso.
- **Comparación en tiempo constante.** `crypto.subtle.verify` compara sin «salir temprano» al primer byte distinto. Una comparación ingenua con `===` filtra, por diferencias de milisegundos, cuánto de la firma acertó el atacante. La idea se explica en la [lección 24](../24-seguridad-y-privacidad/).
- **Cuerpo crudo, no el objeto.** La firma se calculó sobre los bytes exactos que mandó Meta. Si haces `JSON.parse` y luego `JSON.stringify`, el texto cambia (espacios, orden) y la firma deja de coincidir.

Hay una función compañera, `firmar`, que calcula la cabecera. Sirve en las pruebas para fabricar peticiones «de Meta». Con el cuerpo de `texto.json` (608 caracteres) y el secreto de ejemplo `secreto`:

```salida
firmar('secreto', cuerpo)                  → sha256=58646b68861070c92a00276f31a1ab94d217826c2cf997a571b05468af1cc813
firmar('secreto', '{}')                    → sha256=9b09d74c60be8d716f80e3db365e4e4f49b2b1a55a3d1d5931e96eb98dde17e9

verificarFirma('secreto', cuerpo, firma)           → true
verificarFirma('otro-secreto', cuerpo, firma)      → false   (secreto distinto)
verificarFirma('secreto', cuerpo + ' ', firma)     → false   (un espacio de más)
verificarFirma('secreto', cuerpo, 'sha256=abc')    → false   (formato inválido)
```

Y para estar seguros de que no nos engañamos a nosotros mismos, contrasté con una herramienta independiente, `openssl`:

```bash
openssl dgst -sha256 -hmac secreto -hex < test/payloads/texto.json
```

```salida
58646b68861070c92a00276f31a1ab94d217826c2cf997a571b05468af1cc813
```

Idéntico. Y este es el error clásico del cuerpo reconstruido, ejecutado de verdad:

```salida
cuerpo original: 608 caracteres
JSON.stringify(JSON.parse(cuerpo)): 438 caracteres
verificarFirma('secreto', reconstruido, firma) → false
```

Mismo contenido para una persona, distintos bytes para el HMAC. Por eso el Worker lee el cuerpo con `await request.text()` y recién después hace `JSON.parse`.

> [!importante] Dónde está el App Secret
> El **App Secret** (secreto de la app) se consulta en el panel de tu app de Meta; el nombre exacto del menú cambia con el tiempo. Trátalo como una contraseña: nunca va en el código ni en Git, sino en una variable secreta (lección [11](../11-despliegue-en-cloudflare/)). Verifica la ubicación y el formato de la firma en la [guía oficial de webhooks](https://developers.facebook.com/docs/graph-api/webhooks/getting-started).

## Qué hacer con lo que no entiendes

Resume la filosofía de esta lección: **un webhook es una puerta pública, y por ella entra de todo**.

| Situación | Respuesta correcta |
|---|---|
| El POST no trae firma o es inválida | `401`, sin procesar nada. |
| El cuerpo no es JSON | `400`. |
| JSON válido pero no es de WhatsApp (`object` distinto) | `200` y no hacer nada (`parsearWebhook` devuelve `[]`). |
| Estados (`sent`, `delivered`, `read`) | `200`; solo registrar los `failed`. |
| Un tipo de mensaje nuevo que no conoces | `no_soportado`; el motor pide texto o botones. |

Hay una razón más para devolver `200` ante lo desconocido: si respondes con error, Meta **reintenta** durante un tiempo, y tu bot recibirá una tormenta de la misma llamada que nunca podrá procesar. «No me sirve, pero la recibí» es respuesta válida.

## Errores frecuentes

- **Verificar la firma sobre el JSON ya parseado.** Se rompe con cualquier diferencia de espacios. Lee el cuerpo como texto crudo.
- **Comparar la firma con `===`.** Funciona, pero filtra información por tiempos. Usa una comparación de tiempo constante como `crypto.subtle.verify`.
- **Suponer que `messages[0]` siempre existe.** Los estados llegan sin `messages`. Recorre listas con `?? []`.
- **Devolver el `hub.challenge` como JSON.** Debe ser el valor en texto plano, no `{"challenge": ...}`.
- **Dejar que `VERIFY_TOKEN` sea `undefined`.** Si no está configurado, `undefined === undefined` podría dejar pasar a cualquiera. Exige que exista.
- **Confundir `phone_number_id` con el teléfono.** El primero es un identificador interno de la API; el teléfono del cliente está en `from`.
- **Tratar `timestamp` como milisegundos.** Meta lo manda en **segundos**, y como texto. Conviértelo con `Number(...)` y multiplica por 1000 cuando compares con `Date.now()`.

## Apuntes para llevar

- En la API oficial, **Meta te llama** (webhook): un `GET` para verificar y un `POST` por cada mensaje o estado.
- El JSON está anidado (`entry → changes → value → messages/statuses`) y casi todo son listas: recórrelas con `?? []`.
- `parsearWebhook` convierte ese JSON en eventos planos (`mensaje` o `estado`) y devuelve `[]` ante basura, sin lanzar errores.
- Verificación GET: si `hub.mode === 'subscribe'` y el token coincide, devuelve `hub.challenge` en texto con 200; si no, 403.
- Firma: HMAC-SHA256 del **cuerpo crudo** con el App Secret, en `X-Hub-Signature-256: sha256=<hex>`, comparada en tiempo constante.
- Los estados (`delivered`, `read`, `failed`) llegan al mismo webhook; los errores, como `131047`, traen la causa.

## Glosario

| Término | Significado |
|---|---|
| Webhook | URL de tu servidor a la que Meta envía eventos mediante peticiones POST. |
| Payload | El cuerpo JSON de una petición; aquí, el aviso de Meta. |
| `wamid` | Identificador único de un mensaje de WhatsApp, útil para evitar duplicados. |
| `phone_number_id` | Identificador interno de tu número de negocio en la API (no es el teléfono). |
| Estado (status) | Aviso sobre un mensaje enviado por ti: `sent`, `delivered`, `read` o `failed`. |
| `hub.challenge` | Número que Meta manda al verificar el webhook y que debes devolver tal cual. |
| Verify token | Frase acordada entre Meta y tu servidor para la verificación inicial. |
| HMAC-SHA256 | Huella de un mensaje calculada con una clave secreta; prueba autenticidad e integridad. |
| App Secret | Secreto de tu app de Meta con el que se firman los webhooks. |
| Cuerpo crudo | El texto exacto de la petición, antes de convertirlo a objeto. |

```quiz
? ¿Quién inicia la comunicación cuando un cliente escribe a tu bot?
- Tu servidor, que consulta a Meta cada pocos segundos
+ Meta, que hace un POST a tu webhook con el mensaje en JSON
- El teléfono del cliente, que llama directamente a tu servidor
- Tu bot, que abre una conexión permanente con el cliente
= En la API oficial, Meta empuja cada evento a la URL del webhook que registraste.

? En la verificación GET, ¿qué debe devolver tu servidor si el token coincide?
- Un JSON con el token
- Un código 204 sin cuerpo
+ El valor de `hub.challenge`, como texto, con estado 200
- El App Secret
= Meta compara lo que devuelves con el reto que envió; si coincide, da por verificado el webhook.

? ¿Sobre qué se calcula el HMAC de `X-Hub-Signature-256`?
- Sobre el objeto JavaScript ya parseado
- Sobre la URL de la petición
+ Sobre el cuerpo crudo exacto que mandó Meta
- Sobre el `verify_token`
= Cualquier cambio de bytes (incluso espacios al reconstruir el JSON) hace que la firma deje de coincidir.

? Llega un POST firmado que solo trae `statuses[]` con estado `delivered`. ¿Qué debe hacer `parsearWebhook`?
- Lanzar un error porque no hay mensajes
- Devolver una lista vacía
+ Devolver un evento de tipo `estado` y seguir sin romperse
- Convertirlo en un mensaje de texto vacío
= Los estados son eventos legítimos; el bot los registra (y reacciona solo a los `failed`).

? ¿Por qué se usa una comparación de tiempo constante al verificar la firma?
- Porque es más rápida que `===`
- Porque evita que el JSON se modifique
+ Para no filtrar, por diferencias de tiempo, cuántos caracteres de la firma acertó un atacante
- Porque Meta lo exige en sus términos de servicio
= Una comparación que sale al primer carácter distinto da pistas medibles sobre la firma correcta.
```

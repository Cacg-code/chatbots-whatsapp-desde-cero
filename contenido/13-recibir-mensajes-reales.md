---
titulo: Recibir mensajes reales
resumen: Conecta el webhook de tu Worker con Meta, verifica la URL, suscríbete al campo de mensajes y mira llegar un mensaje real de tu celular.
minutos: 55
nivel: intermedio
objetivos:
- Explicar el apretón de manos de verificación del webhook (hub.mode, hub.verify_token, hub.challenge).
- Exponer tu Worker a Meta mediante un túnel temporal o un despliegue en Cloudflare.
- Registrar la URL y el token de verificación en el panel de Meta y suscribirte al campo messages.
- Leer en los registros un mensaje real y distinguirlo de un evento de estado.
- Diagnosticar por qué un webhook no se verifica o no recibe mensajes.
fuentes:
- Webhooks de la Cloud API (Meta) | https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
- Primeros pasos con la Cloud API (Meta) | https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
---
## El objetivo: que Meta te hable a ti

Hasta ahora, los mensajes de WhatsApp que tu código procesó eran archivos JSON de ejemplo (`test/payloads/*.json`). En esta lección ocurre el cambio importante: escribes desde tu celular y **el mensaje llega a tu servidor**. Para eso hay que hacer tres cosas:

1. Que tu servidor sea alcanzable desde internet por HTTPS.
2. Registrar esa dirección en Meta y superar la **verificación**.
3. Suscribirte a los eventos que quieres recibir.

```flujo
Tu celular|escribe "hola"
-> mensaje
Meta|Cloud API
-> POST (JSON firmado)
Tu Worker|/webhook
-> 200 ok
Meta|confirma entrega
```

Requisito: haber hecho la [lección 12](../12-cuenta-y-app-de-meta/) (app, número de prueba, destinatario, `APP_SECRET`, `WA_PHONE_ID` y un token) y tener el Worker de las lecciones [10](../10-servidor-del-bot/) y [11](../11-despliegue-en-cloudflare/).

> [!importante] Verifica este dato
> Los nombres de los menús de Meta (por ejemplo, **WhatsApp > Configuration** y el botón de editar el webhook) cambian con las actualizaciones del panel. Los pasos de abajo siguen la [guía oficial de webhooks](https://developers.facebook.com/docs/graph-api/webhooks/getting-started); si tu pantalla difiere, busca el equivalente por concepto.

## Qué exige Meta de tu endpoint

La documentación oficial de webhooks establece estas condiciones:

- La URL debe responder por **HTTPS con un certificado válido**. Los certificados autofirmados no se aceptan. Por eso `http://localhost:8787` no sirve tal cual.
- Registras la URL junto con un **token de verificación** (*Verify Token*): un texto cualquiera que tú inventas.
- Cada notificación llega por `POST` y debes responder `200 OK`.
- Cada `POST` trae la cabecera `X-Hub-Signature-256`, con `sha256=` seguido de la firma calculada con tu App Secret. Validarla es opcional según la documentación, pero **recomendada**; el Worker del curso la exige.
- Si no respondes bien, Meta reintenta de inmediato y luego varias veces durante 36 horas, cada vez con menos frecuencia. Las notificaciones pueden llegar **duplicadas o en lote**, así que hay que procesar cada una por separado y deduplicar.

Dos ideas de diseño del Worker de referencia salen directamente de esa lista: la **idempotencia** (la clave `visto:<wamid>` que evita responder dos veces al mismo mensaje) y **responder 200 al instante y trabajar en segundo plano** con `ctx.waitUntil`.

## El apretón de manos de verificación

Cuando pulsas «Verificar y guardar» en el panel, Meta envía un `GET` a tu URL con tres parámetros:

| Parámetro | Qué es |
|---|---|
| `hub.mode` | Siempre `subscribe` |
| `hub.verify_token` | El token que escribiste en el panel |
| `hub.challenge` | Un número aleatorio que debes devolver |

Tu código debe comprobar que el token coincide y responder `200` con el texto de `hub.challenge` en el cuerpo. Si no, responder un error. Esto es lo que hace `verificarWebhook` en `src/worker.js`:

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

Observa los detalles: se exige que `env.VERIFY_TOKEN` exista (si lo olvidaste configurar, nadie puede verificar contra un valor vacío) y se devuelve **solo el reto**, sin comillas ni JSON.

Puedes simular a Meta antes de tocar el panel. Estas son las respuestas reales que dio el Worker en una ejecución con un `VERIFY_TOKEN` de prueba:

```salida
GET /webhook?hub.mode=subscribe&hub.verify_token=token-de-prueba&hub.challenge=1158201444
200 1158201444

GET /webhook?hub.mode=subscribe&hub.verify_token=otro&hub.challenge=1
403 Prohibido
```

Con `curl` en tu máquina, cuando el Worker corre en local, sería:

```bash
curl "http://localhost:8787/webhook?hub.mode=subscribe&hub.verify_token=TU_VERIFY_TOKEN&hub.challenge=12345"
```

Si ves `12345`, la parte de verificación funciona. Haz esta prueba **antes** de ir a Meta: así separas los fallos de tu código de los fallos del panel.

## Opción A: túnel temporal con cloudflared

Para ver mensajes llegando a tu computadora, sin desplegar nada, usa un túnel. Un **túnel** crea una dirección HTTPS pública que reenvía el tráfico a un puerto local.

1. Instala `cloudflared` desde la [documentación de Cloudflare](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
2. En una terminal, arranca el Worker en local (necesita `.dev.vars` con tus valores de la lección 12):

```bash
npx wrangler dev
```

3. En otra terminal, abre el túnel hacia el puerto del Worker (por defecto 8787):

```bash
cloudflared tunnel --url http://localhost:8787
```

`cloudflared` imprime una dirección temporal `https://algo-aleatorio.trycloudflare.com`. Según la documentación de Cloudflare, no hace falta cuenta ni dominio, la dirección **cambia cada vez** que creas un túnel y deja de funcionar al detener el proceso; es solo para pruebas y desarrollo.

> [!importante] Verifica este dato
> Estas condiciones de los túneles rápidos (límites, estabilidad) pueden cambiar. Mira la [página oficial de Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/).

Tu URL de webhook será, por ejemplo, `https://algo-aleatorio.trycloudflare.com/webhook`. Como cambia en cada sesión, tendrás que actualizarla en Meta cada vez que reinicies el túnel; es la molestia que te empuja a la opción B.

## Opción B: el Worker desplegado

Si ya desplegaste en la [lección 11](../11-despliegue-en-cloudflare/), tienes una URL estable del tipo `https://bot-minimarket.TU-SUBDOMINIO.workers.dev`. Es la forma recomendada porque no cambia. Sube los secretos si no lo hiciste:

```bash
npx wrangler secret put VERIFY_TOKEN
npx wrangler secret put WA_TOKEN
npx wrangler secret put APP_SECRET
npx wrangler deploy
```

Prueba que está vivo con `curl https://bot-minimarket.TU-SUBDOMINIO.workers.dev/salud`; debe responder `{"ok":true}`. Y para ver los registros en tiempo real mientras llegan mensajes:

```bash
npx wrangler tail
```

> [!nota] ¿Cuál elegir?
> Para aprender y depurar, el túnel con `wrangler dev` te deja ver todo en tu terminal y editar código al instante. Para dejar el bot funcionando mientras duermes, el despliegue. Muchas personas usan ambos: túnel mientras desarrollan y Worker desplegado como «producción».

## Registrar el webhook en Meta

En el panel de tu app, sección **WhatsApp > Configuration** («Configuración») según la guía oficial, busca el bloque **Webhook**:

1. Pulsa **Edit** («Editar»).
2. En **Callback URL** pega tu URL completa, terminando en `/webhook`.
3. En **Verify token** pega el mismo texto que pusiste en `VERIFY_TOKEN`.
4. Pulsa **Verify and save** («Verificar y guardar»).

Si todo va bien, el panel guarda sin errores. Si no, mira los mensajes de error y la tabla de diagnóstico más abajo.

Guardar la URL **no basta**: además debes **suscribirte a los campos** que quieres recibir. Para un bot necesitas el campo **`messages`**. En el panel verás una tabla de campos del webhook con un interruptor «Subscribe» («Suscribirse») junto a `messages`. Actívalo. Sin esa suscripción, la verificación es exitosa pero tu servidor jamás recibe un mensaje (un fallo muy frecuente y confuso).

> [!importante] Verifica este dato
> Dónde se ven los campos suscritos y cómo se vincula la app a la cuenta de WhatsApp Business (la suscripción de la app a la WABA) ha cambiado entre versiones del panel. Revisa la [documentación de webhooks de WhatsApp](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/) si, tras suscribirte a `messages`, siguen sin llegar eventos.

## La primera prueba real

Con el Worker corriendo y el webhook suscrito:

1. Mantén abierta la terminal de `wrangler dev` (o `wrangler tail`).
2. Desde tu celular, escribe `hola` al número de prueba (el que aparece en **API Setup**).
3. Observa la terminal.

Lo esperable es que Meta haga un `POST` a `/webhook` con un JSON como el de `test/payloads/texto.json` (con datos de ejemplo, no reales):

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "102290129340398",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": { "display_phone_number": "51999000222", "phone_number_id": "106540352242922" },
        "contacts": [{ "profile": { "name": "Cliente Ejemplo" }, "wa_id": "51999000111" }],
        "messages": [{ "from": "51999000111", "id": "wamid.TEXTO001", "timestamp": "1791360000", "text": { "body": "Quiero 2 leches" }, "type": "text" }]
      },
      "field": "messages"
    }]
  }]
}
```

Tu Worker comprueba la firma, responde `200 ok` y procesa el mensaje en segundo plano. Con una firma correcta y con una incorrecta, las respuestas reales fueron:

```salida
POST /webhook (firma válida)   -> 200 ok
POST /webhook (firma falsa)    -> 401 Firma inválida
```

Y como en esa prueba el token de WhatsApp era falso, al intentar contestar el Worker registró el error que devuelve Meta cuando el token no es válido:

```salida
WhatsApp respondió 401: Invalid OAuth access token - Cannot parse access token
```

Es una buena señal de diagnóstico: significa que el mensaje **sí llegó** y se procesó, y que el fallo está en el **envío** (token). Con un token real te contestará el bot; el envío es el tema de la [lección 14](../14-enviar-mensajes/).

## Mensajes y estados: dos clases de evento

Tu webhook no solo recibe mensajes de clientes. Cuando el bot envía algo, Meta te avisa del destino de cada mensaje con un evento de **estado** (`sent`, `delivered`, `read`, `failed`). Llegan por el mismo campo `messages`, pero en `value.statuses` en vez de `value.messages`. La función `parsearWebhook` de `src/whatsapp.js` los separa:

```js src/whatsapp.js (fragmento)
for (const msg of valor.messages ?? []) {
  const evento = parsearMensaje(msg, valor.contacts ?? [], phoneNumberId);
  if (evento) eventos.push(evento);
}
for (const st of valor.statuses ?? []) {
  if (!st?.id) continue;
  eventos.push({ tipo: 'estado', id: st.id, estado: st.status, /* ... */ });
}
```

Por eso, al probar, verás **más eventos de los que esperabas**: tu mensaje entrante y, después, los estados del mensaje que respondió el bot. No es un error. También aprenderás a ignorar con elegancia lo que no entiendes: imágenes, audios y otros tipos llegan como `no_soportado` y el bot responde con un texto amable en lugar de romperse.

## Cuando no llega nada: diagnóstico

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El panel no verifica la URL | Token distinto, URL sin `/webhook`, o Worker sin `VERIFY_TOKEN` | Prueba con `curl` el `GET` de verificación (arriba) |
| Verifica, pero no llegan mensajes | Falta suscribirse al campo `messages` | Activa la suscripción en el panel |
| Llegan, pero el Worker responde 401 | `APP_SECRET` equivocado o el cuerpo se modificó antes de verificar la firma | Revisa el secreto; usa `request.text()` antes de `JSON.parse` |
| Te llega el mismo mensaje varias veces | Tu servidor tardó o falló y Meta reintentó | Responde 200 rápido; mantén la idempotencia (`visto:`) |
| Con túnel dejó de funcionar | La URL temporal cambió | Reinicia el túnel y actualiza la URL en Meta |
| Escribes desde un número que no registraste | El número de prueba solo trabaja con destinatarios registrados | Registra ese número en el panel |

> [!importante] Verifica este dato
> Si Meta no logra entregar a tu URL durante mucho tiempo, descarta las notificaciones (según la documentación, tras 36 horas). Un bot caído un fin de semana puede perder mensajes; en producción conviene monitorear (lección [23](../23-pruebas-y-errores/)).

## Errores frecuentes

- **Poner la URL de `localhost` en el panel.** Meta no puede alcanzar tu computadora: necesita una URL pública HTTPS (túnel o despliegue).
- **Olvidar el `/webhook` al final de la URL.** El Worker acepta el `GET` de verificación en `/webhook`; con la raíz también funciona en el código del curso, pero lo correcto es ser explícito.
- **Verificar sin suscribirse a `messages`.** La URL queda «verificada» y aun así no llega nada.
- **Parsear el JSON antes de comprobar la firma.** La firma se calcula sobre el texto exacto; si lo reformateas, deja de coincidir.
- **Tardar en responder.** Meta reintenta si no recibe `200`; responde primero y trabaja después.
- **Pegar el token real en la terminal compartida o en capturas.** En las pruebas usa siempre valores como `token-de-prueba` hasta que sea imprescindible.

## Apuntes para llevar

- Meta exige una URL **HTTPS pública** con certificado válido; localhost solo sirve con un túnel.
- La verificación es un `GET` con `hub.mode`, `hub.verify_token` y `hub.challenge`: devuelves el reto si el token coincide.
- Hay que **suscribirse al campo `messages`**; la verificación sola no basta.
- Los mensajes llegan por `POST` firmado (`X-Hub-Signature-256`); responde `200` rápido y procesa en segundo plano.
- Meta reintenta durante 36 horas y puede duplicar o agrupar: procesa cada evento por separado y deduplica.
- Los eventos de **estado** llegan por el mismo webhook que los mensajes.

## Glosario

| Término | Significado |
|---|---|
| Callback URL | Dirección HTTPS de tu servidor donde Meta entrega los eventos. |
| Verify Token | Texto que tú inventas y que Meta devuelve en la verificación para probar que la URL es tuya. |
| hub.challenge | Número aleatorio que tu endpoint debe devolver tal cual durante la verificación. |
| Suscripción a campos | Elección de qué tipos de evento (por ejemplo `messages`) quieres recibir. |
| Túnel | Servicio que expone un puerto local mediante una URL pública HTTPS. |
| Idempotencia | Propiedad de procesar igual un evento aunque llegue repetido. |
| Evento de estado | Aviso de Meta sobre el destino de un mensaje enviado: sent, delivered, read o failed. |

```quiz
? Meta envía un GET con hub.mode=subscribe, hub.verify_token y hub.challenge. ¿Qué debe responder tu endpoint?
- Un JSON con el token
+ Código 200 con el valor de hub.challenge en el cuerpo, si el token coincide
- Código 301 hacia la página de Meta
- Nada: Meta lo ignora
= Si el token coincide devuelves el reto tal cual; si no, un error como 403.

? Verificaste la URL en el panel pero no llega ningún mensaje. ¿Qué revisas primero?
- Reinstalas Node
+ Que estés suscrito al campo messages del webhook
- Cambias el nombre del bot
- Borras el App Secret
= La verificación y la suscripción son pasos distintos; sin suscribirte a messages no hay entregas.

? ¿Por qué no basta con http://localhost:8787 como Callback URL?
- Porque el puerto es muy alto
+ Porque Meta necesita una URL HTTPS pública con certificado válido, y tu computadora no es alcanzable desde internet
- Porque Node no soporta webhooks
- Porque localhost solo funciona los domingos
= Un túnel o un despliegue en Cloudflare resuelve esa exigencia.

? ¿Qué debe hacer tu servidor ante una notificación de Meta?
- Tardar lo necesario y responder al final
+ Responder 200 de inmediato y procesar en segundo plano, evitando duplicados
- Responder siempre con un error para forzar reenvío
- Guardarla sin responder
= Si no respondes 200, Meta reintenta durante horas y puede duplicar eventos.

? Recibes un evento con value.statuses y status "delivered". ¿Qué es?
- Un mensaje nuevo del cliente
+ Un aviso de estado de un mensaje que enviaste tú
- Un error de verificación
- Un cambio de contraseña
= Los estados (sent, delivered, read, failed) llegan por el mismo webhook, en statuses.
```

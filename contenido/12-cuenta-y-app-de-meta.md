---
titulo: Cuenta y app de Meta
resumen: Crea tu cuenta de desarrollador, la app de negocio, la cuenta de WhatsApp Business y el número de prueba, y entiende qué token usar y cuál guardar.
minutos: 55
nivel: intermedio
objetivos:
- Describir la jerarquía portafolio comercial, cuenta de WhatsApp Business (WABA), número y app de Meta.
- Crear una app de Meta con el caso de uso de WhatsApp y localizar el panel de configuración de la API.
- Anotar el Phone Number ID, el ID de la cuenta y el App Secret sin exponerlos.
- Distinguir un token temporal de un token permanente de usuario del sistema y saber cuándo usar cada uno.
- Enviar el primer mensaje de prueba y abrir la ventana de 24 horas respondiendo desde tu celular.
fuentes:
- Primeros pasos con la Cloud API (Meta) | https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
---
## Qué vas a configurar y por qué en este orden

Hasta la [lección 11](../11-despliegue-en-cloudflare/) tu bot vivió en tu computadora y en un Worker de Cloudflare, sin hablar con WhatsApp. En esta lección haces el trámite que conecta ese código con la plataforma de Meta. Es la parte menos «programada» del curso: son pantallas, botones y copiar identificadores. Pero casi todos los errores de las lecciones siguientes (mensajes que no llegan, tokens que caducan, webhooks que no se verifican) nacen aquí, así que conviene entender qué es cada pieza.

Las piezas se anidan así:

```flujo
Portafolio comercial|tu empresa en Meta
-> contiene
Cuenta de WhatsApp Business|WABA
-> tiene
Número de teléfono|Phone Number ID
-> lo usa
App de Meta|token + webhook
```

- El **portafolio comercial** (antes «Business Manager») es la cuenta de empresa. Para practicar basta uno personal o de prueba.
- La **WABA** (WhatsApp Business Account) es el contenedor de tus números y de tus plantillas.
- El **número** tiene un identificador propio, el **Phone Number ID**, que es lo que va en la URL de la API para enviar mensajes. **No es el número de teléfono**: es un número largo interno de Meta.
- La **app de Meta** es tu aplicación de desarrollador: ahí se obtienen los tokens y se registra el webhook.

> [!importante] Verifica este dato
> Meta rediseña con frecuencia sus paneles y renombra menús (el panel de pruebas se ha llamado «API Setup» o «Configuración de la API», y el caso de uso se presenta de distintas formas según la fecha). Los nombres de este texto son los de la guía oficial al escribir la lección. Si tu pantalla se ve distinta, busca el equivalente y apóyate en la [guía oficial de inicio](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started). Lo que no cambia es el concepto: necesitas una app, una WABA, un número, un token y un webhook.

## Antes de empezar: lo que necesitas

1. Una **cuenta personal de Facebook** (Meta la usa para identificarte como desarrollador; no se publica nada en ella).
2. Un **correo** y un **celular con WhatsApp** donde recibirás los mensajes de prueba. Ese celular será tu «cliente».
3. Opcional pero recomendable: activar la verificación en dos pasos en tu cuenta, porque más adelante guardarás credenciales de empresa.

No necesitas tarjeta de crédito para empezar con el número de prueba. Los datos de pago y la verificación del negocio aparecen cuando quieras usar tu propio número en producción; eso se trata en la [lección 21](../21-costos-y-metricas/) y en la [26](../26-vender-tu-bot/).

> [!importante] Verifica este dato
> Los requisitos para pasar a producción (verificación del negocio, método de pago, límites de mensajes) cambian con el tiempo. Revisa siempre la [documentación oficial de WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started) antes de prometerle plazos a un cliente.

## Paso 1: registrarte como desarrollador y crear la app

Entra en [developers.facebook.com](https://developers.facebook.com) con tu cuenta y acepta los términos de desarrollador (si es tu primera vez, te pedirán confirmar correo y teléfono). Esto lo haces tú: es un trámite de cuenta y términos legales, nadie debería hacerlo por ti.

Luego, según la guía oficial de inicio:

1. En el **App Dashboard** («Mis apps»), pulsa **Create App** («Crear app»).
2. Elige el caso de uso **Connect with customers through WhatsApp** («Conectar con clientes a través de WhatsApp»).
3. Ponle un nombre claro, por ejemplo `Bot Minimarket La Esquina (pruebas)`, y asócialo a un portafolio comercial (puedes crear uno nuevo).
4. Llegarás a **Customize use case > Connect on WhatsApp > Quickstart**. Ahí pulsa **Start using the API** («Empezar a usar la API»).

Cuando termines, tendrás una app con el producto WhatsApp añadido. En el menú izquierdo aparecerá una sección **WhatsApp** con subpáginas como **API Setup** y **Configuration**. Guarda en un lugar seguro dos cosas que te servirán en la lección 13:

- El **ID de la app** (App ID), visible en la parte superior del panel.
- El **App Secret** (secreto de la app), normalmente en **App settings > Basic** («Configuración de la app > Básica»). Con él firma Meta cada mensaje que te envía; tu Worker lo usa en la variable `APP_SECRET`.

> [!importante] Verifica este dato
> La ruta exacta del App Secret y el nombre de los menús pueden variar. Si no lo encuentras, busca «App Secret» en la [documentación del panel de apps](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/).

## Paso 2: la cuenta de WhatsApp Business y el número de prueba

En el panel **API Setup** de WhatsApp verás una cabecera con varios campos. Según la guía oficial:

1. Selecciona o crea una **cuenta de WhatsApp Business**. Anota el **WhatsApp Business Account ID** que muestra el panel.
2. En el campo **From** («De») eliges el **número de prueba**. Anota su **Phone Number ID** (el identificador largo, no el teléfono). Este valor irá en tu variable `WA_PHONE_ID`.
3. En el campo **To** («Para») agregas el **destinatario**: tu número de celular, donde recibirás los mensajes de prueba.

Esa lista de destinatarios es una protección: con un número de prueba **solo puedes escribir a los números que registraste ahí**. Si intentas escribir a otro, la API responde con un error (lo verás en la [lección 14](../14-enviar-mensajes/)).

> [!importante] Verifica este dato
> El tope de destinatarios de prueba, el método de confirmación del celular y las condiciones del número de prueba son datos que Meta ajusta. Consúltalos en la [guía oficial de inicio](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started) y no los des por fijos.

En el curso usamos números ficticios como `51999000111` para el cliente y `51999000222` para el negocio. **Los tuyos serán distintos**: nunca los pegues en repositorios públicos, capturas de pantalla ni en tus notas compartidas.

## Paso 3: el token temporal y el primer mensaje

En la misma pantalla hay un botón **Generate access token** («Generar token de acceso»). El token que obtienes es **temporal**: la guía oficial lo describe como un token que «caduca rápido» y que sirve solo para probar. Mira en tu panel cuánto dura exactamente.

Puedes enviar tu primer mensaje de dos maneras:

- Con el botón **Send message** del panel, que manda una plantilla de ejemplo de Meta a tu celular.
- Con `curl` desde tu terminal, que es lo que de verdad hará tu bot por dentro:

```bash
curl -X POST "https://graph.facebook.com/v26.0/TU_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer TU_TOKEN_TEMPORAL" \
  -H "Content-Type: application/json" \
  -d '{"messaging_product":"whatsapp","to":"51999000111","type":"template","template":{"name":"hello_world","language":{"code":"en_US"}}}'
```

Reemplaza `TU_PHONE_NUMBER_ID`, `TU_TOKEN_TEMPORAL` y el número del ejemplo por los tuyos. La versión `v26.0` es la que usa el código del curso ([lección 14](../14-enviar-mensajes/)); revisa el [registro de cambios de la Graph API](https://developers.facebook.com/docs/graph-api/changelog/) por si hay una más reciente.

> [!importante] Verifica este dato
> El nombre y el idioma de la plantilla de ejemplo (`hello_world`, `en_US`) los define Meta y pueden cambiar. Usa el que muestra tu panel en **API Setup**.

Una respuesta de éxito tiene esta forma (el id real de tu mensaje será otro):

```json
{
  "messaging_product": "whatsapp",
  "contacts": [{ "input": "51999000111", "wa_id": "51999000111" }],
  "messages": [{ "id": "wamid.EJEMPLO123" }]
}
```

Fíjate en algo importante: **esa respuesta solo confirma que la API aceptó tu petición**, no que el mensaje llegó. La documentación oficial lo dice así: la entrega se informa después por webhook (estados `sent`, `delivered`, `read`, `failed`), como viste en la [lección 9](../09-webhooks-y-json-de-whatsapp/).

Ahora abre WhatsApp en tu celular y **responde** al mensaje con cualquier texto. Ese acto abre la **ventana de 24 horas** de atención al cliente: desde ese momento puedes enviarle texto libre, botones y listas (no solo plantillas), tal como explicó la [lección 1](../01-como-funciona-un-bot/). Mientras el cliente no escriba, solo puedes mandarle plantillas.

## Paso 4: del token temporal al permanente

Un token que muere pronto sirve para practicar, pero un bot desplegado en la nube necesita uno estable. La forma que describe la guía oficial es un **usuario del sistema** (*system user*) dentro de la **Configuración del negocio** (*Business Settings*):

1. En **Business Settings**, abre **System users** («Usuarios del sistema») y pulsa **Add** («Agregar»). Dale un nombre como `bot-minimarket`.
2. Pulsa **Assign Assets** («Asignar activos») y añade dos cosas con control total: tu **app** (permiso *Manage app*) y tu **cuenta de WhatsApp** (permiso *Manage WhatsApp Business accounts*).
3. Pulsa **Generate token** («Generar token»), elige tu app y marca los permisos que indica la guía:
   - `whatsapp_business_messaging` (enviar mensajes)
   - `whatsapp_business_management` (administrar la cuenta y las plantillas)
   - `business_management`
4. Copia el token **en ese momento** y guárdalo en un gestor de contraseñas. No des por hecho que podrás volver a verlo.

> [!importante] Verifica este dato
> Meta ha cambiado cómo se generan y cuánto duran los tokens de usuario del sistema. Mira qué opciones te ofrece tu pantalla y lee la [guía oficial](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started). Si tu token tiene fecha de caducidad, anótala en tu calendario.

> [!consejo] Una regla simple de seguridad
> El token es una contraseña con poder de enviar mensajes en nombre del negocio (y de gastar su dinero). Nunca lo pegues en el código, ni en GitHub, ni en capturas, ni en chats. En el curso vive solo en secretos: `.dev.vars` en tu computadora (ignorado por git) y `wrangler secret put` en la nube. La [lección 24](../24-seguridad-y-privacidad/) profundiza en esto.

## Cómo encaja con el código del curso

El Worker de referencia necesita cuatro valores, definidos en `.dev.vars.example`:

| Variable | De dónde sale | ¿Secreta? |
|---|---|---|
| `VERIFY_TOKEN` | Un texto largo que **inventas tú**; lo pondrás igual aquí y en Meta | Sí |
| `WA_TOKEN` | El token (temporal para probar, permanente después) | Sí |
| `WA_PHONE_ID` | El Phone Number ID del número de prueba | No es crítico, pero tampoco lo publiques |
| `APP_SECRET` | App settings > Basic | Sí |

Para probar localmente, copia el ejemplo y reemplaza los valores ficticios:

```bash
cp .dev.vars.example .dev.vars
```

Y para la nube:

```bash
npx wrangler secret put WA_TOKEN
npx wrangler secret put APP_SECRET
npx wrangler secret put VERIFY_TOKEN
```

Cada comando te pide pegar el valor. Quedan cifrados en Cloudflare y el código los lee como `env.WA_TOKEN`. El Phone Number ID es una variable normal (`[vars]` en `wrangler.toml`).

## Qué no hace falta todavía

Para el curso **no necesitas** verificar tu negocio, comprar un número real ni añadir método de pago. Esos pasos solo importan cuando lo vendas a un cliente real ([lección 26](../26-vender-tu-bot/)).

Lo que sí debes evitar es registrar el número real de un cliente (o tu WhatsApp personal) en la API solo «para probar»: normalmente un número se usa o con la app de WhatsApp Business o con la API, y revertirlo puede costar tiempo. Usa siempre el número de prueba hasta que sea necesario.

## Errores frecuentes

- **Confundir el Phone Number ID con el número de teléfono.** El ID es un valor largo interno; si pones el teléfono en la URL, la API responde que no existe.
- **Usar el token temporal en producción.** Funciona unos días y luego el bot «deja de responder» con un error de token vencido. Genera uno de usuario del sistema.
- **Olvidar registrar el destinatario en el campo «To».** Con el número de prueba, escribir a un número no registrado falla.
- **Pegar el token o el App Secret en el código o en un repositorio.** Si pasa, revócalo y genera uno nuevo de inmediato.
- **Esperar texto libre sin haber respondido desde el celular.** Hasta que el cliente escribe, solo se pueden enviar plantillas.
- **Seguir una captura de pantalla vieja de un tutorial.** Los menús de Meta cambian: guíate por los conceptos y por la documentación oficial.

## Apuntes para llevar

- La jerarquía es: portafolio comercial, WABA, número (Phone Number ID) y app de Meta.
- Meta ofrece un **número de prueba**; solo escribe a los destinatarios que registres.
- El **token temporal** caduca pronto; el de **usuario del sistema** es el que usa un bot desplegado.
- El Phone Number ID **no** es el teléfono; guárdalo junto con el App Secret y el token.
- Los secretos viven en `.dev.vars` y `wrangler secret`, nunca en el código ni en git.
- Los nombres de menús y los límites cambian: verifica en la documentación oficial.

## Glosario

| Término | Significado |
|---|---|
| Portafolio comercial | Cuenta de empresa en Meta (antes Business Manager) que agrupa activos. |
| WABA | Cuenta de WhatsApp Business: contiene números y plantillas. |
| Phone Number ID | Identificador interno del número, usado en la URL de la API. |
| App de Meta | Aplicación de desarrollador que da acceso a la API y al webhook. |
| Token temporal | Credencial de prueba que caduca pronto. |
| Usuario del sistema | Identidad técnica del negocio para generar tokens estables. |
| App Secret | Secreto de la app con el que se firma cada webhook que Meta envía. |
| Número de prueba | Número que Meta ofrece para practicar, con destinatarios limitados. |

```quiz
? ¿Qué identificador va en la URL de la API para enviar un mensaje?
- El número de teléfono del cliente
+ El Phone Number ID del número del negocio
- El App Secret
- El nombre de la app
= La ruta es /{PHONE_NUMBER_ID}/messages; el teléfono del cliente va en el campo "to" del cuerpo.

? ¿Qué problema tiene usar solo el token temporal en un bot desplegado?
- Es demasiado largo
+ Caduca pronto y el bot dejará de poder enviar mensajes
- No permite enviar texto
- Solo funciona en Windows
= El temporal es para probar; para producción se genera uno con un usuario del sistema.

? ¿Qué debes hacer para poder enviar texto libre con el número de prueba?
- Pagar un plan
+ Registrar tu celular como destinatario y responder un mensaje desde él para abrir la ventana de 24 horas
- Cambiar el nombre de la app
- Nada, siempre se puede
= La ventana de 24 horas se abre cuando el cliente escribe; antes solo se envían plantillas.

? ¿Dónde se guardan los secretos del Worker en la nube?
- En el archivo index.js
- En un repositorio público
+ Con wrangler secret put, que los guarda cifrados
- En el título de la app de Meta
= El código los lee como env.NOMBRE; nunca deben estar en git.

? Tu pantalla de Meta no coincide con las capturas del curso. ¿Qué haces?
- Abandonas
+ Buscas el equivalente por concepto y revisas la documentación oficial
- Usas una librería no oficial
- Creas otra cuenta de Facebook
= Meta cambia los menús con frecuencia; los conceptos (app, WABA, número, token, webhook) se mantienen.
```

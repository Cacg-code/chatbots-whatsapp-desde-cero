---
titulo: Plantillas de mensaje
resumen: Crea plantillas de WhatsApp, entiende sus categorías y su aprobación, envíalas con variables y botones de respuesta rápida usando whatsapp.js, y recibe lo que el cliente toca.
minutos: 60
nivel: intermedio
objetivos:
- Explicar para qué sirve una plantilla y cuándo es obligatoria (fuera de la ventana de 24 horas).
- Distinguir las categorías de utilidad, marketing y autenticación y elegir la correcta para cada mensaje del minimarket.
- Redactar una plantilla con variables y botones respetando sus límites, y crearla desde el panel o con la API.
- Enviar una plantilla con parámetros usando `construirPlantilla` y manejar el error de una plantilla inexistente.
- Recibir la respuesta de un botón de respuesta rápida y diseñar los textos para que el bot los entienda.
fuentes:
- Plantillas de mensaje (Meta) | https://developers.facebook.com/docs/whatsapp/message-templates
- Enviar plantillas (Meta) | https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
---
## Por qué existen las plantillas

Recuerda la regla más importante de la plataforma, que viste en la [lección 1](../01-como-funciona-un-bot/): cuando un cliente te escribe, se abre una **ventana de 24 horas** en la que puedes enviar mensajes libres. Fuera de ella, el único mensaje que la API te deja enviar es una **plantilla**: un texto de formato fijo que **Meta revisa y aprueba antes** de que puedas usarlo.

¿Para qué tanto control? Porque escribirle primero a alguien es lo más cercano al spam. Con las plantillas, Meta puede revisar qué le mandan a sus usuarios antes de que lo reciban, y los usuarios no reciben mensajes de formato arbitrario de negocios con los que no hablaron en el día.

En tu minimarket las plantillas aparecen en situaciones muy concretas:

- «Tu pedido LE-1 está en camino» (el cliente escribió ayer, hoy ya salió el delivery).
- «Tu pedido sigue pendiente. ¿Quieres confirmarlo?» (recordatorio fuera de las 24 h).
- «Este fin de semana, S/ 2 de descuento en gaseosas» (promoción, solo a quienes aceptaron recibirla).

El código del curso ya las usa. En `src/worker.js`, el cron de recordatorios decide así:

```js worker.js
const ventanaAbierta = puedeEnviarTexto(sesionDe(pedido.telefono)?.ultimoMensajeCliente, ahora);
const cuerpo = ventanaAbierta
  ? construirEnvio(pedido.telefono, { tipo: 'texto', texto: `Tu pedido ${pedido.id} sigue en preparación. Si necesitas algo, escríbenos por aquí.` })
  : construirPlantilla(pedido.telefono, 'recordatorio_pedido', 'es', [pedido.id]); // plantilla aprobada previamente
```

Si la ventana está abierta, texto libre (gratis de crear, sin aprobación). Si no, la plantilla `recordatorio_pedido`, que **debe existir y estar aprobada**. En esta lección crearás esa plantilla.

## Las tres categorías

Cada plantilla se declara en una de tres categorías, y la categoría determina las reglas y el precio ([documentación de plantillas](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview)):

| Categoría | Para qué sirve | Ejemplo en el minimarket |
|---|---|---|
| **Utilidad** (*utility*) | Mensajes sobre algo que el cliente ya hizo o pidió | «Tu pedido LE-1 está en camino», confirmaciones, recordatorios de un pedido |
| **Marketing** | Promociones, ofertas, novedades, cualquier intento de vender o promover | «Este sábado, 2 x 1 en galletas» |
| **Autenticación** | Códigos de un solo uso para verificar identidad | «Tu código es 483920» |

Dos ideas claves:

- **El contenido manda, no la intención.** Si mezclas un recordatorio de pedido con una oferta («Tu pedido está listo y mira nuestras promociones»), Meta puede considerarla de marketing aunque tú la creaste como utilidad. Mantén cada plantilla enfocada en una sola cosa.
- **La categoría cambia lo que pagas y cómo se envía.** Las plantillas de marketing suelen costar más y exigen que el cliente haya dado permiso (*opt-in*), tema de la [lección 20](../20-marketing-responsable/). Además, Meta puede limitar cuántos mensajes de marketing recibe un mismo usuario.

> [!importante] Verifica este dato
> Las definiciones exactas de cada categoría, los precios y qué ocurre cuando Meta recategoriza una plantilla cambian con frecuencia. Lee siempre las páginas oficiales antes de prometer algo: [plantillas de mensaje](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview) y [precios](https://developers.facebook.com/docs/whatsapp/pricing). La lección 21 profundiza en los costos.

## Anatomía de una plantilla

Una plantilla se compone de **componentes**. Según la [guía de componentes de Meta](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/components):

| Componente | ¿Obligatorio? | Límite documentado |
|---|---|---|
| **Cuerpo** (*body*) | Sí | Solo texto, hasta 1 024 caracteres |
| **Encabezado** (*header*) | No | Texto de hasta 60 caracteres (con una variable), o imagen, video o documento |
| **Pie** (*footer*) | No | Solo texto, hasta 60 caracteres |
| **Botones** | No | Hasta 10 de respuesta rápida; cada texto, hasta 25 caracteres |

El cuerpo es el mensaje en sí. El pie sirve para aclaraciones cortas («Minimarket La Esquina»). Los botones facilitan la respuesta del cliente, como verás más adelante.

### Variables

Las partes que cambian de un envío a otro se escriben como **variables**: marcadores entre llaves dobles que llenas al enviar. Existen dos estilos:

- **Posicionales:** `{{1}}`, `{{2}}`, numeradas desde 1, que se llenan en ese orden. Es el formato por defecto y el que usa nuestro código.
- **Con nombre:** `{{nombre_cliente}}`, en minúsculas y guion bajo. Al enviar, cada parámetro lleva además su `parameter_name`.

Cuando creas la plantilla, **debes dar un ejemplo para cada variable** (para que el revisor entienda qué se enviará). Y las variables posicionales deben ir completas y en orden: `{{1}}` y `{{3}}` sin `{{2}}` es un error.

Una buena práctica, que también practicas en el ejercicio, es **validar la plantilla antes de enviarla a revisión**. Con las funciones del ejercicio, la plantilla que diseñamos para el minimarket pasa sin problemas, y una plantilla mal armada muestra todos sus defectos de una vez (salida real):

```salida
[]
[
  'Nombre inválido: solo minúsculas sin tilde, números y guion bajo',
  'Las variables deben ser consecutivas desde {{1}}',
  'Texto de botón de 1 a 25 caracteres: "Quiero la oferta del fin de semana ahora"'
]
```

Ahorrarte una ida y vuelta con el revisor de Meta ya justifica la función.

## Diseñar las plantillas del minimarket

Antes de abrir el panel, redacta. Estas son las tres plantillas que usaremos (todas ficticias, con el negocio ficticio «Minimarket La Esquina» y sin emojis):

| Nombre | Categoría | Texto del cuerpo |
|---|---|---|
| `recordatorio_pedido` | Utilidad | Hola, tu pedido {{1}} en Minimarket La Esquina sigue en preparación. Total: {{2}}. ¿Quieres que lo confirmemos? |
| `pedido_en_camino` | Utilidad | Tu pedido {{1}} salió en delivery y llegará en unos 30 minutos. |
| `promo_fin_de_semana` | Marketing | Este fin de semana en Minimarket La Esquina: {{1}}. Responde STOP si ya no quieres recibir novedades. |

Reglas de redacción que ayudan a que te aprueben:

- **Sé específico y claro.** El cliente debe entender de qué trata sin contexto.
- **No pongas datos sensibles** (contraseñas, números de tarjeta) en una plantilla.
- **Un propósito por plantilla.** No mezcles pedido y promoción.
- **Evita variables al principio o al final del cuerpo y evita un cuerpo que sea solo variables.** Meta suele rechazarlas por ambiguas. **Verifica este dato** en la [guía de revisión de plantillas](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview), porque las reglas de revisión se actualizan.
- **Escribe en el idioma que declares.** Meta no traduce: si la plantilla se declara en español, el texto y los ejemplos van en español.

### El nombre

Un nombre de plantilla puede tener hasta 512 caracteres y **solo letras minúsculas, números y guiones bajos**. Por eso `recordatorio_pedido` es válido, y `Recordatorio Pedido` o `confirmación` no. El mismo nombre puede existir en varios idiomas (y cada idioma cuenta contra tu límite de plantillas).

### El idioma

Cada plantilla se crea en un idioma, con un código. En el código del curso usamos `'es'` por defecto (`construirPlantilla(to, nombre, idioma = 'es', ...)`). **Verifica este dato:** Meta ofrece códigos genéricos y regionales (por ejemplo, variantes para Perú o México). Consulta la lista de idiomas admitidos en la documentación y usa en el envío exactamente el mismo código con el que creaste la plantilla.

## Crear la plantilla

Hay dos caminos. Para empezar, el más cómodo es el **panel de plantillas** de WhatsApp Manager (menú de tu cuenta de WhatsApp Business en Meta): eliges categoría, idioma, escribes el cuerpo, agregas ejemplos y botones, y envías a revisión. Los nombres de los menús cambian, así que sigue la [documentación oficial](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates) si algo no coincide.

El segundo es la **API**, que sirve para automatizar o crear muchas. Se hace un `POST` a `/{WABA_ID}/message_templates`, donde `WABA_ID` es el identificador de tu cuenta de WhatsApp Business (lo ubicaste en la [lección 12](../12-cuenta-y-app-de-meta/)). Meta limita la creación a 100 plantillas por hora por cuenta. Esta es la definición de nuestra plantilla de recordatorio, tal como la armé y serialicé con Node:

```json recordatorio_pedido.json
{
  "name": "recordatorio_pedido",
  "language": "es",
  "category": "UTILITY",
  "components": [
    {
      "type": "BODY",
      "text": "Hola, tu pedido {{1}} en Minimarket La Esquina sigue en preparación. Total: {{2}}. ¿Quieres que lo confirmemos?",
      "example": { "body_text": [["LE-1", "S/ 8.60"]] }
    },
    { "type": "FOOTER", "text": "Minimarket La Esquina" },
    {
      "type": "BUTTONS",
      "buttons": [
        { "type": "QUICK_REPLY", "text": "Confirmar" },
        { "type": "QUICK_REPLY", "text": "Cambiar pedido" }
      ]
    }
  ]
}
```

Fíjate en el `example`: para variables posicionales se entrega en `body_text` un arreglo con **un arreglo de valores de ejemplo**, uno por variable (`LE-1` para `{{1}}`, `S/ 8.60` para `{{2}}`). Los ejemplos son datos falsos y claros, nunca de clientes reales.

Para enviarla a la API:

```bash
curl -X POST "https://graph.facebook.com/v26.0/TU_WABA_ID/message_templates" \
  -H "Authorization: Bearer $WA_TOKEN" \
  -H "Content-Type: application/json" \
  -d @recordatorio_pedido.json
```

`v26.0` es la versión que usa `GRAPH_VERSION` en `whatsapp.js` (verificada en el código de referencia el 2026-10-07). Las versiones de la API caducan: revisa el [registro de cambios](https://developers.facebook.com/docs/graph-api/changelog/) antes de desplegar. No pude ejecutar esta llamada contra Meta (requiere una cuenta real), así que la estructura sale de la documentación, no de una prueba mía: **verifica este dato** con una plantilla de prueba antes de automatizar nada.

## La aprobación

Cuando creas o editas una plantilla, entra en revisión. Según la documentación oficial, la revisión es automática y puede tardar **hasta 24 horas**. Hasta que no esté en estado **aprobado** (`APPROVED`), no puedes enviarla. En el panel verás estados como en revisión, rechazada, activa, pausada o desactivada. Hay tres formas de enterarte del resultado:

- Mirar el panel de plantillas de WhatsApp Manager.
- Consultar el campo `status` de la plantilla por la API.
- Suscribirte al webhook `message_template_status_update`, que avisa de cada cambio de estado (el mismo mecanismo de webhook que ya usas para los mensajes).

Si te rechazan, no es un callejón sin salida: lee el motivo, corrige (suele ser un texto ambiguo, una variable mal puesta o una categoría equivocada) y vuelve a enviar. Mientras tanto, tu bot **no debe depender** de que la plantilla exista. Por eso en el Worker la plantilla se usa solo cuando la ventana está cerrada, y el envío está dentro de un `try/catch` en el cron.

> [!consejo] Crea las plantillas con anticipación
> Crea y aprueba las plantillas **antes** de necesitarlas. Si el recordatorio de un cliente real sale mañana y tu plantilla sigue en revisión, ese mensaje no se enviará.

## Enviar una plantilla con parámetros

Ya viste cómo se construye el cuerpo del mensaje. La función `construirPlantilla` de `src/whatsapp.js` recibe el destinatario, el nombre de la plantilla, el idioma y la lista de variables:

```js whatsapp.js
export function construirPlantilla(to, nombre, idioma = 'es', variables = []) {
  const template = { name: nombre, language: { code: idioma } };
  if (variables.length > 0) {
    template.components = [{ type: 'body', parameters: variables.map((v) => ({ type: 'text', text: String(v) })) }];
  }
  return { ...base(to), type: 'template', template };
}
```

Con nuestras dos variables, el cuerpo que se envía a `POST /{PHONE_NUMBER_ID}/messages` es (salida real):

```salida
{"messaging_product":"whatsapp","recipient_type":"individual","to":"51999000111","type":"template","template":{"name":"recordatorio_pedido","language":{"code":"es"},"components":[{"type":"body","parameters":[{"type":"text","text":"LE-1"},{"type":"text","text":"S/ 8.60"}]}]}}
```

Observa tres cosas:

- Cada `parameters` va **en el mismo orden** que las variables `{{1}}`, `{{2}}` del cuerpo.
- `String(v)` convierte números en texto: `{{2}}` recibe `"S/ 8.60"`, que armamos antes con `"S/ " + total.toFixed(2)`.
- Una plantilla **sin variables** (como `carrito_pendiente`) no lleva `components`, lo cual el código resuelve con el `if`:

```salida
{"messaging_product":"whatsapp","recipient_type":"individual","to":"51999000111","type":"template","template":{"name":"carrito_pendiente","language":{"code":"es"}}}
```

> [!nota] Variables con nombre
> `construirPlantilla` usa variables posicionales. Para plantillas con variables con nombre, cada parámetro debe llevar también `parameter_name`. Es un cambio pequeño en esa función, pero el código de referencia no lo hace (el propio comentario del archivo lo señala como pendiente de verificar). Consulta el [resumen de plantillas](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview) antes de implementarlo.

### Cuando algo sale mal

Enviar una plantilla que no existe, que no está aprobada o con un idioma que no coincide devuelve un error. `enviarMensaje` lo convierte en una excepción **sin incluir el token**. Simulé una respuesta 404 con el mensaje de error típico para plantillas inexistentes (el texto exacto de Meta puede variar):

```salida
WhatsApp respondió 404: Template name does not exist in the translation
```

Los errores más comunes: nombre mal escrito, idioma distinto al de la plantilla, número de variables distinto al esperado, o plantilla todavía en revisión. Revisa siempre que el nombre y el código de idioma coincidan **exactamente**.

## Botones de respuesta rápida

Una plantilla puede incluir **botones de respuesta rápida** (*quick reply*): el cliente toca «Confirmar» en lugar de escribir. Se definen al crear la plantilla (el bloque `BUTTONS` del JSON de arriba), con un texto de hasta 25 caracteres, y puedes tener hasta 10 en total. Si los agrupas con otros tipos de botones, los de respuesta rápida deben ir todos juntos al inicio o al final. Las plantillas con 4 o más botones, o con una combinación de tipos, pueden no verse en el cliente de WhatsApp para escritorio, así que piensa en el celular y mantén pocos.

### Enviarla con botones

Al enviar, cada botón de respuesta rápida puede llevar un **payload**: un texto interno que identifica qué botón tocó el cliente (no se muestra). Nuestra función de referencia no incluye botones, así que armamos una variante propia. La estructura del componente `button` con `sub_type: "quick_reply"`, `index` y un parámetro de tipo `payload` es la que conozco por la API, pero **no la encontré descrita en las páginas que consulté**, así que **verifica este dato** en la referencia de componentes de plantillas antes de usarla en producción:

```js plantillas.js
function construirPlantillaConBotones(to, nombre, idioma, variables, payloads) {
  const base = construirPlantilla(to, nombre, idioma, variables);
  const comps = base.template.components ?? [];
  payloads.forEach((payload, index) => comps.push({
    type: 'button', sub_type: 'quick_reply', index: String(index),
    parameters: [{ type: 'payload', payload }],
  }));
  base.template.components = comps;
  return base;
}
```

Con `['pedido_confirmar', 'pedido_editar']` como payloads, los componentes finales son (salida real, después del cuerpo con sus dos variables):

```salida
{ "type": "button", "sub_type": "quick_reply", "index": "0", "parameters": [{ "type": "payload", "payload": "pedido_confirmar" }] }
{ "type": "button", "sub_type": "quick_reply", "index": "1", "parameters": [{ "type": "payload", "payload": "pedido_editar" }] }
```

(Los reduje a una línea cada uno para leerlos mejor.) Los payloads `pedido_confirmar` y `pedido_editar` son justo los ids que el motor ya entiende en el flujo del pedido: `pedido_confirmar pedido_editar pedido_cancelar` aparecen entre sus ids interactivos en `API.md`. Es decir, un botón de plantilla podría reutilizar la misma lógica que un botón de la conversación.

### Recibir lo que el cliente toca

Cuando el cliente toca un botón de respuesta rápida de una plantilla, Meta te avisa por el webhook con un mensaje de tipo `button`. Lo que hace `parsearWebhook` en el código real con un mensaje así (armé el payload a mano siguiendo ese formato):

```salida
[{"tipo":"mensaje","de":"51999000111","nombre":"Cliente Demo","id":"wamid.B1","timestamp":1791385300,"phoneNumberId":"123","entrada":{"tipo":"texto","texto":"Confirmar"}}]
```

El código lo trata como si el cliente hubiera **escrito** el texto del botón («Confirmar»). Fíjate: se pierde el payload. El propio código lo admite con un comentario `VERIFICAR`: no pude abrir la página oficial de ese tipo de mensaje, así que revisa en la documentación del webhook que el campo sea `button.text`, y si quieres usar el payload, tendrías que ampliar `parsearEntrada`.

Mientras tanto, la consecuencia práctica es un **consejo de diseño**: como el texto del botón entra al motor como texto libre, elige textos que `detectarIntencion` ya entiende. Lo probé con los dos botones de nuestro ejemplo:

```salida
confirmar desconocida
```

«Confirmar» se reconoce como la intención `confirmar`, pero «Cambiar pedido» cae en `desconocida`. Opciones: renombrar el botón a un texto que el bot sí entienda (por ejemplo, «Cancelar» o «Ayuda» si encajan), enseñarle al motor la frase nueva en `texto.js`, o procesar el payload. Elige según el caso, pero **prueba siempre el camino de cada botón**: un botón que lleva a «No entendí tu mensaje» arruina la experiencia.

Además, cuando el cliente responde a una plantilla, **se abre una ventana de 24 horas**. Desde ese momento, el bot puede continuar con mensajes libres, botones y listas. Esa es la gracia de una buena plantilla: no intenta resolverlo todo, solo **abrir la conversación**.

## Cuidado con el uso

- **Probar solo con tu número.** Mientras practicas, envía plantillas únicamente a tu propio número de prueba. Usa en los ejemplos teléfonos falsos como `51999000111`.
- **Marketing con permiso.** Una plantilla de marketing solo debe ir a quien aceptó recibirla. Si el usuario dejó de recibir mensajes de marketing, la API acepta la petición pero no entrega el mensaje, y llega un estado `failed` con un código (la documentación de plantillas de marketing menciona el `131050`; **verifica este dato** en la [página oficial](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates)). Tu bot debe leer esos estados y dejar de insistir.
- **No abuses.** Una plantilla mal usada baja la calidad del número, y Meta puede limitar tu capacidad de envío. Las dos lecciones siguientes, de [recordatorios](../18-recordatorios-y-seguimiento/) y [marketing responsable](../20-marketing-responsable/), ponen las reglas de uso.

## Errores frecuentes

- **Enviar una plantilla que aún no está aprobada.** Solo las plantillas `APPROVED` pueden enviarse.
- **Nombre con mayúsculas, espacios o tildes.** Solo minúsculas, números y guion bajo.
- **Variables salteadas** (`{{1}}` y `{{3}}`) o sin ejemplos al crearlas.
- **Elegir mal la categoría.** Mezclar un aviso de pedido con una oferta puede hacer que Meta la trate como marketing, con otro precio y otras reglas.
- **Desajuste de idioma.** Crear la plantilla en un idioma y enviarla con otro código devuelve error.
- **Botones que el bot no entiende.** Si el texto del botón cae en «no entendí», la experiencia se rompe.
- **Esperar la aprobación en el último momento.** La revisión puede tardar hasta 24 horas.
- **Pasar datos reales en los ejemplos de la plantilla.** Usa siempre datos inventados.

## Apuntes para llevar

- Fuera de la ventana de 24 horas, solo puedes enviar plantillas aprobadas por Meta.
- Hay tres categorías: utilidad, marketing y autenticación; la categoría afecta reglas y precio, y el contenido manda sobre la intención.
- Una plantilla tiene cuerpo (hasta 1 024 caracteres), y opcionalmente encabezado, pie y botones (hasta 10 de respuesta rápida, de 25 caracteres cada uno).
- Las variables `{{1}}`, `{{2}}`... deben ser consecutivas y llevar ejemplos al crear la plantilla.
- La revisión es automática y puede tardar hasta 24 horas; consulta el estado en el panel, por la API o con el webhook `message_template_status_update`.
- `construirPlantilla(to, nombre, idioma, variables)` arma el envío; el nombre y el idioma deben coincidir exactamente con los aprobados.
- Un botón de respuesta rápida llega como mensaje de tipo `button`: diseña sus textos para que el motor los entienda.
- Verifica siempre en la documentación oficial lo que cambia con el tiempo: categorías, precios, versión de la API y reglas de revisión.

## Glosario

| Término | Significado |
|---|---|
| Plantilla | Mensaje de formato fijo aprobado por Meta, enviable fuera de la ventana de 24 horas. |
| Categoría | Clasificación de la plantilla: utilidad, marketing o autenticación. |
| Componente | Parte de una plantilla: cuerpo, encabezado, pie o botones. |
| Variable | Marcador `{{1}}` del texto que se llena al enviar. |
| Respuesta rápida | Botón de plantilla que el cliente toca para contestar sin escribir. |
| Payload | Texto interno asociado a un botón que identifica cuál se tocó. |
| WABA ID | Identificador de tu cuenta de WhatsApp Business, usado para crear plantillas. |
| `APPROVED` | Estado de una plantilla que ya puede enviarse. |

```quiz
? Un cliente te escribió hace tres días y hoy quieres avisarle que su pedido sigue pendiente. ¿Qué debes enviar?
- Un texto libre, porque ya hubo una conversación
+ Una plantilla aprobada, porque la ventana de 24 horas ya se cerró
- Un audio
- Nada: la API no permite escribir a clientes antiguos
= Fuera de la ventana solo se pueden enviar plantillas aprobadas.

? ¿Cuál es un nombre de plantilla válido?
- Recordatorio Pedido
- confirmación-pedido
+ recordatorio_pedido
- Recordatorio_Pedido
= Solo se permiten letras minúsculas sin tilde, números y guiones bajos.

? Redactas «Tu pedido {{1}} está listo. Además, mira nuestras ofertas de la semana.» y la declaras como utilidad. ¿Qué riesgo corres?
- Ninguno, porque tú elegiste la categoría
+ Que Meta la considere marketing por su contenido, con otras reglas y otro precio
- Que no se pueda usar la variable {{1}}
- Que los clientes no vean el texto
= El contenido manda sobre la categoría declarada; no mezcles un aviso de pedido con promociones.

? ¿Qué envía el código al usar `construirPlantilla(to, 'recordatorio_pedido', 'es', ['LE-1', 'S/ 8.60'])`?
- Un mensaje de texto libre con los dos valores unidos
+ Un mensaje de tipo template cuyo cuerpo lleva dos parámetros de texto, en el orden de {{1}} y {{2}}
- Una lista interactiva
- Una petición para crear la plantilla
= La función arma el JSON de `type: "template"` con `components` de tipo `body` y sus `parameters`.

? Un cliente toca el botón «Cambiar pedido» de tu plantilla y el bot responde «No entendí». ¿Cuál es la causa más probable según esta lección?
- Meta bloqueó la plantilla
+ El botón llega como texto y `detectarIntencion` no reconoce esa frase
- La ventana de 24 horas no se abrió
- El payload tiene más de 25 caracteres
= El parser trata el botón como texto escrito; hay que usar textos que el motor entienda o ampliar el procesamiento.

? ¿Cuánto puede tardar la revisión de una plantilla según la documentación consultada?
- Es inmediata siempre
- Una semana
+ Hasta 24 horas, y solo se puede enviar cuando está aprobada
- Meta no revisa las plantillas
= La documentación indica una revisión automática de hasta 24 horas; verifica el dato vigente antes de planificar.
```

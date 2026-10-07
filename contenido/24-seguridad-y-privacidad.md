---
titulo: Seguridad y privacidad
resumen: Protege secretos y tokens, verifica la firma de Meta, limita el abuso y trata los datos de tus clientes con mínimo necesario, retención y borrado a petición.
minutos: 60
nivel: avanzado
objetivos:
- Guardar secretos y tokens fuera del repositorio y del chat, usando `.dev.vars` y secretos de Cloudflare.
- Explicar cómo funciona la firma `X-Hub-Signature-256` (HMAC) y verificarla con código.
- Aplicar mínimo privilegio, validación de entradas, limitación de tasa e idempotencia.
- Decidir qué datos guardar, por cuánto tiempo y cómo borrarlos a petición del cliente.
- Redactar una política de privacidad básica y revisar el bot con una lista de comprobación de seguridad.
---
## Por qué un bot de negocio es un blanco

Tu bot es un servidor público en internet: cualquiera que conozca la URL del webhook puede enviarle peticiones. Además guarda **teléfonos, direcciones y pedidos** de personas reales, y tiene un **token** que permite enviar mensajes en nombre del negocio. Si algo sale mal, los daños son concretos: mensajes falsos enviados con tu número, datos filtrados, una factura de Meta inflada o una cuenta suspendida.

La buena noticia es que la mayor parte de la seguridad de un bot pequeño se resume en unos pocos hábitos: **no filtrar secretos, comprobar quién te escribe, no confiar en lo que llega, guardar poco y borrar a tiempo**. Esta lección los recorre uno por uno.

> [!importante] Esto no es asesoría legal
> Hablamos de buenas prácticas técnicas y de principios de protección de datos. Las leyes cambian y dependen de cada país. Si vas a manejar datos de clientes de un negocio, consulta a un abogado local.

## Secretos y tokens: nunca en el repo ni en el chat

Un **secreto** es cualquier valor que da poder: el token de acceso de WhatsApp, el **secreto de la app** de Meta, el token de verificación del webhook, las claves de otros servicios. Reglas simples:

1. **Nunca en el código.** Ni «temporalmente», ni «solo para probar».
2. **Nunca en el repositorio.** Un secreto subido a GitHub debe considerarse **comprometido** aunque borres el commit, porque queda en el historial y existen bots que rastrean repositorios en busca de claves.
3. **Nunca en un chat, correo o captura de pantalla** (incluido pedirle ayuda a un compañero o a una IA con el token a la vista).
4. **Rotación inmediata** si se filtra: genera uno nuevo y revoca el anterior.

### En local: `.dev.vars`

Cloudflare lee los secretos de desarrollo desde un archivo `.dev.vars` junto a `wrangler.toml`. Ese archivo **debe estar en `.gitignore`**:

```text .dev.vars
WHATSAPP_TOKEN=pon-aqui-tu-token
APP_SECRET=pon-aqui-el-secreto-de-la-app
VERIFY_TOKEN=una-frase-larga-que-inventes
```

```text .gitignore
node_modules/
.dev.vars
.env
```

Comprueba que git lo ignora antes del primer commit:

```bash
git check-ignore -v .dev.vars
```

### En producción: secretos de Cloudflare

En el servidor desplegado se usan **secretos de Worker**, que se guardan cifrados y no aparecen en `wrangler.toml`:

```bash
npx wrangler secret put WHATSAPP_TOKEN
npx wrangler secret put APP_SECRET
```

Wrangler te pedirá el valor por la terminal (no queda en tu historial de comandos como argumento). En el código, el secreto llega en el objeto `env`: `env.WHATSAPP_TOKEN`.

> [!consejo] Un secreto por entorno
> Usa un token distinto para pruebas y para producción. Si se filtra el de pruebas, el negocio real no se toca.

## Tokens de acceso: temporales, de usuario del sistema y mínimo privilegio

En la [lección 12](../12-cuenta-y-app-de-meta/) viste que Meta entrega un **token temporal** para practicar: caduca pronto y sirve solo para pruebas. Para producción se crea un **usuario del sistema** en la configuración del negocio y se le genera un token con los permisos justos. La documentación oficial de la plataforma describe estos pasos en la [guía de inicio](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started).

Aplica el **principio de mínimo privilegio**: da a cada pieza solo lo que necesita para su trabajo.

- Al usuario del sistema, solo la **app** y la **cuenta de WhatsApp** de ese cliente, no todo el portafolio.
- Al token, solo los permisos de mensajería y gestión de WhatsApp que usas.
- Al Worker, solo los secretos que realmente lee.
- A las personas, solo el rol que necesitan en el portafolio (nadie necesita ser administrador para ver estadísticas).

Guarda la fecha de creación de cada token y revísalos cada cierto tiempo. Si trabajas para un cliente, la cuenta de Meta debe estar **a nombre del cliente**, y tú entras con un rol limitado (lección [26](../26-vender-tu-bot/)).

### Verificación en dos pasos en la cuenta de Meta

Activa la **autenticación en dos pasos (2FA)** en tu cuenta personal de Facebook y en el portafolio comercial. Quien controla esa cuenta controla el número, los clientes y la facturación. Meta puede **exigirla** para administrar el portafolio o para acceder a ciertas funciones.

> [!importante] Verifica este dato
> Varios tutoriales dicen que la 2FA es obligatoria para acceder a la API, pero no pude confirmarlo en una página oficial de Meta. Los requisitos de seguridad del portafolio cambian: revisa lo que te pida tu cuenta en el [Centro de ayuda para empresas de Meta](https://www.facebook.com/business/help) y la [documentación oficial de WhatsApp](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started). Actívala aunque no te la pidan.

## Verificar la firma: `X-Hub-Signature-256`

Cualquiera puede enviar un POST a tu webhook diciendo «soy Meta». Para distinguir lo auténtico de lo falso, Meta **firma** cada notificación y pone la firma en el encabezado `X-Hub-Signature-256`, con la forma `sha256=<hex>`.

La firma es un **HMAC-SHA256**: una huella calculada con el **cuerpo exacto** de la petición y el **secreto de la app**, que solo conocen Meta y tú. El proceso es:

```flujo
Meta|firma el cuerpo con el secreto
-> POST + cabecera de firma
Tu webhook|recalcula la firma
-> ¿coinciden?
Procesar o rechazar|200 / 401
```

1. Recibes el cuerpo **sin modificar** (el texto crudo, antes de convertirlo a objeto).
2. Calculas el HMAC-SHA256 de ese texto usando tu secreto de app.
3. Lo comparas con lo que viene después de `sha256=`.
4. Si coincide, el mensaje es auténtico y no fue alterado. Si no, respondes `401` y no haces nada más.

La documentación de Meta lo describe en [Validating Payloads](https://developers.facebook.com/docs/graph-api/webhooks/getting-started): genera una firma SHA256 con el payload y el secreto de la app y compárala con la del encabezado.

Ejemplo propio con el módulo `crypto` de Node (el código real del proyecto vive en `codigo/src/whatsapp.js`; aquí lo escribimos a mano para entender la idea). El secreto es de ejemplo:

```js firma.js
const crypto = require("node:crypto");

function firmar(cuerpo, secreto) {
  return "sha256=" + crypto.createHmac("sha256", secreto).update(cuerpo).digest("hex");
}

function firmaValida(cuerpo, cabecera, secreto) {
  if (!cabecera) return false;
  const esperada = Buffer.from(firmar(cuerpo, secreto));
  const recibida = Buffer.from(cabecera);
  return esperada.length === recibida.length && crypto.timingSafeEqual(esperada, recibida);
}

const secreto = "secreto-de-ejemplo-no-real";
const cuerpo = '{"entry":[{"id":"1"}]}';
const cab = firmar(cuerpo, secreto);
console.log(cab);
console.log("original:", firmaValida(cuerpo, cab, secreto));
console.log("alterado:", firmaValida('{"entry":[{"id":"2"}]}', cab, secreto));
console.log("sin cabecera:", firmaValida(cuerpo, null, secreto));
```

```salida
sha256=35b1991096b0c6652e370ff67f1fb20c9595f6960f74ab42789869acca482b3c
original: true
alterado: false
sin cabecera: false
```

Detalles que importan:

- **Usa el cuerpo crudo.** Si lo conviertes a objeto y lo vuelves a texto, el orden o los espacios pueden cambiar y la firma dejará de coincidir. Lee el cuerpo con `await request.text()` y recién después haz `JSON.parse`.
- **Comparación de tiempo constante** (`timingSafeEqual`) en lugar de `===`, para que un atacante no deduzca la firma midiendo tiempos.
- **El secreto de la app no es el token de acceso.** Son dos valores distintos; no los confundas.
- Cambia cualquier letra del cuerpo y la firma deja de coincidir: eso es lo que ves en el caso «alterado».

## Validar entradas y limpiar texto

Aunque la firma sea válida, **el texto del cliente es entrada no confiable**: puede ser larguísimo, tener caracteres de control o intentar engañar a tu código. Reglas:

- **Limita la longitud** (por ejemplo, 500 caracteres) antes de procesar.
- **Quita caracteres de control y de ancho cero**, y normaliza espacios.
- **Nunca insertes el texto del cliente directamente** en consultas, comandos o HTML sin escapar.
- **Comprueba la forma** de lo que esperas: cantidades numéricas dentro de un rango, teléfonos con solo dígitos, etc.
- **Ignora lo que no esperas** (tipos de mensaje que tu bot no maneja) en lugar de fallar.

```js seguridad.js
function limpiarEntrada(texto, max = 500) {
  if (typeof texto !== "string") return "";
  return texto
    .replace(/[​-‍﻿]/g, "")       // ancho cero
    .replace(/[\u0000-\u001F\u007F]/g, " ")      // caracteres de control
    .replace(/\s+/g, " ").trim().slice(0, max);
}

console.log(JSON.stringify(limpiarEntrada("  hola\n\n\tquiero\u0000   pan​  ")));
```

```salida
"hola quiero pan"
```

Y para **registros y paneles**, enmascara el teléfono: en los logs casi nunca necesitas el número completo.

```js seguridad.js
function enmascararTelefono(tel) {
  const d = String(tel ?? "").replace(/\D/g, "");
  if (d.length <= 5) return "*".repeat(d.length);
  return d.slice(0, 2) + "*".repeat(d.length - 5) + d.slice(-3);
}

console.log(enmascararTelefono("51999000111"));
```

```salida
51******111
```

## Limitar el abuso: tasa e idempotencia

Dos problemas distintos con soluciones simples.

### Limitar la tasa (rate limiting)

Un cliente (o un script) que te escribe 200 veces por minuto puede agotar tus límites gratuitos, generar costos y hundir la conversación. Una **ventana deslizante** guarda las horas de las últimas peticiones de cada cliente y rechaza cuando se supera el máximo:

```js seguridad.js
function limitarTasa(registro, clave, ahora, max, ventanaMs) {
  const vivos = (registro[clave] ?? []).filter(t => ahora - t < ventanaMs);
  if (vivos.length >= max) { registro[clave] = vivos; return false; }
  vivos.push(ahora);
  registro[clave] = vivos;
  return true;
}

const reg = {};
const r = [0, 1000, 2000, 3000, 61000].map(t => limitarTasa(reg, "51999000111", t, 3, 60000));
console.log(r);
```

```salida
[ true, true, true, false, true ]
```

Con un máximo de 3 mensajes por minuto, el cuarto (en el segundo 3) se rechaza; pasado el minuto, vuelve a funcionar. Para el cliente que excede el límite, lo más amable es **ignorar en silencio** o responder una sola vez («Estás escribiendo muy rápido, espera un momento»).

> [!nota] Dónde guardar el contador
> En un Worker, cada petición puede ejecutarse en una instancia distinta, así que un `Map` en memoria no es fiable. Para un bot pequeño, guarda el contador en [KV](../15-memoria-con-kv/) con caducidad corta, sabiendo que KV no es instantáneo entre regiones y que sus escrituras tienen cuota; es una defensa «suficiente», no perfecta. Para más rigor existen herramientas de Cloudflare diseñadas para esto.

### Idempotencia

Meta puede **reenviar** una notificación si tu servidor tarda o falla: según la documentación, reintenta con frecuencia decreciente **hasta 7 días** y esos reintentos **pueden producir notificaciones duplicadas**. Si tu bot no se protege, un mismo mensaje «quiero 2 gaseosas» podría procesarse dos veces y crear un pedido doble.

Una operación es **idempotente** si repetirla no cambia el resultado. La técnica: guarda el **identificador del mensaje** (`wamid...`) que viene en el JSON y descarta los ya vistos.

```js seguridad.js
const vistos = new Set();
function procesarUnaVez(id, fn) {
  if (vistos.has(id)) return "duplicado ignorado";
  vistos.add(id);
  return fn();
}
console.log(procesarUnaVez("wamid.EJEMPLO1", () => "procesado"));
console.log(procesarUnaVez("wamid.EJEMPLO1", () => "procesado"));
```

```salida
procesado
duplicado ignorado
```

En producción, el `Set` se reemplaza por KV con una caducidad de uno o dos días. Responde siempre `200` rápido a Meta y procesa sin demorar, para evitar reintentos innecesarios.

## Qué datos guardar y por cuánto tiempo

El principio rector es la **minimización**: guarda **solo lo necesario** para el propósito, y **solo mientras haga falta**.

| Dato | ¿Hace falta? | Retención sugerida (decide con el negocio) |
|---|---|---|
| Teléfono | Sí, es el identificador de la conversación | Mientras el cliente esté activo |
| Nombre | Opcional, si lo da el cliente | Igual que el teléfono |
| Dirección de entrega | Solo si hay delivery | Hasta entregar; después, borrar o pedirla de nuevo |
| Pedidos | Sí (historial y reclamos) | Según necesidad contable del negocio |
| Texto de las conversaciones | Solo el estado necesario para continuar | Corto: horas o pocos días |
| Registro de opt-in/baja | Sí, como prueba del consentimiento | Mientras dure la relación y el plazo legal aplicable |
| Logs técnicos | Para depurar | Pocos días, con teléfonos enmascarados |

Lo que **no** debes guardar ni pedir por WhatsApp: números completos de tarjeta, claves, documentos de identidad, datos de salud. La política de Meta pide expresamente no compartir datos sensibles por el canal.

Las cifras de retención de la tabla son **sugerencias**, no obligaciones legales: algunos datos (como comprobantes) pueden tener plazos de conservación por ley contable o tributaria. Cada negocio debe fijarlos con su asesor.

Una función de retención es pura y fácil de probar: dice si un registro debe borrarse, ya sea por antigüedad o porque el cliente pidió el borrado:

```js seguridad.js
function debeBorrarse(registro, ahora, diasRetencion) {
  if (registro.solicitudBorrado) return true;
  return ahora - registro.creado >= diasRetencion * 24 * 60 * 60 * 1000;
}

const DIA = 86400000;
console.log(
  debeBorrarse({ creado: 0 }, 91 * DIA, 90),
  debeBorrarse({ creado: 0 }, 10 * DIA, 90),
  debeBorrarse({ creado: 0, solicitudBorrado: true }, DIA, 90)
);
```

```salida
true false true
```

Una tarea programada (la misma técnica de los [recordatorios](../18-recordatorios-y-seguimiento/)) puede ejecutar la limpieza cada noche.

## Consentimiento, política de privacidad y borrado a petición

Quien te da su teléfono y su dirección tiene **derechos** sobre esos datos. En Perú, por ejemplo, la [Ley 29733, Ley de Protección de Datos Personales](https://www.congreso.gob.pe/Docs/DGP/DIDP/files/ley_29733.pdf) y su reglamento regulan el consentimiento, los derechos del titular (acceder, rectificar, cancelar y oponerse) y las obligaciones de quien trata datos; la autoridad es la Autoridad Nacional de Protección de Datos Personales. **Cada país tiene su propia norma** (por ejemplo, México, Colombia, Chile o Argentina tienen leyes distintas) y el reglamento peruano ha tenido modificaciones recientes, así que verifica la versión vigente.

> [!importante] Verifica este dato
> No des por hecho que una ley antigua sigue igual: busca la versión vigente en el portal oficial del Estado o consúltala con un abogado antes de redactar documentos legales para un cliente.

Una **política de privacidad** para el bot del minimarket debe responder, en lenguaje claro:

1. **Quién** es el responsable (nombre y contacto del negocio).
2. **Qué datos** se recogen (teléfono, nombre, dirección, pedidos).
3. **Para qué** se usan (atender pedidos, avisos de entrega y, solo si aceptó, ofertas).
4. **Con quién** se comparten (Meta como proveedor del canal, el proveedor de alojamiento, repartidores si aplica).
5. **Cuánto tiempo** se conservan.
6. **Cómo ejercer derechos**: pedir copia, corregir, borrar o darse de baja, y a qué contacto.
7. **Cómo se pide el consentimiento** y cómo se retira.

Publica la política en una página web (aunque sea una sola página) y enlázala en el cartel del QR y en el primer mensaje del bot.

Mensaje de ejemplo para la primera interacción:

```text
Hola, soy el asistente de Minimarket La Esquina. Uso tu número para atender
tu pedido. Más información en nuestra política de privacidad:
https://ejemplo.com/privacidad. Para borrar tus datos, escribe BORRAR.
```

### Borrar datos a petición

Si el cliente escribe `BORRAR` (o lo pide por otra vía), el bot debe:

1. **Confirmar la identidad**: el número que escribe es el titular de los datos.
2. **Borrar o anonimizar** pedidos no obligatorios de conservar, sesiones y registros.
3. **Mantener lo que la ley obliga** (por ejemplo, comprobantes) y explicarlo.
4. **Confirmar** con un mensaje breve y **registrar** que se atendió la solicitud, sin guardar de nuevo los datos que acabas de borrar.

## Lista de seguridad antes de entregar el bot

- [ ] Ningún secreto en el repositorio; `.dev.vars` y `.env` en `.gitignore`.
- [ ] Secretos de producción cargados con `wrangler secret put`.
- [ ] Tokens con el mínimo de permisos; token de pruebas distinto del de producción.
- [ ] 2FA activa en la cuenta de Facebook y en el portafolio comercial.
- [ ] Firma `X-Hub-Signature-256` verificada sobre el cuerpo crudo; respuesta `401` si no coincide.
- [ ] Entradas limpiadas y con longitud máxima.
- [ ] Límite de mensajes por cliente.
- [ ] Idempotencia por identificador de mensaje.
- [ ] Teléfonos enmascarados en logs y paneles.
- [ ] Retención definida y tarea de limpieza.
- [ ] Política de privacidad publicada y comando para borrar datos.
- [ ] Opt-in y baja registrados (lección [20](../20-marketing-responsable/)).

## Errores frecuentes

- **Pegar el token en un chat o captura para pedir ayuda.** Si pasó, rótalo ya.
- **Subir `.dev.vars` a GitHub «por una vez».** Queda en el historial para siempre.
- **No verificar la firma** porque «de todos modos nadie conoce mi URL». Las URLs se descubren.
- **Calcular la firma sobre el JSON ya parseado** en vez del cuerpo crudo.
- **Guardar todo «por si acaso».** Cada dato extra es un riesgo y una obligación.
- **Registrar teléfonos completos en logs públicos o compartidos.**
- **Ignorar los reintentos de Meta** y crear pedidos duplicados.
- **Copiar una política de privacidad ajena** sin adaptarla a lo que realmente hace tu bot.

## Apuntes para llevar

- Los **secretos** no van en el código, el repo ni el chat: `.dev.vars` en local, `wrangler secret put` en producción.
- La **firma `X-Hub-Signature-256`** es un HMAC-SHA256 del cuerpo crudo con el secreto de la app; compárala en tiempo constante.
- **Mínimo privilegio** en tokens, cuentas y roles; activa la **2FA**.
- Trata todo texto del cliente como **no confiable**: limita, limpia y valida.
- Usa **limitación de tasa** y **idempotencia** (identificador de mensaje) contra abuso y duplicados.
- **Minimiza y define la retención**; permite **borrar a petición**; publica una **política de privacidad**. Esto no es asesoría legal.

## Glosario

| Término | Significado |
|---|---|
| HMAC | Huella criptográfica calculada con un mensaje y un secreto compartido; prueba autenticidad. |
| Secreto de la app | Valor privado de tu app de Meta usado para firmar y verificar notificaciones. |
| Usuario del sistema | Identidad técnica del portafolio de Meta para generar tokens de uso en servidores. |
| Mínimo privilegio | Dar a cada persona o pieza solo los permisos que necesita. |
| Limitación de tasa | Restringir cuántas peticiones puede hacer un cliente en un período. |
| Idempotencia | Propiedad por la cual repetir una operación no cambia el resultado. |
| Minimización | Guardar solo los datos estrictamente necesarios. |
| Retención | Tiempo que se conservan los datos antes de borrarlos. |

```quiz
? ¿Dónde se guardan los secretos de un Worker en producción?
- En un archivo `config.js` dentro del repositorio
- En un comentario del `wrangler.toml`
+ Como secretos de Cloudflare, con `wrangler secret put`
- En el mensaje de bienvenida del bot
= Los secretos de Worker se almacenan cifrados y llegan al código por `env`, sin pasar por el repositorio.

? ¿Qué es la firma `X-Hub-Signature-256`?
- El token de acceso de WhatsApp
+ Un HMAC-SHA256 del cuerpo de la petición calculado con el secreto de la app, para comprobar que viene de Meta
- La contraseña del portafolio
- Un identificador de mensaje
= Si recalculas la firma sobre el cuerpo crudo y coincide, la notificación es auténtica y no se alteró.

? ¿Por qué hay que calcular la firma sobre el cuerpo crudo y no sobre el JSON reparseado?
- Porque el JSON es más lento
+ Porque al volver a serializar puede cambiar el texto (orden, espacios) y la firma ya no coincidiría
- Porque Meta lo prohíbe
- Porque el JSON no admite tildes
= La firma depende de los bytes exactos recibidos.

? Meta reenvía una notificación y tu bot crea dos pedidos. ¿Qué técnica lo evita?
- Subir la memoria del Worker
+ Idempotencia: guardar el identificador del mensaje y descartar los ya procesados
- Responder 500 siempre
- Desactivar el webhook
= Los reintentos pueden duplicar notificaciones; el identificador permite procesarlas una sola vez.

? ¿Qué principio guía qué datos del cliente conviene guardar?
- Guardar todo por si acaso
+ Minimización: solo lo necesario y solo mientras haga falta
- Guardar todo cifrado y para siempre
- Guardar solo lo que pide Meta
= Menos datos y menos tiempo significan menos riesgo y menos obligaciones.
```

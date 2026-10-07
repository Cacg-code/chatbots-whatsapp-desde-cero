---
titulo: Memoria con Cloudflare KV
resumen: Guarda sesiones, pedidos e ids de mensajes en Cloudflare KV con vencimiento automático (TTL) y aprende sus límites reales para no perder datos.
minutos: 55
nivel: intermedio
objetivos:
- Explicar por qué un Worker necesita memoria externa y qué lugar ocupa KV en la arquitectura del bot.
- Diseñar claves con prefijo y asignar un TTL distinto a sesiones, pedidos e ids de mensajes ya vistos.
- Leer y guardar JSON en KV con `get` y `put` usando `expirationTtl`, y comprobar el vencimiento con un reloj controlado.
- Reconocer las limitaciones de KV (consistencia eventual, sin atomicidad, un `list` de máximo 1000 claves, cuotas del plan gratuito).
- Decidir cuándo conviene pasar a D1 o Durable Objects.
fuentes:
- Cloudflare KV | https://developers.cloudflare.com/kv/
---
## Por qué el Worker necesita memoria

En la [lección 5](../05-estado-de-la-conversacion/) el bot recordaba el carrito porque la sesión vivía en una variable de tu programa. En la consola funciona: el programa sigue encendido mientras conversas. En la nube no.

Un **Cloudflare Worker** se parece más a una calculadora que a un empleado sentado en el mostrador: llega una petición, se ejecuta tu código, se responde y todo lo que había en variables **desaparece**. La siguiente petición puede ejecutarse en otro servidor, en otra ciudad y en otro momento. Si el cliente escribe «2 leches» y dos minutos después «listo», el Worker que recibe el segundo mensaje no tiene idea del primero.

Por eso el motor del curso es una función pura: `procesar(sesion, entrada)` devuelve `{ sesion, respuestas }`. Tú le entregas la sesión, él te devuelve la nueva, y **tú** (el Worker) te encargas de guardarla en algún lugar que sobreviva entre peticiones. Ese lugar, en el código de referencia, es **Cloudflare KV**.

```flujo
Mensaje|webhook de Meta
-> llega al Worker
Worker|lee sesion:<tel>
-> la pasa al motor
Motor|procesar()
-> sesión nueva
Worker|guarda en KV
```

## Qué es KV y para qué sirve

**KV** (*Key-Value*, «clave-valor») es un almacén de Cloudflare que funciona como un diccionario gigante y global: guardas un texto bajo un nombre (la **clave**) y después lo recuperas con ese mismo nombre. No hay tablas, ni columnas, ni consultas: solo `get`, `put`, `delete` y `list`.

Se usa en el Worker a través de un **binding**: un nombre (en nuestro caso `BOT_KV`) que Cloudflare conecta a tu código. Lo declaras en `wrangler.toml`; así lo trae el proyecto del curso:

```toml wrangler.toml
[[kv_namespaces]]
binding = "BOT_KV"
id = "00000000000000000000000000000000"          # id de EJEMPLO: reemplázalo
preview_id = "11111111111111111111111111111111"  # id de EJEMPLO para wrangler dev
```

El `id` real se obtiene creando el *namespace* (el «cajón» de claves) con `npx wrangler kv namespace create BOT_KV`; el comando te imprime el id que debes copiar. En el código, `env.BOT_KV` ya es el objeto con los cuatro métodos.

KV es ideal para datos que **se leen mucho y se escriben poco**, y que toleran un pequeño retraso en verse en todo el mundo. Para el bot de un minimarket encaja bien: una sesión por cliente, pedidos que se guardan una vez, y poco más. Más abajo verás para qué NO sirve.

> [!nota] Las pruebas del curso usan un KV falso
> Las pruebas de `codigo/test/worker.test.js` no usan internet: reemplazan `BOT_KV` por un objeto con un `Map` que imita `get`, `put` y `list`. Eso permite probar todo el Worker en tu computadora. En esta lección haremos lo mismo pero agregando un reloj, para ver el vencimiento.

## Claves con prefijo: ordenar el cajón

Todo lo que guardas vive en el mismo espacio de nombres, así que conviene que cada clave diga **qué tipo de dato es**. La convención es un prefijo seguido de dos puntos. El Worker del curso usa tres:

| Clave | Contenido | Vive |
|---|---|---|
| `sesion:<telefono>` | La sesión completa del cliente (estado, carrito, entrega…) | 2 días |
| `pedido:<id>` | Un pedido confirmado | 30 días |
| `visto:<wamid>` | Marca de «ya procesé este mensaje» | 1 día |

Así es el código real que lee y guarda JSON (está en `src/worker.js`):

```js worker.js
const SEGUNDOS_DIA = 24 * 60 * 60;
const TTL_SESION = 2 * SEGUNDOS_DIA; // la sesión vive 2 días sin actividad
const TTL_PEDIDO = 30 * SEGUNDOS_DIA;
const TTL_VISTO = SEGUNDOS_DIA; // ids de mensajes ya procesados

async function leerJson(kv, clave) {
  const texto = await kv.get(clave);
  return texto ? JSON.parse(texto) : null;
}

const guardarJson = (kv, clave, valor, ttl) => kv.put(clave, JSON.stringify(valor), { expirationTtl: ttl });
```

Tres detalles que conviene entender:

- **KV guarda texto** (también binario, pero para nosotros es texto). Por eso se hace `JSON.stringify` al guardar y `JSON.parse` al leer.
- `kv.get` devuelve `null` cuando la clave no existe **o ya venció**. Para el bot, ambas cosas significan lo mismo: «este cliente es nuevo».
- `expirationTtl` son **segundos desde ahora** hasta que la clave se borra sola. Esa es la gran ventaja de KV para un bot: la limpieza es automática.

El teléfono entra en la clave, así que cada cliente tiene su propio cajón: `sesion:51999000111` nunca se mezcla con `sesion:51999000222`. Si el número llegara con espacios o signos, conviene normalizarlo (dejar solo dígitos) antes de armar la clave. Lo practicarás en el ejercicio.

## El ciclo de vida de una sesión

Cada vez que llega un mensaje, `procesarMensaje` hace siempre lo mismo: leer, procesar, guardar. Este es el fragmento central del código real:

```js worker.js
const claveSesion = `sesion:${evento.de}`;
const sesionPrevia = (await leerJson(kv, claveSesion)) ?? crearSesion(evento.de, ahora);
const { sesion, respuestas } = procesar(sesionPrevia, evento.entrada, ahora);

await guardarJson(kv, claveSesion, sesion, TTL_SESION);
if (sesion.pedidoNuevo) await guardarJson(kv, `pedido:${sesion.pedidoNuevo.id}`, sesion.pedidoNuevo, TTL_PEDIDO);
```

Observa el `??`: si no hay sesión previa (cliente nuevo, o la anterior venció), se crea una limpia. Y observa que **cada escritura renueva el TTL**: la sesión no vence «dos días después de crearse», sino «dos días después del último mensaje». Un cliente activo nunca pierde el carrito; uno que desaparece dos días, sí.

Lo comprobamos con un script que ejecuté contra el `procesarMensaje` real, usando un KV falso con reloj y vencimiento (el KV de verdad expira a su manera, pero la lógica es la misma). Después del primer mensaje, las claves y su vida restante son:

```salida
visto:wamid.1            vence en 24 h
sesion:51999000111       vence en 48 h
ELIGIENDO [ '2 x Leche entera 1 L' ]
```

Ahora adelantamos el reloj un día, luego dos días más, y el cliente vuelve a escribir «hola»:

```salida
--- 1 dia despues
visto vivo? null | sesion viva? true
--- 3 dias despues
sesion viva? false
MENU carrito: 0
```

Al día siguiente, la marca `visto:` ya se borró pero la sesión sigue viva. A los tres días, la sesión venció: el cliente empieza de cero (estado `MENU`, carrito vacío). Es justo lo que queremos: un carrito de hace tres días probablemente ya no importa, y mantenerlo para siempre llenaría el almacenamiento de datos viejos (y de teléfonos de personas que no volverán).

> [!importante] El TTL mínimo es 60 segundos
> `expirationTtl` no admite menos de 60 segundos: Cloudflare no soporta vencimientos que caigan a menos de un minuto en el futuro. No uses KV para bloqueos de 5 o 10 segundos. Fuente: [documentación de `put()`](https://developers.cloudflare.com/kv/api/write-key-value-pairs/). **Verifica este dato** cuando lo uses, porque los límites de las plataformas cambian.

### Elegir un TTL con criterio

No hay un número mágico. Pregúntate cuánto tiempo **tiene sentido** recordar cada cosa:

- **Sesión (2 días).** Cubre el caso típico: el cliente armó el carrito en la mañana y decide en la noche, o al día siguiente. Coincide además con el uso de los recordatorios de la [lección 18](../18-recordatorios-y-seguimiento/): el cron puede avisarle por un carrito abandonado.
- **Pedido (30 días).** Lo bastante para que el dueño lo consulte, lo reclame un cliente o se cuadre la caja del mes. Pero ojo: **KV no es tu libro contable**. Los pedidos que importan para el negocio van además a una hoja de cálculo, como verás en la [lección 16](../16-panel-con-google-sheets/).
- **`visto:` (1 día).** Su único trabajo es evitar procesar dos veces el mismo mensaje, y Meta reintenta en un lapso corto.

Fíjate también en qué **no** se guarda: tokens, contraseñas ni datos de pago. La sesión contiene teléfono y dirección de entrega, que son datos personales; guardarlos por menos tiempo es una buena práctica de privacidad que retomaremos en la [lección 24](../24-seguridad-y-privacidad/).

## Idempotencia: Meta puede repetir el mismo mensaje

Meta reintenta la entrega del webhook si no recibe un 200 a tiempo, así que **el mismo mensaje puede llegar dos veces**. Si no haces nada, el cliente que pidió «2 leches» recibiría 4. La solución se llama **idempotencia**: procesar el mismo mensaje una o diez veces debe dejar el mismo resultado.

El Worker lo resuelve guardando el id único del mensaje (`wamid...`) en una clave `visto:`:

```js worker.js
const claveVisto = `visto:${evento.id}`;
if (await kv.get(claveVisto)) return;
await kv.put(claveVisto, '1', { expirationTtl: TTL_VISTO });
```

La primera vez no existe y el mensaje se procesa. La segunda, la clave existe y el Worker retorna sin hacer nada. El valor da igual (`'1'`): lo que importa es que la clave exista. Y como tiene TTL de un día, la lista de ids no crece sin fin. Si el envío a Meta falla, el Worker restaura la sesión anterior y borra la marca `visto:` para que el reintento de Meta se procese de nuevo (lo verás en la [lección 10](../10-servidor-del-bot/)).

## Qué le cuesta a tu cuenta cada conversación

KV cobra (o limita, en el plan gratuito) por operación. Para saber cuánto gasta tu bot, lo mejor es **medirlo**: contamos las llamadas a un KV falso mientras un cliente completa un pedido de cinco mensajes (`2 leches`, `listo`, `recojo`, `efectivo`, `confirmar`):

```salida
pedido completo (5 mensajes): { get: 10, put: 11, list: 0 }
```

Cada mensaje hace 2 lecturas (`visto:` y `sesion:`) y 2 escrituras (las mismas dos claves), y el mensaje final suma una escritura más para el pedido. Total: 11 escrituras por pedido completo.

Ahora mira los límites oficiales del [plan gratuito](https://developers.cloudflare.com/kv/platform/limits/): 100 000 lecturas por día y **1 000 escrituras por día**. Con 11 escrituras por pedido, el tope teórico es de unos 90 pedidos completos al día; en la práctica, menos, porque hay clientes que solo preguntan el horario. Para un minimarket pequeño alcanza para la demo y los primeros clientes; para un negocio con mucho movimiento hay que pasar al plan de pago.

> [!importante] Verifica este dato
> Las cuotas de Cloudflare cambian. Antes de prometerle algo a un cliente, revisa la página de [límites de KV](https://developers.cloudflare.com/kv/platform/limits/) y la de [precios](https://developers.cloudflare.com/kv/platform/pricing/).

También hay una pista de optimización a la vista: guardar la marca `visto:` **antes** de procesar el mensaje cuesta una escritura por mensaje. Es el precio de la seguridad frente a duplicados; si algún día sube la factura, puedes tomar esa decisión con datos, no con intuición.

## Las limitaciones de KV (las importantes)

KV no es una base de datos clásica. Estas son las limitaciones que debes tener presentes, todas documentadas por Cloudflare:

### 1. Consistencia eventual

Un cambio es visible de inmediato **en el centro de datos donde se hizo**, pero en otros puede tardar hasta 60 segundos o más, porque cada lugar guarda una copia en caché. Incluso las claves que no existen se cachean: una clave recién creada puede tardar en aparecer. Fuente: [cómo funciona KV](https://developers.cloudflare.com/kv/concepts/how-kv-works/).

Para un cliente que conversa con calma, casi nunca se nota. El problema aparecería con dos mensajes casi simultáneos atendidos por distintos centros de datos.

### 2. No hay operaciones atómicas

Nuestro Worker hace «leer, modificar, escribir». Si **dos mensajes del mismo cliente llegan a la vez**, ambos leen la misma sesión, ambos la modifican y el último en escribir pisa el cambio del otro. Lo reproduje con un KV falso que tarda 10 ms en responder, mandando «2 leches» y «1 arroz» a la vez:

```js carrera.mjs
await Promise.all([
  procesarMensaje(env, msg('wamid.A', '2 leches'), ahora, llamar),
  procesarMensaje(env, msg('wamid.B', '1 arroz'), ahora, llamar),
]);
const s = JSON.parse(datos.get('sesion:51999000111'));
console.log(s.carrito.map((l) => `${l.cantidad} x ${l.nombre}`));
```

```salida
[ '1 x Arroz extra 1 kg' ]
```

Las leches **se perdieron**. Es el clásico *lost update* («actualización perdida»). En la vida real los clientes rara vez escriben dos mensajes en el mismo instante, y WhatsApp tiende a entregarlos en orden, pero sucede. Si tu bot tiene mucha concurrencia, la documentación de Cloudflare recomienda **Durable Objects** para esos casos (un único «portero» por cliente que atiende los mensajes de uno en uno).

Fíjate que la protección `visto:` tampoco es atómica: también es «leer y luego escribir». Con ids distintos no hay problema, pero dos entregas simultáneas del mismo id podrían colarse. Con la frecuencia de reintentos de Meta, es un riesgo muy bajo para una demo y real para un volumen alto.

### 3. Un mismo dato no se puede escribir más de una vez por segundo

El límite oficial es **1 escritura por segundo a la misma clave**. Para sesiones de clientes está bien. No guardes un contador global de visitas en una sola clave.

### 4. `list` devuelve un máximo de 1000 claves por llamada

El cron de recordatorios (lección 18) necesita recorrer todas las sesiones. Este es el código real de `listarJson`:

```js worker.js
async function listarJson(kv, prefijo) {
  const { keys } = await kv.list({ prefix: prefijo });
  const valores = await Promise.all(keys.map((k) => leerJson(kv, k.name)));
  return valores.filter(Boolean);
}
```

El comentario del propio archivo lo admite: «basta para una demo (hasta 1000 claves)». Según la [documentación de `list`](https://developers.cloudflare.com/kv/api/list-keys/), si hay más claves la respuesta trae `list_complete: false` y un `cursor` para pedir la siguiente página; este código **ignora el cursor**. Con 1 500 sesiones activas, 500 quedarían sin recordatorio. Además, cada pasada del cron hace una lectura por sesión: 96 pasadas al día (cada 15 minutos) por 200 sesiones son 19 200 lecturas diarias, una quinta parte del tope gratuito, solo en recordatorios.

La salida honesta es: **KV está bien para empezar, pero cuando el bot crezca, un recorrido completo por todas las sesiones es señal de que necesitas una base de datos**.

### 5. El tamaño no es el problema

Un valor puede pesar hasta 25 MiB y una clave hasta 512 bytes. Nuestra sesión de ejemplo pesa unos 395 bytes. Si algún día guardas conversaciones enteras en una sesión, el límite de tamaño será lo último que te preocupe: el costo en escrituras lo notarás antes.

## Cuándo pasar a otra cosa

| Necesidad | Herramienta |
|---|---|
| Sesiones, pedidos, flags: leer mucho, escribir poco | **KV** (lo que usas ahora) |
| Consultas («pedidos de hoy», «clientes de Surco»), conteos, reportes | **D1** (base SQL de Cloudflare) |
| Un solo escritor por cliente, sin pisarse mensajes | **Durable Objects** |
| El dueño quiere ver y editar los datos sin programar | **Google Sheets** (próxima lección) |

No hace falta migrar hoy. Lo importante es que el código esté **ordenado para poder migrar**: por eso `leerJson`, `guardarJson` y `listarJson` son las únicas funciones que tocan el KV. Si mañana usas D1, cambias esas tres funciones y el motor ni se entera.

## Probar sin gastar un sol

Para mirar las claves de tu KV local mientras corre `npx wrangler dev` (los comandos aceptan `--local` para usar el almacenamiento de desarrollo y `--remote` para el real):

```bash
npx wrangler kv key list --binding BOT_KV --local
npx wrangler kv key get "sesion:51999000111" --binding BOT_KV --local
```

Si algún comando no coincide con tu versión de Wrangler, ejecuta `npx wrangler kv key --help`: la sintaxis de la herramienta evoluciona y la referencia oficial es la [lista de comandos de KV](https://developers.cloudflare.com/kv/reference/kv-commands/).

## Errores frecuentes

- **Guardar objetos sin `JSON.stringify`.** KV guardaría `[object Object]` y no podrías recuperar nada útil.
- **Usar un TTL menor a 60 segundos.** KV no admite vencimientos a menos de un minuto; para esperas cortas guarda la hora y compárala al leer.
- **Guardar sin TTL «por si acaso».** Las sesiones viejas se acumulan con teléfonos y direcciones de personas que ya no te escriben.
- **Asumir que una escritura se ve al instante en todas partes.** KV es eventualmente consistente: no uses una clave como semáforo ni para decisiones que exijan el dato más reciente.
- **Un contador global en una sola clave.** El límite de 1 escritura por segundo por clave te frenará.
- **Recorrer todas las claves sin paginar.** `list` entrega hasta 1000 y un `cursor` para el resto.
- **Guardar secretos en KV.** Los tokens van en `wrangler secret`, nunca en el almacén de datos del negocio.

## Apuntes para llevar

- Un Worker no recuerda nada entre peticiones: la memoria vive fuera, en KV, y el motor puro recibe y devuelve la sesión.
- Las claves llevan prefijo (`sesion:`, `pedido:`, `visto:`) y cada tipo de dato tiene su propio TTL.
- Cada escritura con `expirationTtl` renueva el vencimiento; la sesión vive «2 días desde el último mensaje».
- La marca `visto:<wamid>` vuelve idempotente al Worker frente a los reintentos de Meta.
- KV es eventualmente consistente, no es atómico, permite 1 escritura por segundo por clave y su `list` entrega hasta 1000 claves por llamada.
- Mide antes de prometer: un pedido completo cuesta unas 11 escrituras, y el plan gratuito permite 1 000 al día.
- Mantén el acceso a KV en pocas funciones para poder cambiar a D1 o Durable Objects cuando el negocio crezca.

## Glosario

| Término | Significado |
|---|---|
| KV | Almacén clave-valor global de Cloudflare, rápido para leer y con vencimiento automático. |
| Binding | Nombre (`BOT_KV`) con el que Cloudflare conecta un recurso a tu Worker. |
| Namespace | «Cajón» de KV que agrupa un conjunto de claves. |
| TTL | *Time to live*: segundos que vive un dato antes de borrarse solo. |
| Consistencia eventual | Un cambio tarda un tiempo en verse en todos los centros de datos. |
| Idempotencia | Procesar lo mismo varias veces deja el mismo resultado que procesarlo una vez. |
| Durable Objects | Servicio de Cloudflare con un solo «dueño» por dato, útil cuando se exige orden y atomicidad. |
| D1 | Base de datos SQL de Cloudflare, adecuada para consultas y reportes. |

```quiz
? Un cliente escribió «2 leches» y dos minutos después «listo». ¿Por qué el Worker necesita KV para entender el segundo mensaje?
- Porque Meta exige guardar todos los mensajes
+ Porque el Worker no conserva variables entre peticiones y la sesión debe guardarse fuera
- Porque el motor de reglas solo funciona con una base de datos
- Porque WhatsApp reenvía el historial en cada mensaje
= Cada petición ejecuta el Worker desde cero; la memoria de la conversación debe vivir en un almacén externo.

? ¿Qué hace `expirationTtl: 172800` al guardar una sesión con `kv.put`?
- Impide que la clave se vuelva a escribir durante dos días
+ Hace que la clave se borre sola 172 800 segundos (2 días) después de la última escritura
- Guarda la clave en dos centros de datos distintos
- Cifra el valor durante dos días
= El TTL se mide en segundos; cada nueva escritura vuelve a empezar la cuenta.

? ¿Para qué sirve la clave `visto:<wamid>`?
- Para saber cuántos mensajes leyó el cliente
- Para firmar el webhook
+ Para ignorar un mensaje que Meta entregó más de una vez
- Para renovar la ventana de 24 horas
= Es la marca de idempotencia: si la clave ya existe, el mensaje ya se procesó.

? Dos mensajes del mismo cliente llegan a la vez y el carrito pierde un producto. ¿Qué limitación de KV lo explica?
- El TTL es demasiado corto
+ KV no ofrece operaciones atómicas: ambos leen la misma sesión y el último en escribir pisa al otro
- KV rechaza más de un mensaje por segundo
- Las claves con prefijo no se pueden modificar
= Es la actualización perdida; para ordenar escrituras concurrentes Cloudflare recomienda Durable Objects.

? El cron recorre `list({ prefix: 'sesion:' })` sin cursor y tienes 1 500 sesiones. ¿Qué pasa?
- Cloudflare devuelve las 1 500 en una sola llamada
- Falla con un error de cuota
+ Solo se procesan las primeras 1000 claves; las demás se ignoran porque no se usa el cursor
- Se borran las sesiones sobrantes
= `list` devuelve hasta 1000 claves por llamada; hay que paginar con `cursor` mientras `list_complete` sea `false`.

? Un cliente necesita saber cuántos pedidos hubo hoy por zona. ¿Qué herramienta encaja mejor?
- Una clave `visto:` con un contador
+ D1 (SQL) o una hoja de cálculo, porque KV no sirve para consultas
- Aumentar el TTL de los pedidos
- Guardar todos los pedidos en una sola clave
= KV solo busca por clave o prefijo; para consultas y reportes conviene SQL o una hoja.
```

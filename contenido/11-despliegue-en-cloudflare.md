---
titulo: Despliegue en Cloudflare
resumen: Publicar el bot en Cloudflare Workers paso a paso: cuenta, Wrangler, KV, secretos, wrangler.toml, dry-run, deploy, logs con tail y cómo volver atrás.
minutos: 55
nivel: intermedio
objetivos:
- Crear una cuenta de Cloudflare y autenticar Wrangler en tu computadora.
- Leer y adaptar `wrangler.toml` (nombre, KV, cron y variables) sin exponer secretos.
- Crear el namespace KV y cargar `VERIFY_TOKEN`, `WA_TOKEN` y `APP_SECRET` con `wrangler secret put`.
- Comprobar el empaquetado con `wrangler deploy --dry-run` y describir qué hará el despliegue real.
- Observar el bot en producción con `wrangler tail` y revertir con `wrangler rollback`.
---
## Qué significa «desplegar»

Tu Worker ya corre en tu computadora (lección [10](../10-servidor-del-bot/)). **Desplegar** es subirlo a Cloudflare para que viva en una dirección pública con HTTPS, lista para que Meta la llame las 24 horas aunque tu computadora esté apagada.

El proceso tiene cuatro piezas, que ordenaremos en este orden porque cada una depende de la anterior:

```flujo
Cuenta|Cloudflare
-> wrangler login
KV y secretos|BOT_KV, tokens
-> wrangler deploy
Worker público|workers.dev
-> wrangler tail
Observarlo|logs en vivo
```

> [!importante] Alcance de esta lección
> Aquí aprenderás y practicarás todo lo que no gasta ni arriesga nada: instalar, autenticar, revisar la configuración y ejecutar `wrangler deploy --dry-run` (que empaqueta sin subir). El **despliegue real** lo harás cuando tengas tus credenciales de Meta (lecciones [12](../12-cuenta-y-app-de-meta/) y [13](../13-recibir-mensajes-reales/)); los comandos están explicados para que ese día sea mecánico. En el proyecto de referencia, el dry-run se ejecutó y funciona, pero **no se ha desplegado contra la nube real**.

## La cuenta de Cloudflare

1. Entra a [dash.cloudflare.com](https://dash.cloudflare.com/) y crea una cuenta con tu correo (es gratuita; no se pide tarjeta para el plan gratuito de Workers, pero verifica las condiciones actuales).
2. Confirma tu correo.
3. No necesitas comprar un dominio: Cloudflare te asigna una dirección gratuita del tipo `https://nombre-del-worker.tu-subdominio.workers.dev`.

> [!importante] Verifica este dato
> Los planes, límites y requisitos de la cuenta de Cloudflare (por ejemplo, qué incluye el plan gratuito de Workers y KV) cambian con el tiempo. Revisa [Workers: Pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Workers: Limits](https://developers.cloudflare.com/workers/platform/limits/) y [KV: Pricing](https://developers.cloudflare.com/kv/platform/pricing/) antes de decidir.

La primera vez que despliegues, Cloudflare te pedirá elegir un **subdominio** de `workers.dev` (el «tu-subdominio» de arriba). Se hace una sola vez por cuenta y forma parte de la URL pública de todos tus Workers, así que elige uno neutro y profesional; si trabajas para clientes, no pongas el nombre de un cliente.

## Wrangler: instalar y autenticar

**Wrangler** es la línea de comandos oficial de Cloudflare para Workers. En el proyecto de referencia ya viene como dependencia de desarrollo (`devDependencies`), así que basta:

```bash
cd codigo
npm install
npx wrangler --version
```

```salida
 ⛅️ wrangler 4.148.0
```

Usamos `npx wrangler` (la copia local del proyecto) para que todos usen la misma versión. Después autentica tu cuenta:

```bash
npx wrangler login
```

Se abre el navegador, inicias sesión en Cloudflare y autorizas a Wrangler (usa **OAuth**: no copias contraseñas ni claves). Wrangler guarda un token en una carpeta de configuración de tu usuario. Para comprobar con quién estás conectado:

```bash
npx wrangler whoami
```

Verás tu correo, el nombre de la cuenta y su **Account ID** (un identificador, no un secreto, pero tampoco hace falta publicarlo). Para cerrar sesión, `npx wrangler logout`.

> [!nota] Computadoras compartidas
> Si trabajas en un equipo que no es tuyo, cierra la sesión al terminar (`wrangler logout`). El token de Wrangler permite desplegar en tu cuenta.

## Leer wrangler.toml

`wrangler.toml` es el archivo donde le dices a Cloudflare **qué es** tu Worker. Este es el del proyecto, con sus comentarios:

```toml wrangler.toml
name = "bot-minimarket"
main = "src/worker.js"
compatibility_date = "2026-09-01"

# KV: guarda sesiones, pedidos y los ids de mensajes ya procesados.
[[kv_namespaces]]
binding = "BOT_KV"
id = "00000000000000000000000000000000"          # id de EJEMPLO: reemplázalo
preview_id = "11111111111111111111111111111111"  # id de EJEMPLO para wrangler dev

# Cron: cada 15 minutos corre scheduled() (recordatorios).
[triggers]
crons = ["*/15 * * * *"]

# Variables NO secretas.
[vars]
WA_PHONE_ID = "000000000000000"   # id de EJEMPLO
```

| Línea | Qué hace |
|---|---|
| `name` | Nombre del Worker; forma parte de la URL (`bot-minimarket.<subdominio>.workers.dev`). |
| `main` | Archivo de entrada. Wrangler empaqueta `worker.js` y todo lo que importa. |
| `compatibility_date` | Fija el comportamiento del entorno de ejecución a una fecha, para que las actualizaciones de Cloudflare no cambien tu Worker por sorpresa. |
| `[[kv_namespaces]]` | Conecta la variable `env.BOT_KV` con un almacén KV real, identificado por su `id`. |
| `[triggers] crons` | Programa `scheduled()`; `*/15 * * * *` significa «cada 15 minutos». |
| `[vars]` | Variables **no secretas** visibles en el panel. `WA_PHONE_ID` es un identificador, no una credencial. |

Hay una distinción que decide la seguridad de tu bot: **variables** (`[vars]`, van en el archivo y en Git) frente a **secretos** (se cargan con un comando y nunca se escriben en archivos que subas). Los tres secretos del bot son:

| Secreto | Para qué sirve |
|---|---|
| `VERIFY_TOKEN` | Frase que acuerdas con Meta para verificar el webhook (lección 9). |
| `WA_TOKEN` | Token de acceso con el que tu bot envía mensajes por la API. |
| `APP_SECRET` | Secreto de la app de Meta con el que se firman los webhooks (lección 9). |

> [!importante] Verifica este dato
> Los ids del archivo son de **ejemplo** (`000…`, `111…`). El despliegue real fallará hasta que los reemplaces por los de tu cuenta. Consulta la [referencia de configuración de Wrangler](https://developers.cloudflare.com/workers/wrangler/configuration/) por si cambian los nombres de las claves (Cloudflare también admite `wrangler.jsonc`).

## Crear el KV de verdad

El KV es la memoria del bot. Hasta ahora, en local, Wrangler usaba uno simulado. En la nube necesitas uno real. Un solo comando lo crea:

```bash
npx wrangler kv namespace create BOT_KV
```

Wrangler crea el namespace en tu cuenta y te muestra su **id** (una cadena de 32 caracteres hexadecimales). Dos formas de usarlo:

- Copiar ese id y reemplazar el valor `id = "0000…"` de `wrangler.toml`.
- Añadir `--update-config` al comando para que Wrangler edite el archivo por ti (esta opción aparece en `npx wrangler kv namespace create --help`).

Haz esto una sola vez. El `preview_id` de ejemplo solo importa si usas `wrangler dev --remote` (contra la nube); en local no hace falta.

> [!consejo] Un KV por proyecto
> No reutilices el mismo namespace entre bots de clientes distintos: mezclarías sesiones y pedidos. Crea uno por proyecto (`BOT_KV` en cada `wrangler.toml` apuntando a ids distintos).

## Cargar los secretos

Cada secreto se carga con `wrangler secret put`. El comando te pide el valor por teclado (no se muestra ni queda en el historial de la terminal, a diferencia de pegarlo en una línea de comando):

```bash
npx wrangler secret put VERIFY_TOKEN
npx wrangler secret put WA_TOKEN
npx wrangler secret put APP_SECRET
```

Para `VERIFY_TOKEN` inventas una frase larga y aleatoria (por ejemplo, tres o cuatro palabras al azar más un número) y la guardas en tu gestor de contraseñas: la volverás a escribir en el panel de Meta. Para `WA_TOKEN` y `APP_SECRET` los valores vienen de Meta, y los obtendrás en las lecciones 12 y 13.

Si cargaste todo, puedes ver **solo los nombres** (nunca los valores):

```bash
npx wrangler secret list
```

Otras dos operaciones útiles: `npx wrangler secret delete NOMBRE` para borrar uno y `npx wrangler secret bulk archivo.json` para cargar varios de una vez (hasta 100).

> [!importante] Qué pasa si un secreto se filtra
> Si pegas un token en un chat, lo subes a Git o lo muestras en pantalla, **considéralo comprometido**: revócalo o regenéralo en Meta, y vuelve a cargarlo con `wrangler secret put`. Cambiar un secreto no requiere cambiar el código. Más sobre esto en la [lección 24](../24-seguridad-y-privacidad/).

Y en tu computadora sigues usando `.dev.vars` (que nunca se sube). **No son lo mismo**: `.dev.vars` es para `wrangler dev` en local; `wrangler secret put` es para la nube.

## Probar el empaquetado: wrangler deploy --dry-run

Antes de subir nada, pídele a Wrangler que haga todo menos subir. `--dry-run` compila, comprueba la configuración y se detiene. No toca tu cuenta ni pide credenciales de red:

```bash
npx wrangler deploy --dry-run
```

```salida
 ⛅️ wrangler 4.148.0
────────────────────
Total Upload: 49.42 KiB / gzip: 13.76 KiB
Your Worker has access to the following bindings:
Binding                                                 Resource                  
env.BOT_KV (00000000000000000000000000000000)           KV Namespace              
env.WA_PHONE_ID ("000000000000000")                     Environment Variable      

--dry-run: exiting now.
```

Esta es la salida real del proyecto. Léela como una auditoría:

- **Total Upload: 49.42 KiB.** El paquete del bot completo pesa unos 49 KiB (13.76 KiB comprimido): `worker.js` más todos los módulos que importa. Muy por debajo de los límites de tamaño; revisa los vigentes en la documentación de límites.
- **Bindings.** Son los recursos conectados: `env.BOT_KV` (KV) y `env.WA_PHONE_ID` (variable). **Fíjate en lo que no aparece**: `VERIFY_TOKEN`, `WA_TOKEN` y `APP_SECRET`. No están en el archivo, y así debe ser; viven aparte, como secretos.
- Mientras el `id` del KV siga siendo el de ejemplo (`000…`), el dry-run pasa, pero **el despliegue real fallaría**: es una buena razón para no confiar solo en el dry-run.

Si añades `--outdir dist`, Wrangler deja el paquete resultante en esa carpeta para que lo inspecciones. Con el bot de referencia se generan `worker.js` (unos 50 KB) y `worker.js.map`.

```bash
npx wrangler deploy --dry-run --outdir dist
```

## El despliegue real

Cuando tengas el KV creado con su id en `wrangler.toml` y los secretos cargados, desplegar es un comando (**no lo ejecutes todavía**; ahora solo comprende lo que hará):

```bash
npx wrangler deploy
```

Wrangler va a:

1. empaquetar el Worker (como en el dry-run),
2. subirlo a tu cuenta,
3. publicarlo en `https://bot-minimarket.<tu-subdominio>.workers.dev`,
4. registrar el cron `*/15 * * * *`,
5. imprimir la URL final y un **id de versión** (anótalo: sirve para revertir).

> [!nota] Variables al desplegar
> Por defecto, `wrangler deploy` reemplaza las variables del panel por las de `wrangler.toml`. Si editaste variables a mano en el panel de Cloudflare y no quieres perderlas, existe la opción `--keep-vars`. Los **secretos** no se ven afectados.

Con la URL en mano, repetirás con el Worker real las pruebas de la lección 10:

```bash
curl -s https://bot-minimarket.<tu-subdominio>.workers.dev/salud
```

La respuesta esperada es `{"ok":true}`. Después, la verificación del webhook con tu token real (cambia los datos):

```bash
curl -s -w ' [%{http_code}]\n' "https://bot-minimarket.<tu-subdominio>.workers.dev/webhook?hub.mode=subscribe&hub.verify_token=TU_FRASE&hub.challenge=1158201444"
```

La respuesta esperada es `1158201444 [200]`. Esa misma URL, terminada en `/webhook`, es la que pegarás en el panel de Meta en la lección 13.

## Ver qué pasa: wrangler tail

Un Worker en producción no tiene «terminal». Para ver sus `console.log` y `console.error` mientras funciona, usas `tail`, que transmite los registros en vivo a tu terminal:

```bash
npx wrangler tail bot-minimarket
```

Mientras llegan mensajes verás cada petición y los errores que ya conoces: `Mensaje fallido ...`, `Error procesando webhook: ...`. Algunas opciones de `tail` (están en `npx wrangler tail --help`):

| Opción | Para qué |
|---|---|
| `--format pretty` o `json` | Cómo se muestra cada registro. |
| `--status error` | Solo las invocaciones con error. |
| `--method POST` | Solo las peticiones POST. |
| `--search "texto"` | Solo los registros cuyo `console.log` contiene ese texto. |

> [!consejo] Qué registrar y qué no
> En los registros escribe **identificadores** (el `wamid`, el id de pedido), nunca el texto completo de la conversación ni datos personales. Los registros pueden ser vistos por varias personas y tienen su propia retención. Ya lo hace el bot: `console.error('Mensaje fallido', evento.id, evento.errores)`.

Cloudflare también ofrece un panel de **Observability** (registros históricos) en su sitio web; sus opciones cambian con frecuencia, así que consúltalo en la [documentación de Workers Logs](https://developers.cloudflare.com/workers/observability/logs/) cuando lo necesites.

## Volver atrás: versiones y rollback

Todo despliegue crea una **versión** nueva. Si publicaste un cambio y el bot empezó a fallar, no hace falta correr a editar código: vuelve a la versión anterior.

```bash
npx wrangler deployments list
npx wrangler rollback <id-de-version>
```

`deployments list` muestra los 10 despliegues más recientes con sus ids. `rollback` publica de nuevo la versión que le indiques (sin ella, vuelve a la anterior). Es tu botón de pánico mientras investigas con calma.

Un hábito sano antes de cada despliegue:

1. `npm test` (las 113 pruebas del proyecto en verde).
2. `npx wrangler deploy --dry-run`.
3. `npx wrangler deploy`.
4. `curl` a `/salud` y un vistazo a `wrangler tail`.

## Errores frecuentes

- **Subir `.dev.vars` o pegar tokens en `wrangler.toml`.** Los secretos van con `wrangler secret put`. Si se filtran, regenéralos.
- **Desplegar con los ids de ejemplo del KV.** El dry-run pasa pero el despliegue falla. Reemplaza `id` por el real.
- **Confundir `.dev.vars` con los secretos de la nube.** Cargar `.dev.vars` no sube nada; la nube necesita `secret put`.
- **Olvidar `/webhook` en la URL del panel de Meta.** El Worker acepta también `/`, pero la verificación y el POST deben llegar a la misma dirección que registraste.
- **No guardar el `VERIFY_TOKEN` real.** Lo necesitarás para registrar el webhook; si lo pierdes, define uno nuevo y vuelve a cargarlo.
- **Depurar a ciegas.** Con `wrangler tail` abierto, el 90 % de los fallos de primer despliegue se explican en la primera línea de error.
- **Subir cambios sin pasar `npm test`.** Un 401 inesperado por romper la firma se evita con una prueba que ya existe.

## Apuntes para llevar

- **Desplegar** es publicar el Worker en una URL pública HTTPS (`workers.dev`) sin servidor propio.
- Flujo: cuenta de Cloudflare → `wrangler login` → `kv namespace create` → `secret put` → `deploy` → `tail`.
- `wrangler.toml` guarda lo **no secreto** (nombre, KV, cron, `WA_PHONE_ID`); los secretos (`VERIFY_TOKEN`, `WA_TOKEN`, `APP_SECRET`) se cargan con `wrangler secret put`.
- `wrangler deploy --dry-run` empaqueta y revisa sin subir: el bot de referencia pesa unos 49 KiB.
- `wrangler tail` muestra los registros en vivo; `wrangler rollback` vuelve a una versión anterior.
- Límites, precios y menús de Cloudflare cambian: verifica siempre la documentación oficial.

## Glosario

| Término | Significado |
|---|---|
| Desplegar | Publicar una nueva versión de tu programa en el servidor para que los usuarios la usen. |
| `workers.dev` | Dominio gratuito de Cloudflare donde se publica tu Worker. |
| Binding | Conexión entre tu Worker y un recurso (KV, variable, secreto) accesible por `env`. |
| Namespace de KV | Un «espacio» de almacén clave-valor, con su propio id. |
| Secreto | Valor sensible cargado con `wrangler secret put`, que no queda en archivos. |
| Variable | Valor no sensible definido en `[vars]` de `wrangler.toml`. |
| `--dry-run` | Ejecuta todo el proceso de empaquetado sin subir nada. |
| `wrangler tail` | Comando que transmite en vivo los registros del Worker. |
| Rollback | Volver a publicar una versión anterior del Worker. |
| `compatibility_date` | Fecha que fija la versión del comportamiento del entorno de ejecución. |

```quiz
? ¿Dónde debe vivir el valor de `APP_SECRET` en producción?
- En `wrangler.toml`, dentro de `[vars]`
- En el código de `worker.js`
+ Cargado con `npx wrangler secret put APP_SECRET`
- En un archivo `.dev.vars` subido a Git
= Los secretos no van en archivos que se suban; `secret put` los guarda cifrados en Cloudflare.

? ¿Qué hace `npx wrangler deploy --dry-run`?
+ Empaqueta el Worker y revisa la configuración sin subirlo a la nube
- Despliega solo en una cuenta de pruebas
- Borra los secretos antiguos
- Abre el servidor local para probar
= Es una verificación previa: muestra el tamaño del paquete y los bindings, y se detiene.

? Ejecutaste el dry-run con los ids de ejemplo del KV y pasó sin errores. ¿Qué pasará con un `wrangler deploy` real?
- Funcionará igual
+ Probablemente falle, porque esos ids no existen en tu cuenta; primero hay que crear el KV y reemplazar el id
- Cloudflare creará el KV automáticamente con el id de ejemplo
- Meta reemplazará los ids
= El dry-run no consulta tu cuenta; el despliegue real sí necesita ids válidos.

? ¿Para qué sirve `npx wrangler tail`?
- Para subir archivos al KV
+ Para ver en vivo los registros (`console.log`/`console.error`) del Worker en producción
- Para firmar los webhooks
- Para crear secretos
= Es la forma más rápida de ver errores de un Worker desplegado.

? Un despliegue nuevo rompió el bot. ¿Qué haces primero para recuperar el servicio?
- Borrar la cuenta de Cloudflare
- Cambiar el `VERIFY_TOKEN`
+ Revertir con `npx wrangler rollback` a la versión anterior y luego investigar con calma
- Apagar la computadora
= Cada despliegue es una versión; volver a la anterior es rápido y no requiere editar código.
```

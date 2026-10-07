---
titulo: Panel del dueño con Google Sheets
resumen: Guarda cada pedido del bot como una fila en Google Sheets mediante una aplicación web de Apps Script protegida con secreto, y arma un panel sencillo para el dueño.
minutos: 60
nivel: intermedio
objetivos:
- Explicar por qué una hoja de cálculo es un buen primer panel para el dueño de un negocio pequeño.
- Escribir un `doPost` en Google Apps Script que reciba un pedido, valide un secreto y agregue una fila.
- Publicar el script como aplicación web y llamarlo desde el Worker con `fetch`, sin romper el bot si la hoja falla.
- Convertir un pedido en una fila ordenada y proteger los datos personales de los clientes.
- Armar una pestaña de panel con totales del día y pedidos por estado.
---
## Por qué una hoja de cálculo es un buen panel

El bot ya guarda los pedidos en KV ([lección 15](../15-memoria-con-kv/)), pero KV es un cajón para programadores: el dueño del minimarket no puede abrirlo, filtrarlo ni imprimirlo. Lo que él quiere es **ver los pedidos del día, marcarlos como entregados y saber cuánto vendió**. Casi todo dueño de un negocio pequeño ya sabe usar una hoja de cálculo, y Google Sheets viene con lo que necesitas: es gratis, se abre desde el celular, se comparte con un clic y permite filtros, colores y fórmulas.

La idea es tratar la hoja como **la libreta de pedidos del local**. El bot escribe una fila por pedido; el dueño la lee y la edita. No necesitas construir una web de administración, ni programar login, ni pagar una base de datos. Para vender un bot a un negocio pequeño, es una de las mejoras con mejor relación entre esfuerzo y valor.

Hay un obstáculo: el Worker de Cloudflare no puede escribir en una hoja sin un permiso de Google. La solución más simple para empezar es **Google Apps Script**, un entorno de JavaScript que corre en los servidores de Google, ya está conectado a tu cuenta y puede publicarse como una **aplicación web** con su propia URL. El Worker le manda un pedido por HTTP; el script lo escribe en la hoja.

```flujo
Worker|bot en Cloudflare
-> POST con el pedido (JSON)
Apps Script|aplicación web
-> appendRow
Google Sheets|hoja Pedidos
-> la abre
Dueño|celular o PC
```

> [!nota] Un camino, no el único
> Existe también la API oficial de Google Sheets con cuenta de servicio. Es más flexible pero exige configurar un proyecto de Google Cloud y firmar tokens. Apps Script es más corto y suficiente para esta etapa. Cuando el volumen crezca, esa será una mejora posible.

## Paso 1: preparar la hoja

Crea una hoja de cálculo nueva con una cuenta de Google **de pruebas** (no la del negocio real de un cliente mientras practicas). Llámala `Minimarket La Esquina - Pedidos` y renombra la primera pestaña como `Pedidos`. En la fila 1 escribe los encabezados, en este orden exacto:

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| Fecha | Pedido | Telefono | Productos | Total | Entrega | Direccion | Pago | Estado |

Dos ajustes que ahorran problemas:

- **Columna C (Telefono) como texto plano.** Selecciónala y aplica *Formato > Número > Texto sin formato*. Así Sheets no convierte `51999000111` en número (ni recorta ceros ni usa notación científica).
- **Columna A (Fecha) con formato de fecha y hora.** El script escribirá una fecha real; el formato decide cómo se ve.

Revisa también la **zona horaria** de la hoja en *Archivo > Configuración*: si no coincide con la del negocio, las horas se verán corridas. (Los nombres exactos de los menús de Google cambian de vez en cuando: si alguno no coincide, busca la opción equivalente.)

## Paso 2: el script que recibe los pedidos

En la hoja abre **Extensiones > Apps Script**. Se abrirá un editor con un archivo `Código.gs`. Reemplaza su contenido por este código. En una aplicación web, una petición **POST** ejecuta la función `doPost(e)`, y el cuerpo que mandó el Worker llega como texto en `e.postData.contents` (así lo describe la [guía de aplicaciones web](https://developers.google.com/apps-script/guides/web)).

```js Código.gs
const HOJA = 'Pedidos';

function responder(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let datos;
  try {
    datos = JSON.parse(e.postData.contents);
  } catch (err) {
    return responder({ ok: false, error: 'JSON invalido' });
  }

  const esperado = PropertiesService.getScriptProperties().getProperty('HOJA_SECRETO');
  if (!esperado || datos.secreto !== esperado) {
    return responder({ ok: false, error: 'no autorizado' });
  }
  if (datos.accion !== 'nuevo_pedido' || !Array.isArray(datos.fila) || datos.fila.length !== 9) {
    return responder({ ok: false, error: 'peticion invalida' });
  }

  const fila = datos.fila.slice();
  fila[0] = new Date(fila[0]); // texto ISO -> fecha real de la hoja

  const candado = LockService.getScriptLock();
  candado.waitLock(10000); // espera hasta 10 s a que otro pedido termine de escribir
  try {
    const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA);
    hoja.appendRow(fila);
  } finally {
    candado.releaseLock();
  }
  return responder({ ok: true });
}
```

Qué hace cada parte y por qué:

- **`responder`.** Una aplicación web debe devolver un objeto de texto o HTML; devolvemos JSON para que el Worker pueda leer el resultado.
- **`try/catch` con `JSON.parse`.** Si alguien manda basura, respondemos un error en lugar de dejar que el script se caiga.
- **El secreto.** Esto es crucial, y lo desarrollamos en la sección de seguridad: la URL de la aplicación web será accesible a cualquiera que la conozca, así que el script exige una clave que solo conocen el Worker y tú.
- **Validar `accion` y la forma de `fila`.** El script solo sabe hacer una cosa; si le piden otra, se rechaza.
- **`LockService`.** Si llegan dos pedidos casi a la vez, el candado hace que las escrituras ocurran una por una. `getScriptLock()` devuelve un candado que impide que dos ejecuciones corran a la vez la sección protegida; solo se adquiere al llamar a `waitLock` o `tryLock` ([referencia de LockService](https://developers.google.com/apps-script/reference/lock/lock-service)).
- **`appendRow`.** Agrega una fila al final de los datos existentes ([referencia de Sheet](https://developers.google.com/apps-script/reference/spreadsheet/sheet)).

### Probar la lógica sin Google

No tienes que esperar a desplegar para saber si la lógica funciona. Ejecuté este mismo código en Node con **dobles de prueba** (objetos falsos que imitan `ContentService`, `PropertiesService`, `LockService` y `SpreadsheetApp`) y cuatro llamadas distintas: una correcta, otra con secreto equivocado, otra con acción desconocida y una con texto que no es JSON:

```salida
{"ok":true}
{"ok":false,"error":"no autorizado"}
{"ok":false,"error":"peticion invalida"}
{"ok":false,"error":"JSON invalido"}
1 Pedidos true 2026-10-07T15:00:25.000Z
```

La última línea confirma que solo se escribió **una** fila (la correcta), en la pestaña `Pedidos`, y que la primera celda es un objeto `Date` real. Lo que este experimento no prueba es la parte de Google (permisos, despliegue): eso se comprueba en el Paso 4.

### Guardar el secreto

No pegues el secreto dentro del código. En el editor, abre **Configuración del proyecto** (el engranaje), baja a **Propiedades del script** y añade una propiedad `HOJA_SECRETO` con una frase larga y aleatoria (por ejemplo 32 caracteres que generes tú). El código la lee con `PropertiesService.getScriptProperties().getProperty('HOJA_SECRETO')`. Guarda ese mismo valor en tu Worker como secreto en el paso siguiente.

## Paso 3: convertir un pedido en una fila

Ya sabes cómo se ve un pedido que sale del motor. Es el objeto real que produce `procesar` al confirmar (el id es aleatorio, el tuyo será distinto):

```salida
{
 "id": "LE-Y8IDYG",
 "telefono": "51999000111",
 "items": [{ "id": "leche", "nombre": "Leche entera 1 L", "precio": 4.3, "cantidad": 2 }],
 "total": 8.6,
 "entrega": "recojo",
 "direccion": null,
 "pago": "efectivo",
 "estado": "recibido",
 "creadoEn": 1791385225000
}
```

(Lo reduje a menos líneas para leerlo mejor; los campos son los mismos.) Necesitamos pasarlo a un arreglo de 9 valores, uno por columna. Creamos un archivo nuevo en tu proyecto, `src/hoja.js`, **sin tocar los archivos de referencia**:

```js src/hoja.js
export function pedidoAFila(p) {
  return [
    new Date(p.creadoEn).toISOString(),
    p.id,
    p.telefono,
    p.items.map((i) => `${i.cantidad} x ${i.nombre}`).join('; '),
    p.total,
    p.entrega,
    p.direccion ?? '',
    p.pago,
    p.estado,
  ];
}

export async function enviarPedidoAHoja(env, pedido, llamar = fetch) {
  const r = await llamar(env.HOJA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ secreto: env.HOJA_SECRETO, accion: 'nuevo_pedido', fila: pedidoAFila(pedido) }),
  });
  const datos = await r.json().catch(() => ({}));
  if (!datos.ok) throw new Error(`La hoja respondió: ${datos.error ?? r.status}`);
  return datos;
}
```

Con el pedido de arriba, `pedidoAFila` entrega (salida real):

```salida
[
  '2026-10-07T15:00:25.000Z',
  'LE-Y8IDYG',
  '51999000111',
  '2 x Leche entera 1 L',
  8.6,
  'recojo',
  '',
  'efectivo',
  'recibido'
]
```

Detalles de diseño que merecen explicación:

- **Un solo texto para los productos.** Un pedido tiene un número variable de productos; si cada uno ocupara una columna, la hoja se volvería ilegible. Una celda con `2 x Leche; 1 x Arroz` es lo que el dueño lee de un vistazo. (Si algún día necesitas analizar ventas por producto, harás una segunda pestaña con una fila por producto.)
- **Fecha ISO.** Es un formato sin ambigüedades; el script la convierte en fecha de la hoja.
- **`Content-Type: text/plain`.** Con `text/plain` evitamos una verificación previa (*preflight*) que algunos servicios aplican a las llamadas con `application/json` y que las aplicaciones web de Apps Script no manejan. Es una receta frecuente, pero no pude confirmarla en la documentación oficial. **Verifica este dato** en la [guía de aplicaciones web](https://developers.google.com/apps-script/guides/web) y, sobre todo, pruébalo con tu despliegue: es la forma más segura de saber.
- **Revisión de `ok`.** Nuestro script responde con estado HTTP 200 aunque el contenido sea un error (devuelve `{"ok":false}`), así que no basta mirar el código HTTP: leemos el JSON.

El Worker, a su vez, necesita conocer la URL y el secreto. En `wrangler.toml` deja un valor de ejemplo y guarda los reales como secretos:

```bash
npx wrangler secret put HOJA_URL
npx wrangler secret put HOJA_SECRETO
```

La URL de una aplicación web contiene un identificador largo y permite escribir a tu hoja si alguien sabe el secreto: trátala como un dato **privado**, no la publiques en tu repositorio.

### Conectarlo al bot sin romper nada

Un principio de diseño: **la hoja es un extra; si falla, el cliente debe seguir recibiendo su confirmación**. Por eso la llamada va en un `try/catch` que solo registra el error. En `procesarMensaje`, justo después de guardar el pedido en KV, añadirías:

```js worker.js
if (sesion.pedidoNuevo) {
  await guardarJson(kv, `pedido:${sesion.pedidoNuevo.id}`, sesion.pedidoNuevo, TTL_PEDIDO);
  await enviarPedidoAHoja(env, sesion.pedidoNuevo, llamar)
    .catch((e) => console.error('No se pudo escribir en la hoja:', e.message));
}
```

Y no olvides `import { enviarPedidoAHoja } from './hoja.js';` al inicio. Esto es un cambio que **tú** haces en tu copia del proyecto: el archivo de referencia del curso no lo incluye.

Probé el lado Worker uniendo todo con un `fetch` falso que llama directamente al `doPost` de arriba. Con el secreto correcto escribe una fila; con un secreto incorrecto el Worker se queda con el error y la hoja no recibe nada:

```salida
{ ok: true }
1
La hoja respondió: no autorizado
1
```

Las dos últimas líneas son el número de filas escritas antes y después del intento no autorizado: sigue siendo 1.

### ¿Y si la hoja está caída?

El pedido ya está a salvo en KV (30 días), pero no llegó a la hoja. Una mejora sencilla es guardar una marca de «pendiente de hoja» y reintentarlo en el cron de la [lección 18](../18-recordatorios-y-seguimiento/). No la implementamos aquí para mantener la lección enfocada, pero que el dato siga en KV es justamente lo que te permite reintentar.

## Paso 4: publicar la aplicación web

En el editor de Apps Script:

1. Pulsa **Implementar > Nueva implementación**.
2. Junto a «Seleccionar tipo», elige **Aplicación web**.
3. Configura **Ejecutar como: Yo** (el script corre con tus permisos aunque quien llame sea el Worker) y **Quién tiene acceso: Cualquier persona**.
4. Pulsa **Implementar**, concede los permisos que Google solicite (acceso a tus hojas) y copia la URL que termina en `/exec`.

La [guía oficial](https://developers.google.com/apps-script/guides/web) explica estas dos opciones: con «Ejecutar la aplicación como yo» el script siempre corre como el propietario; con «como el usuario que accede» corre con la identidad de quien visita. Para un Worker sin cuenta de Google necesitas la primera.

> [!importante] Verifica este dato
> Los nombres de menús y opciones de Google cambian con el tiempo (en este texto los traduje del inglés habitual). Si no los encuentras, sigue la [guía oficial de aplicaciones web](https://developers.google.com/apps-script/guides/web). Dos reglas que sí son estables: la implementación de **prueba** (URL terminada en `/dev`) solo funciona para quien edita el script y ejecuta siempre el código guardado más reciente; la URL `/exec` ejecuta la **versión implementada**, así que después de cambiar el código debes publicar una nueva versión de la implementación para que el cambio tenga efecto.

### Probar con curl

```bash
curl -L -X POST "https://script.google.com/macros/s/EJEMPLO/exec" \
  -H "Content-Type: text/plain;charset=utf-8" \
  -d '{"secreto":"clave-larga-de-ejemplo","accion":"nuevo_pedido","fila":["2026-10-07T15:00:25.000Z","LE-PRUEBA","51999000111","1 x Pan de molde",6.5,"recojo","","efectivo","recibido"]}'
```

La opción `-L` hace que `curl` siga redirecciones. La razón: según lo que se observa habitualmente, las aplicaciones web de Apps Script responden a un POST con una redirección (código 302) hacia otra dirección de Google donde está el resultado. Esa redirección no está descrita en la página oficial que consulté, así que **verifica este dato** con tu propio despliegue: si ves `Moved Temporarily` o un HTML en lugar de `{"ok":true}`, falta el `-L`. El `fetch` de un Worker sigue redirecciones por defecto, por lo que `enviarPedidoAHoja` no necesita nada especial. Lo importante: el script se ejecuta (y la fila se escribe) en la primera petición; la redirección solo sirve para entregarte la respuesta.

Cambia el secreto por uno incorrecto y deberías ver `{"ok":false,"error":"no autorizado"}`. Si en cambio recibes una página de inicio de sesión de Google, el acceso no está en «Cualquier persona».

## Seguridad: la URL es pública, el secreto no

Cuando eliges «Cualquier persona», cualquiera que conozca la URL puede llamarla. No puedes limitar por dirección IP, y el evento `e` de `doPost` no incluye las cabeceras HTTP, así que no puedes validar una firma como la del webhook de Meta (**verifica este dato** en la guía oficial si Google lo cambia). Tu defensa es el **secreto compartido** dentro del cuerpo. Aplica estas reglas:

- **Largo y aleatorio.** Una frase fácil se adivina. Genera un valor de al menos 32 caracteres.
- **Solo en secretos.** En el Worker (`wrangler secret put`) y en las propiedades del script; nunca en GitHub ni en capturas de pantalla.
- **Una sola acción permitida.** Nuestro script solo agrega filas; no borra ni lee. Si alguien consiguiera el secreto, lo peor que puede hacer es llenar la hoja de pedidos falsos.
- **Rota el secreto** si sospechas que se filtró: cambia la propiedad y el secreto del Worker a la vez.
- **Datos personales mínimos.** La hoja guarda teléfonos y direcciones de clientes. Compártela solo con quienes la necesiten, con permiso de **lectura** cuando baste, y avisa al dueño de que esa información es sensible ([lección 24](../24-seguridad-y-privacidad/)). Y en tus pruebas, usa siempre datos falsos como `51999000111`.

## Paso 5: el panel del dueño

Una hoja con filas es un registro; un **panel** es lo que el dueño mira primero: «¿cuánto vendí hoy y qué falta entregar?». Crea una segunda pestaña llamada `Panel`. Las fórmulas siguientes usan la sintaxis en inglés y comas; en una hoja configurada en español, Google traduce los nombres de las funciones (por ejemplo `COUNTIFS` se muestra como `CONTAR.SI.CONJUNTO`) y puede pedir punto y coma como separador. No las ejecuté aquí; pruébalas con tus datos y, si Sheets marca error, usa el autocompletado de la propia hoja.

| Celda | Qué muestra | Fórmula |
|---|---|---|
| `A1` | Día a consultar | una fecha, por ejemplo `07/10/2026` |
| `B2` | Pedidos del día | `=COUNTIFS(Pedidos!A:A,">="&A1,Pedidos!A:A,"<"&A1+1,Pedidos!I:I,"<>cancelado")` |
| `B3` | Ventas del día (S/) | `=SUMIFS(Pedidos!E:E,Pedidos!A:A,">="&A1,Pedidos!A:A,"<"&A1+1,Pedidos!I:I,"<>cancelado")` |
| `B4` | Pedidos por entregar | `=COUNTIF(Pedidos!I:I,"recibido")` |

Esto replica la lógica del ejercicio: contar y sumar las filas del día que no estén canceladas. Para que el dueño cambie el estado sin escribir:

- Selecciona la columna **I** (Estado) y usa **Datos > Validación de datos** con una lista: `recibido, preparando, entregado, cancelado`.
- Aplica **Formato condicional** para pintar de verde `entregado` y de rojo `cancelado`.
- Activa un **filtro** en la fila 1 para que pueda ver solo los pedidos pendientes.

Un punto importante de diseño: este panel es **de una vía**. El bot escribe en la hoja, pero si el dueño cambia el estado a «entregado», el bot **no se entera** (el pedido en KV sigue como `recibido`, y por eso podría salir un recordatorio de un pedido que ya se entregó). Cerrar ese ciclo es posible, por ejemplo con un *trigger* que avise al Worker al editar la hoja, pero añade complejidad. Para la primera versión, avisa al dueño de esa limitación y evita enviar recordatorios de pedidos que ya están marcados como entregados en el negocio real.

> [!ejemplo] Una mañana con el panel
> **Dueño:** abre la hoja en su celular a las 8:00 a. m. y ve en `Panel` 3 pedidos del día por S/ 41.10. Filtra por `recibido`, prepara las bolsas, y al entregar cada una cambia la celda de Estado a `entregado`. Al cierre, el total del día ya está calculado: no hace cuentas a mano.

## Cuotas y límites

Apps Script tiene cuotas por día. Para cuentas personales (como las de gmail.com), la [página de cuotas](https://developers.google.com/apps-script/guides/services/quotas) indica, entre otras, 6 minutos de ejecución por llamada y hasta 30 ejecuciones simultáneas por usuario. Para escribir una fila por pedido no es un problema; si tu bot recibiera cientos de pedidos por minuto, tendrías que cambiar de enfoque. **Verifica este dato** en esa página, porque las cuotas se actualizan y difieren entre cuentas gratuitas y Workspace.

## Errores frecuentes

- **Probar el script con una URL `/dev` desde el Worker.** Esa URL solo sirve para quien edita el script. El Worker debe usar la `/exec`.
- **Cambiar el código y no crear una nueva versión de la implementación.** La URL `/exec` seguirá ejecutando la versión anterior.
- **Elegir «Solo yo» como acceso.** El Worker recibirá una página de inicio de sesión en lugar de JSON.
- **Olvidar `-L` en `curl`** y pensar que «no funciona» cuando la fila sí se escribió.
- **Poner el secreto en el código o en el repositorio.** Va en propiedades del script y en `wrangler secret`.
- **Dejar que un fallo de la hoja detenga el bot.** Siempre `try/catch` o `.catch`: el cliente debe recibir su confirmación igual.
- **Sumar con decimales sin cuidado.** `0.1 + 0.2` no da `0.3` en JavaScript; suma en céntimos o deja que las fórmulas de la hoja lo hagan.
- **Compartir la hoja con edición pública.** Contiene teléfonos y direcciones: comparte solo con personas concretas.

## Apuntes para llevar

- Una hoja de Google es un panel excelente para empezar: gratis, conocida por el dueño y editable desde el celular.
- El Worker llama a una aplicación web de Apps Script cuyo `doPost(e)` lee `e.postData.contents`, valida un secreto y hace `appendRow`.
- La URL de la aplicación es accesible para quien la conozca: la protección es un secreto largo guardado en propiedades del script y en `wrangler secret`.
- `LockService` ordena las escrituras simultáneas; nuestro script responde 200 aunque haya error, así que lee el JSON.
- La hoja es un extra: si falla, el pedido sigue en KV y el cliente recibe su confirmación.
- El panel es de una vía: lo que el dueño edita en la hoja no vuelve al bot.
- Las hojas guardan datos personales: comparte lo mínimo y usa datos falsos al practicar.

## Glosario

| Término | Significado |
|---|---|
| Apps Script | Entorno de JavaScript de Google que automatiza Sheets, Docs y otros servicios. |
| Aplicación web | Script publicado con una URL que responde a peticiones HTTP (`doGet`, `doPost`). |
| `doPost(e)` | Función que se ejecuta cuando la aplicación web recibe un POST. |
| Secreto compartido | Clave que solo conocen quien llama y quien recibe, para validar la petición. |
| `appendRow` | Método que añade una fila al final de los datos de una hoja. |
| LockService | Servicio que evita que dos ejecuciones escriban a la vez. |
| Propiedades del script | Lugar para guardar valores como el secreto, fuera del código. |
| Panel | Pestaña con totales y estados que el dueño consulta de un vistazo. |

```quiz
? ¿Por qué se usa Apps Script en vez de escribir directo a Sheets desde el Worker?
- Porque Cloudflare no permite hacer peticiones HTTP
+ Porque Apps Script ya está autenticado con tu cuenta de Google y evita configurar un proyecto de Google Cloud y firmar tokens
- Porque Sheets solo acepta datos desde Apps Script
- Porque Apps Script es más rápido que cualquier API
= Es el camino más corto para empezar; la API de Sheets con cuenta de servicio es más flexible pero más trabajosa.

? ¿Qué función ejecuta una aplicación web de Apps Script cuando recibe un POST?
- `onPost(e)`
- `recibir(e)`
+ `doPost(e)`
- `main(e)`
= `doPost(e)` recibe el evento; el cuerpo llega como texto en `e.postData.contents`.

? La aplicación web está abierta a «Cualquier persona». ¿Qué protege tu hoja de pedidos falsos?
- La longitud de la URL
- Que la URL termine en `/exec`
+ Un secreto largo en el cuerpo, validado dentro de `doPost` contra una propiedad del script
- Nada: cualquiera puede escribir siempre
= `doPost` no recibe las cabeceras para validar una firma, así que el secreto compartido es la defensa principal.

? El Worker recibe HTTP 200 de la hoja pero la fila no aparece. ¿Qué debes revisar primero?
- Que el cliente tenga WhatsApp Business
+ El JSON de la respuesta: nuestro script responde 200 aunque devuelva `{"ok":false,...}`
- La zona horaria del Worker
- Que la hoja tenga menos de mil filas
= No basta con el código HTTP: hay que leer `ok` y `error` en el cuerpo.

? Si Google Sheets falla justo al confirmar un pedido, ¿cuál es el comportamiento correcto del bot?
- Anular el pedido y pedir disculpas al cliente
- Reintentar sin parar hasta que la hoja responda
+ Registrar el error y confirmar igual al cliente, porque el pedido sigue guardado en KV
- Enviar el pedido por correo al cliente
= La hoja es un complemento: no debe poder romper la conversación; el dato queda en KV para reintentarlo.

? El dueño cambia el estado de un pedido a «entregado» en la hoja. ¿Qué pasa con el pedido en KV en este diseño?
- Se actualiza automáticamente
- Se borra
+ Sigue como `recibido`, porque el panel es de una sola vía (bot a hoja)
- Se envía una plantilla al cliente
= Para sincronizar la otra dirección hace falta un mecanismo adicional (por ejemplo, un trigger que llame al Worker).
```

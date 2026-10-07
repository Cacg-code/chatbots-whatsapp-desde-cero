---
titulo: El estado de la conversación
resumen: Cómo un bot recuerda en qué punto va cada cliente con una sesión y una máquina de estados, y por qué su cerebro debe ser una función pura.
minutos: 55
nivel: intermedio
objetivos:
- Explicar por qué un bot necesita memoria (estado) y qué guarda una sesión por cliente.
- Leer y dibujar una máquina de estados con estados, eventos y transiciones.
- Describir la firma `procesar(sesion, entrada) -> { sesion, respuestas }` y por qué es una función pura.
- Manejar eventos globales (cancelar, hablar con una persona) y botones viejos sin romper el flujo.
- Escribir una mini máquina de estados que no muta la sesión recibida.
fuentes:
- Map en MDN | https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Map
- JSON en MDN | https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/JSON
---
## Por qué un bot necesita memoria

Imagina que un cliente del Minimarket La Esquina te escribe «2» a las 10:00. ¿Qué significa? Si un minuto antes el bot preguntó «¿Cuántas leches quieres?», es una cantidad. Si preguntó «¿Cómo vas a pagar?», probablemente es un error. Si es el primer mensaje del día, no significa nada. **El mismo texto vale cosas distintas según el punto de la conversación en que estás.**

Ese «punto en que estás» se llama **estado**. Sin estado, un bot solo puede responder a cada mensaje como si fuera el primero (un bot «sin memoria»), y eso sirve para un menú fijo, pero no para tomar un pedido de varios pasos: ¿qué pidió el cliente?, ¿ya eligió entrega?, ¿ya dio su dirección?

Hay una pista importante en cómo funciona WhatsApp: **cada mensaje llega a tu código por separado**, como una petición independiente (lo verás en la [lección 9](../09-webhooks-y-json-de-whatsapp/)). Tu servidor no «recuerda» al cliente entre una petición y otra. Tienes que guardar esa memoria tú, y devolverla cuando llegue el siguiente mensaje.

> [!nota] Estado vs. mensaje
> Un **mensaje** es lo que dice el cliente en este instante. El **estado** es todo lo que el bot sabe de esa conversación hasta ahora. Para decidir qué responder siempre necesitas las dos cosas.

## La sesión: la libreta de cada cliente

La memoria del bot es una **sesión**: un objeto que guarda todo lo que sabemos de un cliente en una conversación. Hay una sesión por teléfono. En el código de referencia del curso, `crearSesion` la crea así (ejecutado en Node 24):

```js ejemplo.js
import { crearSesion } from './src/motor.js';

console.log(crearSesion('51999000111', 0));
```

```salida
{
  telefono: '51999000111',
  estado: 'INICIO',
  carrito: [],
  entrega: null,
  direccion: null,
  pago: null,
  fallos: 0,
  productoPendiente: null,
  cantidadPendiente: null,
  pedidoNuevo: null,
  derivadoHumano: false,
  recordatorioEnviado: false,
  creadoEn: 0,
  ultimoMensajeCliente: 0,
  actualizadoEn: 0
}
```

Fíjate en cómo se agrupa lo que contiene:

| Campo | Para qué sirve |
|---|---|
| `telefono` | Identifica al cliente (en el curso usamos el número falso `51999000111`). |
| `estado` | El punto de la conversación: `INICIO`, `MENU`, `ELIGIENDO`... |
| `carrito`, `entrega`, `direccion`, `pago` | Lo que el cliente va decidiendo durante el pedido. |
| `fallos` | Cuántos mensajes seguidos no entendimos (para ofrecer ayuda humana). |
| `productoPendiente`, `cantidadPendiente` | Datos a medias: «eligió leche, falta la cantidad». |
| `pedidoNuevo` | Lo llena el motor al confirmar; quien guarda datos lo recoge. |
| `derivadoHumano` | Si una persona está atendiendo (el bot debe callar). |
| `ultimoMensajeCliente`, `actualizadoEn`, `creadoEn` | Marcas de tiempo, en milisegundos. Sirven para la regla de las 24 horas y los recordatorios. |

Las marcas de tiempo son números de la forma `Date.now()`, como en el ejercicio de la [lección 1](../01-como-funciona-un-bot/). El motor las recibe como parámetro (`ahora`) en lugar de leer el reloj él mismo; más adelante verás por qué.

## Estados, eventos y transiciones

Una **máquina de estados** es una forma ordenada de pensar este problema. Tiene tres ingredientes:

- **Estados:** los puntos posibles de la conversación (en cuál estoy).
- **Eventos:** lo que puede ocurrir (el cliente escribe, toca un botón).
- **Transiciones:** a qué estado paso desde cada estado cuando ocurre un evento.

Los estados del bot del minimarket están declarados en `src/motor.js`:

```js src/motor.js
export const ESTADOS = {
  INICIO: 'INICIO',
  MENU: 'MENU',
  ELIGIENDO: 'ELIGIENDO',
  CARRITO: 'CARRITO',
  TIPO_ENTREGA: 'TIPO_ENTREGA',
  DIRECCION: 'DIRECCION',
  PAGO: 'PAGO',
  CONFIRMAR: 'CONFIRMAR',
  FIN: 'FIN',
  ESPERANDO_HUMANO: 'ESPERANDO_HUMANO',
};
```

Y el camino normal de un pedido, tal como lo dibujaste en la [lección 2](../02-disenar-la-conversacion/), se ve así:

```flujo
INICIO|primer mensaje
-> hola
MENU|3 botones
-> hacer pedido
ELIGIENDO|categorías y productos
-> finalizar
TIPO_ENTREGA|recojo o delivery
-> delivery
DIRECCION|texto libre
-> dirección
PAGO|efectivo, Yape, transferencia
-> elegir
CONFIRMAR|resumen
-> confirmar
FIN|pedido guardado
```

Hay dos estados extra que no están en el camino principal: `CARRITO` (el cliente está viendo o editando lo que lleva) y `ESPERANDO_HUMANO` (una persona tomó la conversación). Y desde cualquier punto, «cancelar» lleva a `FIN` y «hablar con una persona» lleva a `ESPERANDO_HUMANO`.

> [!consejo] Dibuja antes de programar
> Si no puedes dibujar la máquina de estados en una hoja con cajas y flechas, todavía no entiendes tu bot. Es mucho más barato corregir un dibujo que reescribir código. Si usaste el flujo de la lección 2, ya tienes este dibujo casi hecho.

## Mirar al motor cambiar de estado

Veámoslo funcionar. Creamos una sesión, le mandamos «hola», y luego tres toques de botón (cada toque llega como un id; cómo se envían los botones lo verás en la [lección 14](../14-enviar-mensajes/)):

```js ejemplo.js
import { crearSesion, procesar } from './src/motor.js';

const s0 = crearSesion('51999000111', 0);
let r = procesar(s0, { tipo: 'texto', texto: 'hola' }, 1000);
console.log(r.sesion.estado, '| la original sigue en', s0.estado);
console.log(r.respuestas.map((x) => x.tipo));

let s = r.sesion;
for (const id of ['menu_pedir', 'cat:lacteos', 'prod:leche']) {
  const q = procesar(s, { tipo: 'interactivo', id }, 2000);
  s = q.sesion;
  console.log(id, '->', s.estado, '| producto pendiente:', s.productoPendiente, '|', q.respuestas[0].tipo);
}
```

```salida
MENU | la original sigue en INICIO
[ 'texto', 'botones' ]
menu_pedir -> ELIGIENDO | producto pendiente: null | lista
cat:lacteos -> ELIGIENDO | producto pendiente: null | lista
prod:leche -> ELIGIENDO | producto pendiente: leche | botones
```

Observa tres cosas:

1. Después de «hola» la sesión pasó de `INICIO` a `MENU` y el bot respondió con **dos** mensajes (bienvenida + botones). Una respuesta puede ser una lista de mensajes.
2. El estado no cambia siempre: elegir una categoría y luego un producto sigue siendo `ELIGIENDO`. Lo que cambia es el **dato** `productoPendiente` («elegiste leche, falta cuántas»). Un estado puede tener sub-pasos guardados en la sesión.
3. La sesión original `s0` **no cambió**: sigue en `INICIO`. Ahora vemos por qué.

## El cerebro es una función pura

La firma de todo el motor es esta:

```text
procesar(sesion, entrada, ahora) -> { sesion, respuestas }
```

Recibe la sesión actual, lo que escribió el cliente y la hora; devuelve la sesión **nueva** y la lista de respuestas que hay que enviar. No envía nada por WhatsApp, no guarda archivos, no consulta una base de datos, no lee el reloj. Eso la hace una **función pura**: con las mismas entradas siempre devuelve lo mismo y no cambia nada fuera de sí misma.

Las primeras líneas de `procesar` en `src/motor.js` muestran cómo se logra:

```js src/motor.js
export function procesar(sesionPrevia, entrada, ahora = Date.now()) {
  const sesion = structuredClone(sesionPrevia); // nunca modificamos la sesión original
  sesion.pedidoNuevo = null;
  sesion.ultimoMensajeCliente = ahora;
  sesion.actualizadoEn = ahora;
  sesion.recordatorioEnviado = false;
  // ...
}
```

`structuredClone` hace una copia profunda: el motor trabaja sobre la copia y devuelve la copia. Quien lo llame decide qué hacer con ella.

¿Por qué tanto empeño? Por cuatro ventajas muy concretas:

- **Se prueba fácil.** Para probar un paso del flujo no necesitas WhatsApp ni internet: llamas a la función y comparas la salida. El proyecto trae 112 pruebas que corren en menos de un segundo con `npm test`.
- **Se reutiliza.** La consola de la [lección 4](../04-primer-bot-en-consola/) y el servidor de la [lección 10](../10-servidor-del-bot/) son dos «carcasas» distintas alrededor del mismo motor.
- **Se depura.** Si algo sale mal, guardas la sesión y la entrada y reproduces el error exactamente.
- **Se puede guardar donde sea.** Como la sesión es un objeto de datos simples (texto, números, listas), cabe en un archivo, en una base de datos o en la memoria KV de Cloudflare ([lección 15](../15-memoria-con-kv/)).

Que `ahora` sea un parámetro y no un `Date.now()` escondido adentro también ayuda: en las pruebas y los ejemplos de esta lección pasamos `0`, `1000`, `2000`, y el resultado es siempre el mismo.

> [!importante] Sin entrada/salida dentro del motor
> Regla de oro del curso: **el motor decide, la carcasa ejecuta.** El motor devuelve «responde esto» y la carcasa lo envía. Si un día pones un `fetch` o un `console.log` dentro de la lógica del flujo, habrás perdido todas las ventajas de arriba.

## Entender primero, actuar después

Dentro de `procesar` el trabajo está dividido en dos fases, y el código lo dice con comentarios:

```text
1) Entender: convertir la entrada en una "acción"
2) Actuar: cambiar la sesión y preparar respuestas
```

En la fase 1, un toque de botón (`{ tipo: 'interactivo', id: 'cant:2' }`) y un texto libre («quiero 2 leches») se convierten en un mismo vocabulario de **acciones**: `pedir`, `categoria`, `producto`, `cantidad`, `entrega`, `pago`, `cancelar`... En la fase 2, una función `ejecutar` mira la acción y la sesión, y decide.

```js src/motor.js
function accionDeId(id) {
  const [clave, valor] = String(id).split(':');
  const simples = {
    menu_pedir: 'pedir', seguir: 'pedir', menu_menu: 'menu', menu_horario: 'horario',
    menu_humano: 'humano', ver_carrito: 'carrito', cerrar: 'cerrar', vaciar: 'vaciar',
    pedido_confirmar: 'confirmarPedido', pedido_editar: 'editar', pedido_cancelar: 'cancelar',
  };
  if (simples[clave]) return { tipo: simples[clave] };
  if (clave === 'cant' && Number.isInteger(Number(valor))) return { tipo: 'cantidad', cantidad: Number(valor) };
  // ... (entrega, pago, categoría, producto)
  return { tipo: 'desconocida' };
}
```

Los ids de los botones tienen una convención: `clave:valor` (`cant:2`, `pago:yape`, `entrega:delivery`). Así un solo `split(':')` los descompone. Esta separación en dos fases tiene un premio enorme: el día que agregues IA para entender texto ([lección 22](../22-ia-como-complemento/)), solo cambias la fase 1; la fase 2 queda intacta.

## El mismo mensaje, distinto estado

Aquí se ve el valor del estado. Cuando el cliente escribe «tres»:

```js ejemplo.js
// Con 'leche' pendiente de cantidad (estado ELIGIENDO):
const q = procesar(s, { tipo: 'texto', texto: 'tres' }, 3000);
console.log(q.sesion.carrito);
console.log(q.respuestas[0].texto);
```

```salida
[
  { id: 'leche', nombre: 'Leche entera 1 L', precio: 4.3, cantidad: 3 }
]
Agregué 3 x Leche entera 1 L.
Llevas 3 producto(s). Subtotal: S/ 12.90.
```

Esto funciona porque en `accionDeTexto` hay una regla que **solo existe en ese contexto**:

```js src/motor.js
if (sesion.estado === E.ELIGIENDO && sesion.productoPendiente) {
  const n = cantidadSola(textoCliente);
  if (n !== null) return { tipo: 'cantidad', cantidad: n };
}
```

Si el motor no tuviera `productoPendiente`, «tres» se interpretaría como un mensaje sin sentido. Del mismo modo, en el estado `TIPO_ENTREGA` la palabra «delivery» significa «quiero delivery», y en el estado `DIRECCION` **todo** lo que escribe el cliente es la dirección (incluso un «hola»). Es la misma lección una y otra vez: **qué significa un mensaje lo decide el estado.**

## Botones viejos y eventos fuera de lugar

En WhatsApp los botones de un mensaje antiguo siguen en el historial del chat. El cliente puede tocar «Confirmar pedido» **una hora después**, cuando el pedido ya terminó, o tocar «Yape» sin haber elegido nada. Un bot ingenuo se rompe. El motor de referencia defiende cada paso con una tabla:

```js src/motor.js
// Acciones que solo tienen sentido en un paso concreto (un botón viejo no debe romper el flujo).
const SOLO_EN = {
  entrega: E.TIPO_ENTREGA,
  pago: E.PAGO,
  confirmarPedido: E.CONFIRMAR,
};
```

Si la acción no corresponde al estado actual, el bot avisa y **repite la pregunta del paso en que sí estás**. Lo comprobamos en una sesión recién abierta (en `MENU`), tocando un botón de confirmación:

```js ejemplo.js
let t = procesar(crearSesion('51999000111', 0), { tipo: 'texto', texto: 'hola' }, 1).sesion;
const g = procesar(t, { tipo: 'interactivo', id: 'pedido_confirmar' }, 2);
console.log(g.sesion.estado, g.respuestas.map((x) => x.texto));
```

```salida
MENU [
  'Esa opción ya no está disponible en este paso.',
  '¿Qué deseas hacer?'
]
```

El estado no cambia, el cliente recibe una explicación corta y vuelve a ver el menú. Esa función se llama `repetirPaso`: un `switch` sobre el estado que vuelve a mostrar la pregunta pendiente. Es una de las piezas que hacen que un bot se sienta «sólido».

## Eventos globales: cancelar y hablar con una persona

Algunas intenciones valen en cualquier estado y tienen prioridad sobre todo lo demás: **cancelar** y **hablar con una persona**. En `accionDeTexto` se revisan antes que nada (incluso antes de tratar el texto como dirección):

```text
if (intencion === 'cancelar' || intencion === 'humano') return { tipo: intencion };
```

Cancelar reinicia la sesión y la deja en `FIN`; el siguiente mensaje empieza una conversación nueva. Probado:

```js ejemplo.js
let c = procesar(t, { tipo: 'texto', texto: '2 leches' }, 8).sesion;
console.log('carrito antes:', c.carrito.length);
c = procesar(c, { tipo: 'texto', texto: 'cancelar' }, 9);
console.log(c.sesion.estado, c.sesion.carrito.length, '|', c.respuestas[0].texto);
c = procesar(c.sesion, { tipo: 'texto', texto: 'hola' }, 10);
console.log(c.sesion.estado);
```

```salida
carrito antes: 1
FIN 0 | Cancelé tu pedido. Cuando quieras empezar de nuevo, escribe "hola".
MENU
```

«Hablar con una persona» es más sutil porque hay que **callar**. Si una persona del negocio ya está contestando en el mismo chat, un bot que sigue respondiendo es un desastre. El estado `ESPERANDO_HUMANO` resuelve eso; en `procesar` se ve la regla:

```js src/motor.js
// Con una persona atendiendo, el bot calla (salvo "menu" o "cancelar").
const quiereSalir = accion.tipo === 'cancelar' || (accion.tipo === 'menu' && !accion.saludo);
if (sesion.estado === E.ESPERANDO_HUMANO && !quiereSalir) {
  return { sesion, respuestas: [] };
}
```

```js ejemplo.js
let h = procesar(t, { tipo: 'texto', texto: 'quiero hablar con una persona' }, 5);
console.log(h.sesion.estado, h.sesion.derivadoHumano);
h = procesar(h.sesion, { tipo: 'texto', texto: 'hola?? alguien' }, 6);
console.log('respuestas mientras atiende una persona:', h.respuestas.length);
h = procesar(h.sesion, { tipo: 'texto', texto: 'menu' }, 7);
console.log(h.sesion.estado);
```

```salida
ESPERANDO_HUMANO true
respuestas mientras atiende una persona: 0
MENU
```

Las respuestas son una lista **vacía**: callar también es una respuesta válida. Y siempre hay una salida (`menu` o `cancelar`) para que el cliente no quede atrapado. Cómo se organiza la atención humana de verdad lo verás en la [lección 25](../25-atencion-humana/).

## Cuando no entiendes: el contador de fallos

El campo `fallos` evita un clásico: el bot que responde «No te entendí» eternamente. La regla del código de referencia es simple. Primer mensaje incomprensible: «No te entendí bien» y se repite la pregunta del paso. Segundo seguido: se ofrece hablar con una persona. Si el cliente dice algo que sí se entiende, `fallos` vuelve a 0.

```js ejemplo.js
let f = procesar(t, { tipo: 'texto', texto: 'asdf' }, 3);
console.log(f.sesion.fallos, f.respuestas.map((x) => x.tipo));
f = procesar(f.sesion, { tipo: 'texto', texto: 'qwer' }, 4);
console.log(f.sesion.fallos, f.respuestas[0].texto);
console.log(f.respuestas[0].botones);
```

```salida
1 [ 'texto', 'botones' ]
2 Sigo sin entenderte. ¿Quieres que te atienda una persona?
[
  { id: 'menu_humano', titulo: 'Hablar con alguien' },
  { id: 'menu_menu', titulo: 'Ver el menú' }
]
```

Este patrón («reintenta, y luego ofrece una salida») es parte del buen diseño que viste en la lección 2. Un detalle más: si el cliente envía algo que el motor no soporta (una foto, un audio), llega como `{ tipo: 'no_soportado' }` y el bot responde «Por ahora solo entiendo texto y botones», sin tocar el estado.

## Dónde vive la sesión

El motor no guarda la sesión: la recibe y la devuelve. Alguien más debe guardarla entre un mensaje y el siguiente, y eso depende de la carcasa:

| Carcasa | Dónde vive la sesión |
|---|---|
| Consola (lección 4) | En una variable: `let sesion = crearSesion(...)`. Se pierde al cerrar. |
| Servidor del bot (lecciones 10 y 15) | En Cloudflare KV, con la clave `sesion:<telefono>`; sobrevive a los reinicios y vence solo. |

Así lo hace `consola.js`, el simulador de la terminal, en tres líneas:

```js consola.js
let sesion = crearSesion(TELEFONO);
// ...por cada línea que escribes:
const resultado = procesar(sesion, aEntrada(texto));
sesion = resultado.sesion;
```

> [!importante] Verifica este dato
> Cuando guardes sesiones en la nube, revisa los límites y el modelo de consistencia del almacenamiento que elijas (en la lección 15 usarás Cloudflare KV). Dos mensajes simultáneos del mismo cliente pueden pisarse. Consulta la [documentación oficial de Cloudflare KV](https://developers.cloudflare.com/kv/) antes de decidir.

## Errores frecuentes

- **Guardar el estado en una variable global del servidor.** Funciona con un cliente y se mezcla cuando escriben dos. La sesión es **por teléfono**.
- **Modificar la sesión recibida** en lugar de una copia. Provoca errores raros: una respuesta que «recuerda» cosas del mensaje anterior. Copia primero (`structuredClone` o `{ ...sesion }`).
- **Olvidar los botones viejos.** El cliente puede tocar un botón de hace una hora. Valida siempre que la acción corresponda al estado actual.
- **No tener salida.** Un estado del que no se puede salir (sin «cancelar», «menu» o «hablar con una persona») frustra al cliente.
- **Dejar que el bot hable con una persona atendiendo.** Hay que callar mientras `ESPERANDO_HUMANO`.
- **Guardar en la sesión datos que no son simples** (funciones, clases con métodos). Una sesión debe poder convertirse en JSON y volver sin perder nada.
- **Meter entrada/salida dentro del motor.** Pierdes pruebas fáciles y portabilidad.

## Apuntes para llevar

- El **estado** es lo que el bot sabe de la conversación; el significado de un mensaje depende de él.
- Una **sesión** por cliente (por teléfono) guarda estado, carrito, datos a medias, fallos y marcas de tiempo.
- Una **máquina de estados** son estados, eventos y transiciones; se dibuja antes de programarla.
- El motor es una **función pura**: `procesar(sesion, entrada, ahora) -> { sesion, respuestas }`, sin entrada/salida y sin mutar lo que recibe.
- Separa **entender** (convertir texto o botón en acción) de **actuar** (cambiar sesión y responder).
- Protege cada paso: botones viejos, **cancelar** y **hablar con una persona** funcionan siempre y callar es una respuesta válida.

## Glosario

| Término | Significado |
|---|---|
| Estado | Punto de la conversación en que está un cliente (`MENU`, `PAGO`...). |
| Sesión | Objeto que guarda todo lo que el bot sabe de un cliente. |
| Máquina de estados | Modelo con estados, eventos y transiciones entre ellos. |
| Transición | Paso de un estado a otro provocado por un evento. |
| Función pura | Función que con las mismas entradas da la misma salida y no cambia nada fuera de ella. |
| Mutar | Modificar un objeto existente en lugar de crear uno nuevo. |
| Acción | Intención ya interpretada (`pedir`, `cantidad`, `cancelar`) que el motor ejecuta. |
| Carcasa | Capa que conecta el motor con el mundo (consola, servidor): guarda sesiones y envía respuestas. |

```quiz
? Un cliente escribe «2». ¿Qué decide su significado?
- Solo el texto «2»
+ El estado de la sesión: no es lo mismo si el bot preguntó una cantidad o una forma de pago
- La hora a la que escribió
- El número de teléfono del cliente
= El mismo mensaje significa cosas distintas según el punto de la conversación; por eso se guarda el estado.

? ¿Qué devuelve `procesar(sesion, entrada, ahora)`?
- Solo el texto de la respuesta
+ Un objeto con la sesión nueva y la lista de respuestas por enviar
- Nada: modifica la sesión directamente y envía el mensaje
- Una promesa que espera la respuesta de Meta
= El motor devuelve datos; quien lo llama guarda la sesión y envía las respuestas.

? ¿Cuál es la principal ventaja de que el motor sea una función pura?
- Que corre más rápido en la nube
+ Que se prueba y se reutiliza fácil, sin WhatsApp ni internet
- Que no necesita sesión
- Que evita tener estados
= Sin entrada/salida dentro del motor, las pruebas son llamadas simples y la misma lógica sirve para consola y servidor.

? Un cliente toca el botón «Confirmar pedido» de un mensaje viejo cuando está en el menú. ¿Qué debe hacer el bot?
- Confirmar un pedido vacío
- Cerrar la sesión
+ Avisar que la opción ya no está disponible y repetir la pregunta del paso actual
- Reiniciar el servidor
= Las acciones solo valen en su paso; fuera de él se explica y se repite la pregunta pendiente.

? ¿Qué debe hacer el bot cuando el estado es `ESPERANDO_HUMANO`?
- Responder igual que siempre
- Pedir disculpas en cada mensaje
+ Callar (devolver cero respuestas), salvo que el cliente escriba «menu» o «cancelar»
- Borrar la sesión
= Si una persona atiende, el bot no debe interferir; siempre queda una salida para el cliente.
```

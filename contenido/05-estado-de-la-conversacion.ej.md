---
minutos: 45
nivel: intermedio
---
## Objetivo

Construir con tus propias manos una **mini máquina de estados**: una tabla de transiciones, una sesión y una función pura `procesar` que nunca modifica lo que recibe. Es una versión reducida del `motor.js` real del curso (sin catálogo ni textos), pero con las mismas reglas de fondo.

### Cómo se trabaja

La **parte A** se hace en tu terminal con el código de referencia del curso: te sirve para ver al motor real cambiar de estado. La **parte B** son tres funciones de JavaScript puro que se comprueban en esta página. Los eventos son palabras simples (`"hola"`, `"pedir"`, `"cerrar"`...) en lugar de mensajes de WhatsApp: así te concentras en el estado.

La tabla de transiciones que debes implementar (cada fila: estado actual, evento y estado siguiente):

| Estado | Evento | Siguiente estado |
|---|---|---|
| `INICIO` | `hola` | `MENU` |
| `INICIO`, `MENU` | `pedir` | `ELIGIENDO` |
| `ELIGIENDO` | `cerrar` | `TIPO_ENTREGA` |
| `TIPO_ENTREGA` | `delivery` | `DIRECCION` |
| `TIPO_ENTREGA` | `recojo` | `PAGO` |
| `DIRECCION` | `direccion` | `PAGO` |
| `PAGO` | `pago` | `CONFIRMAR` |
| `CONFIRMAR` | `confirmar` | `FIN` |
| cualquiera | `cancelar` | `FIN` |
| cualquiera | `humano` | `ESPERANDO_HUMANO` |
| cualquiera | `menu` | `MENU` |

Reglas extra: en `ESPERANDO_HUMANO` solo funcionan `menu` y `cancelar`; cualquier otro evento se ignora **sin contarlo como fallo** (el bot calla). Si el estado es `FIN`, el siguiente evento empieza una sesión nueva.

```pasos
Parte A. En la carpeta `codigo/` del curso ejecuta `printf 'hola\n2 leches\nlisto\nrecojo\nefectivo\nconfirmar\n' | node consola.js` y anota en `notas.md` el estado en que quedó la sesión después de cada mensaje (los nombres están en `ESTADOS` de `src/motor.js`).
Parte A. Escribe un script `probar-estado.mjs` que importe `crearSesion` y `procesar` de `src/motor.js`, envíe `{ tipo: 'texto', texto: 'hola' }` y compruebe que la sesión original **no cambió** (`sesion.estado` sigue en `INICIO`).
Parte B. Escribe `crearSesion(telefono, ahora = 0)`: devuelve un objeto con `telefono`, `estado: "INICIO"`, `fallos: 0` y `ultimoMensajeCliente: ahora`.
Parte B. Escribe `siguienteEstado(estado, evento)`: devuelve el estado siguiente según la tabla o `null` si el evento no vale en ese estado.
Parte B. Escribe `procesar(sesion, evento, ahora = 0)`: devuelve una sesión **nueva** (sin tocar la recibida) con el estado actualizado, `fallos` en 0 si entendió el evento o `fallos + 1` si no (salvo en `ESPERANDO_HUMANO`, donde no suma), y `ultimoMensajeCliente` igual a `ahora`.
```

```pista Una tabla en vez de muchos if
Un objeto de objetos como `{ INICIO: { hola: "MENU" } }` te deja escribir `TRANSICIONES[estado]?.[evento]`. Guarda aparte los eventos globales (`cancelar`, `humano`, `menu`) y consúltalos si la tabla del estado no tiene el evento.
```

```pista ESPERANDO_HUMANO es un caso especial
Trátalo antes que nada: si el estado es `ESPERANDO_HUMANO`, solo `menu` y `cancelar` devuelven un estado nuevo; para todo lo demás devuelve `null`. En `procesar`, ese `null` no debe sumar fallos en este estado.
```

```pista No mutar la sesión
Crea la sesión nueva con `{ ...base }` y modifica solo la copia. Para el caso `FIN`, usa como base `crearSesion(sesion.telefono, ahora)`.
```

```checks
[
 {"d": "`crearSesion` crea la sesión inicial", "h": "Devuelve { telefono, estado: \"INICIO\", fallos: 0, ultimoMensajeCliente: ahora }.", "t": "var s=crearSesion('51999000111',5);return s.telefono==='51999000111' && s.estado==='INICIO' && s.fallos===0 && s.ultimoMensajeCliente===5 && crearSesion('51999000111').ultimoMensajeCliente===0"},
 {"d": "`siguienteEstado` sigue la tabla del flujo", "h": "Revisa cada fila de la tabla: INICIO + hola, TIPO_ENTREGA + delivery o recojo, CONFIRMAR + confirmar.", "t": "return siguienteEstado('INICIO','hola')==='MENU' && siguienteEstado('MENU','pedir')==='ELIGIENDO' && siguienteEstado('ELIGIENDO','cerrar')==='TIPO_ENTREGA' && siguienteEstado('TIPO_ENTREGA','delivery')==='DIRECCION' && siguienteEstado('TIPO_ENTREGA','recojo')==='PAGO' && siguienteEstado('DIRECCION','direccion')==='PAGO' && siguienteEstado('PAGO','pago')==='CONFIRMAR' && siguienteEstado('CONFIRMAR','confirmar')==='FIN'"},
 {"d": "`siguienteEstado` devuelve `null` si el evento no vale en ese estado", "h": "Un evento fuera de lugar (por ejemplo `pago` en `TIPO_ENTREGA`) no debe cambiar nada: devuelve `null`.", "t": "return siguienteEstado('TIPO_ENTREGA','pago')===null && siguienteEstado('PAGO','recojo')===null && siguienteEstado('MENU','banana')===null"},
 {"d": "`cancelar`, `humano` y `menu` funcionan desde cualquier estado normal", "h": "Son eventos globales: búscalos si la tabla del estado no tiene el evento.", "t": "var e=['INICIO','MENU','ELIGIENDO','TIPO_ENTREGA','DIRECCION','PAGO','CONFIRMAR'];return e.every(function(x){return siguienteEstado(x,'cancelar')==='FIN' && siguienteEstado(x,'humano')==='ESPERANDO_HUMANO' && siguienteEstado(x,'menu')==='MENU'})"},
 {"d": "`procesar` no modifica la sesión recibida", "h": "Trabaja sobre una copia: `const nueva = { ...sesion }`.", "t": "var s=Object.freeze(crearSesion('51999000111',0));var n=procesar(s,'hola',10);return n!==s && s.estado==='INICIO' && n.estado==='MENU' && n.ultimoMensajeCliente===10"},
 {"d": "Una conversación completa llega a `FIN`", "h": "Aplica `procesar` evento por evento, usando siempre la sesión que devuelve.", "t": "var s=crearSesion('51999000111',0);['hola','pedir','cerrar','delivery','direccion','pago','confirmar'].forEach(function(e,i){s=procesar(s,e,i+1)});return s.estado==='FIN' && s.fallos===0"},
 {"d": "Un evento no entendido suma un fallo y un evento entendido lo reinicia", "h": "Si `siguienteEstado` devuelve `null`: mismo estado y fallos + 1. Si no: nuevo estado y fallos = 0.", "t": "var s=procesar(crearSesion('51999000111',0),'asdf',1);var s2=procesar(s,'asdf',2);var s3=procesar(s2,'hola',3);return s.estado==='INICIO' && s.fallos===1 && s2.fallos===2 && s3.estado==='MENU' && s3.fallos===0"},
 {"d": "En `ESPERANDO_HUMANO` el bot calla: ignora todo salvo `menu` y `cancelar`, y no cuenta fallos", "h": "Trata `ESPERANDO_HUMANO` como caso especial en `siguienteEstado` y no sumes fallos en `procesar` para ese estado.", "t": "var s=procesar(procesar(crearSesion('51999000111',0),'hola',1),'humano',2);var ignorado=procesar(s,'pedir',3);var sale=procesar(s,'menu',4);return s.estado==='ESPERANDO_HUMANO' && ignorado.estado==='ESPERANDO_HUMANO' && ignorado.fallos===0 && sale.estado==='MENU'"},
 {"d": "Después de `FIN`, el siguiente evento empieza una sesión nueva", "h": "Si el estado es `FIN`, la base es `crearSesion(sesion.telefono, ahora)`.", "t": "var s=procesar(procesar(crearSesion('51999000111',0),'hola',1),'cancelar',2);var n=procesar(s,'hola',3);return s.estado==='FIN' && n.estado==='MENU' && n.fallos===0 && n.telefono==='51999000111'"}
]
```

```solucion estado.js
const TRANSICIONES = {
  INICIO: { hola: "MENU", pedir: "ELIGIENDO" },
  MENU: { pedir: "ELIGIENDO" },
  ELIGIENDO: { cerrar: "TIPO_ENTREGA" },
  TIPO_ENTREGA: { delivery: "DIRECCION", recojo: "PAGO" },
  DIRECCION: { direccion: "PAGO" },
  PAGO: { pago: "CONFIRMAR" },
  CONFIRMAR: { confirmar: "FIN" },
};

const GLOBALES = { cancelar: "FIN", humano: "ESPERANDO_HUMANO", menu: "MENU" };

function crearSesion(telefono, ahora = 0) {
  return { telefono, estado: "INICIO", fallos: 0, ultimoMensajeCliente: ahora };
}

function siguienteEstado(estado, evento) {
  if (estado === "ESPERANDO_HUMANO") {
    return evento === "menu" || evento === "cancelar" ? GLOBALES[evento] : null;
  }
  return TRANSICIONES[estado]?.[evento] ?? GLOBALES[evento] ?? null;
}

function procesar(sesionPrevia, evento, ahora = 0) {
  const base = sesionPrevia.estado === "FIN"
    ? crearSesion(sesionPrevia.telefono, ahora)
    : sesionPrevia;
  const sesion = { ...base, ultimoMensajeCliente: ahora };
  const siguiente = siguienteEstado(sesion.estado, evento);
  if (siguiente) {
    sesion.estado = siguiente;
    sesion.fallos = 0;
  } else if (sesion.estado !== "ESPERANDO_HUMANO") {
    sesion.fallos += 1;
  }
  return sesion;
}
```

> [!consejo] Reto extra
> Añade un evento `volver` que regrese al estado anterior. Para lograrlo la sesión necesita recordar el historial (por ejemplo un arreglo `historial` de estados). Piensa: ¿qué debería pasar con `volver` en `INICIO`? Es el tipo de decisión de diseño que aparece al crecer una máquina de estados.

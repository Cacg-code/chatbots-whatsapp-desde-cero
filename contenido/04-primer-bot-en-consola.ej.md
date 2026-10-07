---
minutos: 60
nivel: básico
---
## Objetivo

Construir el bot de consola de **tu propio negocio inventado** y escribir su «cerebro»: una función `responder(texto)` que siga reglas dadas, sin leer ni imprimir nada.

### Cómo se trabaja

La **parte A** es práctica real: montas el proyecto en tu computadora con el cerebro separado de la consola. La **parte B** es la función `responder(texto)` que se comprueba aquí. Las reglas son fijas para que la prueba sea la misma para todos, pero **el texto de las respuestas es tuyo**: usa el nombre, horario y dirección de tu negocio inventado (por ejemplo, una ferretería «El Tornillo Feliz» o una academia «Aula Norte»).

Reglas que la función debe cumplir (se ignoran mayúsculas y tildes):

| El mensaje contiene | La respuesta debe |
|---|---|
| `hola`, `buenas` | empezar con la palabra «Hola» |
| `horario`, `hora`, `abren` | incluir al menos un número (una hora) |
| `direccion`, `donde`, `ubicacion` | incluir una dirección con número (por ejemplo «Av. Los Pinos 456») |
| `ayuda` | mencionar `horario` y `direccion` |
| cualquier otra cosa, o texto vacío | incluir «no entendí» (con o sin tilde) |

Si el mensaje contiene `ayuda` y otra palabra de la tabla, gana `ayuda`.

```pasos
Parte A. Crea la carpeta `bot-mio` con `npm init -y`, `"type": "module"`, la carpeta `src/` y los archivos `src/cerebro.js` y `consola.js`. Ejecuta `node consola.js`.
Parte A. Haz que `consola.js` lea líneas con `readline` y muestre `responder(linea)`. Cierra con la palabra `salir`.
Parte A. Escribe `test/cerebro.test.js` con una prueba por regla y ejecuta `node --test` hasta ver todo en verde.
Parte B. Pega en la caja de código `normalizar(texto)` y `responder(texto)` **sin `export`** (la página no usa módulos), con las reglas de la tabla. Ante texto vacío, `null` o `undefined`, responde «No entendí».
```

```pista Normalizar primero
`String(texto ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim()` quita mayúsculas y tildes. Compara siempre contra el texto normalizado.
```

```pista Orden de las reglas
Evalúa las reglas en orden con `if (t.includes("hola") ...)`. Pon `ayuda` primero. Cuidado con palabras dentro de otras: `"hora"` está dentro de `"ahora"`.
```

```pista Mensaje de ayuda
La ayuda puede ser un texto fijo como `"Puedo darte el horario o la direccion."` Basta con que contenga ambas palabras.
```

```checks
[
 {"d": "`responder` existe y siempre devuelve un texto", "h": "Declara `function responder(texto)` y devuelve siempre un `string`.", "t": "return typeof responder==='function' && typeof responder('hola')==='string' && typeof responder('xyz')==='string'"},
 {"d": "Saluda cuando le dicen hola o buenas, sin importar mayúsculas", "h": "Normaliza el texto y busca `hola` o `buenas`. La respuesta empieza con `Hola`.", "t": "return /^hola/i.test(responder('Hola')) && /^hola/i.test(responder('BUENAS tardes')) && /^hola/i.test(responder('  hola!  '))"},
 {"d": "Responde el horario con al menos un número", "h": "Incluye una hora en la respuesta, por ejemplo `8:00`.", "t": "return /\\d/.test(responder('¿A qué hora abren?')) && /\\d/.test(responder('HORARIO'))"},
 {"d": "Responde la dirección con un número de calle", "h": "Detecta `direccion`, `donde` o `ubicacion` (sin tilde) y devuelve una dirección con número.", "t": "var n=function(s){return s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase()};var ok=function(x){return /\\d/.test(x) && n(x).indexOf('no entend')<0};return ok(responder('¿Dónde están?'))&&ok(responder('Dirección por favor'))&&ok(responder('ubicación'))"},
 {"d": "La ayuda menciona horario y dirección", "h": "El texto de `ayuda` debe contener las palabras `horario` y `direccion` (o `dirección`).", "t": "var r=responder('ayuda').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();return r.indexOf('horario')>=0 && r.indexOf('direccion')>=0"},
 {"d": "Dice «no entendí» ante algo desconocido", "h": "Al final de la función, devuelve un mensaje con `No entendí` para cualquier otro texto.", "t": "var n=function(s){return s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase()};return n(responder('quiero una pizza')).indexOf('no entend')>=0 && n(responder('asdfgh')).indexOf('no entend')>=0"},
 {"d": "Maneja texto vacío, `null` y `undefined` sin romperse", "h": "Usa `String(texto ?? \"\")` y trata el texto vacío como no entendido.", "t": "var n=function(s){return s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase()};return n(responder('')).indexOf('no entend')>=0 && n(responder(null)).indexOf('no entend')>=0 && n(responder(undefined)).indexOf('no entend')>=0 && n(responder('   ')).indexOf('no entend')>=0"}
]
```

```solucion cerebro.js
function normalizar(texto) {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function responder(texto) {
  const t = normalizar(texto);
  if (t === "") return "No entendí. Escribe ayuda para ver las opciones.";
  if (t.includes("ayuda")) return "Puedo darte el horario o la direccion. Escribe una de las dos.";
  if (t.includes("hola") || t.includes("buenas")) return "Hola, bienvenido a Aula Norte. Escribe ayuda para ver las opciones.";
  if (t.includes("horario") || t.includes("hora") || t.includes("abren")) return "Atendemos de lunes a viernes de 8:00 a 20:00.";
  if (t.includes("direccion") || t.includes("donde") || t.includes("ubicacion")) return "Estamos en Av. Los Pinos 456 (ejemplo).";
  return "No entendí tu mensaje. Escribe ayuda para ver las opciones.";
}
```

> [!consejo] Reto extra
> Añade una regla de «precios» y otra de «gracias» (responde «De nada»). Luego haz que `responder` reciba un segundo parámetro, un objeto `negocio` con `nombre`, `horario` y `direccion`, para poder usar el mismo cerebro con cualquier negocio.

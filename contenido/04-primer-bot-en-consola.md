---
titulo: Tu primer bot en la consola
resumen: Construye un bot funcional en la terminal con readline, separa el cerebro de la entrada y salida, y escribe su primera prueba automática.
minutos: 60
nivel: básico
objetivos:
- Crear un bot de consola que lee lo que escribes con `readline` y responde.
- Separar el «cerebro» (una función pura `responder(texto)`) de la entrada y salida (la consola).
- Implementar saludo, menú de tres opciones y respuestas por palabras clave, ignorando mayúsculas y tildes.
- Organizar un proyecto con las carpetas `src/` y `test/` y el archivo `consola.js`.
- Escribir y ejecutar la primera prueba con `node:test`.
fuentes:
- JavaScript en MDN | https://developer.mozilla.org/es/docs/Web/JavaScript
- Node.js: documentación | https://nodejs.org/docs/latest/api/
---
## Por qué empezar por la consola

Conectar un bot a WhatsApp exige cuentas, tokens y un servidor. Antes de eso conviene comprobar lo esencial: **¿el bot entiende y responde bien?** Eso se puede probar en tu terminal, sin internet, sin tarjetas y sin esperar aprobaciones.

La consola va a ser tu «WhatsApp de laboratorio». Todo lo que construyas aquí (las reglas, el menú, más adelante el catálogo y el carrito) se conectará a WhatsApp después **sin reescribirlo**, porque la lógica quedará separada de la forma de entrada. Esa separación es la idea central de esta lección.

Necesitas Node instalado y saber crear un proyecto; si no, repasa la [lección 3](../03-javascript-y-node-para-bots/). El diseño del menú viene de la [lección 2](../02-disenar-la-conversacion/).

## El proyecto: estructura de carpetas

Crea la carpeta del proyecto y su `package.json` como en la lección anterior:

```bash
mkdir bot-minimarket
cd bot-minimarket
npm init -y
```

Abre `package.json` y déjalo así:

```json package.json
{
  "name": "bot-minimarket",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node consola.js",
    "test": "node --test"
  }
}
```

La estructura que vamos a construir es esta:

```text
bot-minimarket/
├── package.json
├── consola.js          entrada y salida: lee del teclado, imprime
├── src/
│   └── cerebro.js      el cerebro: responder(texto)
└── test/
    └── cerebro.test.js las pruebas
```

Un archivo, una responsabilidad. `consola.js` sabe **hablar con la terminal**; `src/cerebro.js` sabe **qué contestar**. Ninguno se mete en el trabajo del otro.

## Primer paso: un eco con readline

Empecemos con lo mínimo: leer una línea y devolverla. Node incluye `readline`, que lee lo que escribe el usuario. Crea `eco.js` (es solo un experimento; luego lo descartas):

```js eco.js
import readline from "node:readline";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("Tú: ", (texto) => {
  console.log("Bot: dijiste " + texto);
  rl.close();
});
```

Ejecútalo con `node eco.js`. Escribes `hola bot` y pulsas Enter:

```salida
Tú: hola bot
Bot: dijiste hola bot
```

Qué ocurre: `createInterface` conecta el teclado (`stdin`) y la pantalla (`stdout`). `rl.question` muestra una pregunta y, **cuando el usuario pulsa Enter**, llama a tu función con lo escrito. Es un **callback**: una función que se ejecuta cuando llega el dato. `rl.close()` termina la lectura.

Ya tienes lo esencial de un bot: **entra un texto, sale un texto**. Ahora hay que hacerlo inteligente y, sobre todo, ordenado.

## Segundo paso: separar cerebro y consola

Imagina que escribes las reglas dentro de `consola.js`, mezcladas con `console.log` y `readline`. Cuando en la lección 10 quieras que el mismo bot responda por WhatsApp, tendrás que arrancarlo de nuevo. En cambio, si las reglas viven en una **función pura** (recibe texto, devuelve texto, no imprime nada), la consola y WhatsApp son solo dos formas distintas de llamarla:

```flujo
Consola|o más adelante WhatsApp
-> texto del cliente
responder(texto)|el cerebro (función pura)
-> texto de respuesta
Consola|imprime la respuesta
```

Escribe el cerebro más simple posible en `src/cerebro.js`:

```js src/cerebro.js
export function responder(texto) {
  return "Dijiste: " + texto;
}
```

Y la consola, que ahora **repite** la pregunta después de cada respuesta para mantener la conversación. Crea `consola.js`:

```js consola.js
import readline from "node:readline";
import { responder } from "./src/cerebro.js";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log("Bot del Minimarket La Esquina. Escribe 'salir' para terminar.\n");

function preguntar() {
  rl.question("Tú: ", (linea) => {
    if (linea.trim().toLowerCase() === "salir") {
      console.log("Bot: Hasta pronto.");
      rl.close();
      return;
    }
    console.log("Bot: " + responder(linea) + "\n");
    preguntar();
  });
}

preguntar();
```

La función `preguntar` se llama a sí misma al terminar cada respuesta: eso crea el **bucle de conversación**. La única salida es escribir `salir`. Este `consola.js` no cambiará más en toda la lección: lo que mejore será el cerebro.

## Tercer paso: saludo, menú y palabras clave

Ahora el cerebro de verdad. Tiene tres piezas.

**1. Normalizar el texto.** Los clientes escriben «HOLA», «Hola», «¿Dónde están?», «donde estan». Antes de comparar, convertimos todo a minúsculas y quitamos las tildes. `normalize("NFD")` separa cada letra de su tilde y la expresión regular elimina las tildes sueltas:

```js
export function normalizar(texto) {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}
```

El `String(texto ?? "")` hace que `null` o `undefined` no rompan la función.

**2. Reglas por palabras clave.** Una regla es un objeto con las palabras que la activan y una función que da la respuesta. Las guardamos en un array y recorremos hasta encontrar la primera que encaje. Así, **añadir una regla es añadir un objeto**, sin tocar la lógica.

**3. Respuesta por defecto.** Si ninguna regla encaja, el bot dice que no entendió y ofrece el menú (recuerda la lección 2: todo error termina en una opción).

Este es el `src/cerebro.js` completo:

```js src/cerebro.js
// Cerebro del bot: recibe texto, devuelve texto. No imprime nada ni lee nada.

export function normalizar(texto) {
  return String(texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

const MENU = [
  "Elige una opción escribiendo el número o la palabra:",
  "1. Horario",
  "2. Dirección",
  "3. Ayuda",
].join("\n");

const REGLAS = [
  { palabras: ["hola", "buenas", "buenos dias", "buenas tardes"], respuesta: () => "Hola, bienvenido a Minimarket La Esquina.\n" + MENU },
  { palabras: ["1", "horario", "hora", "abren", "cierran"], respuesta: () => "Atendemos de lunes a sábado de 8:00 a 21:00 y domingos de 9:00 a 14:00." },
  { palabras: ["2", "direccion", "donde", "ubicacion"], respuesta: () => "Estamos en Av. Los Olivos 123 (ejemplo), frente al parque." },
  { palabras: ["3", "ayuda", "menu", "opciones"], respuesta: () => MENU },
];

export function responder(texto) {
  const t = normalizar(texto);
  if (t === "") return "Escríbeme algo y te ayudo. Con 'ayuda' ves las opciones.";
  for (const regla of REGLAS) {
    if (regla.palabras.some((p) => t === p || t.includes(p) && p.length > 1)) {
      return regla.respuesta();
    }
  }
  return "No entendí tu mensaje. Escribe 'ayuda' para ver las opciones.";
}
```

Léelo con calma. La línea clave es `regla.palabras.some(...)`: la regla se activa si el texto es **exactamente** la palabra o **contiene** una palabra de más de un carácter. La condición `p.length > 1` evita que el número `"1"` se active con cualquier mensaje que lo lleve (por ejemplo «quiero 10 panes»): los números solo valen si el cliente escribe **solo** el número.

El horario y la dirección son datos de ejemplo del negocio ficticio. En un negocio real, vendrían de su configuración.

## Ejecutarlo

Con los dos archivos listos, arranca el bot con `npm start` (o `node consola.js`) y conversa:

```bash
npm start
```

```salida
Bot del Minimarket La Esquina. Escribe 'salir' para terminar.

Tú: hola
Bot: Hola, bienvenido a Minimarket La Esquina.
Elige una opción escribiendo el número o la palabra:
1. Horario
2. Dirección
3. Ayuda

Tú: ¿a qué hora abren?
Bot: Atendemos de lunes a sábado de 8:00 a 21:00 y domingos de 9:00 a 14:00.

Tú: 2
Bot: Estamos en Av. Los Olivos 123 (ejemplo), frente al parque.

Tú: quiero pizza
Bot: No entendí tu mensaje. Escribe 'ayuda' para ver las opciones.

Tú: salir
Bot: Hasta pronto.
```

Tienes un bot que saluda, ofrece un menú de tres opciones, entiende por palabras clave o por número y admite que no entendió. Es poco, pero es **un bot de verdad**: la misma estructura crecerá hasta manejar pedidos completos.

> [!nota] Escribir con tildes
> Si tu terminal muestra caracteres raros con las tildes en Windows, ejecuta antes `chcp 65001` en el Símbolo del sistema, o usa Windows Terminal, que suele funcionar sin ajustes.

## Cuarto paso: la primera prueba automática

Cada vez que cambies una regla querrás saber que no rompiste otra. En vez de conversar con el bot a mano, escribes **pruebas**. Como `responder` es una función pura, probarla es trivial: le das un texto y miras la respuesta. Crea `test/cerebro.test.js`:

```js test/cerebro.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { responder, normalizar } from "../src/cerebro.js";

test("normalizar quita tildes y mayúsculas", () => {
  assert.equal(normalizar("  DIRECCIÓN "), "direccion");
});

test("saluda y muestra el menú", () => {
  assert.match(responder("Hola"), /bienvenido/);
});

test("responde el horario por palabra clave y por número", () => {
  assert.match(responder("¿A qué hora abren?"), /8:00/);
  assert.match(responder("1"), /8:00/);
});

test("si no entiende, lo dice", () => {
  assert.match(responder("asdfgh"), /No entendí/);
});
```

`assert.equal` compara dos valores exactos; `assert.match` comprueba que un texto cumpla una expresión regular (útil cuando no quieres repetir el mensaje completo). Ejecuta:

```bash
npm test
```

```salida
✔ normalizar quita tildes y mayúsculas (0.9399ms)
✔ saluda y muestra el menú (0.3564ms)
✔ responde el horario por palabra clave y por número (0.155ms)
✔ si no entiende, lo dice (0.1547ms)
ℹ tests 4
ℹ pass 4
ℹ fail 0
```

Los milisegundos de tu pantalla serán otros; lo importante son los cuatro ✔. Desde ahora, cada vez que añadas una regla, añade su prueba. Es el hábito que separa un experimento de un producto.

## Una trampa: palabras dentro de otras

Prueba esto en el bot: escribe `ahora`.

```salida
Tú: ahora
Bot: Atendemos de lunes a sábado de 8:00 a 21:00 y domingos de 9:00 a 14:00.
```

El bot respondió el horario porque la palabra `hora` está **dentro** de «ahora». Es el error clásico del `includes`. Para un bot de reglas sencillo es un compromiso aceptable (los clientes suelen escribir mensajes cortos), pero en la [lección 6](../06-entender-texto-libre/) aprenderás a separar el mensaje en palabras completas y a puntuar coincidencias para reducir esos falsos positivos. Por ahora, tenlo presente y coloca las palabras más específicas en las reglas más importantes.

## Qué sigue

Tu bot tiene una limitación grande: **no recuerda nada**. Si el cliente escribe «1» después de «quiero pedir», el bot no sabe en qué punto de la conversación estaba. Responder solo según el último mensaje funciona para preguntas sueltas, pero no para un pedido de varios pasos. La solución es el **estado**: guardar en qué punto va cada cliente, tal como lo dibujaste en el mapa de la lección 2. Eso es la [lección 5](../05-estado-de-la-conversacion/).

## Errores frecuentes

- **Escribir las reglas dentro de `consola.js`.** Después no podrás reutilizarlas con WhatsApp ni probarlas con `node:test`. Mantén el cerebro en `src/`.
- **Imprimir dentro de `responder`.** La función debe **devolver** texto; quien imprime es la consola.
- **Olvidar normalizar.** Sin quitar mayúsculas y tildes, «Dirección» y «direccion» serán mensajes distintos.
- **Un `includes` con palabras demasiado cortas** (`"1"`, `"a"`, `"si"`): se activan por casualidad dentro de otras palabras.
- **No cerrar `readline`.** Sin `rl.close()` el programa nunca termina y queda esperando.
- **Poner el orden de las reglas sin pensar.** Se usa la primera que encaja: las específicas deben ir antes que las generales.
- **Olvidar la respuesta por defecto.** Un bot que se queda en silencio ante lo inesperado parece roto.

## Apuntes para llevar

- La consola es tu entorno de laboratorio: sin cuentas, sin costos y con resultados inmediatos.
- `readline` lee líneas del teclado con `rl.question`; un bucle recursivo mantiene la conversación.
- Separa el **cerebro** (`responder(texto)`, pura) de la **entrada y salida** (`consola.js`): así el mismo cerebro servirá para WhatsApp.
- Normaliza el texto (minúsculas, sin tildes, sin espacios sobrantes) antes de compararlo.
- Las reglas como datos (un array de objetos) permiten crecer sin tocar la lógica.
- Cada regla nueva lleva su prueba con `node:test`; `npm test` las ejecuta todas.

## Glosario

| Término | Significado |
|---|---|
| `readline` | Módulo de Node que lee líneas de texto desde el teclado. |
| `stdin` / `stdout` | Entrada y salida estándar: el teclado y la pantalla de la terminal. |
| Callback | Función que se ejecuta cuando llega un dato o termina una operación. |
| Cerebro | Función que decide qué responder; no imprime ni lee nada. |
| Normalizar | Dejar el texto en una forma uniforme (minúsculas, sin tildes) para compararlo. |
| Palabra clave | Palabra que, al aparecer en el mensaje, activa una regla. |
| Falso positivo | Regla que se activa cuando no debía (por ejemplo `hora` dentro de `ahora`). |
| Prueba automática | Código que verifica que otra función da el resultado esperado. |

```quiz
? ¿Por qué se separa `responder(texto)` del archivo `consola.js`?
- Porque Node lo exige
- Para que el programa corra más rápido
+ Para poder reutilizar el mismo cerebro con WhatsApp y probarlo sin la consola
- Porque `readline` no permite funciones
= Con el cerebro puro separado, solo cambia la forma de entrada y salida; las reglas no se reescriben.

? ¿Qué hace `rl.question("Tú: ", callback)`?
- Imprime el texto y termina el programa
+ Muestra la pregunta y llama a la función cuando el usuario pulsa Enter
- Lee el archivo `package.json`
- Envía el mensaje a WhatsApp
= `rl.question` espera una línea y entrega lo escrito al callback.

? ¿Para qué sirve normalizar el texto antes de comparar?
- Para traducirlo al inglés
- Para hacerlo más largo
+ Para que «HOLA», «Hola» y «Dirección»/«direccion» se traten igual
- Para ocultarlo al cliente
= Pasar a minúsculas y quitar tildes evita fallos por cómo escribe cada persona.

? El bot responde el horario cuando el cliente escribe «ahora». ¿Por qué?
- Porque hay un error en `readline`
+ Porque `"hora"` está contenida dentro de «ahora» y `includes` solo busca el fragmento
- Porque el bot adivina la intención
- Porque la tilde falta
= Es un falso positivo típico de `includes`; la lección 6 enseña a reducirlos.

? ¿Qué comando ejecuta todas las pruebas del proyecto?
- `node readline`
- `npm init`
+ `npm test` (o `node --test`)
- `node cerebro.js`
= Con `node:test`, `node --test` encuentra y ejecuta los archivos de prueba.
```

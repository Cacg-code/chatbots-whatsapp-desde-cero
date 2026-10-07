---
titulo: JavaScript y Node.js para bots
resumen: Instala Node, aprende a usar la terminal y repasa solo el JavaScript que necesita un bot: arrays, funciones puras, async/await, JSON, fetch y pruebas.
minutos: 60
nivel: básico
objetivos:
- Instalar Node.js, comprobar la versión y crear un proyecto con `npm init` y ES Modules.
- Usar `map`, `filter`, `find` y `reduce` sobre objetos y arrays como el catálogo de un minimarket.
- Distinguir una función pura de una función con efectos y explicar por qué un bot gana al separarlas.
- Escribir código con `async/await`, leer y crear JSON y llamar a una API con `fetch`.
- Guardar secretos en variables de entorno y escribir una prueba con `node:test`.
fuentes:
- JavaScript en MDN | https://developer.mozilla.org/es/docs/Web/JavaScript
- Node.js: módulo de pruebas | https://nodejs.org/docs/latest-v22.x/api/test.html
---
## Qué necesitas saber (y qué no)

Para construir el bot no hace falta dominar JavaScript: hace falta un **subconjunto pequeño y bien conocido**. Esta lección repasa solo lo que se usa en el resto del curso, con ejemplos del minimarket. Si en algún punto te pierdes, refuerza con estos dos cursos gratuitos:

- [Curso de JavaScript](https://cacg-code.github.io/web-desde-cero/javascript/): variables, funciones, arrays y objetos.
- [Curso de Node.js y APIs](https://cacg-code.github.io/web-desde-cero/node/): módulos, servidores y peticiones.

Lo que verás aquí: la terminal, instalar Node, crear un proyecto, objetos y arrays, las cuatro funciones de arrays que más usarás, funciones puras, `async/await`, JSON, `fetch`, variables de entorno y pruebas.

## Instalar Node.js

**Node.js** es el programa que ejecuta JavaScript fuera del navegador. Tu bot será un programa de Node. Descarga la versión **LTS** (soporte a largo plazo) desde [nodejs.org](https://nodejs.org/). Este curso se probó con una versión reciente (Node 24); sirve cualquier LTS actual. Los ejemplos usan `node --test` y `--env-file`, que existen desde Node 20.

- **Windows:** descarga el instalador `.msi`, acepta las opciones por defecto y reinicia la terminal. Alternativa con el gestor de paquetes: `winget install OpenJS.NodeJS.LTS`.
- **macOS:** el instalador `.pkg` de nodejs.org, o con Homebrew: `brew install node`.
- **Linux:** usa el gestor de tu distribución o, mejor, [nvm](https://github.com/nvm-sh/nvm) para elegir la versión (`nvm install --lts`).

Comprueba la instalación abriendo una **terminal nueva** (Símbolo del sistema o PowerShell en Windows; Terminal en macOS y Linux):

```bash
node -v
npm -v
```

```salida
v24.15.0
```

El número de versión será el tuyo; lo importante es que no diga «no se reconoce el comando». `npm` es el administrador de paquetes que viene con Node y mostrará su propio número.

> [!importante] Verifica este dato
> Los instaladores y comandos cambian con el tiempo. Si algo de esta sección no coincide con tu pantalla, sigue la guía oficial: [nodejs.org/en/download](https://nodejs.org/en/download).

## La terminal en cinco comandos

Usarás la terminal todo el curso. Con cinco comandos alcanza:

| Comando | Qué hace |
|---|---|
| `cd carpeta` | Entra en una carpeta (`cd ..` sube un nivel) |
| `ls` (macOS/Linux/PowerShell) o `dir` (Windows clásico) | Lista los archivos |
| `mkdir nombre` | Crea una carpeta |
| `node archivo.js` | Ejecuta un archivo de JavaScript |
| `Ctrl + C` | Detiene el programa que está corriendo |

Crea tu carpeta de trabajo y entra en ella:

```bash
mkdir bot-minimarket
cd bot-minimarket
```

## Crear un proyecto con npm y ES Modules

Un proyecto de Node es una carpeta con un archivo `package.json`: su «cédula de identidad» (nombre, scripts, dependencias). Se crea con:

```bash
npm init -y
```

Genera un `package.json`. Ábrelo y déjalo así (añadimos `"type": "module"` y dos scripts):

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

El campo `"type": "module"` activa los **ES Modules**: la forma moderna de dividir el código en archivos. Cada archivo **exporta** lo que ofrece y otros lo **importan**:

```js util.js
export function formatearSoles(n) {
  return "S/ " + n.toFixed(2);
}
```

```js index.js
import { formatearSoles } from "./util.js";

console.log(formatearSoles(2.5));
```

```salida
S/ 2.50
```

Dos detalles que confunden a todos al empezar: en los imports de archivos propios **debes escribir la extensión** (`./util.js`) y la ruta empieza con `./`. Los módulos propios de Node se importan con el prefijo `node:` (por ejemplo `node:test`, `node:readline`).

## Objetos y arrays: la forma de los datos de un bot

Casi todo lo que maneja un bot son **objetos** (cosas con propiedades) en **arrays** (listas). El catálogo del minimarket es un array de objetos:

```js catalogo.js
export const catalogo = [
  { id: 1, nombre: "Gaseosa 500 ml", precio: 2.5, categoria: "bebidas" },
  { id: 2, nombre: "Pan francés", precio: 0.3, categoria: "panadería" },
  { id: 3, nombre: "Arroz 1 kg", precio: 4.8, categoria: "abarrotes" },
  { id: 4, nombre: "Agua 625 ml", precio: 1.5, categoria: "bebidas" },
];
```

Y un carrito es otro array: cada línea guarda el `id` del producto y la `cantidad`. Guardamos solo el `id`, no una copia del producto, para tener **una sola fuente de verdad** del precio.

```js
const carrito = [
  { id: 1, cantidad: 2 },
  { id: 2, cantidad: 10 },
];
```

Accedes a una propiedad con punto (`producto.precio`) y a un elemento por su posición (`catalogo[0]`). Para copiar o combinar usa el **operador de propagación**: `[...carrito, nuevaLinea]` crea un array nuevo sin tocar el original.

## map, filter, find y reduce

Estas cuatro funciones de array reemplazan casi todos los `for`. Cada una recibe una **función** que se aplica a cada elemento.

| Función | Qué devuelve | Ejemplo en el minimarket |
|---|---|---|
| `map` | Un array nuevo, del mismo largo, con cada elemento transformado | Lista de nombres |
| `filter` | Un array nuevo con los elementos que cumplen la condición | Productos baratos |
| `find` | El **primer** elemento que cumple (o `undefined`) | Buscar por `id` |
| `reduce` | **Un solo valor** acumulado | Total del carrito |

Las usamos sobre el `catalogo` de arriba (con `const catalogo = [...]` en el mismo archivo):

```js a.js
const nombres = catalogo.map((p) => p.nombre);
console.log(nombres);

console.log(catalogo.filter((p) => p.precio < 2).map((p) => p.nombre));

console.log(catalogo.find((p) => p.id === 3));
console.log(catalogo.find((p) => p.id === 99));

const total = carrito.reduce((suma, linea) => {
  const p = catalogo.find((x) => x.id === linea.id);
  return suma + p.precio * linea.cantidad;
}, 0);
console.log(total);
console.log("S/ " + total.toFixed(2));
```

```salida
[ 'Gaseosa 500 ml', 'Pan francés', 'Arroz 1 kg', 'Agua 625 ml' ]
[ 'Pan francés', 'Agua 625 ml' ]
{ id: 3, nombre: 'Arroz 1 kg', precio: 4.8, categoria: 'abarrotes' }
undefined
8
S/ 8.00
```

`reduce` es la que más cuesta. Piensa en una caja registradora: empieza en `0` (segundo argumento), por cada línea suma su importe y entrega el total al final. `suma` es lo acumulado hasta ahora y `linea` el elemento actual; lo que devuelves en cada vuelta pasa como `suma` a la siguiente.

> [!consejo] Los decimales engañan
> En JavaScript `0.1 + 0.2` da `0.30000000000000004`. Para mostrar dinero usa `toFixed(2)`; para guardar un total, redondea con `Math.round(x * 100) / 100`. En proyectos más grandes se guardan los montos en **céntimos** (enteros): S/ 2.50 es `250`.

## Funciones puras y funciones con efectos

Esta es la idea más importante de la lección, porque define cómo se organiza el bot completo.

- Una **función pura** devuelve siempre lo mismo para los mismos argumentos y **no hace nada más**: no imprime, no lee archivos, no llama a internet, no modifica nada de afuera.
- Una función con **efectos** hace algo en el mundo: imprime con `console.log`, guarda un dato, envía un mensaje.

```js
// Pura: solo calcula
function totalCarrito(catalogo, carrito) {
  return carrito.reduce((suma, l) => {
    const p = catalogo.find((x) => x.id === l.id);
    return p ? suma + p.precio * l.cantidad : suma;
  }, 0);
}

// Con efecto: imprime
function mostrarTotal(total) {
  console.log("Total: S/ " + total.toFixed(2));
}
```

¿Por qué importa? Las funciones puras son **fáciles de probar** (les das un dato y miras el resultado) y fáciles de reutilizar. Tu bot tendrá un «cerebro» puro, que recibe el mensaje del cliente y devuelve la respuesta, y una «piel» con efectos, que lo conecta con la consola (lección 4) y luego con WhatsApp (lección 10). Si mezclas ambos, tendrás que enviar un WhatsApp real cada vez que quieras probar una regla.

> [!nota] Una regla práctica
> Escribe primero la función pura y llámala desde la que tiene efectos. Si te sorprendes escribiendo `console.log` o `fetch` dentro de una regla de negocio, sepáralos.

## async/await: esperar sin bloquear

Algunas operaciones tardan: llamar a una API, leer un archivo, esperar una respuesta de Meta. En JavaScript devuelven una **promesa** (un valor que llegará más tarde). `async/await` te permite escribirlas como si fueran código normal:

```js b.js
const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function main() {
  console.log("antes");
  await esperar(500);
  console.log("después de 0,5 s");
}

main();
console.log("esto sale primero que 'después'");
```

```salida
antes
esto sale primero que 'después'
después de 0,5 s
```

Fíjate en el orden: `main()` empieza, llega al `await` y **cede el control**; mientras espera, el resto del programa sigue. Dos reglas:

1. `await` solo se puede usar dentro de una función marcada `async` (en un módulo, también al nivel superior del archivo).
2. Una función `async` **siempre devuelve una promesa**. Para obtener su valor, tienes que hacer `await` a su llamada.

Para manejar fallos, envuelve el `await` en `try/catch`:

```js
try {
  const respuesta = await fetch("https://ejemplo.invalid/api");
  console.log(respuesta.status);
} catch (error) {
  console.log("No se pudo conectar:", error.message);
}
```

## JSON: el idioma de las APIs

**JSON** es un texto con la misma forma que los objetos de JavaScript. Es el formato en que Meta te entrega cada mensaje. Dos funciones lo manejan:

```js
const texto = JSON.stringify({ cliente: "51999000111", items: 2 });
console.log(texto);
console.log(JSON.parse(texto).items);
```

```salida
{"cliente":"51999000111","items":2}
2
```

`JSON.stringify` convierte un objeto en texto y `JSON.parse` hace lo contrario. Dos trampas: el JSON exige **comillas dobles** en las claves y los textos, y `JSON.parse` lanza un error si el texto no es JSON válido (por eso, con datos que vienen de afuera, siempre conviene `try/catch`).

## fetch: llamar a una API

`fetch` hace una petición HTTP y viene incluido en Node. Con él enviarás los mensajes a WhatsApp en la [lección 14](../14-enviar-mensajes/). Aquí un ejemplo de lectura (usa una API pública de prueba):

```js c.js
const r = await fetch("https://jsonplaceholder.typicode.com/todos/1");
console.log(r.status);
const dato = await r.json();
console.log(dato.title);
```

```salida
200
delectus aut autem
```

Y así se ve un **envío** (POST) con cuerpo JSON. Es solo un esqueleto para que reconozcas la forma; no lo ejecutes todavía:

```js
const r = await fetch("https://ejemplo.invalid/mensajes", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ texto: "hola" }),
});
```

`await fetch(...)` devuelve la respuesta; `await r.json()` lee su cuerpo como objeto. Revisa siempre `r.ok` o `r.status` antes de fiarte del resultado.

## Variables de entorno y secretos

El bot necesitará **secretos**: el token de WhatsApp, claves de otras APIs. Nunca se escriben dentro del código (si subes el código a GitHub, todo el mundo las ve). Se guardan en **variables de entorno** y se leen con `process.env`:

```js env.js
console.log("TOKEN:", process.env.TOKEN_DE_PRUEBA ?? "(no definido)");
```

Sin definir la variable:

```bash
node env.js
```

```salida
TOKEN: (no definido)
```

Para definirla sin tocar el código, crea un archivo `.env` en la carpeta del proyecto y pásalo a Node:

```text .env
TOKEN_DE_PRUEBA=abc123
```

```bash
node --env-file=.env env.js
```

```salida
TOKEN: abc123
```

En la nube, donde publicarás el bot con Cloudflare, el equivalente local es un archivo llamado `.dev.vars` y los secretos reales se cargan desde el panel o la herramienta de despliegue (lección 11).

> [!importante] Que el secreto no llegue a Git
> Crea un archivo `.gitignore` con las líneas `.env`, `.dev.vars` y `node_modules`. Así Git no los sube. Si alguna vez publicas un token por error, **revócalo y genera uno nuevo**: borrar el commit no basta.

## Pruebas con node:test

Una **prueba automática** es una función que llama a tu código con datos conocidos y verifica el resultado. Node trae un ejecutor sin instalar nada. Crea `util.test.js` junto a `util.js`:

```js util.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { formatearSoles } from "./util.js";

test("formatea soles con dos decimales", () => {
  assert.equal(formatearSoles(2.5), "S/ 2.50");
});

test("este falla a propósito", () => {
  assert.equal(formatearSoles(1), "S/ 1");
});
```

Ejecuta todas las pruebas con `node --test` (o `npm test`). Con la prueba que falla a propósito:

```salida
✔ formatea soles con dos decimales (1.2083ms)
✖ este falla a propósito (0.9698ms)
ℹ tests 2
ℹ pass 1
ℹ fail 1

✖ failing tests:

test at util.test.js:5:1
✖ este falla a propósito (0.9698ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  'S/ 1.00' !== 'S/ 1'
```

Lee el mensaje: dice cuál esperabas y cuál recibió. Corrige el valor esperado a `"S/ 1.00"` y las dos pasan. Los tiempos y detalles de la salida varían; lo que importa es la marca ✔ o ✖. En el resto del curso cada regla del bot tendrá su prueba: son tu red de seguridad cuando cambies algo.

## Errores frecuentes

- **Olvidar `"type": "module"`.** Sin él, Node no acepta `import`/`export` y muestra un error de sintaxis.
- **Importar sin extensión** (`./util` en vez de `./util.js`) en ES Modules.
- **Usar `await` fuera de una función `async`.** Marca la función con `async`.
- **Olvidar el `await`.** Obtienes una promesa en vez del valor (`Promise { <pending> }`).
- **Modificar un array dentro de `map` o `filter`.** Estas funciones no deben cambiar el original; devuelven uno nuevo.
- **Dejar el `0` fuera del `reduce`.** Sin valor inicial, el primer elemento hace de acumulador y falla con arrays de objetos o vacíos.
- **Subir `.env` a GitHub.** Añádelo al `.gitignore` antes del primer commit.
- **Comparar decimales con `===`.** Redondea o trabaja en céntimos.

## Apuntes para llevar

- Node ejecuta JavaScript fuera del navegador; con `npm init` creas un proyecto y con `"type": "module"` usas `import`/`export`.
- El catálogo y el carrito son arrays de objetos; `map`, `filter`, `find` y `reduce` cubren casi todo lo que necesitas.
- Separa funciones **puras** (calculan) de funciones **con efectos** (imprimen, envían): el cerebro del bot será puro.
- `async/await` espera operaciones lentas; `fetch` llama a APIs y `JSON.parse`/`stringify` convierten datos.
- Los secretos van en variables de entorno (`process.env`, `.env` o `.dev.vars`), nunca en el código ni en Git.
- `node --test` ejecuta tus pruebas con `node:test`.

## Glosario

| Término | Significado |
|---|---|
| Node.js | Programa que ejecuta JavaScript fuera del navegador. |
| npm | Administrador de paquetes y scripts que acompaña a Node. |
| `package.json` | Archivo con el nombre, los scripts y las dependencias del proyecto. |
| ES Modules | Sistema moderno de `import`/`export` para dividir el código en archivos. |
| Función pura | Función que devuelve siempre lo mismo para los mismos datos y no tiene efectos. |
| Promesa | Valor que llegará más tarde; `await` espera por él. |
| JSON | Formato de texto para intercambiar datos, con la forma de un objeto de JavaScript. |
| Variable de entorno | Valor de configuración fuera del código, leído con `process.env`. |
| `node:test` | Ejecutor de pruebas incluido en Node. |

```quiz
? ¿Qué hace `reduce` en `carrito.reduce((suma, l) => suma + l.cantidad, 0)`?
- Devuelve un array nuevo con las cantidades
- Devuelve el primer elemento del carrito
+ Devuelve un solo valor acumulado, aquí la suma de las cantidades, empezando en 0
- Elimina las líneas con cantidad cero
= `reduce` convierte un array en un único valor acumulando paso a paso desde el valor inicial.

? ¿Cuál es una función pura?
- Una que imprime el total con `console.log`
- Una que guarda el pedido en un archivo
+ Una que recibe el catálogo y el carrito y devuelve el total sin tocar nada de afuera
- Una que consulta una API con `fetch`
= Una función pura solo calcula; imprimir, guardar y consultar son efectos.

? ¿Qué necesitas en `package.json` para usar `import` y `export` en tus archivos `.js`?
- `"type": "commonjs"`
- `"main": "import"`
+ `"type": "module"`
- Nada, siempre funciona
= La propiedad `"type": "module"` activa los ES Modules.

? ¿Dónde debe guardarse el token de WhatsApp?
- Escrito dentro del código, para no perderlo
- En un comentario del repositorio público
+ En una variable de entorno (por ejemplo en `.env`, que no se sube a Git)
- En el título de la lección
= Los secretos no van en el código; se leen de variables de entorno y se excluyen de Git.

? ¿Qué obtienes si llamas a una función `async` sin usar `await`?
- El valor final directamente
+ Una promesa pendiente en lugar del valor
- Un error de sintaxis siempre
- Un array vacío
= Las funciones `async` devuelven promesas; con `await` obtienes el valor resuelto.
```

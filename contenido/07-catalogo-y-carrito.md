---
titulo: Catálogo y carrito
resumen: Modela el catálogo del minimarket como datos, respeta los límites de botones y listas de WhatsApp y construye un carrito puro e inmutable que suma en céntimos.
minutos: 60
nivel: intermedio
objetivos:
- Modelar un catálogo de productos como datos (id, nombre, precio, categoría, sinónimos) separados de la lógica.
- Adaptar el catálogo a los límites de las listas y botones de WhatsApp.
- Escribir un carrito con funciones puras e inmutables (agregar, quitar, cambiar cantidad).
- Calcular totales en céntimos para evitar errores de decimales y formatear soles.
- Conducir al cliente por el catálogo con listas, botones de cantidad y texto libre.
fuentes:
- JavaScript en MDN | https://developer.mozilla.org/es/docs/Web/JavaScript
---
## El catálogo es un dato, no código

Un error típico de quien empieza es escribir el catálogo dentro de la lógica: un `if` por producto, un `switch` gigante, precios repartidos por todas partes. Cambiar el precio de la leche exige buscar en cien líneas. La alternativa es separar:

- **Los datos** (productos, precios, categorías, horarios) viven en un archivo que casi cualquiera puede editar: `src/catalogo.js`.
- **La lógica** (cómo se agrega al carrito, cómo se muestra una lista) vive en otros archivos y trata a los datos como entrada.

El negocio ficticio y todos sus datos están en `NEGOCIO`:

```js src/catalogo.js
export const NEGOCIO = {
  nombre: 'Minimarket La Esquina',
  horario: 'Lunes a sábado de 8:00 a 21:00. Domingos de 9:00 a 14:00.',
  direccion: 'Av. Los Olivos 123, Distrito Ejemplo (dirección ficticia)',
  costoDelivery: 3, // soles
  minimoDelivery: 25, // soles de productos para poder pedir delivery
  zonas: ['Urb. Los Olivos', 'Urb. Las Palmeras', 'Centro'],
  yape: '51999000111', // número de ejemplo
  cuentaTransferencia: 'Cuenta de ejemplo 000-000000000-0-00 a nombre de La Esquina SAC',
};
```

Todo es inventado: la dirección, el número de Yape y la cuenta son datos de ejemplo. En tu propio proyecto los reemplazarás por los reales, y **solo en ese archivo**.

Cada producto es un objeto con seis campos. Mira cuatro del catálogo (los 31 completos están en el archivo):

```js src/catalogo.js
{ id: 'arroz', nombre: 'Arroz extra 1 kg', precio: 4.2, categoria: 'abarrotes', unidad: 'bolsa', sinonimos: ['arroz'] },
{ id: 'leche', nombre: 'Leche entera 1 L', precio: 4.3, categoria: 'lacteos', unidad: 'caja', sinonimos: ['leche', 'leche entera'] },
{ id: 'pan', nombre: 'Pan francés', precio: 0.3, categoria: 'panaderia', unidad: 'unidad', sinonimos: ['pan', 'pan frances'] },
{ id: 'gaseosa-cola', nombre: 'Gaseosa cola 1.5 L', precio: 7.5, categoria: 'bebidas', unidad: 'botella', sinonimos: ['gaseosa', 'gaseosa cola', 'cola'] },
```

| Campo | Para qué sirve |
|---|---|
| `id` | Identificador interno, estable y sin espacios (`gaseosa-cola`). Se usa en botones y filas de lista. |
| `nombre` | Lo que lee el cliente. Corto, porque debe caber en una fila de lista. |
| `precio` | En soles, como número (`4.2`, no `"S/ 4.20"`). El formato se aplica solo al mostrarlo. |
| `categoria` | Agrupa los productos para el menú de categorías. |
| `unidad` | «caja», «bolsa», «botella»: aparece junto al precio. |
| `sinonimos` | Cómo lo nombra la gente; los usa el buscador de la [lección 6](../06-entender-texto-libre/). |

Dos funciones sencillas consultan el catálogo, y las categorías se declaran aparte:

```js ejemplo.js
import { PRODUCTOS, CATEGORIAS, productoPorId, productosDeCategoria } from './src/catalogo.js';

console.log(productoPorId('nada'));
console.log(productosDeCategoria('lacteos').map((p) => p.id));
console.log(Object.keys(CATEGORIAS));
console.log(PRODUCTOS.length, Object.keys(CATEGORIAS).map((k) => k + ':' + productosDeCategoria(k).length).join(' '));
```

```salida
null
[ 'leche', 'leche-light', 'yogurt', 'queso', 'mantequilla' ]
[
  'abarrotes',
  'bebidas',
  'lacteos',
  'panaderia',
  'limpieza',
  'snacks'
]
31 abarrotes:9 bebidas:6 lacteos:5 panaderia:3 limpieza:6 snacks:2
```

Observa que `productoPorId` devuelve `null` si el id no existe, en lugar de lanzar un error. El motor siempre lo valida antes de usarlo, porque el id puede venir de un botón viejo o de un mensaje manipulado.

> [!nota] ¿Y si el catálogo cambia seguido?
> Un archivo de código sirve para aprender y para negocios con pocos cambios. Si el dueño debe actualizar precios él mismo, el catálogo se mueve a una hoja de cálculo o a una base de datos y el bot lo lee desde allí. La [lección 16](../16-panel-con-google-sheets/) conecta el bot con una hoja de cálculo (allí para guardar pedidos), y la misma técnica de lectura sirve para el catálogo. La lógica no cambia: sigue recibiendo una lista de productos.

## El catálogo debe caber en WhatsApp

Aquí entra una restricción real de la plataforma. Para mostrar muchas opciones a la vez, WhatsApp ofrece **mensajes interactivos**: botones de respuesta y listas. Ambos tienen límites. Estos son los que usa el código de referencia, válidos al momento de escribirlo:

| Elemento | Límite que respeta el bot |
|---|---|
| Botones de respuesta | Máximo 3 por mensaje; título de hasta 20 caracteres |
| Lista | Máximo 10 filas en total; título de fila hasta 24 caracteres; descripción hasta 72 |
| Texto de un mensaje | Hasta 4096 caracteres |

> [!importante] Verifica este dato
> Los límites de los mensajes interactivos son un dato que Meta puede cambiar. Revisa los valores vigentes en la documentación oficial de [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/) (sección de mensajes interactivos). En el código de referencia están en un solo lugar, el objeto `LIMITES` de `src/whatsapp.js`, para que cambiarlos sea fácil.

Estos límites explican decisiones de diseño. Los nombres de producto son cortos («Gaseosa cola 1.5 L», no «Gaseosa sabor cola en botella de 1.5 litros») porque deben caber en 24 caracteres. Se muestran **productos por categoría** y no todo el catálogo, porque una lista no admite más de 10 filas: la categoría más grande, Abarrotes, tiene 9. Y un producto pide la cantidad con tres botones (1, 2, 3) y deja el resto al texto libre.

Si te equivocas, el código lo detecta en el acto. La función `construirEnvio` (que arma el cuerpo real para la API) lanza un error claro cuando algo rompe un límite. Probado:

```js ejemplo.js
import { construirEnvio } from './src/whatsapp.js';

try { construirEnvio('51999000111', { tipo: 'botones', texto: 'x',
  botones: [1, 2, 3, 4].map((n) => ({ id: 'a' + n, titulo: 't' })) }); } catch (e) { console.log(e.message); }
try { construirEnvio('51999000111', { tipo: 'botones', texto: 'x',
  botones: [{ id: 'a', titulo: 'Un título demasiado largo para WhatsApp' }] }); } catch (e) { console.log(e.message); }
```

```salida
Respuesta inválida para WhatsApp: entre 1 y 3 botones
Respuesta inválida para WhatsApp: título de botón de más de 20 caracteres: "Un título demasiado largo para WhatsApp"
```

Por eso las pruebas del curso y el simulador `consola.js` pasan **cada respuesta** por `construirEnvio`: si un texto nuevo excede un límite, te enteras en tu computadora y no cuando un cliente real lo intenta.

## El problema de los decimales

Antes del carrito hay que hablar de dinero. Los computadores guardan los decimales en binario, y algunos números como 0,1 no tienen una representación exacta. El resultado es esto (Node 24):

```js ejemplo.js
console.log(0.1 + 0.2);
console.log(4.3 * 3);
```

```salida
0.30000000000000004
12.899999999999999
```

Imagina que un cliente pide 3 leches de S/ 4.30 y el bot responde «Total: S/ 12.899999999999999». Es un error tonto, pero en un negocio rompe la confianza (y en una factura, la contabilidad). Hay dos soluciones habituales:

1. Redondear al mostrar. Con `toFixed(2)` el 12.899999999999999 se ve como «12.90», pero el error sigue dentro y se acumula.
2. **Calcular en céntimos enteros.** Los enteros sí son exactos: S/ 4.30 son 430 céntimos, y 430 × 3 = 1290, sin error. Solo al final se divide entre 100 para mostrarlo.

El código de referencia usa la segunda, con dos funciones mínimas al inicio de `src/carrito.js`:

```js src/carrito.js
const aCentimos = (soles) => Math.round(soles * 100);
const aSoles = (centimos) => centimos / 100;
```

El `Math.round` es necesario: `4.3 * 100` no es exactamente 430 en binario, y el redondeo lo corrige.

## Un carrito puro e inmutable

Un carrito es un arreglo de **líneas**: `{ id, nombre, precio, cantidad }`. Recuerda que la lección 5 insistía en que el motor no muta lo que recibe; el carrito sigue el mismo principio y todas sus funciones devuelven un carrito **nuevo**:

```js src/carrito.js
/** Agrega `cantidad` unidades del producto (si ya estaba, suma a su línea). */
export function agregar(carrito, producto, cantidad = 1) {
  const existe = carrito.some((l) => l.id === producto.id);
  if (existe) {
    return carrito.map((l) => (l.id === producto.id ? { ...l, cantidad: l.cantidad + cantidad } : l));
  }
  return [...carrito, { id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad }];
}

/** Quita la línea completa de un producto. */
export function quitar(carrito, productoId) {
  return carrito.filter((l) => l.id !== productoId);
}

/** Cambia la cantidad de una línea. Con cantidad 0 o menos, la línea desaparece. */
export function cambiarCantidad(carrito, productoId, cantidad) {
  if (cantidad <= 0) return quitar(carrito, productoId);
  return carrito.map((l) => (l.id === productoId ? { ...l, cantidad } : l));
}
```

Fíjate en que `agregar` **copia** el precio y el nombre dentro de la línea. Si mañana el dueño cambia el precio del catálogo, el carrito de un cliente que ya estaba comprando conserva el precio con el que le hablaron. Es lo que querrías en una tienda.

Veámoslo en acción, con la leche y el arroz del catálogo:

```js ejemplo.js
import * as C from './src/carrito.js';
import { productoPorId } from './src/catalogo.js';

const leche = productoPorId('leche');
const arroz = productoPorId('arroz');
const vacio = [];
const c1 = C.agregar(vacio, leche, 2);
const c2 = C.agregar(c1, arroz, 1);
const c3 = C.agregar(c2, leche, 1);

console.log(vacio.length, c1);
console.log(c3);
```

```salida
0 [
  { id: 'leche', nombre: 'Leche entera 1 L', precio: 4.3, cantidad: 2 }
]
[
  { id: 'leche', nombre: 'Leche entera 1 L', precio: 4.3, cantidad: 3 },
  { id: 'arroz', nombre: 'Arroz extra 1 kg', precio: 4.2, cantidad: 1 }
]
```

El carrito original sigue vacío (longitud 0) y `c1` conserva sus 2 leches: cada paso produjo un carrito nuevo. Al agregar leche por segunda vez no se duplicó la línea: se sumó a la existente (2 + 1 = 3).

Con `cambiarCantidad` y `quitar`:

```js ejemplo.js
console.log(C.cambiarCantidad(c3, 'leche', 0).map((l) => l.id));
console.log(C.cambiarCantidad(c3, 'leche', 5)[0].cantidad, C.quitar(c3, 'arroz').length, C.quitar(c3, 'zzz').length);
```

```salida
[ 'arroz' ]
5 1 2
```

Cantidad 0 elimina la línea; quitar un id que no existe devuelve el carrito sin cambios (2 líneas); y las funciones nunca fallan por un id raro.

> [!importante] ¿Por qué tanto cuidado con no mutar?
> Si `agregar` modificara el carrito recibido, un error en un paso podría dejar el carrito a medias y sería casi imposible reproducirlo. Con funciones puras, cada paso se puede probar y repetir. Además, el motor usa `structuredClone` sobre la sesión entera, así que mutar «por comodidad» sería inútil y confuso.

## Total, cantidades y formato

Con el carrito en céntimos, el total es una suma de enteros:

```js src/carrito.js
/** Total en soles, redondeado a 2 decimales. */
export function total(carrito) {
  const centimos = carrito.reduce((suma, l) => suma + aCentimos(l.precio) * l.cantidad, 0);
  return aSoles(centimos);
}

/** Cantidad total de unidades. */
export function cantidadItems(carrito) {
  return carrito.reduce((suma, l) => suma + l.cantidad, 0);
}

/** 12.5 -> "S/ 12.50" */
export function formatoSoles(monto) {
  return `S/ ${monto.toFixed(2)}`;
}
```

La diferencia entre sumar mal y bien se ve con los números de antes:

```js ejemplo.js
const raro = [{ id: 'a', nombre: 'a', precio: 0.1, cantidad: 1 }, { id: 'b', nombre: 'b', precio: 0.2, cantidad: 1 }];
console.log(raro.reduce((s, l) => s + l.precio * l.cantidad, 0), C.total(raro));

const muchos = [{ id: 'x', nombre: 'x', precio: 0.3, cantidad: 3 }];
console.log(0.3 * 3, C.total(muchos));
console.log(C.total(c3), C.cantidadItems(c3), C.formatoSoles(C.total(c3)), C.formatoSoles(12.5));
```

```salida
0.30000000000000004 0.3
0.8999999999999999 0.9
17.1 4 S/ 17.10 S/ 12.50
```

Y `resumen` produce el texto exacto que el cliente verá en WhatsApp: una línea por producto y un subtotal. Sin emojis, con formato simple (WhatsApp no necesita más):

```js ejemplo.js
console.log(C.resumen(c3));
console.log(C.resumen([]));
```

```salida
- 3 x Leche entera 1 L: S/ 12.90
- 1 x Arroz extra 1 kg: S/ 4.20
Subtotal: S/ 17.10
Tu carrito está vacío.
```

## Conducir al cliente por el catálogo

El catálogo y el carrito son datos y funciones. El motor los conecta con una conversación. Hay tres caminos para que un cliente agregue un producto, y conviene ofrecer los tres: cada cliente tiene su estilo.

**1. Con listas y botones (el cliente toca).** «Hacer pedido» muestra una lista de categorías (id `cat:<categoría>`), luego una lista de productos (id `prod:<id>`), luego tres botones de cantidad (`cant:1`, `cant:2`, `cant:3`). La primera lista, vista como estructura de datos:

```js ejemplo.js
import { procesar, crearSesion } from './src/motor.js';
const cat = procesar(crearSesion('51999000111', 0), { tipo: 'interactivo', id: 'menu_pedir' }, 1).respuestas[0];
console.log(cat.tipo, cat.boton, cat.secciones[0].filas.map((f) => `${f.id} (${f.descripcion})`));
```

```salida
lista Ver categorías [
  'cat:abarrotes (9 productos)',
  'cat:bebidas (6 productos)',
  'cat:lacteos (5 productos)',
  'cat:panaderia (3 productos)',
  'cat:limpieza (6 productos)',
  'cat:snacks (2 productos)'
]
```

Al elegir un producto, el bot pregunta la cantidad con el precio a la vista:

```salida
Leche entera 1 L cuesta S/ 4.30 por caja. ¿Cuántas quieres? Toca un botón o escribe el número.
```

**2. Escribiendo la cantidad.** Si el cliente responde «0», recibe «Escribe una cantidad entre 1 y 20.» y el producto sigue pendiente; si responde «dos», se agregan 2. Hay un tope: **20 unidades por producto**, constante `MAX_POR_PRODUCTO` del motor, para evitar pedidos absurdos o errores de tecleo (un «100» en vez de «10»).

**3. Con texto libre (la forma más rápida).** «2 leches y 1 arroz» agrega las dos líneas de una vez, con la tubería de la lección 6:

```salida
Agregué 2 x Leche entera 1 L.
Agregué 1 x Arroz extra 1 kg.
Llevas 3 producto(s). Subtotal: S/ 12.80.
```

Los tres botones que acompañan ese mensaje son «Seguir comprando», «Ver carrito» y «Finalizar pedido». Es un patrón importante: **después de cada acción, el cliente siempre ve qué puede hacer a continuación.**

### Cuando el producto es ambiguo

«3 gaseosas» coincide con dos productos. El motor agrega lo que sí es claro, y para lo ambiguo muestra una lista con las opciones, **recordando la cantidad** (`cantidadPendiente`) para no preguntarla otra vez:

```js ejemplo.js
let s = procesar(crearSesion('51999000111', 0), { tipo: 'texto', texto: 'hola' }, 1).sesion;
let r = procesar(s, { tipo: 'texto', texto: '3 gaseosas' }, 3);
console.log(r.respuestas.map((x) => x.tipo), r.sesion.cantidadPendiente);
console.log(JSON.stringify(r.respuestas[0].secciones));
r = procesar(r.sesion, { tipo: 'interactivo', id: 'prod:gaseosa-cola' }, 4);
console.log(r.respuestas[0].texto);
```

```salida
[ 'lista' ] 3
[{"titulo":"Opciones","filas":[{"id":"prod:gaseosa-cola","titulo":"Gaseosa cola 1.5 L","descripcion":"S/ 7.50 por botella"},{"id":"prod:gaseosa-naranja","titulo":"Gaseosa naranja 1.5 L","descripcion":"S/ 7.50 por botella"}]}]
Agregué 3 x Gaseosa cola 1.5 L.
Llevas 3 producto(s). Subtotal: S/ 22.50.
```

La cantidad pendiente es otro ejemplo del uso de la sesión que viste en la [lección 5](../05-estado-de-la-conversacion/): un dato a medias que espera el siguiente mensaje.

## Ver, quitar y vaciar

Un cliente debe poder arrepentirse. Tres operaciones, todas desde botones o texto:

- **Ver el carrito:** «carrito», «mi pedido» o el botón «Ver carrito». Pasa a `CARRITO` y muestra el `resumen` con tres botones («Continuar», «Seguir comprando», «Vaciar carrito»).
- **Quitar:** «quita las leches». El motor busca los productos nombrados y los saca del carrito.
- **Vaciar:** el botón borra todo y vuelve a mostrar las categorías.

Probado sobre un carrito con leche, arroz y gaseosa cola:

```js ejemplo.js
r = procesar(s2, { tipo: 'texto', texto: 'quita las leches' }, 5);
console.log(r.respuestas.map((x) => x.texto));
r = procesar(s2, { tipo: 'texto', texto: 'quita el atun' }, 6);
console.log(r.respuestas.map((x) => x.texto));
```

```salida
[
  'Quité del carrito: Leche entera 1 L.',
  'Esto llevas:\n' +
    '- 1 x Arroz extra 1 kg: S/ 4.20\n' +
    '- 3 x Gaseosa cola 1.5 L: S/ 22.50\n' +
    'Subtotal: S/ 26.70'
]
[ 'No encontré ese producto en tu carrito.' ]
```

(`s2` es la sesión con ese carrito). Si el producto que pide quitar no está en el carrito, el bot lo dice en vez de quedarse mudo: **nunca ignores a un cliente en silencio.**

Y un caso de borde que muestra el tope de 20 unidades. Con 1 arroz ya en el carrito, el cliente escribe «25 arroz»:

```salida
No pude agregar Arroz extra 1 kg: Por pedido solo puedo anotar hasta 20 unidades de cada producto.
Llevas 6 producto(s). Subtotal: S/ 35.30.
```

El bot explica el límite y le muestra el carrito tal como estaba; no agrega a medias.

## Probar todo sin WhatsApp

Todas estas piezas tienen pruebas automáticas. `test/carrito.test.js` revisa la suma en céntimos y la inmutabilidad; `test/motor.test.js` incluye conversaciones completas, y `npm test` corre las 112 en menos de un segundo. Si algún día cambias un precio o un texto del bot, esas pruebas te avisan qué se rompió. El cierre de esta lección en tu computadora es ejecutar `npm run chat`, escribir «hola» y armar un carrito moviéndote por listas, botones y texto libre.

## Errores frecuentes

- **Guardar el precio como texto** (`"S/ 4.30"`). No se puede sumar. Guarda números y formatea al mostrar.
- **Sumar decimales directamente.** Calcula en céntimos enteros y redondea con `Math.round`.
- **Mutar el carrito** (`carrito.push`, `linea.cantidad++`). Devuelve siempre uno nuevo.
- **Pasar de los límites de WhatsApp** (más de 3 botones, más de 10 filas, títulos largos). Valida antes de enviar.
- **Mostrar todo el catálogo de una vez.** Divide por categorías y deja que el cliente también pueda escribir.
- **No poner tope a la cantidad.** Un «1000» por error de teclado puede arruinar un pedido.
- **Olvidar mostrar el carrito tras cada cambio.** El cliente necesita ver que el bot entendió.

## Apuntes para llevar

- El catálogo es **dato** (en un archivo aparte) y la lógica lo trata como entrada.
- WhatsApp impone **límites** a botones y listas: diseña nombres cortos y categorías de máximo 10 productos, y verifícalos en la documentación oficial.
- El dinero se calcula en **céntimos enteros**; el formato `S/ 12.50` se aplica solo al mostrar.
- Las funciones del carrito son **puras e inmutables**: devuelven un carrito nuevo y copian nombre y precio en la línea.
- Ofrece tres formas de agregar: listas y botones, cantidad escrita y texto libre.
- Si algo es ambiguo, **pregunta** y recuerda la cantidad; si algo no existe, **avísalo**.
- Pon un **tope** de cantidad y explícalo cuando se supere.

## Glosario

| Término | Significado |
|---|---|
| Catálogo | Lista de productos con sus datos (id, nombre, precio, categoría, sinónimos). |
| Línea | Una fila del carrito: `{ id, nombre, precio, cantidad }`. |
| Inmutable | Que no se modifica: toda operación devuelve una copia nueva. |
| Céntimos | Unidad entera (1/100 de sol) que evita errores de decimales. |
| Lista interactiva | Mensaje de WhatsApp con hasta 10 filas elegibles. |
| Botón de respuesta | Botón tocable de un mensaje interactivo (máximo 3). |
| `cantidadPendiente` | Cantidad ya dicha por el cliente mientras elige entre productos parecidos. |
| Tope | Cantidad máxima aceptada por producto (20 en el minimarket). |

```quiz
? ¿Por qué el carrito suma en céntimos enteros?
- Porque WhatsApp lo exige
+ Porque los decimales binarios dan errores como 0.1 + 0.2 = 0.30000000000000004
- Porque los céntimos ocupan menos memoria
- Porque así se puede mostrar el precio sin formato
= Los enteros son exactos; se divide entre 100 solo al final para mostrar soles.

? ¿Qué significa que `agregar(carrito, producto, cantidad)` sea inmutable?
- Que solo puede usarse una vez
+ Que devuelve un carrito nuevo y no modifica el que recibió
- Que no permite agregar dos veces el mismo producto
- Que guarda el carrito en un archivo
= Cada operación produce una copia; así se pueden probar y repetir los pasos.

? ¿Por qué se muestran los productos por categoría y no todos juntos?
- Porque queda más bonito
+ Porque una lista de WhatsApp admite un máximo de filas (10 en el código de referencia) y conviene verificar el límite vigente
- Porque el catálogo es secreto
- Porque los botones no admiten texto
= Los límites de listas y botones obligan a dividir el catálogo; verifica los valores en la documentación oficial de Meta.

? El cliente escribe «3 gaseosas» y hay dos gaseosas en el catálogo. ¿Qué hace el motor?
- Agrega la primera
+ Muestra una lista con las opciones y recuerda la cantidad 3 mientras el cliente elige
- Descarta el mensaje
- Agrega las tres de cada tipo
= La cantidad pendiente evita volver a preguntarla; se pregunta solo por lo ambiguo.

? ¿Por qué `agregar` copia `nombre` y `precio` dentro de la línea del carrito?
- Para ahorrar memoria
+ Para que el cliente conserve el precio con el que se le habló aunque el catálogo cambie después
- Porque el catálogo no tiene precios
- Porque `productoPorId` lo exige
= Una línea autosuficiente protege al pedido de cambios posteriores del catálogo.
```

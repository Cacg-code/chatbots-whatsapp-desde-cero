---
titulo: Entender texto libre
resumen: Cómo un bot de reglas entiende frases como «quiero dos leches» con normalización, cantidades, sinónimos, tolerancia a errores de tipeo e intenciones, sin usar IA.
minutos: 60
nivel: intermedio
objetivos:
- Normalizar un mensaje (minúsculas, sin tildes ni signos) para poder compararlo de forma fiable.
- Extraer cantidades escritas con cifras, palabras y docenas.
- Buscar productos por sinónimos, con plurales y errores de tipeo, y resolver ambigüedades.
- Detectar la intención de un mensaje con frases clave, orden de prioridad y reglas para mensajes cortos.
- Reconocer los límites de un bot de reglas y decidir qué hacer cuando no entiende.
---
## El problema: la gente no escribe como tú programas

Cuando diseñaste el menú en la [lección 2](../02-disenar-la-conversacion/), el cliente tocaba botones: respuestas cerradas y fáciles de manejar. Pero en WhatsApp la gente **escribe**, y escribe como habla:

- «hola buenas tienen pan?»
- «Quiero DOS leches porfa»
- «mantequila y media docena de huevos»
- «cuanto cuesta el arroz»

Nadie escribe «Seleccionar producto: leche; cantidad: 2». Si tu bot solo entiende frases exactas, el cliente se frustra a la segunda respuesta. Esta lección construye, con reglas simples y sin inteligencia artificial, la capa que convierte texto libre en algo que el motor ([lección 5](../05-estado-de-la-conversacion/)) pueda ejecutar. Todo está en un archivo del código de referencia: `src/texto.js`, de funciones **puras** (mismo texto, misma respuesta).

El enfoque general es una tubería de pasos pequeños:

```flujo
Texto crudo|"Quiero DOS Leches!"
-> normalizar
Texto limpio|quiero dos leches
-> extraer
Cantidad y producto|2 x leche
-> o, si no hay productos
Intención|saludo, menú, cancelar...
```

## Paso 1: normalizar

Para el computador «Leche», «leche» y «LECHE» son tres cosas distintas, y «Azúcar» no es «azucar». Antes de comparar nada hay que dejar el texto en una forma estándar: **minúsculas, sin tildes, sin signos ni emojis y con un solo espacio entre palabras**.

```js src/texto.js
export function normalizar(texto) {
  if (typeof texto !== 'string') return '';
  return texto
    .toLowerCase()
    .normalize('NFD') // separa la letra de su tilde: "é" -> "e" + "´"
    .replace(/[̀-ͯ]/g, '') // borra las tildes sueltas
    .replace(/[^a-z0-9\s]/g, ' ') // signos y emojis -> espacio
    .replace(/\s+/g, ' ')
    .trim();
}
```

La parte menos obvia es `normalize('NFD')`. En Unicode una «é» puede guardarse como una sola pieza o como la letra «e» más una tilde suelta. Con `NFD` (descomposición) siempre quedan separadas, y la segunda línea borra las tildes. Se ve así (ejecutado en Node 24):

```js ejemplo.js
import { normalizar } from './src/texto.js';

for (const x of ['¡Quiero DOS Leches!', '  Atún   en LATA 😀 ', 'Azúcar', '', null]) {
  console.log(JSON.stringify(x), '->', JSON.stringify(normalizar(x)));
}
```

```salida
"¡Quiero DOS Leches!" -> "quiero dos leches"
"  Atún   en LATA 😀 " -> "atun en lata"
"Azúcar" -> "azucar"
"" -> ""
null -> ""
```

Tres detalles de diseño: el emoji desaparece (es un símbolo, no una letra), un valor que no es texto (`null`) devuelve cadena vacía en lugar de lanzar un error (el bot nunca debe caerse por un mensaje raro), y **todas** las comparaciones del resto de la lección usan texto normalizado. Por eso en el catálogo los sinónimos están escritos sin tildes: `'azucar'`, `'tallarin'`, `'lejia'`.

> [!nota] La «ñ»
> Con este método «ñ» se vuelve «n» (descomposición `n` + tilde). Para un bot de pedidos es una ventaja: quien escribe «dueño» y quien escribe «dueno» obtienen lo mismo (`dueno` está entre las frases de la intención `humano`).

## Paso 2: la cantidad

«2 leches», «dos leches», «una docena de huevos», «media docena». Hay que sacar el número de cualquiera de esas formas. La función `extraerCantidad` busca el primer número (en cifras o en palabras) y entiende docenas:

```js src/texto.js
const NUMEROS_EN_PALABRAS = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
  ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14,
  quince: 15, veinte: 20,
};

export function extraerCantidad(texto) {
  const t = normalizar(texto);
  if (/\bmedia docena\b/.test(t)) return 6;
  let n = null;
  for (const palabra of t.split(' ')) {
    if (/^\d+$/.test(palabra)) { n = Number(palabra); break; }
    if (palabra in NUMEROS_EN_PALABRAS) { n = NUMEROS_EN_PALABRAS[palabra]; break; }
  }
  if (/\bdocenas?\b/.test(t)) return (n ?? 1) * 12;
  return n ?? 1;
}
```

Observa la decisión de fondo: **si el cliente no dice cuántos, es 1** (`n ?? 1`). Es una suposición razonable en una tienda («quiero leche» = una leche), y el bot siempre muestra «Agregué 1 x Leche entera 1 L», así que el cliente puede corregir. Resultados reales:

```js ejemplo.js
import { extraerCantidad, cantidadSola } from './src/texto.js';

for (const x of ['2 leches', 'dos leches', 'media docena de huevos', 'una docena',
                 'dos docenas de huevos', 'quiero leche', '1 docena y media']) {
  console.log(JSON.stringify(x), extraerCantidad(x));
}
console.log(cantidadSola('tres'), cantidadSola('3 leches'));
```

```salida
"2 leches" 2
"dos leches" 2
"media docena de huevos" 6
"una docena" 12
"dos docenas de huevos" 24
"quiero leche" 1
"1 docena y media" 12
3 null
```

La última línea imprime `3 null`. La función hermana `cantidadSola` devuelve el número **solo si el mensaje es únicamente un número** (`"3"` o `"tres"`). Sirve para el paso en que el bot preguntó «¿Cuántas quieres?» y el cliente responde con una sola palabra. Ya viste cómo la usa el motor en la lección 5.

> [!importante] Los límites son parte del diseño
> Fíjate en `"1 docena y media"`: el resultado es 12, no 18. El bot **no entiende** «docena y media». No pasa nada si lo sabes y lo documentas; el peligro es creer que cubres todo. Cada regla nueva trae más casos raros, y por eso conviene empezar con las frases que tus clientes realmente escriben (las verás cuando midas tu bot en producción; ver la [lección 21](../21-costos-y-metricas/)).

## Paso 3: encontrar el producto

Ahora el producto. Una idea ingenua sería buscar el nombre exacto del catálogo, «Leche entera 1 L». Nadie lo escribe así. La gente dice «leche», «leches», «mantequila» (con una sola «l»), «papitas» o «tallarines». La solución es darle a cada producto una lista de **sinónimos**: las formas en que la gente lo nombra. Mira dos entradas de `src/catalogo.js`:

```js src/catalogo.js
{ id: 'fideos', nombre: 'Fideos spaghetti 500 g', precio: 3.1, categoria: 'abarrotes', unidad: 'bolsa',
  sinonimos: ['fideos', 'spaghetti', 'tallarin', 'tallarines'] },
{ id: 'papas', nombre: 'Papas fritas 100 g', precio: 2.5, categoria: 'snacks', unidad: 'bolsa',
  sinonimos: ['papas fritas', 'papitas', 'snack'] },
```

El buscador usa **solo** los sinónimos (no el nombre largo), así que ahí va el nombre «hablado». Esta es una tabla de datos, no lógica: ampliarla no exige tocar el código. Esa es la forma más barata de mejorar un bot: leer qué escribieron los clientes y agregar sinónimos.

### Cómo decide `buscarProductos`

Tiene tres reglas, y las tres se ven en `src/texto.js`:

1. **Palabras de relleno fuera.** «quiero», «de», «por favor», «hola»... no ayudan a identificar nada. Se descartan (`RELLENO`).
2. **Una frase coincide solo si están todas sus palabras.** «agua con gas» necesita las tres palabras. Cada palabra escrita se usa una sola vez.
3. **Gana la frase más larga.** Si el cliente escribe «agua con gas», coinciden tanto «agua» (1 palabra) como «agua con gas» (3 palabras); gana la de 3. Si hay empate, se devuelven **todos** los empatados.

```js ejemplo.js
import { buscarProductos } from './src/texto.js';
import { PRODUCTOS } from './src/catalogo.js';

for (const x of ['leche', 'leches', 'agua', 'agua con gas', 'agua sin gas', 'gaseosa',
                 'una gaseosa cola', 'pan', 'pan de molde', 'papitas', 'tallarines',
                 'detergente de platos', 'detergente', 'salsa', 'xyz']) {
  console.log(JSON.stringify(x), '->', JSON.stringify(buscarProductos(x, PRODUCTOS).map((p) => p.id)));
}
```

```salida
"leche" -> ["leche"]
"leches" -> ["leche"]
"agua" -> ["agua"]
"agua con gas" -> ["agua-gas"]
"agua sin gas" -> ["agua"]
"gaseosa" -> ["gaseosa-cola","gaseosa-naranja"]
"una gaseosa cola" -> ["gaseosa-cola"]
"pan" -> ["pan"]
"pan de molde" -> ["pan-molde"]
"papitas" -> ["papas"]
"tallarines" -> ["fideos"]
"detergente de platos" -> ["lavavajillas"]
"detergente" -> ["detergente"]
"salsa" -> []
"xyz" -> []
```

Cuatro lecturas útiles. «gaseosa» a secas devuelve **dos** productos: es ambigua, y el motor responderá con una lista para que el cliente elija. «detergente de platos» gana a «detergente» porque es una frase más específica (así se evita agregar detergente de ropa por error). «salsa» no coincide con nada: lista vacía. Y «leches» coincide con «leche» gracias al plural simple, que se resuelve así:

```js src/texto.js
function mismaPalabra(escrita, deCatalogo) {
  if (escrita === deCatalogo) return true;
  if (escrita === deCatalogo + 's' || escrita === deCatalogo + 'es') return true; // plural simple
  if (deCatalogo.endsWith('z') && escrita === deCatalogo.slice(0, -1) + 'ces') return true; // arroz -> arroces
  // Un error tipográfico (1 letra) se tolera solo en palabras largas, para no confundir "sal" con "sol".
  return escrita.length >= 5 && deCatalogo.length >= 5 && levenshtein(escrita, deCatalogo) <= 1;
}
```

### Errores de tipeo: la distancia de Levenshtein

La última línea de `mismaPalabra` tolera errores de tipeo con la **distancia de Levenshtein**: el mínimo de cambios (cambiar, borrar o añadir una letra) para convertir una palabra en otra. «mantequila» y «mantequilla» están a distancia 1: falta una «l».

```js ejemplo.js
import { levenshtein } from './src/texto.js';
console.log(levenshtein('mantequila', 'mantequilla'), levenshtein('kitten', 'sitting'), levenshtein('sal', 'sol'));
```

```salida
1 3 1
```

Mira la última cifra: «sal» y «sol» también están a distancia 1. Si el bot aceptara un error en cualquier palabra, el cliente que pide «sal» podría recibir algo que no es sal. Por eso la regla es **solo en palabras de 5 letras o más**. Es una decisión de **precisión contra flexibilidad**: más tolerancia entiende más, pero se equivoca más. En un negocio, una venta equivocada cuesta más que una pregunta de aclaración. Comprobación (el catálogo tiene «arroz» y «sal»):

```js ejemplo.js
for (const x of ['mantequila', 'arroces', 'lechee', 'arros', 'sol', 'sal'])
  console.log(JSON.stringify(x), '->', JSON.stringify(buscarProductos(x, PRODUCTOS).map((p) => p.id)));
```

```salida
"mantequila" -> ["mantequilla"]
"arroces" -> ["arroz"]
"lechee" -> ["leche"]
"arros" -> ["arroz"]
"sol" -> []
"sal" -> ["sal"]
```

## Paso 4: varios productos en un solo mensaje

Los clientes juntan cosas: «2 leches y 1 arroz», «pan, leche y atún». `separarPedidos` parte el mensaje en trozos por comas, «+», « y » o « e », y para cada trozo calcula la cantidad **y** busca los productos. Descarta los trozos sin producto.

```js src/texto.js
export function separarPedidos(texto, productos) {
  return String(texto)
    .split(/,|\+|\s+y\s+|\s+e\s+/i)
    .map((trozo) => ({ cantidad: extraerCantidad(trozo), productos: buscarProductos(trozo, productos) }))
    .filter((p) => p.productos.length > 0);
}
```

```js ejemplo.js
import { separarPedidos } from './src/texto.js';
import { PRODUCTOS } from './src/catalogo.js';

for (const x of ['2 leches y 1 arroz', '2 leches y media docena de huevos',
                 'quiero pan, leche y atun', '3 gaseosas + 2 aguas', 'hola buenas']) {
  const r = separarPedidos(x, PRODUCTOS).map((p) => [p.cantidad, p.productos.map((q) => q.id)]);
  console.log(JSON.stringify(x), '->', JSON.stringify(r));
}
```

```salida
"2 leches y 1 arroz" -> [[2,["leche"]],[1,["arroz"]]]
"2 leches y media docena de huevos" -> [[2,["leche"]],[6,["huevo"]]]
"quiero pan, leche y atun" -> [[1,["pan"]],[1,["leche"]],[1,["atun"]]]
"3 gaseosas + 2 aguas" -> [[3,["gaseosa-cola","gaseosa-naranja"]],[2,["agua"]]]
"hola buenas" -> []
```

El resultado de `"3 gaseosas + 2 aguas"` es instructivo: una parte es ambigua (dos gaseosas posibles) y la otra clara. El motor agrega lo claro y **pregunta solo por lo ambiguo**, recordando la cantidad (3) mientras el cliente elige. Lo verás completo en la [lección 7](../07-catalogo-y-carrito/).

Probemos de punta a punta, con el motor real, un mensaje largo con un error de tipeo:

```js ejemplo.js
import { conversacion } from './test/ayudas.js';
const c = conversacion();
c.decir('hola');
c.decir('1 mantequila y media docena de huevos');
console.log(c.texto);
```

```salida
Agregué 1 x Mantequilla 200 g.
Agregué 6 x Huevo.
Llevas 7 producto(s). Subtotal: S/ 9.80.
```

Y ahora el caso que **no** se entiende bien (límite conocido): «1 docena y media de huevos» se parte en « y », y el segundo trozo, «media de huevos», se queda sin docena:

```salida
Agregué 1 x Huevo.
Llevas 1 producto(s). Subtotal: S/ 0.60.
```

Un bot de reglas tiene fronteras. Lo importante es que el cliente **ve** lo que el bot entendió («Agregué 1 x Huevo») y puede corregir. Ese eco es la mejor red de seguridad que tienes.

## Paso 5: la intención

Cuando el mensaje no nombra productos («hola», «a qué hora abren», «quiero hablar con una persona»), hay que averiguar **qué quiere hacer** el cliente: su **intención**. El código de referencia las lista en un objeto de frases:

```js src/texto.js
const FRASES = {
  cancelar: ['cancelar', 'cancela', 'cancelo', 'anular', 'anula', 'salir', 'olvidalo', 'ya no quiero', 'no quiero nada'],
  humano: ['persona', 'humano', 'asesor', 'agente', 'encargado', 'operador', 'dueno', 'atencion al cliente', 'hablar con alguien'],
  horario: ['horario', 'horarios', 'a que hora', 'abren', 'cierran', 'atienden', 'direccion', 'ubicacion', 'donde estan'],
  carrito: ['carrito', 'mi pedido', 'ver pedido', 'que llevo', 'cuanto es', 'mi cuenta'],
  catalogo: ['catalogo', 'productos', 'precios', 'que venden', 'que tienen', 'que hay', 'hacer pedido', 'hacer un pedido', 'pedir', 'comprar'],
  menu: ['menu', 'opciones', 'inicio', 'empezar'],
  ayuda: ['ayuda', 'ayudame', 'help', 'como funciona', 'no entiendo'],
  confirmar: ['confirmar', 'confirmo', 'confirmado', 'si', 'ok', 'dale', 'listo', 'acepto', 'correcto', 'finalizar', 'terminar', 'eso es todo', 'nada mas'],
  saludo: ['hola', 'holaa', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'hi', 'ola'],
};
```

`detectarIntencion` recorre las intenciones **en un orden fijo** y devuelve la primera cuya frase aparezca:

```js src/texto.js
const SOLO_CORTOS = new Set(['confirmar', 'saludo']);
const ORDEN = ['cancelar', 'humano', 'horario', 'carrito', 'catalogo', 'menu', 'ayuda', 'confirmar', 'saludo'];

function contiene(textoNormalizado, frase) {
  return ` ${textoNormalizado} `.includes(` ${frase} `);
}
```

Tres ideas clave:

- **Palabras completas, no pedazos.** `contiene` rodea el texto y la frase con espacios. Así «si» no coincide dentro de «simple» ni «ola» dentro de «cola».
- **El orden es prioridad.** `cancelar` y `humano` van primero: si el cliente escribe «ya no quiero, quiero una persona», lo urgente es atenderlo. Y `saludo` va al final porque «hola» aparece dentro de muchas frases.
- **`confirmar` y `saludo` solo valen en mensajes cortos** (4 palabras o menos). Si no, «si quiero 2 leches y un arroz» se tomaría como un «sí» a secas. Los mensajes largos suelen traer más información.

```js ejemplo.js
import { detectarIntencion } from './src/texto.js';

for (const x of ['hola', 'Buenas tardes!', 'que venden', 'quiero hablar con una persona', 'si',
                 'ok listo gracias por todo amigo', 'a que hora cierran', 'ya no quiero', 'mi pedido',
                 'hacer pedido', 'confirmar mi pedido', 'asdf', '']) {
  console.log(JSON.stringify(x), '->', detectarIntencion(x));
}
```

```salida
"hola" -> saludo
"Buenas tardes!" -> saludo
"que venden" -> catalogo
"quiero hablar con una persona" -> humano
"si" -> confirmar
"ok listo gracias por todo amigo" -> desconocida
"a que hora cierran" -> horario
"ya no quiero" -> cancelar
"mi pedido" -> carrito
"hacer pedido" -> catalogo
"confirmar mi pedido" -> carrito
"asdf" -> desconocida
"" -> desconocida
```

Mira dos resultados con cuidado. «ok listo gracias por todo amigo» es `desconocida` porque tiene más de 4 palabras: es una regla que hay que conocer, no un error. Y «confirmar mi pedido» devuelve `carrito`, no `confirmar`, porque `carrito` (con «mi pedido») va antes en el orden. Ese comportamiento es **real** del código de referencia y un buen ejemplo de límite: en la práctica, el motor resuelve esto con el estado (en el paso `CONFIRMAR` los botones son los protagonistas), pero un diseñador atento sabría ajustarlo.

## La prioridad completa: intención o producto

¿Qué gana cuando un mensaje tiene ambas cosas, como «hola quiero 2 leches» o «si quiero 2 leches»? En el motor (`accionDeTexto`) el orden es:

1. **Cancelar o hablar con una persona** (valen en cualquier estado).
2. **Respuestas propias del paso:** la dirección en `DIRECCION`, «delivery» en `TIPO_ENTREGA`, «yape» en `PAGO`, la cantidad suelta si hay un producto pendiente.
3. **Quitar** («quita las leches»).
4. **Texto que nombra productos** (`separarPedidos`).
5. Si no hay productos: la **intención** (saludo, menú, catálogo, carrito, confirmar, ayuda, horario).

Por eso «si quiero 2 leches» agrega leche (regla 4) aunque `detectarIntencion` lo etiquete `confirmar`. Y por eso «hola quiero 2 leches» no muestra un saludo vacío, sino que agrega las leches de una vez:

```salida
ELIGIENDO Agregué 2 x Leche entera 1 L.
Llevas 2 producto(s). Subtotal: S/ 8.60.
```

Esto responde a una regla de experiencia de usuario: **entre dos lecturas posibles, elige la que le ahorra más pasos al cliente.**

## Cuando no se entiende

Algunos mensajes no encajan en nada. «quiero algo rico» no nombra productos ni tiene una intención conocida. El motor suma un fallo, responde «No te entendí bien. Puedes escribir, por ejemplo, "2 leches", o usar los botones.» y repite el paso actual. Con el segundo fallo seguido ofrece hablar con una persona (el contador `fallos` de la lección 5).

Hay dos buenas prácticas:

- **Da un ejemplo en el mensaje de error.** «Escribe, por ejemplo, "2 leches"» enseña el formato y evita el siguiente error.
- **Registra lo que no entendiste.** Cada «no te entendí» es una pista gratis de qué sinónimo o frase te falta. Revisar esos mensajes una vez por semana es la mejor forma de mejorar un bot de reglas.

Cuando las reglas ya no alcanzan, se puede añadir inteligencia artificial como complemento, **no como reemplazo**; lo veremos en la [lección 22](../22-ia-como-complemento/).

## Errores frecuentes

- **No normalizar antes de comparar.** «Leche», «LECHE» y «lechè» se vuelven mundos distintos. Normaliza una sola vez, al principio.
- **Aceptar errores de tipeo en palabras cortas.** «sal» y «sol» están a distancia 1. Limita la tolerancia a palabras largas.
- **Buscar fragmentos en vez de palabras completas.** Con `includes('si')` sin espacios, «simple» se leería como un «sí».
- **Dar a todas las frases la misma prioridad.** Sin orden, «cancelar» y «hacer pedido» pueden chocar. Define quién gana.
- **Olvidar el contexto.** «tres» solo es una cantidad si el bot la estaba esperando.
- **Callar los límites.** Si sabes que «docena y media» no se entiende, no lo prometas; y haz que el bot muestre siempre lo que entendió.
- **Meter la lista de sinónimos dentro del código de lógica.** Mantenla en datos (`catalogo.js`) para poder crecer sin riesgo.

## Apuntes para llevar

- Todo empieza con `normalizar`: minúsculas, sin tildes ni signos, espacios limpios.
- Las cantidades pueden venir en cifras, palabras o docenas; sin dato, vale 1.
- Los productos se buscan por **sinónimos** (datos, no código). Gana la frase más específica; en empate se pregunta.
- La distancia de Levenshtein perdona errores de tipeo, pero solo en palabras largas.
- Las **intenciones** se detectan por frases de palabras completas, con orden de prioridad y límite de longitud para `confirmar` y `saludo`.
- Entre producto e intención, el motor prioriza lo que ahorra pasos al cliente y siempre muestra lo que entendió.
- Registra los mensajes no entendidos: son tu lista de mejoras.

## Glosario

| Término | Significado |
|---|---|
| Texto libre | Mensaje escrito por el cliente con sus propias palabras, sin botones. |
| Normalizar | Dejar el texto en una forma estándar (minúsculas, sin tildes ni signos). |
| Sinónimo | Forma alternativa en que la gente nombra un producto. |
| Intención | Lo que quiere hacer el cliente (saludar, ver el catálogo, cancelar...). |
| Levenshtein | Número mínimo de cambios de letras para pasar de una palabra a otra. |
| Ambigüedad | Mensaje que coincide con varios productos y exige preguntar cuál. |
| Palabra de relleno | Palabra que no ayuda a identificar nada («quiero», «de», «por favor»). |
| Bot de reglas | Bot cuyas respuestas salen de reglas escritas por una persona, sin IA. |

```quiz
? ¿Para qué sirve normalizar un mensaje antes de analizarlo?
- Para traducirlo al inglés
+ Para compararlo de forma fiable: minúsculas, sin tildes ni signos y con espacios limpios
- Para enviarlo más rápido a Meta
- Para detectar el idioma del cliente
= Sin normalizar, «Leche», «LECHE» y «leche» serían cosas distintas para el programa.

? ¿Por qué la tolerancia a errores de tipeo se limita a palabras de 5 letras o más?
- Porque Levenshtein no funciona con palabras cortas
+ Para no confundir palabras cortas distintas, como «sal» y «sol», que están a distancia 1
- Porque el catálogo solo tiene palabras largas
- Porque WhatsApp lo exige
= Con palabras cortas un solo error cambia el significado; se prefiere preguntar antes que vender el producto equivocado.

? El cliente escribe «gaseosa» y el catálogo tiene dos gaseosas. ¿Qué debe hacer el bot?
- Elegir la primera al azar
- Rechazar el mensaje
+ Preguntar cuál quiere, recordando la cantidad si la dio
- Agregar las dos
= Cuando hay empate entre productos, se devuelve a todos los empatados y el motor ofrece una lista para elegir.

? ¿Por qué `confirmar` y `saludo` solo se detectan en mensajes de 4 palabras o menos?
- Porque son las intenciones menos importantes
+ Para que «si quiero 2 leches y un arroz» no se tome como un «sí» a secas
- Porque los mensajes largos no se pueden procesar
- Porque Meta limita los mensajes a 4 palabras
= Un mensaje largo suele traer más información que una simple confirmación o saludo.

? Un cliente escribe «hola quiero 2 leches». ¿Qué hace el motor de referencia?
- Muestra el saludo y pide que repita el pedido
+ Agrega las 2 leches de una vez, porque un mensaje con productos se prioriza sobre la intención de saludo
- Lo marca como desconocido
- Deriva al cliente a una persona
= Entre dos lecturas posibles se elige la que le ahorra más pasos al cliente.
```

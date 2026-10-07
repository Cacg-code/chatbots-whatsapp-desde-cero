---
minutos: 50
nivel: intermedio
---
## Objetivo

Escribir tu propio carrito de compras como funciones **puras e inmutables** (como `src/carrito.js`): agregar productos, cambiar cantidades, calcular el total en céntimos sin errores de decimales y armar el resumen que verá el cliente.

### Cómo se trabaja

La **parte A** se hace en tu terminal con el código de referencia y te ayuda a ver el problema de los decimales con tus propios ojos. La **parte B** son cinco funciones de JavaScript puro que se comprueban en esta página.

Una **línea** del carrito es `{ id, nombre, precio, cantidad }` (el precio en soles). Un carrito es un arreglo de líneas. Reglas:

- `agregar(carrito, producto, cantidad)`: si el producto ya está, suma la cantidad a su línea; si no, añade una línea nueva con `id`, `nombre`, `precio` y `cantidad`. La cantidad por defecto es 1. **Devuelve un carrito nuevo y no modifica el recibido.**
- `cambiarCantidad(carrito, id, cantidad)`: fija la cantidad de una línea; con 0 o menos, la línea desaparece. Devuelve un carrito nuevo.
- `total(carrito)`: suma `precio * cantidad` **en céntimos enteros** (`Math.round(precio * 100)`) y devuelve el resultado en soles.
- `formatoSoles(monto)`: devuelve el texto `"S/ 12.50"` (siempre dos decimales).
- `resumen(carrito)`: una línea por producto con el formato `- 2 x Leche entera 1 L: S/ 8.60`, y al final `Subtotal: S/ 12.80`. Con el carrito vacío devuelve `Tu carrito está vacío.`

```pasos
Parte A. En `codigo/` ejecuta `node -e "console.log(0.1 + 0.2, 4.3 * 3)"` y anota en `notas.md` por qué un total calculado con decimales puede imprimir `12.899999999999999`.
Parte A. Escribe un script `probar-carrito.mjs` que importe `agregar`, `total` y `resumen` de `src/carrito.js` y `productoPorId` de `src/catalogo.js`; arma un carrito con 3 leches y 2 arroces y comprueba que `total` da `21.3` (12.90 + 8.40) y revisa cómo se ve `resumen`.
Parte B. Escribe `formatoSoles(monto)`.
Parte B. Escribe `agregar(carrito, producto, cantidad = 1)` sin modificar el carrito recibido.
Parte B. Escribe `cambiarCantidad(carrito, id, cantidad)` (con cantidad 0 o menos, quita la línea).
Parte B. Escribe `total(carrito)` calculando en céntimos.
Parte B. Escribe `resumen(carrito)` con el formato indicado.
```

```pista Inmutable significa copiar
Para agregar una línea nueva usa `[...carrito, nueva]`. Para cambiar una línea existente usa `carrito.map(...)` y devuelve `{ ...linea, cantidad: ... }` solo en la que coincide. Nunca hagas `carrito.push(...)` ni `linea.cantidad += ...`.
```

```pista Céntimos enteros
`Math.round(4.3 * 100)` da `430`: un entero seguro. Suma todos los `centimos * cantidad` y divide entre 100 solo al final. Así `0.1 + 0.2` termina siendo `0.3`.
```

```pista toFixed
`(12.5).toFixed(2)` devuelve `"12.50"`. El subtotal de cada línea también debe salir de céntimos: `Math.round(precio * 100) * cantidad / 100`.
```

```checks
[
 {"d": "`formatoSoles` siempre muestra dos decimales", "h": "Usa `monto.toFixed(2)` con el prefijo `S/ `.", "t": "return formatoSoles(12.5)==='S/ 12.50' && formatoSoles(4)==='S/ 4.00' && formatoSoles(0.3)==='S/ 0.30'"},
 {"d": "`agregar` crea una línea nueva con id, nombre, precio y cantidad", "h": "La línea es { id, nombre, precio, cantidad }; la cantidad por defecto es 1.", "t": "var l={id:'leche',nombre:'Leche entera 1 L',precio:4.3,categoria:'lacteos'};var c=agregar([],l,2);var d=agregar([],l);return c.length===1 && c[0].id==='leche' && c[0].nombre==='Leche entera 1 L' && c[0].precio===4.3 && c[0].cantidad===2 && d[0].cantidad===1 && c[0].categoria===undefined"},
 {"d": "`agregar` suma a la línea existente en lugar de duplicarla", "h": "Si el id ya está en el carrito, usa `map` para sumar la cantidad.", "t": "var l={id:'leche',nombre:'Leche',precio:4.3};var a={id:'arroz',nombre:'Arroz',precio:4.2};var c=agregar(agregar(agregar([],l,2),a,1),l,1);return c.length===2 && c[0].id==='leche' && c[0].cantidad===3 && c[1].cantidad===1"},
 {"d": "`agregar` no modifica el carrito recibido", "h": "Devuelve un arreglo nuevo y objetos de línea nuevos; congelado no debe fallar ni cambiar.", "t": "var l={id:'leche',nombre:'Leche',precio:4.3};var c0=Object.freeze([Object.freeze({id:'leche',nombre:'Leche',precio:4.3,cantidad:2})]);var c1=agregar(c0,l,3);return c0[0].cantidad===2 && c1[0].cantidad===5 && c1!==c0 && c0.length===1"},
 {"d": "`cambiarCantidad` fija la cantidad y con 0 elimina la línea", "h": "Si `cantidad <= 0` filtra la línea; si no, `map` con la cantidad nueva.", "t": "var c=[{id:'a',nombre:'A',precio:1,cantidad:2},{id:'b',nombre:'B',precio:2,cantidad:1}];var x=cambiarCantidad(c,'a',5);var y=cambiarCantidad(c,'a',0);return x[0].cantidad===5 && x.length===2 && y.length===1 && y[0].id==='b' && c[0].cantidad===2"},
 {"d": "`total` suma en céntimos y evita errores de decimales", "h": "Suma `Math.round(precio * 100) * cantidad` y divide entre 100 al final.", "t": "var a=[{id:'a',nombre:'A',precio:0.1,cantidad:1},{id:'b',nombre:'B',precio:0.2,cantidad:1}];var b=[{id:'l',nombre:'L',precio:4.3,cantidad:3}];return total(a)===0.3 && total(b)===12.9 && total([])===0"},
 {"d": "`resumen` arma las líneas y el subtotal", "h": "Formato de cada línea: `- 2 x Nombre: S/ 8.60`; al final `Subtotal: S/ 12.80`.", "t": "var c=[{id:'leche',nombre:'Leche entera 1 L',precio:4.3,cantidad:2},{id:'arroz',nombre:'Arroz extra 1 kg',precio:4.2,cantidad:1}];return resumen(c)==='- 2 x Leche entera 1 L: S/ 8.60\\n- 1 x Arroz extra 1 kg: S/ 4.20\\nSubtotal: S/ 12.80'"},
 {"d": "`resumen` con el carrito vacío avisa que está vacío", "h": "Devuelve el texto `Tu carrito está vacío.`", "t": "return resumen([])==='Tu carrito está vacío.'"}
]
```

```solucion carrito.js
const aCentimos = (soles) => Math.round(soles * 100);

function formatoSoles(monto) {
  return `S/ ${monto.toFixed(2)}`;
}

function agregar(carrito, producto, cantidad = 1) {
  if (carrito.some((l) => l.id === producto.id)) {
    return carrito.map((l) =>
      l.id === producto.id ? { ...l, cantidad: l.cantidad + cantidad } : l,
    );
  }
  return [...carrito, { id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad }];
}

function cambiarCantidad(carrito, id, cantidad) {
  if (cantidad <= 0) return carrito.filter((l) => l.id !== id);
  return carrito.map((l) => (l.id === id ? { ...l, cantidad } : l));
}

function total(carrito) {
  const centimos = carrito.reduce((suma, l) => suma + aCentimos(l.precio) * l.cantidad, 0);
  return centimos / 100;
}

function resumen(carrito) {
  if (carrito.length === 0) return "Tu carrito está vacío.";
  const lineas = carrito.map((l) => {
    const subtotal = (aCentimos(l.precio) * l.cantidad) / 100;
    return `- ${l.cantidad} x ${l.nombre}: ${formatoSoles(subtotal)}`;
  });
  return `${lineas.join("\n")}\nSubtotal: ${formatoSoles(total(carrito))}`;
}
```

> [!consejo] Reto extra
> Añade `faltaParaDelivery(carrito, minimo)` que devuelva cuántos soles faltan para llegar al mínimo de delivery (0 si ya lo alcanzó), calculado en céntimos. Con el mínimo de S/ 25.00 y un carrito de S/ 21.30 debe dar `3.7`. Es la cuenta que usa el bot en el mensaje «Te faltan S/ 3.70» ([lección 8](../08-flujo-de-pedido/)).

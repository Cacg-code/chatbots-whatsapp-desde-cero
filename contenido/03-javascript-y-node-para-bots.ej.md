---
minutos: 45
nivel: básico
---
## Objetivo

Practicar con `map`, `filter`, `find` y `reduce` sobre el catálogo del minimarket y escribir las funciones de dinero y de carrito que el bot usará en todas las lecciones siguientes.

### Cómo se trabaja

La **parte A** es práctica real en tu terminal: dejas Node funcionando con un proyecto y una prueba. La **parte B** son cuatro funciones puras que se comprueban en esta página. Un producto del catálogo tiene la forma `{ id, nombre, precio, categoria }` y una línea de carrito es `{ id, cantidad }`.

```pasos
Parte A. Crea una carpeta `practica`, entra en ella y ejecuta `npm init -y`. Añade `"type": "module"` al `package.json` y comprueba con `node -v` que tienes Node 20 o superior.
Parte A. Crea `util.js` con una función exportada y `util.test.js` con una prueba de `node:test`. Ejecuta `node --test`: debe salir en verde. Cambia el valor esperado a propósito y observa cómo se ve un fallo.
Parte B. Escribe `formatearSoles(n)`: devuelve el monto con el prefijo `S/ ` y dos decimales, por ejemplo `formatearSoles(2.5)` da `"S/ 2.50"`.
Parte B. Escribe `buscarProducto(catalogo, texto)`: devuelve el primer producto cuyo nombre contenga el texto, sin distinguir mayúsculas; si no hay ninguno, devuelve `null` (no `undefined`).
Parte B. Escribe `totalCarrito(catalogo, carrito)`: suma `precio * cantidad` de cada línea con `reduce`. Si una línea apunta a un id que no existe en el catálogo, se ignora. Redondea el total a 2 decimales.
Parte B. Escribe `agruparPorCategoria(productos)`: devuelve un objeto donde cada clave es una categoría y su valor es el array de **nombres** de los productos de esa categoría, en el orden original.
```

```pista Dos decimales
`n.toFixed(2)` devuelve un texto con dos decimales. Para el total, `Math.round(suma * 100) / 100` evita colas como `0.30000000000000004`.
```

```pista Buscar sin distinguir mayúsculas
Pasa ambos textos a minúsculas con `toLowerCase()` y usa `includes`. `find` devuelve `undefined` si no hay coincidencia: conviértelo con `?? null`.
```

```pista reduce con valor inicial
`carrito.reduce((suma, linea) => { ... return suma + algo; }, 0)`. Dentro, busca el producto con `find`; si no existe, devuelve `suma` sin cambios.
```

```pista Agrupar
Empieza con `const grupos = {}`. Por cada producto: `if (!grupos[p.categoria]) grupos[p.categoria] = [];` y luego `grupos[p.categoria].push(p.nombre)`. También sirve `reduce`.
```

```checks
[
 {"d": "`formatearSoles` pone el prefijo y dos decimales", "h": "Une el prefijo `S/ ` con `n.toFixed(2)`.", "t": "return typeof formatearSoles==='function' && formatearSoles(2.5)==='S/ 2.50' && formatearSoles(10)==='S/ 10.00' && formatearSoles(0)==='S/ 0.00'"},
 {"d": "`formatearSoles` redondea a dos decimales", "h": "`toFixed(2)` redondea; no cortes el texto a mano.", "t": "return formatearSoles(3.456)==='S/ 3.46' && formatearSoles(0.3)==='S/ 0.30'"},
 {"d": "`buscarProducto` encuentra por parte del nombre sin importar mayúsculas", "h": "Pasa a minúsculas ambos lados y usa `includes`.", "t": "var c=[{id:1,nombre:'Gaseosa 500 ml',precio:2.5,categoria:'bebidas'},{id:2,nombre:'Pan francés',precio:0.3,categoria:'panadería'}];var p=buscarProducto(c,'PAN');return p!==null && p.id===2 && buscarProducto(c,'gaseosa').id===1"},
 {"d": "`buscarProducto` devuelve `null` si no existe", "h": "`find` devuelve `undefined`; usa `?? null`.", "t": "var c=[{id:1,nombre:'Arroz',precio:4,categoria:'abarrotes'}];return buscarProducto(c,'pizza')===null"},
 {"d": "`totalCarrito` suma precio por cantidad", "h": "Usa `reduce` con valor inicial 0.", "t": "var c=[{id:1,nombre:'Gaseosa',precio:2.5,categoria:'bebidas'},{id:2,nombre:'Pan',precio:0.3,categoria:'panadería'}];return totalCarrito(c,[{id:1,cantidad:2},{id:2,cantidad:10}])===8"},
 {"d": "`totalCarrito` evita errores de decimales y devuelve 0 con carrito vacío", "h": "Redondea con `Math.round(x * 100) / 100`.", "t": "var c=[{id:1,nombre:'A',precio:0.1,categoria:'x'},{id:2,nombre:'B',precio:0.2,categoria:'x'}];return totalCarrito(c,[{id:1,cantidad:1},{id:2,cantidad:1}])===0.3 && totalCarrito(c,[])===0"},
 {"d": "`totalCarrito` ignora ids que no existen", "h": "Si `find` no halla el producto, no sumes nada.", "t": "var c=[{id:1,nombre:'A',precio:5,categoria:'x'}];return totalCarrito(c,[{id:1,cantidad:2},{id:99,cantidad:3}])===10"},
 {"d": "`agruparPorCategoria` agrupa nombres por categoría en orden", "h": "Crea el array de la categoría la primera vez que la veas y haz `push` del nombre.", "t": "var ps=[{id:1,nombre:'Gaseosa',precio:2.5,categoria:'bebidas'},{id:2,nombre:'Pan',precio:0.3,categoria:'panadería'},{id:3,nombre:'Agua',precio:1.5,categoria:'bebidas'}];var g=agruparPorCategoria(ps);return JSON.stringify(g)===JSON.stringify({bebidas:['Gaseosa','Agua'],'panadería':['Pan']}) && JSON.stringify(agruparPorCategoria([]))==='{}'"}
]
```

```solucion funciones.js
function formatearSoles(n) {
  return "S/ " + n.toFixed(2);
}

function buscarProducto(catalogo, texto) {
  const buscado = String(texto).toLowerCase();
  return catalogo.find((p) => p.nombre.toLowerCase().includes(buscado)) ?? null;
}

function totalCarrito(catalogo, carrito) {
  const suma = carrito.reduce((acc, linea) => {
    const p = catalogo.find((x) => x.id === linea.id);
    if (!p) return acc;
    return acc + p.precio * linea.cantidad;
  }, 0);
  return Math.round(suma * 100) / 100;
}

function agruparPorCategoria(productos) {
  const grupos = {};
  for (const p of productos) {
    if (!grupos[p.categoria]) grupos[p.categoria] = [];
    grupos[p.categoria].push(p.nombre);
  }
  return grupos;
}
```

> [!consejo] Reto extra
> Escribe `productosBaratos(catalogo, tope)` que devuelva los nombres de los productos con precio menor o igual al tope, ordenados del más barato al más caro (usa `filter`, `sort` y `map`; recuerda copiar el array antes de ordenar con `[...arr]`).

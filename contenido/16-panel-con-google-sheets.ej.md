---
minutos: 50
nivel: intermedio
---
## Objetivo

Convertir un pedido del bot en una fila de hoja de cálculo, proteger la entrada con un secreto compartido y calcular los números que el dueño quiere ver en su panel. Todo se comprueba con funciones puras.

### Cómo se trabaja

La **parte A** es práctica real con tu cuenta de Google (usa una hoja de prueba, nunca la de un cliente real). La **parte B** son funciones de JavaScript puro que se comprueban en esta página. Un pedido tiene la forma `{ id, telefono, items: [{ nombre, cantidad, precio }], total, entrega, direccion, pago, estado, creadoEn }`, con `creadoEn` en milisegundos.

```pasos
Parte A. Crea una hoja de Google llamada `Minimarket La Esquina - Pedidos` con una pestaña `Pedidos` y estos encabezados en la fila 1: Fecha, Pedido, Telefono, Productos, Total, Entrega, Direccion, Pago, Estado.
Parte A. Abre **Extensiones > Apps Script**, pega el `doPost` de la lección, guarda el secreto en **Configuración del proyecto > Propiedades del script** y crea una implementación como **Aplicación web**. Copia la URL que termina en `/exec`.
Parte A. Desde tu terminal haz un `curl -L` con un pedido de prueba y comprueba que aparece una fila nueva. Repite con un secreto equivocado y anota qué respuesta recibes.
Parte B. Escribe `pedidoAFila(pedido)`: devuelve un arreglo de 9 valores en el orden de los encabezados. La fecha va en formato ISO (`new Date(ms).toISOString()`), los productos como `"2 x Leche entera 1 L; 1 x Arroz extra 1 kg"` y la dirección vacía (`""`) si es `null`.
Parte B. Escribe `autorizado(cuerpo, secreto)`: recibe el cuerpo crudo (texto JSON) y devuelve `true` solo si el JSON es válido, trae `secreto` y coincide exactamente. Si el JSON es inválido o el secreto esperado está vacío, devuelve `false` sin lanzar errores.
Parte B. Escribe `resumenDelDia(filas, dia)`: `filas` son los arreglos de `pedidoAFila`; `dia` es un texto `"2026-10-07"`. Devuelve `{ pedidos, total }` contando solo las filas cuya fecha empieza con ese día y que no estén `cancelado`. El total se redondea a 2 decimales.
Parte B. Escribe `porEstado(filas)`: devuelve un objeto con cuántos pedidos hay por estado, por ejemplo `{ recibido: 2, entregado: 1 }`.
```

```pista Orden de columnas
Fecha, Pedido, Telefono, Productos, Total, Entrega, Direccion, Pago, Estado: la fila es un arreglo con esos nueve valores en ese orden. `items.map(...).join("; ")` arma la columna de productos.
```

```pista Comparar el secreto sin romperse
Envuelve `JSON.parse` en `try/catch`. Después comprueba `typeof datos.secreto === "string"` y compara con `===`. Recuerda devolver `false` si el secreto esperado es una cadena vacía.
```

```pista Sumar sin errores de decimales
Suma en céntimos: `Math.round(total * 100)` por fila, y divide entre 100 al final. Así `0.1 + 0.2` no te da `0.30000000000000004`.
```

```checks
[
 {"d": "`pedidoAFila` devuelve 9 columnas en el orden correcto", "h": "Fecha ISO, id, teléfono, productos, total, entrega, dirección, pago, estado.", "t": "var p={id:\"LE-1\",telefono:\"51999000111\",items:[{nombre:\"Leche entera 1 L\",cantidad:2,precio:4.3}],total:8.6,entrega:\"recojo\",direccion:null,pago:\"efectivo\",estado:\"recibido\",creadoEn:Date.UTC(2026,9,7,15,0,25)};var f=pedidoAFila(p);return f.length===9 && f[0]===\"2026-10-07T15:00:25.000Z\" && f[1]===\"LE-1\" && f[2]===\"51999000111\" && f[4]===8.6 && f[8]===\"recibido\""},
 {"d": "`pedidoAFila` une los productos con punto y coma", "h": "Usa `${cantidad} x ${nombre}` y `join(\"; \")`.", "t": "var p={id:\"A\",telefono:\"1\",items:[{nombre:\"Leche\",cantidad:2},{nombre:\"Arroz\",cantidad:1}],total:1,entrega:\"recojo\",direccion:null,pago:\"yape\",estado:\"recibido\",creadoEn:0};return pedidoAFila(p)[3]===\"2 x Leche; 1 x Arroz\""},
 {"d": "`pedidoAFila` deja la dirección vacía si es `null` y la copia si existe", "h": "Usa `pedido.direccion ?? \"\"`.", "t": "var b={id:\"A\",telefono:\"1\",items:[],total:0,entrega:\"delivery\",pago:\"yape\",estado:\"recibido\",creadoEn:0};return pedidoAFila(Object.assign({},b,{direccion:null}))[6]===\"\" && pedidoAFila(Object.assign({},b,{direccion:\"Jr. Los Pinos 123\"}))[6]===\"Jr. Los Pinos 123\""},
 {"d": "`autorizado` acepta el secreto correcto", "h": "Parsea el JSON y compara `datos.secreto` con el esperado.", "t": "return autorizado(JSON.stringify({secreto:\"abc123\",accion:\"x\"}),\"abc123\")===true"},
 {"d": "`autorizado` rechaza secreto equivocado, ausente o JSON inválido", "h": "Usa try/catch alrededor de JSON.parse y devuelve false.", "t": "return autorizado(JSON.stringify({secreto:\"mal\"}),\"abc123\")===false && autorizado(JSON.stringify({accion:\"x\"}),\"abc123\")===false && autorizado(\"esto no es json\",\"abc123\")===false"},
 {"d": "`autorizado` rechaza si el secreto esperado está vacío", "h": "Un secreto vacío no protege nada: devuelve false aunque coincida.", "t": "return autorizado(JSON.stringify({secreto:\"\"}),\"\")===false && autorizado(\"{}\",\"\")===false"},
 {"d": "`resumenDelDia` cuenta y suma solo ese día, sin cancelados", "h": "Filtra con `fila[0].startsWith(dia)` y `fila[8] !== \"cancelado\"`; el total es la columna 4.", "t": "var f=[[\"2026-10-07T10:00:00.000Z\",\"A\",\"1\",\"x\",0.1,\"recojo\",\"\",\"yape\",\"recibido\"],[\"2026-10-07T11:00:00.000Z\",\"B\",\"1\",\"x\",0.2,\"recojo\",\"\",\"yape\",\"entregado\"],[\"2026-10-07T12:00:00.000Z\",\"C\",\"1\",\"x\",50,\"recojo\",\"\",\"yape\",\"cancelado\"],[\"2026-10-06T12:00:00.000Z\",\"D\",\"1\",\"x\",9,\"recojo\",\"\",\"yape\",\"recibido\"]];var r=resumenDelDia(f,\"2026-10-07\");return r.pedidos===2 && r.total===0.3"},
 {"d": "`porEstado` cuenta pedidos por estado", "h": "Recorre las filas y suma 1 en `conteo[fila[8]]`.", "t": "var f=[[0,0,0,0,0,0,0,0,\"recibido\"],[0,0,0,0,0,0,0,0,\"recibido\"],[0,0,0,0,0,0,0,0,\"entregado\"]];var r=porEstado(f);return r.recibido===2 && r.entregado===1 && Object.keys(porEstado([])).length===0"}
]
```

```solucion funciones.js
function pedidoAFila(p) {
  return [
    new Date(p.creadoEn).toISOString(),
    p.id,
    p.telefono,
    p.items.map((i) => `${i.cantidad} x ${i.nombre}`).join("; "),
    p.total,
    p.entrega,
    p.direccion ?? "",
    p.pago,
    p.estado,
  ];
}

function autorizado(cuerpo, secreto) {
  if (!secreto) return false;
  let datos;
  try { datos = JSON.parse(cuerpo); } catch { return false; }
  return typeof datos?.secreto === "string" && datos.secreto === secreto;
}

function resumenDelDia(filas, dia) {
  let pedidos = 0;
  let centimos = 0;
  for (const fila of filas) {
    if (!String(fila[0]).startsWith(dia) || fila[8] === "cancelado") continue;
    pedidos++;
    centimos += Math.round(fila[4] * 100);
  }
  return { pedidos, total: centimos / 100 };
}

function porEstado(filas) {
  const conteo = {};
  for (const fila of filas) conteo[fila[8]] = (conteo[fila[8]] ?? 0) + 1;
  return conteo;
}
```

> [!consejo] Reto extra
> Añade `topProductos(filas, n)` que lea la columna de productos (`"2 x Leche; 1 x Arroz"`), sume cantidades por producto entre todas las filas y devuelva los `n` más vendidos. Es el primer gráfico que le gustaría ver al dueño.

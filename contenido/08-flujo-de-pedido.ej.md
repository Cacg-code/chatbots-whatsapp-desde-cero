---
minutos: 55
nivel: intermedio
---
## Objetivo

Escribir las cuatro reglas de negocio que cierran un pedido en el minimarket: cuánto falta para el delivery, si una dirección es aceptable, el total con delivery y el objeto del pedido que se guarda al confirmar. Son funciones puras, iguales en espíritu a las de `src/motor.js`.

### Cómo se trabaja

La **parte A** se hace en tu terminal con el simulador; la **parte B** son cuatro funciones de JavaScript puro que se comprueban en esta página. Reglas:

- `faltaParaDelivery(subtotal)`: el mínimo de delivery es S/ 25. Devuelve cuántos soles faltan (0 si ya lo alcanzó), calculado en céntimos para no arrastrar decimales: con 21.3 da `3.7`.
- `direccionValida(texto)`: es válida si, tras quitar espacios de los extremos, tiene 8 caracteres o más. Si no recibe un texto, es inválida.
- `totalPedido(items, entrega)`: suma `precio * cantidad` de las líneas en céntimos y, si `entrega` es `"delivery"`, añade S/ 3. Devuelve soles. Con `"recojo"` no añade nada.
- `crearPedido(sesion, ahora)`: devuelve `{ id, telefono, items, total, entrega, direccion, pago, estado, creadoEn }`. El `id` es `LE-` más `ahora.toString(36).toUpperCase().slice(-6)`; `items` es una **copia** de `sesion.carrito`; `total` sale de `totalPedido`; `estado` es `"recibido"`; `creadoEn` es `ahora`. `sesion` tiene `telefono`, `carrito`, `entrega`, `direccion` y `pago`.

```pasos
Parte A. En `codigo/` ejecuta `printf 'hola\n2 leches\nlisto\nrecojo\nefectivo\nconfirmar\n' | node consola.js` (en PowerShell, escribe esas líneas a mano después de `node consola.js`). Anota en `notas.md` el id del pedido y el texto de despedida.
Parte A. Repite pidiendo delivery con solo 1 arroz y observa el mensaje del mínimo. Luego agrega más productos, escribe una dirección de 4 letras y comprueba qué responde el bot.
Parte B. Escribe `faltaParaDelivery(subtotal)` en céntimos.
Parte B. Escribe `direccionValida(texto)`.
Parte B. Escribe `totalPedido(items, entrega)` sumando en céntimos.
Parte B. Escribe `crearPedido(sesion, ahora)` sin modificar la sesión recibida.
```

```pista Soles con decimales
`25 - 21.3` da `3.6999999999999993`. Pasa ambos a céntimos con `Math.round(x * 100)`, resta, y divide entre 100 al final. Si el resultado es negativo, devuelve 0.
```

```pista Direcciones
Comprueba primero `typeof texto === "string"` y luego `texto.trim().length >= 8`.
```

```pista Id del pedido
`(1791385230000).toString(36)` convierte el número a base 36; `.toUpperCase().slice(-6)` deja las últimas seis letras o cifras en mayúscula. Antepón `LE-`.
```

```checks
[
 {"d": "`faltaParaDelivery` devuelve lo que falta, sin errores de decimales", "h": "Resta en céntimos: Math.round(25*100) - Math.round(subtotal*100), y divide entre 100.", "t": "return faltaParaDelivery(21.3)===3.7 && faltaParaDelivery(10)===15 && faltaParaDelivery(0)===25"},
 {"d": "`faltaParaDelivery` devuelve 0 si ya se alcanzó el mínimo", "h": "Si el resultado es 0 o negativo, devuelve 0.", "t": "return faltaParaDelivery(25)===0 && faltaParaDelivery(40.3)===0"},
 {"d": "`direccionValida` exige al menos 8 caracteres útiles", "h": "Usa trim() antes de medir la longitud.", "t": "return direccionValida('Av. Los Pinos 456')===true && direccionValida('Av 1')===false && direccionValida('   Av 1    ')===false && direccionValida('12345678')===true"},
 {"d": "`direccionValida` rechaza lo que no es texto", "h": "Comprueba typeof texto === 'string'.", "t": "return direccionValida(null)===false && direccionValida(undefined)===false && direccionValida(12345678)===false && direccionValida('')===false"},
 {"d": "`totalPedido` suma en céntimos y no cobra delivery en recojo", "h": "Suma Math.round(precio*100)*cantidad y divide entre 100.", "t": "var it=[{id:'l',nombre:'L',precio:4.3,cantidad:3},{id:'a',nombre:'A',precio:4.2,cantidad:2}];return totalPedido(it,'recojo')===21.3 && totalPedido([],'recojo')===0"},
 {"d": "`totalPedido` suma S/ 3 de delivery", "h": "Si entrega es 'delivery', añade 300 céntimos antes de dividir.", "t": "var it=[{id:'l',nombre:'L',precio:4.3,cantidad:3},{id:'a',nombre:'A',precio:4.2,cantidad:2}];return totalPedido(it,'delivery')===24.3 && totalPedido([{id:'x',nombre:'X',precio:0.1,cantidad:3}],'delivery')===3.3"},
 {"d": "`crearPedido` arma el objeto con id, estado y fecha", "h": "El id es 'LE-' + ahora.toString(36).toUpperCase().slice(-6); el estado es 'recibido'.", "t": "var s={telefono:'51999000111',carrito:[{id:'leche',nombre:'Leche',precio:4.3,cantidad:2}],entrega:'recojo',direccion:null,pago:'efectivo'};var p=crearPedido(s,1791385230000);return p.id==='LE-'+(1791385230000).toString(36).toUpperCase().slice(-6) && /^LE-[0-9A-Z]{6}$/.test(p.id) && p.telefono==='51999000111' && p.total===8.6 && p.entrega==='recojo' && p.pago==='efectivo' && p.estado==='recibido' && p.creadoEn===1791385230000"},
 {"d": "`crearPedido` incluye el delivery, copia los items y no modifica la sesión", "h": "Copia con `sesion.carrito.map(l => ({...l}))` y calcula el total con totalPedido.", "t": "var s={telefono:'51999000111',carrito:[{id:'a',nombre:'A',precio:20,cantidad:2}],entrega:'delivery',direccion:'Av. Los Pinos 456',pago:'yape'};var antes=JSON.stringify(s);var p=crearPedido(s,1000);p.items[0].cantidad=99;return p.total===43 && p.direccion==='Av. Los Pinos 456' && p.items!==s.carrito && s.carrito[0].cantidad===2 && JSON.stringify(s)!==antes===false"}
]
```

```solucion pedido.js
const MINIMO_DELIVERY = 25;
const COSTO_DELIVERY = 3;
const aCentimos = (soles) => Math.round(soles * 100);

function faltaParaDelivery(subtotal) {
  const falta = aCentimos(MINIMO_DELIVERY) - aCentimos(subtotal);
  return falta > 0 ? falta / 100 : 0;
}

function direccionValida(texto) {
  return typeof texto === "string" && texto.trim().length >= 8;
}

function totalPedido(items, entrega) {
  let centimos = items.reduce((suma, l) => suma + aCentimos(l.precio) * l.cantidad, 0);
  if (entrega === "delivery") centimos += aCentimos(COSTO_DELIVERY);
  return centimos / 100;
}

function crearPedido(sesion, ahora) {
  const items = sesion.carrito.map((l) => ({ ...l }));
  return {
    id: "LE-" + ahora.toString(36).toUpperCase().slice(-6),
    telefono: sesion.telefono,
    items,
    total: totalPedido(items, sesion.entrega),
    entrega: sesion.entrega,
    direccion: sesion.direccion,
    pago: sesion.pago,
    estado: "recibido",
    creadoEn: ahora,
  };
}
```

> [!consejo] Reto extra
> Añade `direccionValida` con una segunda regla: que la dirección contenga al menos un dígito (un número de calle o de casa). Piensa qué casos reales dejaría fuera («Frente al mercado») y por qué el bot de referencia prefiere una regla más simple y deja que el repartidor confirme por teléfono.

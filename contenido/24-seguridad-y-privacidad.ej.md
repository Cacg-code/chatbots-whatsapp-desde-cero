---
minutos: 50
nivel: avanzado
---
## Objetivo

Escribir las cuatro funciones de defensa básicas del bot: enmascarar teléfonos, limpiar entradas, limitar la tasa de mensajes y decidir cuándo borrar un registro.

### Cómo se trabaja

La **parte A** revisa tu propio proyecto con la lista de seguridad. La **parte B** son funciones de JavaScript puro. Las horas son números en milisegundos (`Date.now()`). Los teléfonos de ejemplo son falsos.

```pasos
Parte A. En tu proyecto, comprueba con `git check-ignore -v .dev.vars` que git ignora tus secretos y busca en el historial con `git log -p -S"token"` que nunca subiste uno. Apunta el resultado en `notas.md`.
Parte A. Redacta en `notas.md` la política de privacidad de La Esquina en 7 puntos (responsable, datos, finalidad, destinatarios, conservación, derechos, consentimiento). Recuerda que no es asesoría legal.
Parte B. Escribe `enmascararTelefono(tel)`: deja solo dígitos, conserva los 2 primeros y los 3 últimos y sustituye el resto por `*`. Si tiene 5 dígitos o menos, devuelve todo con `*`. Con `null` devuelve `""`.
Parte B. Escribe `limpiarEntrada(texto, max = 500)`: si no es texto devuelve `""`; elimina caracteres de ancho cero, convierte caracteres de control (incluidos saltos de línea y tabuladores) en espacios, colapsa espacios, recorta los extremos y corta a `max` caracteres.
Parte B. Escribe `limitarTasa(registro, clave, ahora, max, ventanaMs)`: ventana deslizante. `registro` es un objeto `{ clave: [horas...] }` que la función actualiza. Devuelve `true` y registra la hora si hay menos de `max` peticiones dentro de la ventana; si no, `false`. Una petición cuenta mientras `ahora - hora < ventanaMs`.
Parte B. Escribe `debeBorrarse(registro, ahora, diasRetencion)`: `true` si `registro.solicitudBorrado` es verdadero o si pasaron `diasRetencion` días o más desde `registro.creado`.
```

```pista Enmascarar
`String(tel ?? "").replace(/\D/g, "")` deja solo dígitos. Con `d.slice(0, 2) + "*".repeat(d.length - 5) + d.slice(-3)` conservas los extremos.
```

```pista Limpiar
Encadena `replace`: primero `/[​-‍﻿]/g` por `""`, luego `/[\u0000-\u001F\u007F]/g` por `" "`, luego `/\s+/g` por `" "`; después `trim()` y `slice(0, max)`.
```

```pista Ventana deslizante
Filtra `registro[clave] ?? []` dejando las horas con `ahora - t < ventanaMs`. Si quedan `max` o más, devuelve `false`; si no, añade `ahora`, guarda la lista y devuelve `true`.
```

```checks
[
 {"d": "`enmascararTelefono` conserva 2 primeros y 3 últimos dígitos", "h": "Usa slice(0,2), repeat de asteriscos y slice(-3).", "t": "return enmascararTelefono('51999000111')==='51******111'"},
 {"d": "`enmascararTelefono` ignora símbolos y maneja números cortos o nulos", "h": "Quita lo que no sea dígito con /\\D/g; 5 dígitos o menos se enmascaran por completo.", "t": "return enmascararTelefono('+51 999 000 111')==='51******111' && enmascararTelefono('12345')==='*****' && enmascararTelefono(null)===''"},
 {"d": "`limpiarEntrada` colapsa espacios y saltos de línea", "h": "Reemplaza los caracteres de control por espacios y colapsa con /\\s+/.", "t": "return limpiarEntrada('  hola\\n\\n\\tquiero    pan  ')==='hola quiero pan'"},
 {"d": "`limpiarEntrada` quita caracteres de control y de ancho cero", "h": "Elimina \\u200B-\\u200D y \\uFEFF; los control (\\u0000-\\u001F) pasan a espacio.", "t": "return limpiarEntrada('ho\\u200Bla\\u0000mundo')==='hola mundo'"},
 {"d": "`limpiarEntrada` corta al máximo y rechaza lo que no es texto", "h": "Usa slice(0, max) al final y devuelve '' si typeof no es string.", "t": "return limpiarEntrada('a'.repeat(1000))===('a'.repeat(500)) && limpiarEntrada('abcdef',3)==='abc' && limpiarEntrada(null)==='' && limpiarEntrada(42)===''"},
 {"d": "`limitarTasa` permite hasta `max` peticiones y bloquea la siguiente", "h": "Si ya hay `max` horas vivas, devuelve false sin registrar la nueva.", "t": "var r={};return limitarTasa(r,'a',0,3,60000)===true && limitarTasa(r,'a',1000,3,60000)===true && limitarTasa(r,'a',2000,3,60000)===true && limitarTasa(r,'a',3000,3,60000)===false"},
 {"d": "`limitarTasa` vuelve a permitir cuando la ventana se desliza", "h": "Descarta horas con `ahora - t >= ventanaMs`. Una petición bloqueada no cuenta como registrada.", "t": "var r={};[0,1000,2000].forEach(function(t){limitarTasa(r,'a',t,3,60000)});limitarTasa(r,'a',3000,3,60000);return limitarTasa(r,'a',60000,3,60000)===true && limitarTasa(r,'a',61000,3,60000)===true"},
 {"d": "`limitarTasa` lleva la cuenta por cliente", "h": "Usa `registro[clave]` para separar a cada cliente.", "t": "var r={};limitarTasa(r,'a',0,1,60000);return limitarTasa(r,'a',1,1,60000)===false && limitarTasa(r,'b',1,1,60000)===true"},
 {"d": "`debeBorrarse` aplica la retención por días", "h": "Compara `ahora - creado` con `diasRetencion * 24 * 60 * 60 * 1000` usando `>=`.", "t": "var D=86400000;return debeBorrarse({creado:0},91*D,90)===true && debeBorrarse({creado:0},90*D,90)===true && debeBorrarse({creado:0},10*D,90)===false"},
 {"d": "`debeBorrarse` obedece una solicitud de borrado", "h": "Si `solicitudBorrado` es true, devuelve true sin mirar la fecha.", "t": "var D=86400000;return debeBorrarse({creado:0,solicitudBorrado:true},D,90)===true && debeBorrarse({creado:0,solicitudBorrado:false},D,90)===false"}
]
```

```solucion seguridad.js
function enmascararTelefono(tel) {
  const d = String(tel ?? "").replace(/\D/g, "");
  if (d.length <= 5) return "*".repeat(d.length);
  return d.slice(0, 2) + "*".repeat(d.length - 5) + d.slice(-3);
}

function limpiarEntrada(texto, max = 500) {
  if (typeof texto !== "string") return "";
  return texto
    .replace(/[​-‍﻿]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function limitarTasa(registro, clave, ahora, max, ventanaMs) {
  const vivos = (registro[clave] ?? []).filter(t => ahora - t < ventanaMs);
  if (vivos.length >= max) {
    registro[clave] = vivos;
    return false;
  }
  vivos.push(ahora);
  registro[clave] = vivos;
  return true;
}

function debeBorrarse(registro, ahora, diasRetencion) {
  if (registro.solicitudBorrado) return true;
  return ahora - registro.creado >= diasRetencion * 24 * 60 * 60 * 1000;
}
```

> [!consejo] Reto extra
> Escribe `anonimizar(pedido)`, que devuelva una copia del pedido con el teléfono enmascarado y sin dirección ni nombre, pero conservando productos y total. Es la forma de mantener estadísticas del negocio sin conservar datos personales.

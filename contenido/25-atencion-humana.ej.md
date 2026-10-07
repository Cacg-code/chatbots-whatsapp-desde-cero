---
minutos: 45
nivel: intermedio
---
## Objetivo

Construir las cuatro decisiones de un traspaso a una persona: saber si el negocio está abierto, avisar solo cuando corresponde, redactar el aviso al dueño y decidir cuándo el bot debe retomar la conversación.

### Cómo se trabaja

La **parte A** es práctica real en tu terminal con el código de referencia. La **parte B** son funciones de JavaScript puro que se comprueban en esta página. Todas las horas son milisegundos (`Date.UTC(...)`) y Lima está en UTC-5 durante todo el año. Recuerda que en `Date.UTC` los meses empiezan en 0 (octubre es `9`) y que el domingo es el día `0`.

```pasos
Parte A. En `codigo/` ejecuta `printf 'hola\n2 leches\nquiero hablar con una persona\nhola?\nmenu\n' | node consola.js` (en Windows usa Git Bash) y observa en qué momento el bot se calla y cuándo vuelve.
Parte A. En tu copia de `src/texto.js` agrega las palabras `reclamo`, `queja` y `devolucion` a la lista de la intención `humano`. Comprueba con `node -e` que `detectarIntencion("tengo un reclamo")` ahora devuelve `humano`, y corre `npm test` para confirmar que nada se rompió.
Parte A. Crea una prueba con `node:test` que use `conversacion()` de `test/ayudas.js`: el cliente pide una persona, escribe tres mensajes más y verifica que el bot no responde nada (`c.respuestas.length === 0`) y que `c.sesion.carrito` conserva sus productos tras escribir `menu`.
Parte B. Escribe `estaAbierto(ahora, horario, desfaseHoras = -5)`: `horario` es un objeto por día de la semana (0 domingo a 6 sábado) con `[horaApertura, horaCierre]`; un día ausente significa cerrado. Está abierto si la hora local es mayor o igual que la apertura y menor que el cierre (admite minutos: 8:30 es 8.5). Usa `new Date(ahora + desfaseHoras * 3600000)` y los métodos `getUTC...`.
Parte B. Escribe `debeAvisar(antes, despues)`: recibe los estados de la sesión (textos) antes y después de procesar un mensaje. Devuelve `true` solo si `despues` es `"ESPERANDO_HUMANO"` y `antes` no lo era (incluye el caso en que `antes` sea `null` o `undefined`).
Parte B. Escribe `avisoDueno(sesion, nombre)`: devuelve `"Cliente pide atencion: <quien>. <carrito>"`. `quien` es `"<nombre> (<telefono>)"` o solo el teléfono si no hay nombre. `carrito` es `"Tiene N producto(s) en el carrito."` con N = suma de las cantidades de `sesion.carrito`, o `"No tiene nada en el carrito."` si N es 0.
Parte B. Escribe `humanoVencido(desde, ahora, maxMs = 3 * 3600 * 1000)`: `true` si `desde` no es nulo y pasó `maxMs` o más; `false` en cualquier otro caso (incluye `desde` nulo).
```

```pista Hora local
`const local = new Date(ahora + desfaseHoras * 3600000);` te da una fecha «corrida». Con `local.getUTCDay()` obtienes el día (0 a 6) y con `local.getUTCHours() + local.getUTCMinutes() / 60` la hora decimal.
```

```pista Franja ausente
`const franja = horario[local.getUTCDay()];` es `undefined` si ese día no está en la tabla. En ese caso devuelve `false` antes de comparar horas.
```

```pista Sumar cantidades
`sesion.carrito.reduce((n, l) => n + l.cantidad, 0)` suma las cantidades de todas las líneas. Para el texto usa una plantilla: `` `Tiene ${n} producto(s) en el carrito.` ``.
```

```checks
[
 {"d": "`estaAbierto` es `true` en horario de atención entre semana", "h": "Miércoles 15:00 UTC son las 10:00 en Lima; la franja es [8, 21].", "t": "var h={0:[9,14],1:[8,21],2:[8,21],3:[8,21],4:[8,21],5:[8,21],6:[8,21]};return estaAbierto(Date.UTC(2026,9,7,15,0),h)===true"},
 {"d": "`estaAbierto` es `false` antes de abrir y después de cerrar", "h": "Compara con >= la apertura y con < el cierre. A las 21:00 en punto ya está cerrado.", "t": "var h={1:[8,21],2:[8,21],3:[8,21]};return estaAbierto(Date.UTC(2026,9,7,12,59),h)===false && estaAbierto(Date.UTC(2026,9,8,2,0),h)===false && estaAbierto(Date.UTC(2026,9,7,13,0),h)===true"},
 {"d": "`estaAbierto` usa la franja del domingo", "h": "El 11 de octubre de 2026 es domingo (día 0): abre de 9 a 14 en Lima.", "t": "var h={0:[9,14],6:[8,21]};return estaAbierto(Date.UTC(2026,9,11,13,0),h)===false && estaAbierto(Date.UTC(2026,9,11,15,0),h)===true && estaAbierto(Date.UTC(2026,9,11,19,30),h)===false"},
 {"d": "`estaAbierto` cierra los días ausentes y admite otro desfase con minutos", "h": "Si `horario[dia]` es undefined devuelve false; con desfaseHoras = 0 la hora local es la UTC y 8:30 se escribe 8.5.", "t": "var h={1:[8,21]};var g={3:[8.5,12]};return estaAbierto(Date.UTC(2026,9,7,15,0),h)===false && estaAbierto(Date.UTC(2026,9,7,8,29),g,0)===false && estaAbierto(Date.UTC(2026,9,7,8,30),g,0)===true"},
 {"d": "`debeAvisar` es `true` solo en la transición a modo humano", "h": "Devuelve true si despues es ESPERANDO_HUMANO y antes era otra cosa (o no había sesión: null).", "t": "return debeAvisar(\"CARRITO\",\"ESPERANDO_HUMANO\")===true && debeAvisar(null,\"ESPERANDO_HUMANO\")===true && debeAvisar(undefined,\"ESPERANDO_HUMANO\")===true"},
 {"d": "`debeAvisar` es `false` si ya estaba en modo humano o no pasó a él", "h": "Si antes ya era ESPERANDO_HUMANO, no avises de nuevo.", "t": "return debeAvisar(\"ESPERANDO_HUMANO\",\"ESPERANDO_HUMANO\")===false && debeAvisar(\"MENU\",\"CARRITO\")===false && debeAvisar(\"ESPERANDO_HUMANO\",\"MENU\")===false && debeAvisar(null,\"MENU\")===false"},
 {"d": "`avisoDueno` redacta el aviso con y sin nombre, con y sin carrito", "h": "Con nombre: Rosa (51999000111). Sin nombre solo el teléfono. Con 0 productos: No tiene nada en el carrito.", "t": "var s={telefono:\"51999000111\",carrito:[{cantidad:2},{cantidad:1}]};var v={telefono:\"51999000111\",carrito:[]};return avisoDueno(s,\"Rosa\")===\"Cliente pide atencion: Rosa (51999000111). Tiene 3 producto(s) en el carrito.\" && avisoDueno(v,null)===\"Cliente pide atencion: 51999000111. No tiene nada en el carrito.\""},
 {"d": "`humanoVencido` respeta el plazo y el valor nulo", "h": "Con 3 horas por defecto: a las 2 h no vence, a las 3 h sí; con desde nulo siempre false.", "t": "var H=3600000;return humanoVencido(0,2*H)===false && humanoVencido(0,3*H)===true && humanoVencido(null,99*H)===false && humanoVencido(0,H,H)===true"}
]
```

```solucion humano.js
function estaAbierto(ahora, horario, desfaseHoras = -5) {
  const local = new Date(ahora + desfaseHoras * 3600000);
  const franja = horario[local.getUTCDay()];
  if (!franja) return false;
  const hora = local.getUTCHours() + local.getUTCMinutes() / 60;
  return hora >= franja[0] && hora < franja[1];
}

function debeAvisar(antes, despues) {
  return despues === "ESPERANDO_HUMANO" && antes !== "ESPERANDO_HUMANO";
}

function avisoDueno(sesion, nombre) {
  const n = sesion.carrito.reduce((suma, l) => suma + l.cantidad, 0);
  const quien = nombre ? `${nombre} (${sesion.telefono})` : sesion.telefono;
  const carrito = n > 0 ? `Tiene ${n} producto(s) en el carrito.` : "No tiene nada en el carrito.";
  return `Cliente pide atencion: ${quien}. ${carrito}`;
}

function humanoVencido(desde, ahora, maxMs = 3 * 3600 * 1000) {
  return desde != null && ahora - desde >= maxMs;
}
```

> [!consejo] Reto extra
> Escribe `proximaApertura(ahora, horario, desfaseHoras = -5)`: devuelve un texto como `"hoy a las 8:00"` o `"mañana a las 9:00"` con la próxima hora de apertura. Es lo que haría falta para que el mensaje de fuera de horario diga cuándo te van a responder, en lugar de repetir toda la tabla.

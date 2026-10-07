---
minutos: 45
nivel: intermedio
---
## Objetivo

Escribir las cuatro decisiones que toma un recordatorio antes de enviarse: **cómo** enviarlo (texto o plantilla), **cuándo** (horario razonable), **si** corresponde (baja y frecuencia) y **cómo reconocer** que el cliente pidió no recibir más avisos.

### Cómo se trabaja

La **parte A** es práctica real en tu terminal con el código de referencia del curso. La **parte B** son cuatro funciones de JavaScript puro que se comprueban en esta página. Las horas son milisegundos (`Date.now()`); el minimarket está en Lima (UTC-5, sin horario de verano), así que la hora local es la hora UTC menos 5.

```pasos
Parte A. En la carpeta `codigo/` del curso corre `node --test test/recordatorios.test.js` y confirma que pasan las pruebas de `pedidosParaRecordar` y `carritosAbandonados`.
Parte A. Cambia temporalmente `ESPERA_CARRITO_MS` en `src/recordatorios.js` a 3 horas, vuelve a correr las pruebas y anota cuáles fallan y por qué. Restaura el valor.
Parte A. Con `npx wrangler dev` corriendo, abre `http://localhost:8787/cdn-cgi/local/scheduled` para disparar el cron a mano y mira en la consola qué haría el Worker (Verifica este dato en la documentación de Cloudflare: la ruta puede cambiar).
Parte B. Escribe `tipoDeEnvio(ultimoMensajeCliente, ahora)`: devuelve `"texto"` si el cliente escribió hace menos de 24 horas y `"plantilla"` en cualquier otro caso (incluido `null`).
Parte B. Escribe `horaLima(ahora)`: devuelve la hora local de Lima (entero de 0 a 23) a partir de un instante en milisegundos.
Parte B. Escribe `enHorarioPermitido(ahora)`: `true` solo entre las 8:00 y las 20:59 hora de Lima.
Parte B. Escribe `esBaja(texto)`: `true` si el mensaje pide dejar de recibir avisos (`baja`, `stop`, `no quiero recibir`, `cancelar suscripcion`), sin importar mayúsculas ni tildes. Un `"quiero 2 leches"` no es baja.
Parte B. Escribe `debeRecordar(cliente, ahora)`: `cliente` es `{ optOut, ultimoRecordatorio }`. Devuelve `false` si `optOut` es `true`, si ya se le recordó hace menos de 24 horas o si estamos fuera de horario. En cualquier otro caso, `true`.
```

```pista Hora de Lima
Resta 5 horas al instante y usa `new Date(ms).getUTCHours()`. Así no dependes de la zona horaria de tu computadora.
```

```pista Texto sin tildes
`texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()` quita las tildes. Luego busca cada frase con `includes`. Cuidado: «no quiero recibir» debe detectarse, pero «baja» no debe confundirse con «bajar el volumen»; para el reto basta `includes`, para producción usa palabras completas.
```

```pista Orden de las reglas en debeRecordar
Primero la baja (es lo más importante), después la frecuencia y al final el horario. Si `ultimoRecordatorio` es `null`, nunca se le recordó.
```

```checks
[
 {"d": "`tipoDeEnvio` devuelve `texto` dentro de las 24 h", "h": "Compara `ahora - ultimo` con 24 * 3600000 usando `<`.", "t": "var h=3600000;return tipoDeEnvio(0, 23*h)===\"texto\""},
 {"d": "`tipoDeEnvio` devuelve `plantilla` a las 24 h o más, o sin mensaje previo", "h": "Exactamente 24 h ya es fuera de ventana; revisa también `null`.", "t": "var h=3600000;return tipoDeEnvio(0,24*h)===\"plantilla\" && tipoDeEnvio(0,50*h)===\"plantilla\" && tipoDeEnvio(null,5)===\"plantilla\""},
 {"d": "`horaLima` convierte de UTC a UTC-5", "h": "Resta 5 horas en milisegundos y lee `getUTCHours()`.", "t": "return horaLima(Date.UTC(2026,9,7,13,30))===8 && horaLima(Date.UTC(2026,9,7,3,0))===22"},
 {"d": "`enHorarioPermitido` acepta 8:00 a 20:59 y rechaza el resto", "h": "La hora debe ser >= 8 y < 21.", "t": "var u=function(h,m){return Date.UTC(2026,9,7,h,m)};return enHorarioPermitido(u(13,0))===true && enHorarioPermitido(u(12,59))===false && enHorarioPermitido(u(1,59))===true && enHorarioPermitido(u(2,0))===false"},
 {"d": "`esBaja` reconoce frases de baja con mayúsculas y tildes", "h": "Normaliza el texto antes de buscar frases.", "t": "return esBaja(\"BAJA\")===true && esBaja(\"stop\")===true && esBaja(\"Ya no quiero recibir mensajes\")===true && esBaja(\"cancelar suscripción\")===true"},
 {"d": "`esBaja` no se activa con un pedido normal", "h": "Revisa que no busques palabras demasiado cortas dentro de otras.", "t": "return esBaja(\"quiero 2 leches\")===false && esBaja(\"hola\")===false && esBaja(\"\")===false"},
 {"d": "`debeRecordar` respeta la baja", "h": "Si `cliente.optOut` es `true`, devuelve `false` aunque todo lo demás esté bien.", "t": "var ahora=Date.UTC(2026,9,7,18,0);return debeRecordar({optOut:true,ultimoRecordatorio:null},ahora)===false"},
 {"d": "`debeRecordar` aplica la frecuencia y el horario", "h": "Bloquea si pasó menos de 24 h desde `ultimoRecordatorio` o si `enHorarioPermitido(ahora)` es falso.", "t": "var h=3600000,ahora=Date.UTC(2026,9,7,18,0);return debeRecordar({optOut:false,ultimoRecordatorio:null},ahora)===true && debeRecordar({optOut:false,ultimoRecordatorio:ahora-2*h},ahora)===false && debeRecordar({optOut:false,ultimoRecordatorio:ahora-30*h},ahora)===true && debeRecordar({optOut:false,ultimoRecordatorio:null},Date.UTC(2026,9,7,5,0))===false"}
]
```

```solucion recordatorios-extra.js
const VENTANA = 24 * 60 * 60 * 1000;
const HORA = 60 * 60 * 1000;

function tipoDeEnvio(ultimoMensajeCliente, ahora) {
  if (ultimoMensajeCliente == null) return "plantilla";
  return ahora - ultimoMensajeCliente < VENTANA ? "texto" : "plantilla";
}

function horaLima(ahora) {
  return new Date(ahora - 5 * HORA).getUTCHours();
}

function enHorarioPermitido(ahora) {
  const h = horaLima(ahora);
  return h >= 8 && h < 21;
}

function esBaja(texto) {
  const t = String(texto).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  if (t === "baja" || t === "stop") return true;
  return ["no quiero recibir", "cancelar suscripcion", "darme de baja"].some((f) => t.includes(f));
}

function debeRecordar(cliente, ahora) {
  if (cliente.optOut) return false;
  if (cliente.ultimoRecordatorio != null && ahora - cliente.ultimoRecordatorio < VENTANA) return false;
  return enHorarioPermitido(ahora);
}
```

> [!consejo] Reto extra
> Haz que `debeRecordar` devuelva un objeto `{ ok, motivo }` con el motivo del rechazo (`"baja"`, `"frecuencia"`, `"horario"`). Guardar el motivo te ayudará a medir por qué no se envían recordatorios.

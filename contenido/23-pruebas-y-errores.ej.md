---
minutos: 45
nivel: intermedio
---
## Objetivo

Escribir las cuatro piezas de fiabilidad que usa el bot en producción: decidir si un fallo se reintenta, calcular la espera entre intentos, interpretar un código de error de Meta y ocultar teléfonos en los logs.

### Cómo se trabaja

La **parte A** es práctica real en tu terminal con el código de referencia. La **parte B** son cuatro funciones de JavaScript puro que se comprueban en esta página. No uses `import` ni `process`: solo funciones.

```pasos
Parte A. En la carpeta `codigo/` del curso ejecuta `npm test` y anota cuántas pruebas pasan. Luego abre `test/motor.test.js` y localiza la prueba de «hablar con una persona».
Parte A. Crea `test/mia.test.js` con `node:test` y escribe una prueba de conversación: pide `3 leches`, finaliza con `cerrar`, elige `entrega:recojo`, `pago:yape` y `pedido_confirmar`, y comprueba que `c.sesion.pedidoNuevo.total` es el valor esperado según `src/catalogo.js`.
Parte A. Rompe la prueba a propósito (cambia el total esperado), ejecútala con `node --test test/mia.test.js` y lee el informe: ¿cuál es el valor recibido? Corrígela.
Parte A. Copia `test/payloads/estado-fallido.json` como `estado-fallido-2.json`, cambia el código de error a `131030` y escribe una prueba que lo lea con `parsearWebhook`.
Parte B. Escribe `esReintentable(estadoHttp)`: `true` para `429` y para cualquier estado de 500 en adelante; `false` para el resto (por ejemplo 200, 400, 401, 404).
Parte B. Escribe `esperaReintento(intento, baseMs = 500, maxMs = 8000)`: la espera crece al doble en cada intento, empezando en `baseMs` para el intento 1 (500, 1000, 2000...) y nunca pasa de `maxMs`.
Parte B. Escribe `accionParaError(codigo)`: devuelve `"plantilla"` para `131047`, `"corregir"` para `131030`, `190`, `131008` y `131009`, `"esperar"` para `131056` y `131048`, `"ignorar"` para `131026`, y `"revisar"` para cualquier otro código.
Parte B. Escribe `ocultarTelefono(tel)`: conserva los 3 primeros y los 3 últimos dígitos y pone `***` en medio (`"51999000111"` pasa a `"519***111"`). Si el número tiene 6 caracteres o menos, devuelve `"***"`. Acepta números o textos.
```

```pista Potencias de dos
El intento 1 espera `baseMs`, el 2 espera el doble, el 3 el cuádruple... Eso es `baseMs * 2 ** (intento - 1)`. Con `Math.min(valor, maxMs)` pones el tope.
```

```pista Tabla de errores
Un objeto como `{ 131047: "plantilla", 131030: "corregir", ... }` y `tabla[codigo] ?? "revisar"` resuelve el caso por defecto. Las claves numéricas de un objeto se convierten en texto, pero `tabla[131047]` funciona igual.
```

```pista Teléfonos
Convierte a texto con `String(tel)` y usa `slice(0, 3)` y `slice(-3)` para tomar el principio y el final.
```

```checks
[
 {"d": "`esReintentable` acepta 429 y los 5xx", "h": "Devuelve true si el estado es 429 o es mayor o igual que 500.", "t": "return esReintentable(429)===true && esReintentable(500)===true && esReintentable(503)===true"},
 {"d": "`esReintentable` rechaza éxitos y errores 4xx", "h": "200, 400, 401, 403 y 404 no se reintentan.", "t": "return esReintentable(200)===false && esReintentable(400)===false && esReintentable(401)===false && esReintentable(404)===false"},
 {"d": "`esperaReintento` duplica la espera en cada intento", "h": "Usa baseMs * 2 ** (intento - 1).", "t": "return esperaReintento(1)===500 && esperaReintento(2)===1000 && esperaReintento(3)===2000 && esperaReintento(4)===4000"},
 {"d": "`esperaReintento` respeta el tope y los parámetros", "h": "Aplica Math.min con maxMs y usa los valores recibidos.", "t": "return esperaReintento(10)===8000 && esperaReintento(3, 100)===400 && esperaReintento(5, 1000, 5000)===5000"},
 {"d": "`accionParaError` clasifica los códigos de la tabla", "h": "131047 plantilla; 131030, 190, 131008 y 131009 corregir; 131056 y 131048 esperar; 131026 ignorar.", "t": "return accionParaError(131047)===\"plantilla\" && accionParaError(131030)===\"corregir\" && accionParaError(190)===\"corregir\" && accionParaError(131008)===\"corregir\" && accionParaError(131009)===\"corregir\" && accionParaError(131056)===\"esperar\" && accionParaError(131048)===\"esperar\" && accionParaError(131026)===\"ignorar\""},
 {"d": "`accionParaError` devuelve `revisar` si no conoce el código", "h": "Usa ?? \"revisar\" al final.", "t": "return accionParaError(999999)===\"revisar\" && accionParaError(undefined)===\"revisar\""},
 {"d": "`ocultarTelefono` deja 3 dígitos al inicio y 3 al final", "h": "String(tel).slice(0,3) + \"***\" + String(tel).slice(-3).", "t": "return ocultarTelefono(\"51999000111\")===\"519***111\" && ocultarTelefono(51999000222)===\"519***222\""},
 {"d": "`ocultarTelefono` oculta todo si el número es muy corto", "h": "Con 6 caracteres o menos devuelve solo ***.", "t": "return ocultarTelefono(\"12345\")===\"***\" && ocultarTelefono(\"123456\")===\"***\" && ocultarTelefono(\"1234567\")===\"123***567\""}
]
```

```solucion fiabilidad.js
function esReintentable(estadoHttp) {
  return estadoHttp === 429 || estadoHttp >= 500;
}

function esperaReintento(intento, baseMs = 500, maxMs = 8000) {
  return Math.min(baseMs * 2 ** (intento - 1), maxMs);
}

const ACCIONES = {
  131047: "plantilla",
  131030: "corregir",
  190: "corregir",
  131008: "corregir",
  131009: "corregir",
  131056: "esperar",
  131048: "esperar",
  131026: "ignorar",
};

function accionParaError(codigo) {
  return ACCIONES[codigo] ?? "revisar";
}

function ocultarTelefono(tel) {
  const s = String(tel);
  return s.length <= 6 ? "***" : s.slice(0, 3) + "***" + s.slice(-3);
}
```

> [!consejo] Reto extra
> Escribe `reintentarConEsperas(estados)`: recibe una lista de estados HTTP simulados (por ejemplo `[500, 503, 200]`) y devuelve cuántos intentos hizo y cuánto esperó en total, aplicando `esReintentable` y `esperaReintento` con un máximo de 3 intentos.

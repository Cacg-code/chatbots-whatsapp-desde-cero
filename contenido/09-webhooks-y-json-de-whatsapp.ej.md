---
minutos: 50
nivel: intermedio
---
## Objetivo

Construir con tus propias manos las cuatro piezas de la puerta de entrada de un bot: leer un payload sin romperse, clasificar eventos, responder la verificación del webhook y validar el formato y la igualdad de una firma.

### Cómo se trabaja

La **parte A** se hace en tu computadora con el código de referencia del curso: ejecutas el parser y la firma sobre los ejemplos reales. La **parte B** son cinco funciones de JavaScript puro (sin `import`, sin Node) que se comprueban en esta página. No calculas el HMAC aquí (necesita `crypto`); lo que sí practicas es el formato de la cabecera y la comparación en tiempo constante, que son el resto de la lógica de la firma.

Los payloads de prueba tienen la forma `payload.entry[].changes[].value.messages[]` (mensajes) o `.statuses[]` (estados), como en la lección. Los teléfonos son falsos (`51999000111`).

```pasos
Parte A. En `codigo/`, crea `probar.mjs` con `import { readFileSync } from "node:fs"; import { parsearWebhook } from "./src/whatsapp.js";` y muestra con `console.log(JSON.stringify(parsearWebhook(JSON.parse(readFileSync("test/payloads/boton.json", "utf8"))), null, 1))`. Ejecútalo con `node probar.mjs` y localiza en la salida el `id` del botón.
Parte A. Repite con `no-soportado.json` y `estado-fallido.json`. Anota en `notas.md` cuál es el `subtipo` y qué código de error trae el estado fallido.
Parte A. Calcula la firma con `firmar` (importa también esa función) para el texto `{}` y el secreto `secreto`; comprueba que obtienes `sha256=9b09d74c...17e9`. Cambia el secreto por `otro` y mira cómo cambia por completo.
Parte B. Escribe `tipoDeEvento(payload)`: devuelve `"mensaje"` si algún cambio de `messages` trae mensajes, `"estado"` si trae `statuses` (y ningún mensaje), y `"ignorar"` en cualquier otro caso (incluido `null`).
Parte B. Escribe `extraerTexto(payload)`: devuelve el texto (`text.body`) del primer mensaje de tipo `"text"`, o `null` si no hay ninguno. Debe tolerar payloads incompletos sin lanzar errores.
Parte B. Escribe `responderVerificacion(params, tokenEsperado)`: `params` es un objeto con claves `"hub.mode"`, `"hub.verify_token"` y `"hub.challenge"`. Devuelve `{ estado: 200, cuerpo: reto }` si el modo es `"subscribe"`, el token coincide y hay reto; en cualquier otro caso `{ estado: 403, cuerpo: "Prohibido" }`. Si `tokenEsperado` está vacío o es `undefined`, siempre 403.
Parte B. Escribe `formatoFirmaValido(cabecera)`: `true` solo si es un texto `sha256=` seguido de exactamente 64 caracteres hexadecimales (mayúsculas o minúsculas).
Parte B. Escribe `iguales(a, b)`: compara dos textos en tiempo constante (recorre siempre toda la longitud acumulando diferencias, sin salir temprano). Devuelve `false` si no son texto o si tienen distinta longitud.
```

```pista Recorrer sin romperse
Usa `payload?.entry ?? []`, luego `entrada?.changes ?? []` y `cambio?.value?.messages ?? []`. Comprueba además `Array.isArray` antes de iterar si quieres blindarlo contra valores raros como `entry: "raro"`.
```

```pista Detectar «mensaje» o «estado»
Recorre todos los cambios y levanta dos banderas: `hayMensajes` si `messages` tiene longitud mayor a 0, `hayEstados` si `statuses` la tiene. Si hay mensajes, devuelve `"mensaje"`; si no y hay estados, `"estado"`.
```

```pista La comparación en tiempo constante
Primero compara las longitudes. Después usa una variable `diferencia = 0` y, por cada posición, `diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i)`. Al final, `diferencia === 0`. Nunca hagas `return` dentro del bucle.
```

```pista La expresión regular de la firma
`/^sha256=[0-9a-f]{64}$/i.test(cabecera)`. Antes comprueba que `cabecera` sea de tipo `string`, porque `test` convertiría otros valores a texto.
```

```checks
[
 {"d": "`tipoDeEvento` reconoce un mensaje", "h": "Busca `value.messages` con al menos un elemento dentro de `entry[].changes[]`.", "t": "var p={object:'whatsapp_business_account',entry:[{changes:[{field:'messages',value:{messages:[{from:'51999000111',id:'wamid.A',type:'text',text:{body:'hola'}}]}}]}]};return tipoDeEvento(p)==='mensaje'"},
 {"d": "`tipoDeEvento` reconoce un estado", "h": "Si `value.statuses` trae elementos y no hay mensajes, es `\"estado\"`.", "t": "var p={entry:[{changes:[{value:{statuses:[{id:'wamid.S',status:'delivered'}]}}]}]};return tipoDeEvento(p)==='estado'"},
 {"d": "`tipoDeEvento` ignora basura sin lanzar errores", "h": "Devuelve `\"ignorar\"` para `null`, `{}` y valores que no sean listas.", "t": "return tipoDeEvento(null)==='ignorar' && tipoDeEvento({})==='ignorar' && tipoDeEvento({entry:'raro'})==='ignorar' && tipoDeEvento({entry:[{changes:[{value:{}}]}]})==='ignorar'"},
 {"d": "`extraerTexto` devuelve el cuerpo del primer mensaje de texto", "h": "El texto está en `message.text.body` cuando `message.type === \"text\"`.", "t": "var p={entry:[{changes:[{value:{messages:[{type:'image',id:'i'},{type:'text',id:'t',text:{body:'Quiero 2 leches'}}]}}]}]};return extraerTexto(p)==='Quiero 2 leches'"},
 {"d": "`extraerTexto` devuelve `null` si no hay texto o el payload está incompleto", "h": "Recorre con `?? []` y devuelve `null` al final si no encontraste nada.", "t": "return extraerTexto(null)===null && extraerTexto({entry:[]})===null && extraerTexto({entry:[{changes:[{value:{statuses:[{id:'x'}]}}]}]})===null"},
 {"d": "`responderVerificacion` devuelve el reto cuando todo coincide", "h": "Devuelve `{ estado: 200, cuerpo: params[\"hub.challenge\"] }` si el modo es `subscribe` y el token es igual al esperado.", "t": "var r=responderVerificacion({'hub.mode':'subscribe','hub.verify_token':'minimarket-123','hub.challenge':'1158201444'},'minimarket-123');return r.estado===200 && r.cuerpo==='1158201444'"},
 {"d": "`responderVerificacion` rechaza token malo, modo distinto, sin reto y token esperado vacío", "h": "Cualquier otro caso es `{ estado: 403, cuerpo: \"Prohibido\" }`; no dejes pasar `undefined === undefined`.", "t": "var m=function(p,t){var r=responderVerificacion(p,t);return r.estado===403 && r.cuerpo==='Prohibido'};return m({'hub.mode':'subscribe','hub.verify_token':'malo','hub.challenge':'1'},'ok') && m({'hub.mode':'unsubscribe','hub.verify_token':'ok','hub.challenge':'1'},'ok') && m({'hub.mode':'subscribe','hub.verify_token':'ok'},'ok') && m({'hub.mode':'subscribe','hub.challenge':'1'},undefined) && m({'hub.mode':'subscribe','hub.verify_token':'','hub.challenge':'1'},'')"},
 {"d": "`formatoFirmaValido` acepta solo `sha256=` + 64 hex", "h": "Usa una regular `^sha256=[0-9a-f]{64}$` con la bandera `i` y comprueba que sea texto.", "t": "var ok='sha256='+'ab'.repeat(32);return formatoFirmaValido(ok)===true && formatoFirmaValido(ok.toUpperCase().replace('SHA256','sha256'))===true && formatoFirmaValido('sha256=abc')===false && formatoFirmaValido('sha1='+'ab'.repeat(20))===false && formatoFirmaValido('sha256='+'zz'.repeat(32))===false && formatoFirmaValido(null)===false && formatoFirmaValido(ok+'0')===false"},
 {"d": "`iguales` compara textos correctamente", "h": "Si las longitudes difieren devuelve `false`; si no, acumula diferencias con XOR y comprueba que den 0.", "t": "return iguales('sha256=abc','sha256=abc')===true && iguales('sha256=abc','sha256=abd')===false && iguales('abc','abcd')===false && iguales('','')===true && iguales(1,1)===false && iguales(null,'a')===false"}
]
```

```solucion funciones.js
function cambiosDe(payload) {
  var cambios = [];
  var entradas = payload && Array.isArray(payload.entry) ? payload.entry : [];
  for (var i = 0; i < entradas.length; i++) {
    var lista = entradas[i] && Array.isArray(entradas[i].changes) ? entradas[i].changes : [];
    for (var j = 0; j < lista.length; j++) cambios.push(lista[j]);
  }
  return cambios;
}

function tipoDeEvento(payload) {
  var hayMensajes = false, hayEstados = false;
  cambiosDe(payload).forEach(function (c) {
    var v = (c && c.value) || {};
    if (Array.isArray(v.messages) && v.messages.length > 0) hayMensajes = true;
    if (Array.isArray(v.statuses) && v.statuses.length > 0) hayEstados = true;
  });
  if (hayMensajes) return "mensaje";
  if (hayEstados) return "estado";
  return "ignorar";
}

function extraerTexto(payload) {
  var cambios = cambiosDe(payload);
  for (var i = 0; i < cambios.length; i++) {
    var v = (cambios[i] && cambios[i].value) || {};
    var mensajes = Array.isArray(v.messages) ? v.messages : [];
    for (var j = 0; j < mensajes.length; j++) {
      var m = mensajes[j];
      if (m && m.type === "text" && m.text && typeof m.text.body === "string") return m.text.body;
    }
  }
  return null;
}

function responderVerificacion(params, tokenEsperado) {
  var p = params || {};
  var reto = p["hub.challenge"];
  if (tokenEsperado && p["hub.mode"] === "subscribe" && p["hub.verify_token"] === tokenEsperado && reto) {
    return { estado: 200, cuerpo: reto };
  }
  return { estado: 403, cuerpo: "Prohibido" };
}

function formatoFirmaValido(cabecera) {
  return typeof cabecera === "string" && /^sha256=[0-9a-f]{64}$/i.test(cabecera);
}

function iguales(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  var diferencia = 0;
  for (var i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}
```

> [!consejo] Reto extra
> Escribe `resumenDeEvento(payload)` que devuelva un texto como `"mensaje de 51999000111: Quiero 2 leches"` o `"estado delivered de wamid.S"`. Después, pásale `test/payloads/estado-fallido.json` y haz que incluya también el código de error. Es justo lo que querrás ver en los registros del servidor cuando algo falle.

---
minutos: 55
nivel: intermedio
---
## Objetivo

Levantar el Worker del minimarket en tu computadora, comprobar cada ruta con `curl`, y escribir cinco funciones puras que reproducen las decisiones del servidor: enrutar, elegir el estado HTTP, nombrar claves de KV con su vida útil y no procesar dos veces el mismo mensaje.

### Cómo se trabaja

La **parte A** es práctica real: necesitas la carpeta `codigo/` del curso con `npm install` hecho. No usas cuenta de Cloudflare ni de Meta. La **parte B** son funciones de JavaScript puro que se comprueban en esta página; son versiones simplificadas de lo que hace `worker.js`, y escribirlas te obliga a entender cada decisión.

```pasos
Parte A. En `codigo/`, ejecuta `cp .dev.vars.example .dev.vars` y edita `VERIFY_TOKEN=minimarket-123` y `APP_SECRET=secreto`. Comprueba con `git status` que `.dev.vars` NO aparece (está en `.gitignore`).
Parte A. Arranca `npx wrangler dev --port 8799` y espera la línea `Ready on http://127.0.0.1:8799`. Si el puerto está ocupado, cambia el número.
Parte A. En otra terminal prueba `GET /`, `GET /salud`, la verificación con el token correcto y con uno malo, una ruta inexistente y un `POST` sin firma. Anota en `notas.md` los seis códigos HTTP que obtuviste.
Parte A. Firma `test/payloads/texto.json` con `openssl dgst -sha256 -hmac secreto -hex` y envíalo con `curl --data-binary @archivo`. Verifica que recibes 200 y observa en la terminal de `wrangler dev` el error de token de WhatsApp (es esperado: el token es de relleno). Anota por qué el estado sigue siendo 200.
Parte A. Corre `node --test test/worker.test.js` y cuenta cuántas pruebas pasan.
Parte B. Escribe `enrutar(metodo, ruta, params)`: devuelve `"verificar"` si es GET y `params` tiene la clave `"hub.mode"`; `"inicio"` para GET `/`; `"salud"` para GET `/salud`; `"recibir"` para POST `/` o POST `/webhook`; `"verificar"` también para GET `/webhook`; y `"no-encontrado"` para todo lo demás. `params` puede ser `undefined`.
Parte B. Escribe `estadoDelPost(firmaValida, jsonValido)`: `401` si la firma no es válida (aunque el JSON tampoco lo sea), `400` si la firma es válida pero el JSON no, y `200` si ambos son válidos.
Parte B. Escribe `claveKV(tipo, id)` (devuelve `"sesion:51999000111"`, `"pedido:LE-1"`, `"visto:wamid.X"`; lanza un `Error` si el tipo no es uno de esos tres) y `ttlSegundos(tipo)` (sesion: 2 días, pedido: 30 días, visto: 1 día, en segundos).
Parte B. Escribe `mensajesNuevos(eventos, vistos)`: recibe la lista de eventos de `parsearWebhook` y un `Set` de ids ya vistos. Devuelve el arreglo de eventos de tipo `"mensaje"` cuyo `id` no estaba en `vistos`, y **agrega esos ids a `vistos`**. Si el mismo `id` aparece dos veces en la lista, solo cuenta la primera. Los eventos de tipo `"estado"` se ignoran.
```

```pista Enrutar con orden
Evalúa las condiciones en este orden: primero «GET con `hub.mode`», luego GET `/` y `/salud`, luego POST a `/` o `/webhook`, luego GET `/webhook` sin `hub.mode`, y al final `"no-encontrado"`. Usa `params && "hub.mode" in params` para no fallar si `params` es `undefined`.
```

```pista Por qué primero la firma
En `recibirWebhook` la firma se comprueba antes de intentar leer el JSON. Eso fija el orden de tu función: `if (!firmaValida) return 401;` va primero.
```

```pista Claves y vida útil
Un objeto `{ sesion: 2 * 86400, pedido: 30 * 86400, visto: 86400 }` sirve para las dos funciones. Valida con `tipo in objeto` (o con `Object.keys`) antes de armar la clave.
```

```pista Idempotencia con Set
Recorre los eventos: si `e.tipo !== "mensaje"`, sigue; si `vistos.has(e.id)`, sigue; si no, `vistos.add(e.id)` y agrégalo al resultado. Como el `add` ocurre dentro del bucle, un duplicado dentro de la misma lista también se descarta.
```

```checks
[
 {"d": "`enrutar` reconoce `/` y `/salud`", "h": "GET a `/` devuelve `\"inicio\"`; GET a `/salud` devuelve `\"salud\"`.", "t": "return enrutar('GET','/',{})==='inicio' && enrutar('GET','/salud',undefined)==='salud'"},
 {"d": "`enrutar` manda a `verificar` los GET con `hub.mode`, en `/webhook` y en `/`", "h": "La comprobación de `hub.mode` va antes que la de rutas simples.", "t": "return enrutar('GET','/webhook',{'hub.mode':'subscribe'})==='verificar' && enrutar('GET','/',{'hub.mode':'subscribe'})==='verificar' && enrutar('GET','/webhook',{})==='verificar'"},
 {"d": "`enrutar` manda a `recibir` los POST a `/` y `/webhook`", "h": "El método debe ser `POST` y la ruta una de las dos.", "t": "return enrutar('POST','/webhook',{})==='recibir' && enrutar('POST','/',undefined)==='recibir'"},
 {"d": "`enrutar` devuelve `no-encontrado` para el resto", "h": "Rutas desconocidas y métodos que no corresponden (por ejemplo POST a `/salud`).", "t": "return enrutar('GET','/otra',{})==='no-encontrado' && enrutar('POST','/salud',{})==='no-encontrado' && enrutar('DELETE','/webhook',{})==='no-encontrado'"},
 {"d": "`estadoDelPost` aplica firma primero, luego JSON", "h": "401 si la firma falla (aunque el JSON también falle); 400 si solo falla el JSON; 200 si todo está bien.", "t": "return estadoDelPost(false,true)===401 && estadoDelPost(false,false)===401 && estadoDelPost(true,false)===400 && estadoDelPost(true,true)===200"},
 {"d": "`claveKV` arma las claves y rechaza tipos desconocidos", "h": "Usa el formato `tipo:id` y lanza un `Error` si el tipo no es `sesion`, `pedido` o `visto`.", "t": "var fallo=false;try{claveKV('otro','1')}catch(e){fallo=true}return claveKV('sesion','51999000111')==='sesion:51999000111' && claveKV('pedido','LE-1')==='pedido:LE-1' && claveKV('visto','wamid.X')==='visto:wamid.X' && fallo===true"},
 {"d": "`ttlSegundos` devuelve 2 días, 30 días y 1 día", "h": "86400 segundos tiene un día; sesion = 2 días, pedido = 30 días, visto = 1 día.", "t": "return ttlSegundos('sesion')===172800 && ttlSegundos('pedido')===2592000 && ttlSegundos('visto')===86400"},
 {"d": "`mensajesNuevos` filtra estados y mensajes ya vistos, y registra los nuevos", "h": "Ignora `tipo === \"estado\"`; si `vistos.has(id)` sáltalo; si no, agrégalo a `vistos` y al resultado.", "t": "var v=new Set(['wamid.A']);var r=mensajesNuevos([{tipo:'mensaje',id:'wamid.A'},{tipo:'mensaje',id:'wamid.B'},{tipo:'estado',id:'wamid.S'}],v);return r.length===1 && r[0].id==='wamid.B' && v.has('wamid.B') && !v.has('wamid.S')"},
 {"d": "`mensajesNuevos` descarta duplicados dentro de la misma lista y en una segunda llamada", "h": "El `add` al Set debe ocurrir dentro del bucle, no al final.", "t": "var v=new Set();var l=[{tipo:'mensaje',id:'x1'},{tipo:'mensaje',id:'x1'},{tipo:'mensaje',id:'x2'}];var a=mensajesNuevos(l,v);var b=mensajesNuevos(l,v);return a.length===2 && b.length===0"}
]
```

```solucion funciones.js
function enrutar(metodo, ruta, params) {
  var tieneHub = !!params && Object.prototype.hasOwnProperty.call(params, "hub.mode");
  if (metodo === "GET" && tieneHub) return "verificar";
  if (metodo === "GET" && ruta === "/") return "inicio";
  if (metodo === "GET" && ruta === "/salud") return "salud";
  if (metodo === "POST" && (ruta === "/" || ruta === "/webhook")) return "recibir";
  if (metodo === "GET" && ruta === "/webhook") return "verificar";
  return "no-encontrado";
}

function estadoDelPost(firmaValida, jsonValido) {
  if (!firmaValida) return 401;
  if (!jsonValido) return 400;
  return 200;
}

var DIA = 24 * 60 * 60;
var TTL = { sesion: 2 * DIA, pedido: 30 * DIA, visto: DIA };

function claveKV(tipo, id) {
  if (!Object.prototype.hasOwnProperty.call(TTL, tipo)) throw new Error("Tipo de clave desconocido: " + tipo);
  return tipo + ":" + id;
}

function ttlSegundos(tipo) {
  return TTL[tipo];
}

function mensajesNuevos(eventos, vistos) {
  var nuevos = [];
  eventos.forEach(function (e) {
    if (e.tipo !== "mensaje") return;
    if (vistos.has(e.id)) return;
    vistos.add(e.id);
    nuevos.push(e);
  });
  return nuevos;
}
```

> [!consejo] Reto extra
> Añade a `mensajesNuevos` un tope: si la lista trae más de 20 mensajes, procesa solo los 20 primeros. Piensa por qué un servidor público querría ese límite y qué debería hacer con los demás.

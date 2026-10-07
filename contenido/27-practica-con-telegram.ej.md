---
minutos: 45
nivel: intermedio
---
## Objetivo

Escribir las piezas centrales de un adaptador de Telegram: leer un `Update`, convertir una respuesta del motor en el cuerpo de `sendMessage` y proteger el webhook con el secreto.

### Cómo se trabaja

La **parte A** es práctica real: creas tu bot de Telegram y lo ves responder. La **parte B** son cuatro funciones de JavaScript puro, sin `import` ni red, que se comprueban en esta página. Trabaja con los mismos formatos de la lección: la entrada del motor es `{tipo:'texto', texto}` o `{tipo:'interactivo', id}`, y las respuestas son `{tipo:'texto', texto}` o `{tipo:'botones', texto, botones:[{id, titulo}]}`.

```pasos
Parte A. En Telegram abre `@BotFather`, envía `/newbot` y crea un bot de prueba para tu minimarket. Guarda el token en una variable de entorno (`TG_TOKEN`), **nunca** en un archivo del proyecto.
Parte A. Copia `src/telegram.js` y `probar-telegram.mjs` de la lección, ejecuta `node probar-telegram.mjs` y comprueba que las 5 líneas de salida coinciden con las de la lección.
Parte A. (Opcional, con túnel o Worker publicado) registra el webhook con `setWebhook` y un `secret_token`, escribe `/start` a tu bot y verifica que aparece el menú de La Esquina. Si calla, revisa `getWebhookInfo`.
Parte B. Escribe `secretoValido(esperado, cabecera)`: devuelve `true` solo si `cabecera` es un texto idéntico a `esperado`. Si `esperado` está vacío o `cabecera` no es texto, devuelve `false`.
Parte B. Escribe `parsearUpdate(update)`: devuelve `{ chatId, entrada }` o `null`. Un `message` con `text` da `{tipo:'texto', texto}` (con `/start` convertido a `"hola"` y espacios sobrantes recortados); un `callback_query` con `data` da `{tipo:'interactivo', id}` y toma el `chatId` de `callback_query.message.chat.id`; cualquier otro `message` (por ejemplo una foto) da `{tipo:'no_soportado', subtipo:'otro'}`; si no hay `message` ni `callback_query` válidos, devuelve `null`.
Parte B. Escribe `construirEnvio(chatId, respuesta)`: para `texto` devuelve `{ chat_id, text }`; para `botones` añade `reply_markup: { inline_keyboard: [[{text, callback_data}, ...]] }` (una sola fila, con `titulo` como `text` e `id` como `callback_data`). Recorta `text` a 4096 caracteres. Para otro tipo lanza un `Error`.
Parte B. Escribe `esNuevo(vistos, updateId)`: `vistos` es un `Set`. Si `updateId` ya está, devuelve `false`; si no, lo agrega y devuelve `true`.
```

```pista Comparar el secreto
Antes de comparar revisa que `esperado` tenga contenido y que `typeof cabecera === "string"`. Después basta `esperado === cabecera` (en producción se usa comparación en tiempo constante, como en la lección).
```

```pista Orden de las ramas en parsearUpdate
Mira primero `update.callback_query` (con `typeof data === "string"` y `message.chat.id`), luego `update.message`. Dentro de `message`, si `typeof text === "string"` es texto; si no, no soportado. Usa `?.` para no romperte con objetos incompletos.
```

```pista El teclado en línea
`botones.map((b) => ({ text: b.titulo, callback_data: b.id }))` da la fila; envuélvela en otro arreglo para formar `inline_keyboard`. Para recortar, `texto.slice(0, 4096)`.
```

```checks
[
 {"d": "`secretoValido` acepta el secreto correcto y rechaza uno distinto, vacío o que no es texto", "h": "Devuelve `esperado === cabecera` cuando ambos son texto.", "t": "return secretoValido(\"abc_123\",\"abc_123\")===true && secretoValido(\"abc_123\",\"abc_124\")===false && secretoValido(\"\",\"\")===false && secretoValido(\"abc\",undefined)===false && secretoValido(\"123\",123)===false"},
 {"d": "`parsearUpdate` convierte un mensaje de texto", "h": "Devuelve `{ chatId: message.chat.id, entrada: {tipo:\"texto\", texto} }` y recorta espacios.", "t": "var r=parsearUpdate({update_id:1,message:{chat:{id:5551001},text:\"  quiero 2 leches \"}});return r!==null && r.chatId===5551001 && r.entrada.tipo===\"texto\" && r.entrada.texto===\"quiero 2 leches\""},
 {"d": "`parsearUpdate` traduce `/start` a `hola`", "h": "Si el texto es exactamente `/start` (o `/start@algo`), usa `\"hola\"`.", "t": "var r=parsearUpdate({update_id:1,message:{chat:{id:1},text:\"/start\"}});var q=parsearUpdate({update_id:2,message:{chat:{id:1},text:\"/start@la_esquina_bot\"}});return r.entrada.texto===\"hola\" && q.entrada.texto===\"hola\""},
 {"d": "`parsearUpdate` convierte un toque de botón en entrada interactiva", "h": "El `chatId` sale de `callback_query.message.chat.id` y el `id` de `callback_query.data`.", "t": "var r=parsearUpdate({update_id:2,callback_query:{id:\"cq1\",data:\"menu_pedir\",message:{chat:{id:777}}}});return r.chatId===777 && r.entrada.tipo===\"interactivo\" && r.entrada.id===\"menu_pedir\""},
 {"d": "`parsearUpdate` marca como no soportado lo que no es texto y descarta basura", "h": "Un `message` sin `text` da `no_soportado`; un objeto sin `message` ni `callback_query` da `null`.", "t": "var f=parsearUpdate({update_id:3,message:{chat:{id:9},photo:[{}]}});return f.entrada.tipo===\"no_soportado\" && parsearUpdate({update_id:4})===null && parsearUpdate(null)===null"},
 {"d": "`construirEnvio` arma un mensaje de texto y recorta a 4096", "h": "Devuelve `{ chat_id, text }` sin `reply_markup`; usa `slice(0, 4096)`.", "t": "var a=construirEnvio(5,{tipo:\"texto\",texto:\"Hola\"});var b=construirEnvio(5,{tipo:\"texto\",texto:\"x\".repeat(5000)});return a.chat_id===5 && a.text===\"Hola\" && a.reply_markup===undefined && b.text.length===4096"},
 {"d": "`construirEnvio` convierte botones en un teclado en línea de una fila", "h": "`inline_keyboard` es un arreglo de filas: `[[{text, callback_data}, ...]]`.", "t": "var r=construirEnvio(5,{tipo:\"botones\",texto:\"Que deseas?\",botones:[{id:\"menu_pedir\",titulo:\"Hacer pedido\"},{id:\"menu_horario\",titulo:\"Horario\"}]});var k=r.reply_markup.inline_keyboard;return k.length===1 && k[0].length===2 && k[0][0].text===\"Hacer pedido\" && k[0][0].callback_data===\"menu_pedir\" && k[0][1].callback_data===\"menu_horario\""},
 {"d": "`construirEnvio` lanza un error con un tipo desconocido y `esNuevo` detecta repetidos", "h": "Haz `throw new Error(...)` en el caso final. Para `esNuevo`, usa `vistos.has` y `vistos.add`.", "t": "var fallo=false;try{construirEnvio(1,{tipo:\"video\"})}catch(e){fallo=true}var s=new Set();return fallo && esNuevo(s,10)===true && esNuevo(s,10)===false && esNuevo(s,11)===true"}
]
```

```solucion funciones.js
function secretoValido(esperado, cabecera) {
  if (!esperado || typeof cabecera !== "string") return false;
  return esperado === cabecera;
}

function parsearUpdate(update) {
  if (!update) return null;
  const cb = update.callback_query;
  if (cb && typeof cb.data === "string" && cb.message?.chat?.id != null) {
    return { chatId: cb.message.chat.id, entrada: { tipo: "interactivo", id: cb.data } };
  }
  const msg = update.message;
  if (!msg || msg.chat?.id == null) return null;
  if (typeof msg.text === "string") {
    const t = msg.text.trim();
    const texto = /^\/start(@\w+)?(\s|$)/.test(t) ? "hola" : t;
    return { chatId: msg.chat.id, entrada: { tipo: "texto", texto } };
  }
  return { chatId: msg.chat.id, entrada: { tipo: "no_soportado", subtipo: "otro" } };
}

function construirEnvio(chatId, respuesta) {
  const base = { chat_id: chatId, text: respuesta.texto === undefined ? "" : respuesta.texto.slice(0, 4096) };
  if (respuesta.tipo === "texto") return base;
  if (respuesta.tipo === "botones") {
    base.reply_markup = {
      inline_keyboard: [respuesta.botones.map((b) => ({ text: b.titulo, callback_data: b.id }))],
    };
    return base;
  }
  throw new Error("Tipo de respuesta desconocido: " + respuesta.tipo);
}

function esNuevo(vistos, updateId) {
  if (vistos.has(updateId)) return false;
  vistos.add(updateId);
  return true;
}
```

> [!consejo] Reto extra
> Añade `construirLista(chatId, respuesta)` que convierta una respuesta `lista` del motor (con `secciones` y `filas`) en un `inline_keyboard` con **un botón por fila** y el texto `titulo - descripcion`. Verifica con un `callback_data` de más de 64 bytes que tu función avisa del problema en lugar de enviarlo.

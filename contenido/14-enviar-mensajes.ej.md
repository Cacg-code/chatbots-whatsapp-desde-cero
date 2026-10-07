---
minutos: 50
nivel: intermedio
---
## Objetivo

Enviar de verdad un texto, botones y una lista a tu celular, y practicar con JavaScript puro las tres decisiones que toma el código de envío: validar botones, armar el cuerpo de un texto y decidir qué hacer ante un código de error.

### Cómo se trabaja

La **parte A** usa tu cuenta de pruebas de la lección 12 y el código del curso. La **parte B** son tres funciones que se comprueban en esta página; son versiones reducidas de `construirEnvio` y de la tabla de errores. **No pegues tokens reales aquí.**

```pasos
Parte A. En `codigo/`, crea un script `enviar-prueba.mjs` que importe `construirEnvio` y `enviarMensaje` de `./src/whatsapp.js`, lea `WA_TOKEN` y `WA_PHONE_ID` de `process.env` y envíe un texto a tu celular de prueba.
Parte A. Ejecútalo con tu token temporal en variables de entorno (no en el archivo). Si tu ventana de 24 horas está cerrada, responde `hola` desde el celular y repite.
Parte A. Envía un mensaje de botones con dos opciones (`entrega:recojo` y `entrega:delivery`) y toca uno desde el celular. Mira en los registros qué `id` llega.
Parte A. Provoca un error a propósito (token falso o título de botón de 30 letras) y anota el mensaje que ves.
Parte B. Escribe `validarBotones(botones)`: recibe un arreglo de `{id, titulo}` y devuelve un arreglo de textos con los problemas encontrados (vacío si todo está bien). Problemas: `"entre 1 y 3 botones"` si hay 0 o más de 3; `"titulo largo: <titulo>"` si un título pasa de 20 caracteres; `"titulo repetido: <titulo>"` si un título ya apareció; `"id vacio"` si falta un id.
Parte B. Escribe `cuerpoTexto(to, texto)`: devuelve el cuerpo de la API `{ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body: texto } }`. Si el texto está vacío o pasa de 4096 caracteres, lanza un `Error`.
Parte B. Escribe `accionParaError(codigo)`: devuelve `"renovar-token"` para 190; `"usar-plantilla"` para 131047; `"revisar-cuerpo"` para 100, 131051 y 132000; `"esperar"` para 130429 y 131056; `"pedir-revision-cliente"` para 131026; y `"leer-documentacion"` para cualquier otro código.
```

```pista Validar sin repetir
Para detectar títulos repetidos usa un `Set`: si ya lo contiene, agrega el problema; si no, añádelo. Para el largo, compara `titulo.length > 20`.
```

```pista Cuerpo de texto
Valida primero (`if (!texto || texto.length > 4096) throw new Error(...)`) y luego devuelve el objeto literal. Cuida el nombre `preview_url` y su valor `false`.
```

```pista Tabla de códigos
Un `switch` o un objeto `{ 190: "renovar-token", ... }` con `?? "leer-documentacion"` resuelve todo. Los números del código pueden venir como número; no hace falta convertirlos.
```

```checks
[
 {"d": "`validarBotones` acepta una lista correcta", "h": "Devuelve un arreglo vacío cuando no hay problemas.", "t": "return validarBotones([{id:\"a\",titulo:\"Recojo\"},{id:\"b\",titulo:\"Delivery\"}]).length===0"},
 {"d": "`validarBotones` rechaza 0 o más de 3 botones", "h": "Mensaje exacto: entre 1 y 3 botones.", "t": "var cuatro=[1,2,3,4].map(function(n){return {id:\"i\"+n,titulo:\"B\"+n}});return validarBotones([]).includes(\"entre 1 y 3 botones\") && validarBotones(cuatro).includes(\"entre 1 y 3 botones\")"},
 {"d": "`validarBotones` detecta títulos de más de 20 caracteres", "h": "20 caracteres exactos son válidos; 21 no.", "t": "var t20=\"12345678901234567890\";var t21=t20+\"1\";return validarBotones([{id:\"a\",titulo:t20}]).length===0 && validarBotones([{id:\"a\",titulo:t21}]).includes(\"titulo largo: \"+t21)"},
 {"d": "`validarBotones` detecta títulos repetidos e ids vacíos", "h": "Usa un Set para los títulos y revisa que id no esté vacío.", "t": "var r=validarBotones([{id:\"a\",titulo:\"Si\"},{id:\"\",titulo:\"Si\"}]);return r.includes(\"titulo repetido: Si\") && r.includes(\"id vacio\")"},
 {"d": "`cuerpoTexto` arma el cuerpo de la API", "h": "Revisa los nombres: messaging_product, recipient_type, type, text.preview_url y text.body.", "t": "var c=cuerpoTexto(\"51999000111\",\"Hola\");return c.messaging_product===\"whatsapp\" && c.recipient_type===\"individual\" && c.to===\"51999000111\" && c.type===\"text\" && c.text.preview_url===false && c.text.body===\"Hola\""},
 {"d": "`cuerpoTexto` lanza error con texto vacío o demasiado largo", "h": "Lanza un Error si no hay texto o si length > 4096. 4096 exactos sí se permite.", "t": "var f=function(x){try{cuerpoTexto(\"1\",x);return false}catch(e){return e instanceof Error}};return f(\"\")===true && f(\"a\".repeat(4097))===true && f(\"a\".repeat(4096))===false"},
 {"d": "`accionParaError` clasifica los códigos conocidos", "h": "190 renueva token, 131047 plantilla, 100/131051/132000 revisar cuerpo, 130429/131056 esperar, 131026 pedir revisión.", "t": "return accionParaError(190)===\"renovar-token\" && accionParaError(131047)===\"usar-plantilla\" && accionParaError(100)===\"revisar-cuerpo\" && accionParaError(131051)===\"revisar-cuerpo\" && accionParaError(132000)===\"revisar-cuerpo\" && accionParaError(130429)===\"esperar\" && accionParaError(131056)===\"esperar\" && accionParaError(131026)===\"pedir-revision-cliente\""},
 {"d": "`accionParaError` devuelve leer-documentacion ante códigos desconocidos", "h": "Usa un valor por defecto para lo que no esté en la tabla.", "t": "return accionParaError(999999)===\"leer-documentacion\" && accionParaError(undefined)===\"leer-documentacion\""}
]
```

```solucion funciones.js
function validarBotones(botones) {
  const problemas = [];
  if (!Array.isArray(botones) || botones.length < 1 || botones.length > 3) {
    problemas.push("entre 1 y 3 botones");
  }
  const titulos = new Set();
  for (const b of botones ?? []) {
    if (!b.id) problemas.push("id vacio");
    if (b.titulo.length > 20) problemas.push("titulo largo: " + b.titulo);
    if (titulos.has(b.titulo)) problemas.push("titulo repetido: " + b.titulo);
    titulos.add(b.titulo);
  }
  return problemas;
}

function cuerpoTexto(to, texto) {
  if (!texto || texto.length > 4096) throw new Error("texto vacio o de mas de 4096 caracteres");
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body: texto },
  };
}

const ACCIONES = {
  190: "renovar-token",
  131047: "usar-plantilla",
  100: "revisar-cuerpo",
  131051: "revisar-cuerpo",
  132000: "revisar-cuerpo",
  130429: "esperar",
  131056: "esperar",
  131026: "pedir-revision-cliente",
};

function accionParaError(codigo) {
  return ACCIONES[codigo] ?? "leer-documentacion";
}
```

> [!consejo] Reto extra
> Añade `validarLista(secciones)` con las reglas de la lección (máximo 10 filas en total, títulos de fila de hasta 24 caracteres y descripción de hasta 72) y compárala con `envioLista` de `src/whatsapp.js`.

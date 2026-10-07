---
minutos: 40
nivel: intermedio
---
## Objetivo

Comparar proveedores con números, recomendar un camino según el perfil del proyecto y escribir el adaptador de entrada de Twilio, para comprobar que cambiar de proveedor solo toca la carcasa del bot.

### Cómo se trabaja

La **parte A** es de investigación en las páginas oficiales. La **parte B** son cuatro funciones de JavaScript puro que se comprueban en esta página. Los precios que uses en la parte B son **inventados** y solo sirven para practicar la cuenta: nunca cotices con ellos.

```pasos
Parte A. Abre las páginas oficiales de precios de Meta, de Twilio y de 360dialog y anota en `notas.md`, para cada una, la **fecha de consulta** y qué cobra (por mensaje, cuota mensual, o ambos). Marca cada cifra con «Verifica este dato».
Parte A. Elige un negocio imaginario (por ejemplo, el minimarket con 600 mensajes de plantilla al mes) y escribe en `notas.md` qué camino recomendarías (API directa, proveedor o sandbox) y por qué, en 4 líneas.
Parte B. Escribe `costoMensual({ cuotaFija, tarifaProveedor, mensajes, tarifaMeta, plantillas })`: devuelve `cuotaFija + tarifaProveedor * mensajes + tarifaMeta * plantillas`, redondeado a 2 decimales. Los campos que falten valen 0.
Parte B. Escribe `recomendarOpcion({ sabeProgramar, numClientes, quiereSoporte, usaLibreriaNoOficial })` con estas reglas, en este orden: si usa librería no oficial devuelve `"rechazar"`; si no sabe programar devuelve `"bsp"`; si quiere soporte o tiene más de 5 clientes devuelve `"bsp"`; en otro caso devuelve `"api-directa"`.
Parte B. Escribe `riesgoDeBloqueo(opcion)`: `"api-directa"` y `"bsp"` dan `"bajo"`; `"baileys"` y `"whatsapp-web.js"` dan `"alto"`; cualquier otra cosa da `"desconocido"`.
Parte B. Escribe `entradaDeTwilio(form)`: recibe un objeto con `From` (por ejemplo `"whatsapp:+51999000111"`) y `Body`, y devuelve `{ de, entrada }` donde `de` es el número sin el prefijo `whatsapp:` ni el `+`, y `entrada` es `{ tipo: "texto", texto }` (con el texto recortado). Si falta `From`, o falta `Body` o está vacío, devuelve `null`.
```

```pista La suma de costos
Usa valores por defecto al desestructurar: `{ cuotaFija = 0, tarifaProveedor = 0, ... }`. Para redondear a 2 decimales: `Math.round(x * 100) / 100`.
```

```pista Orden de las reglas
Las reglas se evalúan de arriba abajo con `if ... return`. Si el cliente usa una librería no oficial, nada más importa: devuelves `"rechazar"` primero.
```

```pista Limpiar el número de Twilio
`form.From.replace("whatsapp:", "").replace("+", "")` deja solo los dígitos. Revisa `typeof form.Body === "string"` y que, ya recortado, no esté vacío.
```

```checks
[
 {"d": "`costoMensual` suma cuota, tarifa del proveedor y cobro de Meta", "h": "cuotaFija + tarifaProveedor*mensajes + tarifaMeta*plantillas.", "t": "return costoMensual({cuotaFija:50,tarifaProveedor:0.01,mensajes:1000,tarifaMeta:0.05,plantillas:100})===65"},
 {"d": "`costoMensual` trata los campos que faltan como cero y redondea", "h": "Usa valores por defecto `= 0` y `Math.round(x*100)/100`.", "t": "return costoMensual({})===0 && costoMensual({tarifaProveedor:0.005,mensajes:333})===1.67 && costoMensual({cuotaFija:49})===49"},
 {"d": "`recomendarOpcion` rechaza las librerías no oficiales antes que nada", "h": "Comprueba `usaLibreriaNoOficial` en la primera línea.", "t": "return recomendarOpcion({sabeProgramar:true,numClientes:1,quiereSoporte:false,usaLibreriaNoOficial:true})===\"rechazar\" && recomendarOpcion({sabeProgramar:false,usaLibreriaNoOficial:true})===\"rechazar\""},
 {"d": "`recomendarOpcion` manda a un BSP a quien no sabe programar", "h": "Si `sabeProgramar` es falso devuelve `\"bsp\"`.", "t": "return recomendarOpcion({sabeProgramar:false,numClientes:1,quiereSoporte:false,usaLibreriaNoOficial:false})===\"bsp\""},
 {"d": "`recomendarOpcion` elige BSP con soporte o con más de 5 clientes, y API directa en el resto", "h": "Más de 5 es `> 5`: exactamente 5 clientes todavía va a API directa.", "t": "return recomendarOpcion({sabeProgramar:true,numClientes:2,quiereSoporte:true,usaLibreriaNoOficial:false})===\"bsp\" && recomendarOpcion({sabeProgramar:true,numClientes:6,quiereSoporte:false,usaLibreriaNoOficial:false})===\"bsp\" && recomendarOpcion({sabeProgramar:true,numClientes:5,quiereSoporte:false,usaLibreriaNoOficial:false})===\"api-directa\""},
 {"d": "`riesgoDeBloqueo` clasifica las opciones", "h": "Un objeto con las claves y `?? \"desconocido\"` resuelve todo.", "t": "return riesgoDeBloqueo(\"api-directa\")===\"bajo\" && riesgoDeBloqueo(\"bsp\")===\"bajo\" && riesgoDeBloqueo(\"baileys\")===\"alto\" && riesgoDeBloqueo(\"whatsapp-web.js\")===\"alto\" && riesgoDeBloqueo(\"otra\")===\"desconocido\""},
 {"d": "`entradaDeTwilio` convierte un mensaje de Twilio en la entrada del motor", "h": "Quita `whatsapp:` y `+` de `From`; recorta `Body`.", "t": "var r=entradaDeTwilio({From:\"whatsapp:+51999000111\",To:\"whatsapp:+51999000222\",Body:\"  quiero 2 leches \"});return r!==null && r.de===\"51999000111\" && r.entrada.tipo===\"texto\" && r.entrada.texto===\"quiero 2 leches\""},
 {"d": "`entradaDeTwilio` devuelve `null` si falta el remitente o el texto", "h": "Revisa `From` y que `Body` sea texto no vacío después de recortar.", "t": "return entradaDeTwilio({Body:\"hola\"})===null && entradaDeTwilio({From:\"whatsapp:+51999000111\"})===null && entradaDeTwilio({From:\"whatsapp:+51999000111\",Body:\"   \"})===null && entradaDeTwilio(null)===null"}
]
```

```solucion funciones.js
function costoMensual({ cuotaFija = 0, tarifaProveedor = 0, mensajes = 0, tarifaMeta = 0, plantillas = 0 } = {}) {
  const total = cuotaFija + tarifaProveedor * mensajes + tarifaMeta * plantillas;
  return Math.round(total * 100) / 100;
}

function recomendarOpcion({ sabeProgramar, numClientes, quiereSoporte, usaLibreriaNoOficial }) {
  if (usaLibreriaNoOficial) return "rechazar";
  if (!sabeProgramar) return "bsp";
  if (quiereSoporte || numClientes > 5) return "bsp";
  return "api-directa";
}

const RIESGOS = {
  "api-directa": "bajo",
  "bsp": "bajo",
  "baileys": "alto",
  "whatsapp-web.js": "alto",
};

function riesgoDeBloqueo(opcion) {
  return RIESGOS[opcion] ?? "desconocido";
}

function entradaDeTwilio(form) {
  if (!form || typeof form.From !== "string" || typeof form.Body !== "string") return null;
  const texto = form.Body.trim();
  if (!texto) return null;
  const de = form.From.replace("whatsapp:", "").replace("+", "");
  return { de, entrada: { tipo: "texto", texto } };
}
```

> [!consejo] Reto extra
> Añade `salidaATwilio(para, respuesta)` que convierta una respuesta de tipo `texto` del motor en el cuerpo `{ To: "whatsapp:+<para>", Body: texto }`, y que lance un error para los demás tipos (explica en un comentario por qué los botones necesitan plantillas o contenido especial en ese proveedor: revisa su documentación antes de decidir).

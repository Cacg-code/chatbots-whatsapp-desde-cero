---
minutos: 50
nivel: avanzado
---
## Objetivo

Construir la **red de seguridad** que rodea a una IA en el bot del minimarket: extraer su respuesta, validarla, no dejarla inventar productos ni precios, decidir cuándo usarla y estimar su costo. Todo sin llamar a ningún proveedor: las funciones trabajan con el **texto que devolvería** la IA, así que las pruebas son gratis y repetibles.

### Cómo se trabaja

La **parte A** es una investigación y una práctica con el proveedor que prefieras (opcional: necesita cuenta y a veces tarjeta). La **parte B** son seis funciones de JavaScript puro que se comprueban en esta página. Imagina que la IA recibió el mensaje del cliente y se le pidió responder **solo** con un JSON como este: `{"intencion": "pedir_producto", "producto_id": "arroz", "confianza": 0.9}`.

Las intenciones permitidas son `pedir_producto`, `consultar_horario`, `consultar_delivery` y `hablar_con_persona`. Cualquier otra cosa debe tratarse como `desconocida`.

```pasos
Parte A. Elige un proveedor de IA (el que prefieras) y localiza en su documentación la página de **precios por tokens** y la de **salida estructurada / JSON**. Anota en `notas.md` el precio por millón de tokens de entrada y de salida del modelo más barato, con la fecha de hoy (Verifica este dato: cambia con frecuencia).
Parte A. Escribe en `notas.md` tres mensajes de clientes que tu bot de reglas no entiende hoy (por ejemplo, «algo para el desayuno de mis hijos») y la intención que le asignarías a cada uno. Será tu mini conjunto de pruebas.
Parte B. Escribe `extraerJSON(texto)`: la IA a veces responde con texto alrededor o dentro de un bloque de código. Devuelve el **primer objeto JSON** que encuentres como objeto de JavaScript, o `null` si no hay ninguno válido.
Parte B. Escribe `validarClasificacion(obj, permitidas, umbral)`: devuelve `obj.intencion` solo si es una de las `permitidas` y `obj.confianza` es un número mayor o igual que `umbral`. En cualquier otro caso devuelve `"desconocida"`.
Parte B. Escribe `productoDelCatalogo(id, productos)`: devuelve el producto cuyo `id` coincide exactamente, o `null` si la IA inventó un id que no existe.
Parte B. Escribe `textoPrecio(producto)`: arma la respuesta de precio **usando solo el catálogo**, con el formato `Arroz extra 1 kg cuesta S/ 4.20.` (dos decimales).
Parte B. Escribe `contienePrecio(texto)`: devuelve `true` si un texto escrito por la IA menciona un precio (por ejemplo `S/ 5`, `S/5.50` o `5 soles`). Se usará para **rechazar** cualquier texto libre de la IA que traiga cifras de dinero.
Parte B. Escribe `costoEstimado(llamadas, tokensEntrada, tokensSalida, precioEntradaPorMillon, precioSalidaPorMillon)`: devuelve el costo total (mismo tipo de moneda que los precios) de `llamadas` llamadas, cada una con esos tokens de entrada y salida.
```

```pista Primer objeto JSON
Busca la primera `{` y la última `}` con `indexOf` y `lastIndexOf`, corta ese fragmento y pásalo por `JSON.parse` dentro de un `try/catch`. Así funciona aunque haya texto o un bloque de código alrededor.
```

```pista Detectar precios
Una expresión regular como `/s\/\s*\d|\d+([.,]\d+)?\s*soles/i` cubre `S/ 5`, `S/5.50` y `5 soles`. Cuidado con el `\` de `S/` dentro de la expresión.
```

```pista Costo por millón de tokens
Si un precio es «por millón de tokens», el costo es `tokens / 1000000 * precio`. Suma entrada y salida, y multiplica por las llamadas.
```

```checks
[
 {"d": "`extraerJSON` lo rescata aunque venga con texto o bloque de código alrededor", "h": "Corta desde la primera `{` hasta la última `}` antes de hacer `JSON.parse`.", "t": "var t='Claro, aquí está:\\n```json\\n{\"intencion\":\"consultar_horario\",\"confianza\":0.8}\\n```\\nEspero que sirva.';var r=extraerJSON(t);return r!==null && r.intencion===\"consultar_horario\""},
 {"d": "`extraerJSON` devuelve `null` si no hay JSON válido", "h": "Atrapa el error de `JSON.parse` y devuelve `null`; también si no hay llaves.", "t": "return extraerJSON(\"no puedo ayudarte con eso\")===null && extraerJSON('{intencion: roto')===null && extraerJSON(\"\")===null"},
 {"d": "`validarClasificacion` acepta una intención permitida con buena confianza", "h": "Debe estar en `permitidas` y tener `confianza >= umbral`.", "t": "var p=[\"pedir_producto\",\"consultar_horario\"];return validarClasificacion({intencion:\"consultar_horario\",confianza:0.8},p,0.7)===\"consultar_horario\" && validarClasificacion({intencion:\"pedir_producto\",confianza:0.7},p,0.7)===\"pedir_producto\""},
 {"d": "`validarClasificacion` devuelve `desconocida` si no es permitida, si la confianza es baja o si faltan datos", "h": "Revisa también que `confianza` sea un número y que `obj` no sea `null`.", "t": "var p=[\"pedir_producto\"];return validarClasificacion({intencion:\"borrar_base_de_datos\",confianza:0.99},p,0.7)===\"desconocida\" && validarClasificacion({intencion:\"pedir_producto\",confianza:0.4},p,0.7)===\"desconocida\" && validarClasificacion({intencion:\"pedir_producto\",confianza:\"alta\"},p,0.7)===\"desconocida\" && validarClasificacion(null,p,0.7)===\"desconocida\" && validarClasificacion({intencion:\"pedir_producto\"},p,0.7)===\"desconocida\""},
 {"d": "`productoDelCatalogo` solo devuelve productos que existen", "h": "Usa `find` con igualdad estricta de `id` y devuelve `null` si no aparece.", "t": "var ps=[{id:\"arroz\",nombre:\"Arroz extra 1 kg\",precio:4.2},{id:\"leche\",nombre:\"Leche entera 1 L\",precio:4.3}];var a=productoDelCatalogo(\"arroz\",ps);return a!==null && a.nombre===\"Arroz extra 1 kg\" && productoDelCatalogo(\"caviar\",ps)===null && productoDelCatalogo(undefined,ps)===null"},
 {"d": "`textoPrecio` usa el precio del catálogo con dos decimales", "h": "`precio.toFixed(2)` da el formato correcto: `S/ 4.20`.", "t": "return textoPrecio({id:\"arroz\",nombre:\"Arroz extra 1 kg\",precio:4.2})===\"Arroz extra 1 kg cuesta S/ 4.20.\" && textoPrecio({id:\"aceite\",nombre:\"Aceite vegetal 1 L\",precio:9.5})===\"Aceite vegetal 1 L cuesta S/ 9.50.\""},
 {"d": "`contienePrecio` detecta precios y deja pasar textos sin cifras de dinero", "h": "Busca `S/` seguido de un número, o un número seguido de `soles`.", "t": "return contienePrecio(\"Cuesta S/ 5\")===true && contienePrecio(\"son S/5.50 por bolsa\")===true && contienePrecio(\"salen 5 soles\")===true && contienePrecio(\"Tenemos arroz y leche\")===false && contienePrecio(\"Atendemos hasta las 21 horas\")===false"},
 {"d": "`costoEstimado` calcula el costo con precios por millón de tokens", "h": "(entrada/1e6*precioEntrada + salida/1e6*precioSalida) * llamadas.", "t": "var c=costoEstimado(1000,300,50,0.5,2);var esperado=1000*(300/1e6*0.5+50/1e6*2);return Math.abs(c-esperado)<1e-9 && costoEstimado(0,300,50,0.5,2)===0"}
]
```

```solucion ia-red-de-seguridad.js
function extraerJSON(texto) {
  const t = String(texto == null ? "" : texto);
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a === -1 || b <= a) return null;
  try {
    const obj = JSON.parse(t.slice(a, b + 1));
    return obj && typeof obj === "object" ? obj : null;
  } catch (e) {
    return null;
  }
}

function validarClasificacion(obj, permitidas, umbral) {
  if (!obj || typeof obj !== "object") return "desconocida";
  if (!permitidas.includes(obj.intencion)) return "desconocida";
  if (typeof obj.confianza !== "number" || obj.confianza < umbral) return "desconocida";
  return obj.intencion;
}

function productoDelCatalogo(id, productos) {
  if (typeof id !== "string") return null;
  return productos.find((p) => p.id === id) || null;
}

function textoPrecio(producto) {
  return producto.nombre + " cuesta S/ " + producto.precio.toFixed(2) + ".";
}

function contienePrecio(texto) {
  return /s\/\s*\d|\d+([.,]\d+)?\s*soles/i.test(String(texto));
}

function costoEstimado(llamadas, tokensEntrada, tokensSalida, precioEntradaPorMillon, precioSalidaPorMillon) {
  const porLlamada = (tokensEntrada / 1e6) * precioEntradaPorMillon + (tokensSalida / 1e6) * precioSalidaPorMillon;
  return porLlamada * llamadas;
}
```

> [!consejo] Reto extra
> Escribe `decidirCamino(intencionReglas, claseIA)`: si las reglas ya entendieron (`intencionReglas` distinta de `"desconocida"`) devuelve `"reglas"` sin consultar a la IA; si no, devuelve `"ia"` cuando la clasificación sea válida y `"humano"` cuando también la IA dé `"desconocida"`. Esa función es el corazón del diseño «reglas primero, IA de respaldo».

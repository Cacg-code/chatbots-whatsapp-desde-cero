---
minutos: 45
nivel: intermedio
---
## Objetivo

Validar una plantilla antes de mandarla a revisión, construir el arreglo de variables a partir de un pedido y comprobar los límites de los botones de respuesta rápida, todo con funciones puras que se comprueban en el navegador.

### Cómo se trabaja

La **parte A** se hace con la documentación de Meta y tu cuenta de pruebas (sin enviar nada a clientes reales). La **parte B** son funciones de JavaScript puro. Los límites que usamos (cuerpo de 1024 caracteres, botón de 25, hasta 10 botones de respuesta rápida) vienen de la documentación; **verifica** que sigan vigentes cuando trabajes con una cuenta real.

```pasos
Parte A. Abre en la documentación oficial de Meta la guía de plantillas y anota en `notas.md` las tres categorías y para qué sirve cada una.
Parte A. Redacta en `notas.md` tres plantillas del minimarket (confirmación de pedido, pedido en camino, promoción de fin de semana). Para cada una indica la categoría que crees que le tocará y por qué.
Parte A. Si tienes cuenta de pruebas de WhatsApp, crea una plantilla de utilidad en el panel de plantillas (o con la API) y observa su estado de revisión. No la envíes a nadie que no sea tu propio número de prueba.
Parte B. Escribe `contarVariables(texto)`: devuelve cuántas variables posicionales distintas tiene el texto (`{{1}}`, `{{2}}`...). Si los números no son consecutivos desde 1 (por ejemplo `{{1}}` y `{{3}}`), lanza un `Error`. Una variable repetida cuenta una sola vez.
Parte B. Escribe `nombreValido(nombre)`: `true` solo si tiene letras minúsculas sin tilde, números y guiones bajos, entre 1 y 512 caracteres.
Parte B. Escribe `validarPlantilla(def)`: `def` es `{ nombre, cuerpo, botones: [textos] }`. Devuelve un arreglo de problemas (texto); vacío si todo está bien. Reglas: nombre válido, cuerpo de 1 a 1024 caracteres, variables consecutivas, hasta 10 botones y cada texto de botón de 1 a 25 caracteres.
Parte B. Escribe `variablesDePedido(pedido)`: devuelve `[pedido.id, "S/ " + total con 2 decimales]`, que serán `{{1}}` y `{{2}}`.
```

```pista Encontrar las variables
Con `texto.match(...)` y una expresión regular global que busque dos llaves, dígitos y dos llaves obtienes todas las apariciones. Saca los números, quita repetidos con `new Set(...)`, ordénalos y comprueba que sean 1, 2, 3... sin saltos.
```

```pista Nombre válido
Una expresión regular con letras a-z minúsculas, dígitos y guion bajo (con `+`, entre `^` y `$`), más la comprobación del largo, resuelve todo. Las tildes y mayúsculas no pasan.
```

```pista Formato de soles
`pedido.total.toFixed(2)` da dos decimales: `8.6` se vuelve `"8.60"`.
```

```checks
[
 {"d": "`contarVariables` cuenta variables distintas", "h": "Extrae los números dentro de las llaves dobles y cuenta los distintos.", "t": "return contarVariables(\"Hola {{1}}, total {{2}}\")===2 && contarVariables(\"sin variables\")===0 && contarVariables(\"{{1}} y otra vez {{1}}\")===1"},
 {"d": "`contarVariables` lanza error si faltan números", "h": "Con {{1}} y {{3}} falta la 2: lanza un Error.", "t": "try{contarVariables(\"{{1}} y {{3}}\");return false}catch(e){return e instanceof Error}"},
 {"d": "`nombreValido` acepta minúsculas, números y guiones bajos", "h": "Expresión regular con a-z, 0-9 y guion bajo.", "t": "return nombreValido(\"recordatorio_pedido\")===true && nombreValido(\"promo_2\")===true"},
 {"d": "`nombreValido` rechaza mayúsculas, espacios, tildes y vacío", "h": "Cualquier otro carácter lo invalida, y el nombre no puede estar vacío.", "t": "return nombreValido(\"Promo\")===false && nombreValido(\"mi plantilla\")===false && nombreValido(\"confirmación\")===false && nombreValido(\"\")===false && nombreValido(\"a\".repeat(513))===false"},
 {"d": "`validarPlantilla` devuelve un arreglo vacío si todo está bien", "h": "Si no hay problemas, devuelve [] (no null ni false).", "t": "var r=validarPlantilla({nombre:\"recordatorio_pedido\",cuerpo:\"Tu pedido {{1}} suma {{2}}.\",botones:[\"Confirmar\",\"Cambiar pedido\"]});return Array.isArray(r) && r.length===0"},
 {"d": "`validarPlantilla` detecta nombre inválido y cuerpo vacío", "h": "Agrega un texto al arreglo por cada regla incumplida.", "t": "var r=validarPlantilla({nombre:\"Mala Plantilla\",cuerpo:\"\",botones:[]});return r.length>=2"},
 {"d": "`validarPlantilla` detecta botones largos, demasiados botones y variables salteadas", "h": "Botón de máximo 25 caracteres, máximo 10 botones, variables consecutivas.", "t": "var largo=validarPlantilla({nombre:\"a\",cuerpo:\"hola\",botones:[\"x\".repeat(26)]});var muchos=validarPlantilla({nombre:\"a\",cuerpo:\"hola\",botones:Array(11).fill(\"ok\")});var salto=validarPlantilla({nombre:\"a\",cuerpo:\"{{1}} {{3}}\",botones:[]});return largo.length===1 && muchos.length===1 && salto.length===1"},
 {"d": "`variablesDePedido` devuelve id y total en soles", "h": "El segundo valor es \"S/ \" más total.toFixed(2).", "t": "var v=variablesDePedido({id:\"LE-1\",total:8.6});return v.length===2 && v[0]===\"LE-1\" && v[1]===\"S/ 8.60\""}
]
```

```solucion funciones.js
function contarVariables(texto) {
  const hallados = texto.match(/\{\{(\d+)\}\}/g) ?? [];
  const numeros = [...new Set(hallados.map((h) => Number(h.slice(2, -2))))].sort((a, b) => a - b);
  numeros.forEach((n, i) => {
    if (n !== i + 1) throw new Error("Las variables deben ser consecutivas desde {{1}}");
  });
  return numeros.length;
}

function nombreValido(nombre) {
  return typeof nombre === "string" && nombre.length >= 1 && nombre.length <= 512 && /^[a-z0-9_]+$/.test(nombre);
}

function validarPlantilla(def) {
  const problemas = [];
  if (!nombreValido(def.nombre)) problemas.push("Nombre inválido: solo minúsculas sin tilde, números y guion bajo");
  if (!def.cuerpo || def.cuerpo.length > 1024) problemas.push("El cuerpo debe tener entre 1 y 1024 caracteres");
  try { contarVariables(def.cuerpo ?? ""); } catch (e) { problemas.push(e.message); }
  const botones = def.botones ?? [];
  if (botones.length > 10) problemas.push("Máximo 10 botones");
  for (const b of botones) {
    if (!b || b.length > 25) problemas.push(`Texto de botón de 1 a 25 caracteres: "${b}"`);
  }
  return problemas;
}

function variablesDePedido(pedido) {
  return [pedido.id, "S/ " + pedido.total.toFixed(2)];
}
```

> [!consejo] Reto extra
> Haz que `validarPlantilla` también avise cuando el cuerpo empieza o termina con una variable (Meta suele rechazar plantillas así: **verifica** la regla vigente en la documentación) y cuando hay más variables que ejemplos disponibles.

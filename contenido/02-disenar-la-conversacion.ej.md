---
minutos: 45
nivel: básico
---
## Objetivo

Convertir las reglas de WhatsApp para mensajes interactivos en **funciones puras** que tu bot usará siempre antes de enviar un menú: recortar títulos, validar botones y listas, y generar la versión de texto de un menú.

### Cómo se trabaja

La **parte A** es de papel: diseñas la conversación de un negocio antes de tocar código. La **parte B** son cuatro funciones de JavaScript puro que se comprueban en esta página. Los límites están en la lección (3 botones, 20 caracteres por título de botón, 10 filas, 24 caracteres por título de fila). Meta puede cambiarlos: por eso conviene guardarlos en constantes que se modifican en un solo lugar.

```pasos
Parte A. Elige un negocio (el de la tabla de la lección u otro que conozcas) y escribe en `diseno.md`: 3 cosas que el bot **sí** hará, 2 que **no** hará, el tono (tuteo o usted) y la frase exacta del mensaje de bienvenida.
Parte A. Dibuja en `diseno.md` el mapa de estados de tu bot como tabla: estado, qué dice el bot, qué entradas acepta y a qué estado pasa.
Parte B. Escribe `recortarTitulo(texto, max)`: quita espacios sobrantes en los extremos; si el texto cabe, lo devuelve igual; si no, lo corta para que el resultado no pase de `max` caracteres, terminando en `…` (un solo carácter).
Parte B. Escribe `validarBotones(botones)`: recibe un array de `{ id, titulo }` y devuelve `{ ok, errores }`, donde `errores` es un array de textos. Reglas: entre 1 y 3 botones, cada botón con `id` y `titulo`, títulos de máximo 20 caracteres e `id` sin repetir.
Parte B. Escribe `validarLista(filas)`: igual que la anterior pero para filas `{ id, titulo }`: entre 1 y 10 filas y títulos de máximo 24 caracteres.
Parte B. Escribe `menuATexto(opciones)`: recibe un array de textos y devuelve el menú numerado, una opción por línea: `"1. Ver catálogo\n2. Horario"`. Con un array vacío devuelve `""`. Es la versión de respaldo cuando no puedes usar botones.
```

```pista Recortar sin pasarte
Si el texto es más largo que `max`, toma `texto.slice(0, max - 1)` y añade `"…"`: así el total es `max`. Si el recorte deja un espacio al final, quítalo con `trimEnd()` (el resultado mide `max` o un carácter menos, y la prueba lo admite).
```

```pista Acumular errores
Crea `const errores = []`, ve añadiendo textos con `push` y al final devuelve `{ ok: errores.length === 0, errores }`. Si el array de entrada no existe o está vacío, devuelve el error enseguida con `return`.
```

```pista Detectar ids repetidos
Un `Set` ayuda: `const vistos = new Set()`; si `vistos.has(b.id)` ya había uno igual, anota el error; si no, `vistos.add(b.id)`.
```

```pista Numerar opciones
`opciones.map((o, i) => (i + 1) + ". " + o).join("\n")` hace casi todo el trabajo.
```

```checks
[
 {"d": "`recortarTitulo` deja igual un texto que cabe", "h": "Si `texto.length <= max`, devuélvelo (sin espacios en los extremos).", "t": "return typeof recortarTitulo === 'function' && recortarTitulo('Horario', 20)==='Horario' && recortarTitulo('  Ayuda  ', 20)==='Ayuda'"},
 {"d": "`recortarTitulo` corta y añade `…` sin pasarse del máximo", "h": "Usa `slice(0, max - 1)` y suma `'…'`.", "t": "var r=recortarTitulo('Ver catálogo completo de productos', 20);return r.length<=20 && r.length>=19 && r.endsWith('…') && r.startsWith('Ver catálogo comple')"},
 {"d": "`validarBotones` acepta 1 a 3 botones correctos", "h": "Devuelve `{ ok: true, errores: [] }` cuando todo está bien.", "t": "var r=validarBotones([{id:'a',titulo:'Horario'},{id:'b',titulo:'Dirección'},{id:'c',titulo:'Ayuda'}]);return r.ok===true && Array.isArray(r.errores) && r.errores.length===0"},
 {"d": "`validarBotones` rechaza más de 3 botones o ninguno", "h": "Revisa `botones.length > 3` y también el caso de array vacío o no array.", "t": "var cuatro=[1,2,3,4].map(function(n){return {id:'i'+n,titulo:'T'+n}});return validarBotones(cuatro).ok===false && validarBotones([]).ok===false && validarBotones(null).ok===false"},
 {"d": "`validarBotones` rechaza títulos de más de 20 caracteres", "h": "Compara `titulo.length` con 20; 20 exactos sí es válido.", "t": "var largo='a'.repeat(21), justo='a'.repeat(20);return validarBotones([{id:'x',titulo:largo}]).ok===false && validarBotones([{id:'x',titulo:justo}]).ok===true"},
 {"d": "`validarBotones` detecta ids repetidos y botones sin id o título", "h": "Usa un `Set` para los ids; revisa que `id` y `titulo` existan.", "t": "return validarBotones([{id:'a',titulo:'Uno'},{id:'a',titulo:'Dos'}]).ok===false && validarBotones([{titulo:'Sin id'}]).ok===false && validarBotones([{id:'z'}]).ok===false"},
 {"d": "`validarBotones` explica cada problema con un texto en `errores`", "h": "Si hay dos fallos distintos, `errores` debe tener al menos 2 textos.", "t": "var cuatro=[1,2,3,4].map(function(n){return {id:'i'+n,titulo:n===1?'a'.repeat(30):'T'}});var r=validarBotones(cuatro);return r.errores.length>=2 && r.errores.every(function(e){return typeof e==='string' && e.length>0})"},
 {"d": "`validarLista` permite hasta 10 filas con títulos de hasta 24 caracteres", "h": "Los límites son 10 filas y 24 caracteres.", "t": "var diez=[1,2,3,4,5,6,7,8,9,10].map(function(n){return {id:'f'+n,titulo:'a'.repeat(24)}});return validarLista(diez).ok===true && validarLista(diez.concat([{id:'f11',titulo:'x'}])).ok===false && validarLista([{id:'f',titulo:'a'.repeat(25)}]).ok===false && validarLista([]).ok===false"},
 {"d": "`menuATexto` numera las opciones una por línea", "h": "Une con salto de línea las líneas `1. texto`.", "t": "return menuATexto(['Ver catálogo','Horario'])==='1. Ver catálogo\\n2. Horario' && menuATexto([])===''"}
]
```

```solucion mensajes.js
const MAX_BOTONES = 3;
const MAX_TITULO_BOTON = 20;
const MAX_FILAS = 10;
const MAX_TITULO_FILA = 24;

function recortarTitulo(texto, max) {
  const limpio = String(texto ?? "").trim();
  if (limpio.length <= max) return limpio;
  return limpio.slice(0, max - 1).trimEnd() + "…";
}

function validarBotones(botones) {
  const errores = [];
  if (!Array.isArray(botones) || botones.length === 0) {
    return { ok: false, errores: ["Debe haber al menos 1 botón"] };
  }
  if (botones.length > MAX_BOTONES) errores.push("Máximo " + MAX_BOTONES + " botones");
  const vistos = new Set();
  for (const b of botones) {
    const id = b && b.id;
    const titulo = b && b.titulo;
    if (!id) errores.push("Cada botón necesita un id");
    else if (vistos.has(id)) errores.push("Id repetido: " + id);
    else vistos.add(id);
    if (!titulo || String(titulo).trim() === "") errores.push("Cada botón necesita un título");
    else if (String(titulo).length > MAX_TITULO_BOTON) {
      errores.push('El título "' + titulo + '" supera ' + MAX_TITULO_BOTON + " caracteres");
    }
  }
  return { ok: errores.length === 0, errores };
}

function validarLista(filas) {
  const errores = [];
  if (!Array.isArray(filas) || filas.length === 0) {
    return { ok: false, errores: ["Debe haber al menos 1 fila"] };
  }
  if (filas.length > MAX_FILAS) errores.push("Máximo " + MAX_FILAS + " filas");
  for (const f of filas) {
    if (f && f.titulo && String(f.titulo).length > MAX_TITULO_FILA) {
      errores.push('El título "' + f.titulo + '" supera ' + MAX_TITULO_FILA + " caracteres");
    }
  }
  return { ok: errores.length === 0, errores };
}

function menuATexto(opciones) {
  return (opciones ?? []).map((o, i) => (i + 1) + ". " + o).join("\n");
}
```

> [!consejo] Reto extra
> Escribe `botonesOLista(opciones)`: si hay 3 opciones o menos devuelve `"botones"`, si hay entre 4 y 10 devuelve `"lista"` y si hay más devuelve `"texto"`. Es la decisión que tomará tu bot cuando un menú crezca.

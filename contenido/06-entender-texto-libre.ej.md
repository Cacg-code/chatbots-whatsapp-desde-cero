---
minutos: 50
nivel: intermedio
---
## Objetivo

Construir una versión reducida de `src/texto.js`: normalizar lo que escribe el cliente, extraer cantidades, buscar productos por sinónimos y detectar la intención de un mensaje. Son las herramientas con las que el bot entiende «quiero dos leches» sin necesitar inteligencia artificial.

### Cómo se trabaja

La **parte A** se hace en tu terminal con el código de referencia; la **parte B** son cuatro funciones de JavaScript puro que se comprueban en esta página. Trabajas con textos cortos del minimarket y con un catálogo de tres productos que las comprobaciones te pasan como argumento.

Reglas que debes implementar:

- `normalizar`: minúsculas, sin tildes, todo lo que no sea letra o número se vuelve espacio, espacios colapsados y recortados. Si no recibe un texto, devuelve `""`.
- `extraerCantidad`: busca el primer número escrito en cifras (`2`) o en palabras (`un`, `uno`, `una`, `dos`, `tres`, `cuatro`, `cinco`, `seis`, `diez`). `media docena` vale 6; `docena` multiplica por 12 (`dos docenas` son 24; `una docena` son 12; `docena` sola son 12). Si no hay nada, devuelve 1.
- `buscarProductos(texto, productos)`: cada producto tiene `id` y `sinonimos` (frases ya normalizadas). Una frase coincide solo si **todas** sus palabras aparecen en lo escrito (se acepta el plural simple con `s` o `es`). Gana la frase con más palabras; si hay empate, se devuelven todos los ids empatados.
- `detectarIntencion`: tabla de frases por intención, probadas en este orden: `cancelar`, `humano`, `horario`, `catalogo`, `confirmar`, `saludo`. Se buscan **palabras completas**. `confirmar` y `saludo` solo valen si el mensaje tiene 4 palabras o menos. Si nada coincide, `"desconocida"`.

| Intención | Frases |
|---|---|
| `cancelar` | `cancelar`, `ya no quiero` |
| `humano` | `persona`, `asesor` |
| `horario` | `horario`, `a que hora` |
| `catalogo` | `catalogo`, `que venden` |
| `confirmar` | `si`, `ok`, `listo` |
| `saludo` | `hola`, `buenas` |

```pasos
Parte A. En `codigo/` crea un script `probar-texto.mjs` que importe `buscarProductos` de `src/texto.js` y `PRODUCTOS` de `src/catalogo.js`, y pruébalo con cinco frases tuyas (con errores de tipeo, plurales y sinónimos como «papitas» o «tallarines»). Anota en `notas.md` cuáles funcionaron y cuáles no.
Parte A. Busca una frase que el bot real **no** entienda y piensa qué sinónimo agregarías al catálogo para resolverlo (los sinónimos están en `src/catalogo.js`).
Parte B. Escribe `normalizar(texto)` según las reglas.
Parte B. Escribe `extraerCantidad(texto)` (usa `normalizar` primero).
Parte B. Escribe `buscarProductos(texto, productos)` que devuelva un arreglo de ids.
Parte B. Escribe `detectarIntencion(texto)` con la tabla de frases y la regla de los mensajes cortos.
```

```pista Quitar tildes
`texto.normalize("NFD")` separa cada letra de su tilde. Luego `.replace(/[̀-ͯ]/g, "")` borra las tildes sueltas. Después reemplaza lo que no sea `a-z`, `0-9` o espacio por un espacio.
```

```pista Palabras completas, no pedazos
Para saber si una frase aparece como palabras completas, rodea el texto con espacios y busca la frase también rodeada de espacios: `(" " + t + " ").includes(" " + frase + " ")`. Así `si` no coincide dentro de `simple`.
```

```pista Buscar productos
Divide lo escrito con `split(" ")`. Para cada sinónimo, divídelo en palabras y verifica con `every` que cada una esté en lo escrito (igual, o con `s`/`es` al final). El puntaje es el número de palabras de la frase; guarda el máximo y los ids que lo alcanzan.
```

```checks
[
 {"d": "`normalizar` pasa a minúsculas, quita tildes y signos", "h": "Usa toLowerCase, normalize(\"NFD\") y reemplaza lo que no sea letra o número por espacio.", "t": "return normalizar('¡Quiero DOS Leches!')==='quiero dos leches' && normalizar('  Atún   en LATA  ')==='atun en lata' && normalizar('Azúcar')==='azucar'"},
 {"d": "`normalizar` devuelve cadena vacía si no recibe texto", "h": "Comprueba `typeof texto !== \"string\"` al inicio.", "t": "return normalizar(null)==='' && normalizar(undefined)==='' && normalizar(42)==='' && normalizar('')===''"},
 {"d": "`extraerCantidad` entiende cifras y palabras", "h": "Recorre las palabras normalizadas: si es solo dígitos usa Number; si está en el diccionario de palabras, usa su valor.", "t": "return extraerCantidad('2 leches')===2 && extraerCantidad('dos leches')===2 && extraerCantidad('quiero tres panes')===3 && extraerCantidad('10 pan frances')===10 && extraerCantidad('una gaseosa')===1"},
 {"d": "`extraerCantidad` entiende docenas y devuelve 1 si no hay número", "h": "`media docena` es 6; `docena` multiplica por 12 (por defecto 1 docena).", "t": "return extraerCantidad('media docena de huevos')===6 && extraerCantidad('una docena de huevos')===12 && extraerCantidad('dos docenas de huevos')===24 && extraerCantidad('docena de huevos')===12 && extraerCantidad('quiero leche')===1"},
 {"d": "`buscarProductos` encuentra por sinónimo, con plural", "h": "Cada palabra de la frase del catálogo debe estar en lo escrito; acepta `s` o `es` al final.", "t": "var P=[{id:'leche',sinonimos:['leche','leche entera']},{id:'arroz',sinonimos:['arroz']},{id:'papas',sinonimos:['papas fritas','papitas']}];return JSON.stringify(buscarProductos('quiero 2 leches',P))==='[\"leche\"]' && JSON.stringify(buscarProductos('un arroz',P))==='[\"arroz\"]' && JSON.stringify(buscarProductos('papitas',P))==='[\"papas\"]' && buscarProductos('quiero un carro',P).length===0"},
 {"d": "`buscarProductos` prefiere la frase más específica", "h": "Compara el número de palabras que coincidieron y quédate con el máximo.", "t": "var P=[{id:'agua',sinonimos:['agua']},{id:'agua-gas',sinonimos:['agua con gas']}];return JSON.stringify(buscarProductos('agua con gas',P))==='[\"agua-gas\"]' && JSON.stringify(buscarProductos('un agua',P))==='[\"agua\"]'"},
 {"d": "`buscarProductos` devuelve todos los empatados si hay ambigüedad", "h": "Si dos productos alcanzan el mismo puntaje máximo, devuelve ambos ids.", "t": "var P=[{id:'cola',sinonimos:['gaseosa','gaseosa cola','cola']},{id:'naranja',sinonimos:['gaseosa','gaseosa naranja','naranja']}];var r=buscarProductos('2 gaseosas',P);return r.length===2 && r.indexOf('cola')>=0 && r.indexOf('naranja')>=0 && JSON.stringify(buscarProductos('gaseosa naranja',P))==='[\"naranja\"]'"},
 {"d": "`detectarIntencion` reconoce las intenciones de la tabla", "h": "Normaliza y busca cada frase como palabras completas, en el orden indicado.", "t": "return detectarIntencion('Hola!')==='saludo' && detectarIntencion('quiero hablar con una persona')==='humano' && detectarIntencion('A qué hora cierran')==='horario' && detectarIntencion('qué venden')==='catalogo' && detectarIntencion('quiero cancelar')==='cancelar' && detectarIntencion('ya no quiero')==='cancelar'"},
 {"d": "`detectarIntencion` solo acepta `confirmar` y `saludo` en mensajes cortos, y busca palabras completas", "h": "Si el mensaje tiene más de 4 palabras, sáltate `confirmar` y `saludo`. Y `si` no debe coincidir dentro de `simple`.", "t": "return detectarIntencion('si')==='confirmar' && detectarIntencion('ok listo')==='confirmar' && detectarIntencion('si quiero dos leches y un arroz')==='desconocida' && detectarIntencion('es simple')==='desconocida' && detectarIntencion('')==='desconocida' && detectarIntencion('asdf')==='desconocida'"}
]
```

```solucion texto.js
function normalizar(texto) {
  if (typeof texto !== "string") return "";
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NUMEROS = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, diez: 10 };

function extraerCantidad(texto) {
  const t = normalizar(texto);
  if (/\bmedia docena\b/.test(t)) return 6;
  let n = null;
  for (const palabra of t.split(" ")) {
    if (/^\d+$/.test(palabra)) { n = Number(palabra); break; }
    if (palabra in NUMEROS) { n = NUMEROS[palabra]; break; }
  }
  if (/\bdocenas?\b/.test(t)) return (n ?? 1) * 12;
  return n ?? 1;
}

function mismaPalabra(escrita, deCatalogo) {
  return escrita === deCatalogo || escrita === deCatalogo + "s" || escrita === deCatalogo + "es";
}

function buscarProductos(texto, productos) {
  const escritas = normalizar(texto).split(" ").filter(Boolean);
  let mejor = 0;
  let ids = [];
  for (const producto of productos) {
    let puntaje = 0;
    for (const frase of producto.sinonimos) {
      const palabras = frase.split(" ");
      const coincide = palabras.every((p) => escritas.some((e) => mismaPalabra(e, p)));
      if (coincide) puntaje = Math.max(puntaje, palabras.length);
    }
    if (puntaje === 0) continue;
    if (puntaje > mejor) { mejor = puntaje; ids = [producto.id]; }
    else if (puntaje === mejor) ids.push(producto.id);
  }
  return ids;
}

const FRASES = {
  cancelar: ["cancelar", "ya no quiero"],
  humano: ["persona", "asesor"],
  horario: ["horario", "a que hora"],
  catalogo: ["catalogo", "que venden"],
  confirmar: ["si", "ok", "listo"],
  saludo: ["hola", "buenas"],
};
const ORDEN = ["cancelar", "humano", "horario", "catalogo", "confirmar", "saludo"];
const SOLO_CORTOS = ["confirmar", "saludo"];

function detectarIntencion(texto) {
  const t = normalizar(texto);
  if (!t) return "desconocida";
  const palabras = t.split(" ").length;
  for (const intencion of ORDEN) {
    if (SOLO_CORTOS.includes(intencion) && palabras > 4) continue;
    if (FRASES[intencion].some((f) => (" " + t + " ").includes(" " + f + " "))) return intencion;
  }
  return "desconocida";
}
```

> [!consejo] Reto extra
> Añade tolerancia a errores de tipeo con la distancia de Levenshtein: acepta que «mantequila» coincida con «mantequilla», pero **solo** en palabras de 5 letras o más, para no confundir «sal» con «sol». Compara tu resultado con `buscarProductos` de `src/texto.js`.

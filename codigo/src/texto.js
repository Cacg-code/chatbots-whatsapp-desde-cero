// Herramientas para entender texto libre escrito por el cliente.
// Todo son funciones puras: mismo texto de entrada, misma salida.

/** "  ¡Quiero DOS Leches!  " -> "quiero dos leches" */
export function normalizar(texto) {
  if (typeof texto !== 'string') return '';
  return texto
    .toLowerCase()
    .normalize('NFD') // separa la letra de su tilde: "é" -> "e" + "´"
    .replace(/[̀-ͯ]/g, '') // borra las tildes sueltas
    .replace(/[^a-z0-9\s]/g, ' ') // signos y emojis -> espacio
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------- Cantidades ----------

const NUMEROS_EN_PALABRAS = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
  ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14,
  quince: 15, veinte: 20,
};

/**
 * Cantidad que pide el cliente en una frase. Si no dice nada, es 1.
 * "2 leches" -> 2, "dos leches" -> 2, "media docena de huevos" -> 6, "una docena" -> 12
 */
export function extraerCantidad(texto) {
  const t = normalizar(texto);
  if (/\bmedia docena\b/.test(t)) return 6;
  let n = null;
  for (const palabra of t.split(' ')) {
    if (/^\d+$/.test(palabra)) { n = Number(palabra); break; }
    if (palabra in NUMEROS_EN_PALABRAS) { n = NUMEROS_EN_PALABRAS[palabra]; break; }
  }
  if (/\bdocenas?\b/.test(t)) return (n ?? 1) * 12;
  return n ?? 1;
}

/** Si el texto es SOLO un número ("3" o "tres") lo devuelve; si no, null. */
export function cantidadSola(texto) {
  const t = normalizar(texto);
  if (/^\d+$/.test(t)) return Number(t);
  if (t in NUMEROS_EN_PALABRAS) return NUMEROS_EN_PALABRAS[t];
  return null;
}

// ---------- Búsqueda de productos ----------

// Palabras que no ayudan a identificar un producto.
const RELLENO = new Set([
  'quiero', 'quisiera', 'dame', 'deme', 'necesito', 'agrega', 'agregar', 'anade',
  'anadir', 'pon', 'ponme', 'de', 'del', 'el', 'la', 'los', 'las', 'un', 'una',
  'uno', 'unos', 'unas', 'por', 'favor', 'me', 'mas', 'y', 'al', 'otro', 'otra', 'hola',
]);

/** Distancia de Levenshtein: cuántas letras hay que cambiar, borrar o añadir para pasar de a a b. */
export function levenshtein(a, b) {
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let anterior = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const guardado = fila[j];
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, anterior + costo);
      anterior = guardado;
    }
  }
  return fila[b.length];
}

function palabrasUtiles(texto) {
  return normalizar(texto).split(' ').filter((p) => p && !RELLENO.has(p));
}

// ¿La palabra escrita por el cliente equivale a la palabra del catálogo?
function mismaPalabra(escrita, deCatalogo) {
  if (escrita === deCatalogo) return true;
  if (escrita === deCatalogo + 's' || escrita === deCatalogo + 'es') return true; // plural simple
  if (deCatalogo.endsWith('z') && escrita === deCatalogo.slice(0, -1) + 'ces') return true; // arroz -> arroces
  // Un error tipográfico (1 letra) se tolera solo en palabras largas, para no confundir "sal" con "sol".
  return escrita.length >= 5 && deCatalogo.length >= 5 && levenshtein(escrita, deCatalogo) <= 1;
}

// Cuántas palabras de la frase del catálogo aparecen en lo escrito (0 si falta alguna).
function puntajeFrase(palabrasEscritas, frase) {
  const palabras = palabrasUtiles(frase);
  if (palabras.length === 0) return 0;
  const libres = [...palabrasEscritas];
  for (const palabra of palabras) {
    const i = libres.findIndex((e) => mismaPalabra(e, palabra));
    if (i === -1) return 0;
    libres.splice(i, 1); // cada palabra escrita se usa una sola vez
  }
  return palabras.length;
}

/**
 * Devuelve los productos que mejor coinciden con el texto (lista vacía si ninguno).
 * Gana la frase más específica: "agua con gas" vence a "agua".
 * Si hay empate se devuelven todos y el bot le pregunta al cliente cuál quiere.
 */
export function buscarProductos(texto, productos) {
  const escritas = palabrasUtiles(texto);
  let mejor = 0;
  let ganadores = [];
  for (const producto of productos) {
    const puntaje = Math.max(0, ...producto.sinonimos.map((s) => puntajeFrase(escritas, s)));
    if (puntaje === 0) continue;
    if (puntaje > mejor) { mejor = puntaje; ganadores = [producto]; }
    else if (puntaje === mejor) ganadores.push(producto);
  }
  return ganadores;
}

/**
 * Parte un mensaje con varios pedidos: "2 leches y media docena de huevos"
 * -> [{ cantidad: 2, productos: [leche] }, { cantidad: 6, productos: [huevo] }]
 */
export function separarPedidos(texto, productos) {
  return String(texto)
    .split(/,|\+|\s+y\s+|\s+e\s+/i)
    .map((trozo) => ({ cantidad: extraerCantidad(trozo), productos: buscarProductos(trozo, productos) }))
    .filter((p) => p.productos.length > 0);
}

// ---------- Intención ----------

// Cada intención es una lista de frases. Se buscan palabras completas, no pedazos.
const FRASES = {
  cancelar: ['cancelar', 'cancela', 'cancelo', 'anular', 'anula', 'salir', 'olvidalo', 'ya no quiero', 'no quiero nada'],
  humano: ['persona', 'humano', 'asesor', 'agente', 'encargado', 'operador', 'dueno', 'atencion al cliente', 'hablar con alguien'],
  horario: ['horario', 'horarios', 'a que hora', 'abren', 'cierran', 'atienden', 'direccion', 'ubicacion', 'donde estan'],
  carrito: ['carrito', 'mi pedido', 'ver pedido', 'que llevo', 'cuanto es', 'mi cuenta'],
  catalogo: ['catalogo', 'productos', 'precios', 'que venden', 'que tienen', 'que hay', 'hacer pedido', 'hacer un pedido', 'pedir', 'comprar'],
  menu: ['menu', 'opciones', 'inicio', 'empezar'],
  ayuda: ['ayuda', 'ayudame', 'help', 'como funciona', 'no entiendo'],
  // "confirmar" y "saludo" solo valen en mensajes cortos: "si quiero 2 leches" NO es una confirmación.
  confirmar: ['confirmar', 'confirmo', 'confirmado', 'si', 'ok', 'dale', 'listo', 'acepto', 'correcto', 'finalizar', 'terminar', 'eso es todo', 'nada mas'],
  saludo: ['hola', 'holaa', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'hi', 'ola'],
};
const SOLO_CORTOS = new Set(['confirmar', 'saludo']);
const ORDEN = ['cancelar', 'humano', 'horario', 'carrito', 'catalogo', 'menu', 'ayuda', 'confirmar', 'saludo'];

function contiene(textoNormalizado, frase) {
  return ` ${textoNormalizado} `.includes(` ${frase} `);
}

/** 'saludo' | 'menu' | 'catalogo' | 'carrito' | 'confirmar' | 'cancelar' | 'ayuda' | 'humano' | 'horario' | 'desconocida' */
export function detectarIntencion(texto) {
  const t = normalizar(texto);
  if (!t) return 'desconocida';
  const cantidadPalabras = t.split(' ').length;
  for (const intencion of ORDEN) {
    if (SOLO_CORTOS.has(intencion) && cantidadPalabras > 4) continue;
    if (FRASES[intencion].some((frase) => contiene(t, frase))) return intencion;
  }
  return 'desconocida';
}

/** ¿El texto menciona alguna de estas frases? (útil para entrega y pago) */
export function mencionaAlguna(texto, frases) {
  const t = normalizar(texto);
  return frases.some((f) => contiene(t, f));
}

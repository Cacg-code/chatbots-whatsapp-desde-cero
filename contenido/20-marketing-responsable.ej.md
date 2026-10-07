---
minutos: 45
nivel: intermedio
---
## Objetivo

Construir las tres piezas que protegen a tu minimarket del spam: registrar el opt-in, reconocer la baja y decidir si un cliente puede recibir una promoción hoy.

### Cómo se trabaja

La **parte A** es de diseño: piensas tus textos reales. La **parte B** son funciones de JavaScript puro que se comprueban aquí. Las horas son números en milisegundos y un cliente es un objeto como este:

```text
{ telefono: "51999000111", optIn: { canal: "qr", fecha: 1000 } | null, baja: null | 5000, promosEnviadas: [1000, 2000] }
```

Considera un día como `24 * 60 * 60 * 1000` ms y una semana como 7 días. Un envío cuenta para el límite semanal si pasó **menos** de 7 días.

```pasos
Parte A. Redacta en `notas.md` el texto del cartel con QR de La Esquina y el mensaje de confirmación del bot. Debe decir qué recibirá el cliente, cuántas veces por semana y cómo darse de baja.
Parte A. Escribe tres promociones del minimarket (oferta semanal, producto de temporada, recordatorio de pedido) e indica de qué categoría sería cada plantilla y por qué.
Parte B. Escribe `registrarOptIn(cliente, canal, ahora)`: devuelve un cliente **nuevo** (sin modificar el original) con `optIn: { canal, fecha: ahora }` y `baja: null`. Los canales válidos son `"casilla"`, `"palabra-clave"`, `"qr"` y `"formulario"`; con otro canal lanza un `Error`.
Parte B. Escribe `procesarBaja(texto)`: `true` si el texto completo, sin tildes, mayúsculas ni signos, es `baja`, `stop`, `cancelar` o `no mas`. Si no, `false` (también con textos no válidos como `null`).
Parte B. Escribe `puedeRecibirPromo(cliente, ahora, maxPorSemana = 2)`: `true` solo si tiene opt-in, no tiene baja y ha recibido menos de `maxPorSemana` promociones en los últimos 7 días.
```

```pista registrarOptIn sin mutar
Usa `{ ...cliente, optIn: { canal, fecha: ahora }, baja: null }`. Antes, comprueba el canal con un array y `includes`.
```

```pista Normalizar el texto
`String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()` deja `" Stop. "` como `"stop"`. Luego compara con un array de palabras usando `includes`.
```

```pista Contar envíos recientes
Filtra `cliente.promosEnviadas` (puede no existir: usa `?? []`) con `ahora - t < 7 * DIA` y compara la longitud con `maxPorSemana`.
```

```checks
[
 {"d": "`registrarOptIn` guarda canal y fecha y quita la baja", "h": "Devuelve optIn: {canal, fecha: ahora} y baja: null.", "t": "var c=registrarOptIn({telefono:'51999000111',baja:500},'qr',1000);return c.optIn.canal==='qr' && c.optIn.fecha===1000 && c.baja===null && c.telefono==='51999000111'"},
 {"d": "`registrarOptIn` no modifica el cliente original", "h": "Crea un objeto nuevo con el operador spread en lugar de asignar propiedades.", "t": "var o={telefono:'51999000111'};var c=registrarOptIn(o,'casilla',5);return o.optIn===undefined && c!==o"},
 {"d": "`registrarOptIn` rechaza canales desconocidos", "h": "Lanza `new Error(...)` si el canal no está en la lista.", "t": "try{registrarOptIn({}, 'telepatia', 1)}catch(e){return e instanceof Error}return false"},
 {"d": "`procesarBaja` reconoce BAJA y STOP con mayúsculas, espacios y signos", "h": "Normaliza: minúsculas, quita signos y espacios sobrantes.", "t": "return procesarBaja('BAJA')===true && procesarBaja(' Stop. ')===true && procesarBaja('baja!')===true && procesarBaja('CANCELAR')===true"},
 {"d": "`procesarBaja` ignora tildes y reconoce `no más`", "h": "Quita las tildes con normalize('NFD') y un reemplazo de los signos diacríticos.", "t": "return procesarBaja('No más')===true && procesarBaja('NO MAS')===true"},
 {"d": "`procesarBaja` no se activa con frases largas ni valores raros", "h": "Compara el texto completo, no con `includes` sobre el mensaje.", "t": "return procesarBaja('dame la baja de precio')===false && procesarBaja('hola')===false && procesarBaja('')===false && procesarBaja(null)===false && procesarBaja(42)===false"},
 {"d": "`puedeRecibirPromo` exige opt-in y ausencia de baja", "h": "Si `optIn` es null/undefined o hay `baja`, devuelve false.", "t": "var D=86400000;return puedeRecibirPromo({optIn:{canal:'qr',fecha:0},baja:null,promosEnviadas:[]},10*D)===true && puedeRecibirPromo({baja:null,promosEnviadas:[]},10*D)===false && puedeRecibirPromo({optIn:{canal:'qr',fecha:0},baja:5*D,promosEnviadas:[]},10*D)===false"},
 {"d": "`puedeRecibirPromo` limita a N promociones en 7 días y deja pasar las antiguas", "h": "Cuenta solo los envíos con `ahora - t < 7 * DIA`. Con exactamente 7 días ya no cuenta.", "t": "var D=86400000;var base={optIn:{canal:'qr',fecha:0},baja:null};var ahora=20*D;return puedeRecibirPromo({...base,promosEnviadas:[ahora-D,ahora-2*D]},ahora)===false && puedeRecibirPromo({...base,promosEnviadas:[ahora-D,ahora-7*D]},ahora)===true && puedeRecibirPromo({...base,promosEnviadas:[ahora-D,ahora-2*D]},ahora,3)===true && puedeRecibirPromo(base,ahora)===true"}
]
```

```solucion promos.js
const DIA = 24 * 60 * 60 * 1000;
const CANALES = ["casilla", "palabra-clave", "qr", "formulario"];

function registrarOptIn(cliente, canal, ahora) {
  if (!CANALES.includes(canal)) throw new Error("Canal de opt-in desconocido: " + canal);
  return { ...cliente, optIn: { canal, fecha: ahora }, baja: null };
}

function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function procesarBaja(texto) {
  return ["baja", "stop", "cancelar", "no mas"].includes(normalizar(texto));
}

function puedeRecibirPromo(cliente, ahora, maxPorSemana = 2) {
  if (!cliente.optIn || cliente.baja) return false;
  const recientes = (cliente.promosEnviadas ?? []).filter(t => ahora - t < 7 * DIA);
  return recientes.length < maxPorSemana;
}
```

> [!consejo] Reto extra
> Añade `registrarEnvio(cliente, ahora)`, que devuelve un cliente nuevo con `ahora` añadido a `promosEnviadas` y descarta los envíos de hace más de 30 días para que el registro no crezca sin límite. Pensando en la lección 24, es una forma sencilla de aplicar retención.

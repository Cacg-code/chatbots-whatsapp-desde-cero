---
minutos: 45
nivel: intermedio
---
## Objetivo

Entender cómo se guarda y se olvida la memoria del bot: ponerle nombre a las claves, decidir cuánto vive cada dato y comprobar con un KV de mentira (que corre en tu navegador) qué pasa cuando pasa el tiempo.

### Cómo se trabaja

La **parte A** es práctica real en tu terminal con el Worker del curso. La **parte B** son funciones de JavaScript puro que se comprueban en esta página. Los tiempos se manejan en segundos (para el TTL) y en milisegundos (para el reloj), igual que en `worker.js`.

```pasos
Parte A. En la carpeta `codigo/` del curso ejecuta `npx wrangler dev`, escribe al bot desde el simulador o con una petición firmada y mira con `npx wrangler kv key list --binding BOT_KV --local` qué claves aparecen.
Parte A. Lee una sesión guardada con `npx wrangler kv key get "sesion:51999000111" --binding BOT_KV --local` y anota en `notas.md` qué campos tiene y cuántos bytes ocupa.
Parte A. Anota en `notas.md` qué pasaría con un cliente que deja su carrito a medias el lunes y vuelve el jueves. ¿Debería el bot recordarlo? Defiende tu decisión en dos líneas.
Parte B. Escribe `claveSesion(telefono)`: devuelve `"sesion:"` más el teléfono dejando solo los dígitos (quita espacios, guiones y el signo `+`). Si no quedan dígitos, lanza un `Error`.
Parte B. Escribe `ttlPara(clave)`: devuelve los segundos de vida según el prefijo: `sesion:` 2 días, `pedido:` 30 días, `visto:` 1 día. Para cualquier otro prefijo lanza un `Error` (mejor fallar que guardar algo para siempre sin querer).
Parte B. Escribe `crearKvFalso(ahora)`: recibe una función `ahora()` que devuelve milisegundos y retorna un objeto con `put(clave, valor, ttlSegundos)` y `get(clave)`. `get` devuelve el valor, o `null` si no existe o ya venció.
Parte B. Escribe `idempotente(kv, idMensaje)`: devuelve `true` si es la PRIMERA vez que ves ese mensaje (y lo registra con `ttlPara`), y `false` si ya lo habías visto.
```

```pista Dejar solo dígitos
`telefono.replace(/\D/g, "")` quita todo lo que no sea un dígito. Comprueba el resultado antes de armar la clave.
```

```pista Cuándo vence una clave
Al guardar, calcula `vence = ahora() + ttl * 1000`. Al leer, si `ahora() >= vence`, devuelve `null` (y puedes borrar la entrada del `Map`).
```

```pista Idempotencia con visto:
Usa la clave `"visto:" + idMensaje`. Si `kv.get(clave)` no es `null`, devuelve `false`. Si es `null`, guarda `"1"` con `ttlPara(clave)` y devuelve `true`.
```

```checks
[
 {"d": "`claveSesion` deja solo los dígitos", "h": "Usa replace con la expresión regular de no dígito (barra invertida y D mayúscula).", "t": "return claveSesion(\"+51 999-000-111\")===\"sesion:51999000111\""},
 {"d": "`claveSesion` lanza error si no hay dígitos", "h": "Si el resultado queda vacío, haz throw new Error(...).", "t": "try{claveSesion(\"abc\");return false}catch(e){return e instanceof Error}"},
 {"d": "`ttlPara` devuelve los segundos de cada prefijo", "h": "1 día = 86400 segundos; 2 días = 172800; 30 días = 2592000.", "t": "return ttlPara(\"sesion:51999000111\")===172800 && ttlPara(\"pedido:LE-1\")===2592000 && ttlPara(\"visto:wamid.A\")===86400"},
 {"d": "`ttlPara` rechaza prefijos desconocidos", "h": "Si ningún prefijo coincide, lanza un Error.", "t": "try{ttlPara(\"otra:cosa\");return false}catch(e){return e instanceof Error}"},
 {"d": "`crearKvFalso` devuelve el valor mientras no venza", "h": "Guarda valor y fecha de vencimiento; compara con ahora().", "t": "var t=1000;var kv=crearKvFalso(function(){return t});kv.put(\"a\",\"x\",10);t=1000+9999;return kv.get(\"a\")===\"x\""},
 {"d": "`crearKvFalso` devuelve `null` si venció o no existe", "h": "Vencida cuando ahora() >= vence.", "t": "var t=0;var kv=crearKvFalso(function(){return t});kv.put(\"a\",\"x\",10);t=10000;return kv.get(\"a\")===null && kv.get(\"zzz\")===null"},
 {"d": "`idempotente` acepta la primera vez y rechaza el reenvío", "h": "Registra visto:<id> en el KV con el TTL de ttlPara.", "t": "var t=0;var kv=crearKvFalso(function(){return t});return idempotente(kv,\"wamid.A\")===true && idempotente(kv,\"wamid.A\")===false && idempotente(kv,\"wamid.B\")===true"},
 {"d": "`idempotente` vuelve a aceptar el id cuando pasó el TTL de un día", "h": "El registro visto: debe expirar a las 24 h.", "t": "var t=0;var kv=crearKvFalso(function(){return t});idempotente(kv,\"wamid.A\");t=86400*1000+1;return idempotente(kv,\"wamid.A\")===true"}
]
```

```solucion funciones.js
function claveSesion(telefono) {
  const digitos = String(telefono).replace(/\D/g, "");
  if (!digitos) throw new Error("Teléfono sin dígitos");
  return "sesion:" + digitos;
}

const DIA = 24 * 60 * 60;

function ttlPara(clave) {
  if (clave.startsWith("sesion:")) return 2 * DIA;
  if (clave.startsWith("pedido:")) return 30 * DIA;
  if (clave.startsWith("visto:")) return DIA;
  throw new Error("Prefijo sin TTL definido: " + clave);
}

function crearKvFalso(ahora) {
  const datos = new Map();
  return {
    put(clave, valor, ttlSegundos) {
      datos.set(clave, { valor, vence: ahora() + ttlSegundos * 1000 });
    },
    get(clave) {
      const entrada = datos.get(clave);
      if (!entrada) return null;
      if (ahora() >= entrada.vence) { datos.delete(clave); return null; }
      return entrada.valor;
    },
  };
}

function idempotente(kv, idMensaje) {
  const clave = "visto:" + idMensaje;
  if (kv.get(clave) !== null) return false;
  kv.put(clave, "1", ttlPara(clave));
  return true;
}
```

> [!consejo] Reto extra
> Añade `renovar(kv, clave)` que relea un valor y lo vuelva a guardar con su TTL completo. Así modelas lo que hace el Worker cada vez que el cliente escribe: la sesión se «renueva» y solo se olvida a quien lleva dos días en silencio.

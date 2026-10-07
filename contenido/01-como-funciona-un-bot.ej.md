---
minutos: 40
nivel: básico
---
## Objetivo

Aplicar la regla de la ventana de 24 horas con código y reconocer a qué categoría pertenece cada plantilla, para que el bot decida qué puede enviar en cada momento.

### Cómo se trabaja

La **parte A** es de investigación y la haces con tu navegador: sirve para conocer la documentación oficial, que será tu mejor aliada. La **parte B** son tres funciones de JavaScript puro que se comprueban en esta página. Todas las horas se manejan como números en milisegundos (`Date.now()`), así que no necesitas fechas complicadas.

La ventana de 24 horas equivale a `24 * 60 * 60 * 1000` milisegundos. Considera que la ventana está abierta si pasó **menos** de ese tiempo desde el último mensaje del cliente.

```pasos
Parte A. Abre la documentación oficial de WhatsApp Business Platform en developers.facebook.com y localiza las páginas de **precios** y de **plantillas de mensaje**. Anota en un archivo `notas.md` cuál es hoy la regla de cobro de los mensajes dentro de la ventana de 24 horas.
Parte A. Escribe en `notas.md` una conversación de ejemplo de tu minimarket (5 mensajes) e indica, para cada mensaje del bot, si saldría dentro de la ventana o como plantilla.
Parte B. Escribe `ventanaAbierta(ultimoMensajeCliente, ahora)`: devuelve `true` si el cliente escribió hace menos de 24 horas y `false` si pasó más tiempo o si nunca escribió (`null`).
Parte B. Escribe `puedoEnviar(tipo, ultimoMensajeCliente, ahora)`: con `"texto"` solo se puede si la ventana está abierta; con `"plantilla"` se puede siempre (se supone que el cliente dio su opt-in). Devuelve `true` o `false`.
Parte B. Escribe `categoriaPlantilla(motivo)`: devuelve `"authentication"`, `"utility"` o `"marketing"` según el motivo. Si el motivo no está en la tabla, devuelve `"marketing"` (ante la duda, es la categoría más segura de asumir).
```

| Motivo | Categoría |
|---|---|
| `codigo-verificacion` | `authentication` |
| `confirmacion-pedido`, `pedido-en-camino`, `recordatorio-pedido` | `utility` |
| `promocion`, `oferta`, `descuento` | `marketing` |

```pista Cómo medir el tiempo
Resta: `ahora - ultimoMensajeCliente`. Compara el resultado con `24 * 60 * 60 * 1000`. No olvides el caso en que `ultimoMensajeCliente` sea `null`.
```

```pista puedoEnviar reutiliza ventanaAbierta
Si `tipo === "plantilla"`, devuelve `true`. Si es `"texto"`, devuelve lo que diga `ventanaAbierta(...)`. Para cualquier otro tipo, devuelve `false`.
```

```pista Tabla de categorías
Un objeto como `{ "codigo-verificacion": "authentication", ... }` y `tabla[motivo] ?? "marketing"` resuelve el caso por defecto con una sola línea.
```

```checks
[
 {"d": "`ventanaAbierta` es `true` si pasó menos de 24 h", "h": "Compara `ahora - ultimo` con 24 * 60 * 60 * 1000 usando `<`.", "t": "var h=3600000;return ventanaAbierta(1000, 1000+23*h)===true"},
 {"d": "`ventanaAbierta` es `false` si pasaron 24 h o más", "h": "Con exactamente 24 h la ventana ya está cerrada: usa `<` y no `<=`.", "t": "var h=3600000;return ventanaAbierta(1000, 1000+24*h)===false && ventanaAbierta(1000, 1000+30*h)===false"},
 {"d": "`ventanaAbierta` es `false` si el cliente nunca escribió (`null`)", "h": "Antes de restar, revisa si `ultimoMensajeCliente` es `null` o `undefined`.", "t": "return ventanaAbierta(null, Date.now())===false && ventanaAbierta(undefined, Date.now())===false"},
 {"d": "`puedoEnviar(\"texto\", ...)` depende de la ventana", "h": "Para `\"texto\"` devuelve el resultado de `ventanaAbierta`.", "t": "var h=3600000;return puedoEnviar(\"texto\",0,5*h)===true && puedoEnviar(\"texto\",0,40*h)===false"},
 {"d": "`puedoEnviar(\"plantilla\", ...)` siempre es `true`", "h": "Las plantillas se pueden enviar dentro y fuera de la ventana.", "t": "var h=3600000;return puedoEnviar(\"plantilla\",0,5*h)===true && puedoEnviar(\"plantilla\",0,400*h)===true && puedoEnviar(\"plantilla\",null,0)===true"},
 {"d": "`puedoEnviar` rechaza tipos desconocidos", "h": "Si `tipo` no es `\"texto\"` ni `\"plantilla\"`, devuelve `false`.", "t": "return puedoEnviar(\"video-raro\",0,1)===false"},
 {"d": "`categoriaPlantilla` clasifica los motivos de la tabla", "h": "Usa un objeto con los motivos como claves y las categorías como valores.", "t": "return categoriaPlantilla(\"codigo-verificacion\")===\"authentication\" && categoriaPlantilla(\"pedido-en-camino\")===\"utility\" && categoriaPlantilla(\"confirmacion-pedido\")===\"utility\" && categoriaPlantilla(\"recordatorio-pedido\")===\"utility\" && categoriaPlantilla(\"promocion\")===\"marketing\" && categoriaPlantilla(\"oferta\")===\"marketing\" && categoriaPlantilla(\"descuento\")===\"marketing\""},
 {"d": "`categoriaPlantilla` devuelve `marketing` ante un motivo desconocido", "h": "Usa `?? \"marketing\"` o un `else` final.", "t": "return categoriaPlantilla(\"saludo-cumpleanos\")===\"marketing\" && categoriaPlantilla(\"\")===\"marketing\""}
]
```

```solucion funciones.js
const VENTANA_MS = 24 * 60 * 60 * 1000;

function ventanaAbierta(ultimoMensajeCliente, ahora) {
  if (ultimoMensajeCliente == null) return false;
  return ahora - ultimoMensajeCliente < VENTANA_MS;
}

function puedoEnviar(tipo, ultimoMensajeCliente, ahora) {
  if (tipo === "plantilla") return true;
  if (tipo === "texto") return ventanaAbierta(ultimoMensajeCliente, ahora);
  return false;
}

const CATEGORIAS = {
  "codigo-verificacion": "authentication",
  "confirmacion-pedido": "utility",
  "pedido-en-camino": "utility",
  "recordatorio-pedido": "utility",
  "promocion": "marketing",
  "oferta": "marketing",
  "descuento": "marketing",
};

function categoriaPlantilla(motivo) {
  return CATEGORIAS[motivo] ?? "marketing";
}
```

> [!consejo] Reto extra
> Añade una función `horasRestantes(ultimoMensajeCliente, ahora)` que diga cuántas horas le quedan a la ventana (redondeando hacia abajo y sin devolver números negativos). Más adelante la usarás para decidir cuándo conviene enviar un recordatorio como texto libre y cuándo como plantilla.

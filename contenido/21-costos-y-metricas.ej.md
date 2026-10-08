---
minutos: 45
nivel: intermedio
---
## Objetivo

Construir una calculadora de costos con tarifas parametrizables y las funciones que resumen las métricas del bot, para poder presentarle al dueño del minimarket cuánto cuesta y qué resultados da.

### Cómo se trabaja

La **parte A** es de investigación con la documentación oficial. La **parte B** son tres funciones de JavaScript puro. Las tarifas del ejercicio son **de ejemplo**, no las de Meta.

Un mensaje del mes se describe así: `{ categoria: "marketing" | "utilidad" | "autenticacion" | "servicio", cantidad: 80, enPuntoDeEntrada: true | false }`. Las tarifas son un objeto como `{ marketing: 0.06, utilidad: 0.02, autenticacion: 0.02, servicio: 0.01, servicioGratis: 1000 }`. Una conversación es `{ estado: "resuelta" | "derivada" | "abandonada" }`.

```pasos
Parte A. Abre la [página oficial de precios](https://developers.facebook.com/docs/whatsapp/pricing), descarga la tarifa de tu país y anota en `notas.md` las tarifas de marketing, utilidad y autenticación con la fecha de vigencia. Anota también en qué dos casos Meta no cobra hoy y cuántos mensajes de servicio gratis da por número cada mes.
Parte A. Calcula en una hoja de cálculo el costo de un mes de tu minimarket con esas tarifas reales: cuántas confirmaciones, avisos de pedido y promociones esperas enviar.
Parte B. Escribe `costoMensual(mensajes, tarifas)`: suma `cantidad × tarifa` de cada mensaje. Las categorías sin tarifa cuestan 0. Los mensajes con `enPuntoDeEntrada: true` cuestan 0. En `servicio`, los primeros `tarifas.servicioGratis` mensajes del mes (sumados entre todas las entradas de servicio; 0 si no se indica) cuestan 0. Redondea el total a 2 decimales.
Parte B. Escribe `tasaDeResolucion(conversaciones)`: fracción de conversaciones con `estado === "resuelta"`, redondeada a 3 decimales. Si la lista está vacía, devuelve 0.
Parte B. Escribe `resumenMetricas(eventos)`: recibe eventos `{ tipo, ms? }` y devuelve `{ conversaciones, tasaResolucion, pedidosPorConversacion, tiempoRespuestaMedioMs, tasaLectura, bajas }`. Los tipos son `conversacion_iniciada`, `conversacion_resuelta`, `pedido`, `respuesta` (con `ms`), `plantilla_enviada`, `plantilla_leida` y `baja`. Las razones se redondean a 3 decimales; el tiempo medio, a entero; sin datos, 0.
```

```pista Cobrar o no cobrar
Calcula el precio de cada mensaje con `tarifas[m.categoria] ?? 0` y salta los mensajes `enPuntoDeEntrada` y, para `servicio`, guarda en una variable cuántos mensajes gratis quedan y réstala entrada tras entrada.
```

```pista Redondear
`Math.round(x * 100) / 100` redondea a 2 decimales y `Math.round(x * 1000) / 1000` a 3. Los errores de coma flotante son normales; el redondeo final los arregla.
```

```pista Contar eventos
Una función auxiliar `n = tipo => eventos.filter(e => e.tipo === tipo).length` evita repetir código. Para el tiempo medio, filtra los eventos `respuesta` y promedia su `ms`.
```

```checks
[
 {"d": "`costoMensual` suma cantidad por tarifa", "h": "Multiplica la tarifa de cada categoría por su cantidad y suma todo.", "t": "return costoMensual([{categoria:'marketing',cantidad:10}],{marketing:0.06})===0.6 && costoMensual([{categoria:'marketing',cantidad:10},{categoria:'autenticacion',cantidad:5}],{marketing:0.06,autenticacion:0.02})===0.7"},
 {"d": "`costoMensual` trata como gratis las categorías sin tarifa", "h": "Usa `tarifas[categoria] ?? 0`.", "t": "return costoMensual([{categoria:'servicio',cantidad:900}],{marketing:0.06})===0 && costoMensual([{categoria:'utilidad',cantidad:3}],{})===0"},
 {"d": "`costoMensual` no cobra los mensajes en la ventana de punto de entrada", "h": "Si `enPuntoDeEntrada` es true, salta ese mensaje.", "t": "var t={marketing:0.06,utilidad:0.02};return costoMensual([{categoria:'utilidad',cantidad:300,enPuntoDeEntrada:true},{categoria:'utilidad',cantidad:120},{categoria:'marketing',cantidad:10,enPuntoDeEntrada:true}],t)===2.4"},
 {"d": "`costoMensual` descuenta el nivel gratuito de servicio", "h": "Cobra solo lo que pase de `servicioGratis`.", "t": "var t={servicio:0.01,servicioGratis:1000};return costoMensual([{categoria:'servicio',cantidad:900}],t)===0 && costoMensual([{categoria:'servicio',cantidad:1300}],t)===3"},
 {"d": "`costoMensual` reparte el nivel gratuito entre varias entradas de servicio", "h": "Guarda cuántos gratis quedan y réstalos después de cada entrada.", "t": "var t={servicio:0.01,servicioGratis:1000};return costoMensual([{categoria:'servicio',cantidad:600},{categoria:'servicio',cantidad:700}],t)===3"},
 {"d": "`costoMensual` redondea a 2 decimales", "h": "Aplica `Math.round(total * 100) / 100` al final.", "t": "return costoMensual([{categoria:'marketing',cantidad:3}],{marketing:0.1})===0.3 && costoMensual([{categoria:'marketing',cantidad:7}],{marketing:0.0333})===0.23"},
 {"d": "`tasaDeResolucion` calcula la fracción de resueltas", "h": "resueltas ÷ total, redondeado a 3 decimales.", "t": "return tasaDeResolucion([{estado:'resuelta'},{estado:'resuelta'},{estado:'derivada'},{estado:'abandonada'}])===0.5 && tasaDeResolucion([{estado:'resuelta'},{estado:'derivada'},{estado:'derivada'}])===0.333"},
 {"d": "`tasaDeResolucion` devuelve 0 con lista vacía", "h": "Evita dividir entre cero.", "t": "return tasaDeResolucion([])===0"},
 {"d": "`resumenMetricas` calcula todas las métricas", "h": "Cuenta eventos por tipo; razones redondeadas a 3 decimales y tiempo medio entero.", "t": "var ev=[{tipo:'conversacion_iniciada'},{tipo:'conversacion_iniciada'},{tipo:'conversacion_iniciada'},{tipo:'conversacion_iniciada'},{tipo:'conversacion_resuelta'},{tipo:'conversacion_resuelta'},{tipo:'conversacion_resuelta'},{tipo:'pedido'},{tipo:'pedido'},{tipo:'respuesta',ms:800},{tipo:'respuesta',ms:1200},{tipo:'plantilla_enviada'},{tipo:'plantilla_enviada'},{tipo:'plantilla_enviada'},{tipo:'plantilla_enviada'},{tipo:'plantilla_leida'},{tipo:'plantilla_leida'},{tipo:'plantilla_leida'},{tipo:'baja'}];var r=resumenMetricas(ev);return r.conversaciones===4 && r.tasaResolucion===0.75 && r.pedidosPorConversacion===0.5 && r.tiempoRespuestaMedioMs===1000 && r.tasaLectura===0.75 && r.bajas===1"},
 {"d": "`resumenMetricas` devuelve ceros sin eventos", "h": "Controla los divisores: si no hay conversaciones, respuestas o plantillas, el resultado es 0.", "t": "var r=resumenMetricas([]);return r.conversaciones===0 && r.tasaResolucion===0 && r.pedidosPorConversacion===0 && r.tiempoRespuestaMedioMs===0 && r.tasaLectura===0 && r.bajas===0"}
]
```

```solucion costos.js
function costoMensual(mensajes, tarifas) {
  let total = 0;
  let gratisServicio = tarifas.servicioGratis ?? 0;
  for (const m of mensajes) {
    if (m.enPuntoDeEntrada) continue;
    let cobrables = m.cantidad;
    if (m.categoria === "servicio") {
      cobrables = Math.max(0, m.cantidad - gratisServicio);
      gratisServicio = Math.max(0, gratisServicio - m.cantidad);
    }
    total += (tarifas[m.categoria] ?? 0) * cobrables;
  }
  return Math.round(total * 100) / 100;
}

function tasaDeResolucion(conversaciones) {
  if (conversaciones.length === 0) return 0;
  const resueltas = conversaciones.filter(c => c.estado === "resuelta").length;
  return Math.round((resueltas / conversaciones.length) * 1000) / 1000;
}

function resumenMetricas(eventos) {
  const n = tipo => eventos.filter(e => e.tipo === tipo).length;
  const resp = eventos.filter(e => e.tipo === "respuesta");
  const conversaciones = n("conversacion_iniciada");
  const enviadas = n("plantilla_enviada");
  const redondear = (x, d) => Math.round(x * 10 ** d) / 10 ** d;
  return {
    conversaciones,
    tasaResolucion: conversaciones ? redondear(n("conversacion_resuelta") / conversaciones, 3) : 0,
    pedidosPorConversacion: conversaciones ? redondear(n("pedido") / conversaciones, 3) : 0,
    tiempoRespuestaMedioMs: resp.length ? Math.round(resp.reduce((s, e) => s + e.ms, 0) / resp.length) : 0,
    tasaLectura: enviadas ? redondear(n("plantilla_leida") / enviadas, 3) : 0,
    bajas: n("baja"),
  };
}
```

> [!consejo] Reto extra
> Añade `costoPorPedido(costoMeta, costoInfra, pedidos)` que devuelva cuánto cuesta cada pedido recibido por el bot (0 si no hubo pedidos). Es la cifra que más le gusta ver a un dueño: «cada pedido por WhatsApp me cuesta S/ 0.20».

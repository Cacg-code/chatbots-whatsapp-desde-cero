---
titulo: Costos y métricas de tu bot
resumen: Cómo cobra Meta cada mensaje, cuánto cuesta realmente un bot pequeño con su infraestructura y qué métricas registrar para saber si el bot le sirve al negocio.
minutos: 55
nivel: intermedio
objetivos:
- Explicar el modelo de cobro por mensaje de plantilla y distinguir las categorías marketing, utilidad, autenticación y servicio.
- Identificar qué mensajes son gratis y cómo influyen la ventana de 24 horas y la de punto de entrada de anuncios.
- Calcular el costo mensual de un bot pequeño con una función y tarifas parametrizables.
- Estimar el costo de infraestructura en Cloudflare Workers y KV y el costo total para el cliente.
- Definir y registrar métricas útiles: resolución sin humano, pedidos por conversación, tiempos, lectura de plantillas y bajas.
fuentes:
- Precios de WhatsApp Business Platform (Meta) | https://developers.facebook.com/docs/whatsapp/pricing
---
## Antes de empezar: los números que verás son de ejemplo

En esta lección hay mucho dinero, y el dinero cambia. Meta no cobra lo mismo en todos los países, actualiza tarifas por trimestre y publica los precios en tablas descargables por moneda. Por eso:

- Los **mecanismos** (qué se cobra y cuándo) están contrastados con la documentación oficial a la fecha de esta lección (7 de octubre de 2026).
- Las **tarifas** que uses en los ejemplos están rotuladas **«de ejemplo»**: sirven para practicar la fórmula, no para cotizar. Para cotizar, descarga la tarifa de tu país desde la [página oficial de precios](https://developers.facebook.com/docs/whatsapp/pricing).

> [!importante] Verifica este dato
> Varios blogs de proveedores afirman que desde el **1 de octubre de 2026** los mensajes libres dentro de la ventana de 24 horas y las plantillas de utilidad enviadas dentro de ella **dejan de ser gratuitos**. Al redactar esta lección, la página oficial de Meta que pude consultar seguía describiendo ambos como gratuitos y solo anunciaba, para esa fecha, ajustes de tarifas en algunos países. No pude confirmar el cambio en una fuente de Meta. Antes de cotizar, revisa la [página de precios](https://developers.facebook.com/docs/whatsapp/pricing) y la [sección de actualizaciones de precios](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/updates-to-pricing), y compara con una factura real o con WhatsApp Manager. Por eso la calculadora de esta lección permite cobrar o no cobrar ese caso con una sola opción.

## El modelo de cobro por mensaje

Desde el **1 de julio de 2025**, Meta cobra **por mensaje de plantilla entregado**, no por «conversaciones» de 24 horas como antes. La tarifa depende de dos cosas:

1. **La categoría de la plantilla**: marketing, utilidad o autenticación.
2. **El país del destinatario**, según el código de país de su número (no el tuyo).

Cuando aprobaste una plantilla en una categoría, aceptaste pagar esa categoría. Meta puede reclasificar una plantilla si su contenido corresponde a otra, así que revisa la categoría que queda aprobada.

| Categoría | Para qué | Ejemplo en La Esquina |
|---|---|---|
| **Marketing** | Promociones, ofertas, reactivación, cualquier cosa que busque venta | «Esta semana: leche a S/ 4.50» |
| **Utilidad** | Mensajes sobre una acción o pedido que el cliente ya realizó | «Tu pedido #123 está en camino» |
| **Autenticación** | Códigos de un solo uso para verificar identidad | «Tu código es 481516» |
| **Servicio** | Respuestas libres dentro de la ventana de atención (no es una plantilla) | «Sí, tenemos pan. ¿Cuántos quieres?» |

## Qué es gratis y qué no

Según la documentación oficial de precios, vigente al preparar esta lección:

- **Los mensajes que el cliente te envía no se cobran.**
- **Los mensajes que no son plantilla** (texto libre, botones, listas) son gratis, pero **solo se pueden enviar dentro de la ventana de atención al cliente de 24 horas**.
- **Las plantillas de utilidad enviadas dentro de una ventana abierta** también son gratuitas.
- **Las plantillas de marketing y autenticación se cobran siempre**, dentro o fuera de la ventana.
- **Las plantillas de utilidad fuera de la ventana se cobran.**

```flujo
Cliente te escribe|se abre la ventana
-> 24 horas
Texto libre|gratis (hoy)
-> misma ventana
Utilidad|gratis (hoy)
-> ventana cerrada
Cualquier plantilla|se cobra
```

Esto tiene una consecuencia de diseño que ya conoces: **un bot barato resuelve todo mientras la ventana está abierta** y deja las plantillas de pago para cuando no hay alternativa (un recordatorio al día siguiente, una promoción).

### Ventana de punto de entrada de anuncios

Si el cliente te escribe desde un **anuncio de «Click to WhatsApp»** (o un botón de llamada a la acción de una página de Facebook) usando la app móvil, y tú respondes dentro de las primeras 24 horas, se abre una **ventana de 72 horas** en la que **todos los mensajes, incluidas las plantillas, son gratuitos**. Es independiente de la ventana de 24 horas: si esta se cierra, solo puedes enviar plantillas. Para un negocio que paga anuncios, es un incentivo para responder rápido (el bot ayuda).

### Descuentos por volumen

Hay descuentos por volumen, pero con matices importantes:

- Solo para plantillas de **utilidad y autenticación**, no marketing.
- Se calculan por **portafolio comercial**, sumando todas sus cuentas, por mercado y categoría.
- Los mensajes gratuitos no cuentan para los niveles.
- Los niveles se reinician cada mes y los define Meta.

Un minimarket de barrio **nunca llegará** a esos niveles. Lo mencionamos para que entiendas la factura, no para que cuentes con ellos.

### Cambios por fecha

Meta puede cambiar tarifas solo el **primer día de un trimestre** y avisa con anticipación (un mes para tarifas, tres para niveles de volumen y seis para cambios del modelo). La página oficial indicaba, por ejemplo, actualizaciones de tarifas para algunos países el 1 de octubre de 2026. Mira la cabecera de la página de precios cada trimestre y guarda en tu hoja de costos **la fecha de la tarifa que usaste**.

## Calcular el costo mensual de un bot pequeño

La parte de Meta de la factura es, en esencia, una suma: para cada categoría, **cantidad de mensajes por tarifa**. Lo único delicado es qué no se cobra. Escribamos una función `costoMensual` que acepte las tarifas como **parámetro**, de modo que cuando Meta cambie algo no cambies el código, solo los datos:

```js costos.js
function costoMensual(mensajes, tarifas) {
  let total = 0;
  for (const m of mensajes) {
    let precio = tarifas[m.categoria] ?? 0;
    // Utilidad dentro de la ventana: gratis salvo que se indique lo contrario
    if (m.categoria === "utilidad" && m.enVentana && !tarifas.cobrarUtilidadEnVentana) precio = 0;
    total += precio * m.cantidad;
  }
  return Math.round(total * 100) / 100;
}
```

Probémosla con un mes **de ejemplo**: tarifas inventadas en dólares (**no son las de Meta**) y un minimarket con 80 plantillas de marketing, 120 de utilidad fuera de la ventana, 300 de utilidad dentro de ella y 900 mensajes libres:

```js costos.js
// Tarifas DE EJEMPLO en dólares (no son las de Meta)
const tarifasEjemplo = { marketing: 0.06, utilidad: 0.02, autenticacion: 0.02, servicio: 0 };
const mes = [
  { categoria: "marketing", cantidad: 80 },
  { categoria: "utilidad", cantidad: 120, enVentana: false },
  { categoria: "utilidad", cantidad: 300, enVentana: true },
  { categoria: "servicio", cantidad: 900 },
];
console.log("Hoy (utilidad en ventana gratis):", costoMensual(mes, tarifasEjemplo));
console.log("Si se cobrara en ventana:", costoMensual(mes, { ...tarifasEjemplo, cobrarUtilidadEnVentana: true }));
```

```salida
Hoy (utilidad en ventana gratis): 7.2
Si se cobrara en ventana: 13.2
```

Revisa las cuentas a mano: 80 × 0,06 = 4,80 y 120 × 0,02 = 2,40, suman 7,20. Si los 300 de utilidad en ventana también se cobraran, se añaden 6,00. Para un negocio chico, **la diferencia son unos pocos dólares al mes**. Aun así, mostrarle al cliente ambos escenarios te protege de sorpresas y demuestra que sabes lo que haces.

> [!nota] Servicio con tarifa
> Si Meta confirmara que los mensajes de servicio dejan de ser gratis, solo cambias `servicio: 0` por la tarifa real en el objeto de tarifas. Ese es el beneficio de parametrizar.

## Costos de infraestructura

El bot corre en **Cloudflare Workers** y guarda datos en **Workers KV** (lecciones [11](../11-despliegue-en-cloudflare/) y [15](../15-memoria-con-kv/)). Según la documentación de Cloudflare al preparar la lección, el **plan gratuito** incluye:

| Recurso | Plan Free | Plan de pago (Workers Paid) |
|---|---|---|
| Peticiones de Workers | 100.000 por día | 10 millones al mes incluidos; luego 0,30 USD por millón |
| CPU por invocación | 10 ms | Hasta 30 s por defecto (máx. 5 min) |
| KV: lecturas | 100.000 por día | 10 millones al mes; luego 0,50 USD por millón |
| KV: escrituras | 1.000 por día | 1 millón al mes; luego 5 USD por millón |
| KV: almacenamiento | 1 GB | 1 GB incluido; luego 0,50 USD por GB-mes |
| Precio base | 0 | 5 USD al mes por cuenta |

Los límites del plan gratuito se reinician a las 00:00 UTC y, si los superas, las operaciones fallan hasta el reinicio. Para el dimensionamiento:

- **Un mensaje entrante** equivale a una petición al Worker (más las que hagas a otros servicios).
- **Cada cambio de estado de una conversación** puede ser una escritura en KV. Con **1.000 escrituras al día**, y un bot que escribe unas 3 veces por conversación, el plan gratuito alcanza para unas **300 conversaciones al día**. Un minimarket de barrio suele estar muy por debajo.
- Si el cliente crece, pasar al plan de pago cuesta 5 USD al mes por la cuenta, no por cliente.

> [!importante] Verifica este dato
> Los límites y precios de Cloudflare cambian. Confirma en [Precios de Workers](https://developers.cloudflare.com/workers/platform/pricing/) (incluye la tabla de KV) antes de prometer «costo cero». Mantén también la cuenta de Cloudflare a nombre del cliente o en un acuerdo claro (lección [26](../26-vender-tu-bot/)).

Otros costos que se olvidan: el **dominio** propio si lo hay (anual), el **número de teléfono** (el chip, o un número virtual) y, si el negocio usa Google Sheets como panel, **nada** (es gratis para uso normal).

## El costo total para el cliente

Hay cuatro bolsillos distintos y conviene separarlos en la propuesta:

| Concepto | Quién lo paga | Frecuencia |
|---|---|---|
| Mensajes de plantilla a Meta | El negocio (facturado por Meta a su cuenta) | Variable, mensual |
| Infraestructura (Cloudflare, dominio) | El negocio (o incluido en tu mensualidad, si lo acuerdan) | Mensual/anual |
| Desarrollo e implementación | El negocio, a ti | Pago único |
| Mantenimiento y soporte | El negocio, a ti | Mensual |

Ejemplo **ilustrativo** de un mes: 7,20 USD a Meta (con las tarifas de ejemplo), 0 USD de Cloudflare en plan gratuito y 36 USD de mantenimiento a ti. El costo de Meta no es el protagonista: **lo que más pesa es tu tiempo**. En la lección [26](../26-vender-tu-bot/) verás cómo cotizarlo.

## Métricas que sí sirven

Un bot no se evalúa por «cuántos mensajes manda», sino por si **ayuda al negocio**. Con cinco métricas simples puedes saberlo:

| Métrica | Pregunta que responde | Cómo se calcula |
|---|---|---|
| **Tasa de resolución sin humano** | ¿El bot soluciona sin ayuda de una persona? | conversaciones resueltas ÷ conversaciones iniciadas |
| **Pedidos por conversación** | ¿Las conversaciones se convierten en ventas? | pedidos ÷ conversaciones |
| **Tiempo de respuesta** | ¿Es rápido? | promedio de milisegundos entre mensaje y respuesta |
| **Tasa de lectura de plantillas** | ¿Los mensajes llegan y se leen? | plantillas leídas ÷ enviadas (Meta informa estados por webhook) |
| **Bajas** | ¿Se está molestando a alguien? | número de BAJA/STOP por campaña |

Una advertencia: **«resuelta» debe significar algo concreto**. En el minimarket puede ser «el cliente confirmó pedido» o «obtuvo la respuesta y no pidió humano». Si una conversación que termina en «hablar con una persona» cuenta como resuelta, la métrica miente.

### Cómo registrarlas

La forma más simple es un **registro de eventos**: cada cosa relevante añade una línea con un `tipo` y, si aplica, un dato. Luego, una función suma. Funciona igual en KV, en una hoja de cálculo o en un archivo de texto:

```js metricas.js
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

Con un registro de ejemplo de 4 conversaciones, 2 pedidos, 2 respuestas medidas, 4 plantillas enviadas (3 leídas) y 1 baja:

```salida
0.5
{
  conversaciones: 4,
  tasaResolucion: 0.75,
  pedidosPorConversacion: 0.5,
  tiempoRespuestaMedioMs: 1000,
  tasaLectura: 0.75,
  bajas: 1
}
```

(La primera línea es `tasaDeResolucion` aplicada a 4 conversaciones: 2 resueltas, 1 derivada y 1 abandonada.) Dos reglas de oro: **evita dividir por cero** (si no hubo conversaciones, devuelve 0) y **no guardes datos personales en el registro de eventos** (un `tipo` y un número bastan; en la lección [24](../24-seguridad-y-privacidad/) verás por qué).

## Leer los números y decidir

Las métricas sirven para decisiones concretas:

- **Resolución baja (< 50 %):** revisa en el registro qué preguntas terminan en «no entendí» y mejora el [texto libre](../06-entender-texto-libre/).
- **Muchos pedidos abandonados a mitad:** el flujo es largo; simplifícalo.
- **Lectura baja de plantillas:** mal horario, mal texto o lista fría. Cuida la calidad (lección [20](../20-marketing-responsable/)).
- **Bajas altas tras una campaña:** menos frecuencia o mejor segmentación.
- **Tiempo de respuesta alto:** revisa el Worker o servicios externos.

Presenta al dueño un resumen mensual de media página con 3 números y una recomendación. Eso justifica tu mantenimiento mejor que cualquier explicación técnica.

## Errores frecuentes

- **Usar cifras viejas de blogs o de memoria.** Las tarifas dependen del país del destinatario y del trimestre; cotiza con la tarifa oficial vigente y anota la fecha.
- **Olvidar que marketing se cobra siempre.** Un cliente que quiere «promociones masivas» necesita ver este costo desde la propuesta.
- **Disfrazar marketing como utilidad para pagar menos.** Puede terminar en reclasificación o problemas de calidad.
- **Prometer «cero costo».** Tienes una parte gratis (ventana, plan gratuito) y otra que no.
- **No separar quién paga qué.** Si Meta le factura al cliente y tú te quedas con la infraestructura, que quede escrito.
- **Medir mensajes enviados en lugar de resultados.** Más mensajes no es mejor; más pedidos con menos bajas, sí.
- **Dividir por cero en las métricas.** Un mes sin conversaciones no debe romper el reporte.

## Apuntes para llevar

- Meta cobra por **mensaje de plantilla entregado**, según **categoría** y **país del destinatario**; marketing, utilidad y autenticación son las categorías de plantilla.
- Texto libre dentro de la ventana de 24 h y las plantillas de utilidad dentro de ella eran gratis según la documentación consultada; **verifica** si cambió el 1-oct-2026.
- La ventana de punto de entrada de anuncios de 72 h hace gratuitos todos los mensajes si respondes dentro de las primeras 24 h.
- Las tarifas se **parametrizan**: el código no lleva precios fijos.
- Cloudflare tiene plan gratuito (100.000 peticiones/día; KV 1.000 escrituras/día) suficiente para un minimarket; el plan de pago parte de 5 USD/mes.
- Mide **resolución, pedidos por conversación, tiempo de respuesta, lectura de plantillas y bajas** con un registro de eventos simple.

## Glosario

| Término | Significado |
|---|---|
| Plantilla de utilidad | Plantilla sobre una acción o pedido ya iniciado por el cliente. |
| Plantilla de autenticación | Plantilla de códigos de un solo uso. |
| Mensaje de servicio | Mensaje libre (sin plantilla) dentro de la ventana de atención. |
| Ventana de punto de entrada | Ventana de 72 h gratuita tras un clic en un anuncio a WhatsApp respondido a tiempo. |
| Descuento por volumen | Rebaja por mensajes de utilidad y autenticación, calculada por portafolio y mes. |
| Tasa de resolución | Porcentaje de conversaciones resueltas sin intervención humana. |
| Registro de eventos | Lista de hechos del bot (tipo y dato) de la que se calculan métricas. |
| Workers KV | Almacén clave-valor de Cloudflare usado para guardar sesiones y pedidos. |

```quiz
? ¿Desde cuándo cobra Meta «por mensaje» de plantilla en lugar de por conversación?
- Desde enero de 2024
+ Desde el 1 de julio de 2025
- Desde el 1 de octubre de 2026
- Nunca cambió el modelo
= El cambio al cobro por mensaje de plantilla entregado entró en vigor el 1 de julio de 2025.

? ¿De qué depende la tarifa de una plantilla?
- Solo del largo del texto
+ De su categoría y del país del número del destinatario
- Del país del negocio únicamente
- De la hora del envío
= La tarifa depende de la categoría (marketing, utilidad, autenticación) y del código de país del destinatario.

? Un cliente te escribió hace 2 horas. Le respondes con texto libre. Según la documentación oficial consultada, ¿se cobra?
- Sí, siempre
+ No, los mensajes no plantilla dentro de la ventana de 24 h eran gratuitos; verifica si esto cambió
- Solo si el cliente es nuevo
- Solo si incluye botones
= Los mensajes libres dentro de la ventana eran gratuitos; por eso hay que verificar la fuente oficial por si cambia.

? ¿Por qué `costoMensual` recibe las tarifas como parámetro?
- Para que sea más lenta
+ Para actualizar precios sin cambiar el código cuando Meta modifique las tarifas
- Porque JavaScript no permite constantes
- Para evitar usar números
= Los precios son datos que cambian; el código no debe llevarlos escritos.

? ¿Qué problema tiene contar como «resuelta» una conversación que termina con «quiero hablar con una persona»?
- Ninguno
+ Infla la tasa de resolución sin humano y oculta los fallos del bot
- Hace que Meta cobre más
- Borra el historial
= La métrica debe reflejar lo que el bot resolvió por sí mismo; si no, no sirve para decidir.
```

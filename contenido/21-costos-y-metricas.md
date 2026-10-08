---
titulo: Costos y métricas de tu bot
resumen: Cómo cobra Meta cada mensaje, cuánto cuesta realmente un bot pequeño con su infraestructura y qué métricas registrar para saber si el bot le sirve al negocio.
minutos: 55
nivel: intermedio
objetivos:
- Explicar el modelo de cobro por mensaje de plantilla y distinguir las categorías marketing, utilidad, autenticación y servicio.
- Identificar qué mensajes no se cobran (el nivel gratuito mensual de servicio y la ventana de punto de entrada de anuncios) y cómo influye la ventana de 24 horas.
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
> Meta cambió el cobro el **1 de octubre de 2026**. La [página oficial de precios](https://developers.facebook.com/docs/whatsapp/pricing) (actualizada el 30 de septiembre de 2026) dice que los mensajes de servicio vuelven a cobrarse, con un nivel gratuito de 1.000 por mes y por número, y que solo hay dos casos sin cobro. Contrastado con esa página el 8 de octubre de 2026. Meta actualiza esa página con frecuencia: confírmalo antes de cotizar.

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

Según la [página oficial de precios](https://developers.facebook.com/docs/whatsapp/pricing), vigente desde el 1 de octubre de 2026, **Meta solo deja de cobrar en dos casos** cuando una empresa envía un mensaje a un usuario:

1. **La ventana de punto de entrada de anuncios** (la explicamos abajo): mientras está abierta, no se cobra ninguna categoría.
2. **Los primeros 1.000 mensajes de servicio de cada mes, por número de teléfono**: el nivel gratuito no se acumula y se reinicia cada mes. Desde el mensaje 1.001 se cobra la tarifa de servicio.

Además, **los mensajes que el cliente te envía nunca se cobran**. Todo lo demás se cobra por mensaje entregado: marketing, utilidad, autenticación y los mensajes de servicio que pasen del nivel gratuito.

```flujo
Cliente te escribe|se abre la ventana de 24 h
-> dentro de la ventana
Texto libre (servicio)|gratis hasta 1.000 al mes
-> mismas 24 horas
Plantilla de utilidad|se cobra
-> ventana cerrada
Cualquier plantilla|se cobra
```

Las respuestas libres (texto, botones, listas) **solo se pueden enviar dentro de la ventana de atención al cliente de 24 horas**; fuera de ella solo hay plantillas. Esto tiene una consecuencia de diseño que ya conoces: **un bot barato resuelve todo mientras la ventana está abierta** y deja las plantillas para cuando no hay alternativa (un recordatorio al día siguiente, una promoción). Un minimarket pequeño rara vez pasa de 1.000 respuestas libres al mes por número, así que esa parte suele salir gratis.

> [!nota] Cambió en octubre de 2026
> Hasta septiembre de 2026 los mensajes de servicio y las plantillas de utilidad enviadas dentro de la ventana de 24 horas no se cobraban. Si lees tutoriales anteriores, verás ese modelo; ya no aplica.

### Ventana de punto de entrada de anuncios

Si el cliente te escribe desde un **anuncio de «Click to WhatsApp»** (o un botón de llamada a la acción de una página de Facebook) usando la app móvil, y tú respondes dentro de la ventana de atención de 24 horas con un mensaje de marketing, utilidad, autenticación o servicio, ese mensaje no se cobra y **abre una ventana de punto de entrada gratuita de hasta 7 días**. Mientras está abierta, **tampoco se cobran las plantillas** de marketing, utilidad ni autenticación. Es independiente de la ventana de 24 horas: si esta se cierra, solo puedes enviar plantillas (que dentro de la ventana de punto de entrada son gratis). Para un negocio que paga anuncios, es un incentivo para responder rápido (el bot ayuda).

### Descuentos por volumen

Hay descuentos por volumen, pero con matices importantes:

- Solo para plantillas de **utilidad y autenticación**, no marketing.
- Se calculan por **portafolio comercial**, sumando todas sus cuentas, por mercado y categoría.
- Los mensajes que no se cobran no cuentan para los niveles.
- Los niveles se reinician cada mes y los define Meta.

Un minimarket de barrio **nunca llegará** a esos niveles. Lo mencionamos para que entiendas la factura, no para que cuentes con ellos.

### Cambios por fecha

Meta puede cambiar tarifas solo el **primer día de un trimestre** y avisa con anticipación (un mes para tarifas, tres para niveles de volumen y seis para cambios del modelo). La actualización del 1 de octubre de 2026 es un ejemplo: trajo el cobro de los mensajes de servicio con su nivel gratuito. Mira la cabecera de la página de precios cada trimestre y guarda en tu hoja de costos **la fecha de la tarifa que usaste**.

## Calcular el costo mensual de un bot pequeño

La parte de Meta de la factura es, en esencia, una suma: para cada categoría, **cantidad de mensajes por tarifa**. Lo único delicado es qué no se cobra. Escribamos una función `costoMensual` que acepte las tarifas como **parámetro**, de modo que cuando Meta cambie algo no cambies el código, solo los datos:

```js costos.js
function costoMensual(mensajes, tarifas) {
  let total = 0;
  let gratisServicio = tarifas.servicioGratis ?? 0; // nivel gratuito mensual de servicio
  for (const m of mensajes) {
    if (m.enPuntoDeEntrada) continue;               // ventana de punto de entrada: sin cobro
    let cobrables = m.cantidad;
    if (m.categoria === "servicio") {
      cobrables = Math.max(0, m.cantidad - gratisServicio);
      gratisServicio = Math.max(0, gratisServicio - m.cantidad);
    }
    total += (tarifas[m.categoria] ?? 0) * cobrables;
  }
  return Math.round(total * 100) / 100;
}
```

Probémosla con un mes **de ejemplo**: tarifas inventadas en dólares (**no son las de Meta**) y un minimarket con 80 plantillas de marketing, 420 de utilidad, 50 de utilidad enviadas mientras había una ventana de punto de entrada abierta y 1.300 mensajes libres (servicio):

```js costos.js
// Tarifas DE EJEMPLO en dólares (no son las de Meta)
const tarifasEjemplo = { marketing: 0.06, utilidad: 0.02, autenticacion: 0.02, servicio: 0.01, servicioGratis: 1000 };
const mes = [
  { categoria: "marketing", cantidad: 80 },
  { categoria: "utilidad", cantidad: 420 },
  { categoria: "utilidad", cantidad: 50, enPuntoDeEntrada: true },
  { categoria: "servicio", cantidad: 1300 },
];
console.log("Con el nivel gratuito de servicio:", costoMensual(mes, tarifasEjemplo));
console.log("Sin el nivel gratuito de servicio:", costoMensual(mes, { ...tarifasEjemplo, servicioGratis: 0 }));
```

```salida
Con el nivel gratuito de servicio: 16.2
Sin el nivel gratuito de servicio: 26.2
```

Revisa las cuentas a mano: 80 × 0,06 = 4,80 y 420 × 0,02 = 8,40; las 50 de utilidad en la ventana de punto de entrada cuestan 0. De los 1.300 mensajes de servicio, 1.000 son gratis y los 300 restantes cuestan 300 × 0,01 = 3,00. Total: 16,20. Sin el nivel gratuito, los 1.300 costarían 13,00 y el total subiría a 26,20. Para un negocio chico, **la diferencia son pocos dólares al mes**. Aun así, mostrarle al cliente ambos escenarios te protege de sorpresas y demuestra que sabes lo que haces.

> [!nota] Tarifas parametrizadas
> Si Meta vuelve a cambiar el nivel gratuito o la tarifa de servicio, solo cambias `servicioGratis` y `servicio` en el objeto de tarifas. Ese es el beneficio de parametrizar.

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

**¿Cuándo pasar a Workers Paid?** Señales concretas, no una fecha:

- Ves errores por superar las **1.000 escrituras diarias de KV** (el primero en agotarse en bots con mucho estado).
- Tus tareas tardan más de **10 ms de CPU** por petición (por ejemplo, procesar archivos grandes o criptografía pesada) y el Worker se corta.
- Superas las **100.000 peticiones al día** (más de ~3.000 al día de promedio ya merece vigilancia).
- Tienes varios clientes y no quieres que uno agote el cupo de los demás: usa una cuenta por cliente (a su nombre) en lugar de mezclarlos.

> [!importante] INFO REFERENCIAL
> Estos números salen de la documentación al revisar la lección (octubre de 2026) y **pueden cambiar**. Es mejor que revises siempre el [sitio oficial de precios](https://developers.cloudflare.com/workers/platform/pricing/) antes de decidir o de cotizar a un cliente.

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
- **Prometer «cero costo».** Tienes una parte gratis (nivel gratuito de servicio, ventana de punto de entrada, plan gratuito de Cloudflare) y otra que no.
- **No separar quién paga qué.** Si Meta le factura al cliente y tú te quedas con la infraestructura, que quede escrito.
- **Medir mensajes enviados en lugar de resultados.** Más mensajes no es mejor; más pedidos con menos bajas, sí.
- **Dividir por cero en las métricas.** Un mes sin conversaciones no debe romper el reporte.

## Apuntes para llevar

- Meta cobra por **mensaje de plantilla entregado**, según **categoría** y **país del destinatario**; marketing, utilidad y autenticación son las categorías de plantilla.
- Desde el 1-oct-2026 Meta cobra también los mensajes de servicio: los primeros 1.000 de cada mes por número son gratis; las plantillas de utilidad dentro de la ventana de 24 h ya se cobran.
- La ventana de punto de entrada de anuncios (hasta 7 días) hace gratuitos todos los mensajes si respondes dentro de las primeras 24 h.
- Las tarifas se **parametrizan**: el código no lleva precios fijos.
- Cloudflare tiene plan gratuito (100.000 peticiones/día; KV 1.000 escrituras/día) suficiente para un minimarket; el plan de pago parte de 5 USD/mes.
- Mide **resolución, pedidos por conversación, tiempo de respuesta, lectura de plantillas y bajas** con un registro de eventos simple.

## Glosario

| Término | Significado |
|---|---|
| Plantilla de utilidad | Plantilla sobre una acción o pedido ya iniciado por el cliente. |
| Plantilla de autenticación | Plantilla de códigos de un solo uso. |
| Mensaje de servicio | Mensaje libre (sin plantilla) dentro de la ventana de atención. |
| Ventana de punto de entrada | Ventana gratuita de hasta 7 días tras un clic en un anuncio a WhatsApp respondido a tiempo. |
| Nivel gratuito de servicio | Los primeros 1.000 mensajes de servicio de cada mes por número, sin cobro. |
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

? Un cliente te escribió hace 2 horas. Le respondes con texto libre y es el mensaje de servicio número 300 del mes de ese número. Según la página oficial de octubre de 2026, ¿se cobra?
- Sí, desde el primer mensaje
+ No, entra en los primeros 1.000 mensajes de servicio gratuitos del mes
- No, los mensajes libres nunca se cobran
- Solo si incluye botones
= Desde el 1 de octubre de 2026 los mensajes de servicio se cobran, pero cada número tiene un nivel gratuito de 1.000 al mes.

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

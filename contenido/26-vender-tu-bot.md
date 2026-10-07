---
titulo: Vender tu bot como servicio
resumen: Cómo convertir lo aprendido en un servicio para negocios: a quién ofrecerlo, qué prometer y qué no, cómo cotizar, hacer la demo, acordar datos y dar mantenimiento.
minutos: 55
nivel: intermedio
objetivos:
- Identificar qué negocios se benefician de un bot y qué caso de uso concreto ofrecerles.
- Delimitar el alcance: qué incluir, qué excluir y qué no prometer.
- Cotizar con una plantilla de propuesta, hitos y modelo mensual o pago único, y calcular tu margen.
- Aclarar quién paga a Meta y qué costos pasan al cliente.
- Preparar una demo con el simulador sin tocar datos del cliente y un contrato mínimo con acuerdo de datos.
fuentes:
- Precios de WhatsApp Business Platform (Meta) | https://developers.facebook.com/docs/whatsapp/pricing
---
## Del aprendizaje al servicio

Llegaste hasta aquí con un bot que atiende pedidos, recuerda, mide y protege datos. Ese conjunto de habilidades vale dinero para negocios pequeños que **pierden ventas por no contestar a tiempo**: el cliente escribe a las 9 de la noche, nadie responde y compra en otra parte.

Pero construir un bot y **vender un servicio** son oficios distintos. El segundo exige entender qué problema tiene el negocio, prometer solo lo que puedes cumplir, poner un precio que cubra tu tiempo y dejar por escrito quién es responsable de qué. Esta lección te da una guía práctica pensada para un freelancer en Latinoamérica.

> [!importante] No es asesoría legal ni fiscal
> Lo que sigue son buenas prácticas comerciales y ejemplos. Los contratos, impuestos, comprobantes de pago y la protección de datos dependen de tu país. Consulta a un abogado y a un contador antes de firmar o facturar. Las cifras son **de ejemplo**: pon las tuyas.

## Qué negocios se benefician

Un bot rinde más donde hay **muchas consultas repetidas** y pedidos o reservas simples. Donde cada cliente es único y requiere conversación larga, rinde menos.

| Rubro | Caso de uso concreto | Qué resuelve el bot | Cuidado |
|---|---|---|---|
| **Minimarket / bodega** | Catálogo, pedidos, delivery, «¿hasta qué hora abren?» | Pedidos fuera de horario, menos llamadas | Stock cambiante: debe actualizarse |
| **Restaurante / cevichería** | Carta, pedidos para llevar, reservas | Atiende picos de mediodía | Los platos agotados |
| **Barbería / salón** | Reservas, recordatorio de cita | Reduce las citas olvidadas | Agenda en un solo lugar |
| **Ferretería** | Consulta de precios, cotizar lista de materiales | Respuestas rápidas a consultas repetidas | Catálogo grande |
| **Academia / cursos** | Información de horarios, inscripciones, recordatorios de pago | Libera a secretaría | Datos de menores |
| **Taller mecánico** | Estado de reparación, recordatorio de mantenimiento | Menos «¿ya está mi carro?» | Información técnica |
| **Tienda de ropa** | Catálogo, consulta de tallas, avisos de stock | Atención nocturna | Fotos y catálogo actualizado |

Un buen punto de partida es **un solo caso de uso** muy claro (por ejemplo, pedidos de delivery para un minimarket) y crecer desde ahí. «Un bot para todo» es la forma más segura de nunca terminar.

Rubros que **debes evitar o tratar con mucho cuidado**: salud (datos sensibles y reglas estrictas, y Meta limita ciertos productos médicos), servicios financieros, alcohol, apuestas, adultos y cualquier categoría que la política comercial de WhatsApp prohíba o regule. Revisa la [política vigente](https://whatsappbusiness.com/es-la/policy/) antes de aceptar un cliente.

## Qué NO prometer

Los clientes no técnicos creen cosas por falta de información; tu trabajo es corregirlas **antes** de firmar:

- **«El bot lo entiende todo».** Un bot de reglas entiende lo que diseñaste. Lo demás se deriva a una persona.
- **«Vendes más desde el día uno».** El bot atiende mejor y más rápido; las ventas dependen del negocio, el precio y la demanda.
- **«Cero costos».** Hay costos por plantilla de Meta (lección [21](../21-costos-y-metricas/)), infraestructura y tu mantenimiento.
- **«Mensajes masivos a toda mi lista».** Sin opt-in no se puede (lección [20](../20-marketing-responsable/)) y pondría en riesgo su número.
- **«Disponibilidad 100 %».** Meta, Cloudflare o internet pueden fallar; promete tiempos de respuesta de soporte, no garantías absolutas.
- **«Reemplaza al personal».** Lo complementa: atención humana siempre debe estar disponible (lección [25](../25-atencion-humana/)).
- **Fechas de aprobación de Meta.** La verificación del negocio y la revisión de plantillas no dependen de ti; la documentación oficial menciona, por ejemplo, que la revisión de una plantilla puede tardar hasta 24 horas. Promete esfuerzo, no plazos de terceros.

> [!consejo] Frase útil
> «Voy a dejar el bot funcionando para estos X casos. Lo que quede fuera, el bot lo pasa a una persona. Si más adelante quieres ampliar, lo cotizamos aparte.»

## Alcance y cotización

El **alcance** es la lista de lo que entregas. Se escribe en la propuesta para que ambos sepan qué incluye el precio. Una estructura que funciona:

1. **Objetivo:** una frase («Atender pedidos de delivery por WhatsApp fuera de horario»).
2. **Qué incluye:** flujos de conversación, catálogo inicial de N productos, conexión con WhatsApp Cloud API, despliegue, panel simple, capacitación de 1 hora.
3. **Qué no incluye:** tienda en línea, integración con facturación, campañas masivas, nuevos flujos fuera de lo acordado, redes sociales.
4. **Hitos y entregables:** diseño de conversación aprobado, versión de prueba con simulador, conexión a número real, puesta en marcha.
5. **Qué necesito del cliente:** catálogo y precios, horarios, acceso (rol) a su portafolio de Meta, número de teléfono disponible, una persona de contacto que responda en 48 horas.
6. **Costos de terceros:** quién paga Meta, dominio e infraestructura (más abajo).
7. **Plazo estimado** y **forma de pago.**
8. **Vigencia de la propuesta** (por ejemplo 15 días).

### Cómo calcular el precio

Parte de **horas** y de tu **tarifa por hora**. Si no sabes tu tarifa, calcula cuánto necesitas ganar al mes y divide por las horas realmente facturables (no las 160 del mes; muchas se van en reuniones, soporte y búsqueda de clientes).

Escribamos una función `cotizar` que aplique reglas claras: horas únicas se pagan una vez, horas mensuales son soporte y hay un descuento de 10 % si el trabajo único llega a 40 horas o más:

```js cotizar.js
function cotizar(items, tarifaHora) {
  let horasUnicas = 0, unico = 0, mensual = 0;
  for (const it of items) {
    const monto = it.horas * tarifaHora;
    if (it.mensual) mensual += monto; else { horasUnicas += it.horas; unico += monto; }
  }
  const descuento = horasUnicas >= 40 ? unico * 0.1 : 0;
  const r = x => Math.round(x * 100) / 100;
  return { unico: r(unico - descuento), descuento: r(descuento), mensual: r(mensual), primerMes: r(unico - descuento + mensual) };
}

const items = [
  { concepto: "Diseño de conversación", horas: 6 },
  { concepto: "Motor de reglas y catálogo", horas: 16 },
  { concepto: "Conexión con WhatsApp y despliegue", horas: 10 },
  { concepto: "Pruebas y capacitación", horas: 10 },
  { concepto: "Mantenimiento y soporte", horas: 3, mensual: true },
];
console.log(cotizar(items, 40)); // tarifa DE EJEMPLO: S/ 40 por hora
```

```salida
{ unico: 1512, descuento: 168, mensual: 120, primerMes: 1632 }
```

Son 42 horas únicas (S/ 1 680, menos 10 % = S/ 1 512) y 3 horas mensuales de soporte (S/ 120). La tarifa de S/ 40 es **de ejemplo**; en dólares, otra moneda o con otro país, cambia.

Ahora tu **margen**: de lo que cobras, cuánto queda tras los costos reales. Para una mensualidad de S/ 36 con S/ 9 de costos de herramientas y S/ 4.50 de otros, el margen es:

```js cotizar.js
function margen(precio, costos) {
  const total = costos.reduce((s, c) => s + c, 0);
  const ganancia = precio - total;
  return { ganancia: Math.round(ganancia * 100) / 100, porcentaje: precio > 0 ? Math.round((ganancia / precio) * 1000) / 10 : 0 };
}

function precioParaMargen(costos, margenDeseado) {
  const total = costos.reduce((s, c) => s + c, 0);
  return Math.round((total / (1 - margenDeseado)) * 100) / 100;
}

console.log(margen(36, [9, 4.5]));
console.log(precioParaMargen([9, 4.5], 0.6));
```

```salida
{ ganancia: 22.5, porcentaje: 62.5 }
33.75
```

Si quieres un margen del 60 %, necesitas cobrar al menos S/ 33.75 con esos costos. Ojo: el margen sobre costos directos **no incluye tu tiempo de trabajo**; tu tiempo ya está en las horas cotizadas.

## Pago único o mensualidad

| Modelo | Cómo funciona | Ventaja | Riesgo |
|---|---|---|---|
| **Pago único** | Cobras el proyecto y entregas | Dinero rápido, simple | El cliente te llama «gratis» cuando algo falla |
| **Mensualidad** | Cuota fija por mantenimiento, soporte y pequeños cambios | Ingreso estable, relación continua | El cliente espera «todo incluido»; define límites |
| **Mixto (recomendado)** | Implementación única + mensualidad de soporte | Equilibrio entre ambos | Requiere explicar bien qué cubre cada parte |

Un esquema habitual: **50 % al aprobar la propuesta y 50 % al entregar**, más una **mensualidad** desde el mes siguiente. Pagar por hitos reduce el riesgo de ambos. Los medios de pago (por ejemplo Yape, Plin o transferencia bancaria) dependen de tu país; el contrato debe indicar quién emite qué comprobante según la ley local.

## Quién paga a Meta y qué pasa al cliente

Regla de oro: **la cuenta de WhatsApp Business y el método de pago de Meta deben ser del cliente**. Así los mensajes se facturan a su nombre, el número es suyo y, si terminan la relación contigo, no pierde su canal.

Ponlo claro en la propuesta, separando:

| Costo | Lo paga | Se factura |
|---|---|---|
| Mensajes de plantilla (Meta) | El cliente | Directo por Meta a su cuenta |
| Infraestructura (Cloudflare, dominio) | El cliente (cuenta a su nombre) o incluida en tu mensualidad, si lo pactan | Según acuerdo |
| Número de teléfono / chip | El cliente | — |
| Tu implementación | El cliente, a ti | Pago único |
| Tu mantenimiento y soporte | El cliente, a ti | Mensual |

Si tú pagas los mensajes por él y los revendes, asumes riesgos (cobros inesperados, fraude, tarifas que suben). Si lo haces, define un tope, una cláusula de ajuste y un reporte mensual. Para estimar el costo de Meta usa la calculadora de la [lección 21](../21-costos-y-metricas/) con las **tarifas oficiales de su país**, y recuerda anotar la fecha de la tarifa.

> [!importante] Verifica este dato
> Los precios de Meta y los de Cloudflare cambian. Consulta siempre la [página oficial de precios de WhatsApp](https://developers.facebook.com/docs/whatsapp/pricing) y los [precios de Workers](https://developers.cloudflare.com/workers/platform/pricing/) antes de dar una cifra, y cotiza con un margen de error (por ejemplo, +20 %).

## Hacer la demo con el simulador

Una buena demo vende más que cualquier explicación. Usa el **simulador de consola o web del curso** con el **catálogo de ejemplo del negocio** (inventado o con productos públicos), de modo que:

- **No tocas datos reales** del cliente: ni teléfonos, ni pedidos, ni clientes de su base.
- No necesitas acceso a su cuenta de Meta ni a su número.
- Puedes mostrar el flujo completo: saludo, pedido, confirmación, derivación a humano.
- Controlas el tiempo y evitas fallos de red durante la reunión.

Guion de una demo de 10 minutos:

1. Explica el problema en una frase («los clientes escriben fuera de horario»).
2. Muestra un pedido completo en el simulador, con **su** catálogo de ejemplo (nombres de productos del rubro).
3. Muestra un caso «raro» (algo que el bot no entiende) y cómo pasa a una persona.
4. Muestra el panel o resumen que vería el dueño.
5. Enseña la propuesta de una página y los costos separados (Meta, infraestructura, tu servicio).
6. Pregunta: «¿Qué haría que esto fuera útil para tu negocio?» y escucha.

> [!consejo] Demo con casos reales
> Antes de la reunión, mira el WhatsApp público o las redes del negocio y toma 3 preguntas típicas que le hacen. Programa esas en la demo; verlo funcionar con **sus preguntas** es lo que convence.

## Contrato mínimo y acuerdo de datos

Aunque sea un negocio amigo, deja por escrito lo esencial. Un contrato mínimo (que un abogado debe revisar) incluye:

- **Partes y objeto:** quién contrata a quién y qué se entrega.
- **Alcance y exclusiones** (la propuesta aprobada como anexo).
- **Precio, hitos y forma de pago**, y qué pasa con pagos atrasados.
- **Propiedad:** quién es dueño del código, de la cuenta de Meta, del número, de los datos y de los textos. Una práctica habitual: el cliente es dueño de su cuenta, su número y sus datos; tú puedes conservar tu código reutilizable general. Pacta esto con claridad.
- **Cambios fuera de alcance:** se cotizan aparte.
- **Plazos del cliente:** si no entrega catálogo o accesos, el plazo se mueve.
- **Confidencialidad.**
- **Duración y terminación:** cómo se termina el servicio y qué se entrega al irte (accesos, documentación).
- **Limitación de responsabilidad:** no respondes por fallas de Meta, bloqueos por mal uso del cliente ni por promesas que no hiciste.

### Acuerdo de datos

Cuando tu bot guarda teléfonos, direcciones y pedidos del cliente, **el negocio es quien decide para qué se usan** y tú trabajas con ellos por encargo. Deja escrito:

1. **Qué datos** trata el bot y con qué fin.
2. **Dónde** se guardan (Cloudflare KV, Google Sheets del cliente).
3. **Quién tiene acceso** y cómo se retira cuando termina la relación.
4. **Cuánto tiempo** se conservan y cómo se borran (lección [24](../24-seguridad-y-privacidad/)).
5. **Qué hacer ante un incidente** (aviso al cliente en un plazo acordado).
6. **Que la política de privacidad es del negocio**, no tuya, y que el opt-in lo obtiene él (tú entregas la herramienta).

Una buena práctica es que los **datos vivan en cuentas del cliente** (su hoja de cálculo, su cuenta de Cloudflare) y tú tengas acceso delegado. Así, si se acaba la relación, nada se pierde ni se «secuestra».

## Mantenimiento y soporte

El mantenimiento es el servicio que hace rentable el negocio y el que más se subestima. Define:

| Incluido en la mensualidad | Ejemplo |
|---|---|
| Vigilancia del bot y de errores | Revisión semanal del registro |
| Cambios pequeños | Hasta 2 cambios de texto o precios al mes |
| Soporte | Respuesta en 1 día hábil, de lunes a viernes |
| Informe mensual | 3 números y una recomendación |
| Ajustes por cambios de Meta | Actualizar la versión de la API cuando sea necesario |

**Fuera de la mensualidad:** nuevos flujos, integraciones, campañas, cursos de capacitación adicionales. Se cotizan por horas.

Define también **cómo te contactan** (un solo canal, horario) y **qué es urgente** (bot caído) frente a lo normal (cambiar un precio).

## Errores de principiante al cotizar

- **Cobrar solo por el desarrollo y regalar el soporte.** El bot vive meses; tú también debes cobrar por ellos.
- **No contar el tiempo de reuniones, catálogo y pruebas.** Suelen ser la mitad del proyecto.
- **No poner límites a los cambios.** «Un pequeño ajuste» infinito.
- **Pagar tú los mensajes de Meta** sin tope ni cláusula de ajuste.
- **Hacer la cuenta de Meta a tu nombre.** Si el cliente se va, tendrá que rehacer todo y tú quedas expuesto a sus mensajes.
- **Prometer fechas que dependen de Meta** (verificación, plantillas).
- **Ponerle precio por lo que cobra la competencia** y no por tus costos y horas.
- **Trabajar sin anticipo ni contrato.** El primer cliente que no paga te lo enseña.
- **Olvidar impuestos y comisiones.** Revisa con un contador cuánto te queda realmente.

## Apuntes para llevar

- Vende **un caso de uso claro** a negocios con consultas repetidas; evita rubros sensibles o prohibidos.
- **No prometas** entender todo, ventas garantizadas, costo cero, mensajes masivos sin permiso ni plazos de Meta.
- Una propuesta tiene **objetivo, incluye, excluye, hitos, requisitos del cliente, costos de terceros, plazo y vigencia**.
- El modelo **mixto** (implementación + mensualidad) equilibra ingresos y riesgo; cobra por hitos.
- **La cuenta de Meta y su facturación son del cliente**; la separación de costos va por escrito.
- La **demo con el simulador** evita tocar datos reales; un **acuerdo de datos** aclara roles y retención.
- Esto no es asesoría legal ni fiscal: consulta a un abogado y a un contador.

## Glosario

| Término | Significado |
|---|---|
| Alcance | Lista de entregables y exclusiones acordada con el cliente. |
| Hito | Punto del proyecto que se entrega y se aprueba (y suele asociarse a un pago). |
| Mensualidad | Cuota periódica por mantenimiento, soporte y pequeños cambios. |
| Margen | Porcentaje del precio que queda tras restar los costos. |
| Acuerdo de datos | Documento que fija qué datos se tratan, quién accede, cuánto se conservan y cómo se borran. |
| Anticipo | Pago inicial para comenzar el trabajo. |
| Simulador | Entorno de prueba que reproduce el bot sin conectarse a WhatsApp ni usar datos reales. |
| Fuera de alcance | Trabajo no incluido en la propuesta, que se cotiza aparte. |

```quiz
? ¿Quién debería ser el titular de la cuenta de WhatsApp Business y su método de pago en Meta?
- El freelancer, para controlar todo
+ El cliente, para que los mensajes se facturen a su nombre y no pierda su canal si termina la relación
- Un tercero anónimo
- Meta lo decide al azar
= Con la cuenta del cliente, el número y la facturación son suyos y tú reduces riesgos.

? ¿Cuál es una promesa que NO deberías hacer?
- «Atiende pedidos de este menú fuera de horario»
+ «El bot entenderá cualquier mensaje y te garantiza más ventas»
- «Lo que no entienda se derivará a una persona»
- «Te entrego un informe mensual con 3 números»
= Un bot de reglas entiende lo diseñado, y las ventas no están garantizadas por el bot.

? ¿Por qué conviene una demo con el simulador y un catálogo de ejemplo?
- Porque no hace falta preparar nada
+ Porque muestra el flujo sin tocar datos reales ni necesitar acceso a la cuenta del cliente
- Porque Meta lo exige
- Porque así no se paga infraestructura
= La demo es controlada, segura y no expone datos del negocio.

? ¿Qué ventaja tiene el modelo mixto (implementación única + mensualidad)?
- Evita escribir contrato
+ Cubre el trabajo inicial y el mantenimiento continuo, equilibrando ingresos y riesgo
- Elimina los costos de Meta
- Garantiza más clientes
= Cobras el esfuerzo de construir y el de sostener el bot en el tiempo.

? Un cliente pide «solo un cambio pequeño» cada semana. ¿Qué te habría protegido?
- Cobrar más desde el inicio sin decirlo
+ Definir en la propuesta cuántos cambios incluye la mensualidad y cotizar lo demás aparte
- Dejar de contestarle
- Trabajar sin contrato
= Los límites del alcance y del mantenimiento se acuerdan por escrito desde el principio.
```

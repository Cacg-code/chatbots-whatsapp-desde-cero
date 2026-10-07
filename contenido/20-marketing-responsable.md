---
titulo: Marketing responsable por WhatsApp
resumen: Cómo conseguir y registrar el permiso de tus clientes, respetar la baja al instante, enviar promociones útiles y cuidar la calidad de tu número para no ser limitado.
minutos: 55
nivel: intermedio
objetivos:
- Explicar para qué sirve y para qué no sirve el marketing por WhatsApp, y qué prohíbe la política de Meta.
- Conseguir y registrar el opt-in por cuatro vías: casilla, palabra clave, QR y formulario.
- Implementar la baja inmediata (BAJA/STOP) y una regla de frecuencia máxima como funciones puras.
- Distinguir una promoción útil de spam con ejemplos del minimarket.
- Interpretar la calidad del número, los límites de envío y las métricas para medir la respuesta.
fuentes:
- Política de WhatsApp Business | https://www.whatsapp.com/legal/business-policy
- Plantillas de mensaje (Meta) | https://developers.facebook.com/docs/whatsapp/message-templates
---
## Para qué sirve (y para qué no) el marketing por WhatsApp

WhatsApp es el canal más personal que tiene un negocio: el mensaje llega al mismo lugar donde el cliente habla con su familia. Esa cercanía es una ventaja enorme y, al mismo tiempo, la razón por la que Meta es estricta: si molestas, el cliente te bloquea o te reporta, y **tu número paga las consecuencias**.

Sirve para:

- **Avisar algo que el cliente quiere saber:** ofertas semanales de productos que ya compra, llegada de productos de temporada, un pedido listo para recoger.
- **Reactivar con respeto** a quien compró hace tiempo y pidió que le avisaras.
- **Cerrar el círculo de una compra:** confirmar, recordar, pedir una valoración.

No sirve para:

- **Cargar listas compradas, copiadas de internet o sacadas de un grupo.** Sin permiso, es spam, aunque «solo sean 200 números».
- **Sustituir tu página o tus redes.** Es un canal para clientes que **ya te dijeron que sí**, no para captar desconocidos.
- **Enviar lo mismo a todos, todos los días.** Eso no es marketing, es ruido.

> [!importante] No es asesoría legal
> Este curso explica las reglas de la plataforma y buenas prácticas. Las leyes de publicidad y de protección de datos dependen de tu país. Si vas a enviar promociones a escala, consulta a un abogado. En la [lección 24](../24-seguridad-y-privacidad/) verás más sobre datos personales.

## El opt-in: permiso claro, por categoría y comprobable

El **opt-in** es el consentimiento del cliente para que le escribas por iniciativa tuya. La política comercial de WhatsApp (*WhatsApp Business Messaging Policy*) exige que solo contactes a personas que te dieron su número y **aceptaron recibir tus mensajes**, que pidas el consentimiento **por separado para cada tipo de mensaje** (por ejemplo, actualizaciones de pedido y ofertas son cosas distintas) y que explicites cómo rechazar. Además, **tú** eres responsable de obtenerlo conforme a la ley aplicable. Puedes leer el texto original en la [política comercial de WhatsApp](https://whatsappbusiness.com/es-la/policy/).

Un buen opt-in cumple cuatro condiciones:

1. **Es explícito:** una acción clara del cliente (marcar una casilla vacía, escribir una palabra), nunca una casilla premarcada ni una letra chica.
2. **Dice qué recibirá y con qué frecuencia:** «Ofertas de la semana, máximo 2 por semana».
3. **Es separado por categoría:** quien acepta «avisos de mi pedido» no aceptó automáticamente «promociones».
4. **Queda registrado:** quién, cuándo y por qué canal. Si un cliente reclama, necesitas poder demostrarlo.

### Cuatro formas de conseguirlo en el minimarket

| Vía | Cómo funciona | Qué registrar |
|---|---|---|
| **Casilla en la compra** | En el formulario de pedido: «Quiero recibir ofertas de La Esquina por WhatsApp (máx. 2 por semana)». Desmarcada de inicio. | Teléfono, fecha, canal `casilla` |
| **Palabra clave** | El cliente escribe «OFERTAS» al número del bot y este responde pidiendo confirmación. | Teléfono, fecha, canal `palabra-clave` |
| **QR en el local** | Un cartel en caja con un QR que abre WhatsApp con el texto «Quiero recibir ofertas» ya escrito. El cliente solo toca enviar. | Teléfono, fecha, canal `qr` |
| **Formulario web o de Flows** | Un formulario con casilla de consentimiento (puede ser un [Flow](../19-whatsapp-flows/)). | Teléfono, fecha, canal `formulario` |

El QR y la palabra clave tienen una ventaja extra: como el cliente **te escribe primero**, se abre la ventana de 24 horas y puedes confirmarle su suscripción con un mensaje libre, sin costo de plantilla.

Un mensaje de confirmación de ejemplo del bot:

```text
Listo, quedaste suscrito a las ofertas de Minimarket La Esquina.
Te escribiremos como máximo 2 veces por semana.
Para dejar de recibirlas, responde BAJA en cualquier momento.
```

> [!nota] Cuenta como opt-in de promociones, no de todo
> Si el cliente solo hizo un pedido, puedes escribirle sobre **ese pedido** (utilidad). Que te haya comprado no significa que aceptó recibir ofertas. Guarda el opt-in **por tipo** (`pedidos`, `promociones`) cuando tu bot crezca.

## Registrar el opt-in en código

Un registro de opt-in puede ser tan simple como un objeto por cliente. Lo importante es que la función que lo crea **valide el canal** y **limpie cualquier baja anterior** (si el cliente se vuelve a suscribir por voluntad propia, vale su decisión más reciente).

```js promos.js
const CANALES = ["casilla", "palabra-clave", "qr", "formulario"];

function registrarOptIn(cliente, canal, ahora) {
  if (!CANALES.includes(canal)) throw new Error("Canal de opt-in desconocido: " + canal);
  return { ...cliente, optIn: { canal, fecha: ahora }, baja: null };
}
```

Fíjate en que la función **no modifica** el cliente original, devuelve uno nuevo. Esto se llama función pura y la hace fácil de probar (lo mismo harás en el ejercicio). En el bot real, el resultado se guardará en [KV](../15-memoria-con-kv/) o en tu hoja de [Google Sheets](../16-panel-con-google-sheets/).

## El opt-out: la baja tiene que funcionar al instante

Dar de baja debe ser **más fácil que suscribirse**. La política de Meta pide respetar toda solicitud de bloquear, silenciar o darse de baja, también si se hace fuera de WhatsApp. En un bot esto significa:

- Cada mensaje promocional recuerda cómo darse de baja («Responde BAJA para no recibir más»).
- El bot reconoce la baja **antes que cualquier otra lógica**, en cualquier estado de la conversación.
- Al recibirla, marca al cliente como dado de baja **de inmediato**, confirma con un mensaje breve y **no vuelve a enviar promociones** sin un nuevo opt-in.

El reconocimiento debe tolerar mayúsculas, tildes, espacios y signos (`" Stop. "`, `"BAJA"`, `"baja!"`), pero **no** debe confundir frases largas («dame la baja de precio»):

```js promos.js
function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")   // quita tildes
    .toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

const PALABRAS_BAJA = ["baja", "stop", "cancelar", "no mas", "no quiero mas mensajes"];

function procesarBaja(texto) {
  return PALABRAS_BAJA.includes(normalizar(texto));
}
```

Compara el **texto completo**, no si «contiene» la palabra. Si buscaras «baja» dentro del mensaje, el cliente que escribe «¿me pueden bajar el precio?» quedaría dado de baja por error (o al revés, ignoraríamos «STOP por favor» si fuéramos demasiado estrictos: decide una política y pruébala, como harás en el ejercicio).

> [!consejo] Mejor equivocarse hacia la baja
> Ante la duda, un cliente que pidió parar y sigue recibiendo mensajes te cuesta mucho más (reporte, bloqueo, calidad) que un cliente al que le preguntas «¿Quieres dejar de recibir ofertas? Responde BAJA para confirmar».

## Segmentación y frecuencia

**Segmentar** es enviar cada oferta solo a quien puede interesarle. No necesitas inteligencia artificial: con una etiqueta o dos ya mejora todo.

| Segmento simple | Cómo se arma | Mensaje de ejemplo |
|---|---|---|
| Compra lácteos y desayuno | Etiqueta según los productos del pedido | «Esta semana: leche y avena con descuento» |
| Compra en fin de semana | Día de sus pedidos | «Viernes de ofertas: llévalo hoy» |
| Pidió delivery | Tipo de entrega | «Delivery gratis desde S/ 40 este mes» |
| Hace 30+ días sin comprar | Fecha del último pedido | «Te extrañamos: pasa por tu pan» (solo si dio opt-in) |

La **frecuencia** es la otra palanca. Una regla sencilla y defendible: **máximo 1 o 2 promociones por semana por cliente**, y menos si no responde. Esa regla se puede programar, y debe vivir **en el código**, no en la memoria del dueño:

```js promos.js
const DIA = 24 * 60 * 60 * 1000;

function puedeRecibirPromo(cliente, ahora, maxPorSemana = 2) {
  if (!cliente.optIn || cliente.baja) return false;
  const recientes = (cliente.promosEnviadas ?? []).filter(t => ahora - t < 7 * DIA);
  return recientes.length < maxPorSemana;
}
```

Probemos con cuatro clientes de ejemplo (teléfonos falsos): Ana aceptó por casilla hace 10 días; Beto nunca dio opt-in; Carla ya recibió 2 promociones esta semana; Dino aceptó por palabra clave y luego escribió STOP.

```js probar.js
const ahora = Date.UTC(2026, 9, 7, 15, 0);
let ana = registrarOptIn({ telefono: "51999000111", promosEnviadas: [] }, "casilla", ahora - 10 * DIA);
const beto = { telefono: "51999000222", promosEnviadas: [] };
let carla = registrarOptIn({ telefono: "51999000333", promosEnviadas: [ahora - 2 * DIA, ahora - DIA] }, "qr", ahora - 30 * DIA);
let dino = registrarOptIn({ telefono: "51999000444", promosEnviadas: [] }, "palabra-clave", ahora - 5 * DIA);

for (const t of ["BAJA", " Stop. ", "Cancelar", "dame la baja de precio", "hola"]) {
  console.log(JSON.stringify(t), "->", procesarBaja(t));
}
if (procesarBaja("STOP")) dino = { ...dino, baja: ahora - 1000 };

for (const c of [ana, beto, carla, dino]) {
  console.log(c.telefono, puedeRecibirPromo(c, ahora) ? "enviar" : "NO enviar");
}
```

```salida
"BAJA" -> true
" Stop. " -> true
"Cancelar" -> true
"dame la baja de precio" -> false
"hola" -> false
51999000111 enviar
51999000222 NO enviar
51999000333 NO enviar
51999000444 NO enviar
```

Antes de enviar cualquier promoción, **cada cliente pasa por `puedeRecibirPromo`**. Solo Ana recibe el mensaje. Y tras enviar, el bot añade la hora a `promosEnviadas`, para que la regla semanal funcione.

## Plantillas de marketing

Las promociones casi siempre se envían **fuera de la ventana de 24 horas**, así que necesitan una **plantilla de la categoría marketing** aprobada por Meta (la mecánica de crearlas está en la [lección 17](../17-plantillas/)). Tres cosas a recordar:

- **Categoría honesta.** Si la plantilla promociona algo, es *marketing*. Esconder una promoción en una plantilla de utilidad para pagar menos puede terminar en reclasificación o en problemas con la cuenta. La documentación de Meta explica cómo se asigna la categoría y qué ocurre si es incorrecta.
- **Todo cuesta.** Cada plantilla de marketing entregada se cobra (lección [21](../21-costos-y-metricas/)). Por eso enviar menos y mejor también es más barato.
- **Calidad de la plantilla.** Meta mide las reacciones de los clientes a cada plantilla. Si recibe muchos reportes o se lee poco, puede quedar en estado *Medium* o *Low*, y finalmente **pausarse o desactivarse**.

Ejemplo de plantilla de marketing para el minimarket, con variables y baja incluidas:

```text
Hola {{1}}, esta semana en La Esquina: {{2}} a S/ {{3}}.
Vigente hasta el {{4}}. Para dejar de recibir ofertas, responde BAJA.
```

## Calidad del número y límites de envío

Meta puntúa la **calidad** de tus mensajes según cómo reaccionan los clientes: reportes, bloqueos, tasa de lectura. Los estados de calidad de las plantillas son *Quality pending*, *High*, *Medium* y *Low*; una plantilla en *Medium* o *Low* aún puede enviarse pero **está en riesgo de pausa**, y una plantilla pausada o desactivada **ya no se puede usar**.

Los **límites de mensajería** son el tope de **clientes distintos** a los que puedes escribir **fuera de una ventana de atención**, en un período móvil de 24 horas. Según la documentación oficial vigente al preparar esta lección, el nivel inicial de un portafolio nuevo es de **250** y los siguientes niveles son 2.000, 10.000, 100.000 e ilimitado. Se sube verificando el negocio o enviando 2.000 mensajes entregados con plantillas de alta calidad en 30 días; desde 2.000 el escalado es automático si usas al menos la mitad de tu límite durante 7 días con buena calidad.

> [!importante] Verifica este dato
> Los niveles, los requisitos de escalado y si el límite es por número o por portafolio han cambiado varias veces. Revisa [la página oficial de límites de mensajería](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits) y tu propio límite en WhatsApp Manager antes de planificar una campaña.

Para un minimarket de barrio con 300 clientes suscritos, 250 al día alcanza si repartes los envíos en varios días. La lección práctica: **no envíes todo de golpe**. Dividir la lista en tandas por día es más seguro para la calidad y respeta el límite.

## Qué prohíbe la política

Resumen de lo que la política comercial de WhatsApp establece (léela completa antes de vender un servicio a un cliente):

- **Sin permiso no hay mensaje.** Opt-in obligatorio, por categoría, con forma clara de rechazar, y respetar toda baja o bloqueo.
- **Sin spam ni engaños.** No confundir ni engañar con el contenido de los mensajes, ni suplantar a otra empresa.
- **Categorías prohibidas:** actividades ilegales, armas, drogas, productos médicos, moneda virtual, productos para adultos, servicios de citas, marketing multinivel, préstamos de día de pago, contenido discriminatorio o sexualmente explícito, entre otros. Algunos rubros regulados (por ejemplo alcohol o apuestas) solo se admiten en ciertos países y con licencias.
- **Sin datos sensibles** por chat, como números completos de tarjeta o documentos de identidad.
- **Automatización permitida, pero con salida humana:** el cliente debe poder hablar con una persona (lección [25](../25-atencion-humana/)).
- **Consecuencias:** si la calidad es baja o hay infracciones, Meta puede limitar los envíos o suspender la cuenta. La política puede cambiar sin previo aviso.

Un minimarket que vende alcohol, por ejemplo, debe revisar con cuidado qué productos promociona por este canal.

## Promociones buenas frente a spam

| Situación en La Esquina | Buena práctica | Spam |
|---|---|---|
| Oferta semanal | Martes, a quien aceptó «ofertas»: «Esta semana: leche entera 1 L a S/ 4.50» | Todos los días «¡¡¡OFERTAS!!!» a una lista que nunca dio permiso |
| Producto de temporada | A quien compró antes productos relacionados: «Llegó panetón. Reserva el tuyo» | Aviso de panetón a quien pidió «solo avisos de mi pedido» |
| «Llega temprano» | «Tu pedido #123 está listo. Recógelo hoy hasta las 8 pm» (**utilidad**, de su pedido real) | «Ven hoy y llévate descuento» disfrazado como aviso de pedido |
| Reactivación | Un solo mensaje a quien compró hace 40 días y aceptó ofertas, con baja visible | Cinco recordatorios seguidos «¿dónde estás?» |
| Respuesta a «BAJA» | Confirmar una vez y no volver a escribir | «Lamentamos que te vayas, mira esta oferta especial» |

Observa que el aviso «recoge tu pedido» no es marketing: es información sobre algo que el cliente pidió. Esa distinción importa para la categoría de la plantilla y para su costo, pero **nunca la uses para colar una promoción**.

## Medir la respuesta

Marketing sin medición es adivinar. Con pocos datos tienes bastante:

- **Entregados y leídos:** cuántas plantillas se entregaron y cuántas se leyeron (Meta informa los estados por webhook).
- **Respuestas y pedidos:** cuántos clientes respondieron o hicieron un pedido en las 24 horas siguientes.
- **Bajas:** cuántos escribieron BAJA tras la campaña. Una subida brusca es la alarma más clara de que algo está mal (mensaje, frecuencia o segmento).
- **Calidad del número:** revisa el estado en WhatsApp Manager después de cada campaña.

Un buen hábito: antes de una campaña grande, pruébala con un grupo pequeño (20 clientes). Si el resultado es bueno, amplía; si hay bajas, corrige. En la [lección 21](../21-costos-y-metricas/) verás cómo calcular el costo de cada campaña y registrar estas métricas.

## Errores frecuentes

- **Importar una lista de contactos «porque son clientes».** Haber comprado no es haber aceptado promociones por WhatsApp.
- **Casilla premarcada o consentimiento escondido** en los términos y condiciones.
- **No registrar cuándo ni cómo aceptó.** Sin registro no puedes defenderte ni probar nada.
- **Ignorar la baja o procesarla «por la mañana».** Debe ser inmediata y verificarse antes de cada envío.
- **Disfrazar una promoción de aviso de pedido** para evitar la categoría marketing.
- **Enviar todo a todos de golpe.** Es lo que más daña la calidad del número.
- **Seguir escribiendo a quien nunca responde.** Cada envío sin respuesta baja tu tasa de lectura.

## Apuntes para llevar

- El marketing por WhatsApp es para quien **ya aceptó**: cálido, útil y poco frecuente.
- El **opt-in** es explícito, por categoría y queda **registrado** (teléfono, fecha, canal).
- La **baja** (BAJA/STOP) se respeta al instante y se comprueba antes de cada envío.
- Limita la **frecuencia** (por ejemplo 2 por semana) y **segmenta** con criterios simples.
- Las promociones usan plantillas de **marketing**; la categoría debe ser honesta.
- Vigila la **calidad** y los **límites de mensajería**: envía en tandas y mide bajas y lecturas.
- Esta lección no es asesoría legal: consulta las leyes de tu país.

## Glosario

| Término | Significado |
|---|---|
| Opt-in | Consentimiento explícito del cliente para recibir mensajes del negocio. |
| Opt-out / baja | Solicitud del cliente de dejar de recibir mensajes; debe respetarse de inmediato. |
| Plantilla de marketing | Plantilla aprobada de categoría promocional, enviable fuera de la ventana y cobrada por mensaje. |
| Calidad | Puntuación que Meta asigna según la reacción de los clientes (lecturas, bloqueos, reportes). |
| Límite de mensajería | Máximo de clientes distintos a los que puedes escribir fuera de la ventana en 24 h. |
| Segmentación | Dividir a los clientes en grupos para enviar a cada uno lo que le interesa. |
| Función pura | Función que depende solo de sus argumentos y no modifica nada fuera de ella. |

```quiz
? Un cliente compró tres veces en tu minimarket pero nunca aceptó recibir promociones. ¿Puedes enviarle la oferta semanal?
- Sí, porque es un cliente frecuente
- Sí, si usas una plantilla de utilidad
+ No: sin opt-in para promociones, no
- Sí, siempre que incluyas un enlace de baja
= Haber comprado no es consentimiento. Se necesita un opt-in explícito para cada tipo de mensaje.

? ¿Cuál de estas opciones es una forma válida y registrable de conseguir opt-in?
- Una casilla premarcada en los términos y condiciones
- Importar los contactos del teléfono del dueño
+ Un QR en caja que abre un chat con «Quiero recibir ofertas» y que el cliente envía
- Añadir a los clientes a un grupo sin avisarles
= El cliente realiza una acción clara y su mensaje queda como prueba de fecha y canal.

? Un cliente responde «STOP». ¿Qué debe hacer el bot?
- Responderle con una oferta especial para que se quede
- Esperar a la campaña siguiente para marcar la baja
+ Marcar la baja de inmediato, confirmar una vez y no enviar más promociones sin un nuevo opt-in
- Ignorarlo si ya recibió menos de dos mensajes esa semana
= La política exige respetar las solicitudes de baja; se verifica antes de cada envío.

? ¿Qué hace tu cuenta si muchos clientes reportan o bloquean tus mensajes?
- Nada: solo cuenta el volumen enviado
+ Baja la calidad: las plantillas pueden pausarse y Meta puede limitar o suspender el envío
- Meta cobra una tarifa de recuperación
- El cliente recibe un reembolso
= La calidad depende de la reacción de los clientes y de ella dependen plantillas y límites.

? ¿Por qué conviene dividir una campaña en tandas diarias?
- Porque Meta lo exige siempre
+ Porque respeta el límite de clientes por 24 horas y protege la calidad si algo sale mal
- Porque las plantillas caducan cada hora
- Porque se pagan menos mensajes
= Enviar en tandas permite medir, corregir y no exceder el límite de mensajería.
```

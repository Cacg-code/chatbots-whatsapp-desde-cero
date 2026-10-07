---
titulo: Atención humana y traspaso
resumen: Cómo pasar una conversación a una persona sin que el bot interfiera, respetar horarios, avisar al dueño y devolverle la conversación al bot cuando corresponde.
minutos: 55
nivel: intermedio
objetivos:
- Explicar cuándo un bot debe ceder la conversación a una persona y cómo se detecta ese momento.
- Describir cómo el motor del curso se calla en modo humano (ESPERANDO_HUMANO) y cómo se vuelve al bot.
- Calcular si el negocio está abierto en la hora de Lima y adaptar el mensaje del traspaso.
- Avisar al dueño respetando la ventana de 24 horas (texto libre o plantilla).
- Evitar que un cliente quede esperando para siempre con un tiempo máximo de espera.
---
## Por qué todo bot necesita una salida a una persona

Un bot de reglas resuelve bien lo repetitivo: catálogo, pedido, horario. Pero hay conversaciones que no debe resolver él: un reclamo por un producto vencido, una duda sobre una factura, un cliente molesto, una compra grande que quiere negociar. Si el bot insiste con «No te entendí, puedes escribir 2 leches», el cliente se frustra y se va.

La regla de diseño es simple: **nadie debe quedar atrapado en el bot**. Siempre debe existir un camino a una persona, y ese camino debe ser fácil de encontrar. Ya lo diseñaste desde la [lección 2](../02-disenar-la-conversacion/) con el botón «Hablar con alguien»; ahora vamos a hacerlo funcionar de verdad: qué pasa en el bot, a quién se avisa y cómo se vuelve.

El traspaso (en inglés *handoff*) tiene cuatro partes:

```flujo
Cliente|pide una persona
-> el bot cambia de modo
Bot|se calla
-> aviso
Dueño|recibe el aviso
-> responde
Cliente|conversa con una persona
```

## Cuándo pasar a una persona

Hay tres disparadores, de más claro a más sutil:

1. **El cliente lo pide.** Escribe «persona», «asesor», «quiero hablar con el dueño», o toca el botón «Hablar con alguien».
2. **El bot falla dos veces seguidas.** No entiende dos mensajes seguidos y ofrece el botón. Es lo que hace el código de referencia (contador `fallos`).
3. **El tema es delicado.** Reclamos, devoluciones, dinero, salud. Aquí conviene derivar aunque el bot «entendió».

Veamos qué reconoce hoy el motor, con frases reales de clientes. La función `detectarIntencion` de `src/texto.js` devolvió:

```salida
"quiero hablar con una persona" -> humano
"pasame con el dueño" -> humano
"necesito un asesor" -> humano
"atencion al cliente" -> humano
"hablar con alguien por favor" -> humano
"el encargado está?" -> humano
"tengo un reclamo" -> desconocida
"esto es una estafa" -> desconocida
```

Las frases de «persona» funcionan, pero un **reclamo** no se reconoce: el bot respondería «No te entendí». Es exactamente el tercer disparador. La solución es agregar esas palabras a la lista de la intención `humano` en tu copia de `texto.js` (por ejemplo `reclamo`, `queja`, `devolucion`, `estafa`, `denuncia`). Es una lista de palabras: se mantiene con el uso, revisando las conversaciones en las que el bot no entendió.

> [!consejo] Mejor derivar de más que de menos
> Una derivación innecesaria cuesta unos minutos de una persona. Un reclamo ignorado por un bot cuesta un cliente, y quizá una mala reseña. Ante la duda, ofrece el botón.

## Qué hace hoy el motor en modo humano

El motor del curso ya sabe «callarse». Cuando detecta la intención `humano`, cambia el estado de la sesión a `ESPERANDO_HUMANO`, marca `derivadoHumano = true` y responde una sola vez que avisó al equipo. A partir de ahí, **no responde nada** hasta que el cliente escriba `menu` o `cancelar`. Mira el comportamiento real, ejecutado en una conversación de prueba:

```js prueba.js
const c = conversacion('51999000111');
c.decir('2 leches');
c.decir('quiero hablar con una persona');
console.log('1)', c.sesion.estado, c.sesion.derivadoHumano, '|', c.texto);
c.decir('hola? alguien?');
console.log('2) respuestas del bot:', c.respuestas.length);
c.enviar({ tipo: 'no_soportado', subtipo: 'audio' });
console.log('3) a un audio:', c.respuestas.length);
c.tocar('pago:yape');
console.log('4) a un botón viejo:', c.respuestas.length, c.sesion.estado);
c.decir('menu');
console.log('5)', c.sesion.estado, c.sesion.derivadoHumano, '| carrito:', c.sesion.carrito.length);
```

```salida
1) ESPERANDO_HUMANO true | Listo, avisé a una persona del equipo. Te responderá en este chat lo antes posible. Para volver al asistente escribe "menu".
2) respuestas del bot: 0
3) a un audio: 0
4) a un botón viejo: 0 ESPERANDO_HUMANO
5) MENU false | carrito: 1
```

Observa cuatro cosas:

- **El bot se calla de verdad**: ni a un «hola?», ni a un audio, ni a un botón antiguo. Así no pisa a la persona que está escribiendo al cliente.
- **El carrito se conserva** (línea 5): al volver, el cliente no pierde lo que había pedido.
- **El camino de vuelta existe**: escribir `menu`. Está dicho en el propio mensaje.
- El código del motor es el que decide el silencio; por eso el aviso al dueño **no** vive en el motor. Recuerda: el motor es puro y no envía nada. El aviso es trabajo de la capa de entrada y salida, el Worker.

> [!importante] El silencio tiene un riesgo
> Si nadie responde, el cliente queda esperando en silencio hasta que su sesión expire (2 días en el código de referencia). Un cliente ignorado es peor que un cliente atendido por un bot. Más abajo ponemos un tiempo máximo.

## ¿Y cómo contesta la persona?

Esta es una decisión de arquitectura, no de código, y hay tres caminos. Elige según el tamaño del negocio:

| Camino | Cómo funciona | Cuándo conviene |
|---|---|---|
| **App de WhatsApp Business con el mismo número** | El dueño responde desde la app en su teléfono. | Negocios muy pequeños. Meta ofrece un modo de convivencia entre app y API que cambia con el tiempo. |
| **Panel propio** | Un panel web que lista las conversaciones derivadas y envía respuestas por la API. | Cuando varias personas atienden. Requiere desarrollo extra. |
| **Bandeja de un proveedor (BSP)** | Herramientas como las de un proveedor de soluciones ya incluyen bandeja de equipo. | Cuando prefieres pagar a construir. |

> [!importante] Verifica este dato
> Si un mismo número puede usarse a la vez en la app de WhatsApp Business y en la API, y bajo qué condiciones, es un punto que Meta ha cambiado varias veces. Antes de prometérselo a un cliente, revisa la [documentación oficial de WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp/) sobre coexistencia con la app.

Para el curso construimos lo común a los tres caminos: **avisar** a la persona correcta en el momento correcto y **devolver** la conversación al bot.

## Horarios: no prometas lo que no puedes cumplir

El mensaje «Te responderá lo antes posible» es amable a las 10 de la mañana y engañoso a las 11 de la noche. Si el negocio está cerrado, hay que decirlo con honestidad y dar la hora en que abre.

Necesitamos una función `estaAbierto(ahora)`. Dos detalles de diseño:

- **Zona horaria.** El Worker corre en servidores de cualquier parte del mundo y `Date.now()` es un instante universal (UTC). Perú está en UTC-5 y no usa horario de verano, así que restar 5 horas basta. Si tu negocio estuviera en un país con cambio de hora, necesitarías una biblioteca o `Intl.DateTimeFormat` con zona horaria.
- **Horario por día.** El minimarket abre de lunes a sábado de 8:00 a 21:00 y los domingos de 9:00 a 14:00. En una tabla por día de la semana (0 es domingo) queda claro y fácil de cambiar:

```js humano.js
const HORA = 3600 * 1000;
const HORARIO = { 0: [9, 14], 1: [8, 21], 2: [8, 21], 3: [8, 21], 4: [8, 21], 5: [8, 21], 6: [8, 21] };
const DESFASE_LIMA_MS = -5 * HORA;

export function estaAbierto(ahora, horario = HORARIO) {
  const lima = new Date(ahora + DESFASE_LIMA_MS); // leemos los campos UTC de la hora "corrida"
  const franja = horario[lima.getUTCDay()];
  if (!franja) return false;
  const hora = lima.getUTCHours() + lima.getUTCMinutes() / 60;
  return hora >= franja[0] && hora < franja[1];
}
```

El truco es sumar el desfase y luego leer los campos `getUTC...`: así el resultado no depende de la zona del servidor. Lo verificamos con fechas concretas (el 7 de octubre de 2026 es miércoles):

```js humano.test.js
const miercoles10am = Date.UTC(2026, 9, 7, 15, 0); // 15:00 UTC = 10:00 en Lima

test('estaAbierto respeta el horario de Lima', () => {
  assert.equal(estaAbierto(miercoles10am), true);
  assert.equal(estaAbierto(Date.UTC(2026, 9, 8, 2, 30)), false);   // miércoles 21:30 en Lima
  assert.equal(estaAbierto(Date.UTC(2026, 9, 11, 13, 0)), false);  // domingo 08:00: aún cerrado
  assert.equal(estaAbierto(Date.UTC(2026, 9, 11, 15, 0)), true);   // domingo 10:00
  assert.equal(estaAbierto(Date.UTC(2026, 9, 11, 19, 30)), false); // domingo 14:30
});
```

Pasa (nota que el mes de `Date.UTC` empieza en 0: `9` es octubre). Cuando el cliente pide una persona fuera de horario, el bot enviará un segundo mensaje honesto, que no promete respuesta inmediata:

```js humano.js
export function mensajeFueraDeHorario() {
  return {
    tipo: 'texto',
    texto: 'Ahora estamos fuera de horario, pero tu mensaje quedó registrado. Una persona te responderá apenas abramos. ' +
      'Atendemos de lunes a sábado de 8:00 a 21:00 y domingos de 9:00 a 14:00. Mientras tanto, escribe "menu" para seguir con el asistente.',
  };
}
```

Fíjate en el final: aunque nadie esté, el cliente puede **seguir con el bot** escribiendo «menu». Un traspaso fuera de horario no tiene por qué dejarlo sin poder pedir su compra.

## Avisar al dueño (y la ventana de 24 horas)

Para que alguien atienda, alguien tiene que enterarse. El aviso es un mensaje de WhatsApp al teléfono del dueño con lo mínimo para actuar: quién es, qué tiene en el carrito y dónde responder.

```js humano.js
export function textoAvisoDueno(sesion, nombre) {
  const items = sesion.carrito.reduce((n, l) => n + l.cantidad, 0);
  const quien = nombre ? `${nombre} (${sesion.telefono})` : sesion.telefono;
  const carrito = items > 0 ? `Tiene ${items} producto(s) en el carrito.` : 'No tiene nada en el carrito.';
  return `Cliente pide atención: ${quien}. ${carrito} Respóndele desde el chat de WhatsApp del negocio.`;
}
```

Aquí reaparece la regla más importante de la plataforma, la [ventana de 24 horas](../01-como-funciona-un-bot/). El dueño es, para la API, **un destinatario más**: solo puedes enviarle texto libre si él te escribió al número del bot en las últimas 24 horas. Si no, necesitas una **plantilla** aprobada. Reutilizamos `puedeEnviarTexto` y `construirPlantilla` del código de referencia:

```js humano.js
export async function avisarAlDueno(env, sesion, nombre, ahora, llamar = fetch) {
  const sesionDueno = await leer(env.BOT_KV, `sesion:${env.DUENO_TEL}`);
  const cuerpo = puedeEnviarTexto(sesionDueno?.ultimoMensajeCliente, ahora)
    ? construirEnvio(env.DUENO_TEL, { tipo: 'texto', texto: textoAvisoDueno(sesion, nombre) })
    : construirPlantilla(env.DUENO_TEL, 'aviso_atencion', 'es', [sesion.telefono]); // plantilla propia, aprobada antes
  await enviarMensaje(env, cuerpo, llamar);
}
```

La plantilla `aviso_atencion` es un nombre propuesto por nosotros: tendrás que crearla y esperar su aprobación en Meta (lección [17](../17-plantillas/)), con un cuerpo como «Un cliente pide atención por WhatsApp: {{1}}. Revisa el chat del negocio». Pide a tu dueño que escriba «hola» al bot al empezar el turno: eso abre su ventana y los avisos salen como texto libre.

> [!importante] Verifica este dato
> La categoría de una plantilla de aviso interno (utilidad o marketing) y su costo los decide Meta y cambian con el tiempo. Consulta [la página oficial de precios](https://developers.facebook.com/docs/whatsapp/pricing) antes de decidir si el aviso por WhatsApp te conviene o si es mejor avisar por otro canal (un correo, o un aviso en tu panel).

## Conectarlo al Worker sin tocar el motor

El motor no se modifica: sigue siendo puro. El aviso se agrega con una **envoltura** alrededor de `procesarMensaje` del Worker. La idea: mira la sesión antes y después; si **acaba de pasar** a `ESPERANDO_HUMANO`, avisa. Comparar antes y después evita avisar de nuevo cada vez que el cliente insiste («hola?? alguien»).

```js humano.js
export async function procesarConHumano(env, evento, ahora = Date.now(), llamar = fetch) {
  const kv = env.BOT_KV;
  const antes = await leer(kv, `sesion:${evento.de}`);
  await procesarMensaje(env, evento, ahora, llamar);
  const despues = await leer(kv, `sesion:${evento.de}`);
  const acabaDeDerivar = despues?.estado === 'ESPERANDO_HUMANO' && antes?.estado !== 'ESPERANDO_HUMANO';
  if (!acabaDeDerivar) return;

  await kv.put(`humano:${evento.de}`, JSON.stringify({ desde: ahora }), { expirationTtl: 2 * 24 * 3600 });
  if (!estaAbierto(ahora)) await enviarMensaje(env, construirEnvio(evento.de, mensajeFueraDeHorario()), llamar);
  await avisarAlDueno(env, despues, evento.nombre, ahora, llamar);
}
```

Además de avisar, guarda `humano:<teléfono>` con la hora en que empezó el modo humano: la usaremos para el tiempo máximo. En tu `worker.js` bastaría con llamar a `procesarConHumano` en lugar de `procesarMensaje`.

Probamos con un KV falso y un `fetch` falso, que anotan lo que el Worker enviaría. Primero, dentro del horario y con el dueño que **nunca** le escribió al bot:

```salida
al cliente: [
  'Listo, avisé a una persona del equipo. Te responderá en este chat lo antes posible. Para volver al asistente escribe "menu".'
]
al dueño: [ 'aviso_atencion' ]
```

El cliente recibe un único mensaje y el dueño una plantilla (su ventana estaba cerrada). Ahora, con el dueño que ya había escrito «hola» al bot:

```salida
Cliente pide atención: Rosa (51999000111). Tiene 2 producto(s) en el carrito. Respóndele desde el chat de WhatsApp del negocio.
```

Y a las 22:00, fuera de horario, el cliente recibe **dos** textos: el mensaje normal y el aviso de horario:

```salida
[
  'Listo, avisé a una persona del equipo. Te responderá en este chat lo antes posible. Para volver al asistente escribe "menu".',
  'Ahora estamos fuera de horario, pero tu mensaje quedó registrado. Una persona te responderá apenas abramos. Atendemos de lunes a sábado de 8:00 a 21:00 y domingos de 9:00 a 14:00. Mientras tanto, escribe "menu" para seguir con el asistente.'
]
```

Otra prueba confirma que un segundo «persona» no vuelve a molestar al dueño: tras el primer aviso, los siguientes mensajes del cliente solo producen llamadas de «marcar como leído».

> [!consejo] Mejora de redacción
> Dos mensajes seguidos («te responderá lo antes posible» y «estamos fuera de horario») se contradicen un poco. En tu bot real puedes hacer que `mensajes.esperandoHumano()` reciba el dato de si está abierto y diga solo una cosa. Aquí lo dejamos como segundo mensaje para no modificar el motor.

## Volver al bot: cuando nadie responde

Hay dos formas de que el cliente vuelva al modo bot:

1. **Él mismo**, escribiendo `menu` (o `cancelar`). Ya funciona.
2. **Automáticamente**, si pasó demasiado tiempo sin atención. Es la red de seguridad contra el silencio eterno.

Para la segunda usamos el cron del Worker, el mismo que ya ejecuta los recordatorios de la [lección 18](../18-recordatorios-y-seguimiento/). Cada vez que corre, revisa las claves `humano:*` y libera las que llevan 3 horas o más:

```js humano.js
export function humanoVencido(desde, ahora, maxMs = 3 * HORA) {
  return desde != null && ahora - desde >= maxMs;
}

export async function liberarHumanosVencidos(env, ahora = Date.now(), llamar = fetch) {
  const kv = env.BOT_KV;
  const { keys } = await kv.list({ prefix: 'humano:' });
  const liberados = [];
  for (const { name } of keys) {
    const { desde } = await leer(kv, name);
    if (!humanoVencido(desde, ahora)) continue;
    const tel = name.slice('humano:'.length);
    const sesion = await leer(kv, `sesion:${tel}`);
    if (sesion?.estado === 'ESPERANDO_HUMANO') {
      const nueva = { ...sesion, estado: 'MENU', derivadoHumano: false };
      await kv.put(`sesion:${tel}`, JSON.stringify(nueva), { expirationTtl: 2 * 24 * 3600 });
      if (puedeEnviarTexto(sesion.ultimoMensajeCliente, ahora)) {
        const texto = 'Seguimos con poco personal y no pudimos responderte aún. Vuelvo a ayudarte yo: escribe "menu" o lo que necesites.';
        await enviarMensaje(env, construirEnvio(tel, { tipo: 'texto', texto }), llamar);
      }
      liberados.push(tel);
    }
    await kv.delete(name);
  }
  return liberados;
}
```

Lo importante: el mensaje de disculpa **solo** se envía si la ventana de 24 horas sigue abierta; si no, se libera al cliente en silencio (no puedes escribirle texto libre). La prueba usa un reloj falso:

```js humano.test.js
test('si nadie atiende en 3 h, el bot vuelve', async () => {
  const env = entorno(); const g = falsoGraph();
  await procesarConHumano(env, msg('w1', 'persona'), miercoles10am, g.llamar);
  assert.deepEqual(await liberarHumanosVencidos(env, miercoles10am + 2 * H, g.llamar), []);
  assert.deepEqual(await liberarHumanosVencidos(env, miercoles10am + 3 * H, g.llamar), ['51999000111']);
  assert.equal(JSON.parse(env.datos.get('sesion:51999000111')).estado, 'MENU');
  assert.equal(env.datos.has('humano:51999000111'), false);
});
```

```salida
✔ estaAbierto respeta el horario de Lima (0.8961ms)
✔ pedir una persona dentro del horario: el bot avisa al cliente y al dueño (6.6997ms)
✔ con la ventana del dueño abierta se le avisa con texto libre (3.1902ms)
✔ fuera de horario el cliente recibe el aviso de horario (0.8871ms)
✔ un segundo "persona" no vuelve a avisar al dueño (0.9272ms)
✔ si nadie atiende en 3 h, el bot vuelve (1.2028ms)
✔ humanoVencido (0.1265ms)
```

A las 2 horas no libera a nadie; a las 3 sí, y la sesión queda en `MENU`. Cuando la persona **sí** atiende y termina, no hay nada que hacer: el cliente escribe `menu` cuando quiera volver, o la sesión vence sola.

> [!nota] Pendiente de producción
> En el código de referencia, `ejecutarRecordatorios` es lo que corre en el cron. Para activar la liberación, llamarías a `liberarHumanosVencidos(env)` desde la función `scheduled` junto a ella. No lo modificamos aquí; el proyecto final te guía.

## Privacidad: el humano ve datos reales

Cuando una persona toma la conversación, ve el teléfono del cliente, su nombre de perfil y lo que escribió. Sigue las reglas de la [lección 24](../24-seguridad-y-privacidad/): comparte el acceso solo con quien atiende, no reenvíes pantallazos con datos de clientes a grupos, y no guardes en el aviso al dueño más datos de los necesarios (por eso el aviso lleva el teléfono y la cantidad de productos, no la lista completa del carrito ni la dirección).

## Errores frecuentes

- **Esconder la salida a una persona.** Si el bot solo la ofrece tras seis intentos fallidos, el cliente ya se fue. Debe estar en el menú.
- **Que el bot siga hablando mientras una persona escribe.** Dos voces a la vez confunden al cliente. El estado `ESPERANDO_HUMANO` existe para evitarlo.
- **Avisar al dueño en cada mensaje.** Se vuelve ruido y acaba ignorándose. Avisa solo en la transición.
- **Olvidar la ventana de 24 horas al avisar.** El dueño también es un destinatario: sin ventana abierta, solo vale una plantilla aprobada.
- **Prometer «respuesta inmediata» fuera de horario.** Di cuándo abres. Es honesto y evita reclamos.
- **Silencio sin fecha de vencimiento.** Sin tiempo máximo, un cliente puede esperar dos días a nadie.
- **Calcular la hora con el reloj del servidor.** Usa un desfase explícito (UTC-5 para Lima), no la zona del servidor, que puede estar en otro continente.

## Apuntes para llevar

- Todo bot debe tener una salida clara a una persona: la pide el cliente, falla dos veces o el tema es delicado (reclamos).
- En el motor, `ESPERANDO_HUMANO` hace que el bot se calle y conserve el carrito; `menu` o `cancelar` devuelven al bot.
- El aviso al dueño no va en el motor (que es puro) sino en el Worker, y solo cuando la sesión **acaba de pasar** a modo humano.
- El dueño es un destinatario más: texto libre si su ventana de 24 horas está abierta; plantilla aprobada si no.
- Fuera de horario, dilo con honestidad, da la hora de apertura y deja que el cliente siga con el bot.
- Pon un tiempo máximo de espera (3 horas en el ejemplo) y libera al cliente para que nunca quede en silencio indefinido.

## Glosario

| Término | Significado |
|---|---|
| Handoff (traspaso) | Momento en que la conversación pasa del bot a una persona. |
| ESPERANDO_HUMANO | Estado del motor en el que el bot no responde para no interferir con la persona. |
| Envoltura (wrapper) | Función que llama a otra y le añade comportamiento sin modificarla. |
| Desfase horario | Diferencia con UTC; Lima es UTC-5 todo el año. |
| Plantilla de aviso | Plantilla aprobada que se envía al dueño cuando su ventana de 24 h está cerrada. |
| Tiempo máximo de espera | Plazo tras el cual el bot retoma la conversación si nadie atendió. |

```quiz
? ¿Por qué el aviso al dueño no se programa dentro de `procesar` (el motor)?
- Porque Meta lo prohíbe
+ Porque el motor es una función pura sin entrada ni salida; enviar mensajes es trabajo del Worker
- Porque el motor no conoce el teléfono del dueño
- Porque los avisos siempre deben ir por correo
= Mantener el motor puro lo hace fácil de probar; el Worker es la capa que habla con la red.

? Un cliente en estado ESPERANDO_HUMANO escribe «hola? alguien?». ¿Qué responde el bot?
- Vuelve a mostrar el menú
- Repite «avisé a una persona»
+ Nada: se calla para no interferir con la persona que atiende
- Le pide que espere 24 horas
= En ese estado solo `menu` o `cancelar` sacan al cliente del silencio.

? El dueño nunca ha escrito al bot. Un cliente pide una persona. ¿Cómo se le avisa?
- Con texto libre, siempre
+ Con una plantilla aprobada, porque su ventana de 24 horas está cerrada
- No se le puede avisar
- Con una imagen
= Para la API el dueño es un destinatario más: sin ventana abierta solo valen plantillas.

? ¿Por qué se compara la sesión antes y después de procesar el mensaje?
- Para guardar un historial
+ Para avisar solo cuando la sesión acaba de pasar a modo humano, no en cada mensaje posterior
- Para ahorrar memoria en KV
- Para saber qué hora es
= Sin la comparación, cada «hola??» del cliente generaría un nuevo aviso al dueño.

? ¿Para qué sirve el tiempo máximo de espera en modo humano?
- Para cobrar menos a Meta
+ Para que un cliente no quede en silencio indefinido si nadie lo atiende
- Para borrar su carrito
- Para cambiar el horario del negocio
= Pasadas las 3 horas el bot retoma la conversación y puede ofrecer el menú.
```

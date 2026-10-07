---
titulo: Recordatorios y seguimiento automático
resumen: Cómo enviar avisos útiles a tiempo con un cron, elegir entre texto libre y plantilla según la ventana de 24 horas, y respetar la baja del cliente.
minutos: 60
nivel: intermedio
objetivos:
- Explicar por qué un recordatorio automático necesita un disparador de tiempo (cron) y no solo el webhook.
- Decidir con código si un recordatorio sale como texto libre o como plantilla según la ventana de 24 horas.
- Leer y ejecutar `pedidosParaRecordar` y `carritosAbandonados`, y razonar sobre sus umbrales.
- Configurar un cron trigger de Cloudflare y simular su ejecución con un almacenamiento falso.
- Aplicar baja (opt-out), frecuencia máxima y horario razonable antes de enviar cualquier aviso.
fuentes:
- Cron Triggers de Workers | https://developers.cloudflare.com/workers/configuration/cron-triggers/
- Plantillas de mensaje (Meta) | https://developers.facebook.com/docs/whatsapp/message-templates
---
## Por qué un bot necesita un reloj

Hasta ahora tu bot es **reactivo**: no hace nada hasta que Meta llama al webhook con un mensaje. Un recordatorio es lo contrario: el cliente **no escribió nada** y aun así el bot debe actuar. «Hace una hora dejó un carrito sin cerrar» no es un evento que Meta te envíe; es la **ausencia** de un evento. Alguien tiene que mirar el reloj.

Ese «alguien» es un **cron**: un disparador que ejecuta tu código cada cierto tiempo. En Cloudflare se llama *Cron Trigger* y llama a la función `scheduled` de tu Worker. Cada vez que se dispara, tu código hace tres cosas:

1. **Lee** el estado guardado (pedidos y sesiones en KV).
2. **Decide** a quién corresponde un aviso (funciones puras, fáciles de probar).
3. **Envía** los mensajes y **anota** que ya los envió, para no repetirlos.

```flujo
Cron|cada 15 min
-> scheduled()
Tu Worker|lee KV y decide
-> API de Meta
Cliente|recibe el aviso
```

Esta separación (decidir vs. enviar) es la misma idea de siempre en el curso: la lógica va en funciones puras sin red, y el Worker es la carcasa con entrada y salida. Si no recuerdas por qué, repasa la [lección 10](../10-servidor-del-bot/) y la [lección 15](../15-memoria-con-kv/).

## Qué conviene recordar (y qué no)

Un recordatorio vale la pena cuando **ayuda al cliente a terminar algo que él mismo empezó**. En el minimarket hay dos casos claros:

| Caso | Disparador | Qué dice el mensaje |
|---|---|---|
| **Pedido recibido sin novedad** | Pasaron más de 30 minutos y el pedido sigue en estado `recibido` | «Tu pedido LE-102 sigue en preparación. Si necesitas algo, escríbenos.» |
| **Carrito pendiente** | El cliente armó un carrito y no lo cerró en más de 1 hora | «Dejaste productos en tu carrito. Escribe "carrito" para retomar tu pedido.» |

En un negocio de citas (una clínica, una peluquería) el recordatorio estrella es el de la cita del día siguiente: el cliente se acuerda, o avisa que no irá y liberas el cupo, así que bajan las inasistencias. En el minimarket el equivalente es **evitar pedidos que se enfrían**: el cliente pidió, nadie le confirmó, y se fue a otra tienda. El principio es el mismo: un aviso útil, en el momento justo.

Lo que **no** es un recordatorio:

- Una promoción disfrazada («te dejamos tu carrito con 5 % de descuento»): eso es marketing y sigue las reglas de la [lección 20](../20-marketing-responsable/).
- Un aviso repetido cada hora hasta que el cliente responda. Un recordatorio se envía **una vez**; dos ya empiezan a molestar.
- Un mensaje a quien dijo que no quería recibir más.

> [!importante] Verifica este dato
> Meta decide la **categoría** de cada plantilla (utilidad o marketing) según su contenido, no según lo que tú elijas al crearla, y los avisos de «carrito abandonado» suelen caer en marketing. Eso cambia el precio y las reglas (opt-in, límites por usuario). Revisa el [resumen de plantillas](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview) y la [página de precios](https://developers.facebook.com/docs/whatsapp/pricing) antes de cotizar.

## La ventana de 24 horas decide el formato

En la [lección 1](../01-como-funciona-un-bot/) viste la regla: si el cliente escribió hace **menos de 24 horas**, puedes enviar texto libre; si no, solo una **plantilla aprobada**. El código de referencia la implementa en `src/recordatorios.js`:

```js recordatorios.js
export const VENTANA_MS = 24 * HORA;

/** ¿Seguimos dentro de la ventana de 24 h para escribir texto libre? */
export function puedeEnviarTexto(ultimoMensajeCliente, ahora) {
  if (ultimoMensajeCliente == null) return false;
  return ahora - ultimoMensajeCliente < VENTANA_MS;
}
```

La comprobación `null` es importante: si nunca guardaste cuándo escribió el cliente, lo seguro es suponer que la ventana está **cerrada**. Las pruebas del repositorio verifican estos casos:

```bash
node --test test/recordatorios.test.js
```

```salida
✔ pedidosParaRecordar: entre 30 min y 23 h (1.7113ms)
✔ pedidosParaRecordar: solo estado recibido y sin recordatorio previo (0.1848ms)
✔ pedidosParaRecordar: usa actualizadoEn si existe (0.9565ms)
✔ pedidosParaRecordar con lista vacía (0.1546ms)
✔ carritosAbandonados: carrito lleno, inactivo entre 1 h y 23 h (0.3144ms)
✔ carritosAbandonados: ignora carritos vacíos, ya avisados y estados fuera de compra (0.1959ms)
✔ puedeEnviarTexto: ventana de 24 horas (0.2008ms)
✔ puedeEnviarTexto: sin mensaje previo del cliente no se puede (0.1178ms)
ℹ tests 8
ℹ pass 8
ℹ fail 0
```

(Los milisegundos varían en tu máquina; se omitieron algunas líneas finales del resumen.)

¿Por qué los umbrales de los pedidos y carritos terminan en **23 horas** y no en 24? Porque el cron corre cada 15 minutos y el envío tarda unos segundos: si esperaras hasta la hora 23 y 59, el mensaje podría cruzar el límite mientras viaja y salir rechazado. Se deja **una hora de margen**. Esa es una decisión de diseño tuya, no una regla de Meta.

## Qué hacen `pedidosParaRecordar` y `carritosAbandonados`

Son funciones **puras**: reciben listas y la hora actual, devuelven una sublista. Mira la primera:

```js recordatorios.js
export function pedidosParaRecordar(pedidos, ahora) {
  return pedidos.filter((p) => {
    if (p.estado !== 'recibido' || p.recordadoEn) return false;
    const edad = ahora - (p.actualizadoEn ?? p.creadoEn);
    return edad > ESPERA_PEDIDO_MS && edad < LIMITE_SEGURO_MS;
  });
}
```

Tres condiciones: el pedido sigue en `recibido`, no se le avisó antes (`recordadoEn` vacío) y su **edad** está entre 30 minutos y 23 horas. Ejecutémosla con tres pedidos de ejemplo del minimarket (la hora actual es fija para que el resultado se repita):

```js prueba-recordatorios.mjs
import { pedidosParaRecordar, carritosAbandonados, puedeEnviarTexto } from './src/recordatorios.js';
const MIN = 60000, H = 3600000, AHORA = Date.UTC(2026, 9, 7, 18, 0, 0);

const pedidos = [
  { id: 'LE-1', telefono: '51999000111', estado: 'recibido', creadoEn: AHORA - 10 * MIN },
  { id: 'LE-2', telefono: '51999000222', estado: 'recibido', creadoEn: AHORA - 2 * H },
  { id: 'LE-3', telefono: '51999000333', estado: 'recibido', creadoEn: AHORA - 26 * H },
];
console.log(pedidosParaRecordar(pedidos, AHORA).map((p) => p.id));

const sesiones = [{ telefono: '51999000444', estado: 'CARRITO', carrito: [{ id: 'leche', cantidad: 2 }],
  ultimoMensajeCliente: AHORA - 3 * H, recordatorioEnviado: false }];
console.log(carritosAbandonados(sesiones, AHORA).map((s) => s.telefono));
console.log(puedeEnviarTexto(AHORA - 3 * H, AHORA), puedeEnviarTexto(AHORA - 25 * H, AHORA), puedeEnviarTexto(null, AHORA));
```

```salida
[ 'LE-2' ]
[ '51999000444' ]
true false false
```

- `LE-1` es demasiado reciente (10 minutos): el equipo aún está atendiendo.
- `LE-2` cumple: dos horas sin novedad.
- `LE-3` tiene 26 horas: quedó **fuera** del límite seguro y ya no se le recuerda por esta vía. Si un pedido lleva un día sin atenderse, no necesita un recordatorio: necesita que una persona lo revise (ver [lección 25](../25-atencion-humana/)).

`carritosAbandonados` funciona igual, con dos diferencias: mira solo sesiones en estados de compra (`ELIGIENDO`, `CARRITO`, `PAGO`, etc.) con **carrito no vacío**, y usa `ultimoMensajeCliente` como medida de inactividad. Un carrito vacío o una sesión ya terminada (`FIN`) jamás generan aviso.

## El cron: `scheduled` y `wrangler.toml`

Para que alguien llame a tu código cada 15 minutos, declaras el cron en `wrangler.toml`:

```toml wrangler.toml
[triggers]
crons = ["*/15 * * * *"]
```

Cinco campos: minuto, hora, día del mes, mes y día de la semana. `*/15` significa «cada 15 minutos». Tres detalles de la [documentación de Cloudflare](https://developers.cloudflare.com/workers/configuration/cron-triggers/) que te ahorrarán sustos:

- **Los crons corren en hora UTC.** Si quieres «todos los días a las 9:00 en Lima», eso es `0 14 * * *` (Lima es UTC-5).
- Después de desplegar, el cambio puede tardar **hasta 15 minutos** en aplicarse.
- Para probar en local, con `npx wrangler dev` encendido se puede disparar a mano visitando `/cdn-cgi/local/scheduled`.

> [!importante] Verifica este dato
> La ruta de prueba local y las opciones de Wrangler cambian entre versiones. Confírmalas en la [documentación de Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) antes de depender de ellas.

En el Worker, el cron entra por la función `scheduled`, que delega todo en `ejecutarRecordatorios`:

```js worker.js
export default {
  fetch: manejarFetch,
  scheduled(_evento, env, ctx) {
    ctx.waitUntil(ejecutarRecordatorios(env).catch((e) => console.error('Error en recordatorios:', e.message)));
  },
};
```

`ctx.waitUntil` le dice a Cloudflare «no cierres el Worker hasta que esta promesa termine». El `.catch` evita que un error de red tumbe la corrida entera sin dejar rastro.

> [!nota] Cron más frecuente no es mejor
> Cada corrida lee tus datos de KV (lecturas que consumen cuota) y la regla de tu negocio rara vez necesita precisión de minutos. Cada 15 minutos sobra para un minimarket; para recordatorios de citas «el día anterior» basta incluso una vez por hora.

## Ejecutar `ejecutarRecordatorios` sin tocar Meta ni Cloudflare

Una ventaja de separar capas es que puedes probar el recorrido completo con un **KV falso** (un `Map`) y una función `llamar` que, en vez de hacer `fetch` a Meta, solo guarda lo que habría enviado. El Worker ya está preparado para esto: `ejecutarRecordatorios(env, ahora, llamar)` acepta ambos como parámetros.

```js simular-cron.mjs
import { ejecutarRecordatorios } from './src/worker.js';
const MIN = 60000, H = 3600000, AHORA = Date.UTC(2026, 9, 7, 18, 0, 0);

const m = new Map();
const kv = {
  get: async (k) => m.get(k) ?? null,
  put: async (k, v) => { m.set(k, v); },
  list: async ({ prefix }) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })) }),
};
// LE-2: pedido de hace 2 h, el cliente escribió hace 2 h (ventana abierta)
m.set('pedido:LE-2', JSON.stringify({ id: 'LE-2', telefono: '51999000222', estado: 'recibido', creadoEn: AHORA - 2 * H }));
m.set('sesion:51999000222', JSON.stringify({ telefono: '51999000222', estado: 'FIN', carrito: [], ultimoMensajeCliente: AHORA - 2 * H }));
// LE-4: pedido de hace 5 h, pero el cliente escribió hace 30 h (ventana cerrada)
m.set('pedido:LE-4', JSON.stringify({ id: 'LE-4', telefono: '51999000555', estado: 'recibido', creadoEn: AHORA - 5 * H }));
m.set('sesion:51999000555', JSON.stringify({ telefono: '51999000555', estado: 'FIN', carrito: [], ultimoMensajeCliente: AHORA - 30 * H }));
// Carrito abandonado de hace 3 h
m.set('sesion:51999000444', JSON.stringify({ telefono: '51999000444', estado: 'CARRITO', carrito: [{ id: 'leche', cantidad: 2 }],
  ultimoMensajeCliente: AHORA - 3 * H, recordatorioEnviado: false }));

const enviados = [];
const llamar = async (url, op) => { enviados.push(JSON.parse(op.body)); return { ok: true, status: 200, json: async () => ({}) }; };

await ejecutarRecordatorios({ BOT_KV: kv, WA_TOKEN: 'x', WA_PHONE_ID: '000' }, AHORA, llamar);
for (const e of enviados) console.log(JSON.stringify(e));
enviados.length = 0;
await ejecutarRecordatorios({ BOT_KV: kv, WA_TOKEN: 'x', WA_PHONE_ID: '000' }, AHORA + MIN, llamar);
console.log('segunda corrida:', enviados.length);
```

```salida
{"messaging_product":"whatsapp","recipient_type":"individual","to":"51999000222","type":"text","text":{"preview_url":false,"body":"Tu pedido LE-2 sigue en preparación. Si necesitas algo, escríbenos por aquí."}}
{"messaging_product":"whatsapp","recipient_type":"individual","to":"51999000555","type":"template","template":{"name":"recordatorio_pedido","language":{"code":"es"},"components":[{"type":"body","parameters":[{"type":"text","text":"LE-4"}]}]}}
{"messaging_product":"whatsapp","recipient_type":"individual","to":"51999000444","type":"text","text":{"preview_url":false,"body":"Dejaste productos en tu carrito. Escribe \"carrito\" para retomar tu pedido."}}
segunda corrida: 0
```

Esa salida muestra tres cosas a la vez:

1. LE-2 (ventana abierta) recibe **texto libre**; LE-4 (ventana cerrada) recibe una **plantilla** `recordatorio_pedido` con una variable (el id del pedido).
2. El carrito pendiente sale como texto porque el cliente escribió hace 3 horas.
3. En la **segunda corrida** no se envía nada: después de cada aviso el Worker guarda `recordadoEn` o `recordatorioEnviado: true`. Eso se llama **idempotencia**: ejecutar dos veces lo mismo no repite el efecto. Sin ella, tu cron de 15 minutos le escribiría al mismo cliente cuatro veces por hora.

> [!ejemplo] Anatomía de la plantilla recordatorio_pedido
> Texto que enviarías a aprobar (idioma `es`, una variable): «Hola. Tu pedido {{1}} de Minimarket La Esquina sigue en preparación. Si necesitas ayuda, responde a este mensaje.» Fíjate en que **no usa emojis ni promociones**: una plantilla de utilidad debe hablar de una transacción concreta. Cómo se crean y aprueban las plantillas lo ves en la [lección 17](../17-plantillas/).

## Plantillas de recordatorio: lo que dicen los documentos de Meta

Lo que **sí** confirma la documentación oficial de plantillas (consultada el 2026-10-07):

- Toda plantilla debe tener una categoría (autenticación, marketing o utilidad) y estar en estado `APPROVED` para poder enviarse. Cuando cambia de estado, Meta te avisa por el webhook `message_template_status_update`.
- La revisión es automática y puede tardar **hasta 24 horas**.
- Las plantillas tienen una **calidad** (pendiente, alta, media o baja) basada en las reacciones de los clientes y su tasa de lectura. Si es media o baja, corre el riesgo de ser **pausada** o **deshabilitada**; mientras esté pausada no puedes enviarla.
- Existen límites de envío por cuenta y, para marketing, un tope de plantillas de marketing que **un mismo usuario** puede recibir de todos los negocios.

Todo eso se resume así: una plantilla de recordatorio que molesta (clientes que la bloquean o la reportan) **pierde calidad y deja de enviarse**. Por eso el cuidado del cliente no es un tema de cortesía: es lo que mantiene vivo tu canal.

> [!importante] Verifica este dato
> Cuánto cuesta cada plantilla, si las de utilidad enviadas dentro de la ventana son gratuitas y los topes exactos de envío cambian con el tiempo. Consulta la [documentación oficial de plantillas](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview) y la [página de precios](https://developers.facebook.com/docs/whatsapp/pricing) el día que cotices.

## Baja, frecuencia y horario: lo que el código de referencia aún no hace

Un recordatorio mal pensado es spam con buena intención. Antes de enviar cualquier aviso aplica estas tres reglas **en este orden**:

1. **Baja (opt-out).** Si el cliente escribió «baja», «stop» o «no quiero recibir mensajes», no se le envía **ningún** aviso más y se le confirma una sola vez. Es lo primero que revisas porque es la regla que más daño hace si se rompe. La [lección 20](../20-marketing-responsable/) profundiza en cómo guardar y respetar la baja.
2. **Frecuencia.** Un máximo de un recordatorio por cliente cada 24 horas. El repositorio ya lo logra con `recordadoEn` y `recordatorioEnviado`.
3. **Horario.** No escribas de madrugada. Un recordatorio a las 3 a. m. produce bloqueos y reportes. Meta no te impone un horario; es una buena práctica tuya. En el curso usamos de 8:00 a 20:59, hora de Lima.

Honestidad técnica: el código de referencia **ya cumple** la regla 2, pero **no implementa** la 1 ni la 3 (hay que decidir dónde guardar la baja y qué zona horaria usar). Tu ejercicio de esta lección escribe esas piezas como funciones puras. Mira cómo se comportan:

```js extra.mjs
const ahora = Date.UTC(2026, 9, 7, 18, 0); // 13:00 en Lima
console.log(horaLima(ahora), enHorarioPermitido(ahora), enHorarioPermitido(Date.UTC(2026, 9, 7, 5, 0)));
console.log(tipoDeEnvio(ahora - 3600000, ahora), tipoDeEnvio(ahora - 30 * 3600000, ahora));
console.log(esBaja('  BAJA '), esBaja('Quiero 2 leches'));
console.log(debeRecordar({ optOut: false, ultimoRecordatorio: null }, ahora), debeRecordar({ optOut: true, ultimoRecordatorio: null }, ahora));
```

```salida
13 true false
texto plantilla
true false
true false
```

La lógica de zona horaria es simple porque Perú **no usa horario de verano**. Si tu negocio está en un país que sí lo usa, no restes una cantidad fija de horas: usa `Intl.DateTimeFormat` con el nombre de la zona (por ejemplo `America/Mexico_City`) y deja que el motor haga el cálculo.

## Medir si el recordatorio funciona

Un recordatorio es una hipótesis: «este aviso hará que más pedidos se cierren». Compruébalo con cuatro números, que puedes sacar de los registros de tu Worker y de los eventos de estado (`sent`, `delivered`, `read`, `failed`) que ya recibes en el webhook:

| Métrica | Cómo se calcula | Qué te dice |
|---|---|---|
| **Entrega** | Avisos `delivered` / avisos enviados | Si el número del cliente sigue activo y la plantilla se acepta |
| **Respuesta** | Clientes que escribieron en las siguientes 24 h / avisos entregados | Si el aviso es relevante |
| **Recuperación** | Carritos o pedidos cerrados tras el aviso / avisos enviados | El valor real del recordatorio, en soles |
| **Bajas** | Clientes que escribieron «baja» tras el aviso / avisos enviados | Si estás molestando |

Si las bajas suben, **recorta** (menos avisos o mensajes más útiles) antes de seguir. Más avisos casi nunca es la solución. La [lección 21](../21-costos-y-metricas/) te muestra cómo convertir estos números en costos y ganancia.

## Errores frecuentes

- **Probar el cron solo en producción.** Usa un KV falso y la función `llamar` inyectada, como en esta lección, y verás los problemas sin molestar a nadie.
- **Olvidar la idempotencia.** Si no marcas «ya recordé», el cron repetirá el aviso cada 15 minutos. Guarda la marca justo después de enviar.
- **Pensar en la hora local.** Los crons de Cloudflare van en UTC; `0 9 * * *` son las 4:00 en Lima.
- **Enviar texto libre fuera de la ventana.** La API lo rechaza. Decide el formato siempre con `puedeEnviarTexto`.
- **Marcar «enviado» cuando el envío falló.** Si `enviarMensaje` lanza un error, no guardes la marca: el próximo cron lo reintentará. (El código de referencia lo hace así: la marca se guarda después del `await enviarMensaje`.)
- **Plantillas con promociones disfrazadas.** Meta puede reclasificarlas a marketing, con otro precio y otras reglas.
- **No respetar la baja.** Es el error que más bloquea números.

## Apuntes para llevar

- Un recordatorio es una **acción sin evento**: necesita un cron (`scheduled`) que revise el estado cada cierto tiempo.
- Separa **decidir** (funciones puras como `pedidosParaRecordar`) de **enviar** (Worker); así lo pruebas sin red.
- El formato lo decide la **ventana de 24 h**: dentro, texto libre; fuera, plantilla aprobada. Deja un margen de una hora.
- Los crons de Cloudflare usan **UTC** y los cambios pueden tardar hasta 15 minutos en aplicarse.
- Marca cada aviso como enviado para ser **idempotente** y no repetir.
- Antes de enviar: **baja**, **frecuencia** y **horario**; sin ellas, un recordatorio es spam.
- Plantillas pausadas o de baja calidad dejan de enviarse: el cuidado del cliente protege tu canal.

## Glosario

| Término | Significado |
|---|---|
| Cron | Disparador que ejecuta tu código a intervalos o a horas fijas. |
| `scheduled` | Función del Worker que Cloudflare llama cuando se cumple un cron. |
| Idempotencia | Propiedad por la que repetir una operación no repite su efecto. |
| Recordatorio | Mensaje automático sobre algo que el cliente ya inició. |
| Carrito abandonado | Carrito con productos que el cliente dejó sin cerrar. |
| Opt-out | Petición del cliente de no recibir más mensajes (baja). |
| Plantilla pausada | Plantilla que Meta dejó de permitir temporalmente por mala calidad. |
| UTC | Hora universal de referencia en la que corren los crons de Cloudflare. |

```quiz
? Un cliente escribió ayer a las 20:00 y hoy a las 21:00 quieres recordarle su pedido. ¿Cómo lo envías?
- Como texto libre, porque ya hubo una conversación
+ Como plantilla aprobada, porque pasaron más de 24 horas desde su último mensaje
- Como texto libre pagando un extra
- No se puede enviar de ninguna forma
= Fuera de la ventana de 24 horas solo se permiten plantillas aprobadas.

? ¿Por qué los umbrales de `recordatorios.js` terminan en 23 horas y no en 24?
- Porque Meta cobra más después de las 23 horas
+ Para dejar un margen de seguridad: si el envío cruza el límite de la ventana, el texto libre sería rechazado
- Porque los crons de Cloudflare solo duran 23 horas
- Porque WhatsApp bloquea mensajes en la hora 24
= Es una decisión de diseño: una hora de margen evita que el envío caiga justo fuera de la ventana.

? El cron `0 14 * * *` de Cloudflare, ¿a qué hora de Lima se ejecuta?
- A las 14:00
- A las 19:00
+ A las 9:00
- A las 4:00
= Los crons corren en UTC y Lima es UTC-5: 14:00 UTC son las 9:00 en Lima.

? ¿Para qué sirve marcar `recordadoEn` después de enviar un recordatorio?
- Para que el cliente vea la fecha del aviso
+ Para que la siguiente corrida del cron no repita el aviso (idempotencia)
- Para que Meta apruebe la plantilla
- Para cobrar el mensaje
= Sin esa marca, el cron de 15 minutos volvería a avisar al mismo cliente en cada corrida.

? ¿Cuál de estas reglas debes revisar primero antes de enviar un recordatorio?
- El horario
- La frecuencia
+ Que el cliente no haya pedido la baja (opt-out)
- El largo del texto
= Si el cliente pidió no recibir avisos, ninguna otra regla importa: no se envía nada.

? ¿Qué pasa con una plantilla de recordatorio que muchos clientes bloquean o reportan?
- Nada, las plantillas aprobadas son permanentes
+ Su calidad baja y Meta puede pausarla o deshabilitarla, y deja de poder enviarse
- Se convierte automáticamente en texto libre
- Se envía con más frecuencia
= La calidad de la plantilla depende de la reacción de los clientes; si es mala, puede pausarse.
```

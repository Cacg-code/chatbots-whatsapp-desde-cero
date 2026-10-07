---
titulo: Proyecto final: el bot del minimarket
resumen: Arma de punta a punta el bot de Minimarket La Esquina reutilizando el código de referencia: pruebas, atención humana, despliegue, conexión con WhatsApp, checklist de entrega y criterios de evaluación.
minutos: 180
nivel: avanzado
objetivos:
- Ensamblar el bot completo del minimarket a partir del código de referencia, entendiendo qué hace cada módulo.
- Escribir una suite de pruebas de aceptación que demuestre que el bot cumple lo prometido.
- Integrar la atención humana con horario, aviso al dueño y retorno automático al bot.
- Desplegar el bot en Cloudflare y conectarlo a un número de prueba de WhatsApp con firma y secretos bien configurados.
- Verificar tu trabajo con una lista de entrega y una rúbrica de evaluación.
fuentes:
- Documentación de WhatsApp Cloud API (Meta) | https://developers.facebook.com/docs/whatsapp/cloud-api/
- Cloudflare Workers | https://developers.cloudflare.com/workers/
---
## Qué vas a construir

Es el cierre del curso. Ya aprendiste cada pieza por separado; ahora las juntas en un bot que un negocio podría usar. El resultado es el bot de **Minimarket La Esquina** (negocio ficticio, moneda soles) con estas capacidades:

- Saluda, muestra el catálogo por categorías y entiende texto libre («quiero 4 leches y 3 arroz»).
- Arma el carrito, ofrece recojo o delivery (con mínimo de S/ 25.00 y costo de S/ 3.00), pide dirección y forma de pago, y confirma el pedido.
- Pasa la conversación a una persona, avisa al dueño y vuelve al bot si nadie atiende.
- Corre en un Worker de Cloudflare, con sesiones y pedidos guardados en KV, firma del webhook verificada y recordatorios por cron.
- Tiene pruebas automáticas que lo protegen de errores.

No empiezas de cero: el **código de referencia** (carpeta `codigo/` del curso) ya trae el motor, el traductor a la API de Meta, el Worker y 112 pruebas. Tu trabajo es **entenderlo, completarlo, probarlo, desplegarlo y defenderlo**. Es lo mismo que harás cuando le armes un bot a un cliente real, que es lo que veremos al final en la [lección 26](../26-vender-tu-bot/).

```flujo
Código base|112 pruebas
-> pruebas y atención humana
Bot completo|tu copia
-> despliegue
Worker|Cloudflare
-> webhook
WhatsApp|número de prueba
```

> [!importante] Reglas del proyecto
> Todo el proyecto usa datos **ficticios**: el negocio es inventado, los teléfonos son del rango de ejemplo (`51999000111`, `51999000333`) y nada de esto es un negocio real. Para probar en tu teléfono usarás el **número de prueba** de Meta, no el número de un cliente. Los mensajes del bot **no llevan emojis**.

## Paso 0: prepara tu carpeta

Copia el código de referencia a una carpeta nueva que será **tu** proyecto (no trabajes sobre el original) y comprueba que todo funciona antes de cambiar nada. Esto te da un punto de partida verde: si algo se rompe después, sabrás que fue por tu cambio.

```bash
node --version      # debe ser 22 o superior
cp -r codigo mi-bot-minimarket
cd mi-bot-minimarket
npm install         # instala wrangler, solo para el Worker
npm test
```

```salida
ℹ tests 112
ℹ suites 0
ℹ pass 112
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
```

Haz `git init` y un primer *commit* aquí: «código base verde». Cada paso siguiente terminará con otro commit pequeño. Si usas git en la carpeta, verifica que `.gitignore` incluya `.dev.vars` y `node_modules`: ya viene así en el código base y es la primera defensa de tus secretos.

## Paso 1: reconoce las piezas

Antes de tocar nada, dedica diez minutos a leer. Esta tabla es tu mapa:

| Archivo | Responsabilidad | ¿Lo tocarás? |
|---|---|---|
| `src/catalogo.js` | Datos del negocio y productos | Sí, para personalizar |
| `src/texto.js` | Entender texto libre y detectar intención | Un poco (palabras de reclamo) |
| `src/carrito.js` | Carrito puro y total en céntimos | No |
| `src/mensajes.js` | Todos los textos del bot | Sí, para ajustar la voz |
| `src/motor.js` | Máquina de estados (`procesar`) | No (es lo que más pruebas tiene) |
| `src/whatsapp.js` | Traductor a la API de Meta, firma, envío | No |
| `src/recordatorios.js` | Qué recordar y cuándo | No |
| `src/worker.js` | Webhook, KV, cron | Poco (conectar la atención humana) |

Haz el recorrido en la consola, sin WhatsApp. El simulador `consola.js` usa el mismo motor que el Worker:

```bash
printf 'hola\n2 leches\nlisto\nrecojo\nefectivo\nconfirmar\n' | node consola.js
```

En PowerShell, el equivalente es:

```powershell
'hola','2 leches','listo','recojo','efectivo','confirmar' | node consola.js
```

```salida
tu> confirmar

bot> Pedido LE-... recibido. Total: S/ 8.60.
Estará listo para recoger en unos 15 minutos.
Pagas en efectivo al recibir tu pedido.
Gracias por comprar en Minimarket La Esquina.
```

(El código del pedido cambia en cada ejecución porque se deriva de la hora.) Si te falta contexto, repasa la arquitectura en las lecciones [5](../05-estado-de-la-conversacion/), [8](../08-flujo-de-pedido/) y [10](../10-servidor-del-bot/).

## Paso 2: personaliza el negocio

Abre `src/catalogo.js`. El objeto `NEGOCIO` y el arreglo `PRODUCTOS` son lo único que describe al minimarket. Haz tres cambios para que el bot sea **tuyo**:

1. Cambia `horario`, `direccion` (ficticia) y `zonas` de delivery.
2. Agrega **3 productos nuevos** con su categoría, unidad y varios sinónimos (cómo los llama la gente: «gaseosa», «chaufa», etc.). Recuerda que el buscador usa **solo los sinónimos**.
3. Si tienes otro nombre de negocio en mente para el reto, cámbialo en `NEGOCIO.nombre`; todos los mensajes lo usan.

Cuida los límites de WhatsApp: el nombre de un producto debe tener **24 caracteres o menos** porque aparece como título de fila de lista. No lo tienes que recordar: la suite de pruebas llama a `construirEnvio` con cada respuesta y falla si algo excede un límite.

```bash
npm test
```

Si un nombre es demasiado largo, verás un error como `título de fila de más de 24 caracteres`. Corrígelo y repite.

## Paso 3: pruebas de aceptación

Las pruebas del código base protegen cada módulo. Ahora escribes las que protegen **lo que le prometes al cliente**. Crea `test/aceptacion.test.js` con los escenarios clave. Usa la ayuda `conversacion()` que ya existe (la viste en la [lección 23](../23-pruebas-y-errores/)):

```js test/aceptacion.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { conversacion } from './ayudas.js';

test('A1. pedido con delivery, Yape y dirección', () => {
  const c = conversacion('51999000111');
  c.decir('hola');
  c.decir('quiero 4 leches y 3 arroz');
  c.tocar('cerrar');
  c.tocar('entrega:delivery');
  c.decir('Av. Los Olivos 456, frente al parque');
  c.tocar('pago:yape');
  assert.match(c.texto, /Total a pagar: S\/ 32\.80/);
  c.tocar('pedido_confirmar');
  const p = c.sesion.pedidoNuevo;
  assert.equal(p.total, 32.8);
  assert.equal(p.entrega, 'delivery');
});

test('A2. "gaseosa" es ambiguo: el bot pregunta cuál', () => {
  const c = conversacion('51999000111');
  c.decir('2 gaseosas');
  assert.deepEqual(c.tipos, ['lista']);
  c.tocar('prod:gaseosa-cola');
  assert.equal(c.sesion.carrito[0].cantidad, 2);
});

test('A3. cancelar en cualquier paso limpia el carrito', () => {
  const c = conversacion('51999000111');
  c.decir('2 leches'); c.tocar('cerrar');
  c.decir('cancelar');
  assert.equal(c.sesion.carrito.length, 0);
  assert.match(c.texto, /Cancelé tu pedido/);
});

test('A4. una persona: el bot calla y menu lo devuelve', () => {
  const c = conversacion('51999000111');
  c.decir('persona');
  c.decir('hola?');
  assert.equal(c.respuestas.length, 0);
  c.decir('menu');
  assert.equal(c.sesion.estado, 'MENU');
});

test('A5. audio e imagen reciben aviso, no error', () => {
  const c = conversacion('51999000111');
  c.enviar({ tipo: 'no_soportado', subtipo: 'audio' });
  assert.match(c.texto, /solo entiendo texto y botones/);
});

test('A6. ningún mensaje del bot tiene emojis', () => {
  const c = conversacion('51999000111');
  for (const t of ['hola', '2 leches', 'listo', 'delivery', 'xx', 'persona']) c.decir(t);
  const emoji = /\p{Extended_Pictographic}/u;
  const todo = c.transcripcion.map((r) => r.texto ?? '').join('\n');
  assert.equal(emoji.test(todo), false);
});
```

Tres cosas para observar:

- En **A1** la cuenta se hace así: 4 leches (4 × S/ 4.30 = 17.20) + 3 arroz (3 × S/ 4.20 = 12.60) = S/ 29.80, que supera el mínimo de delivery de S/ 25.00; más S/ 3.00 de envío son **S/ 32.80**. Mi primer intento usó 3 leches y 2 arroz (S/ 21.30) y la prueba falló: el bot respondió que no alcanzaba el mínimo. El bot tenía razón y la prueba estaba mal.
- **A2** valida la ambigüedad: hay dos gaseosas (cola y naranja), así que el bot debe mostrar una lista.
- **A6** convierte una regla de estilo («sin emojis») en una prueba que se ejecuta sola.

Con las seis pruebas añadidas, el resultado fue:

```salida
✔ A1. pedido con delivery, Yape y dirección (5.3558ms)
✔ A2. "gaseosa" es ambiguo: el bot pregunta cuál (3.5694ms)
✔ A3. cancelar en cualquier paso limpia el carrito (0.7702ms)
✔ A4. una persona: el bot calla y menu lo devuelve (0.8417ms)
✔ A5. audio e imagen reciben aviso, no error (0.3439ms)
✔ A6. ningún mensaje del bot tiene emojis (2.4418ms)
```

Agrega al menos **dos escenarios propios** (por ejemplo, un pedido de recojo con transferencia y un producto que tú agregaste en el paso 2).

## Paso 4: atención humana

El código base ya sabe callarse en `ESPERANDO_HUMANO`, pero **no avisa a nadie**. Integra lo que construiste en la [lección 25](../25-atencion-humana/):

1. Crea `src/humano.js` con `estaAbierto`, `mensajeFueraDeHorario`, `textoAvisoDueno`, `humanoVencido`, `procesarConHumano`, `avisarAlDueno` y `liberarHumanosVencidos`. Importa `procesarMensaje` desde `./worker.js`, y las otras funciones desde `./whatsapp.js` y `./recordatorios.js`.
2. En `avisarAlDueno` añade una protección: si falta la variable `DUENO_TEL`, deja un error en el log y no rompas el flujo (así un olvido de configuración no tumba el bot).
3. En `src/worker.js` haz tres cambios pequeños: importa de `./humano.js`; en `procesarEventos` llama a `procesarConHumano(env, evento)` en vez de `procesarMensaje(env, evento)`; y en `scheduled` ejecuta también `liberarHumanosVencidos(env)` junto con los recordatorios:

```js src/worker.js
import { procesarConHumano, liberarHumanosVencidos } from './humano.js';
// ...
if (evento.tipo === 'mensaje') await procesarConHumano(env, evento);
// ...
scheduled(_evento, env, ctx) {
  ctx.waitUntil(Promise.all([ejecutarRecordatorios(env), liberarHumanosVencidos(env)])
    .catch((e) => console.error('Error en tareas programadas:', e.message)));
},
```

`worker.js` e `humano.js` se importan entre sí. Funciona porque todo son funciones que se llaman más tarde, no al cargar el módulo; lo comprobamos ejecutando las pruebas completas. Añade tus pruebas de la lección 25 (`humano.test.js`) a `test/`, y una prueba **de extremo a extremo**: un POST firmado con «quiero hablar con una persona» debe dejar la sesión en `ESPERANDO_HUMANO` y producir un aviso al dueño. Con un `fetch` falso, la salida real fue:

```salida
HTTP 200
(leído) -> read
51999000111 -> text
51999000333 -> template
✔ un cliente pide una persona y el dueño recibe el aviso (74.5467ms)
```

El orden es el esperado: se marca como leído, se responde al cliente y se avisa al dueño (con plantilla, porque su ventana de 24 horas estaba cerrada). Con los siete tests de humano y los seis de aceptación añadidos al código base, `npm test` quedó en verde:

```salida
ℹ tests 126
ℹ pass 126
ℹ fail 0
```

(126 incluye las 112 pruebas del código base, siete de humano, seis de aceptación y un caso de «falta `DUENO_TEL`»; la prueba extremo a extremo se sumó aparte. Tu número exacto dependerá de cuántas pruebas propias escribas; lo importante es que `fail` sea 0.)

Agrega también las palabras `reclamo`, `queja` y `devolucion` a la intención `humano` en `src/texto.js`, como viste en la lección.

## Paso 5: fiabilidad y registros

Incorpora de la [lección 23](../23-pruebas-y-errores/) lo que le da robustez, en un archivo `src/fiabilidad.js`: `registrar` (log JSON sin secretos), `ocultarSecretos`, `ocultarTelefono`, `conReintentos`, `enviarConReintentos` y `clasificarError`. Después:

- Cambia en el Worker los `console.error` de los envíos por `registrar('error', ...)` con el id del mensaje y el código de error de Meta.
- Usa `enviarConReintentos` para enviar las respuestas al cliente (2 o 3 intentos, solo `429` y `5xx`).
- Cuando llegue un estado `failed`, registra el código y su `clasificarError(...).accion`.

Aquí aplican dos reglas de la [lección 24](../24-seguridad-y-privacidad/): ningún token ni App Secret en el log, y ningún teléfono completo.

## Paso 6: despliega en Cloudflare

Sigue la [lección 11](../11-despliegue-en-cloudflare/). Resumen de comandos, todos desde tu carpeta:

```bash
npx wrangler login
npx wrangler kv namespace create BOT_KV      # copia el id a wrangler.toml
npx wrangler secret put VERIFY_TOKEN
npx wrangler secret put WA_TOKEN
npx wrangler secret put APP_SECRET
```

Edita `wrangler.toml`: reemplaza el `id` de ejemplo del KV por el tuyo, y en `[vars]` pon tu `WA_PHONE_ID` y agrega `DUENO_TEL = "51999000333"` (en la práctica, el teléfono real de quien atiende; aquí usamos el de ejemplo). Antes de publicar, empaqueta sin desplegar:

```bash
npx wrangler deploy --dry-run
```

```salida
Total Upload: 53.33 KiB / gzip: 14.89 KiB
Your Worker has access to the following bindings:
env.BOT_KV (00000000000000000000000000000000)           KV Namespace
env.WA_PHONE_ID ("000000000000000")                     Environment Variable
```

Con tus cambios del paso 4 el paquete pasó de unos 49 KiB a 53 KiB. Verifica que sin ids reales la salida muestre los de ejemplo, y con los tuyos, los tuyos. Cuando estés conforme, `npx wrangler deploy` publica el Worker. La URL termina en `workers.dev`; comprueba `https://<tu-worker>.workers.dev/salud`: debe responder `{"ok":true}`.

> [!importante] Verifica este dato
> Los nombres de comandos de `wrangler` y los límites del plan gratuito de Cloudflare cambian con el tiempo. Si un comando no existe, consulta la [documentación oficial de Workers](https://developers.cloudflare.com/workers/) y la [de Wrangler](https://developers.cloudflare.com/workers/wrangler/). El código base ya trae una versión validada de `compatibility_date`, pero conviene revisarla antes de desplegar.

## Paso 7: conecta con WhatsApp

Con el Worker publicado, sigue las lecciones [12](../12-cuenta-y-app-de-meta/) y [13](../13-recibir-mensajes-reales/) para el lado de Meta: app, número de prueba, token y webhook. Lo esencial:

1. En la configuración del webhook de tu app de Meta, la URL de devolución es `https://<tu-worker>.workers.dev/webhook` y el token de verificación es el mismo `VERIFY_TOKEN` que guardaste como secreto.
2. Suscribe el campo `messages`.
3. En el número de prueba, agrega **tu propio teléfono** a la lista de destinatarios permitidos (si no lo haces verás el error `131030`).
4. El `WA_TOKEN` temporal de prueba **vence**; para algo duradero necesitas un token de usuario del sistema ([lección 12](../12-cuenta-y-app-de-meta/)).

> [!importante] Verifica este dato
> Los nombres de los menús de Meta, los límites del número de prueba y la vigencia de los tokens cambian con frecuencia. Guíate por la documentación oficial de la [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/) y no por capturas de pantalla de tutoriales viejos. Recuerda también que el código base **no se ejecutó contra la API real de Meta**: es tu prueba la que lo valida.

## Paso 8: plantillas

El Worker usa tres plantillas que debes crear y esperar a que Meta apruebe ([lección 17](../17-plantillas/)): `recordatorio_pedido` (1 variable: el código del pedido), `carrito_pendiente` (sin variables) y `aviso_atencion` (1 variable: el teléfono del cliente), todas en idioma `es`. Mientras no estén aprobadas, los recordatorios y avisos fuera de la ventana de 24 horas fallarán con el error `131047` o con un error de plantilla inexistente; el cron lo registrará y no tumbará el bot. Si aún no tienes plantillas aprobadas, indica eso en tu entrega: es una limitación declarada, no un defecto escondido.

## Paso 9: prueba de punta a punta con tu teléfono

Ejecuta este guion con tu teléfono real, mirando los logs en vivo con `npx wrangler tail`:

1. Escribe «hola»: debe llegar la bienvenida y el menú.
2. Pide «quiero 4 leches y 3 arroz», finaliza, elige delivery, escribe una dirección y paga con Yape. Confirma. Debe aparecer el pedido en KV (`pedido:LE-...`).
3. Repite el pedido y cancélalo en el resumen.
4. Escribe «hablar con una persona»: el bot debe avisar y callarse; el teléfono del dueño de la prueba debe recibir el aviso.
5. Escribe «menu»: el bot vuelve.
6. Envía una nota de voz: respuesta de «solo entiendo texto y botones».
7. Reenvía el mismo webhook (por ejemplo, con `curl` y la misma firma): no se debe duplicar el pedido.

Toma nota de cualquier diferencia entre lo que esperabas y lo que viste. Una buena entrega incluye lo que **no** salió bien y por qué.

## Checklist de entrega

Marca cada punto antes de entregar. Si alguno no se cumple, escríbelo en el README como pendiente conocido.

**Código y pruebas**
- [ ] `npm test` pasa con 0 fallas y tus pruebas incluyen al menos 6 escenarios de aceptación (2 propios).
- [ ] Hay una prueba de extremo a extremo (webhook firmado, motor y aviso al dueño).
- [ ] Los nombres de productos respetan los límites de WhatsApp (la suite lo demuestra).
- [ ] Ningún mensaje del bot contiene emojis (prueba A6).

**Seguridad y datos**
- [ ] No hay tokens, secretos ni teléfonos reales en el repositorio (`git log -p` y búsqueda de «EAA» y de tu número).
- [ ] `.dev.vars` y `node_modules` están en `.gitignore`.
- [ ] La firma `X-Hub-Signature-256` se verifica: un POST sin firma o con firma errónea devuelve `401`.
- [ ] Los logs no muestran tokens ni teléfonos completos.

**Operación**
- [ ] El Worker responde `{"ok":true}` en `/salud`.
- [ ] La atención humana avisa al dueño, respeta el horario y vuelve al bot (a pedido o por tiempo).
- [ ] Los reintentos se limitan a `429` y `5xx`.
- [ ] Un mensaje repetido no duplica pedidos.

**Documentación**
- [ ] Un `README.md` que explique qué hace el bot, cómo correr las pruebas, cómo desplegar y qué falta (plantillas pendientes, límites conocidos).
- [ ] Una lista de las plantillas, con su texto y variables.
- [ ] Una captura o transcripción de una conversación real con el número de prueba (con datos ficticios).

## Criterios de evaluación

La nota total es de 100 puntos. Esta rúbrica sirve para autoevaluarte o para que un mentor te califique:

| Criterio | Puntos | Qué se espera |
|---|---|---|
| Funcionamiento del bot | 25 | El pedido completo (recojo y delivery) funciona en consola y en WhatsApp; el catálogo propio está integrado. |
| Pruebas | 20 | Suite verde, escenarios de aceptación y una prueba de extremo a extremo con datos ficticios. |
| Atención humana | 15 | Traspaso, silencio del bot, aviso al dueño con la regla de 24 horas, horario y retorno. |
| Seguridad y privacidad | 15 | Secretos fuera del código, firma verificada, logs limpios, sin datos reales. |
| Despliegue y conexión | 15 | Worker publicado, webhook verificado y prueba real con teléfono, con evidencia. |
| Documentación y honestidad | 10 | README claro, pendientes declarados, nada de «debería funcionar» sin haberlo probado. |

Una referencia de niveles: **90 a 100** es un bot que podrías mostrar a un cliente; **70 a 89** funciona pero le faltan pruebas o documentación; **menos de 70** significa que hay pasos centrales sin cubrir. En la rúbrica, la honestidad pesa: una entrega que declara «las plantillas aún no están aprobadas» vale más que una que lo oculta.

## Errores frecuentes

- **Empezar a escribir código sin leer el base.** Gran parte de lo que crees que falta ya existe y está probado.
- **Modificar `motor.js` para todo.** La atención humana, los logs y los reintentos viven en capas que rodean al motor; el motor se queda puro y fácil de probar.
- **Probar solo con el número de prueba una vez.** El guion del paso 9 existe porque los errores aparecen en el segundo y tercer intento.
- **Subir `.dev.vars` o pegar un token en el README.** Si ocurre, **revoca el token de inmediato** y genera uno nuevo.
- **Olvidar agregar tu teléfono a la lista de destinatarios permitidos.** Verás `131030` aunque el código esté perfecto.
- **Dar por buenos los textos sin leerlos en el teléfono.** Un botón cortado o una línea larga solo se nota en la pantalla del cliente.
- **No dejar constancia de lo pendiente.** Las plantillas sin aprobar, el token temporal y el límite de KV son límites reales: anótalos.

## Apuntes para llevar

- El proyecto final es integración: reutilizas el código base y lo completas con pruebas, atención humana, fiabilidad y despliegue.
- El motor se queda puro; todo lo nuevo (avisos, reintentos, logs) va en capas alrededor.
- Las pruebas de aceptación traducen lo que prometes al cliente (incluidas reglas de estilo, como «sin emojis») en comprobaciones automáticas.
- Antes de publicar, `wrangler deploy --dry-run` valida el empaquetado sin tocar la nube.
- El número de prueba exige agregar tu teléfono como destinatario; los tokens temporales vencen.
- Entregar bien es entregar con honestidad: lista de pendientes, evidencia y una rúbrica con la que te evalúes.

## Glosario

| Término | Significado |
|---|---|
| Prueba de aceptación | Prueba que comprueba una promesa al cliente, no un detalle interno del código. |
| Extremo a extremo | Prueba que recorre todo el camino: webhook, motor, almacenamiento y envío. |
| Dry run | Ejecución de ensayo que valida el empaquetado sin publicar nada. |
| Número de prueba | Número que Meta entrega para practicar con la API, con destinatarios limitados. |
| Destinatario permitido | Teléfono autorizado a recibir mensajes del número de prueba. |
| Secreto | Valor que no debe estar en el código ni en git (token, App Secret). |
| Rúbrica | Tabla de criterios y puntos para evaluar un trabajo. |

```quiz
? ¿Por qué conviene trabajar en una copia (`mi-bot-minimarket`) y confirmar primero que `npm test` pasa?
- Para que el código original no se pueda editar
+ Para tener un punto de partida verde: si algo falla después, sabes que fue por tu cambio
- Porque `wrangler` solo funciona en copias
- Para evitar instalar Node
= Una línea base en verde permite aislar el origen de cualquier error posterior.

? En el pedido de 4 leches (S/ 4.30 c/u) y 3 arroz (S/ 4.20 c/u) con delivery de S/ 3.00, ¿cuál es el total?
- S/ 29.80
- S/ 21.30
+ S/ 32.80
- S/ 25.00
= Productos: 17.20 + 12.60 = 29.80, que supera el mínimo de 25; más 3.00 de envío da 32.80.

? ¿Dónde se integra el aviso al dueño cuando un cliente pide una persona?
- Dentro de `motor.js`
+ En una envoltura alrededor del procesamiento en el Worker, comparando la sesión antes y después
- En el archivo `catalogo.js`
- En el navegador del cliente
= El motor es puro; enviar mensajes es responsabilidad de la capa de entrada y salida.

? Ves el error 131030 al probar con tu teléfono. ¿Cuál es la causa más probable?
- El token de acceso venció
- Pasaron más de 24 horas desde el último mensaje del cliente
+ Tu teléfono no está en la lista de destinatarios permitidos del número de prueba
- El App Secret es incorrecto
= Con el número de prueba solo se puede escribir a los teléfonos agregados a esa lista.

? Tu bot funciona, pero las plantillas aún no están aprobadas. ¿Qué haces en la entrega?
- Lo ocultas, porque resta puntos
+ Lo declaras en el README como pendiente conocido y explicas el efecto (recordatorios fuera de ventana fallarán)
- Cambias el código para que parezca que funcionan
- No entregas hasta que Meta las apruebe
= La rúbrica premia la honestidad: un límite declarado vale más que uno escondido.
```

---
titulo: Cómo funciona un bot de WhatsApp
resumen: Qué es un bot de WhatsApp, qué piezas lo forman, qué diferencia a la API oficial de las apps no oficiales y qué reglas impone Meta.
minutos: 50
nivel: básico
objetivos:
- Explicar qué es un bot de WhatsApp y cómo viaja un mensaje desde el cliente hasta tu código y de vuelta.
- Distinguir WhatsApp, WhatsApp Business (app) y la plataforma de API, y saber cuándo conviene cada una.
- Nombrar las piezas de la API oficial: cuenta de WhatsApp Business, número, app de Meta, token y webhook.
- Aplicar la regla de la ventana de 24 horas para decidir qué mensajes puedes enviar.
- Explicar por qué las librerías no oficiales son un riesgo para un negocio.
fuentes:
- Documentación de WhatsApp Cloud API (Meta) | https://developers.facebook.com/docs/whatsapp/cloud-api/
- Política de WhatsApp Business | https://www.whatsapp.com/legal/business-policy
---
## Qué es (y qué no es) un bot de WhatsApp

Un **bot de WhatsApp** es un programa que lee los mensajes que le escriben a un número de WhatsApp y responde automáticamente. Para el cliente es una conversación normal; al otro lado no hay una persona tecleando, hay código que decide qué contestar.

Un bot no es magia ni «inteligencia artificial» por definición. La mayoría de los bots útiles en negocios pequeños son **bots de reglas**: si el cliente escribe tal cosa, responde tal otra. Eso es lo que aprenderás a construir primero, porque es predecible, barato y fácil de depurar. En la [lección 22](../22-ia-como-complemento/) verás cuándo tiene sentido sumar IA.

A lo largo del curso construirás el bot de un **minimarket ficticio** («Minimarket La Esquina»): mostrará su catálogo, armará pedidos, preguntará por delivery, enviará recordatorios y promociones. Lo que aprendas sirve para cualquier negocio: una ferretería, un taller, una academia, un restaurante.

> [!ejemplo] Una conversación típica
> **Cliente:** hola, tienen pan?
> **Bot:** Hola, bienvenido a Minimarket La Esquina. Sí, tenemos pan francés (S/ 0.30 c/u) y pan de molde (S/ 6.50). ¿Cuántos quieres?
> **Cliente:** 10 francés
> **Bot:** Agregué 10 × Pan francés. Total parcial: S/ 3.00. ¿Algo más o confirmamos el pedido?

## El camino de un mensaje

Cuando un cliente escribe, el mensaje no llega mágicamente a tu programa. Pasa por estos pasos:

```flujo
Cliente|su WhatsApp
-> escribe
Servidores de Meta|WhatsApp Cloud API
-> webhook (HTTPS)
Tu servidor|tu código y tu bot
-> llamada a la API
Servidores de Meta|WhatsApp Cloud API
-> entrega
Cliente|su WhatsApp
```

1. El cliente escribe a tu número de negocio.
2. Los servidores de Meta (la empresa dueña de WhatsApp) reciben el mensaje.
3. Meta llama a una dirección web tuya, el **webhook**, y le entrega el mensaje en formato JSON.
4. Tu código lee el mensaje, decide la respuesta y la envía haciendo una petición HTTPS a la API de Meta.
5. Meta entrega tu respuesta al cliente.

Fíjate en la idea clave: **tu bot es un servidor web**. Recibe peticiones (los mensajes) y hace peticiones (las respuestas). Si ya viste el curso de [Node.js y APIs](https://cacg-code.github.io/web-desde-cero/node/), esto te resultará familiar: es el mismo trabajo, con WhatsApp como cliente.

## Tres cosas que se llaman «WhatsApp»

Mucha confusión inicial viene de mezclar estas opciones:

| Opción | Para quién | ¿Se puede programar un bot? |
|---|---|---|
| **WhatsApp** (personal) | Personas | No. Automatizarlo rompe las condiciones de uso. |
| **WhatsApp Business** (la app gratuita) | Negocios pequeños que atienden a mano | Solo lo básico: respuestas rápidas, mensaje de bienvenida, mensaje de ausencia, etiquetas, catálogo. |
| **WhatsApp Business Platform** (la API) | Quien quiere automatizar de verdad | Sí. Es lo que usarás en este curso. |

La app de WhatsApp Business ya resuelve mucho para un negocio muy pequeño (y a veces es suficiente). Pasas a la API cuando necesitas **automatizar conversaciones, conectarlas con tus datos** (pedidos, citas, inventario) o **escribirle a muchos clientes** con mensajes aprobados.

> [!importante] Un número, un uso
> Normalmente un número de teléfono se usa **o** con la app de WhatsApp Business **o** con la API, no con ambas a la vez de forma libre. Existen modos de convivencia, pero cambian con el tiempo: antes de registrar el número real de un cliente en la API, revisa la documentación oficial de Meta (te dejo el enlace al final de la lección).

## Las piezas de la API oficial

La API oficial se llama **WhatsApp Cloud API**: Meta la aloja por ti y no tienes que instalar nada. (Existió una versión «On-Premises» que se instalaba en un servidor propio; Meta la retiró, así que si encuentras tutoriales que la usan, están desactualizados.)

Para usarla necesitas conocer estas piezas, que configurarás en la [lección 12](../12-cuenta-y-app-de-meta/):

| Pieza | Para qué sirve |
|---|---|
| **Portafolio comercial de Meta** (antes «Business Manager») | La «cuenta empresa» que agrupa todo lo demás. |
| **Cuenta de WhatsApp Business (WABA)** | El contenedor de tus números, plantillas y facturación. |
| **Número de teléfono** (con su *Phone Number ID*) | El número desde el que escribe tu bot. Meta da uno de prueba para practicar. |
| **App de Meta** | Tu aplicación en Meta for Developers; da acceso a la API y registra el webhook. |
| **Token de acceso** | Una «contraseña» que demuestra que tu código puede enviar mensajes. |
| **Webhook** | La URL pública de tu servidor donde Meta te entrega los mensajes. |

También puedes saltarte parte de esa burocracia contratando un **proveedor de soluciones** (BSP), como Twilio o 360dialog, que ofrece sus propias herramientas encima de la API oficial y cobra por ello. En el curso usas la API directa de Meta porque es la forma más barata y la que mejor enseña cómo funciona todo; lo que aprendas se traslada a cualquier proveedor.

## Por qué no usar librerías «no oficiales»

Quizá viste tutoriales que prometen «un bot de WhatsApp gratis en 10 minutos» con librerías como *whatsapp-web.js* o *Baileys*. Funcionan imitando a **WhatsApp Web**: tu programa se hace pasar por un navegador con tu cuenta.

Parece una ganga, pero para un negocio es una mala idea:

- **Violan las condiciones de uso** de WhatsApp. Pueden **bloquear el número** sin previo aviso, y con él se van tus conversaciones y tus clientes.
- Dependen de ingeniería inversa: cualquier cambio de WhatsApp las rompe.
- No tienen garantías, ni soporte, ni forma de apelar un bloqueo.
- Si vendes un bot a un cliente y se cae o lo bloquean, el problema es tuyo.

La API oficial cuesta algo (lo verás en la [lección 21](../21-costos-y-metricas/)), pero es la única opción seria para un servicio que otros usarán.

## La regla de las 24 horas

Es la regla más importante de toda la plataforma y condiciona el diseño de tu bot.

- Cuando **el cliente te escribe**, se abre una **ventana de atención al cliente de 24 horas**.
- **Dentro de la ventana** puedes enviar mensajes libres: texto, imágenes, botones, listas… lo que quieras.
- **Fuera de la ventana** solo puedes enviar **plantillas de mensaje** (*message templates*): textos con formato fijo que **Meta aprueba antes** y que se envían solo a clientes que aceptaron recibirlos.
- Cada vez que el cliente escribe de nuevo, la ventana se renueva.

```flujo
Cliente escribe|abre la ventana
-> 24 horas
Mensajes libres|texto, botones, listas
-> ventana vencida
Solo plantillas|aprobadas por Meta
```

Por eso un recordatorio de pedido enviado al día siguiente casi siempre sale como plantilla, y por eso un bot bien diseñado intenta resolver todo mientras la ventana está abierta. Las plantillas se pagan y tienen categorías (marketing, utilidad, autenticación); las verás con calma en las lecciones [17](../17-plantillas/), [18](../18-recordatorios-y-seguimiento/) y [21](../21-costos-y-metricas/).

> [!importante] Verifica este dato
> Los precios, las categorías y qué mensajes dentro de la ventana son gratuitos cambian con el tiempo (Meta modificó el modelo de cobro en 2025 y de nuevo en 2026). Consulta siempre la [página oficial de precios](https://developers.facebook.com/docs/whatsapp/pricing) antes de cotizar un proyecto.

## Permiso del cliente (opt-in)

Para escribirle a alguien **por iniciativa tuya** (fuera de una conversación que él empezó) necesitas su **consentimiento previo**: el *opt-in*. Por ejemplo, un cliente que marca una casilla «Quiero recibir novedades por WhatsApp» al comprar, o que te escribe «quiero que me avisen cuando haya ofertas».

Sin opt-in, tus mensajes serán reportados como spam, la **calidad de tu número** bajará y Meta puede limitar o suspender tu cuenta. Es una regla de convivencia y de negocio: un bot que molesta pierde clientes. Volverás a esto en la [lección 20](../20-marketing-responsable/).

## Qué construirás y en qué orden

El curso va de lo seguro a lo real, para que puedas aprender sin gastar un sol ni esperar aprobaciones de nadie:

1. **Lecciones 1 a 8:** el bot funciona en tu consola. Aprendes diseño y el «cerebro» sin necesitar WhatsApp.
2. **Lecciones 9 a 11:** lo conviertes en un servidor con webhook y lo publicas en la nube.
3. **Lecciones 12 a 14:** lo conectas a WhatsApp de verdad.
4. **Lecciones 15 a 21:** memoria, recordatorios, plantillas, formularios y marketing.
5. **Lecciones 22 a 26 y proyecto final:** IA opcional, pruebas, seguridad, atención humana y cómo ofrecerlo a un negocio.

## Errores frecuentes

- **Creer que la API es «gratis y sin límites».** Tiene costos por mensaje de plantilla y reglas estrictas. Entenderlas desde el inicio evita sorpresas.
- **Usar una librería no oficial para ahorrar.** Funciona hasta que bloquean el número del negocio.
- **Intentar escribir primero a un cliente con texto libre.** Fuera de la ventana de 24 horas, la API lo rechaza: hay que usar una plantilla aprobada.
- **Enviar promociones sin permiso.** El opt-in es una condición para existir en la plataforma, no un detalle.
- **Confundir el número de prueba con el de producción.** El número de prueba es solo para practicar y tiene límites de destinatarios.

## Apuntes para llevar

- Un bot de WhatsApp es un **servidor web**: recibe mensajes por webhook y responde con llamadas a la API.
- Para negocios se usa la **WhatsApp Cloud API** (oficial, alojada por Meta); las librerías no oficiales arriesgan el bloqueo del número.
- Las piezas: portafolio de Meta, cuenta WABA, número, app, token y webhook.
- **Ventana de 24 horas:** dentro, mensajes libres; fuera, solo plantillas aprobadas.
- Escribir por iniciativa propia exige **opt-in** del cliente.
- Precios y reglas cambian: consulta siempre la documentación oficial de Meta.

## Glosario

| Término | Significado |
|---|---|
| Bot | Programa que responde mensajes automáticamente. |
| Cloud API | API oficial de WhatsApp Business alojada por Meta. |
| WABA | Cuenta de WhatsApp Business: agrupa números, plantillas y facturación. |
| Webhook | URL de tu servidor a la que Meta envía los mensajes entrantes. |
| Token de acceso | Credencial que autoriza a tu código a usar la API. |
| Ventana de 24 h | Período tras el último mensaje del cliente en el que puedes escribir libremente. |
| Plantilla | Mensaje de formato fijo aprobado por Meta, enviable fuera de la ventana. |
| Opt-in | Consentimiento del cliente para recibir mensajes tuyos. |
| BSP | Proveedor de soluciones que ofrece herramientas sobre la API oficial. |

```quiz
? ¿Cómo recibe tu código los mensajes que escriben los clientes?
- Tu programa abre WhatsApp en un navegador y los lee
+ Meta llama a tu webhook (una URL de tu servidor) y le entrega el mensaje en JSON
- Los mensajes llegan a tu correo y los lees con un script
- Tu programa los consulta cada segundo en el teléfono del cliente
= En la API oficial, Meta empuja cada mensaje a tu webhook por HTTPS.

? Un cliente te escribió ayer a las 20:00. Hoy a las 21:00 quieres enviarle un texto libre. ¿Qué pasa?
- Funciona, porque ya hubo una conversación
+ Se rechaza: pasaron más de 24 horas y fuera de la ventana solo puedes usar una plantilla aprobada
- Funciona si pagas un extra
- Funciona si lo envías desde la app de WhatsApp Business
= Fuera de la ventana de 24 horas solo se permiten plantillas aprobadas por Meta.

? ¿Cuál es el principal riesgo de usar una librería no oficial que imita WhatsApp Web?
- Que es más lenta que la API oficial
- Que no permite enviar texto
+ Que viola las condiciones de uso y pueden bloquear el número del negocio
- Que solo funciona en Linux
= El bloqueo del número es el riesgo real: pierdes el canal y los clientes asociados.

? ¿Qué es el opt-in?
- Un tipo de plantilla de autenticación
- El token de acceso de la API
+ El consentimiento del cliente para recibir mensajes por iniciativa del negocio
- El número de prueba que da Meta
= Sin opt-in, escribir por iniciativa propia puede reportarse como spam y afectar tu cuenta.

? ¿Qué ventaja tiene la app WhatsApp Business gratuita frente a la API?
- Permite programar bots complejos
+ Es sencilla y suficiente para un negocio muy pequeño que atiende a mano, con respuestas rápidas y etiquetas
- Permite enviar mensajes masivos sin permiso
- No necesita número de teléfono
= La app cubre lo básico sin programar; la API se usa cuando hay que automatizar y conectar datos.
```

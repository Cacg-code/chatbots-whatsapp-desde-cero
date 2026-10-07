---
titulo: Otros proveedores y alternativas a la API directa
resumen: Compara la Cloud API directa de Meta con proveedores como Twilio y 360dialog y con librerías no oficiales, para elegir con criterio y sin riesgos para el negocio.
minutos: 50
nivel: intermedio
objetivos:
- Explicar qué es un proveedor de soluciones (BSP) y qué hace entre tu bot y Meta.
- Identificar qué cambia en tu código y en tu cuenta al usar Twilio o 360dialog en lugar de la Cloud API directa.
- Elegir entre API directa, proveedor o sandbox según el perfil del proyecto.
- Justificar por qué Baileys y whatsapp-web.js no son una opción para un negocio.
- Aislar las diferencias de cada proveedor en un adaptador para no reescribir el motor.
fuentes:
- Documentación de WhatsApp Cloud API (Meta) | https://developers.facebook.com/docs/whatsapp/cloud-api/
---
## El mapa de opciones

Hasta aquí construiste el bot sobre la **Cloud API de Meta**, hablándole directamente. Pero esa no es la única puerta de entrada. Para poner un bot en WhatsApp existen cuatro caminos:

| Camino | Qué es | Quién lo respalda |
|---|---|---|
| **API directa de Meta** | Tu app de Meta y tu WABA, sin intermediarios. | Meta |
| **Proveedor (BSP / Tech Provider)** | Una empresa que ofrece su propia API, panel y facturación encima de la plataforma oficial. | Meta lo autoriza; el proveedor da el soporte |
| **Sandbox de un proveedor** | Un número compartido para pruebas rápidas. | El proveedor (no es producción) |
| **Librerías no oficiales** | Programas que imitan WhatsApp Web. | Nadie |

La lección [1](../01-como-funciona-un-bot/) ya advirtió sobre el último camino y mencionó los proveedores. Aquí los miramos con calma, porque en tu trabajo freelance vas a recibir preguntas como «¿y por qué no usamos Twilio?» o «mi primo tiene un bot gratis con una librería». Conviene tener una respuesta fundamentada.

> [!importante] Verifica este dato
> Todo lo que sigue sobre cada empresa (precios, planes, procesos, nombres de menús) se revisó en sus páginas oficiales el 2026-10-07 y **cambia con frecuencia**. Donde hay cifras, están marcadas. Antes de cotizarle algo a un cliente, vuelve a la fuente.

## Qué es un proveedor de soluciones

Meta llama **Partners** a las empresas que ofrecen servicios de la plataforma de WhatsApp Business en nombre de sus clientes. Según la [documentación de Meta](https://developers.facebook.com/docs/whatsapp/solution-providers), existen tres niveles:

- **Solution Partners:** ofrecen el rango completo de servicios (mensajería, facturación, integración, soporte). Pueden tener **líneas de crédito** que extienden a sus clientes, de modo que el cliente no necesita su propio medio de pago en Meta. Meta advierte que convertirse en uno es un proceso largo.
- **Tech Providers:** también ofrecen servicios a otros negocios, pero **sin línea de crédito**: el cliente debe poner su propio medio de pago en Meta, y Meta le factura el uso de la API directamente. El proveedor cobra aparte por sus propios servicios.
- **Tech Partners:** una mejora del nivel anterior.

En el habla común todos se llaman **BSP** (*Business Solution Provider*). Lo que importa para ti: el BSP **no** inventa un WhatsApp distinto. Sigue operando sobre la plataforma oficial; te vende comodidad.

Un detalle técnico útil: los proveedores suelen dar el alta mediante **Embedded Signup**, un flujo que se abre desde su sitio y que, según Meta, «genera automáticamente todos los activos de WhatsApp requeridos» para el cliente (cuenta, número, permisos). Es el mismo trabajo que en la lección [12](../12-cuenta-y-app-de-meta/) hiciste a mano, pero guiado.

## Qué cambia respecto a la Cloud API directa

Con la Cloud API directa tú manejas todo: la app de Meta, el token, el webhook, el formato del JSON. Con un proveedor cambian cinco cosas.

```flujo
Cliente|WhatsApp
-> mensaje
Meta|plataforma oficial
-> entrega
Proveedor|su API y su panel
-> webhook (formato propio)
Tu servidor|adaptador + motor
```

1. **Credenciales.** En lugar del token y la app de Meta usas **las credenciales del proveedor** (cuenta, clave de API o token propio).
2. **Formato de los mensajes.** Cada proveedor decide cómo te entrega y cómo recibe los mensajes. Eso afecta solo a tu adaptador (`whatsapp.js` o su equivalente), no al motor.
3. **Facturación.** Pagas al proveedor, que suma su tarifa a lo que cobra Meta, o bien le pagas una cuota fija y Meta factura aparte.
4. **Soporte y herramientas.** Paneles, bandejas de entrada, reportes, ayuda humana. Es parte de lo que compras.
5. **Dependencia.** Un intermediario más es un punto más que puede fallar o cambiar sus precios. Tu negocio queda atado a su plataforma (aunque el número se puede migrar con esfuerzo; verifica las condiciones de cada uno).

Lo que **no** cambia: las reglas de WhatsApp. La ventana de 24 horas, las plantillas aprobadas, el opt-in y la calidad del número se aplican igual. Twilio, por ejemplo, documenta que «las ventanas de atención al cliente son válidas durante 24 horas después del último mensaje recibido» y que fuera de ellas se necesita una plantilla aprobada: es la misma regla de la lección 1.

### Twilio

[Twilio](https://www.twilio.com/docs/whatsapp) es una plataforma de comunicaciones muy conocida en el mundo del desarrollo. Lo verificado en su documentación oficial:

- Ofrece un **sandbox de WhatsApp** para «prototipar tu aplicación y probar el envío y recepción de mensajes».
- Un **sender** de WhatsApp es un número vinculado a una cuenta de WhatsApp Business (WABA). Quien lo registra por su cuenta usa el flujo de *Self Sign-up*, que exige verificar el negocio en Meta para pasar a producción, tener acceso de administrador en Meta y un número que **no esté ya registrado en WhatsApp**.
- Los mensajes entrantes llegan a tu webhook con el mismo formato que SMS/MMS de Twilio, pero con las direcciones en forma `whatsapp:+51999000111` y el texto en el campo `Body`. Nada de JSON anidado como el de Meta.
- Las plantillas se envían con un identificador de contenido y variables.

Un mensaje de Twilio, ya decodificado, se ve así (datos falsos):

```text
From=whatsapp:+51999000111
To=whatsapp:+51999000222
Body=quiero 2 leches
```

Mapearlo a la entrada del motor es una función de cinco líneas: quitas el prefijo `whatsapp:` y el `+`, y entregas `{ tipo: 'texto', texto: Body }`. Eso es lo bueno de tener un motor sin canal: cambiar de proveedor es cambiar de adaptador.

> [!importante] Verifica este dato
> En su página de precios, Twilio indicaba (al 2026-10-07) una tarifa propia de **0.005 USD por mensaje** de WhatsApp, entrante o saliente, más lo que cobra Meta por las plantillas. Esa cifra puede haber cambiado: consulta la [página oficial de Twilio](https://www.twilio.com/en-us/whatsapp/pricing).

### 360dialog

[360dialog](https://docs.360dialog.com/) se presenta como «un proveedor de soluciones oficial de WhatsApp Business (BSP) y Premier Meta Partner». Según su documentación:

- Puede **revender el uso** de la solución de WhatsApp con una línea de crédito, y aloja el *Embedded Signup* para el alta de clientes.
- Los clientes administran números y plantillas desde su **Hub**, y hay herramientas para socios que gestionan varios clientes.
- Ofrece un **sandbox** gratuito.
- Envías mensajes con una petición `POST` a `/messages` en su dirección base (la documentación da `https://waba-v2.360dialog.io` para su API de mensajes), y los mensajes entrantes llegan por webhook; si tu servidor responde algo distinto de 200, reintentan con esperas crecientes.

La documentación consultada no dice si el formato de las peticiones es idéntico al de Meta, así que **no lo des por hecho**: léelo en su referencia antes de reutilizar tu `whatsapp.js`.

> [!importante] Verifica este dato
> Su página de precios mostraba (al 2026-10-07) cuotas **mensuales fijas por número** (por ejemplo, 49 EUR/mes en un plan «Regular»), con las tarifas de Meta cobradas aparte y sin recargo sobre ellas, según su propia descripción. Revisa los planes vigentes en [360dialog.com/pricing](https://360dialog.com/pricing).

### Otros proveedores

Existen muchos más (los listados oficiales de Meta los agrupan como Solution Partners y Tech Providers). No los comparamos aquí porque no puedo darte datos verificados de todos. Para evaluar **cualquiera**, usa este cuestionario:

- ¿Es un partner autorizado por Meta? ¿De qué nivel?
- ¿Cómo cobra: por mensaje, cuota mensual, o ambos?
- ¿Cómo recibo los mensajes (formato) y cómo los envío?
- ¿Puedo **llevarme mi número** si me quiero ir?
- ¿Qué soporte ofrece y en qué idioma?
- ¿Qué pasa con mis datos y los de mis clientes?

## La tabla de comparación

Resumen para decidir (precios omitidos a propósito; mira los avisos de arriba):

| Aspecto | API directa de Meta | Twilio | 360dialog |
|---|---|---|---|
| Quién factura | Meta | Twilio (suma su tarifa a lo de Meta) | 360dialog (cuota mensual); Meta aparte |
| Alta | Tú creas app, WABA y número (lección 12) | Self Sign-up o Embedded Signup | Hub de 360dialog con Embedded Signup |
| Formato de mensajes | JSON de Meta | Formulario con `From`, `To`, `Body` | Propio (verifica la referencia) |
| Sandbox | Número de prueba de Meta | Sandbox de WhatsApp | Sandbox gratuito |
| Reglas de WhatsApp | Aplican | Aplican | Aplican |
| Soporte | Documentación y foros | Soporte del proveedor | Soporte del proveedor |
| Esfuerzo de arranque | Alto, pero se aprende todo | Medio | Medio |
| Control y costo mínimo | Máximo | Intermedio | Intermedio |

## Cuándo conviene cada uno

No hay una respuesta única. Estas reglas prácticas ayudan:

- **API directa:** tú programas, tienes **uno o pocos negocios** y quieres entender y controlar todo (es el camino del curso). Te ahorras intermediarios y aprendes el sistema completo.
- **Proveedor (BSP):** el cliente quiere **soporte** y un panel, tú no quieres tramitar la cuenta de Meta de cada cliente, o gestionas **muchos clientes** y necesitas procesos de alta repetibles. Pagas por esa comodidad.
- **Sandbox de un proveedor:** para **demos y pruebas** rápidas con un cliente; nunca para producción.
- **Telegram** (lección [27](../27-practica-con-telegram/)): para ensayar sin cuenta de Meta.

Piensa también en el **riesgo comercial**: si le entregas a un cliente un bot montado en tu cuenta de Meta o de un proveedor, acuerda por escrito **de quién es la cuenta y el número**. Lo conversaste en la lección [26](../26-vender-tu-bot/).

## Las alternativas no oficiales y su riesgo

Librerías como **Baileys** o **whatsapp-web.js** no usan la plataforma de negocios: imitan a WhatsApp Web con una cuenta normal. Son populares porque no piden aprobación ni pagan por mensaje. Pero sus propios autores son explícitos:

- El proyecto whatsapp-web.js dice en su README: «WhatsApp no permite bots ni clientes no oficiales en su plataforma, así que esto no debe considerarse totalmente seguro» y «no está garantizado que no te bloqueen al usar este método».
- Baileys declara que no está afiliado ni autorizado por WhatsApp, que sus autores no respaldan usos que violen las condiciones de uso, que desaconsejan el envío masivo o automatizado y que el software se entrega «tal cual», sin garantía.

Traducido a un negocio: puedes **perder el número** (y con él el historial y los clientes que ya te escriben ahí), no hay a quién apelar, y cualquier cambio de WhatsApp puede romper el bot de un día para otro. Para un proyecto de aprendizaje con tu propio número de pruebas, el riesgo lo asumes tú; para un servicio de pago que depende de él, **no es una opción responsable**.

> [!ejemplo] Cómo responderle a un cliente
> **Cliente:** Un conocido me dijo que existe una librería gratis para tener un bot en mi WhatsApp de siempre.
> **Tú:** Existe, pero imita WhatsApp Web, que sus propios autores advierten que no está permitido y puede bloquear el número. Si lo bloquean, perdemos las conversaciones y a tus clientes habituales. Con la API oficial el costo es bajo y el riesgo es mínimo.

## Cómo no casarte con un proveedor

La defensa técnica es la misma idea del curso: **mantén el motor puro y aísla el canal**. Si tu código está así, cambiar de proveedor es escribir un adaptador nuevo:

```text
motor.js            (no cambia)
whatsapp.js         adaptador de Meta directo
twilio.js           adaptador de Twilio
telegram.js         adaptador de Telegram (lección 27)
worker.js           elige el adaptador según la ruta (/webhook, /twilio, /telegram)
```

Cada adaptador hace tres cosas: **validar** que la petición viene del proveedor, **traducir** la entrada al formato del motor y **traducir** las respuestas a la forma que el proveedor acepta. Guarda las sesiones con una clave que incluya el canal (por ejemplo `wa:51999000111` o `tg:5551001`) si compartes la misma base.

## Errores frecuentes

- **Elegir por precio de lista sin sumar todo.** Cuota mensual, tarifa del proveedor y cobro de Meta se suman; haz la cuenta con el volumen real de tu cliente.
- **Dar por hecho que el formato del proveedor es el de Meta.** Cada uno tiene el suyo; léelo en su referencia antes de reutilizar código.
- **Usar el sandbox en producción.** Es un número compartido y de pruebas.
- **No aclarar de quién es el número y la cuenta.** Si el proveedor o la cuenta están a tu nombre, el cliente puede quedarse sin control. Ponlo por escrito.
- **Creer que un proveedor te exime de las reglas de WhatsApp.** La ventana de 24 horas, las plantillas y el opt-in se aplican igual.
- **Recomendar una librería no oficial «porque es gratis».** El costo aparece el día que bloquean el número.
- **Mezclar la lógica del negocio con el código del proveedor.** Luego cambiar de proveedor obliga a reescribir todo.

## Apuntes para llevar

- Un **BSP** o Tech Provider opera sobre la plataforma oficial y te vende comodidad: alta guiada, panel, soporte y, a veces, facturación y crédito.
- Cambian las credenciales, el formato de los mensajes, la facturación y la dependencia; **no cambian** la ventana de 24 horas, las plantillas ni el opt-in.
- Twilio entrega los mensajes como formulario con prefijo `whatsapp:`; 360dialog usa su propia API y un cobro mensual por número. Precios: siempre verifícalos.
- La API directa da el máximo control y el menor costo, a cambio de más trabajo de alta.
- Baileys y whatsapp-web.js imitan WhatsApp Web: sin garantías y con riesgo real de bloqueo; no son para un negocio.
- Aísla cada canal en un adaptador y deja el motor puro: así cambiar de proveedor es barato.

## Glosario

| Término | Significado |
|---|---|
| BSP | Proveedor de soluciones de WhatsApp Business: ofrece API, panel y servicios sobre la plataforma oficial. |
| Solution Partner | Partner de Meta de nivel completo, que puede extender líneas de crédito a sus clientes. |
| Tech Provider | Proveedor tecnológico autorizado; sus clientes ponen su propio medio de pago en Meta. |
| Embedded Signup | Flujo guiado que crea la cuenta, el número y los permisos de un cliente. |
| Sandbox | Entorno compartido de pruebas, no apto para producción. |
| Sender | En Twilio, número de WhatsApp registrado para enviar mensajes. |
| Línea de crédito | Acuerdo por el cual el proveedor paga a Meta y luego te factura a ti. |
| Librería no oficial | Programa que imita WhatsApp Web; viola las condiciones de uso y arriesga el bloqueo. |

```quiz
? ¿Qué diferencia a un Tech Provider de un Solution Partner según Meta?
- El Tech Provider no puede ofrecer servicios de WhatsApp
+ El Tech Provider no tiene líneas de crédito: el cliente pone su propio medio de pago en Meta
- El Solution Partner no necesita aprobación
- El Tech Provider reemplaza las plantillas
= Los Solution Partners pueden extender crédito a sus clientes; los Tech Providers, no.

? Cambias de la Cloud API directa a un proveedor. ¿Qué regla de WhatsApp deja de aplicar?
- La ventana de 24 horas
- Las plantillas aprobadas
- El opt-in
+ Ninguna: las reglas de la plataforma se aplican igual
= El proveedor te vende comodidad, pero opera sobre la misma plataforma y sus mismas reglas.

? ¿Qué parte de tu proyecto debería cambiar al pasar de Meta directo a Twilio?
- El motor de reglas
+ El adaptador que valida, traduce la entrada y construye los envíos
- El catálogo de productos
- Los textos del bot
= Con el motor puro y el canal aislado, solo se escribe un adaptador nuevo.

? Un cliente quiere un bot «gratis» con Baileys en su WhatsApp de siempre. ¿Cuál es el mejor consejo?
- Aceptar, porque no cuesta nada
+ Explicar que imita WhatsApp Web, no está respaldado ni garantizado y puede bloquear el número
- Aceptar solo si el bot es corto
- Usarlo con un número de otra persona
= Los propios autores advierten que no hay garantías; para un negocio, el riesgo de perder el número es inaceptable.

? ¿Para qué sirve sobre todo un sandbox de proveedor?
- Para atender clientes reales
+ Para prototipar y hacer demos rápidas, nunca para producción
- Para reemplazar el token de Meta
- Para evitar las plantillas
= Es un entorno compartido de pruebas; la producción usa un número propio registrado.

? ¿Qué debes hacer con las cifras de precios de un proveedor que lees en un tutorial?
- Usarlas tal cual en la cotización
+ Verificarlas en la página oficial vigente, porque cambian
- Multiplicarlas por dos
- Ignorar los cobros de Meta
= Los precios cambian con el tiempo; consulta siempre la fuente oficial antes de cotizar.
```

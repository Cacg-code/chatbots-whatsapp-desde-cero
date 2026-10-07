---
titulo: Diseñar la conversación antes de programar
resumen: Define qué hará y qué no hará tu bot, su tono, sus flujos y estados, los límites de los mensajes interactivos y cómo pasar a una persona.
minutos: 55
nivel: básico
objetivos:
- Definir los casos de uso de un bot y separar lo que debe hacer de lo que no debe hacer.
- Elegir un tono y escribir mensajes de bienvenida, de error y de «no entendí» coherentes.
- Dibujar un flujo de conversación y convertirlo en un mapa de estados en tabla.
- Respetar los límites de botones y listas de WhatsApp y decidir cuándo usar cada formato.
- Diseñar el traspaso a una persona (handoff) y adaptar el diseño a otros negocios.
---
## Por qué se diseña antes de programar

La tentación al empezar es abrir el editor y escribir `if (texto === "hola")`. Funciona los primeros diez minutos; luego aparece el cliente que escribe «buenas, quiero 3 panes y una gaseosa, ¿hacen delivery?» y el código se vuelve un enredo de condiciones.

Un bot es una **conversación guiada**, y las conversaciones se diseñan igual que una pantalla: primero en papel. Diseñar antes te ahorra reescribir porque respondes preguntas que, si no, te hace el código a las 11 de la noche:

- ¿Qué quiere lograr el cliente cuando escribe?
- ¿Qué debe poder hacer el bot **solo**, y qué debe pasar a una persona?
- ¿Cómo se ve el bot cuando algo sale mal?

En esta lección no escribirás un bot, sino el **plano** de uno. En la [lección 4](../04-primer-bot-en-consola/) lo convertirás en código, y en la [lección 5](../05-estado-de-la-conversacion/) el mapa de estados que dibujes aquí se vuelve una estructura de datos.

## Casos de uso: qué debe y qué NO debe hacer

Un **caso de uso** es una tarea concreta que el cliente quiere cumplir. Para el minimarket, los más frecuentes son:

| Caso de uso | ¿Lo automatiza el bot? | Por qué |
|---|---|---|
| Preguntar horario y dirección | Sí | Es siempre la misma respuesta; ahorra decenas de mensajes. |
| Ver el catálogo y los precios | Sí | Son datos que tú controlas. |
| Armar un pedido y confirmarlo | Sí | Es el flujo que genera ventas. |
| Preguntar por el estado de un pedido | Sí (con datos) | Se consulta en tu sistema. |
| Un reclamo por un producto en mal estado | **No**: a una persona | Requiere empatía y decisiones. |
| Negociar un precio por volumen | **No**: a una persona | Hay excepciones y criterio comercial. |
| Dar consejos de salud o legales | **No** | El bot no debe aconsejar donde no tiene autoridad. |

La regla práctica: **automatiza lo repetitivo y predecible; entrega a una persona lo delicado, lo excepcional y lo emocional.** Un bot que intenta hacerlo todo falla en lo difícil y arruina la imagen del negocio.

Escribe, antes de seguir, dos listas cortas. Para el minimarket:

- **El bot hace:** mostrar horario y dirección, enseñar el catálogo, armar y confirmar pedidos, avisar el estado del pedido.
- **El bot NO hace:** resolver reclamos, aceptar devoluciones, prometer descuentos que no están publicados, pedir datos de tarjeta, hablar de temas ajenos al negocio.

> [!importante] Qué no debe pedir nunca el bot
> No pidas contraseñas, números completos de tarjeta, claves de banca móvil ni códigos de verificación por WhatsApp. Si necesitas un pago, el bot comparte los datos de pago del negocio o un enlace de una pasarela; nunca recoge datos sensibles en el chat. Lo retomamos en la [lección 24](../24-seguridad-y-privacidad/).

## El tono del bot

El **tono** es cómo «suena» el bot. Es una decisión de marca y se toma una vez para todos los mensajes:

- **Tuteo o usted.** Un minimarket de barrio puede tutear; una clínica o un estudio legal suele usar «usted». Elige uno y no los mezcles.
- **Corto.** Se lee en el celular, de pie, con prisa: frases de una o dos líneas, una idea por mensaje.
- **Dices lo que puedes hacer.** «Puedo mostrarte el catálogo, tomar tu pedido o decirte el horario» orienta mejor que «¿En qué puedo ayudarte?».
- **Honesto sobre ser un bot.** Un cliente que descubre que hablaba con un programa que fingía ser persona se siente engañado. Una línea basta: «Soy el asistente virtual de Minimarket La Esquina».
- **Sin emojis en este curso.** Los mensajes de ejemplo no los llevan; en un negocio real son una decisión de marca que puedes tomar después, con moderación.

Compara dos versiones del mismo mensaje:

> [!ejemplo] Mal tono y buen tono
> **Mal:** «ERROR: OPCIÓN NO VÁLIDA. Vuelva a intentarlo.»
> **Bien:** «No entendí esa opción. Puedes escribir 1 para el catálogo, 2 para hacer un pedido o 3 para el horario.»
>
> El primero acusa al cliente y no dice cómo seguir; el segundo asume que fue un malentendido y da una salida.

## Un flujo de conversación

Un **flujo** es el camino que sigue la conversación, de la bienvenida al final. Antes de programarlo, dibújalo. Este es el flujo principal del minimarket:

```flujo
Bienvenida|saluda y ofrece menú
-> elige "pedido"
Elegir productos|catálogo y cantidades
-> confirma
Datos de entrega|dirección y forma de pago
-> acepta resumen
Pedido registrado|número y tiempo estimado
```

Y este es el flujo de los casos informativos, mucho más corto:

```flujo
Bienvenida|menú
-> elige "horario"
Respuesta fija|horario y dirección
-> el cliente escribe de nuevo
Bienvenida|menú
```

Fíjate en que **todo flujo vuelve al menú o a un final claro**. Una conversación sin salida es una de las quejas más comunes: el cliente queda escribiendo a un bot que ya no sabe qué hacer.

## Del flujo al mapa de estados

Un flujo dibujado es fácil de entender; para programarlo conviene pasarlo a una **tabla de estados**. Un **estado** es «en qué punto de la conversación está este cliente ahora». Por cada estado anotas qué dice el bot, qué acepta como entrada y a qué estado pasa:

| Estado | El bot dice | Entradas aceptadas | Siguiente estado |
|---|---|---|---|
| `inicio` | Saludo y menú de 3 opciones | pedido, horario, ayuda | `eligiendo`, `inicio`, `humano` |
| `eligiendo` | Catálogo y pregunta «¿qué quieres?» | nombre de producto y cantidad, «listo», «cancelar» | `eligiendo`, `entrega`, `inicio` |
| `entrega` | Pide la dirección y la forma de pago | texto libre | `confirmando` |
| `confirmando` | Resumen con total y botones Confirmar / Cambiar | confirmar, cambiar | `final`, `eligiendo` |
| `final` | Número de pedido y tiempo estimado | cualquier mensaje | `inicio` |
| `humano` | «Te paso con una persona» | cualquier mensaje (lo atiende alguien) | `inicio` (cuando se cierra el caso) |

Esta tabla es la columna vertebral del bot. Cuando algo falle, preguntarás: «¿en qué estado estaba el cliente y qué entrada recibió?». La [lección 5](../05-estado-de-la-conversacion/) la traduce a código.

> [!consejo] Dibuja los caminos tristes
> Para cada estado pregunta: ¿qué pasa si el cliente escribe algo inesperado? ¿si cancela? ¿si desaparece en medio del pedido? Los «caminos tristes» son donde un bot se gana o pierde la confianza del cliente.

## Botones, listas y texto: qué formato usar

WhatsApp permite mensajes de texto libre y **mensajes interactivos**, que facilitan la respuesta del cliente porque tocan en lugar de teclear. Los dos que usarás son:

- **Botones de respuesta** (*reply buttons*): hasta 3 botones debajo del mensaje. Ideales para decisiones cortas: Confirmar / Cambiar / Cancelar.
- **Lista** (*list message*): un botón que abre un menú desplegable con varias filas, agrupables en secciones. Ideal para elegir entre 4 a 10 opciones, como el menú principal o las categorías.

Los límites son estrictos. Si los superas, la API **rechaza el mensaje** y el cliente no recibe nada. Estas son las cifras que figuran hoy en la documentación oficial de Meta:

| Elemento | Botones de respuesta | Lista |
|---|---|---|
| Cantidad máxima | 3 botones | 10 filas en total (hasta 10 secciones) |
| Título del botón / de la fila | 20 caracteres | 24 caracteres |
| Descripción de la fila | no aplica | 72 caracteres (opcional) |
| Texto del botón que abre la lista | no aplica | 20 caracteres |
| Identificador (`id`) | 256 caracteres | 200 caracteres |
| Texto del cuerpo | 1024 caracteres | 4096 caracteres |
| Pie (footer) | 60 caracteres | 60 caracteres |
| Encabezado de texto | revisa la documentación | 60 caracteres |

> [!importante] Verifica este dato
> Estas cifras se tomaron de la documentación oficial de Meta ([botones de respuesta](https://developers.facebook.com/docs/whatsapp/cloud-api/messages/interactive-reply-buttons-messages) y [mensajes de lista](https://developers.facebook.com/docs/whatsapp/cloud-api/messages/interactive-list-messages)) y pueden cambiar. El límite del encabezado de texto de los botones no aparece indicado en esa página: consúltalo antes de usarlo. Guarda siempre los límites en constantes de tu código, no repartidos por todos los mensajes.

La **decisión** es mecánica:

| Si el cliente debe elegir entre… | Usa |
|---|---|
| 1 a 3 opciones cortas | Botones |
| 4 a 10 opciones | Lista |
| Más de 10 opciones, o un dato libre (cantidad, dirección) | Texto, o filtra por pasos (primero categoría, luego producto) |

Y un detalle de ingeniería importante: **no todos los clientes ven los mensajes interactivos igual** (versiones antiguas de la app, otras plataformas). Un bot robusto siempre puede degradarse a una **versión de texto numerada** («Responde 1 para…, 2 para…»). En el ejercicio escribirás la función que genera ese texto, junto con las que validan botones y listas antes de enviarlos. Un título de 25 caracteres no debe llegar a Meta: lo recortas tú, con criterio, antes.

```text
Ejemplo de menú de respaldo:
1. Ver catálogo
2. Hacer un pedido
3. Horario y dirección
```

## Mensajes de error y de «no entendí»

Tu bot **se va a equivocar** y los clientes van a escribir cosas imprevistas. Lo que diferencia a un bot bueno de uno frustrante es cómo maneja ese momento. Estas son las pautas:

1. **No culpes al cliente.** «No entendí» (el bot es quien no entendió), no «escribiste mal».
2. **Di cómo seguir.** Ofrece las opciones disponibles, no solo el fallo.
3. **Varía el mensaje la segunda vez.** Si el cliente falla dos veces, repetir exactamente lo mismo desespera. Cambia el enfoque: «Parece que no estoy ayudando. ¿Quieres hablar con una persona?».
4. **Cuenta los fallos seguidos.** Dos o tres «no entendí» consecutivos es la señal para ofrecer una persona.
5. **Que el error nunca deje la conversación muerta.** Todo mensaje de error termina en una opción.

Una escalera de respuestas típica:

| Fallo consecutivo | Respuesta del bot |
|---|---|
| 1.º | «No entendí tu mensaje. Puedes escribir catálogo, pedido u horario.» |
| 2.º | «Sigo sin entender. Elige una opción: 1. Catálogo 2. Pedido 3. Horario.» |
| 3.º | «Parece que no logro ayudarte. ¿Te paso con una persona del minimarket?» |

También hay **errores propios**: el servidor se cae, la base de datos no responde. Al cliente no le muestres jamás un error técnico; dile algo como «Tuve un problema para procesar tu mensaje. Inténtalo en unos minutos o escribe *persona* para que te atienda alguien». Esto se retoma en la [lección 23](../23-pruebas-y-errores/).

## El traspaso a una persona (handoff)

El **handoff** es el momento en que el bot deja de contestar y una persona del negocio toma la conversación. Es parte del diseño, no un parche. Diseña tres cosas:

- **Cuándo se activa:** el cliente lo pide («persona», «asesor», «reclamo»); el bot falla varias veces seguidas; el tema está en la lista de «el bot NO hace» (un reclamo, una devolución).
- **Qué se le dice al cliente:** que alguien lo atenderá, **cuándo** (dentro del horario o no) y que no necesita repetir todo.
- **Qué recibe la persona:** el historial resumido, el nombre y el motivo, para no empezar de cero.

```flujo
Bot|conversación normal
-> pide una persona, o falla 3 veces
Estado humano|el bot se calla
-> alguien responde
Persona|atiende al cliente
-> cierra el caso
Bot|vuelve a atender
```

Un detalle crítico: mientras el estado es `humano`, **el bot no debe responder** a los mensajes del cliente; de lo contrario el bot y la persona hablarían a la vez. Y fuera del horario de atención, el mensaje debe ser honesto: «Nuestro equipo atiende de 8:00 a 21:00. Te escribiremos mañana a primera hora». En la [lección 25](../25-atencion-humana/) lo construirás completo.

## El mismo diseño sirve para cualquier negocio

Todo lo anterior aplica a cualquier negocio con clientes que preguntan lo mismo cien veces. Esta tabla muestra cómo se ve el diseño en otros rubros. Fíjate en que cambian los **datos** y los **flujos**, pero la estructura (menú, flujo principal, información fija, handoff) es la misma:

| Negocio | Flujo principal del bot | Información fija | Pasa a una persona cuando… |
|---|---|---|---|
| **Ferretería** | Consultar si hay un producto y su precio; reservar para recoger | Horario, dirección, marcas disponibles | Piden cotización de obra grande o asesoría técnica |
| **Taller mecánico** | Pedir cita para revisión o mantenimiento; ver estado del vehículo | Servicios, horario, ubicación | Diagnóstico de una falla o un presupuesto de reparación |
| **Academia** | Consultar cursos, horarios y matrícula; reservar una clase de prueba | Cursos, precios, sedes | Dudas de pago, becas o cambios de grupo |
| **Restaurante** | Ver la carta, pedir para recoger o delivery; reservar mesa | Carta, horario, zona de delivery | Alergias, eventos grandes o un reclamo |
| **Peluquería** | Reservar cita por servicio y estilista; reprogramar | Servicios, precios, horario | Un servicio especial (novias, color complicado) |
| **Tienda de ropa** | Ver novedades por categoría; consultar talla y stock; reservar | Tallas, cambios, formas de envío | Cambios, devoluciones o pedidos al por mayor |

Cuando un cliente te pida un bot, esta tabla es el comienzo de la conversación: «¿cuáles son las 10 preguntas que más te hacen?». Ahí está el 80 % del diseño. La [lección 26](../26-vender-tu-bot/) retoma esto desde el lado comercial.

## Errores frecuentes

- **Empezar a programar sin saber qué NO hará el bot.** Sin esa lista, el alcance crece sin control y el bot promete lo que no puede cumplir.
- **Menús demasiado largos.** Diez opciones en un solo mensaje abruman; filtra por pasos.
- **Superar los límites de botones o listas.** La API rechaza el mensaje completo; valida antes de enviar.
- **Un «no entendí» idéntico, una y otra vez.** Varía el mensaje y ofrece una persona al tercer fallo.
- **Flujos sin salida.** El cliente debe poder volver al menú, cancelar o pedir ayuda en cualquier punto.
- **Que el bot siga hablando cuando ya atiende una persona.** El estado `humano` debe silenciar al bot.
- **Pedir datos sensibles en el chat.** Nunca contraseñas ni tarjetas completas.

## Apuntes para llevar

- Diseña antes de programar: casos de uso, qué **sí** y qué **no** hace el bot, tono y flujos.
- Automatiza lo repetitivo; entrega a una persona lo delicado y lo excepcional.
- Un mapa de estados en tabla (estado, mensaje, entradas, siguiente estado) es el plano del bot.
- Botones: máximo 3 y 20 caracteres por título. Listas: máximo 10 filas y 24 caracteres por título (verifica en la documentación de Meta).
- Todo mensaje de error debe terminar con una opción; tras 2 o 3 fallos, ofrece una persona.
- El handoff se diseña: cuándo, qué se dice y qué información recibe la persona.
- El diseño es el mismo para cualquier negocio; cambian los datos.

## Glosario

| Término | Significado |
|---|---|
| Caso de uso | Tarea concreta que el cliente quiere cumplir con el bot. |
| Flujo | Camino que sigue una conversación, de la bienvenida al final. |
| Estado | Punto de la conversación en el que se encuentra un cliente. |
| Mensaje interactivo | Mensaje con botones o lista para que el cliente toque en vez de escribir. |
| Botón de respuesta | Botón bajo un mensaje; hasta 3 por mensaje. |
| Lista | Menú desplegable con filas agrupables en secciones. |
| Handoff | Traspaso de la conversación del bot a una persona. |
| Degradación | Usar una versión más simple (texto numerado) cuando no se puede mostrar la ideal. |

```quiz
? ¿Cuál de estos casos conviene pasar a una persona en lugar de automatizarlo?
- Preguntar el horario de atención
- Ver el catálogo con precios
+ Un reclamo por un producto en mal estado
- Consultar la dirección de la tienda
= Los reclamos requieren empatía y decisiones; lo repetitivo y predecible es lo que se automatiza.

? ¿Qué es un estado en el diseño de un bot?
- Un mensaje de error del servidor
+ El punto de la conversación en el que está un cliente ahora
- El país del número del cliente
- El tipo de plantilla aprobada por Meta
= El mapa de estados dice qué dice el bot, qué acepta y a dónde pasa en cada punto.

? Quieres que el cliente elija entre 7 categorías de productos. ¿Qué formato corresponde según los límites actuales?
- Botones de respuesta
+ Una lista, que admite hasta 10 filas
- Un solo texto sin formato, porque 7 es muy poco
- No se puede, el máximo es 3 opciones en cualquier formato
= Los botones llegan a 3; una lista admite hasta 10 filas. Verifica las cifras en la documentación de Meta.

? ¿Qué debes hacer cuando el cliente falla tres veces seguidas?
- Repetir exactamente el mismo mensaje de error
+ Ofrecerle hablar con una persona
- Ignorar sus mensajes hasta que escriba bien
- Reiniciar el servidor
= Varias fallas seguidas indican que el bot no ayuda; el handoff evita perder al cliente.

? Mientras el estado de una conversación es «humano», ¿cómo debe comportarse el bot?
- Responder igual que siempre
- Duplicar cada mensaje del cliente
+ Callar y dejar que la persona atienda
- Mandar el menú cada minuto
= Si el bot sigue hablando, él y la persona se pisan y el cliente recibe respuestas contradictorias.
```

---
titulo: Flujo de pedido
resumen: Cierra el pedido de punta a punta, con entrega o recojo, mínimo de delivery, dirección, pago y confirmación, y aprende a probar todo el recorrido.
minutos: 60
nivel: intermedio
objetivos:
- Recorrer los pasos de un pedido: entrega, dirección, pago y confirmación.
- Aplicar reglas de negocio (mínimo de delivery, costo de envío, dirección válida) con mensajes claros.
- Entender cuándo y cómo el motor produce el pedido final (`pedidoNuevo`) y qué pasa después.
- Permitir al cliente modificar o cancelar sin perder su carrito.
- Probar conversaciones completas con `conversacion()` y con el simulador `consola.js`.
---
## De carrito a pedido

Hasta la [lección 7](../07-catalogo-y-carrito/) el cliente ya puede llenar su carrito. Falta lo que convierte una conversación en una venta: **cómo recibirá el pedido, a dónde, cómo pagará y qué confirma finalmente**. Cada una de esas preguntas es un estado de la máquina de la [lección 5](../05-estado-de-la-conversacion/):

| Estado | Qué se le pregunta al cliente | Botones o entrada |
|---|---|---|
| `CARRITO` | ¿Continuar con este carrito? | Continuar, Seguir comprando, Vaciar carrito |
| `TIPO_ENTREGA` | ¿Recojo o delivery? | Recojo, Delivery, Agregar más |
| `DIRECCION` | ¿A qué dirección lo llevamos? | Texto libre (solo si eligió delivery) |
| `PAGO` | ¿Cómo pagas? | Efectivo, Yape, Transferencia |
| `CONFIRMAR` | Revisa y confirma | Confirmar, Modificar pedido, Cancelar |
| `FIN` | Pedido recibido | (el siguiente mensaje reinicia) |

El recorrido es lineal, pero el cliente puede salir de él en cualquier punto (cancelar, hablar con una persona, volver al menú). Esas salidas son las **globales** que viste en la lección 5.

> [!consejo] Versión visual
> Si prefieres verlo en pantalla, abre el [simulador de WhatsApp](../simulador/) y pulsa «Hacer un pedido completo». Es opcional: hace lo mismo que `consola.js`, con burbujas, botones y el JSON a la vista.

Antes de leer el código, probemos el camino feliz con el simulador. Si usas Bash, este guion le pasa los mensajes al bot desde la entrada estándar (en PowerShell, usa `'hola','2 leches','listo','recojo','efectivo','confirmar' | node consola.js` o escribe las líneas a mano):

```bash
printf 'hola\n2 leches\nlisto\nrecojo\nefectivo\nconfirmar\n' | node consola.js
```

La última respuesta del bot, que depende del reloj real para el id, fue:

```salida
Pedido LE-YH59OL recibido. Total: S/ 8.60.
Estará listo para recoger en unos 15 minutos.
Pagas en efectivo al recibir tu pedido.
Gracias por comprar en Minimarket La Esquina.
```

Dos leches de S/ 4.30 son S/ 8.60: sin delivery, el total es el subtotal. Y el id `LE-YH59OL` cambiará cada vez que lo ejecutes, porque se deriva de la hora.

## Entrega: recojo o delivery

El paso `TIPO_ENTREGA` ofrece tres botones: **Recojo**, **Delivery** y **Agregar más**. Si el cliente elige recojo, se salta la dirección y va directo al pago. Si elige delivery, el bot aplica la primera regla de negocio: el **mínimo de delivery** (`NEGOCIO.minimoDelivery`, S/ 25). La razón es económica: llevar un pedido de S/ 6 cuesta más que lo que se gana.

Con 3 leches y 2 arroces (S/ 21.30), el cliente toca Delivery:

```salida
Para delivery el pedido mínimo es S/ 25.00 y llevas S/ 21.30. Te faltan S/ 3.70 para completarlo, o puedes elegir recojo en tienda.
```

El mensaje cumple tres cosas que conviene imitar siempre que el bot niegue algo:

1. **Explica la regla** (el mínimo) con los números concretos.
2. **Dice cuánto falta**, no solo «no alcanza».
3. **Ofrece una salida** (completar el pedido o elegir recojo) y repite los botones.

La resta es la del ejercicio de esta lección: se hace en céntimos para que `25 - 21.3` dé `3.70` y no `3.6999999999999993`. Y el mínimo se compara con el **subtotal de productos**, sin contar los S/ 3 del envío: un pedido de exactamente S/ 25 pasa (hay una prueba para ese borde en `test/motor.test.js`).

## La dirección

Si el cliente cumple el mínimo y elige delivery, el estado pasa a `DIRECCION` y el bot pide la dirección. Aquí hay una peculiaridad que conviene entender: **en este estado cualquier texto cuenta como dirección**. Si el cliente escribe «hola», no se interpreta como saludo: se toma como intento de dirección (y se rechaza por corta). Solo las globales (cancelar, hablar con una persona, volver al menú) tienen prioridad.

La validación es deliberadamente simple: la dirección debe tener al menos 8 caracteres. Con un cliente que ya añadió más productos hasta S/ 40.30:

```salida
Esa dirección parece muy corta. Escribe calle, número y alguna referencia, por ejemplo: Av. Los Pinos 456, casa verde.
```

Tras recibir «Av. Los Pinos 456, casa verde», el bot guarda la dirección en la sesión y pasa al pago. No intenta verificar que la calle exista: eso no se puede saber sin un servicio de mapas, y es mejor que la persona que reparte confirme en caso de duda. Una regla simple y honesta vale más que una compleja que falla.

> [!nota] Reglas simples primero
> Podrías exigir que la dirección contenga un número o que pertenezca a una de las `zonas` de reparto. Antes de endurecer una regla, piensa en los clientes reales que dejarías fuera («Frente al mercado, puerta azul»). En un negocio pequeño suele convenir aceptar y confirmar por teléfono.

## El pago

El paso `PAGO` ofrece tres botones: **Efectivo**, **Yape** y **Transferencia**. Lo elegido se guarda en `sesion.pago`, y las instrucciones se dan al **final**, en el mensaje de confirmación. Cada medio tiene su texto:

- Efectivo: «Pagas en efectivo al recibir tu pedido.»
- Yape: «Yape: envía S/ 43.30 al 51999000111 y avísanos por este chat.»
- Transferencia: «Transferencia: Cuenta de ejemplo 000-000000000-0-00 a nombre de La Esquina SAC. Avísanos por este chat al pagar.»

Los datos (número de Yape, cuenta) salen de `NEGOCIO`, no del motor, así que cambiarlos no toca la lógica. Y son datos de ejemplo: 51999000111 es un número falso.

Hay un detalle de robustez importante. ¿Qué pasa si el cliente toca un botón **viejo** de un mensaje anterior? WhatsApp conserva todos los mensajes y los botones siguen visibles. Si, por ejemplo, el cliente escribe un producto y luego toca `pago:yape` de un mensaje de hace una hora:

```salida
Esa opción ya no está disponible en este paso.
```

Seguido de la pregunta del paso actual. Esto lo resuelve la tabla `SOLO_EN` de la lección 5: cada acción (entrega, pago, confirmarPedido) solo vale en su estado. Sin esa tabla, un botón antiguo podría saltarse pasos y confirmar un pedido incompleto.

## Confirmar

En `CONFIRMAR` el bot muestra el pedido completo antes de comprometerse. Con el delivery de S/ 3 y el pago por Yape, la parte final del mensaje dice:

```salida
Delivery a: Av. Los Pinos 456, casa verde (S/ 3.00)
Pago: yape
Total a pagar: S/ 43.30
```

Los S/ 43.30 son los S/ 40.30 de productos más S/ 3.00 de envío. Aquí aparece por primera vez el **total del pedido**, distinto del subtotal del carrito: `subtotal + costoDelivery`, siempre en céntimos. Es la misma cuenta que implementarás en `totalPedido`.

El cliente tiene tres botones: **Confirmar**, **Modificar pedido** y **Cancelar**.

- **Modificar pedido** lleva de vuelta a `CARRITO` **conservando** la entrega y el pago ya elegidos. El cliente edita sus productos (quita, agrega) y, al volver a confirmar, no tiene que repetir todo.
- **Cancelar** vacía el carrito y vuelve al menú.
- **Confirmar** crea el pedido.

## El momento del pedido: `pedidoNuevo`

Hasta aquí todo fue conversación. Al confirmar, el motor construye el pedido y lo deja en `sesion.pedidoNuevo`. Recuerda que el motor es puro: **no guarda nada**. Solo informa que hay un pedido nuevo, y quien lo llama (el servidor, la consola) decide qué hacer con él: guardarlo, avisar al dueño, mandarlo a una hoja de cálculo.

Veámoslo con las ayudas de prueba `conversacion()` y `AHORA`, que fijan el reloj en 2026-10-07 15:00 UTC para que el id sea predecible:

```js ejemplo.js
import { conversacion } from './test/ayudas.js';

const c = conversacion();
c.decir('hola');
c.decir('3 leches y 2 arroces');
c.decir('2 aceites');
c.tocar('cerrar');
c.tocar('entrega:delivery');
c.decir('Av. Los Pinos 456, casa verde');
c.tocar('pago:yape');
c.tocar('pedido_confirmar');
console.log(c.sesion.estado, c.sesion.carrito.length);
console.log(c.sesion.pedidoNuevo);
console.log(c.texto);
```

```salida
FIN 0
{
  id: 'LE-Y8IPJ4',
  telefono: '51999000111',
  items: [
    { id: 'leche', nombre: 'Leche entera 1 L', precio: 4.3, cantidad: 3 },
    { id: 'arroz', nombre: 'Arroz extra 1 kg', precio: 4.2, cantidad: 2 },
    { id: 'aceite', nombre: 'Aceite vegetal 1 L', precio: 9.5, cantidad: 2 }
  ],
  total: 43.3,
  entrega: 'delivery',
  direccion: 'Av. Los Pinos 456, casa verde',
  pago: 'yape',
  estado: 'recibido',
  creadoEn: 1791385240000
}
Pedido LE-Y8IPJ4 recibido. Total: S/ 43.30.
Lo llevaremos a tu dirección en unos 40 minutos.
Yape: envía S/ 43.30 al 51999000111 y avísanos por este chat.
Gracias por comprar en Minimarket La Esquina.
```

(La salida se abrevió un poco: Node imprime cada línea de `items` en varias líneas. El id cambia con el reloj de prueba.)

Hay varias cosas que mirar:

- El estado es `FIN` y el carrito de la sesión quedó **vacío**: el pedido ya no vive en la conversación sino en `pedidoNuevo`.
- El **id** es `LE-` más las últimas seis cifras de la hora en base 36 y mayúsculas: `ahora.toString(36).toUpperCase().slice(-6)`. No es único por diseño matemático, pero es corto para dictarlo por teléfono y distinto en la práctica. Un sistema real usaría un contador o un identificador de la base de datos.
- Los **items se copian** del carrito, con nombre y precio de ese momento, igual que la lección 7.
- `estado: 'recibido'` es el primer estado del pedido; más adelante (lección 16) el dueño lo cambiará a «preparando», «entregado», etc.

`pedidoNuevo` es **solo** del turno de confirmación. Si el cliente escribe «hola» después, el motor reinicia la sesión y `sesion.pedidoNuevo` vuelve a ser `null`:

```js ejemplo.js
c.decir('hola');
console.log(c.sesion.estado, c.sesion.pedidoNuevo);
```

```salida
MENU null
```

Esto evita un error muy común y caro: **guardar el mismo pedido dos veces**. Quien llama al motor debe revisar `pedidoNuevo` en cada turno y guardarlo cuando no sea `null`; como solo aparece una vez, no hay riesgo de duplicados.

## Cuando el estado cambia el significado

Una última observación de diseño. En el estado `CARRITO`, si el cliente escribe «continuar» o «recojo», el bot no lo entiende (y responde «No te entendí bien», luego «Sigo sin entenderte»). Esas palabras son **botones** de otros pasos, y el entendimiento de texto está pensado para frases de compra, «sí», «cancelar», etc. En cambio, el botón `cerrar` y un «si» sí funcionan en `CARRITO`.

Esto no es un fallo oculto: es un límite real del bot de reglas, y conviene conocerlo. Hay dos maneras de resolverlo: añadir esas frases como texto válido del paso (más reglas) o insistir en los botones (menos reglas, una experiencia más guiada). El contador `fallos` de la lección 5 se encarga de que, tras dos malentendidos seguidos, el bot repita el paso con sus botones en vez de seguir fallando.

La moraleja es la que ya sabes: **el mismo texto significa cosas distintas según el estado**. «Si» en `CONFIRMAR` confirma el pedido; en `MENU` no significa nada.

## Probar el flujo completo

Con tantas reglas y estados, probar a mano cada vez no es viable. Las pruebas automáticas son lo que te permite cambiar un texto o una regla con tranquilidad. En `test/motor.test.js` hay una prueba por cada situación de esta lección: pedido completo con recojo, con delivery, el mínimo exacto de S/ 25, el pago por transferencia, «Modificar pedido», el reinicio tras `FIN` y la cancelación desde cada paso (un bucle sobre todos los estados). Se ejecutan con:

```bash
npm test
```

```salida
ℹ tests 112
ℹ pass 112
ℹ fail 0
```

Todo en unos 0,4 segundos. El motor puro lo permite: no hay red, ni base de datos, ni WhatsApp de por medio. Cuando el bot esté desplegado (lecciones 10 y 11), estas mismas pruebas seguirán validando el cerebro, y solo necesitarás probar manualmente la conexión.

> [!consejo] Un hábito útil
> Cada vez que un cliente real se queje de algo («me cobró de más», «se quedó trabado»), escribe primero una prueba que reproduzca el problema. Verás que falla, arreglas el motor y la prueba pasa. Así los errores no vuelven.

## Errores frecuentes

- **Guardar el pedido antes de la confirmación.** Hasta `confirmarPedido` el cliente puede cancelar o modificar; guarda solo cuando `pedidoNuevo` no sea `null`.
- **Guardar el mismo pedido dos veces.** Revisa `pedidoNuevo` solo una vez por turno y no lo reutilices.
- **Comparar el mínimo de delivery con el total ya con envío.** Se compara con el subtotal de productos.
- **Rechazar sin dar salida.** Un «no alcanza el mínimo» sin decir cuánto falta ni ofrecer recojo deja al cliente varado.
- **Dejar que un botón viejo salte pasos.** Valida cada acción contra el estado actual (`SOLO_EN`).
- **Validar demasiado la dirección.** Reglas estrictas expulsan a clientes reales; mejor aceptar y confirmar.
- **Olvidar que tras `FIN` hay que reiniciar.** Si no, el siguiente «hola» seguiría en un pedido cerrado.

## Apuntes para llevar

- Cerrar un pedido es **recorrer estados**: entrega, dirección (solo delivery), pago y confirmación.
- Las reglas de negocio (mínimo S/ 25, envío S/ 3, dirección de 8 caracteres o más) viven en datos y funciones pequeñas, y se explican con números concretos.
- Un rechazo bueno **explica, cuantifica y ofrece una salida**.
- El total del pedido es `subtotal + envío`, calculado en céntimos.
- El motor no guarda: devuelve `pedidoNuevo` **una sola vez**, en el turno de confirmación, y quien lo llama decide qué hacer.
- «Modificar pedido» regresa al carrito sin perder entrega ni pago; tras `FIN`, el siguiente mensaje reinicia la sesión.
- Los límites del bot de reglas (como «continuar» escrito en `CARRITO`) se conocen y se documentan, no se ocultan.
- Las conversaciones completas se prueban con `conversacion()` y `npm test`.

## Glosario

| Término | Significado |
|---|---|
| Mínimo de delivery | Subtotal de productos desde el cual se acepta un envío a domicilio (S/ 25). |
| Costo de delivery | Cargo fijo del envío (S/ 3), que se suma al subtotal. |
| `pedidoNuevo` | Pedido creado por el motor, presente solo en el turno de confirmación. |
| Estado `FIN` | La conversación terminó con un pedido confirmado; el siguiente mensaje reinicia. |
| Id de pedido | Código corto (`LE-` y seis caracteres) para identificar el pedido. |
| `conversacion()` | Ayuda de pruebas que simula un cliente con reloj fijo. |
| Botón viejo | Botón de un mensaje anterior, que el cliente toca fuera de su paso. |
| Reinicio de sesión | Volver a empezar la conversación con un carrito vacío. |

```quiz
? ¿Con qué se compara el mínimo de delivery?
- Con el total ya incluido el envío
+ Con el subtotal de los productos, sin contar el envío
- Con la cantidad de productos
- Con la distancia a la dirección
= Un pedido de exactamente S/ 25 en productos pasa; el envío se suma después.

? Un cliente pide delivery con S/ 21.30 en el carrito. ¿Qué respuesta es la mejor?
- «No se puede.»
+ Explicar el mínimo, decir que faltan S/ 3.70 y ofrecer completar el pedido o recoger en tienda
- Aceptar el pedido igualmente
- Cancelar la conversación
= Un buen rechazo explica la regla, cuantifica y ofrece una salida.

? ¿Cuándo trae un valor `pedidoNuevo` la sesión devuelta por `procesar`?
- En todos los turnos
+ Solo en el turno en que el cliente confirma el pedido
- Cuando el cliente llena el carrito
- Cuando el cliente escribe «hola»
= Al ser de un solo turno, no hay riesgo de guardar el mismo pedido dos veces.

? ¿Qué hace «Modificar pedido» en el paso de confirmación?
- Borra el pedido
+ Vuelve al carrito conservando la entrega y el pago elegidos
- Reinicia la conversación
- Confirma el pedido con cambios
= El cliente edita sus productos sin repetir todo el recorrido.

? El cliente toca un botón `pago:yape` de un mensaje antiguo mientras está eligiendo productos. ¿Qué ocurre?
- Se confirma el pago
+ El bot responde que esa opción ya no está disponible y repite la pregunta del paso actual
- El bot se cae
- Se reinicia la sesión
= La tabla `SOLO_EN` acepta cada acción solo en su estado.
```

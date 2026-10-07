# Referencia de módulos

Bot de reglas de "Minimarket La Esquina" (negocio ficticio, moneda S/). Todos los ejemplos de salida son reales (ejecutados con Node 24).

## src/catalogo.js
- `NEGOCIO`: `{ nombre, horario, direccion, costoDelivery: 3, minimoDelivery: 25, zonas, yape, cuentaTransferencia }`.
- `PRODUCTOS`: 31 productos `{ id, nombre, precio, categoria, unidad, sinonimos[] }` en 6 categorías.
- `CATEGORIAS`: `{ abarrotes: 'Abarrotes', ... }`.
- `productoPorId(id)` -> producto o `null`. `productosDeCategoria(cat)` -> arreglo.

## src/texto.js
| Función | Firma | Ejemplo |
|---|---|---|
| `normalizar` | `(texto) -> string` | `normalizar('¡Quiero DOS Leches!')` -> `quiero dos leches` |
| `extraerCantidad` | `(texto) -> number` (1 si no hay) | `extraerCantidad('media docena de huevos')` -> `6`; `'dos leches'` -> `2` |
| `cantidadSola` | `(texto) -> number \| null` | `cantidadSola('tres')` -> `3`; `'3 leches'` -> `null` |
| `buscarProductos` | `(texto, productos) -> producto[]` | `buscarProductos('mantequila', PRODUCTOS)` -> `[mantequilla]` (tolera 1 error en palabras de 5+ letras) |
| `separarPedidos` | `(texto, productos) -> {cantidad, productos[]}[]` | `'2 leches y 1 arroz'` -> `[[2,'leche'],[1,'arroz']]` |
| `detectarIntencion` | `(texto) -> intención` | `detectarIntencion('quiero hablar con una persona')` -> `humano` |
| `levenshtein`, `mencionaAlguna` | utilidades | |

Intenciones: `saludo menu catalogo carrito confirmar cancelar ayuda humano horario desconocida`.

## src/carrito.js (puro e inmutable, en céntimos internamente)
Línea: `{ id, nombre, precio, cantidad }`.
- `agregar(carrito, producto, cantidad)`, `quitar(carrito, id)`, `cambiarCantidad(carrito, id, n)` (0 elimina) -> carrito nuevo.
- `total(carrito)` -> soles (`0.1 + 0.2` da `0.3`). `cantidadItems`, `formatoSoles(12.5)` -> `S/ 12.50`.
- `resumen(carrito)`:
```
- 2 x Leche entera 1 L: S/ 8.60
- 1 x Arroz extra 1 kg: S/ 4.20
Subtotal: S/ 12.80
```

## src/mensajes.js
Objeto `mensajes` con una función por texto del bot (sin emojis). Cambia aquí cómo habla.

## src/motor.js
- `ESTADOS`: INICIO, MENU, ELIGIENDO, CARRITO, TIPO_ENTREGA, DIRECCION, PAGO, CONFIRMAR, FIN, ESPERANDO_HUMANO.
- `crearSesion(telefono, ahora?)` -> sesión `{ telefono, estado, carrito, entrega, direccion, pago, fallos, productoPendiente, cantidadPendiente, pedidoNuevo, derivadoHumano, recordatorioEnviado, creadoEn, ultimoMensajeCliente, actualizadoEn }`.
- `procesar(sesion, entrada, ahora = Date.now())` -> `{ sesion, respuestas }`. Pura: no modifica la sesión recibida.
  - Entrada: `{tipo:'texto', texto}` | `{tipo:'interactivo', id}` | `{tipo:'no_soportado', subtipo}`.
  - Respuestas: `{tipo:'texto', texto}` | `{tipo:'botones', texto, botones:[{id,titulo}]}` (máx. 3, título <= 20) | `{tipo:'lista', texto, boton, secciones:[{titulo, filas:[{id,titulo,descripcion}]}]}` (máx. 10 filas, título <= 24, descripción <= 72).
  - Al confirmar: `sesion.pedidoNuevo = { id, telefono, items, total, entrega, direccion, pago, estado:'recibido', creadoEn }` (solo en ese turno).
- Ids interactivos: `menu_pedir menu_horario menu_humano menu_menu seguir ver_carrito cerrar vaciar cat:<categoria> prod:<id> cant:<n> entrega:<recojo|delivery> pago:<efectivo|yape|transferencia> pedido_confirmar pedido_editar pedido_cancelar`.

Ejemplo:
```js
const r = procesar(crearSesion('51999000111', 0), { tipo: 'texto', texto: 'quiero 2 leches' }, 1000);
r.sesion.estado   // 'ELIGIENDO'
r.respuestas[0]   // { tipo:'botones', texto:'Agregué 2 x Leche entera 1 L.\nLlevas 2 producto(s). Subtotal: S/ 8.60.',
                  //   botones:[{id:'seguir',titulo:'Seguir comprando'},{id:'ver_carrito',...},{id:'cerrar',titulo:'Finalizar pedido'}] }
```

## src/whatsapp.js
- `GRAPH_VERSION` = `'v26.0'` (verificada el 2026-10-07 en el changelog de Graph API).
- `parsearWebhook(payload)` -> eventos `{tipo:'mensaje', de, nombre, id, timestamp, phoneNumberId, entrada}` | `{tipo:'estado', id, estado, timestamp, destinatario, errores}`. Ignora basura sin lanzar errores.
- `construirEnvio(to, respuesta)` -> cuerpo JSON de `POST /{PHONE_NUMBER_ID}/messages`; lanza `Error` si se rompe un límite de WhatsApp. Ejemplo de salida (botones):
```json
{"messaging_product":"whatsapp","recipient_type":"individual","to":"51999000111","type":"interactive",
 "interactive":{"type":"button","body":{"text":"..."},
 "action":{"buttons":[{"type":"reply","reply":{"id":"seguir","title":"Seguir comprando"}}]}}}
```
- `construirPlantilla(to, nombre, idioma='es', variables=[])`:
```json
{"messaging_product":"whatsapp","recipient_type":"individual","to":"51999000111","type":"template",
 "template":{"name":"recordatorio_pedido","language":{"code":"es"},
 "components":[{"type":"body","parameters":[{"type":"text","text":"LE-1"}]}]}}
```
- `construirLeido(messageId)` -> `{"messaging_product":"whatsapp","status":"read","message_id":"wamid.X"}`.
- `verificarFirma(secretoApp, cuerpoCrudo, cabecera)` -> `Promise<boolean>` (HMAC-SHA256, `sha256=<hex>`, comparación en tiempo constante con `crypto.subtle.verify`). `firmar(secreto, cuerpo)` genera la cabecera (útil en pruebas): `firmar('secreto','{}')` -> `sha256=9b09d74c...17e9`.
- `enviarMensaje(env, cuerpo, llamar = fetch)` -> respuesta JSON; lanza error con el estado HTTP (sin el token).

## src/recordatorios.js (puro)
- `pedidosParaRecordar(pedidos, ahora)`: estado `recibido`, sin recordar, sin movimiento entre 30 min y 23 h.
- `carritosAbandonados(sesiones, ahora)`: carrito lleno, en compra, inactivo entre 1 h y 23 h, sin aviso previo.
- `puedeEnviarTexto(ultimoMensajeCliente, ahora)`: `true` si pasaron menos de 24 h. `puedeEnviarTexto(0, 3600000)` -> `true`; con 25 h -> `false`.

## src/worker.js
Exporta `default { fetch, scheduled }` y, para pruebas, `manejarFetch`, `procesarMensaje`, `ejecutarRecordatorios`.
Rutas: `GET /` (ok), `GET /salud` (`{"ok":true}`), `GET /webhook` (verificación con `hub.*`), `POST /webhook` o `POST /` (eventos, firma obligatoria).
KV: `sesion:<tel>` (2 días), `pedido:<id>` (30 días), `visto:<wamid>` (1 día, idempotencia).

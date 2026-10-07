# Código de referencia: bot de WhatsApp para "Minimarket La Esquina"

Negocio ficticio. Bot de reglas (sin IA): catálogo, carrito, pedido con recojo o delivery, pago (texto), confirmación y recordatorios.
Requiere Node 22 o superior. El motor y las pruebas no usan dependencias; solo `wrangler` (para el Worker) es devDependency.

## Estructura
```
package.json        scripts: npm test, npm run chat
consola.js          simulador en la terminal (sin WhatsApp)
src/
  catalogo.js       NEGOCIO y PRODUCTOS
  texto.js          normalizar, cantidades, buscar productos, intención
  carrito.js        carrito puro e inmutable
  mensajes.js       todos los textos del bot
  motor.js          máquina de estados: procesar(sesion, entrada) -> { sesion, respuestas }
  whatsapp.js       payloads de la Cloud API, firma del webhook, envío
  recordatorios.js  qué recordar y cuándo (puro)
  worker.js         Cloudflare Worker (webhook + cron)
test/               112 pruebas con node:test; test/payloads/*.json son ejemplos de webhook
wrangler.toml       configuración del Worker (ids de ejemplo)
.dev.vars.example   variables secretas de ejemplo
API.md              referencia de cada módulo
```
Idea central: `motor.js` no hace entrada/salida. Recibe sesión + mensaje y devuelve sesión nueva + respuestas.
`worker.js` y `consola.js` son dos "carcasas" distintas del mismo motor.

## Cómo correr
```
npm test            # 112 pruebas, todas deben pasar
npm run chat        # conversar con el bot; escribe "hola"
```
En la consola, cuando el bot muestra botones o listas, escribe el número de la opción (o su id). Para un guion rápido:
```
printf 'hola\n2 leches\nlisto\nrecojo\nefectivo\nconfirmar\n' | node consola.js
```

## Worker (Cloudflare)
```
npm install
cp .dev.vars.example .dev.vars        # y pon tus valores
npx wrangler kv namespace create BOT_KV   # copia el id a wrangler.toml
npx wrangler secret put VERIFY_TOKEN  # idem WA_TOKEN, APP_SECRET
npx wrangler dev                      # local
npx wrangler deploy                   # publicar
```
URL del webhook en Meta: `https://bot-minimarket.<tu-subdominio>.workers.dev/webhook` con tu VERIFY_TOKEN.

Estado de validación: `npx wrangler deploy --dry-run` funciona (empaqueta el Worker, 49 KiB). NO se ejecutó contra la nube ni contra la API de Meta real (no hay credenciales). Las plantillas `recordatorio_pedido` (1 variable) y `carrito_pendiente` (sin variables), idioma `es`, hay que crearlas y aprobarlas en Meta antes de usarlas.

## Qué verificar antes de producción
Busca `VERIFICAR` en `src/whatsapp.js`. Revisa también `GRAPH_VERSION` en el changelog de Graph API.

## Límites conocidos (a propósito, para mantenerlo simple)
- KV no es atómico: dos mensajes simultáneos del mismo cliente pueden pisarse. Para alto volumen usa Durable Objects.
- Listar sesiones/pedidos con `kv.list` sirve hasta ~1000 claves; después usa D1.
- Una sola zona horaria y sin validación de zonas de delivery (solo se muestran).

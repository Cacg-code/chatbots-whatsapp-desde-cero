---
minutos: 180
nivel: avanzado
---
## Objetivo

Entregar el bot completo de Minimarket La Esquina, funcionando en consola, probado con pruebas automáticas, desplegado en Cloudflare y comprobado con tu teléfono, con la lista de entrega y la rúbrica del proyecto.

### Cómo se trabaja

Este ejercicio no tiene comprobaciones automáticas en la página: tu evidencia son los resultados de `npm test`, los logs de `wrangler tail` y tu README. Avanza en el orden de la lección y haz un commit pequeño por paso. Usa solo datos ficticios.

```pasos
Copia `codigo/` a `mi-bot-minimarket`, ejecuta `npm install` y `npm test`. Anota cuántas pruebas pasan antes de cambiar nada.
Corre el recorrido de la consola con `printf 'hola\n2 leches\nlisto\nrecojo\nefectivo\nconfirmar\n' | node consola.js` (en PowerShell: `'hola','2 leches','listo','recojo','efectivo','confirmar' | node consola.js`) y explica con tus palabras qué estado atraviesa la sesión en cada mensaje.
Personaliza `src/catalogo.js`: cambia horario, dirección ficticia y zonas, y agrega 3 productos con categoría, unidad y varios sinónimos. Vuelve a correr `npm test`.
Crea `test/aceptacion.test.js` con los escenarios A1 a A6 de la lección y agrega 2 escenarios propios, uno de ellos con un producto que tú agregaste.
Crea `src/humano.js` con las funciones de la lección 25, conecta `procesarConHumano` y `liberarHumanosVencidos` en `src/worker.js` y añade las pruebas de humano. Escribe una prueba de extremo a extremo con un POST firmado.
Crea `src/fiabilidad.js` con `registrar`, `ocultarSecretos`, `ocultarTelefono` y `enviarConReintentos`, y úsalo en el Worker para los envíos y los errores de estado.
Crea el KV y los secretos con `wrangler`, edita `wrangler.toml` (id del KV, `WA_PHONE_ID`, `DUENO_TEL`) y corre `npx wrangler deploy --dry-run`. Si todo está bien, despliega y abre `/salud`.
En Meta configura el webhook (`/webhook`, el `VERIFY_TOKEN` y el campo `messages`), agrega tu teléfono como destinatario permitido y envía «hola» desde tu teléfono.
Crea o solicita las plantillas `recordatorio_pedido`, `carrito_pendiente` y `aviso_atencion` y anota su estado de aprobación en tu README.
Ejecuta el guion del paso 9 con `npx wrangler tail` abierto y anota qué salió bien y qué no.
Revisa la checklist de entrega, autoevalúate con la rúbrica de 100 puntos y escribe el README con los pendientes declarados.
```

```pista Si una prueba nueva falla
Lee el mensaje con calma antes de tocar el código: muchas veces el bot tiene razón. Mi escenario de delivery falló porque el subtotal quedaba bajo el mínimo de S/ 25.00; había que corregir la prueba, no el bot.
```

```pista Dos módulos que se importan entre sí
`worker.js` importa `humano.js` y `humano.js` importa `procesarMensaje` de `worker.js`. Funciona porque ambos solo exportan funciones que se llaman después de cargar los módulos. Si ves un error de inicialización, comprueba que no ejecutas nada en el nivel superior del archivo.
```

```pista Si el bot no responde en WhatsApp
Revisa en este orden: que el webhook esté verificado, que el campo `messages` esté suscrito, que tu teléfono esté en la lista de destinatarios permitidos (`131030`), que `WA_TOKEN` no haya vencido y qué dicen los logs de `wrangler tail`.
```

```pista Plantillas sin aprobar
No es un fallo de tu código. Declara el pendiente en el README y verifica que el cron registre el error sin tumbar el Worker.
```

> [!consejo] Reto extra
> Haz que el mensaje de fuera de horario diga exactamente cuándo atenderán («hoy a las 17:00» o «mañana a las 9:00») con una función `proximaApertura`, y cúbrela con pruebas para viernes por la noche y sábado.

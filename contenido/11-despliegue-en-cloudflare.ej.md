---
minutos: 45
nivel: intermedio
---
## Objetivo

Dejar el proyecto listo para desplegar: cuenta creada, Wrangler autenticado, configuración revisada y el empaquetado verificado con `--dry-run`. **No despliegues todavía**: eso lo harás con tus credenciales reales de Meta en las lecciones 12 y 13.

### Cómo se trabaja

Esta lección es de configuración, así que el ejercicio no tiene comprobaciones automáticas: lo verificas tú con la salida de cada comando. Trabaja en la carpeta `codigo/` del curso y anota en un archivo `notas-despliegue.md` lo que se pide. Si algo no coincide con lo que ves en pantalla, la [documentación oficial de Wrangler](https://developers.cloudflare.com/workers/wrangler/commands/) manda: los mensajes cambian entre versiones.

```pasos
Crea tu cuenta gratuita en dash.cloudflare.com y confirma tu correo. En `notas-despliegue.md` anota el plan que ves en tu cuenta (no pegues contraseñas ni códigos).
En `codigo/` ejecuta `npm install` y luego `npx wrangler --version`. Anota la versión.
Ejecuta `npx wrangler login`, autoriza en el navegador y verifica con `npx wrangler whoami` que aparece tu correo. Anota solo el nombre de la cuenta (no hace falta pegar el Account ID).
Abre `wrangler.toml` y subraya (en tus notas) cuáles de estos valores son de ejemplo y deben cambiar antes de un despliegue real: `id`, `preview_id` y `WA_PHONE_ID`. Explica en una línea por qué `VERIFY_TOKEN`, `WA_TOKEN` y `APP_SECRET` NO aparecen en ese archivo.
Ejecuta `npx wrangler kv namespace create --help` y anota qué hace la opción `--update-config`. NO ejecutes el comando de creación todavía si no quieres dejar recursos en tu cuenta; si lo ejecutas, anota el id y bórralo después con `npx wrangler kv namespace delete`.
Ejecuta `npx wrangler deploy --dry-run` y anota: el tamaño total del paquete, los bindings que aparecen y cuáles de los tres secretos aparecen (deberían ser ninguno).
Ejecuta `npx wrangler deploy --dry-run --outdir dist` y abre `dist/worker.js` en tu editor: ubica la función `manejarFetch`. Anota cuántos KB pesa el archivo. Después borra la carpeta `dist` (o añádela a `.gitignore`).
Ejecuta `npx wrangler tail --help` y `npx wrangler rollback --help`. Anota la opción de `tail` que filtra solo invocaciones con error y qué dato necesitas para un `rollback`.
Escribe en tus notas el comando exacto que usarías, ya con tus datos, para cargar `WA_TOKEN` como secreto, y el que usarías para ver que quedó guardado sin mostrar su valor.
Escribe tu lista de comprobación de «antes de cada despliegue» en cuatro pasos y verifica que el primero (`npm test`) pasa en tu máquina.
```

```pista Si `npm install` falla
Revisa `node -v`: el proyecto pide Node 22 o superior. Si tienes una versión anterior, actualízala (lección 3) y repite. Si el error menciona permisos, no uses `sudo`; instala Node con el instalador oficial.
```

```pista Si `wrangler login` no abre el navegador
Copia la dirección que imprime la terminal en tu navegador. Si estás en un entorno sin pantalla, mira en la documentación oficial la opción de autenticación mediante un API token (variable de entorno `CLOUDFLARE_API_TOKEN`) en lugar del inicio de sesión interactivo.
```

```pista Por qué el dry-run pasa con ids de ejemplo
`--dry-run` no consulta tu cuenta de Cloudflare: solo compila y valida el archivo. Un `id` de KV inexistente solo se detecta al desplegar de verdad. Por eso, antes del despliegue real, comprueba a mano que reemplazaste los ids.
```

```pista El comando de los secretos
El formato es `npx wrangler secret put NOMBRE`. Wrangler te pide el valor por teclado. Para ver los nombres guardados (nunca los valores) usa `npx wrangler secret list`.
```

> [!consejo] Reto extra
> Añade un segundo Worker de práctica, `hola-minimarket`, con una carpeta nueva, un `wrangler.toml` mínimo (`name`, `main`, `compatibility_date`) y un `fetch` que devuelva «Hola desde Minimarket La Esquina». Pruébalo con `npx wrangler dev` y compruébalo con `npx wrangler deploy --dry-run`. Desplegarlo de verdad es opcional (es gratuito), pero acuérdate de borrarlo después desde el panel si ya no lo necesitas.

---
minutos: 45
nivel: básico
---
## Objetivo

Dejar lista tu cuenta de pruebas: app de Meta, número de prueba, destinatario, token temporal y secretos guardados, y comprobar con un mensaje real que todo está conectado.

### Cómo se trabaja

Este ejercicio es práctica real en el sitio de Meta y en tu terminal. No hay funciones que comprobar en el navegador porque nada aquí es código verificable sin tus credenciales: lo que importa es que llegues a ver el mensaje en tu celular. **No pegues tus tokens en esta página, en capturas ni en ningún repositorio.** Si los menús de Meta se ven distintos a lo descrito, usa la [guía oficial](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started).

```pasos
Parte A. Entra en developers.facebook.com con tu cuenta, acepta los términos y crea una app con el caso de uso **Connect with customers through WhatsApp**. Llámala `Bot Minimarket La Esquina (pruebas)`.
Parte A. En el panel de WhatsApp (**API Setup**) anota en un archivo local `notas-meta.txt` (fuera de git) el **WhatsApp Business Account ID** y el **Phone Number ID** del número de prueba.
Parte A. Registra tu celular en el campo **To** y confirma el código que te llegue.
Parte A. Pulsa **Generate access token** y copia el token temporal a un gestor de contraseñas (no al archivo de notas).
Parte A. Busca el **App Secret** en **App settings > Basic** y guárdalo también en el gestor de contraseñas.
Parte B. En la carpeta `codigo/`, copia `.dev.vars.example` a `.dev.vars` y rellénalo con tus valores; inventa un `VERIFY_TOKEN` largo y aleatorio.
Parte B. Comprueba con `git status` que `.dev.vars` no aparece como archivo nuevo (debe estar ignorado).
Parte B. Envía el mensaje de prueba con el botón **Send message** del panel o con `curl` y confirma que llega a tu celular.
Parte B. Responde desde tu celular con la palabra `hola`. Anota la hora: desde ahí tienes 24 horas de ventana abierta.
Parte B. Escribe en `notas-meta.txt` cuándo caduca tu token temporal según tu panel y en qué fecha vas a generar el permanente de usuario del sistema.
```

```pista No encuentro el App Secret
Suele estar en **App settings > Basic** (Configuración de la app > Básica). Si Meta cambió el menú, busca «App Secret» en la documentación oficial del panel de apps.
```

```pista El mensaje no llega
Revisa tres cosas: que el celular esté registrado en **To**, que hayas confirmado el código, y que uses el **Phone Number ID** (no el teléfono) en la URL. Si el error menciona el token, genera uno nuevo.
```

```pista Mi pantalla es distinta
Meta renombra menús con frecuencia. Ubica el concepto: app, cuenta de WhatsApp Business, número de prueba, destinatario, token. La guía oficial de inicio siempre está actualizada.
```

> [!consejo] Reto extra
> Crea el usuario del sistema en **Business Settings**, asígnale tu app y tu cuenta de WhatsApp, genera el token estable y reemplaza el temporal en `.dev.vars`. Revoca el temporal cuando termines.

---
minutos: 50
nivel: intermedio
---
## Objetivo

Conectar tu webhook con Meta, ver llegar un mensaje real de tu celular y practicar la lógica del webhook con tres funciones de JavaScript puro: responder la verificación, resumir un evento y descartar duplicados.

### Cómo se trabaja

La **parte A** es práctica real: túnel o despliegue, registro del webhook en Meta y una prueba desde tu celular. La **parte B** son tres funciones que se comprueban en esta página. Son versiones simplificadas de lo que ya hace `src/worker.js` y `src/whatsapp.js` (sin firma ni red), para que entiendas la lógica. **No pegues tokens reales aquí ni en capturas.**

```pasos
Parte A. Arranca el Worker con `npx wrangler dev` (con tu `.dev.vars` de la lección 12) y prueba la verificación con `curl "http://localhost:8787/webhook?hub.mode=subscribe&hub.verify_token=TU_VERIFY_TOKEN&hub.challenge=12345"`. Debe devolver `12345`.
Parte A. Abre un túnel con `cloudflared tunnel --url http://localhost:8787` (o usa tu Worker desplegado) y copia la URL HTTPS que te da.
Parte A. En el panel de Meta (**WhatsApp > Configuration**) edita el webhook: pega la URL terminada en `/webhook`, tu `VERIFY_TOKEN` y pulsa **Verify and save**.
Parte A. Suscríbete al campo `messages` y escribe `hola` desde tu celular al número de prueba. Anota en `notas.md` qué viste en la terminal: ¿cuántos eventos llegaron y de qué tipo?
Parte B. Escribe `responderVerificacion(query, verifyToken)`: recibe un objeto con las claves `"hub.mode"`, `"hub.verify_token"` y `"hub.challenge"`. Devuelve `{ status: 200, body: <el reto> }` si el modo es `"subscribe"`, el token coincide, `verifyToken` no está vacío y hay reto; si no, `{ status: 403, body: "Prohibido" }`.
Parte B. Escribe `resumirEvento(payload)`: recorre `payload.entry[].changes[].value`. Devuelve un arreglo de textos: `"mensaje de <from>: <texto>"` por cada mensaje de tipo `text`, `"estado <status> de <id>"` por cada estado y `"mensaje de <from>: no soportado (<type>)"` por cada mensaje de otro tipo. Si el payload es inválido o el objeto no es `"whatsapp_business_account"`, devuelve `[]`.
Parte B. Escribe `esDuplicado(vistos, id)`: `vistos` es un `Set`. Si el id ya estaba, devuelve `true`; si no, lo agrega y devuelve `false`.
```

```pista Verificación
Compara con `===` los tres datos y exige que `verifyToken` sea un texto no vacío. Recuerda que el reto se devuelve **tal cual**, sin modificarlo.
```

```pista Resumen del evento
Usa `payload.entry ?? []`, luego `entrada.changes ?? []`, y para cada `value` recorre `value.messages ?? []` y `value.statuses ?? []`. Un arreglo vacío es un buen valor por defecto para todo lo que falte.
```

```pista Duplicados
`Set` tiene `has` y `add`. Primero pregunta si existe; si no, agrégalo antes de devolver `false`.
```

```checks
[
 {"d": "`responderVerificacion` devuelve el reto cuando todo coincide", "h": "Devuelve { status: 200, body: reto } si modo es subscribe y el token coincide.", "t": "var r=responderVerificacion({\"hub.mode\":\"subscribe\",\"hub.verify_token\":\"abc\",\"hub.challenge\":\"1158201444\"},\"abc\");return r.status===200 && r.body===\"1158201444\""},
 {"d": "`responderVerificacion` rechaza token distinto o modo distinto", "h": "Si algo no coincide, devuelve 403 y el texto Prohibido.", "t": "var a=responderVerificacion({\"hub.mode\":\"subscribe\",\"hub.verify_token\":\"x\",\"hub.challenge\":\"1\"},\"abc\");var b=responderVerificacion({\"hub.mode\":\"unsubscribe\",\"hub.verify_token\":\"abc\",\"hub.challenge\":\"1\"},\"abc\");return a.status===403 && a.body===\"Prohibido\" && b.status===403"},
 {"d": "`responderVerificacion` rechaza si no hay token configurado o falta el reto", "h": "Un verifyToken vacío o indefinido nunca debe verificar; tampoco una petición sin hub.challenge.", "t": "var a=responderVerificacion({\"hub.mode\":\"subscribe\",\"hub.verify_token\":\"\",\"hub.challenge\":\"1\"},\"\");var b=responderVerificacion({\"hub.mode\":\"subscribe\",\"hub.verify_token\":\"abc\"},\"abc\");return a.status===403 && b.status===403"},
 {"d": "`resumirEvento` describe un mensaje de texto", "h": "Formato: mensaje de <from>: <texto>.", "t": "var p={object:\"whatsapp_business_account\",entry:[{changes:[{value:{messages:[{from:\"51999000111\",id:\"w1\",type:\"text\",text:{body:\"Quiero 2 leches\"}}]}}]}]};var r=resumirEvento(p);return r.length===1 && r[0]===\"mensaje de 51999000111: Quiero 2 leches\""},
 {"d": "`resumirEvento` describe estados y tipos no soportados", "h": "Estados: estado <status> de <id>. Otros tipos: mensaje de <from>: no soportado (<type>).", "t": "var p={object:\"whatsapp_business_account\",entry:[{changes:[{value:{statuses:[{id:\"w9\",status:\"delivered\"}],messages:[{from:\"51999000111\",id:\"w2\",type:\"image\"}]}}]}]};var r=resumirEvento(p);return r.length===2 && r.includes(\"estado delivered de w9\") && r.includes(\"mensaje de 51999000111: no soportado (image)\")"},
 {"d": "`resumirEvento` devuelve [] ante payloads inválidos", "h": "Revisa que payload exista y que object sea whatsapp_business_account; usa ?? [] para lo que falte.", "t": "return resumirEvento(null).length===0 && resumirEvento({}).length===0 && resumirEvento({object:\"page\",entry:[]}).length===0 && resumirEvento({object:\"whatsapp_business_account\"}).length===0"},
 {"d": "`resumirEvento` recorre varias entradas y cambios", "h": "Necesitas dos bucles anidados: entry y changes.", "t": "var v=function(t){return {value:{messages:[{from:\"1\",id:t,type:\"text\",text:{body:t}}]}}};var p={object:\"whatsapp_business_account\",entry:[{changes:[v(\"a\"),v(\"b\")]},{changes:[v(\"c\")]}]};return resumirEvento(p).length===3"},
 {"d": "`esDuplicado` detecta ids repetidos", "h": "Primera vez: agrega y devuelve false. Segunda vez: devuelve true.", "t": "var s=new Set();return esDuplicado(s,\"w1\")===false && esDuplicado(s,\"w1\")===true && esDuplicado(s,\"w2\")===false && s.size===2"}
]
```

```solucion funciones.js
function responderVerificacion(query, verifyToken) {
  const modo = query["hub.mode"];
  const token = query["hub.verify_token"];
  const reto = query["hub.challenge"];
  if (modo === "subscribe" && verifyToken && token === verifyToken && reto) {
    return { status: 200, body: reto };
  }
  return { status: 403, body: "Prohibido" };
}

function resumirEvento(payload) {
  const lineas = [];
  if (!payload || payload.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) return lineas;
  for (const entrada of payload.entry) {
    for (const cambio of entrada?.changes ?? []) {
      const valor = cambio?.value ?? {};
      for (const msg of valor.messages ?? []) {
        if (msg.type === "text") lineas.push(`mensaje de ${msg.from}: ${msg.text?.body ?? ""}`);
        else lineas.push(`mensaje de ${msg.from}: no soportado (${msg.type})`);
      }
      for (const st of valor.statuses ?? []) {
        lineas.push(`estado ${st.status} de ${st.id}`);
      }
    }
  }
  return lineas;
}

function esDuplicado(vistos, id) {
  if (vistos.has(id)) return true;
  vistos.add(id);
  return false;
}
```

> [!consejo] Reto extra
> Añade a `resumirEvento` el nombre del contacto (`value.contacts[].profile.name`) cuando exista, con el formato `mensaje de Cliente Ejemplo (51999000111): ...`. Compara tu versión con `parsearMensaje` de `src/whatsapp.js`.

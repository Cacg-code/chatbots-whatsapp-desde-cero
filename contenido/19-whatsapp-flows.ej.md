---
minutos: 45
nivel: intermedio
---
## Objetivo

Trabajar con un Flow de «datos de delivery» sin necesitar todavía una cuenta de Meta: validar su JSON, construir el mensaje que lo abre, leer la respuesta del cliente y validar los datos como lo haría el endpoint.

### Cómo se trabaja

La **parte A** es práctica con la documentación y el Flow Builder (necesitas la cuenta de la [lección 12](../12-cuenta-y-app-de-meta/), pero puedes leer el JSON sin ella). La **parte B** son cinco funciones de JavaScript puro que se comprueban en esta página. Un Flow es, al final, un objeto JSON: puedes revisarlo con código.

El Flow del minimarket tiene dos pantallas: `DATOS` (zona, dirección y referencia) y `RESUMEN` (confirmación, pantalla final con `terminal: true`).

```pasos
Parte A. Abre la [guía de Flows](https://developers.facebook.com/docs/whatsapp/flows/gettingstarted) de Meta y localiza la referencia del **Flow JSON**. Anota en `notas.md` cuál es la versión más reciente documentada hoy y qué componentes usarías para pedir zona (lista), dirección (texto) y referencia (texto opcional).
Parte A. Si tienes cuenta de Meta, crea un Flow vacío en el Flow Builder de WhatsApp Manager, pega el JSON de la lección y míralo en la vista previa. Si algo no compila, anota el mensaje de error (Verifica este dato: la interfaz del Builder cambia).
Parte B. Escribe `validarFlow(flow)`: devuelve un arreglo de errores (vacío si todo está bien). Debe detectar: falta `version`, no hay pantallas, ids de pantalla repetidos, una pantalla `terminal` sin `Footer`, y un `navigate` hacia una pantalla que no existe.
Parte B. Escribe `armarMensajeFlow(to, flowId, flowToken, pantalla)`: devuelve el cuerpo JSON de un mensaje interactivo de tipo `flow` con `flow_message_version` `"3"`, `flow_cta` `"Pedir delivery"`, `flow_action` `"navigate"` y la pantalla inicial indicada.
Parte B. Escribe `leerRespuestaFlow(mensaje)`: recibe el mensaje entrante (`type: "interactive"`, `interactive.type: "nfm_reply"`) y devuelve el objeto que viene en `response_json` (que llega como **texto**). Si no es una respuesta de Flow o el JSON está roto, devuelve `null`.
Parte B. Escribe `validarDatosDelivery(datos, zonas)`: devuelve `{ ok: true }` o `{ ok: false, error: "..." }`. Reglas: la zona debe estar en `zonas`; la dirección debe tener al menos 8 caracteres sin contar espacios sobrantes en los extremos.
Parte B. Escribe `formatoRecomendado(campos, necesitaValidarEnServidor)`: devuelve `"botones"` si hay 1 o 2 campos y no hace falta validar nada, `"flow"` si hay 3 o más campos, y `"flow-con-endpoint"` si hay que validar en el servidor (por ejemplo, comprobar que la zona tiene cobertura).
```

```pista Estructura del Flow
Cada pantalla es `{ id, terminal?, layout: { type: "SingleColumnLayout", children: [...] } }`. El `Footer` es un hijo con `on-click-action`; el `navigate` lleva `next: { type: "screen", name: "OTRA" }` y el `complete` termina el Flow.
```

```pista response_json es texto
`mensaje.interactive.nfm_reply.response_json` es un **string**: hay que pasarlo por `JSON.parse`, dentro de un `try/catch`, porque un cliente (o un atacante) puede mandar texto roto.
```

```pista Recorrer los hijos
`flow.screens.flatMap(p => p.layout.children)` junta todos los componentes. Para buscar el `Footer` de una pantalla usa `children.find(c => c.type === "Footer")`.
```

```checks
[
 {"d": "`validarFlow` acepta un Flow correcto de dos pantallas", "h": "Un Flow válido devuelve un arreglo vacío `[]`.", "t": "var f={version:\"5.1\",screens:[{id:\"DATOS\",layout:{type:\"SingleColumnLayout\",children:[{type:\"Footer\",label:\"Continuar\",\"on-click-action\":{name:\"navigate\",next:{type:\"screen\",name:\"RESUMEN\"},payload:{}}}]}},{id:\"RESUMEN\",terminal:true,layout:{type:\"SingleColumnLayout\",children:[{type:\"Footer\",label:\"Enviar\",\"on-click-action\":{name:\"complete\",payload:{}}}]}}]};var r=validarFlow(f);return Array.isArray(r)&&r.length===0"},
 {"d": "`validarFlow` detecta falta de `version` o de pantallas", "h": "Revisa `flow.version` y que `flow.screens` sea un arreglo con elementos.", "t": "return validarFlow({screens:[]}).length>=2 && validarFlow({version:\"5.1\"}).length>=1"},
 {"d": "`validarFlow` detecta un `navigate` hacia una pantalla inexistente", "h": "Junta los ids y verifica que `next.name` esté entre ellos.", "t": "var f={version:\"5.1\",screens:[{id:\"A\",layout:{type:\"SingleColumnLayout\",children:[{type:\"Footer\",label:\"x\",\"on-click-action\":{name:\"navigate\",next:{type:\"screen\",name:\"NO_EXISTE\"},payload:{}}}]}}]};return validarFlow(f).length>=1"},
 {"d": "`armarMensajeFlow` construye el mensaje interactivo de tipo flow", "h": "El cuerpo lleva `messaging_product`, `to`, `type: \"interactive\"` y `interactive.action.parameters`.", "t": "var m=armarMensajeFlow(\"51999000111\",\"123456\",\"tok-1\",\"DATOS\");var a=m.interactive.action;return m.messaging_product===\"whatsapp\" && m.to===\"51999000111\" && m.type===\"interactive\" && m.interactive.type===\"flow\" && a.name===\"flow\" && a.parameters.flow_message_version===\"3\" && a.parameters.flow_id===\"123456\" && a.parameters.flow_token===\"tok-1\" && a.parameters.flow_cta===\"Pedir delivery\" && a.parameters.flow_action===\"navigate\" && a.parameters.flow_action_payload.screen===\"DATOS\""},
 {"d": "`leerRespuestaFlow` convierte `response_json` en objeto", "h": "Usa `JSON.parse(mensaje.interactive.nfm_reply.response_json)`.", "t": "var msg={type:\"interactive\",interactive:{type:\"nfm_reply\",nfm_reply:{name:\"flow\",response_json:\"{\\\"flow_token\\\":\\\"abc\\\",\\\"zona\\\":\\\"Centro\\\",\\\"direccion\\\":\\\"Av. Ejemplo 123\\\"}\"}}};var r=leerRespuestaFlow(msg);return r!==null && r.zona===\"Centro\" && r.direccion===\"Av. Ejemplo 123\" && r.flow_token===\"abc\""},
 {"d": "`leerRespuestaFlow` devuelve `null` si no es Flow o el JSON está roto", "h": "Protege con `try/catch` y revisa que el tipo sea `nfm_reply`.", "t": "var roto={type:\"interactive\",interactive:{type:\"nfm_reply\",nfm_reply:{response_json:\"{no es json\"}}};var boton={type:\"interactive\",interactive:{type:\"button_reply\",button_reply:{id:\"x\",title:\"x\"}}};return leerRespuestaFlow(roto)===null && leerRespuestaFlow(boton)===null && leerRespuestaFlow({type:\"text\",text:{body:\"hola\"}})===null"},
 {"d": "`validarDatosDelivery` rechaza zona desconocida y dirección corta", "h": "Devuelve `{ ok: false, error: \"...\" }` con un mensaje claro para cada caso.", "t": "var z=[\"Centro\"];var a=validarDatosDelivery({zona:\"Luna\",direccion:\"Av. Ejemplo 123\"},z);var b=validarDatosDelivery({zona:\"Centro\",direccion:\"  Av 1  \"},z);return a.ok===false && typeof a.error===\"string\" && a.error.length>0 && b.ok===false && typeof b.error===\"string\""},
 {"d": "`formatoRecomendado` elige entre botones, Flow y Flow con endpoint", "h": "Si hay que validar en servidor, es `flow-con-endpoint` aunque haya pocos campos.", "t": "return formatoRecomendado(2,false)===\"botones\" && formatoRecomendado(1,false)===\"botones\" && formatoRecomendado(3,false)===\"flow\" && formatoRecomendado(6,false)===\"flow\" && formatoRecomendado(3,true)===\"flow-con-endpoint\" && formatoRecomendado(2,true)===\"flow-con-endpoint\""}
]
```

```solucion flows.js
function validarFlow(flow) {
  const errores = [];
  if (!flow || !flow.version) errores.push("Falta version");
  const pantallas = Array.isArray(flow && flow.screens) ? flow.screens : [];
  if (pantallas.length === 0) errores.push("No hay pantallas");
  const ids = pantallas.map((p) => p.id);
  if (new Set(ids).size !== ids.length) errores.push("Hay ids de pantalla repetidos");
  for (const p of pantallas) {
    const hijos = (p.layout && p.layout.children) || [];
    const footer = hijos.find((c) => c.type === "Footer");
    if (p.terminal && !footer) errores.push("La pantalla terminal " + p.id + " no tiene Footer");
    for (const c of hijos) {
      const accion = c["on-click-action"];
      if (accion && accion.name === "navigate") {
        const destino = accion.next && accion.next.name;
        if (!ids.includes(destino)) errores.push("navigate hacia una pantalla inexistente: " + destino);
      }
    }
  }
  return errores;
}

function armarMensajeFlow(to, flowId, flowToken, pantalla) {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "flow",
      body: { text: "Completa tus datos de entrega." },
      action: {
        name: "flow",
        parameters: {
          flow_message_version: "3",
          flow_token: flowToken,
          flow_id: flowId,
          flow_cta: "Pedir delivery",
          flow_action: "navigate",
          flow_action_payload: { screen: pantalla },
        },
      },
    },
  };
}

function leerRespuestaFlow(mensaje) {
  try {
    if (!mensaje || mensaje.type !== "interactive") return null;
    const i = mensaje.interactive;
    if (!i || i.type !== "nfm_reply") return null;
    const datos = JSON.parse(i.nfm_reply.response_json);
    return datos && typeof datos === "object" ? datos : null;
  } catch (e) {
    return null;
  }
}

function validarDatosDelivery(datos, zonas) {
  if (!zonas.includes(datos.zona)) return { ok: false, error: "Esa zona no tiene reparto." };
  const direccion = String(datos.direccion || "").trim();
  if (direccion.length < 8) return { ok: false, error: "La direccion es muy corta." };
  return { ok: true };
}

function formatoRecomendado(campos, necesitaValidarEnServidor) {
  if (necesitaValidarEnServidor) return "flow-con-endpoint";
  return campos >= 3 ? "flow" : "botones";
}
```

> [!consejo] Reto extra
> Añade a `validarFlow` la comprobación de que **todo** `name` de los campos de entrada (`TextInput`, `Dropdown`, ...) sea único dentro de su pantalla. Dos campos con el mismo `name` se pisan al enviar el formulario.

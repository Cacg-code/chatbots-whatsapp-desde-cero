var Bot = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // scripts/simulador-entrada.js
  var simulador_entrada_exports = {};
  __export(simulador_entrada_exports, {
    ESTADOS: () => ESTADOS,
    NEGOCIO: () => NEGOCIO,
    PRODUCTOS: () => PRODUCTOS,
    crearSesion: () => crearSesion,
    procesar: () => procesar
  });

  // codigo/src/catalogo.js
  var NEGOCIO = {
    nombre: "Minimarket La Esquina",
    horario: "Lunes a s\xE1bado de 8:00 a 21:00. Domingos de 9:00 a 14:00.",
    direccion: "Av. Los Olivos 123, Distrito Ejemplo (direcci\xF3n ficticia)",
    costoDelivery: 3,
    // soles
    minimoDelivery: 25,
    // soles de productos para poder pedir delivery
    zonas: ["Urb. Los Olivos", "Urb. Las Palmeras", "Centro"],
    yape: "51999000111",
    // número de ejemplo
    cuentaTransferencia: "Cuenta de ejemplo 000-000000000-0-00 a nombre de La Esquina SAC"
  };
  var PRODUCTOS = [
    // abarrotes
    { id: "arroz", nombre: "Arroz extra 1 kg", precio: 4.2, categoria: "abarrotes", unidad: "bolsa", sinonimos: ["arroz"] },
    { id: "azucar", nombre: "Az\xFAcar rubia 1 kg", precio: 3.9, categoria: "abarrotes", unidad: "bolsa", sinonimos: ["azucar", "azucar rubia"] },
    { id: "aceite", nombre: "Aceite vegetal 1 L", precio: 9.5, categoria: "abarrotes", unidad: "botella", sinonimos: ["aceite"] },
    { id: "fideos", nombre: "Fideos spaghetti 500 g", precio: 3.1, categoria: "abarrotes", unidad: "bolsa", sinonimos: ["fideos", "spaghetti", "tallarin", "tallarines"] },
    { id: "atun", nombre: "At\xFAn en lata", precio: 5.5, categoria: "abarrotes", unidad: "lata", sinonimos: ["atun", "conserva de atun"] },
    { id: "lentejas", nombre: "Lentejas 500 g", precio: 4.8, categoria: "abarrotes", unidad: "bolsa", sinonimos: ["lentejas", "menestra"] },
    { id: "sal", nombre: "Sal de mesa 1 kg", precio: 1.5, categoria: "abarrotes", unidad: "bolsa", sinonimos: ["sal"] },
    { id: "avena", nombre: "Avena en hojuelas", precio: 2.8, categoria: "abarrotes", unidad: "bolsa", sinonimos: ["avena", "hojuelas de avena"] },
    { id: "huevo", nombre: "Huevo", precio: 0.6, categoria: "abarrotes", unidad: "unidad", sinonimos: ["huevo", "huevos"] },
    // bebidas
    { id: "gaseosa-cola", nombre: "Gaseosa cola 1.5 L", precio: 7.5, categoria: "bebidas", unidad: "botella", sinonimos: ["gaseosa", "gaseosa cola", "cola"] },
    { id: "gaseosa-naranja", nombre: "Gaseosa naranja 1.5 L", precio: 7.5, categoria: "bebidas", unidad: "botella", sinonimos: ["gaseosa", "gaseosa naranja", "naranja"] },
    { id: "agua", nombre: "Agua sin gas 625 ml", precio: 1.5, categoria: "bebidas", unidad: "botella", sinonimos: ["agua", "agua sin gas", "agua mineral"] },
    { id: "agua-gas", nombre: "Agua con gas 625 ml", precio: 1.8, categoria: "bebidas", unidad: "botella", sinonimos: ["agua con gas"] },
    { id: "jugo", nombre: "Jugo de durazno 1 L", precio: 4.5, categoria: "bebidas", unidad: "caja", sinonimos: ["jugo", "nectar", "jugo de durazno"] },
    { id: "chicha", nombre: "Chicha morada 1 L", precio: 5, categoria: "bebidas", unidad: "botella", sinonimos: ["chicha", "chicha morada"] },
    // lácteos
    { id: "leche", nombre: "Leche entera 1 L", precio: 4.3, categoria: "lacteos", unidad: "caja", sinonimos: ["leche", "leche entera"] },
    { id: "leche-light", nombre: "Leche descremada 1 L", precio: 4.5, categoria: "lacteos", unidad: "caja", sinonimos: ["leche descremada", "leche light"] },
    { id: "yogurt", nombre: "Yogurt de fresa 1 L", precio: 6.9, categoria: "lacteos", unidad: "botella", sinonimos: ["yogurt", "yogur"] },
    { id: "queso", nombre: "Queso fresco 250 g", precio: 7.5, categoria: "lacteos", unidad: "paquete", sinonimos: ["queso", "queso fresco"] },
    { id: "mantequilla", nombre: "Mantequilla 200 g", precio: 6.2, categoria: "lacteos", unidad: "barra", sinonimos: ["mantequilla"] },
    // panadería
    { id: "pan", nombre: "Pan franc\xE9s", precio: 0.3, categoria: "panaderia", unidad: "unidad", sinonimos: ["pan", "pan frances"] },
    { id: "pan-molde", nombre: "Pan de molde familiar", precio: 7.9, categoria: "panaderia", unidad: "bolsa", sinonimos: ["pan de molde", "pan molde"] },
    { id: "galletas", nombre: "Galletas de soda", precio: 1.2, categoria: "panaderia", unidad: "paquete", sinonimos: ["galletas", "galleta", "galletas de soda"] },
    // limpieza
    { id: "detergente", nombre: "Detergente 1 kg", precio: 8.9, categoria: "limpieza", unidad: "bolsa", sinonimos: ["detergente", "detergente de ropa"] },
    { id: "lavavajillas", nombre: "Lavavajillas 500 ml", precio: 5.6, categoria: "limpieza", unidad: "botella", sinonimos: ["lavavajillas", "lavavajilla", "detergente de platos"] },
    { id: "papel", nombre: "Papel higi\xE9nico x4", precio: 6.5, categoria: "limpieza", unidad: "paquete", sinonimos: ["papel higienico", "papel"] },
    { id: "lejia", nombre: "Lej\xEDa 1 L", precio: 3.5, categoria: "limpieza", unidad: "botella", sinonimos: ["lejia", "cloro"] },
    { id: "esponja", nombre: "Esponja de cocina", precio: 1.8, categoria: "limpieza", unidad: "unidad", sinonimos: ["esponja", "esponjas"] },
    { id: "jabon", nombre: "Jab\xF3n de tocador", precio: 2.5, categoria: "limpieza", unidad: "unidad", sinonimos: ["jabon"] },
    // snacks
    { id: "papas", nombre: "Papas fritas 100 g", precio: 2.5, categoria: "snacks", unidad: "bolsa", sinonimos: ["papas fritas", "papitas", "snack"] },
    { id: "chocolate", nombre: "Chocolate de leche", precio: 2, categoria: "snacks", unidad: "barra", sinonimos: ["chocolate", "chocolatina"] }
  ];
  var CATEGORIAS = {
    abarrotes: "Abarrotes",
    bebidas: "Bebidas",
    lacteos: "L\xE1cteos",
    panaderia: "Panader\xEDa",
    limpieza: "Limpieza",
    snacks: "Snacks"
  };
  function productoPorId(id) {
    return PRODUCTOS.find((p) => p.id === id) ?? null;
  }
  function productosDeCategoria(categoria) {
    return PRODUCTOS.filter((p) => p.categoria === categoria);
  }

  // codigo/src/carrito.js
  var aCentimos = (soles) => Math.round(soles * 100);
  var aSoles = (centimos) => centimos / 100;
  function agregar(carrito, producto, cantidad = 1) {
    const existe = carrito.some((l) => l.id === producto.id);
    if (existe) {
      return carrito.map((l) => l.id === producto.id ? { ...l, cantidad: l.cantidad + cantidad } : l);
    }
    return [...carrito, { id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad }];
  }
  function quitar(carrito, productoId) {
    return carrito.filter((l) => l.id !== productoId);
  }
  function total(carrito) {
    const centimos = carrito.reduce((suma, l) => suma + aCentimos(l.precio) * l.cantidad, 0);
    return aSoles(centimos);
  }
  function cantidadItems(carrito) {
    return carrito.reduce((suma, l) => suma + l.cantidad, 0);
  }
  function formatoSoles(monto) {
    return `S/ ${monto.toFixed(2)}`;
  }
  function resumen(carrito) {
    if (carrito.length === 0) return "Tu carrito est\xE1 vac\xEDo.";
    const lineas = carrito.map((l) => {
      const subtotal = aSoles(aCentimos(l.precio) * l.cantidad);
      return `- ${l.cantidad} x ${l.nombre}: ${formatoSoles(subtotal)}`;
    });
    return `${lineas.join("\n")}
Subtotal: ${formatoSoles(total(carrito))}`;
  }

  // codigo/src/mensajes.js
  var mensajes = {
    bienvenida: () => `Hola, bienvenido a ${NEGOCIO.nombre}. Soy el asistente virtual y puedo tomar tu pedido.
Puedes escribir lo que necesitas, por ejemplo: "quiero 2 leches y media docena de huevos".`,
    menu: () => "\xBFQu\xE9 deseas hacer?",
    horario: () => `${NEGOCIO.nombre}
Horario: ${NEGOCIO.horario}
Direcci\xF3n: ${NEGOCIO.direccion}
Delivery a: ${NEGOCIO.zonas.join(", ")}.`,
    ayuda: () => 'Puedes escribir cosas como:\n- "quiero 2 leches y 1 arroz"\n- "catalogo" para ver los productos\n- "carrito" para ver lo que llevas\n- "cancelar" para empezar de nuevo\n- "hablar con una persona" para que te atienda alguien',
    elegirCategoria: () => 'Elige una categor\xEDa o escribe directamente lo que necesitas, por ejemplo: "2 leches".',
    elegirProducto: (categoria) => `${categoria}: elige un producto de la lista.`,
    preguntarCantidad: (producto) => `${producto.nombre} cuesta ${formatoSoles(producto.precio)} por ${producto.unidad}. \xBFCu\xE1ntas quieres? Toca un bot\xF3n o escribe el n\xFAmero.`,
    cantidadInvalida: (max) => `Escribe una cantidad entre 1 y ${max}.`,
    cantidadExcedida: (max) => `Por pedido solo puedo anotar hasta ${max} unidades de cada producto.`,
    agregado: (lineas, cantidadTotal, subtotal) => `${lineas.join("\n")}
Llevas ${cantidadTotal} producto(s). Subtotal: ${formatoSoles(subtotal)}.`,
    quitado: (nombres) => `Quit\xE9 del carrito: ${nombres.join(", ")}.`,
    nadaQuitar: () => "No encontr\xE9 ese producto en tu carrito.",
    elegirEntreVarios: () => "Encontr\xE9 varios productos parecidos. \xBFCu\xE1l quieres?",
    carritoVacio: () => "Tu carrito est\xE1 vac\xEDo. Escribe lo que necesitas o elige del cat\xE1logo.",
    carrito: (resumenTexto) => `Esto llevas:
${resumenTexto}`,
    carritoVaciado: () => "Listo, vaci\xE9 tu carrito.",
    tipoEntrega: (subtotal) => `Tu subtotal es ${formatoSoles(subtotal)}. \xBFC\xF3mo quieres recibir tu pedido?
- Recojo en tienda: sin costo.
- Delivery: ${formatoSoles(NEGOCIO.costoDelivery)} (pedido m\xEDnimo ${formatoSoles(NEGOCIO.minimoDelivery)}).`,
    bajoElMinimo: (subtotal) => `Para delivery el pedido m\xEDnimo es ${formatoSoles(NEGOCIO.minimoDelivery)} y llevas ${formatoSoles(subtotal)}. Te faltan ${formatoSoles(NEGOCIO.minimoDelivery - subtotal)}. Puedes agregar m\xE1s productos o elegir recojo en tienda.`,
    pedirDireccion: () => `Escribe tu direcci\xF3n de entrega (calle, n\xFAmero y referencia). Atendemos: ${NEGOCIO.zonas.join(", ")}.`,
    direccionInvalida: () => "Esa direcci\xF3n parece muy corta. Escr\xEDbela completa, con calle y n\xFAmero (m\xEDnimo 8 caracteres).",
    pedirPago: () => "\xBFC\xF3mo vas a pagar?",
    confirmar: (resumenTexto, entrega, direccion, pago, costoEntrega2, totalPedido2) => `Revisa tu pedido:
${resumenTexto}
` + (entrega === "delivery" ? `Delivery a: ${direccion} (${formatoSoles(costoEntrega2)})
` : `Recojo en tienda: ${NEGOCIO.direccion}
`) + `Pago: ${pago}
Total a pagar: ${formatoSoles(totalPedido2)}`,
    pedidoRecibido: (pedido) => `Pedido ${pedido.id} recibido. Total: ${formatoSoles(pedido.total)}.
` + (pedido.entrega === "delivery" ? "Lo llevaremos a tu direcci\xF3n en unos 40 minutos." : "Estar\xE1 listo para recoger en unos 15 minutos.") + "\n" + instruccionesPago(pedido) + "\nGracias por comprar en " + NEGOCIO.nombre + ".",
    cancelado: () => 'Cancel\xE9 tu pedido. Cuando quieras empezar de nuevo, escribe "hola".',
    esperandoHumano: () => 'Listo, avis\xE9 a una persona del equipo. Te responder\xE1 en este chat lo antes posible. Para volver al asistente escribe "menu".',
    noSoportado: () => "Por ahora solo entiendo texto y botones. Escr\xEDbeme lo que necesitas.",
    noEntendi: () => 'No te entend\xED bien. Puedes escribir, por ejemplo, "2 leches", o usar los botones.',
    noEntendiDeNuevo: () => "Sigo sin entenderte. \xBFQuieres que te atienda una persona?",
    opcionNoDisponible: () => "Esa opci\xF3n ya no est\xE1 disponible en este paso."
  };
  function instruccionesPago(pedido) {
    if (pedido.pago === "yape") return `Yape: env\xEDa ${formatoSoles(pedido.total)} al ${NEGOCIO.yape} y av\xEDsanos por este chat.`;
    if (pedido.pago === "transferencia") return `Transferencia: ${NEGOCIO.cuentaTransferencia}. Av\xEDsanos por este chat al pagar.`;
    return "Pagas en efectivo al recibir tu pedido.";
  }

  // codigo/src/texto.js
  function normalizar(texto2) {
    if (typeof texto2 !== "string") return "";
    return texto2.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  }
  var NUMEROS_EN_PALABRAS = {
    un: 1,
    uno: 1,
    una: 1,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
    diez: 10,
    once: 11,
    doce: 12,
    trece: 13,
    catorce: 14,
    quince: 15,
    veinte: 20
  };
  function extraerCantidad(texto2) {
    const t = normalizar(texto2);
    if (/\bmedia docena\b/.test(t)) return 6;
    let n = null;
    for (const palabra of t.split(" ")) {
      if (/^\d+$/.test(palabra)) {
        n = Number(palabra);
        break;
      }
      if (palabra in NUMEROS_EN_PALABRAS) {
        n = NUMEROS_EN_PALABRAS[palabra];
        break;
      }
    }
    if (/\bdocenas?\b/.test(t)) return (n ?? 1) * 12;
    return n ?? 1;
  }
  function cantidadSola(texto2) {
    const t = normalizar(texto2);
    if (/^\d+$/.test(t)) return Number(t);
    if (t in NUMEROS_EN_PALABRAS) return NUMEROS_EN_PALABRAS[t];
    return null;
  }
  var RELLENO = /* @__PURE__ */ new Set([
    "quiero",
    "quisiera",
    "dame",
    "deme",
    "necesito",
    "agrega",
    "agregar",
    "anade",
    "anadir",
    "pon",
    "ponme",
    "de",
    "del",
    "el",
    "la",
    "los",
    "las",
    "un",
    "una",
    "uno",
    "unos",
    "unas",
    "por",
    "favor",
    "me",
    "mas",
    "y",
    "al",
    "otro",
    "otra",
    "hola"
  ]);
  function levenshtein(a, b) {
    const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      let anterior = fila[0];
      fila[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const guardado = fila[j];
        const costo = a[i - 1] === b[j - 1] ? 0 : 1;
        fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, anterior + costo);
        anterior = guardado;
      }
    }
    return fila[b.length];
  }
  function palabrasUtiles(texto2) {
    return normalizar(texto2).split(" ").filter((p) => p && !RELLENO.has(p));
  }
  function mismaPalabra(escrita, deCatalogo) {
    if (escrita === deCatalogo) return true;
    if (escrita === deCatalogo + "s" || escrita === deCatalogo + "es") return true;
    if (deCatalogo.endsWith("z") && escrita === deCatalogo.slice(0, -1) + "ces") return true;
    return escrita.length >= 5 && deCatalogo.length >= 5 && levenshtein(escrita, deCatalogo) <= 1;
  }
  function puntajeFrase(palabrasEscritas, frase) {
    const palabras = palabrasUtiles(frase);
    if (palabras.length === 0) return 0;
    const libres = [...palabrasEscritas];
    for (const palabra of palabras) {
      const i = libres.findIndex((e) => mismaPalabra(e, palabra));
      if (i === -1) return 0;
      libres.splice(i, 1);
    }
    return palabras.length;
  }
  function buscarProductos(texto2, productos) {
    const escritas = palabrasUtiles(texto2);
    let mejor = 0;
    let ganadores = [];
    for (const producto of productos) {
      const puntaje = Math.max(0, ...producto.sinonimos.map((s) => puntajeFrase(escritas, s)));
      if (puntaje === 0) continue;
      if (puntaje > mejor) {
        mejor = puntaje;
        ganadores = [producto];
      } else if (puntaje === mejor) ganadores.push(producto);
    }
    return ganadores;
  }
  function separarPedidos(texto2, productos) {
    return String(texto2).split(/,|\+|\s+y\s+|\s+e\s+/i).map((trozo) => ({ cantidad: extraerCantidad(trozo), productos: buscarProductos(trozo, productos) })).filter((p) => p.productos.length > 0);
  }
  var FRASES = {
    cancelar: ["cancelar", "cancela", "cancelo", "anular", "anula", "salir", "olvidalo", "ya no quiero", "no quiero nada"],
    humano: ["persona", "humano", "asesor", "agente", "encargado", "operador", "dueno", "atencion al cliente", "hablar con alguien"],
    horario: ["horario", "horarios", "a que hora", "abren", "cierran", "atienden", "direccion", "ubicacion", "donde estan"],
    carrito: ["carrito", "mi pedido", "ver pedido", "que llevo", "cuanto es", "mi cuenta"],
    catalogo: ["catalogo", "productos", "precios", "que venden", "que tienen", "que hay", "hacer pedido", "hacer un pedido", "pedir", "comprar"],
    menu: ["menu", "opciones", "inicio", "empezar"],
    ayuda: ["ayuda", "ayudame", "help", "como funciona", "no entiendo"],
    // "confirmar" y "saludo" solo valen en mensajes cortos: "si quiero 2 leches" NO es una confirmación.
    confirmar: ["confirmar", "confirmo", "confirmado", "si", "ok", "dale", "listo", "acepto", "correcto", "finalizar", "terminar", "eso es todo", "nada mas"],
    saludo: ["hola", "holaa", "buenas", "buenos dias", "buenas tardes", "buenas noches", "hey", "hi", "ola"]
  };
  var SOLO_CORTOS = /* @__PURE__ */ new Set(["confirmar", "saludo"]);
  var ORDEN = ["cancelar", "humano", "horario", "carrito", "catalogo", "menu", "ayuda", "confirmar", "saludo"];
  function contiene(textoNormalizado, frase) {
    return ` ${textoNormalizado} `.includes(` ${frase} `);
  }
  function detectarIntencion(texto2) {
    const t = normalizar(texto2);
    if (!t) return "desconocida";
    const cantidadPalabras = t.split(" ").length;
    for (const intencion of ORDEN) {
      if (SOLO_CORTOS.has(intencion) && cantidadPalabras > 4) continue;
      if (FRASES[intencion].some((frase) => contiene(t, frase))) return intencion;
    }
    return "desconocida";
  }
  function mencionaAlguna(texto2, frases) {
    const t = normalizar(texto2);
    return frases.some((f) => contiene(t, f));
  }

  // codigo/src/motor.js
  var ESTADOS = {
    INICIO: "INICIO",
    MENU: "MENU",
    ELIGIENDO: "ELIGIENDO",
    CARRITO: "CARRITO",
    TIPO_ENTREGA: "TIPO_ENTREGA",
    DIRECCION: "DIRECCION",
    PAGO: "PAGO",
    CONFIRMAR: "CONFIRMAR",
    FIN: "FIN",
    ESPERANDO_HUMANO: "ESPERANDO_HUMANO"
  };
  var E = ESTADOS;
  var MAX_POR_PRODUCTO = 20;
  var MIN_DIRECCION = 8;
  var texto = (t) => ({ tipo: "texto", texto: t });
  var botones = (t, lista2) => ({ tipo: "botones", texto: t, botones: lista2 });
  var lista = (t, boton, secciones) => ({ tipo: "lista", texto: t, boton, secciones });
  var recortar = (s, max) => s.length <= max ? s : s.slice(0, max - 1) + ".";
  function crearSesion(telefono, ahora = Date.now()) {
    return {
      telefono,
      estado: E.INICIO,
      carrito: [],
      entrega: null,
      // 'recojo' | 'delivery'
      direccion: null,
      pago: null,
      // 'efectivo' | 'yape' | 'transferencia'
      fallos: 0,
      // mensajes seguidos que no entendimos
      productoPendiente: null,
      // producto elegido, falta la cantidad
      cantidadPendiente: null,
      // cantidad pedida, falta elegir cuál producto
      pedidoNuevo: null,
      // lo llena el motor al confirmar; la capa de E/S lo guarda
      derivadoHumano: false,
      recordatorioEnviado: false,
      creadoEn: ahora,
      ultimoMensajeCliente: ahora,
      actualizadoEn: ahora
    };
  }
  function procesar(sesionPrevia, entrada, ahora = Date.now()) {
    const sesion = structuredClone(sesionPrevia);
    sesion.pedidoNuevo = null;
    sesion.ultimoMensajeCliente = ahora;
    sesion.actualizadoEn = ahora;
    sesion.recordatorioEnviado = false;
    if (sesion.estado === E.FIN) Object.assign(sesion, crearSesion(sesion.telefono, ahora));
    if (entrada.tipo === "no_soportado") {
      return { sesion, respuestas: sesion.derivadoHumano ? [] : [texto(mensajes.noSoportado())] };
    }
    const accion = entrada.tipo === "interactivo" ? accionDeId(entrada.id) : accionDeTexto(sesion, entrada.texto);
    const quiereSalir = accion.tipo === "cancelar" || accion.tipo === "menu" && !accion.saludo;
    if (sesion.estado === E.ESPERANDO_HUMANO && !quiereSalir) {
      return { sesion, respuestas: [] };
    }
    const respuestas = ejecutar(sesion, accion);
    return { sesion, respuestas };
  }
  function accionDeId(id) {
    const [clave, valor] = String(id).split(":");
    const simples = {
      menu_pedir: "pedir",
      seguir: "pedir",
      menu_menu: "menu",
      menu_horario: "horario",
      menu_humano: "humano",
      ver_carrito: "carrito",
      cerrar: "cerrar",
      vaciar: "vaciar",
      pedido_confirmar: "confirmarPedido",
      pedido_editar: "editar",
      pedido_cancelar: "cancelar"
    };
    if (simples[clave]) return { tipo: simples[clave] };
    if (clave === "cat" && CATEGORIAS[valor]) return { tipo: "categoria", categoria: valor };
    if (clave === "prod" && productoPorId(valor)) return { tipo: "producto", id: valor };
    if (clave === "cant" && Number.isInteger(Number(valor))) return { tipo: "cantidad", cantidad: Number(valor) };
    if (clave === "entrega" && ["recojo", "delivery"].includes(valor)) return { tipo: "entrega", entrega: valor };
    if (clave === "pago" && ["efectivo", "yape", "transferencia"].includes(valor)) return { tipo: "pago", pago: valor };
    return { tipo: "desconocida" };
  }
  function accionDeTexto(sesion, textoCliente) {
    const t = normalizar(textoCliente);
    if (!t) return { tipo: "desconocida" };
    const intencion = detectarIntencion(textoCliente);
    if (intencion === "cancelar" || intencion === "humano") return { tipo: intencion };
    if (sesion.estado === E.DIRECCION) return { tipo: "direccion", texto: textoCliente.trim() };
    if (sesion.estado === E.TIPO_ENTREGA) {
      if (mencionaAlguna(t, ["delivery", "domicilio", "envio", "enviar"])) return { tipo: "entrega", entrega: "delivery" };
      if (mencionaAlguna(t, ["recojo", "recoger", "recojer", "tienda"])) return { tipo: "entrega", entrega: "recojo" };
    }
    if (sesion.estado === E.PAGO) {
      if (mencionaAlguna(t, ["efectivo"])) return { tipo: "pago", pago: "efectivo" };
      if (mencionaAlguna(t, ["yape"])) return { tipo: "pago", pago: "yape" };
      if (mencionaAlguna(t, ["transferencia", "transfer", "deposito"])) return { tipo: "pago", pago: "transferencia" };
    }
    if (sesion.estado === E.ELIGIENDO && sesion.productoPendiente) {
      const n = cantidadSola(textoCliente);
      if (n !== null) return { tipo: "cantidad", cantidad: n };
    }
    if (sesion.estado === E.CONFIRMAR && mencionaAlguna(t, ["no", "cambiar", "modificar"])) return { tipo: "editar" };
    if (/^(quita|quitar|saca|sacar|elimina|eliminar|borra|borrar)\b/.test(t)) {
      return { tipo: "quitar", productos: buscarProductos(t, PRODUCTOS) };
    }
    const pedidos = separarPedidos(textoCliente, PRODUCTOS);
    if (pedidos.length > 0) return { tipo: "agregarTexto", pedidos };
    switch (intencion) {
      case "saludo":
      case "menu":
        return { tipo: "menu", saludo: intencion === "saludo" };
      case "catalogo":
        return { tipo: "pedir" };
      case "carrito":
        return { tipo: "carrito" };
      case "confirmar":
        return { tipo: sesion.estado === E.CONFIRMAR ? "confirmarPedido" : "cerrar" };
      case "ayuda":
        return { tipo: "ayuda" };
      case "horario":
        return { tipo: "horario" };
      default:
        return { tipo: "desconocida" };
    }
  }
  var SOLO_EN = {
    entrega: E.TIPO_ENTREGA,
    pago: E.PAGO,
    confirmarPedido: E.CONFIRMAR
  };
  function ejecutar(sesion, accion) {
    if (accion.tipo !== "desconocida") sesion.fallos = 0;
    if (SOLO_EN[accion.tipo] && sesion.estado !== SOLO_EN[accion.tipo]) {
      return [texto(mensajes.opcionNoDisponible()), ...repetirPaso(sesion)];
    }
    if (accion.tipo === "cantidad" && !sesion.productoPendiente) {
      return [texto(mensajes.opcionNoDisponible()), ...repetirPaso(sesion)];
    }
    switch (accion.tipo) {
      case "menu":
        return mostrarMenu(sesion, accion.saludo || sesion.estado === E.INICIO);
      case "pedir":
        return mostrarCategorias(sesion);
      case "categoria":
        return mostrarProductos(sesion, accion.categoria);
      case "producto":
        return elegirProducto(sesion, productoPorId(accion.id));
      case "cantidad":
        return cantidadElegida(sesion, accion.cantidad);
      case "agregarTexto":
        return agregarDesdeTexto(sesion, accion.pedidos);
      case "quitar":
        return quitarDelCarrito(sesion, accion.productos);
      case "carrito":
        return mostrarCarrito(sesion);
      case "vaciar":
        sesion.carrito = [];
        return [texto(mensajes.carritoVaciado()), ...mostrarCategorias(sesion)];
      case "cerrar":
        return cerrarCarrito(sesion);
      case "entrega":
        return elegirEntrega(sesion, accion.entrega);
      case "direccion":
        return recibirDireccion(sesion, accion.texto);
      case "pago":
        return elegirPago(sesion, accion.pago);
      case "editar":
        return mostrarCarrito(sesion);
      case "confirmarPedido":
        return confirmarPedido(sesion);
      case "horario":
        return [texto(mensajes.horario())];
      case "ayuda":
        return [texto(mensajes.ayuda())];
      case "humano":
        sesion.estado = E.ESPERANDO_HUMANO;
        sesion.derivadoHumano = true;
        return [texto(mensajes.esperandoHumano())];
      case "cancelar":
        Object.assign(sesion, { ...crearSesion(sesion.telefono, sesion.actualizadoEn), estado: E.FIN, creadoEn: sesion.creadoEn });
        return [texto(mensajes.cancelado())];
      default:
        return noEntendido(sesion);
    }
  }
  function noEntendido(sesion) {
    if (sesion.estado === E.INICIO) return mostrarMenu(sesion, true);
    sesion.fallos += 1;
    if (sesion.fallos >= 2) {
      return [botones(mensajes.noEntendiDeNuevo(), [
        { id: "menu_humano", titulo: "Hablar con alguien" },
        { id: "menu_menu", titulo: "Ver el men\xFA" }
      ])];
    }
    return [texto(mensajes.noEntendi()), ...repetirPaso(sesion)];
  }
  function mostrarMenu(sesion, conBienvenida) {
    sesion.estado = E.MENU;
    sesion.productoPendiente = null;
    sesion.cantidadPendiente = null;
    sesion.derivadoHumano = false;
    const menu = botones(mensajes.menu(), [
      { id: "menu_pedir", titulo: "Hacer pedido" },
      { id: "menu_horario", titulo: "Horario y ubicaci\xF3n" },
      { id: "menu_humano", titulo: "Hablar con alguien" }
    ]);
    return conBienvenida ? [texto(mensajes.bienvenida()), menu] : [menu];
  }
  function mostrarCategorias(sesion) {
    sesion.estado = E.ELIGIENDO;
    sesion.productoPendiente = null;
    sesion.cantidadPendiente = null;
    const filas = Object.entries(CATEGORIAS).map(([id, nombre]) => ({
      id: `cat:${id}`,
      titulo: nombre,
      descripcion: `${productosDeCategoria(id).length} productos`
    }));
    return [lista(mensajes.elegirCategoria(), "Ver categor\xEDas", [{ titulo: "Categor\xEDas", filas }])];
  }
  function mostrarProductos(sesion, categoria) {
    sesion.cantidadPendiente = null;
    sesion.estado = E.ELIGIENDO;
    const filas = productosDeCategoria(categoria).slice(0, 10).map(filaDeProducto);
    return [lista(mensajes.elegirProducto(CATEGORIAS[categoria]), "Ver productos", [{ titulo: CATEGORIAS[categoria], filas }])];
  }
  function filaDeProducto(p) {
    return {
      id: `prod:${p.id}`,
      titulo: recortar(p.nombre, 24),
      descripcion: recortar(`${formatoSoles(p.precio)} por ${p.unidad}`, 72)
    };
  }
  function elegirProducto(sesion, producto) {
    sesion.estado = E.ELIGIENDO;
    if (sesion.cantidadPendiente) {
      const cantidad = sesion.cantidadPendiente;
      sesion.cantidadPendiente = null;
      return cantidadConProducto(sesion, producto, cantidad);
    }
    sesion.productoPendiente = producto.id;
    return [botones(mensajes.preguntarCantidad(producto), [
      { id: "cant:1", titulo: "1" },
      { id: "cant:2", titulo: "2" },
      { id: "cant:3", titulo: "3" }
    ])];
  }
  function cantidadElegida(sesion, cantidad) {
    const producto = productoPorId(sesion.productoPendiente);
    return cantidadConProducto(sesion, producto, cantidad);
  }
  function cantidadConProducto(sesion, producto, cantidad) {
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      sesion.productoPendiente = producto.id;
      return [texto(mensajes.cantidadInvalida(MAX_POR_PRODUCTO))];
    }
    const yaTiene = sesion.carrito.find((l) => l.id === producto.id)?.cantidad ?? 0;
    if (yaTiene + cantidad > MAX_POR_PRODUCTO) {
      sesion.productoPendiente = null;
      return [texto(mensajes.cantidadExcedida(MAX_POR_PRODUCTO))];
    }
    sesion.carrito = agregar(sesion.carrito, producto, cantidad);
    sesion.productoPendiente = null;
    return [avisoAgregado(sesion, [`Agregu\xE9 ${cantidad} x ${producto.nombre}.`])];
  }
  function avisoAgregado(sesion, lineas) {
    sesion.estado = E.ELIGIENDO;
    return botones(
      mensajes.agregado(lineas, cantidadItems(sesion.carrito), total(sesion.carrito)),
      [
        { id: "seguir", titulo: "Seguir comprando" },
        { id: "ver_carrito", titulo: "Ver carrito" },
        { id: "cerrar", titulo: "Finalizar pedido" }
      ]
    );
  }
  function agregarDesdeTexto(sesion, pedidos) {
    const lineas = [];
    sesion.cantidadPendiente = null;
    let ambiguo = null;
    for (const { cantidad, productos } of pedidos) {
      if (productos.length > 1) {
        ambiguo ?? (ambiguo = { cantidad, productos });
        continue;
      }
      const producto = productos[0];
      const yaTiene = sesion.carrito.find((l) => l.id === producto.id)?.cantidad ?? 0;
      if (cantidad < 1 || yaTiene + cantidad > MAX_POR_PRODUCTO) {
        lineas.push(`No pude agregar ${producto.nombre}: ${mensajes.cantidadExcedida(MAX_POR_PRODUCTO)}`);
        continue;
      }
      sesion.carrito = agregar(sesion.carrito, producto, cantidad);
      lineas.push(`Agregu\xE9 ${cantidad} x ${producto.nombre}.`);
    }
    const respuestas = [];
    if (lineas.length > 0) respuestas.push(avisoAgregado(sesion, lineas));
    if (ambiguo) {
      sesion.estado = E.ELIGIENDO;
      sesion.cantidadPendiente = ambiguo.cantidad;
      const filas = ambiguo.productos.slice(0, 10).map(filaDeProducto);
      respuestas.push(lista(mensajes.elegirEntreVarios(), "Elegir", [{ titulo: "Opciones", filas }]));
    }
    return respuestas;
  }
  function quitarDelCarrito(sesion, productos) {
    const enCarrito = productos.filter((p) => sesion.carrito.some((l) => l.id === p.id));
    if (enCarrito.length === 0) return [texto(mensajes.nadaQuitar())];
    for (const p of enCarrito) sesion.carrito = quitar(sesion.carrito, p.id);
    return [texto(mensajes.quitado(enCarrito.map((p) => p.nombre))), ...mostrarCarrito(sesion)];
  }
  function mostrarCarrito(sesion) {
    if (sesion.carrito.length === 0) {
      return [texto(mensajes.carritoVacio()), ...mostrarCategorias(sesion)];
    }
    sesion.estado = E.CARRITO;
    return [botones(mensajes.carrito(resumen(sesion.carrito)), [
      { id: "cerrar", titulo: "Continuar" },
      { id: "seguir", titulo: "Seguir comprando" },
      { id: "vaciar", titulo: "Vaciar carrito" }
    ])];
  }
  function cerrarCarrito(sesion) {
    if ([E.TIPO_ENTREGA, E.PAGO, E.DIRECCION].includes(sesion.estado)) return repetirPaso(sesion);
    if (sesion.carrito.length === 0) return [texto(mensajes.carritoVacio()), ...mostrarCategorias(sesion)];
    sesion.estado = E.TIPO_ENTREGA;
    return preguntaEntrega(sesion);
  }
  function preguntaEntrega(sesion) {
    return [botones(mensajes.tipoEntrega(total(sesion.carrito)), [
      { id: "entrega:recojo", titulo: "Recojo en tienda" },
      { id: "entrega:delivery", titulo: "Delivery" },
      { id: "seguir", titulo: "Agregar m\xE1s" }
    ])];
  }
  function elegirEntrega(sesion, entrega) {
    const subtotal = total(sesion.carrito);
    if (entrega === "delivery" && subtotal < NEGOCIO.minimoDelivery) {
      return [botones(mensajes.bajoElMinimo(subtotal), [
        { id: "entrega:recojo", titulo: "Recojo en tienda" },
        { id: "seguir", titulo: "Agregar m\xE1s" }
      ])];
    }
    sesion.entrega = entrega;
    if (entrega === "delivery") {
      sesion.estado = E.DIRECCION;
      return [texto(mensajes.pedirDireccion())];
    }
    sesion.direccion = null;
    return preguntaPago(sesion);
  }
  function recibirDireccion(sesion, direccion) {
    if (direccion.length < MIN_DIRECCION) return [texto(mensajes.direccionInvalida())];
    sesion.direccion = direccion;
    return preguntaPago(sesion);
  }
  function preguntaPago(sesion) {
    sesion.estado = E.PAGO;
    return [botones(mensajes.pedirPago(), [
      { id: "pago:efectivo", titulo: "Efectivo" },
      { id: "pago:yape", titulo: "Yape" },
      { id: "pago:transferencia", titulo: "Transferencia" }
    ])];
  }
  function costoEntrega(sesion) {
    return sesion.entrega === "delivery" ? NEGOCIO.costoDelivery : 0;
  }
  function totalPedido(sesion) {
    return (Math.round(total(sesion.carrito) * 100) + Math.round(costoEntrega(sesion) * 100)) / 100;
  }
  function elegirPago(sesion, pago) {
    sesion.pago = pago;
    return resumenFinal(sesion);
  }
  function resumenFinal(sesion) {
    sesion.estado = E.CONFIRMAR;
    const t = mensajes.confirmar(
      resumen(sesion.carrito),
      sesion.entrega,
      sesion.direccion,
      sesion.pago,
      costoEntrega(sesion),
      totalPedido(sesion)
    );
    return [botones(t, [
      { id: "pedido_confirmar", titulo: "Confirmar pedido" },
      { id: "pedido_editar", titulo: "Modificar pedido" },
      { id: "pedido_cancelar", titulo: "Cancelar" }
    ])];
  }
  function confirmarPedido(sesion) {
    const pedido = {
      id: `LE-${sesion.actualizadoEn.toString(36).toUpperCase().slice(-6)}`,
      telefono: sesion.telefono,
      items: sesion.carrito.map((l) => ({ ...l })),
      total: totalPedido(sesion),
      entrega: sesion.entrega,
      direccion: sesion.direccion,
      pago: sesion.pago,
      estado: "recibido",
      creadoEn: sesion.actualizadoEn
    };
    sesion.pedidoNuevo = pedido;
    sesion.carrito = [];
    sesion.estado = E.FIN;
    return [texto(mensajes.pedidoRecibido(pedido))];
  }
  function repetirPaso(sesion) {
    switch (sesion.estado) {
      case E.INICIO:
      case E.MENU:
        return mostrarMenu(sesion, false);
      case E.ELIGIENDO:
        if (sesion.productoPendiente) return elegirProducto(sesion, productoPorId(sesion.productoPendiente));
        return mostrarCategorias(sesion);
      case E.CARRITO:
        return mostrarCarrito(sesion);
      case E.TIPO_ENTREGA:
        return preguntaEntrega(sesion);
      case E.DIRECCION:
        return [texto(mensajes.pedirDireccion())];
      case E.PAGO:
        return preguntaPago(sesion);
      case E.CONFIRMAR:
        return resumenFinal(sesion);
      default:
        return [];
    }
  }
  return __toCommonJS(simulador_entrada_exports);
})();

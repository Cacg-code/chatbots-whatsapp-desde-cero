// Simulador en la terminal: prueba el bot sin WhatsApp.
//   npm run chat
// Escribes texto. Cuando el bot muestra botones o una lista, puedes escribir el NÚMERO de la opción
// o su id (por ejemplo "cat:lacteos"). Escribe "salir" o Ctrl+C para terminar.

import readline from 'node:readline';
import { crearSesion, procesar } from './src/motor.js';
import { construirEnvio } from './src/whatsapp.js';

const TELEFONO = '51999000111'; // número de ejemplo
let sesion = crearSesion(TELEFONO);
let opciones = []; // opciones numeradas de la última respuesta con botones/lista

function mostrar(respuestas) {
  opciones = [];
  for (const r of respuestas) {
    construirEnvio(TELEFONO, r); // valida los límites de WhatsApp (lanza error si no se cumplen)
    console.log(`\nbot> ${r.texto}`);
    const items = r.tipo === 'botones' ? r.botones : r.tipo === 'lista' ? r.secciones.flatMap((s) => s.filas) : [];
    for (const item of items) {
      opciones.push(item);
      const detalle = item.descripcion ? ` - ${item.descripcion}` : '';
      console.log(`      ${opciones.length}) ${item.titulo}${detalle}   [${item.id}]`);
    }
  }
  console.log();
}

function aEntrada(linea) {
  const n = Number(linea);
  if (Number.isInteger(n) && opciones[n - 1]) return { tipo: 'interactivo', id: opciones[n - 1].id };
  const porId = opciones.find((o) => o.id === linea);
  if (porId) return { tipo: 'interactivo', id: porId.id };
  return { tipo: 'texto', texto: linea };
}

const lector = readline.createInterface({ input: process.stdin });
console.log(`Simulador de Minimarket La Esquina (cliente de ejemplo ${TELEFONO}). Escribe "hola".`);

for await (const linea of lector) {
  const texto = linea.trim();
  if (!texto) continue;
  if (texto === 'salir') break;
  if (!process.stdin.isTTY) console.log(`tu> ${texto}`); // al usar pipes, mostramos lo que "escribiste"
  const resultado = procesar(sesion, aEntrada(texto));
  sesion = resultado.sesion;
  mostrar(resultado.respuestas);
  if (sesion.pedidoNuevo) console.log('[pedido guardado]', JSON.stringify(sesion.pedidoNuevo));
}

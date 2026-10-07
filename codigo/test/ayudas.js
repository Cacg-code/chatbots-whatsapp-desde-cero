// Ayudas compartidas por las pruebas (no contiene pruebas).
import { crearSesion, procesar } from '../src/motor.js';
import { construirEnvio } from '../src/whatsapp.js';

const AHORA = Date.UTC(2026, 9, 7, 15, 0, 0);

/** Simula a un cliente. Cada respuesta del bot se valida contra los límites de WhatsApp. */
export function conversacion(telefono = '51999000111') {
  let sesion = crearSesion(telefono, AHORA);
  let reloj = AHORA;
  const c = {
    get sesion() { return sesion; },
    respuestas: [],
    transcripcion: [],
    enviar(entrada) {
      reloj += 5000;
      const r = procesar(sesion, entrada, reloj);
      sesion = r.sesion;
      c.respuestas = r.respuestas;
      for (const resp of r.respuestas) {
        construirEnvio(telefono, resp); // lanza si rompe un límite de WhatsApp
        c.transcripcion.push(resp);
      }
      return c;
    },
    decir: (texto) => c.enviar({ tipo: 'texto', texto }),
    tocar: (id) => c.enviar({ tipo: 'interactivo', id }),
    /** Todo el texto de la última tanda de respuestas. */
    get texto() { return c.respuestas.map((r) => r.texto).join('\n'); },
    get tipos() { return c.respuestas.map((r) => r.tipo); },
    idsOfrecidos() {
      return c.respuestas.flatMap((r) => (r.botones ?? r.secciones?.flatMap((s) => s.filas) ?? []).map((o) => o.id));
    },
  };
  return c;
}

export { AHORA };

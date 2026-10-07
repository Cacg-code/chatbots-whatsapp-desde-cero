import test from 'node:test';
import assert from 'node:assert/strict';
import { pedidosParaRecordar, carritosAbandonados, puedeEnviarTexto } from '../src/recordatorios.js';

const MIN = 60 * 1000;
const HORA = 60 * MIN;
const AHORA = Date.UTC(2026, 9, 7, 18, 0, 0);

const pedido = (id, haceMs, extra = {}) => ({ id, estado: 'recibido', creadoEn: AHORA - haceMs, ...extra });
const sesion = (tel, haceMs, extra = {}) => ({
  telefono: tel, estado: 'CARRITO', carrito: [{ id: 'leche', cantidad: 1 }], ultimoMensajeCliente: AHORA - haceMs, recordatorioEnviado: false, ...extra,
});

test('pedidosParaRecordar: entre 30 min y 23 h', () => {
  const lista = [pedido('reciente', 10 * MIN), pedido('justo', 31 * MIN), pedido('medio', 5 * HORA), pedido('viejo', 23 * HORA + MIN)];
  assert.deepEqual(pedidosParaRecordar(lista, AHORA).map((p) => p.id), ['justo', 'medio']);
});

test('pedidosParaRecordar: solo estado recibido y sin recordatorio previo', () => {
  const lista = [
    pedido('a', HORA, { estado: 'entregado' }),
    pedido('b', HORA, { recordadoEn: AHORA - 10 * MIN }),
    pedido('c', HORA),
  ];
  assert.deepEqual(pedidosParaRecordar(lista, AHORA).map((p) => p.id), ['c']);
});

test('pedidosParaRecordar: usa actualizadoEn si existe', () => {
  const p = pedido('x', 5 * HORA, { actualizadoEn: AHORA - 5 * MIN });
  assert.deepEqual(pedidosParaRecordar([p], AHORA), []);
});

test('pedidosParaRecordar con lista vacía', () => {
  assert.deepEqual(pedidosParaRecordar([], AHORA), []);
});

test('carritosAbandonados: carrito lleno, inactivo entre 1 h y 23 h', () => {
  const lista = [sesion('1', 20 * MIN), sesion('2', 2 * HORA), sesion('3', 24 * HORA)];
  assert.deepEqual(carritosAbandonados(lista, AHORA).map((s) => s.telefono), ['2']);
});

test('carritosAbandonados: ignora carritos vacíos, ya avisados y estados fuera de compra', () => {
  const lista = [
    sesion('vacio', 2 * HORA, { carrito: [] }),
    sesion('avisado', 2 * HORA, { recordatorioEnviado: true }),
    sesion('fin', 2 * HORA, { estado: 'FIN' }),
    sesion('humano', 2 * HORA, { estado: 'ESPERANDO_HUMANO' }),
    sesion('ok', 2 * HORA, { estado: 'PAGO' }),
  ];
  assert.deepEqual(carritosAbandonados(lista, AHORA).map((s) => s.telefono), ['ok']);
});

test('puedeEnviarTexto: ventana de 24 horas', () => {
  assert.equal(puedeEnviarTexto(AHORA - 2 * HORA, AHORA), true);
  assert.equal(puedeEnviarTexto(AHORA - 23 * HORA, AHORA), true);
  assert.equal(puedeEnviarTexto(AHORA - 24 * HORA, AHORA), false);
  assert.equal(puedeEnviarTexto(AHORA - 30 * HORA, AHORA), false);
});

test('puedeEnviarTexto: sin mensaje previo del cliente no se puede', () => {
  assert.equal(puedeEnviarTexto(undefined, AHORA), false);
  assert.equal(puedeEnviarTexto(null, AHORA), false);
});

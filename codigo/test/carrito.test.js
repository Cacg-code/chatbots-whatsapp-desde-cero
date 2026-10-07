import test from 'node:test';
import assert from 'node:assert/strict';
import { agregar, quitar, cambiarCantidad, total, resumen, cantidadItems, formatoSoles } from '../src/carrito.js';
import { productoPorId } from '../src/catalogo.js';

const leche = productoPorId('leche');
const arroz = productoPorId('arroz');

test('agregar crea una línea nueva', () => {
  const c = agregar([], leche, 2);
  assert.equal(c.length, 1);
  assert.deepEqual(c[0], { id: 'leche', nombre: leche.nombre, precio: 4.3, cantidad: 2 });
});

test('agregar suma a la línea existente', () => {
  const c = agregar(agregar([], leche, 2), leche, 3);
  assert.equal(c.length, 1);
  assert.equal(c[0].cantidad, 5);
});

test('las funciones no modifican el carrito original (inmutabilidad)', () => {
  const original = agregar([], leche, 1);
  const copia = JSON.stringify(original);
  agregar(original, arroz, 1);
  agregar(original, leche, 4);
  cambiarCantidad(original, 'leche', 9);
  quitar(original, 'leche');
  assert.equal(JSON.stringify(original), copia);
});

test('quitar elimina la línea', () => {
  const c = quitar(agregar(agregar([], leche, 1), arroz, 1), 'leche');
  assert.deepEqual(c.map((l) => l.id), ['arroz']);
});

test('quitar un producto que no está no rompe nada', () => {
  assert.deepEqual(quitar([], 'leche'), []);
});

test('cambiarCantidad actualiza y con 0 elimina', () => {
  const c = agregar([], leche, 1);
  assert.equal(cambiarCantidad(c, 'leche', 4)[0].cantidad, 4);
  assert.deepEqual(cambiarCantidad(c, 'leche', 0), []);
});

test('total evita errores de decimales', () => {
  // 0.1 + 0.2 en JavaScript da 0.30000000000000004; aquí debe dar 0.3
  const c = [
    { id: 'a', nombre: 'A', precio: 0.1, cantidad: 1 },
    { id: 'b', nombre: 'B', precio: 0.2, cantidad: 1 },
  ];
  assert.equal(total(c), 0.3);
  assert.equal(total([{ id: 'x', nombre: 'X', precio: 0.1, cantidad: 3 }]), 0.3);
});

test('total de un carrito real', () => {
  const c = agregar(agregar([], leche, 3), arroz, 2); // 3*4.30 + 2*4.20 = 21.30
  assert.equal(total(c), 21.3);
  assert.equal(total([]), 0);
});

test('cantidadItems suma unidades', () => {
  assert.equal(cantidadItems(agregar(agregar([], leche, 3), arroz, 2)), 5);
});

test('formatoSoles', () => {
  assert.equal(formatoSoles(12.5), 'S/ 12.50');
  assert.equal(formatoSoles(0), 'S/ 0.00');
});

test('resumen legible', () => {
  const r = resumen(agregar([], leche, 2));
  assert.match(r, /2 x Leche entera 1 L: S\/ 8\.60/);
  assert.match(r, /Subtotal: S\/ 8\.60/);
  assert.equal(resumen([]), 'Tu carrito está vacío.');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizar, extraerCantidad, cantidadSola, buscarProductos, separarPedidos, detectarIntencion, levenshtein } from '../src/texto.js';
import { PRODUCTOS, CATEGORIAS } from '../src/catalogo.js';

const ids = (lista) => lista.map((p) => p.id);

test('normalizar quita tildes, mayúsculas y signos', () => {
  assert.equal(normalizar('  ¡Quiero DOS Leches, por favor!  '), 'quiero dos leches por favor');
  assert.equal(normalizar('Azúcar'), 'azucar');
  assert.equal(normalizar('piña'), 'pina');
});

test('normalizar tolera valores que no son texto', () => {
  assert.equal(normalizar(undefined), '');
  assert.equal(normalizar(null), '');
  assert.equal(normalizar(42), '');
});

test('extraerCantidad: cifras', () => {
  assert.equal(extraerCantidad('quiero 3 leches'), 3);
  assert.equal(extraerCantidad('12 huevos'), 12);
});

test('extraerCantidad: números en palabras', () => {
  assert.equal(extraerCantidad('dos leches'), 2);
  assert.equal(extraerCantidad('una gaseosa'), 1);
  assert.equal(extraerCantidad('cinco panes'), 5);
});

test('extraerCantidad: docenas', () => {
  assert.equal(extraerCantidad('media docena de huevos'), 6);
  assert.equal(extraerCantidad('una docena de huevos'), 12);
  assert.equal(extraerCantidad('dos docenas'), 24);
});

test('extraerCantidad: sin número es 1', () => {
  assert.equal(extraerCantidad('leche'), 1);
});

test('cantidadSola solo acepta un número aislado', () => {
  assert.equal(cantidadSola('3'), 3);
  assert.equal(cantidadSola('tres'), 3);
  assert.equal(cantidadSola('3 leches'), null);
  assert.equal(cantidadSola('hola'), null);
});

test('levenshtein cuenta ediciones', () => {
  assert.equal(levenshtein('leche', 'leche'), 0);
  assert.equal(levenshtein('leche', 'leshe'), 1);
  assert.equal(levenshtein('arroz', 'aros'), 2);
});

test('buscarProductos: coincidencia exacta y plural', () => {
  assert.deepEqual(ids(buscarProductos('quiero leches', PRODUCTOS)), ['leche']);
  assert.deepEqual(ids(buscarProductos('arroz', PRODUCTOS)), ['arroz']);
  assert.deepEqual(ids(buscarProductos('2 gaseosas cola', PRODUCTOS)), ['gaseosa-cola']);
});

test('buscarProductos: usa sinónimos', () => {
  assert.deepEqual(ids(buscarProductos('tallarines', PRODUCTOS)), ['fideos']);
  assert.deepEqual(ids(buscarProductos('papitas', PRODUCTOS)), ['papas']);
});

test('buscarProductos: tolera un error tipográfico en palabras largas', () => {
  assert.deepEqual(ids(buscarProductos('mantequila', PRODUCTOS)), ['mantequilla']);
  assert.deepEqual(ids(buscarProductos('azucr rubia', PRODUCTOS)).includes('azucar'), true);
  assert.deepEqual(ids(buscarProductos('lentejaz', PRODUCTOS)), ['lentejas']);
});

test('buscarProductos: NO tolera errores en palabras cortas', () => {
  assert.deepEqual(buscarProductos('sol', PRODUCTOS), []);
});

test('buscarProductos: la frase más específica gana', () => {
  assert.deepEqual(ids(buscarProductos('agua con gas', PRODUCTOS)), ['agua-gas']);
  assert.deepEqual(ids(buscarProductos('leche descremada', PRODUCTOS)), ['leche-light']);
  assert.deepEqual(ids(buscarProductos('pan de molde', PRODUCTOS)), ['pan-molde']);
});

test('buscarProductos: ambigüedad devuelve varios', () => {
  assert.deepEqual(ids(buscarProductos('una gaseosa', PRODUCTOS)).sort(), ['gaseosa-cola', 'gaseosa-naranja']);
  assert.deepEqual(ids(buscarProductos('pan', PRODUCTOS)), ['pan']);
});

test('buscarProductos: sin coincidencias', () => {
  assert.deepEqual(buscarProductos('quiero un unicornio', PRODUCTOS), []);
  assert.deepEqual(buscarProductos('', PRODUCTOS), []);
});

test('separarPedidos divide varios productos con su cantidad', () => {
  const r = separarPedidos('quiero 2 leches y media docena de huevos', PRODUCTOS);
  assert.equal(r.length, 2);
  assert.equal(r[0].cantidad, 2);
  assert.equal(r[0].productos[0].id, 'leche');
  assert.equal(r[1].cantidad, 6);
  assert.equal(r[1].productos[0].id, 'huevo');
});

test('detectarIntencion: cada intención', () => {
  const casos = {
    'hola': 'saludo', 'Buenas tardes': 'saludo',
    'menú': 'menu', 'catálogo': 'catalogo', 'quiero hacer un pedido': 'catalogo',
    'ver carrito': 'carrito', 'confirmar': 'confirmar', 'sí': 'confirmar',
    'cancelar': 'cancelar', 'ayuda': 'ayuda',
    'quiero hablar con una persona': 'humano', 'a qué hora abren': 'horario',
    'asdfgh': 'desconocida', '': 'desconocida',
  };
  for (const [texto, esperada] of Object.entries(casos)) {
    assert.equal(detectarIntencion(texto), esperada, `"${texto}"`);
  }
});

test('detectarIntencion: "si" dentro de una frase larga no confirma', () => {
  assert.equal(detectarIntencion('si quiero 2 leches para hoy por favor'), 'desconocida');
});

test('catálogo: datos consistentes', () => {
  assert.ok(PRODUCTOS.length >= 20);
  assert.ok(Object.keys(CATEGORIAS).length >= 5);
  assert.equal(new Set(PRODUCTOS.map((p) => p.id)).size, PRODUCTOS.length, 'ids repetidos');
  for (const p of PRODUCTOS) {
    assert.ok(p.nombre.length <= 24, `nombre muy largo: ${p.nombre}`);
    assert.ok(p.precio > 0 && p.sinonimos.length > 0 && CATEGORIAS[p.categoria], p.id);
  }
});

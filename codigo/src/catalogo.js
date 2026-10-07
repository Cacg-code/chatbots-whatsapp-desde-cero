// Datos del negocio ficticio. Todo es inventado: nada de esto es real.

export const NEGOCIO = {
  nombre: 'Minimarket La Esquina',
  horario: 'Lunes a sábado de 8:00 a 21:00. Domingos de 9:00 a 14:00.',
  direccion: 'Av. Los Olivos 123, Distrito Ejemplo (dirección ficticia)',
  costoDelivery: 3, // soles
  minimoDelivery: 25, // soles de productos para poder pedir delivery
  zonas: ['Urb. Los Olivos', 'Urb. Las Palmeras', 'Centro'],
  yape: '51999000111', // número de ejemplo
  cuentaTransferencia: 'Cuenta de ejemplo 000-000000000-0-00 a nombre de La Esquina SAC',
};

// Cada producto: id, nombre (corto: cabe en una fila de lista de WhatsApp, máx. 24),
// precio en soles, categoría, unidad y sinónimos (las formas en que la gente lo nombra).
// El buscador usa SOLO los sinónimos, así que incluye ahí el nombre "hablado".
export const PRODUCTOS = [
  // abarrotes
  { id: 'arroz', nombre: 'Arroz extra 1 kg', precio: 4.2, categoria: 'abarrotes', unidad: 'bolsa', sinonimos: ['arroz'] },
  { id: 'azucar', nombre: 'Azúcar rubia 1 kg', precio: 3.9, categoria: 'abarrotes', unidad: 'bolsa', sinonimos: ['azucar', 'azucar rubia'] },
  { id: 'aceite', nombre: 'Aceite vegetal 1 L', precio: 9.5, categoria: 'abarrotes', unidad: 'botella', sinonimos: ['aceite'] },
  { id: 'fideos', nombre: 'Fideos spaghetti 500 g', precio: 3.1, categoria: 'abarrotes', unidad: 'bolsa', sinonimos: ['fideos', 'spaghetti', 'tallarin', 'tallarines'] },
  { id: 'atun', nombre: 'Atún en lata', precio: 5.5, categoria: 'abarrotes', unidad: 'lata', sinonimos: ['atun', 'conserva de atun'] },
  { id: 'lentejas', nombre: 'Lentejas 500 g', precio: 4.8, categoria: 'abarrotes', unidad: 'bolsa', sinonimos: ['lentejas', 'menestra'] },
  { id: 'sal', nombre: 'Sal de mesa 1 kg', precio: 1.5, categoria: 'abarrotes', unidad: 'bolsa', sinonimos: ['sal'] },
  { id: 'avena', nombre: 'Avena en hojuelas', precio: 2.8, categoria: 'abarrotes', unidad: 'bolsa', sinonimos: ['avena', 'hojuelas de avena'] },
  { id: 'huevo', nombre: 'Huevo', precio: 0.6, categoria: 'abarrotes', unidad: 'unidad', sinonimos: ['huevo', 'huevos'] },
  // bebidas
  { id: 'gaseosa-cola', nombre: 'Gaseosa cola 1.5 L', precio: 7.5, categoria: 'bebidas', unidad: 'botella', sinonimos: ['gaseosa', 'gaseosa cola', 'cola'] },
  { id: 'gaseosa-naranja', nombre: 'Gaseosa naranja 1.5 L', precio: 7.5, categoria: 'bebidas', unidad: 'botella', sinonimos: ['gaseosa', 'gaseosa naranja', 'naranja'] },
  { id: 'agua', nombre: 'Agua sin gas 625 ml', precio: 1.5, categoria: 'bebidas', unidad: 'botella', sinonimos: ['agua', 'agua sin gas', 'agua mineral'] },
  { id: 'agua-gas', nombre: 'Agua con gas 625 ml', precio: 1.8, categoria: 'bebidas', unidad: 'botella', sinonimos: ['agua con gas'] },
  { id: 'jugo', nombre: 'Jugo de durazno 1 L', precio: 4.5, categoria: 'bebidas', unidad: 'caja', sinonimos: ['jugo', 'nectar', 'jugo de durazno'] },
  { id: 'chicha', nombre: 'Chicha morada 1 L', precio: 5, categoria: 'bebidas', unidad: 'botella', sinonimos: ['chicha', 'chicha morada'] },
  // lácteos
  { id: 'leche', nombre: 'Leche entera 1 L', precio: 4.3, categoria: 'lacteos', unidad: 'caja', sinonimos: ['leche', 'leche entera'] },
  { id: 'leche-light', nombre: 'Leche descremada 1 L', precio: 4.5, categoria: 'lacteos', unidad: 'caja', sinonimos: ['leche descremada', 'leche light'] },
  { id: 'yogurt', nombre: 'Yogurt de fresa 1 L', precio: 6.9, categoria: 'lacteos', unidad: 'botella', sinonimos: ['yogurt', 'yogur'] },
  { id: 'queso', nombre: 'Queso fresco 250 g', precio: 7.5, categoria: 'lacteos', unidad: 'paquete', sinonimos: ['queso', 'queso fresco'] },
  { id: 'mantequilla', nombre: 'Mantequilla 200 g', precio: 6.2, categoria: 'lacteos', unidad: 'barra', sinonimos: ['mantequilla'] },
  // panadería
  { id: 'pan', nombre: 'Pan francés', precio: 0.3, categoria: 'panaderia', unidad: 'unidad', sinonimos: ['pan', 'pan frances'] },
  { id: 'pan-molde', nombre: 'Pan de molde familiar', precio: 7.9, categoria: 'panaderia', unidad: 'bolsa', sinonimos: ['pan de molde', 'pan molde'] },
  { id: 'galletas', nombre: 'Galletas de soda', precio: 1.2, categoria: 'panaderia', unidad: 'paquete', sinonimos: ['galletas', 'galleta', 'galletas de soda'] },
  // limpieza
  { id: 'detergente', nombre: 'Detergente 1 kg', precio: 8.9, categoria: 'limpieza', unidad: 'bolsa', sinonimos: ['detergente', 'detergente de ropa'] },
  { id: 'lavavajillas', nombre: 'Lavavajillas 500 ml', precio: 5.6, categoria: 'limpieza', unidad: 'botella', sinonimos: ['lavavajillas', 'lavavajilla', 'detergente de platos'] },
  { id: 'papel', nombre: 'Papel higiénico x4', precio: 6.5, categoria: 'limpieza', unidad: 'paquete', sinonimos: ['papel higienico', 'papel'] },
  { id: 'lejia', nombre: 'Lejía 1 L', precio: 3.5, categoria: 'limpieza', unidad: 'botella', sinonimos: ['lejia', 'cloro'] },
  { id: 'esponja', nombre: 'Esponja de cocina', precio: 1.8, categoria: 'limpieza', unidad: 'unidad', sinonimos: ['esponja', 'esponjas'] },
  { id: 'jabon', nombre: 'Jabón de tocador', precio: 2.5, categoria: 'limpieza', unidad: 'unidad', sinonimos: ['jabon'] },
  // snacks
  { id: 'papas', nombre: 'Papas fritas 100 g', precio: 2.5, categoria: 'snacks', unidad: 'bolsa', sinonimos: ['papas fritas', 'papitas', 'snack'] },
  { id: 'chocolate', nombre: 'Chocolate de leche', precio: 2, categoria: 'snacks', unidad: 'barra', sinonimos: ['chocolate', 'chocolatina'] },
];

export const CATEGORIAS = {
  abarrotes: 'Abarrotes',
  bebidas: 'Bebidas',
  lacteos: 'Lácteos',
  panaderia: 'Panadería',
  limpieza: 'Limpieza',
  snacks: 'Snacks',
};

export function productoPorId(id) {
  return PRODUCTOS.find((p) => p.id === id) ?? null;
}

export function productosDeCategoria(categoria) {
  return PRODUCTOS.filter((p) => p.categoria === categoria);
}

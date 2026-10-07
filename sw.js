// Service worker: uso sin conexión. Sube VERSION cuando cambies el sitio.
const VERSION = 'v4';
const CACHE = 'chatbots-whatsapp-' + VERSION;
const ROOT = new URL('./', self.location).href;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([ROOT, ROOT + 'assets/estilos.css', ROOT + 'assets/curso.js', ROOT + 'assets/indice.json', ROOT + 'assets/favicon.svg', ROOT + '404.html'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('chatbots-whatsapp-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || !r.url.startsWith(ROOT)) return;
  // Red primero (siempre lo más nuevo); la caché solo sirve si no hay conexión.
  e.respondWith(fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then((c) => c.put(r, cp)); } return res; }).catch(() => caches.match(r).then((m) => m || (r.mode === 'navigate' ? caches.match(ROOT + '404.html') : Response.error()))));
});

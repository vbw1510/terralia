// Terrália Farm: funciona offline e sempre busca a versão nova primeiro
const CACHE = 'terralia-v20';
const BASE = ['./', 'index.html', 'css/style.css', 'js/game.js', 'js/icones.js', 'js/audio.js', 'assets/lib/three.min.js', 'assets/lib/OrbitControls.js',
  'assets/lib/RoomEnvironment.js', 'assets/lib/supabase.js', 'assets/img/capa.jpg', 'assets/icones/icone-192.png', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return; // login, banco e fontes vão direto para a internet
  e.respondWith(fetch(r, {cache:'no-cache'}).then(res => { if (res.status === 200) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r, {ignoreSearch:true}).then(m => m || caches.match('index.html'))));
});

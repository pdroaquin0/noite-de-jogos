/* Noite de Jogos — service worker
   Atualize a versão abaixo sempre que publicar uma mudança grande no app
   para forçar a renovação do cache nos aparelhos. */
const CACHE = 'noite-jogos-v11';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './icon-180.png',
  './favicon.svg',
  './favicon.ico'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // adiciona um a um pra não falhar tudo se um arquivo faltar
    await Promise.allSettled(ASSETS.map((a) => c.add(a)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Navegação (abrir o app): rede primeiro, cai pro cache offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const cp = res.clone();
          caches.open(CACHE).then((c) => c.put(req, cp));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Mesma origem (ícones, manifest): cache primeiro.
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then((r) => r || fetch(req).then((res) => {
        const cp = res.clone();
        caches.open(CACHE).then((c) => c.put(req, cp));
        return res;
      }))
    );
    return;
  }

  // Outras origens (Google Fonts): usa cache, atualiza em segundo plano.
  e.respondWith(
    caches.match(req).then((r) => {
      const fetchPromise = fetch(req).then((res) => {
        const cp = res.clone();
        caches.open(CACHE).then((c) => c.put(req, cp));
        return res;
      }).catch(() => r);
      return r || fetchPromise;
    })
  );
});

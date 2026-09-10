const CACHE_NAME = 'apibox-shell-v1';
const scopeUrl = new URL(self.registration.scope);

self.addEventListener('install', (event) => {
  event.waitUntil(cacheApplicationShell());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then((names) =>
          Promise.all(
            names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
          ),
        ),
    ]),
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method !== 'GET' || requestUrl.origin !== scopeUrl.origin) return;
  event.respondWith(cacheFirst(event.request));
});

async function cacheApplicationShell() {
  const cache = await caches.open(CACHE_NAME);
  const indexUrl = new URL('./', scopeUrl);
  const indexResponse = await fetch(indexUrl);
  if (!indexResponse.ok) return;
  const html = await indexResponse.clone().text();
  const assetPaths = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map((match) => match[1]);
  const assetManifestPath = './.vite/manifest.json';
  const fixedPaths = [
    './',
    './manifest.webmanifest',
    './icons/apibox-192.png',
    './icons/apibox-512.png',
    './icons/apibox.svg',
    './data/manifest.json',
    assetManifestPath,
  ];
  const assetManifest = await fetch(new URL(assetManifestPath, scopeUrl)).then((response) =>
    response.json(),
  );
  const builtAssets = Object.values(assetManifest).flatMap((entry) => [
    entry.file,
    ...(entry.css ?? []),
    ...(entry.assets ?? []),
  ]);
  await cacheAvailablePaths(cache, [...fixedPaths, ...assetPaths, ...builtAssets]);

  try {
    const manifestResponse = await fetch(new URL('./data/manifest.json', scopeUrl));
    const manifest = await manifestResponse.clone().json();
    await cache.put(new URL('./data/manifest.json', scopeUrl), manifestResponse);
    const documentPaths = Array.isArray(manifest.documents)
      ? manifest.documents.map((document) => `./data/${document.path}`)
      : [];
    await cacheAvailablePaths(cache, documentPaths);
  } catch {
    // The app shell remains useful for browser-owned workspaces without bundled examples.
  }
}

async function cacheAvailablePaths(cache, paths) {
  await Promise.all(
    [...new Set(paths)].map(async (path) => {
      try {
        const url = new URL(path, scopeUrl);
        const response = await fetch(url);
        if (response.ok) await cache.put(url, response);
      } catch {
        // One optional asset must not prevent the rest of the app from installing.
      }
    }),
  );
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (request.mode === 'navigate') {
      const fallback = await caches.match(new URL('./', scopeUrl));
      if (fallback) return fallback;
    }
    throw error;
  }
}

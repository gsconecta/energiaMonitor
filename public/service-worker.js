const CACHE_NAME = 'energia-monitor-static-v1';

const CORE_ASSETS = [
    '/manifest.webmanifest',
    '/favicon.svg',
    '/apple-touch-icon.png',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/maskable-icon-192x192.png',
    '/icons/maskable-icon-512x512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(CORE_ASSETS))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) =>
                Promise.all(
                    cacheNames
                        .filter((cacheName) => cacheName !== CACHE_NAME)
                        .map((cacheName) => caches.delete(cacheName)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }

    if (
        request.mode === 'navigate' ||
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/broadcasting') ||
        pathname.startsWith('/seleccionar-contexto')
    ) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request).then((networkResponse) => {
                if (
                    networkResponse.ok &&
                    ['font', 'image', 'script', 'style'].includes(
                        request.destination,
                    )
                ) {
                    const responseToCache = networkResponse.clone();

                    caches
                        .open(CACHE_NAME)
                        .then((cache) => cache.put(request, responseToCache));
                }

                return networkResponse;
            });
        }),
    );
});

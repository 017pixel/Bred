const CACHE_NAME = 'bread-ai-v15';
const ASSETS_TO_CACHE = [
    './manifest.json',
    './css/base.css',
    './css/layout.css',
    './css/components.css',
    './css/modals.css',
    './css/responsive.css',
    './css/bottom-sheet.css',
    './css/toast.css',
    './js/main.js',
    './js/api.js',
    './js/config.js',
    './js/state.js',
    './js/ui.js',
    './js/db.js',
    './js/providers.js',
    './js/bottomsheet.js',
    './js/toast.js',
    './icon-192.png',
    './icon-512.png'
];

// HTML-Anfragen immer vom Netzwerk laden (frische Version), Cache nur als Offline-Fallback
function isHTMLRequest(request) {
    const acceptHeader = request.headers.get('accept') || '';
    return acceptHeader.includes('text/html') ||
        acceptHeader.includes('document') ||
        request.url.endsWith('.html') ||
        request.url.endsWith('/');
}

// Statische Assets: Cache-first mit Hintergrund-Update (stale-while-revalidate)
function staleWhileRevalidate(request) {
    return caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(cached => {
            const fetchPromise = fetch(request)
                .then(networkResponse => {
                    if (networkResponse && networkResponse.ok) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                })
                .catch(() => cached);

            return cached || fetchPromise;
        });
    });
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => Promise.allSettled(ASSETS_TO_CACHE.map(url => cache.add(url))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Nur GET-Anfragen und Same-Origin behandeln
    if (request.method !== 'GET') return;
    if (new URL(request.url).origin !== self.location.origin) return;

    if (isHTMLRequest(request)) {
        event.respondWith(
            fetch(request).catch(() => caches.match(request))
        );
        return;
    }

    event.respondWith(staleWhileRevalidate(request));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keyList => Promise.all(
                keyList.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

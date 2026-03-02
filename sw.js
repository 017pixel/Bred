const CACHE_NAME = 'bread-ai-v14';
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
    './icon-512.png',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

// HTML-Dateien immer vom Netzwerk laden (nicht cachen)
const HTML_REQUESTS = ['text/html', 'document'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const acceptHeader = request.headers.get('accept') || '';
    
    // HTML-Anfragen immer vom Netzwerk (frische Version)
    if (HTML_REQUESTS.some(type => acceptHeader.includes(type)) || 
        request.url.endsWith('.html') || 
        request.url.endsWith('/')) {
        event.respondWith(
            fetch(request).catch(() => caches.match(request))
        );
        return;
    }
    
    // Alle anderen Anfragen: Cache-first mit Network-Fallback
    event.respondWith(
        caches.match(request)
            .then((response) => response || fetch(request))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('Deleting old cache:', key);
                    return caches.delete(key);
                }
            }));
        }).then(() => {
            console.log('New service worker activated:', CACHE_NAME);
            return self.clients.claim();
        })
    );
});

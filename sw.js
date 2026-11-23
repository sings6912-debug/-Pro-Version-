// Pro Cloud Finance V15.9 - Production Offline-First Service Worker (PWA + Webfonts Ready)
const CACHE_NAME = 'pro-cloud-finance-v15.9';
const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@400;500;600;700;900&display=swap'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                CORE_ASSETS.map((url) => cache.add(url).catch(() => null))
            );
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = req.url;

    // Never intercept Firebase RTDB/Auth, Telegram API, or live exchange rate API calls
    if (
        url.includes('firebaseio.com') ||
        url.includes('googleapis.com/identitytoolkit') ||
        url.includes('securetoken.googleapis.com') ||
        url.includes('api.telegram.org') ||
        url.includes('open.er-api.com')
    ) {
        return;
    }

    // Navigation requests (HTML): Network-first with Offline Cache fallback
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then((resp) => {
                    if (resp && resp.ok) {
                        const clone = resp.clone();
                        caches.open(CACHE_NAME).then((c) => c.put(req, clone));
                    }
                    return resp;
                })
                .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
        );
        return;
    }

    // Static, Fonts (.woff2), Icons & Lazy-Loaded CDN Assets: Stale-While-Revalidate
    event.respondWith(
        caches.match(req).then((cached) => {
            const networkFetch = fetch(req)
                .then((resp) => {
                    if (resp && (resp.ok || resp.type === 'opaque')) {
                        const clone = resp.clone();
                        caches.open(CACHE_NAME).then((c) => c.put(req, clone));
                    }
                    return resp;
                })
                .catch(() => cached);
            return cached || networkFetch;
        })
    );
});

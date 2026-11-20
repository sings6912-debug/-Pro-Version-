// Pro Cloud Finance V9.3 - Offline-First Service Worker
const CACHE_NAME = 'pro-cloud-finance-v9.3';
const CORE_ASSETS = [
    './',
    './index.html',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
    'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js',
    'https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@300;400;500;600;700;900&display=swap'
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

    // Never intercept Firebase RTDB, Telegram API, or live exchange rate API calls
    if (
        url.includes('firebaseio.com') ||
        url.includes('googleapis.com/identitytoolkit') ||
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

    // Static & CDN Assets: Stale-While-Revalidate (instant offline load + background update)
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

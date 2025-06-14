const CACHE_NAME = 'marp-pwa-v1';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json'
];

// CDN resources - エラーが発生しやすいので削除
const CDN_RESOURCES = [];

self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                // CDNリソースを除外してローカルファイルのみキャッシュ
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Cache addAll failed:', error);
                // エラーが発生してもインストールを続行
                return Promise.resolve();
            })
    );
});

self.addEventListener('fetch', event => {
    // CDNリクエストはキャッシュしない
    if (event.request.url.includes('cdn.jsdelivr.net') || 
        event.request.url.includes('cdnjs.cloudflare.com')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
            .catch(error => {
                console.error('Fetch failed:', error);
                // フォールバック応答
                return new Response('オフラインです', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            })
    );
});

self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

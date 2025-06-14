// Marp PWA Service Worker - 完全版
const CACHE_NAME = 'marp-pwa-v1.0.0';
const DATA_CACHE_NAME = 'marp-data-v1.0.0';

// キャッシュするリソース
const FILES_TO_CACHE = [
  './',
  './index.html',
  './app.js',
  './style.css',
  './manifest.json',
  // 外部ライブラリ
  'https://esm.sh/@marp-team/marp-core@3.4.0?bundle',
  'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/markdown/markdown.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js',
  'https://cdn.jsdelivr.net/npm/marked@9.1.6/marked.min.js'
];

// Service Worker インストール
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Pre-caching app shell');
        return cache.addAll(FILES_TO_CACHE);
      })
      .catch(error => {
        console.warn('[Service Worker] Pre-caching failed for some resources:', error);
        // 重要なファイルのみキャッシュを試行
        return caches.open(CACHE_NAME).then(cache => {
          const essentialFiles = ['./', './index.html', './app.js', './style.css', './manifest.json'];
          return cache.addAll(essentialFiles);
        });
      })
  );
  
  // 即座に新しいService Workerをアクティブ化
  self.skipWaiting();
});

// Service Worker アクティベート
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // 即座に全てのページを制御下に置く
  self.clients.claim();
});

// ネットワークリクエストの処理
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // API リクエストの処理
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(cache => {
        return fetch(request)
          .then(response => {
            if (response.status === 200) {
              cache.put(request.url, response.clone());
            }
            return response;
          })
          .catch(() => {
            return cache.match(request);
          });
      })
    );
    return;
  }

  // アプリケーションファイルの処理
  if (request.destination === 'document' || FILES_TO_CACHE.includes(url.href) || FILES_TO_CACHE.includes(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(response => {
          if (response) {
            // キャッシュヒット - バックグラウンドで更新を試行
            fetch(request).then(fetchResponse => {
              if (fetchResponse.status === 200) {
                cache.put(request, fetchResponse.clone());
              }
            }).catch(() => {
              // ネットワークエラーは無視
            });
            return response;
          }
          
          // キャッシュミス - ネットワークから取得を試行
          return fetch(request).then(fetchResponse => {
            if (fetchResponse.status === 200) {
              cache.put(request, fetchResponse.clone());
            }
            return fetchResponse;
          }).catch(() => {
            // ネットワークエラー時のフォールバック
            if (request.destination === 'document') {
              return cache.match('./index.html');
            }
            throw new Error('Network error and no cache available');
          });
        });
      })
    );
    return;
  }

  // 外部リソースの処理 (CDN等)
  if (url.origin !== location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(response => {
          if (response) {
            return response;
          }
          
          return fetch(request, {
            mode: 'cors',
            credentials: 'omit'
          }).then(fetchResponse => {
            if (fetchResponse.status === 200 && fetchResponse.type === 'basic' || fetchResponse.type === 'cors') {
              cache.put(request, fetchResponse.clone());
            }
            return fetchResponse;
          }).catch(error => {
            console.warn('[Service Worker] Failed to fetch external resource:', request.url, error);
            // 外部リソースの読み込み失敗は致命的ではないため、エラーを投げずにundefinedを返す
            return new Response('', { status: 404, statusText: 'Not Found' });
          });
        });
      })
    );
    return;
  }

  // その他のリクエストはネットワーク優先
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// メッセージの処理
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urlsToCache = event.data.payload;
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(urlsToCache);
      })
    );
  }
});

// バックグラウンド同期 (実験的機能)
self.addEventListener('sync', event => {
  if (event.tag === 'auto-save') {
    event.waitUntil(doAutoSave());
  }
});

// プッシュ通知 (実験的機能)
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Marp PWA';
  const options = {
    body: data.body || '新しい更新があります',
    icon: data.icon || './icon-192x192.png',
    badge: data.badge || './icon-192x192.png',
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 通知クリック処理
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});

// エラーハンドリング
self.addEventListener('error', event => {
  console.error('[Service Worker] Error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[Service Worker] Unhandled promise rejection:', event.reason);
});

// ヘルパー関数
function doAutoSave() {
  return self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'AUTO_SAVE' });
    });
  });
}

// Service Worker更新の通知
function notifyUpdate() {
  return self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'UPDATE_AVAILABLE' });
    });
  });
}

// デバッグ情報
console.log('[Service Worker] Version:', CACHE_NAME);

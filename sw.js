const CACHE_NAME = 'marp-pwa-v1.1';
const STATIC_CACHE = 'marp-static-v1.1';
const DYNAMIC_CACHE = 'marp-dynamic-v1.1';

// キャッシュするファイル
const STATIC_FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json'
];

// 外部ライブラリ（オプション）
const EXTERNAL_LIBS = [
  'https://cdn.jsdelivr.net/npm/@marp-team/marp-core@4/lib/browser.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdn.jsdelivr.net/gh/gitbrent/pptxgenjs@3.12.0/dist/pptxgen.bundle.js',
  'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/lib/codemirror.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/markdown/markdown.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/lib/codemirror.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/default.min.css'
];

// Service Worker インストール
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');

  event.waitUntil(
    Promise.all([
      // 静的ファイルをキャッシュ
      caches.open(STATIC_CACHE).then(cache => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES).catch(error => {
          console.error('Service Worker: Failed to cache static files', error);
          // 個別にキャッシュを試行
          return Promise.allSettled(
            STATIC_FILES.map(url => cache.add(url).catch(e => console.warn(`Failed to cache ${url}:`, e)))
          );
        });
      }),

      // 外部ライブラリを可能な限りキャッシュ
      caches.open(DYNAMIC_CACHE).then(cache => {
        console.log('Service Worker: Caching external libraries');
        return Promise.allSettled(
          EXTERNAL_LIBS.map(url => 
            cache.add(url).catch(e => console.warn(`Failed to cache external lib ${url}:`, e))
          )
        );
      })
    ]).then(() => {
      console.log('Service Worker: Installation completed');
      // 古いService Workerを即座に置き換え
      return self.skipWaiting();
    }).catch(error => {
      console.error('Service Worker: Installation failed', error);
    })
  );
});

// Service Worker アクティベート
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // 古いキャッシュを削除
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation completed');
      // 全てのクライアントを制御下に置く
      return self.clients.claim();
    }).catch(error => {
      console.error('Service Worker: Activation failed', error);
    })
  );
});

// フェッチイベント（リクエスト傍受）
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // HTMLリクエストの処理
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(handleHTMLRequest(request));
    return;
  }

  // 静的ファイルの処理
  if (url.origin === location.origin) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // 外部リソースの処理
  if (isExternalLib(request.url)) {
    event.respondWith(handleExternalRequest(request));
    return;
  }

  // その他のリクエストはネットワークファーストで処理
  event.respondWith(
    fetch(request).catch(() => {
      console.warn('Service Worker: Network request failed for', request.url);
      return new Response('ネットワークエラー: リソースを取得できませんでした', {
        status: 503,
        statusText: 'Service Unavailable'
      });
    })
  );
});

// HTMLリクエストの処理（キャッシュファースト）
async function handleHTMLRequest(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('Service Worker: Serving HTML from cache');
      return cachedResponse;
    }

    // キャッシュにない場合はネットワークから取得
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // 成功したレスポンスをキャッシュに保存
      await cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('Service Worker: HTML request failed', error);

    // フォールバック HTML を返す
    return new Response(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Marp PWA - オフライン</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1>オフラインモード</h1>
        <p class="error">ネットワークに接続できません。</p>
        <p>インターネット接続を確認して、ページを再読み込みしてください。</p>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

// 静的ファイルリクエストの処理
async function handleStaticRequest(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // ネットワークから取得してキャッシュに保存
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Static request failed', error);
    throw error;
  }
}

// 外部ライブラリリクエストの処理
async function handleExternalRequest(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('Service Worker: Serving external lib from cache');
      return cachedResponse;
    }

    // ネットワークから取得（タイムアウト付き）
    const networkResponse = await fetchWithTimeout(request, 10000);

    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('Service Worker: External request failed', error);

    // 外部ライブラリが取得できない場合のフォールバック
    return new Response('// External library failed to load', {
      headers: { 'Content-Type': 'application/javascript' }
    });
  }
}

// 外部ライブラリかどうかを判定
function isExternalLib(url) {
  return EXTERNAL_LIBS.some(lib => url.includes(lib.split('/')[2]));
}

// タイムアウト付きfetch
function fetchWithTimeout(resource, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, timeout);

    fetch(resource).then(response => {
      clearTimeout(timer);
      resolve(response);
    }).catch(error => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

// エラーハンドリング
self.addEventListener('error', event => {
  console.error('Service Worker: Global error', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('Service Worker: Unhandled rejection', event.reason);
});

// メッセージハンドリング（アプリケーションとの通信）
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('Service Worker: Loaded successfully');

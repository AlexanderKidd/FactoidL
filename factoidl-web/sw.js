/*
 * @author Alexander Kidd
 * Description: Service worker for the FactoidL progressive web app.
 * Caches the app shell so FactoidL can launch offline, while source
 * lookups (e.g., Wikipedia) always go straight to the network.
 */

var CACHE_NAME = 'factoidl-2.6.1';

var APP_SHELL = [
  './',
  'index.html',
  'index.js',
  'content.js',
  'factoidl-common.js',
  'background.js',
  'verifyWorker.js',
  'compromise.min.js',
  'jquery-1.11.3.min.js',
  'manifest.webmanifest',
  'favicon.ico',
  'fact_icon_16x16.png',
  'search_icon_16x16.png',
  'FactoidL_Logo_Rounded_2.0_FINAL.svg',
  'FactoidL_Logo_Rounded_2.0_FINAL.png',
  'FactoidL_Logo_Rounded_icon192_2.0_FINAL.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Cached individually so one missing asset cannot fail the whole install.
      return Promise.all(APP_SHELL.map(function(asset) {
        return cache.add(asset).catch(function() {});
      }));
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(cacheNames.map(function(cacheName) {
        return cacheName === CACHE_NAME ? null : caches.delete(cacheName);
      }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  if(event.request.method !== 'GET') return;

  // Fact source requests must stay live, so only the app's own files are cached.
  if(new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      if(cachedResponse) return cachedResponse;

      return fetch(event.request).then(function(response) {
        if(response && response.ok) {
          var responseCopy = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseCopy);
          });
        }

        return response;
      }).catch(function() {
        return caches.match('index.html');
      });
    })
  );
});

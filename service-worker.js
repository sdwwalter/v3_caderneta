/* Service Worker da Caderneta de Campo — escopo restrito a /v3_caderneta/ */
'use strict';

const CACHE_NAME = 'caderneta-campo-shell-v1';
const SCOPE_URL = self.registration.scope;
const APP_URL = new URL('./', SCOPE_URL).href;
const INDEX_URL = new URL('index.html', SCOPE_URL).href;
const APP_SHELL = [
  APP_URL,
  INDEX_URL,
  new URL('manifest.webmanifest', SCOPE_URL).href,
  new URL('icons/icon-192.png', SCOPE_URL).href,
  new URL('icons/icon-512.png', SCOPE_URL).href,
  new URL('icons/icon-512-maskable.png', SCOPE_URL).href,
  new URL('icons/apple-touch-icon.png', SCOPE_URL).href
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) {
          if (key.startsWith('caderneta-campo-shell-') && key !== CACHE_NAME) {
            return caches.delete(key);
          }
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const request = event.request;
  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;
  if (!requestUrl.href.startsWith(SCOPE_URL)) return;

  // Na navegação, tenta a versão publicada mais recente e usa a cópia local sem internet.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          if (response && response.ok) {
            const copy = response.clone();
            event.waitUntil(
              caches.open(CACHE_NAME).then(function (cache) {
                return Promise.all([
                  cache.put(APP_URL, copy),
                  cache.put(INDEX_URL, response.clone())
                ]);
              })
            );
          }
          return response;
        })
        .catch(function () {
          return caches.match(request).then(function (cached) {
            if (cached) return cached;
            return caches.match(APP_URL).then(function (appPage) {
              return appPage || caches.match(INDEX_URL);
            });
          });
        })
    );
    return;
  }

  // Manifesto, ícones e arquivos locais: cache primeiro; rede como alternativa.
  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      });
    })
  );
});

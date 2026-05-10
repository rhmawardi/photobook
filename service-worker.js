const CACHE_NAME = 'photobook-v9';

const APP_SHELL = [
  './',
  './index.html',
  './makassar.html',
  './manado.html',
  './tomohon.html',
  './manifest.webmanifest',
  './assets/css/index.css',
  './assets/css/custom-albums.css',
  './assets/css/album-delete.css',
  './assets/css/pwa.css',
  './assets/css/static-album-editor.css',
  './assets/js/index.js',
  './assets/js/cloud-config.js',
  './assets/js/cloud-storage.js',
  './assets/js/custom-albums.js',
  './assets/js/album-delete.js',
  './assets/js/pwa.js',
  './assets/js/static-album-editor.js',
  './assets/js/tailwind-config.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './images/cover.png',
  './images/photo1.jpg',
  './images/photo2.jpg',
  './images/photo4.jpg',
  './images/photo6.jpg',
  './images/manado1.jpg',
  './images/manado2.jpg',
  './images/manado3.jpg',
  './images/manado4.jpg',
  './images/1.jpg',
  './images/2.jpg',
  './images/4%20ori.jpg',
  './images/6%20ori.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      });
    })
  );
});










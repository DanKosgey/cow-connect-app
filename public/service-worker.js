// Service Worker for Cow Connect App
const CACHE_NAME = 'cow-connect-v1';
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/favicon.ico',
  '/src/index.css',
  '/src/assets/dairy-farm-hero.jpg',
];

const CACHE_STRATEGIES = {
  STATIC: 'static',
  NETWORK_FIRST: 'network-first',
  CACHE_FIRST: 'cache-first',
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Cache static assets
      await cache.addAll(STATIC_ASSETS);
      // Cache offline page
      const offlineResponse = new Response(
        '<html><body><h1>Offline</h1><p>Please check your internet connection.</p></body></html>',
        {
          headers: { 'Content-Type': 'text/html' },
        }
      );
      await cache.put(OFFLINE_URL, offlineResponse);
    })()
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheKeys = await caches.keys();
      const deletions = cacheKeys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key));
      await Promise.all(deletions);

      // Take control of all pages immediately
      await self.clients.claim();
    })()
  );
});

// Fetch event - handle offline content
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Handle different caching strategies based on URL
  let strategy = CACHE_STRATEGIES.NETWORK_FIRST;

  // Static assets use cache-first
  if (STATIC_ASSETS.includes(url.pathname)) {
    strategy = CACHE_STRATEGIES.STATIC;
  }
  // API calls use network-first
  else if (url.pathname.startsWith('/api/')) {
    strategy = CACHE_STRATEGIES.NETWORK_FIRST;
  }
  // Other assets use cache-first
  else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico)$/)) {
    strategy = CACHE_STRATEGIES.CACHE_FIRST;
  }

  event.respondWith(handleFetch(event.request, strategy));
});

// Handle background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-collections') {
    event.waitUntil(syncCollections());
  }
});

// Listen for push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'New Update', {
      body: data.body ?? 'You have a new update in Cow Connect',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: data.data,
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      const hadWindowToFocus = clientList.some((client) =>
        client.url.includes(self.location.origin)
          ? (client.focus(), true)
          : false
      );

      if (!hadWindowToFocus) {
        self.clients
          .openWindow('/')
          .then((client) => client?.focus());
      }
    })
  );
});

// Fetch handling with different strategies
async function handleFetch(request, strategy) {
  try {
    switch (strategy) {
      case CACHE_STRATEGIES.STATIC:
        return await handleStatic(request);
      case CACHE_STRATEGIES.NETWORK_FIRST:
        return await handleNetworkFirst(request);
      case CACHE_STRATEGIES.CACHE_FIRST:
        return await handleCacheFirst(request);
      default:
        return await fetch(request);
    }
  } catch (error) {
    return await handleOffline(request);
  }
}

// Static assets - always from cache
async function handleStatic(request) {
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match(request);
  return response ?? await fetch(request);
}

// Network-first strategy
async function handleNetworkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached ?? await handleOffline(request);
  }
}

// Cache-first strategy
async function handleCacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    await cache.put(request, response.clone());
    return response;
  } catch (error) {
    return await handleOffline(request);
  }
}

// Offline fallback
async function handleOffline(request) {
  if (request.headers.get('Accept')?.includes('text/html')) {
    return await caches.match(OFFLINE_URL);
  }
  return new Response(null, { status: 504 });
}

// Sync collections
async function syncCollections() {
  const db = await openDB();
  const collections = await db
    .transaction('collections')
    .objectStore('collections')
    .getAll();

  for (const collection of collections) {
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collection),
      });

      if (response.ok) {
        await db
          .transaction('collections', 'readwrite')
          .objectStore('collections')
          .delete(collection.id);
      }
    } catch (error) {
      console.error('Sync failed for collection:', collection.id, error);
    }
  }
}
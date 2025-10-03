/// <reference lib="webworker" />

const CACHE_NAME = 'cow-connect-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache
const ASSETS_TO_CACHE = [
  '/',
  OFFLINE_URL,
  '/staff/collections',
  '/staff/route',
  '/staff/performance',
  '/assets/dairy-farm-hero.jpg',
  '/favicon.ico',
  '/manifest.json',
];

// API routes that should be cached with network-first strategy
const API_ROUTES = [
  '/api/farmers',
  '/api/collections',
  '/api/routes',
];

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Cache all static assets
      await cache.addAll(ASSETS_TO_CACHE);
      // Cache offline page
      await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
    })()
  );
  // Force waiting service worker to become active
  self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      // Clear old caches
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
      // Take control of all pages under this service worker's scope
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;

  // Handle API requests with network-first strategy
  if (API_ROUTES.some(route => request.url.includes(route))) {
    event.respondWith(
      (async () => {
        try {
          // Try network first
          const response = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
          return response;
        } catch (error) {
          // Fallback to cache if network fails
          const cachedResponse = await caches.match(request);
          return cachedResponse || new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })()
    );
    return;
  }

  // For all other requests, try cache first, then network
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const response = await fetch(request);
        // Cache successful responses
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        // Show offline page for navigation requests
        if (request.mode === 'navigate') {
          const cache = await caches.open(CACHE_NAME);
          return cache.match(OFFLINE_URL);
        }
        throw error;
      }
    })()
  );
});

// Handle background sync for offline collections
self.addEventListener('sync', (event: SyncEvent) => {
  if (event.tag === 'sync-collections') {
    event.waitUntil(syncCollections());
  }
});

// Sync offline collections when back online
async function syncCollections() {
  const cache = await caches.open(CACHE_NAME);
  const offlineCollections = await cache.match('offline-collections');
  
  if (!offlineCollections) return;

  const collections = await offlineCollections.json();
  
  for (const collection of collections) {
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collection),
      });

      if (!response.ok) throw new Error('Failed to sync collection');
      
      // Remove synced collection from cache
      const updatedCollections = collections.filter(c => c.id !== collection.id);
      await cache.put(
        'offline-collections',
        new Response(JSON.stringify(updatedCollections))
      );
    } catch (error) {
      console.error('Failed to sync collection:', error);
      // Keep failed collections in cache for retry
    }
  }
}
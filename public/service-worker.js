// Service Worker for DAIRY FARMERS OF TRANS-NZOIA App
const CACHE_NAME = 'dairy-farmers-v3';
const OFFLINE_URL = '/offline.html';

// Pre-cache critical assets for faster initial load
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
].filter(Boolean);

// Cache versioning for better cache busting
const CACHE_VERSION = 'v4';
const CACHE_KEY = `${CACHE_NAME}-${CACHE_VERSION}`;

// Cache strategies
const CACHE_STRATEGIES = {
  STATIC: 'static',
  NETWORK_FIRST: 'network-first',
  CACHE_FIRST: 'cache-first',
};

// URLs that should not be cached (development resources, Supabase requests, etc.)
const EXCLUDE_FROM_CACHE = [
  // Development resources
  '@react-refresh',
  'node_modules',
  '__vite',
  '@vite',
  // Supabase resources
  '.supabase.co',
  // HMR (Hot Module Replacement)
  'hot-update',
  // WebSocket connections
  'ws://',
  'wss://',
  // Vite development parameters
  '?t=',
  '&t=',
  '?v=',
  '&v=',
  '__WB_REVISION__',
  'type=',
  'lang=',
  'import',
  // Chrome extensions
  'chrome-extension:',
  // Bundle files that should be handled by the browser
  '.js',
  '.css'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_KEY);
      
      // Cache static assets with error handling
      const cachePromises = STATIC_ASSETS.map(async (asset) => {
        try {
          const response = await fetch(asset);
          if (response.ok) {
            await cache.put(asset, response);
          } else {
            console.warn(`Failed to cache ${asset}: ${response.status} ${response.statusText}`);
          }
        } catch (error) {
          console.warn(`Failed to cache ${asset}:`, error);
        }
      });
      
      await Promise.all(cachePromises);
      
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
  // Force waiting service worker to become active immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheKeys = await caches.keys();
      const deletions = cacheKeys
        .filter((key) => key !== CACHE_KEY)
        .map((key) => caches.delete(key));
      await Promise.all(deletions);

      // Take control of all pages immediately
      await self.clients.claim();
    })()
  );
});

// Fetch event - handle requests with optimized strategies
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip caching for excluded URLs
  if (EXCLUDE_FROM_CACHE.some(exclude => event.request.url.includes(exclude))) {
    return;
  }

  // Skip caching for development environment requests
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '0.0.0.0') {
    return;
  }

  // Skip caching for Supabase requests (they should be handled by React Query)
  if (url.hostname.includes('supabase')) {
    return;
  }
  
  // Skip caching for API requests (they should be handled by React Query)
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  
  // Skip caching for auth requests
  if (url.pathname.startsWith('/auth/')) {
    return;
  }

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
  // Other assets use cache-first for better performance
  else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
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
      body: data.body ?? 'You have a new update in DAIRY FARMERS OF TRANS-NZOIA',
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
  const cache = await caches.open(CACHE_KEY);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) return cachedResponse;
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return cachedResponse;
  }
}

// Network-first strategy with optimized caching
async function handleNetworkFirst(request) {
  try {
    const response = await fetch(request);
    // Only cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_KEY);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Fallback to cache if network fails
    const cached = await caches.match(request);
    return cached ?? await handleOffline(request);
  }
}

// Cache-first strategy with network fallback and timeout
async function handleCacheFirst(request) {
  const cache = await caches.open(CACHE_KEY);
  const cached = await cache.match(request);
  
  // Return cached version immediately if available
  if (cached) return cached;

  try {
    // Set a timeout for network requests
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 5000)
    );
    
    const response = await Promise.race([
      fetch(request),
      timeoutPromise
    ]);
    
    // Only cache successful responses
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return await handleOffline(request);
  }
}

// Offline fallback
async function handleOffline(request) {
  // For navigation requests, show offline page
  if (request.mode === 'navigate') {
    const cache = await caches.open(CACHE_KEY);
    const offlinePage = await cache.match(OFFLINE_URL);
    return offlinePage || new Response('Offline', { status: 503 });
  }
  // For other requests, return a simple error response
  return new Response(JSON.stringify({ error: 'Network error' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Sync collections when back online
async function syncCollections() {
  // Implementation would go here
  console.log('Syncing collections when back online');
}
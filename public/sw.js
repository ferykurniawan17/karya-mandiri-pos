// Service Worker for POS Karya Mandiri PWA
const CACHE_NAME = 'pos-karya-mandiri-v1'
const STATIC_CACHE_NAME = 'pos-karya-mandiri-static-v1'
const API_CACHE_NAME = 'pos-karya-mandiri-api-v1'

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...')
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return (
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== API_CACHE_NAME &&
              cacheName !== CACHE_NAME
            )
          })
          .map((cacheName) => {
            console.log('[Service Worker] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          })
      )
    })
  )
  return self.clients.claim()
})

// Fetch event - implement cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return
  }

  // Static assets - Cache First strategy
  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME))
    return
  }

  // API calls - Network First with IndexedDB fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithFallback(request))
    return
  }

  // HTML pages - Stale While Revalidate
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  // Default - Network First
  event.respondWith(networkFirst(request))
})

// Cache First strategy - for static assets
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) {
    return cached
  }
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.error('[Service Worker] Cache First error:', error)
    throw error
  }
}

// Network First strategy - for dynamic content
async function networkFirst(request) {
  const cache = await caches.open(API_CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', error)
    const cached = await cache.match(request)
    if (cached) {
      return cached
    }
    throw error
  }
}

// Network First with IndexedDB fallback - for API calls
async function networkFirstWithFallback(request) {
  const cache = await caches.open(API_CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.log('[Service Worker] API call failed, using cache/IndexedDB:', error)
    // Try cache first
    const cached = await cache.match(request)
    if (cached) {
      return cached
    }
    // If no cache, return error - IndexedDB will be handled by api-client
    return new Response(
      JSON.stringify({ error: 'Offline', offline: true }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

// Stale While Revalidate - for HTML pages
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  })
  return cached || fetchPromise
}

// Background Sync for offline operations
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag)
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData())
  }
})

async function syncData() {
  try {
    // Notify all clients that sync is starting
    const clients = await self.clients.matchAll()
    clients.forEach((client) => {
      client.postMessage({ type: 'SYNC_START' })
    })

    // Sync logic will be handled by the main app via IndexedDB
    // This is just a trigger
    console.log('[Service Worker] Background sync triggered')
  } catch (error) {
    console.error('[Service Worker] Background sync error:', error)
  }
}

// Message handler for manual sync requests
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  if (event.data && event.data.type === 'SYNC_REQUEST') {
    event.waitUntil(syncData())
  }
})


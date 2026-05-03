const CACHE_NAME = 'eligtasmo-v1.0.0';
const STATIC_CACHE = 'eligtasmo-static-v1.0.0';
const DYNAMIC_CACHE = 'eligtasmo-dynamic-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Add other critical assets
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/routes/,
  /\/api\/incidents/,
  /\/api\/shelters/,
  /\/api\/analytics/
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Error caching static files', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Serve cached page or fallback
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return offline page
              return caches.match('/index.html');
            });
        })
    );
    return;
  }

  // Handle API requests
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Serve cached API response if available
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return offline indicator
              return new Response(
                JSON.stringify({ 
                  error: 'Offline', 
                  message: 'This data is not available offline' 
                }),
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
        })
    );
    return;
  }

  // Handle static assets
  if (request.destination === 'image' || 
      request.destination === 'script' || 
      request.destination === 'style' ||
      request.destination === 'font') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(request)
            .then((response) => {
              // Cache successful responses
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE)
                  .then((cache) => cache.put(request, responseClone));
              }
              return response;
            })
            .catch(() => {
              // Return placeholder for failed image requests
              if (request.destination === 'image') {
                return new Response(
                  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f3f4f6"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#9ca3af">Image unavailable</text></svg>',
                  { headers: { 'Content-Type': 'image/svg+xml' } }
                );
              }
              throw error;
            });
        })
    );
    return;
  }

  // Default: try network first, then cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'route-request') {
    event.waitUntil(syncRouteRequests());
  } else if (event.tag === 'incident-report') {
    event.waitUntil(syncIncidentReports());
  } else if (event.tag === 'analytics-data') {
    event.waitUntil(syncAnalyticsData());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  let notificationData = {
    title: 'EligTasmo Alert',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'default',
    requireInteraction: false,
    actions: []
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
      
      // Add actions based on notification type
      if (data.type === 'emergency') {
        notificationData.actions = [
          { action: 'view', title: 'View Details' },
          { action: 'route', title: 'Plan Route' }
        ];
        notificationData.requireInteraction = true;
      } else if (data.type === 'route') {
        notificationData.actions = [
          { action: 'navigate', title: 'Start Navigation' },
          { action: 'save', title: 'Save Route' }
        ];
      }
    } catch (error) {
      console.error('Service Worker: Error parsing push data', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event.action);
  
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};

  let url = '/';
  
  switch (action) {
    case 'view':
      url = notificationData.url || '/incidents';
      break;
    case 'route':
      url = '/routes';
      break;
    case 'navigate':
      url = `/routes/navigate?id=${notificationData.routeId}`;
      break;
    case 'save':
      // Handle save action
      handleSaveRoute(notificationData.routeId);
      return;
    default:
      url = notificationData.url || '/';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(url.split('?')[0]) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window/tab
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Sync functions
async function syncRouteRequests() {
  try {
    const requests = await getStoredRequests('route-requests');
    
    for (const request of requests) {
      try {
        const response = await fetch('/api/routes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request.data)
        });
        
        if (response.ok) {
          await removeStoredRequest('route-requests', request.id);
          console.log('Service Worker: Route request synced successfully');
        }
      } catch (error) {
        console.error('Service Worker: Error syncing route request', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Error in syncRouteRequests', error);
  }
}

async function syncIncidentReports() {
  try {
    const reports = await getStoredRequests('incident-reports');
    
    for (const report of reports) {
      try {
        const response = await fetch('/api/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report.data)
        });
        
        if (response.ok) {
          await removeStoredRequest('incident-reports', report.id);
          console.log('Service Worker: Incident report synced successfully');
        }
      } catch (error) {
        console.error('Service Worker: Error syncing incident report', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Error in syncIncidentReports', error);
  }
}

async function syncAnalyticsData() {
  try {
    const analytics = await getStoredRequests('analytics-data');
    
    for (const data of analytics) {
      try {
        const response = await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.data)
        });
        
        if (response.ok) {
          await removeStoredRequest('analytics-data', data.id);
          console.log('Service Worker: Analytics data synced successfully');
        }
      } catch (error) {
        console.error('Service Worker: Error syncing analytics data', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Error in syncAnalyticsData', error);
  }
}

// Helper functions for IndexedDB operations
async function getStoredRequests(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('EligTasmoOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
  });
}

async function removeStoredRequest(storeName, id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('EligTasmoOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

async function handleSaveRoute(routeId) {
  try {
    // Implementation for saving route offline
    console.log('Service Worker: Saving route', routeId);
  } catch (error) {
    console.error('Service Worker: Error saving route', error);
  }
}

// Periodic background sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-incidents') {
    event.waitUntil(updateIncidentData());
  } else if (event.tag === 'sync-analytics') {
    event.waitUntil(syncAnalyticsData());
  }
});

async function updateIncidentData() {
  try {
    const response = await fetch('/api/incidents/latest');
    if (response.ok) {
      const data = await response.json();
      // Cache the latest incident data
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put('/api/incidents/latest', new Response(JSON.stringify(data)));
      console.log('Service Worker: Incident data updated');
    }
  } catch (error) {
    console.error('Service Worker: Error updating incident data', error);
  }
}

console.log('Service Worker: Loaded successfully');

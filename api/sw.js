// ============================================
// SERVICE WORKER - Push Notifications Handler
// ============================================

// ============================================
// CACHE MANAGEMENT
// ============================================

// Version number = Cache name - Changing version creates new cache
const CACHE_NAME = 'success-technology-v3.1.89999999999'; // Increment this to create new cache

// Assets to cache on install
const ASSETS_TO_CACHE = [
    '/',
];

const DEFAULT_NOTIFICATION = {
    title: 'Success Technology',
    body: 'You have a new notification',
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: {
        url: '/',
        fullUrl: '/'
    }
};

// Different action buttons per notification type
const ACTIONS_BY_TYPE = {
    order: [
        { action: 'open',  title: 'Voir la commande' },
        { action: 'close', title: 'Fermer' }
    ],
    new_product: [
        { action: 'open',  title: 'Voir le produit' },
        { action: 'close', title: 'Fermer' }
    ],
    deal: [
        { action: 'open',  title: 'Voir la promo' },
        { action: 'close', title: 'Fermer' }
    ],
    deal_end: [
        { action: 'open',  title: 'Voir le produit' },
        { action: 'close', title: 'Fermer' }
    ],
    general: [
        { action: 'open',  title: 'Ouvrir' },
        { action: 'close', title: 'Fermer' }
    ],
    test: [
        { action: 'open',  title: 'Ouvrir' },
        { action: 'close', title: 'Fermer' }
    ]
};

function getActionsForType(type) {
    return ACTIONS_BY_TYPE[type] || ACTIONS_BY_TYPE.general;
}
// ============================================
// INSTALL EVENT - Cache static assets
// ============================================
self.addEventListener('install', function(event) {
    console.log('[Service Worker] Installing...', CACHE_NAME);
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('[Service Worker] Caching app shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(function() {
                console.log('[Service Worker] Install complete');
                // Skip waiting to activate immediately
                return self.skipWaiting();
            })
            .catch(function(error) {
                console.error('[Service Worker] Install failed:', error);
            })
    );
});

// ============================================
// ACTIVATE EVENT - Clean up old caches
// ============================================
self.addEventListener('activate', function(event) {
    console.log('[Service Worker] Activating...', CACHE_NAME);
    
    event.waitUntil(
        Promise.all([
            // Get all cache keys
            caches.keys()
                .then(function(cacheNames) {
                    console.log('[Service Worker] Existing caches:', cacheNames);
                    
                    // Delete old caches (different version numbers)
                    return Promise.all(
                        cacheNames.map(function(cacheName) {
                            if (cacheName !== CACHE_NAME) {
                                console.log('[Service Worker] Deleting old cache:', cacheName);
                                return caches.delete(cacheName);
                            }
                        })
                    );
                }),
            
            // Claim all clients to take control
            clients.claim()
                .then(function() {
                    console.log('[Service Worker] Clients claimed');
                })
        ])
        .then(function() {
            console.log('[Service Worker] Activation complete - Old caches deleted');
        })
        .catch(function(error) {
            console.error('[Service Worker] Activation error:', error);
        })
    );
});

// ============================================
// FETCH EVENT - Serve from cache or network
// ============================================
self.addEventListener('fetch', function(event) {
    // Don't intercept chrome-extension requests or non-GET requests
    if (!event.request.url.startsWith('http') || event.request.method !== 'GET') {
        event.respondWith(fetch(event.request));
        return;
    }

    // Avoid caching any cross-origin requests (including Supabase assets)
    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin) {
        event.respondWith(fetch(event.request));
        return;
    }
    
    event.respondWith(
        fetch(event.request)
                    .then(function(fetchResponse) {
                        // Check if we received a valid response
                        if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                            return fetchResponse;
                        }
                        
                        // Clone the response for caching
                        const responseToCache = fetchResponse.clone();
                        
                        // Add to cache for future use
                        caches.open(CACHE_NAME)
                            .then(function(cache) {
                                cache.put(event.request, responseToCache)
                                    .then(() => {
                                        console.log('[Service Worker] Cached new resource:', event.request.url);
                                    })
                                    .catch(err => {
                                        console.warn('[Service Worker] Failed to cache resource:', err);
                                    });
                            });
                        
                        return fetchResponse;
                    })
                    .catch(function(error) {
                        console.warn('[Service Worker] Fetch failed:', error);
                        return caches.match(event.request).then(function(response) {
                            if (response) return response;
                            if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
                                return caches.match('/offline.html').then(function(offlineResponse) {
                                    return offlineResponse || new Response(
                                        '<h1>You are offline</h1><p>Please check your internet connection.</p>',
                                        { headers: { 'Content-Type': 'text/html' } }
                                    );
                                });
                            }
                            return new Response('Network error occurred', { status: 503 });
                        });
                    })
            .catch(function(error) {
                console.error('[Service Worker] Fetch error:', error);
                
                // Fallback response
                return new Response('Service unavailable', { 
                    status: 503,
                    headers: { 'Content-Type': 'text/plain' }
                });
            })
    );
});

// ============================================
// PUSH EVENT HANDLER - with client broadcast + IndexedDB fallback
// ============================================

// ---------- IndexedDB mini-helper (SW-safe) ----------
const SW_DB_NAME = 'st_push_queue';
const SW_STORE   = 'pending_notifications';

function swOpenDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(SW_DB_NAME, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(SW_STORE)) {
                db.createObjectStore(SW_STORE, { keyPath: 'id', autoIncrement: true });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror   = () => reject(req.error);
    });
}

async function swQueueForLater(entry) {
    try {
        const db = await swOpenDB();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(SW_STORE, 'readwrite');
            tx.objectStore(SW_STORE).add({ ...entry, queuedAt: new Date().toISOString() });
            tx.oncomplete = resolve;
            tx.onerror    = () => reject(tx.error);
        });
        console.log('[Service Worker] Queued push for later:', entry);
    } catch (err) {
        console.warn('[Service Worker] Failed to queue push:', err);
    }
}

self.addEventListener('push', function(event) {
    console.log('[Service Worker] Push Received:', event);

    let notificationData = {};

    try {
        if (event.data) {
            const parsedData = event.data.json();
            console.log('[Service Worker] Parsed push data:', parsedData);

            const baseUrl = self.location.origin;

            // Extract everything the server sent — no assumptions
            const type    = parsedData.type || parsedData.data?.type || 'general';
            const title   = parsedData.title || parsedData.notification?.title || DEFAULT_NOTIFICATION.title;
            const body    = parsedData.body  || parsedData.notification?.body  || parsedData.text || DEFAULT_NOTIFICATION.body;
            const icon    = parsedData.icon  || parsedData.notification?.icon  || DEFAULT_NOTIFICATION.icon;
            const badge   = parsedData.badge || parsedData.notification?.badge || DEFAULT_NOTIFICATION.badge;
            const image   = parsedData.image || parsedData.data?.image || null;
            const orderId = parsedData.orderId || parsedData.data?.orderId || null;
            const url     = parsedData.url || parsedData.data?.url || null;
            const extra   = parsedData.data || {};

            // Build the click target — order-specific only when it's an order
            let fullUrl;
            if (url && url.startsWith('http')) {
                fullUrl = url;
            } else if (url) {
                fullUrl = baseUrl + url;
            } else if (type === 'order' && orderId) {
                fullUrl = baseUrl + '/orders/?order=' + encodeURIComponent(orderId);
            } else {
                fullUrl = baseUrl + '/';
            }

            notificationData = {
                title,
                body,
                icon,
                badge,
                image,
                type,
                data: {
                    url: fullUrl,
                    fullUrl: fullUrl,
                    type,
                    ...(type === 'order' && orderId ? { orderId } : {}),
                    ...extra
                }
            };
        } else {
            notificationData = {
                ...DEFAULT_NOTIFICATION,
                data: {
                    ...DEFAULT_NOTIFICATION.data,
                    url: self.location.origin + '/',
                    fullUrl: self.location.origin + '/'
                }
            };
        }

        // ---------- Broadcast to open clients (or queue for later) ----------
        const broadcastPromise = clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                if (clientList.length === 0) {
                    return swQueueForLater({
                        title: notificationData.title,
                        body:  notificationData.body,
                        icon:  notificationData.icon,
                        image: notificationData.image,
                        url:   notificationData.data?.fullUrl,
                        type:  notificationData.type,
                        ...(notificationData.data?.orderId ? { orderId: notificationData.data.orderId } : {})
                    });
                }

                clientList.forEach(client => {
                    client.postMessage({
                        type: 'PUSH_RECEIVED',
                        payload: {
                            title: notificationData.title,
                            body:  notificationData.body,
                            icon:  notificationData.icon,
                            image: notificationData.image,
                            url:   notificationData.data?.fullUrl,
                            type:  notificationData.type,
                            ...(notificationData.data?.orderId ? { orderId: notificationData.data.orderId } : {}),
                            receivedAt: new Date().toISOString()
                        }
                    });
                });
                return Promise.resolve();
            });

        // ---------- Show the notification (with per-type actions) ----------
        event.waitUntil(
            Promise.all([
                broadcastPromise,
                self.registration.showNotification(notificationData.title, {
                    body: notificationData.body,
                    icon: notificationData.icon,
                    badge: notificationData.badge,
                    ...(notificationData.image ? { image: notificationData.image } : {}),
                    vibrate: DEFAULT_NOTIFICATION.vibrate,
                    data: notificationData.data,
                    requireInteraction: DEFAULT_NOTIFICATION.requireInteraction,
                    actions: getActionsForType(notificationData.type)   // ← per type
                })
            ])
        );

    } catch (error) {
        console.error('[Service Worker] Error processing push:', error);
        event.waitUntil(
            self.registration.showNotification(
                DEFAULT_NOTIFICATION.title,
                {
                    body: DEFAULT_NOTIFICATION.body,
                    icon: DEFAULT_NOTIFICATION.icon,
                    badge: DEFAULT_NOTIFICATION.badge,
                    vibrate: DEFAULT_NOTIFICATION.vibrate,
                    requireInteraction: DEFAULT_NOTIFICATION.requireInteraction,
                    data: {
                        url: self.location.origin + '/',
                        fullUrl: self.location.origin + '/',
                        type: 'general'
                    },
                    actions: getActionsForType('general')
                }
            )
        );
    }
});

// ============================================
// NOTIFICATION CLICK HANDLER - FIXED
// ============================================
self.addEventListener('notificationclick', function(event) {
    const notification = event.notification;
    const action = event.action;
    const data = notification.data || {};
    const type = data.type || 'general';

    notification.close();

    if (action === 'close') {
        console.log('[Service Worker] Notification dismissed');
        return;
    }

    // ---------- Build target URL ----------
    let targetUrl = data.fullUrl || data.url || '/';
    if (targetUrl.startsWith('/')) {
        targetUrl = self.location.origin + targetUrl;
    }

    // Only append orderId for ORDER notifications
    if (type === 'order' && data.orderId && !targetUrl.includes('order=')) {
        const sep = targetUrl.includes('?') ? '&' : '?';
        targetUrl += sep + 'order=' + encodeURIComponent(data.orderId);
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(clientList) {
                // Re-use a tab that's already on the target URL (or same page family)
                for (const client of clientList) {
                    if (client.url === targetUrl && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise navigate an existing tab
                for (const client of clientList) {
                    if ('navigate' in client) {
                        return client.navigate(targetUrl)
                            .then(c => c && c.focus())
                            .catch(() => clients.openWindow(targetUrl));
                    }
                }
                return clients.openWindow(targetUrl);
            })
            .catch(err => {
                console.error('[Service Worker] notificationclick error:', err);
                return clients.openWindow(self.location.origin);
            })
    );
});

// ============================================
// PUSH SUBSCRIPTION CHANGE HANDLER
// ============================================
self.addEventListener('pushsubscriptionchange', function(event) {
    console.log('[Service Worker] Subscription change:', event);
    
    const oldSubscription = event.oldSubscription;
    const newSubscription = event.newSubscription;
    
    if (oldSubscription && newSubscription) {
        // Notify server about subscription change
        event.waitUntil(
            fetch('/api/update-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    oldSubscription: oldSubscription,
                    newSubscription: newSubscription,
                    timestamp: new Date().toISOString()
                })
            })
            .then(response => {
                if (!response.ok) {
                    console.warn('[Service Worker] Failed to update subscription on server');
                }
                return response;
            })
            .catch(error => {
                console.error('[Service Worker] Error updating subscription:', error);
            })
        );
    }
});

// ============================================
// MESSAGE HANDLER (For testing/debugging) - FIXED
// ============================================
self.addEventListener('message', function(event) {
    const msg = event.data || {};
    
    if (!msg || !msg.type) return;
    
    console.log('[Service Worker] Message received:', msg);
    
    // Handle test push messages
    if (msg.type === 'TEST_PUSH' || msg.type === 'ORDER_CREATED') {
        const payload = msg.payload || {};
        const baseUrl = self.location.origin;
        
        const orderId = payload.orderId || payload.data?.orderId || payload.notification?.data?.orderId || null;
        const url = payload.url || payload.data?.url || payload.notification?.data?.url || null;
        
        // Construct the full URL
        let fullUrl = '/';
        if (url && url.startsWith('http')) {
            fullUrl = url;
        } else if (url) {
            fullUrl = baseUrl + url;
        } else if (orderId) {
            fullUrl = baseUrl + '/orders/?order=' + encodeURIComponent(orderId);
        } else {
            fullUrl = baseUrl + '/';
        }
        
        const title = payload.title || payload.notification?.title || 'Test Notification';
        const options = {
            body: payload.body || payload.notification?.body || payload.text || DEFAULT_NOTIFICATION.body,
            icon: payload.icon || payload.notification?.icon || DEFAULT_NOTIFICATION.icon,
            badge: payload.badge || payload.notification?.badge || DEFAULT_NOTIFICATION.badge,
            data: {
                url: fullUrl,
                fullUrl: fullUrl,
                orderId: orderId
            },
            vibrate: DEFAULT_NOTIFICATION.vibrate,
            requireInteraction: DEFAULT_NOTIFICATION.requireInteraction,
            actions: NOTIFICATION_ACTIONS
        };
        
        console.log('[Service Worker] Showing notification with URL:', fullUrl);
        
        self.registration.showNotification(title, options)
            .catch(error => {
                console.error('[Service Worker] Error showing test notification:', error);
            });
    }
    if (msg.type === 'DRAIN_PUSH_QUEUE') {
    (async () => {
        try {
            const db = await swOpenDB();
            const rows = await new Promise((resolve, reject) => {
                const tx = db.transaction(SW_STORE, 'readonly');
                const req = tx.objectStore(SW_STORE).getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror   = () => reject(req.error);
            });

            // Send them all to the client
            event.source?.postMessage({
                type: 'PUSH_QUEUE_DATA',
                payload: rows
            });

            // Clear the queue now that they've been delivered
            if (rows.length > 0) {
                await new Promise((resolve, reject) => {
                    const tx = db.transaction(SW_STORE, 'readwrite');
                    tx.objectStore(SW_STORE).clear();
                    tx.oncomplete = resolve;
                    tx.onerror    = () => reject(tx.error);
                });
                console.log('[Service Worker] Drained', rows.length, 'queued pushes');
            }
        } catch (err) {
            console.warn('[Service Worker] Failed to drain queue:', err);
        }
    })();
    return;
}

});
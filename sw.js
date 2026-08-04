// ============================================
// SERVICE WORKER - Push Notifications Handler
// ============================================

// ============================================
// CACHE MANAGEMENT
// ============================================

// Version number = Cache name - Changing version creates new cache
const CACHE_NAME = 'success-technology-v3.1.15'; // Increment this to create new cache

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
        orderId: null,
        fullUrl: '/'
    }
};

const NOTIFICATION_ACTIONS = [
    {
        action: 'open',
        title: 'View Order'
    },
    {
        action: 'close',
        title: 'Dismiss'
    }
];

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
        caches.match(event.request)
            .then(function(response) {
                // Cache hit - return cached response
                if (response) {
                    console.log('[Service Worker] Serving from cache:', event.request.url);
                    return response;
                }
                
                // Not in cache - fetch from network
                console.log('[Service Worker] Fetching from network:', event.request.url);
                return fetch(event.request)
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
                        
                        // Return offline page for HTML requests
                        if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/offline.html')
                                .then(function(offlineResponse) {
                                    return offlineResponse || new Response(
                                        '<h1>You are offline</h1><p>Please check your internet connection.</p>',
                                        { headers: { 'Content-Type': 'text/html' } }
                                    );
                                });
                        }
                        
                        // Return fallback for other resources
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
// PUSH EVENT HANDLER - FIXED
// ============================================
self.addEventListener('push', function(event) {
    console.log('[Service Worker] Push Received:', event);
    
    let notificationData = {};
    
    try {
        // Parse push data with fallback
        if (event.data) {
            const parsedData = event.data.json();
            console.log('[Service Worker] Parsed push data:', parsedData);
            
            // Get the base URL
            const baseUrl = self.location.origin;
            
            // Extract orderId and url from various possible locations
            const orderId = parsedData.orderId || 
                           parsedData.data?.orderId || 
                           parsedData.notification?.data?.orderId || 
                           null;
            
            const url = parsedData.url || 
                       parsedData.data?.url || 
                       parsedData.notification?.data?.url || 
                       null;
            
            // Construct the full URL
            let fullUrl = '/';
            if (url && url.startsWith('http')) {
                fullUrl = url; // Already absolute
            } else if (url) {
                fullUrl = baseUrl + url; // Relative to absolute
            } else if (orderId) {
                fullUrl = baseUrl + '/orders/?order=' + encodeURIComponent(orderId);
            } else {
                fullUrl = baseUrl + '/';
            }
            
            console.log('[Service Worker] Constructed URL:', fullUrl);
            console.log('[Service Worker] Order ID:', orderId);
            
            notificationData = {
                title: parsedData.title || parsedData.notification?.title || DEFAULT_NOTIFICATION.title,
                body: parsedData.body || parsedData.notification?.body || parsedData.text || DEFAULT_NOTIFICATION.body,
                icon: parsedData.icon || parsedData.notification?.icon || DEFAULT_NOTIFICATION.icon,
                badge: parsedData.badge || parsedData.notification?.badge || DEFAULT_NOTIFICATION.badge,
                data: {
                    url: fullUrl,
                    orderId: orderId,
                    fullUrl: fullUrl
                }
            };
        } else {
            // No data received - use default
            notificationData = { 
                ...DEFAULT_NOTIFICATION,
                data: {
                    ...DEFAULT_NOTIFICATION.data,
                    url: self.location.origin + '/',
                    fullUrl: self.location.origin + '/'
                }
            };
        }
        
        // Show notification with actions
        event.waitUntil(
            self.registration.showNotification(notificationData.title, {
                body: notificationData.body,
                icon: notificationData.icon,
                badge: notificationData.badge,
                vibrate: DEFAULT_NOTIFICATION.vibrate,
                data: notificationData.data,
                requireInteraction: DEFAULT_NOTIFICATION.requireInteraction,
                actions: NOTIFICATION_ACTIONS
            })
        );
        
    } catch (error) {
        console.error('[Service Worker] Error processing push:', error);
        
        // Fallback notification
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
                        orderId: null
                    }
                }
            )
        );
    }
});

// ============================================
// NOTIFICATION CLICK HANDLER - FIXED
// ============================================
self.addEventListener('notificationclick', function(event) {
    console.log('[Service Worker] Notification click event:', event);
    
    const notification = event.notification;
    const action = event.action;
    const data = notification.data || {};
    
    // Close the notification
    notification.close();
    
    console.log('[Service Worker] Notification data:', data);
    console.log('[Service Worker] Action:', action);
    
    // Get the URL - prefer fullUrl, then url, then construct from orderId
    let targetUrl = data.fullUrl || data.url || '/';
    const orderId = data.orderId || null;
    
    // If targetUrl is relative, make it absolute
    if (targetUrl.startsWith('/')) {
        targetUrl = self.location.origin + targetUrl;
    }
    
    // If there's an orderId and the URL doesn't contain it, add it
    if (orderId && !targetUrl.includes('order=')) {
        // Check if URL already has query params
        const separator = targetUrl.includes('?') ? '&' : '?';
        targetUrl = targetUrl + separator + 'order=' + encodeURIComponent(orderId);
    }
    
    console.log('[Service Worker] Final target URL:', targetUrl);
    console.log('[Service Worker] Order ID:', orderId);
    
    // Handle different actions
    if (action === 'open' || action === '') {
        event.waitUntil(
            clients.matchAll({ 
                type: 'window', 
                includeUncontrolled: true 
            })
            .then(function(clientList) {
                console.log('[Service Worker] Found clients:', clientList.length);
                
                // First try: Find existing client with this order ID
                let matchingClient = null;
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url && client.url.includes('order=' + orderId)) {
                        matchingClient = client;
                        break;
                    }
                }
                
                if (matchingClient) {
                    console.log('[Service Worker] Found existing client with order:', matchingClient.url);
                    return matchingClient.focus();
                }
                
                // Second try: Find any client that can navigate
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if ('navigate' in client) {
                        console.log('[Service Worker] Navigating existing client to:', targetUrl);
                        return client.navigate(targetUrl).then(() => {
                            return client.focus();
                        }).catch(err => {
                            console.warn('[Service Worker] Navigation failed:', err);
                            // If navigation fails, try opening new window
                            if (clients.openWindow) {
                                return clients.openWindow(targetUrl);
                            }
                        });
                    }
                }
                
                // Third try: Open new window
                if (clients.openWindow) {
                    console.log('[Service Worker] Opening new window to:', targetUrl);
                    return clients.openWindow(targetUrl);
                }
                
                // Final fallback: Open the home page
                console.log('[Service Worker] Opening home page as fallback');
                return clients.openWindow(self.location.origin);
            })
            .catch(error => {
                console.error('[Service Worker] Error handling notification click:', error);
                // Fallback - open the main page
                if (clients.openWindow) {
                    return clients.openWindow(self.location.origin);
                }
            })
        );
    } else if (action === 'close') {
        // Just dismiss, already closed
        console.log('[Service Worker] Notification dismissed');
    }
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
});
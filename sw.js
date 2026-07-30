self.addEventListener('push', function(event) {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        try { data = JSON.parse(event.data.text()); } catch (e2) { data = {}; }
    }

    const title = data.title || data.notification?.title || 'Notification';
    const options = {
        body: data.body || data.notification?.body || data.text || '',
        icon: data.icon || '/favicon.png',
        badge: data.badge || '/favicon.png',
        data: {
            url: data.url || data.notification?.data?.url || '/'
        }
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});

// Allow page to postMessage to SW to display notifications while page is active (test hook)
self.addEventListener('message', function(event) {
    const msg = event.data || {};
    if (!msg || !msg.type) return;

    if (msg.type === 'TEST_PUSH' || msg.type === 'ORDER_CREATED') {
        const p = msg.payload || {};
        const title = p.title || 'Test Notification';
        const options = {
            body: p.body || p.text || '',
            icon: p.icon || '/favicon.png',
            data: { url: p.url || '/' }
        };
        self.registration.showNotification(title, options);
    }
});
self.addEventListener('push', function(event) {
    console.log('[Service Worker] Push Received:', event);
    
    let notificationData = {};
    
    try {
        // Parse the push data
        if (event.data) {
            const data = event.data.json();
            notificationData = data;
        } else {
            notificationData = {
                title: 'New Notification',
                body: 'You have a new notification',
                icon: '/favicon.png',
                badge: '/favicon.png',
                data: {
                    url: '/',
                    orderId: null
                }
            };
        }
        
        // Default values if missing
        const title = notificationData.title || 'Sucess Technology';
        const body = notificationData.body || 'You have a new notification';
        const icon = notificationData.icon || '/favicon.png';
        const badge = notificationData.badge || '/favicon.png';
        const data = notificationData.data || {};
        
        // Show the notification
        event.waitUntil(
            self.registration.showNotification(title, {
                body: body,
                icon: icon,
                badge: badge,
                vibrate: [200, 100, 200],
                data: data,
                requireInteraction: true,
                actions: [
                    {
                        action: 'open',
                        title: 'View Order'
                    },
                    {
                        action: 'close',
                        title: 'Dismiss'
                    }
                ]
            })
        );
    } catch (error) {
        console.error('[Service Worker] Error processing push:', error);
        
        // Show fallback notification
        event.waitUntil(
            self.registration.showNotification('New Notification', {
                body: 'You have a new notification from Sucess Technology',
                icon: '/favicon.png',
                badge: '/favicon.png',
                vibrate: [200, 100, 200],
                requireInteraction: true
            })
        );
    }
});

// Notification click event
self.addEventListener('notificationclick', function(event) {
    console.log('[Service Worker] Notification click:', event);
    
    const notification = event.notification;
    const action = event.action;
    const data = notification.data || {};
    
    // Close the notification
    notification.close();
    
    // Handle different actions
    if (action === 'open' || action === '') {
        // Open the app or specific page
        const url = data.url || '/';
        const orderId = data.orderId || null;
        
        // Construct URL with order ID if available
        const targetUrl = orderId ? `${url}?order=${orderId}` : url;
        
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then(function(clientList) {
                    // Check if there's already a window open
                    for (let i = 0; i < clientList.length; i++) {
                        const client = clientList[i];
                        if (client.url.includes(targetUrl) && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    
                    // Open a new window
                    if (clients.openWindow) {
                        return clients.openWindow(targetUrl);
                    }
                })
        );
    }
});

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', function(event) {
    console.log('[Service Worker] Subscription change:', event);
    
    // Notify the server about the subscription change
    event.waitUntil(
        fetch('/api/update-subscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                oldSubscription: event.oldSubscription,
                newSubscription: event.newSubscription
            })
        })
    );
});
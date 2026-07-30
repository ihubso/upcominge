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

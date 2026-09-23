// push-notifications.js - Fixed & Optimized Version
const VAPID_CONFIG = {
    publicKey: 'BI-tM9VQcqAeco67R9VhA9TxByJyFjPgcMcqS_dhfOsve-BcVA5G_0fQIK9uVcECs_sbqnUGWOa1t5kFs-94FRg',
    privateKey: 'Y0tevI6hf8uyKQr1rqOzXjTOGTBKT4Fz_VV9jnYrlOs',
    email: 'austinlebechi02@gmail.com',
    supabase: {
        url: 'https://bulprhgwuwatzobiojwz.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bHByaGd3dXdhdHpvYmlvand6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDczNDksImV4cCI6MjA5MjA4MzM0OX0.2fcHrGX7iXw5G9nGRNkBy70W1Ex_om1C0v3qbryPmvw'
    }
};
class PushNotificationManager {
    constructor() {
        this.swRegistration = null;
        this.subscription = null;
        this.isSubscribed = false;
        this.vapidPublicKey = VAPID_CONFIG.publicKey;
        this.supabase = null;
        this.userId = null;
        this.initialized = false;
        this.maxRetries = 3;
    }
    
    getUserId() {
        if (typeof AppState !== 'undefined' && AppState.user?.id) {
            return AppState.user.id;
        }
        try {
            const stored = localStorage.getItem('st_customer') || sessionStorage.getItem('st_customer');
            if (stored) {
                const user = JSON.parse(stored);
                if (user?.id) return user.id;
            }
        } catch (e) {}
        
        try {
            const params = new URLSearchParams(window.location.search);
            const userId = params.get('user_id');
            if (userId && userId !== 'null') return userId;
        } catch (e) {}
        
        return null;
    }
    
    getSupabaseClient() {
        if (this.supabase) return this.supabase;
        try {
            if (typeof getSupabaseClient === 'function') {
                this.supabase = getSupabaseClient();
                return this.supabase;
            }
            if (typeof supabase !== 'undefined' && supabase.createClient) {
                this.supabase = supabase.createClient(
                    VAPID_CONFIG.supabase.url,
                    VAPID_CONFIG.supabase.anonKey
                );
                return this.supabase;
            }
            return null;
        } catch (error) {
            console.error('❌ Error getting Supabase client:', error);
            return null;
        }
    }
    
    async init() {
        if (this.initialized) return;
        
        try {
            console.log('🔔 Initializing Push Notification Manager...');
            
            if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
                console.warn('⚠️ Push notifications are not supported in this browser environment.');
                return false;
            }
            
            this.userId = this.getUserId();
            this.supabase = this.getSupabaseClient();
            
            await this.registerServiceWorker();
            
            const permission = Notification.permission;
            console.log(`📋 Notification permission state: ${permission}`);
            
            if (permission === 'granted') {
                await this.subscribeToPush();
                await this.loadSubscriptionFromServer();
                this.initialized = true;
                console.log('✅ Push Notification Manager initialized');
            } else if (permission === 'denied') {
                // Browser blocks re-requesting native prompt when denied; show custom guidance UI
                this.showPermissionDeniedPrompt();
            } else {
                // Default state - render custom banner to handle user-gesture requirement
                this.showPermissionRequestPrompt();
            }
            
            this.setupListeners();
            return true;
        } catch (error) {
            console.error('❌ Error initializing push notifications:', error);
            return false;
        }
    }

    showPermissionDeniedPrompt() {
        if (document.getElementById('stNotificationPrompt')) return;
        
        const promptHTML = `
            <div id="stNotificationPrompt" style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #1E293B; color: white; padding: 20px 24px; border-radius: 16px; box-shadow: 0 8px 40px rgba(0,0,0,0.3); z-index: 99999; max-width: 400px; width: 90%; text-align: center; font-family: sans-serif;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                    <div style="font-size: 32px;">🔔</div>
                    <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Notifications Blocked</h3>
                    <p style="margin: 0; font-size: 14px; color: #94A3B8; line-height: 1.5;">
                        Notifications are blocked in your browser settings. Click the lock/gear icon near the URL bar to enable notifications for this site.
                    </p>
                    <button onclick="document.getElementById('stNotificationPrompt').remove()" style="padding: 10px 20px; background: #6C3CE1; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer;">
                        Got It
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', promptHTML);
    }
    
    showPermissionRequestPrompt() {
        if (document.getElementById('stNotificationPrompt')) return;
        
        const promptHTML = `
            <div id="stNotificationPrompt" style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #1E293B; color: white; padding: 20px 24px; border-radius: 16px; box-shadow: 0 8px 40px rgba(0,0,0,0.3); z-index: 99999; max-width: 400px; width: 90%; text-align: center; font-family: sans-serif;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
                    <div style="font-size: 32px;">🔔</div>
                    <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Get Order Updates</h3>
                    <p style="margin: 0; font-size: 14px; color: #94A3B8; line-height: 1.5;">
                        Receive real-time notifications about your orders, deals, and updates.
                    </p>
                    <div style="display: flex; gap: 10px; margin-top: 8px;">
                        <button onclick="window.requestNotificationPermission()" style="padding: 10px 20px; background: #6C3CE1; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer;">
                            Enable Notifications
                        </button>
                        <button onclick="document.getElementById('stNotificationPrompt').remove()" style="padding: 10px 20px; background: transparent; color: #94A3B8; border: 1px solid #334155; border-radius: 10px; font-weight: 600; cursor: pointer;">
                            Not Now
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', promptHTML);
    }
    
    async requestNotificationPermission() {
        try {
            // Triggered on button click -> valid user gesture
            const permission = await Notification.requestPermission();
            console.log(`📋 Permission result: ${permission}`);
            
            const prompt = document.getElementById('stNotificationPrompt');
            if (prompt) prompt.remove();
            
            if (permission === 'granted') {
                await this.subscribeToPush();
                await this.loadSubscriptionFromServer();
                this.initialized = true;

            } else {
                this.showToast('⚠️ Notification permission was not granted.');
            }
        } catch (error) {
            console.error('❌ Error requesting permission:', error);
            this.showToast('❌ Failed to enable notifications.');
        }
    }
    
    showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
            background: #1E293B; color: white; padding: 12px 24px; border-radius: 12px;
            font-family: sans-serif; font-size: 14px; z-index: 99999;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3); max-width: 90%; text-align: center;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3300);
    }
    
    async registerServiceWorker() {
        if (navigator.serviceWorker.controller) {
            this.swRegistration = await navigator.serviceWorker.ready;
            return this.swRegistration;
        }
        this.swRegistration = await navigator.serviceWorker.register('/sw.js?v=3.1.31', { scope: '/' });
        return this.swRegistration;
    }
    
    async subscribeToPush() {
        if (!this.swRegistration) await this.registerServiceWorker();
        
        let existingSubscription = await this.swRegistration.pushManager.getSubscription();
        if (existingSubscription) {
            this.subscription = existingSubscription;
            this.isSubscribed = true;
            await this.saveSubscriptionToServer();
            return this.subscription;
        }
        
        const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
        this.subscription = await this.swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
        });
        this.isSubscribed = true;
        await this.saveSubscriptionToServer();
        return this.subscription;
    }
    
    async saveSubscriptionToServer() {
        if (!this.subscription) return;
        if (!this.userId) this.userId = this.getUserId();
        
        if (!this.userId || !this.supabase) {
            localStorage.setItem('push_subscription', JSON.stringify(this.subscription));
            return;
        }
        
        try {
            const subscriptionData = {
                user_id: this.userId,
                subscription: this.subscription,
                endpoint: this.subscription.endpoint,
                updated_at: new Date().toISOString()
            };
            
            await this.supabase.from('push_subscriptions').upsert(subscriptionData, { onConflict: 'endpoint' });
        } catch (error) {
            console.error('❌ Error saving subscription:', error);
            localStorage.setItem('push_subscription', JSON.stringify(this.subscription));
        }
    }
    
    async loadSubscriptionFromServer() {
        if (!this.userId) this.userId = this.getUserId();
        if (!this.userId || !this.supabase) return this.loadSubscriptionFromLocalStorage();
        
        try {
            const { data } = await this.supabase
                .from('push_subscriptions')
                .select('*')
                .eq('user_id', this.userId)
                .maybeSingle();
                
            if (data?.subscription) {
                this.subscription = data.subscription;
                this.isSubscribed = true;
                return data.subscription;
            }
        } catch (error) {
            console.error('❌ Error loading subscription:', error);
        }
        return this.loadSubscriptionFromLocalStorage();
    }
    
    loadSubscriptionFromLocalStorage() {
        const localSub = localStorage.getItem('push_subscription');
        if (localSub) {
            try {
                this.subscription = JSON.parse(localSub);
                this.isSubscribed = true;
                return this.subscription;
            } catch (e) {}
        }
        return null;
    }
    
    setupListeners() {
        navigator.serviceWorker?.addEventListener('controllerchange', () => this.subscribeToPush());
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') this.checkSubscription();
        });
        document.addEventListener('userLoggedIn', (event) => {
            this.userId = event.detail?.userId || this.getUserId();
            if (this.userId) this.saveSubscriptionToServer();
        });
    }
    
    async checkSubscription() {
        if (!this.swRegistration) return;
        const sub = await this.swRegistration.pushManager.getSubscription();
        if (!sub && this.isSubscribed) await this.subscribeToPush();
    }
    
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
}

// Global Push Instance Initialization
const pushManager = new PushNotificationManager();

window.requestNotificationPermission = function() {
    pushManager.requestNotificationPermission();
};

function getPushClientStorageKey() {
    try {
        // 1. Try customer_session
        const session = JSON.parse(
            localStorage.getItem('customer_session') || 'null'
        );

        let uid =
            session?.user?.id ||
            session?.user?.email ||
            null;

        // 2. Try AppState
        if (!uid && typeof AppState !== 'undefined') {
            uid = AppState.user?.id || AppState.user?.email || null;
        }

        // 3. Try URL user_id
        if (!uid) {
            const params = new URLSearchParams(
                window.location.search
            );

            uid = params.get('user_id');
        }

        // 4. Try URL email
        if (!uid) {
            const params = new URLSearchParams(
                window.location.search
            );

            uid = params.get('user_email');
        }

        if (uid) {
            return `st_order_notifications_${uid}`;
        }

    } catch (error) {
        console.warn(
            '⚠️ Could not determine notification user:',
            error
        );
    }

    return 'st_order_notifications_guest';
}

function saveOrderNotificationToLocal(entry) {
    console.log('💾 saveOrderNotificationToLocal() called:', entry);

    try {
        const key = getPushClientStorageKey();

        console.log('🔑 localStorage key:', key);

        const existing = JSON.parse(
            localStorage.getItem(key) || '[]'
        );

        console.log('📦 Existing notifications:', existing);

        const notification = {
            id: 'ordernotif_' +
                Date.now() +
                '_' +
                Math.random().toString(36).slice(2, 6),

            title: entry.title || 'Order Update',

            body: entry.body || '',

            orderId: entry.orderId || null,

            url: entry.url || null,

            image: entry.image || null,

            receivedAt:
                entry.receivedAt ||
                entry.queuedAt ||
                new Date().toISOString(),

            read: false
        };

        existing.unshift(notification);

        // Keep latest 100
        const trimmed = existing.slice(0, 100);

        localStorage.setItem(
            key,
            JSON.stringify(trimmed)
        );

        // Verify immediately
        const verify = localStorage.getItem(key);

        console.log(
            '💾 Order notification saved to localStorage:',
            notification
        );

        console.log(
            '✅ localStorage verification:',
            JSON.parse(verify)
        );

    } catch (err) {
        console.error(
            '❌ FAILED TO SAVE ORDER NOTIFICATION:',
            err
        );
    }
}
function setupServiceWorkerMessageBridge() {
    if (!('serviceWorker' in navigator)) {
        console.warn('❌ Service Worker is not supported');
        return;
    }

    console.log('🔌 Setting up Service Worker message bridge...');

    navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('📨 MESSAGE RECEIVED FROM SERVICE WORKER:', event.data);

        const msg = event.data || {};

        if (msg.type === 'PUSH_RECEIVED' && msg.payload) {

            console.log('🔔 PUSH_RECEIVED payload:', msg.payload);

            // Save to localStorage
            saveOrderNotificationToLocal(msg.payload);

            console.log(
                '💾 Order notification saved to localStorage:',
                msg.payload.orderId
            );

            // Add to your existing notification bell
            if (window.notificationSystem?.add) {
                window.notificationSystem.add(
                    msg.payload.title || 'Order Update',
                    msg.payload.body || '',
                    msg.payload.type || 'order',
                    msg.payload.url || null,
                    msg.payload.image || null
                );
            }

            return;
        }

        if (msg.type === 'PUSH_QUEUE_DATA' && Array.isArray(msg.payload)) {

            console.log(
                '📥 Received queued notifications:',
                msg.payload.length
            );

            msg.payload.forEach((entry) => {
                saveOrderNotificationToLocal(entry);
            });

            console.log(
                '💾 Saved queued notifications to localStorage'
            );

            return;
        }

        console.log('ℹ️ Unknown Service Worker message:', msg);
    });

    console.log('✅ Service Worker message bridge ready');
}

// Ask the SW to send us anything it queued while we were closed
async function requestQueuedPushesFromSW() {
    if (!('serviceWorker' in navigator)) return;
    try {
        const reg = await navigator.serviceWorker.ready;
        reg.active?.postMessage({ type: 'DRAIN_PUSH_QUEUE' });
    } catch (err) {
        console.warn('⚠️ Could not request push queue:', err);
    }
}

// Wire it up on page load
document.addEventListener('DOMContentLoaded', () => {
    setupServiceWorkerMessageBridge();
    requestQueuedPushesFromSW();
});
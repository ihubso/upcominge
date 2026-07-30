// push-notifications.js - Complete Push Notification System
// VAPID_CONFIG.js - Updated with proper keys
const VAPID_CONFIG = {
    // This is your VAPID public key - keep this visible
    publicKey: 'BI-tM9VQcqAeco67R9VhA9TxByJyFjPgcMcqS_dhfOsve-BcVA5G_0fQIK9uVcECs_sbqnUGWOa1t5kFs-94FRg',
    
    // NEVER expose private key in client-side code!
    // This should only be used on the server
    privateKey: 'Y0tevI6hf8uyKQr1rqOzXjTOGTBKT4Fz_VV9jnYrlOs',
    
    // Your contact email for the notification service
    email: 'austinlebechi02@gmail.com',
    
    // Supabase configuration
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
        this.supabase = getSupabase();
        this.userId = this.getUserId();
        this.initialized = false;
    }
    
    getUserId() {
        // Get or create a user ID
        let userId = localStorage.getItem('push_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('push_user_id', userId);
        }
        return userId;
    }
    
    async init() {
        if (this.initialized) return;
        
        try {
            console.log('🔔 Initializing Push Notification Manager...');
            
            // Check if browser supports notifications
            if (!('Notification' in window)) {
                console.warn('⚠️ This browser does not support notifications');
                return false;
            }
            
            // Check if service workers are supported
            if (!('serviceWorker' in navigator)) {
                console.warn('⚠️ Service workers not supported');
                return false;
            }
            
            // Check if push is supported
            if (!('PushManager' in window)) {
                console.warn('⚠️ Push notifications not supported');
                return false;
            }
            
            // Register service worker
            await this.registerServiceWorker();
            
            // Get permission
            const permission = await this.getPermission();
            if (permission !== 'granted') {
                console.warn('⚠️ Notification permission not granted');
                return false;
            }
            
            // Subscribe to push
            await this.subscribeToPush();
            
            // Load existing subscription from server
            await this.loadSubscriptionFromServer();
            
            // Setup listeners
            this.setupListeners();
            
            this.initialized = true;
            console.log('✅ Push Notification Manager initialized');
            return true;
            
        } catch (error) {
            console.error('❌ Error initializing push notifications:', error);
            return false;
        }
    }
    
    async registerServiceWorker() {
        try {
            // Register service worker
            this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            
            console.log('✅ Service Worker registered:', this.swRegistration);
            
            // Check for waiting service worker
            if (this.swRegistration.waiting) {
                console.log('🔄 Found waiting service worker, updating...');
                await this.swRegistration.update();
            }
            
            return this.swRegistration;
            
        } catch (error) {
            console.error('❌ Error registering service worker:', error);
            throw error;
        }
    }
    
    async getPermission() {
        // Check current permission status
        let permission = Notification.permission;
        
        if (permission === 'default') {
            // Request permission
            permission = await Notification.requestPermission();
        }
        
        console.log(`📋 Notification permission: ${permission}`);
        return permission;
    }
    
    async subscribeToPush() {
        try {
            if (!this.swRegistration) {
                await this.registerServiceWorker();
            }
            
            // Check if already subscribed
            let existingSubscription = await this.swRegistration.pushManager.getSubscription();
            
            if (existingSubscription) {
                console.log('📡 Already subscribed to push');
                this.subscription = existingSubscription;
                this.isSubscribed = true;
                await this.saveSubscriptionToServer();
                return this.subscription;
            }
            
            // Create new subscription
            const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
            
            const options = {
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            };
            
            this.subscription = await this.swRegistration.pushManager.subscribe(options);
            this.isSubscribed = true;
            
            console.log('📡 Push subscription created');
            
            // Save subscription to server
            await this.saveSubscriptionToServer();
            
            return this.subscription;
            
        } catch (error) {
            console.error('❌ Error subscribing to push:', error);
            throw error;
        }
    }
    
    async saveSubscriptionToServer() {
        if (!this.subscription) return;
        
        try {
            // Save to Supabase
            const { data, error } = await this.supabase
                .from('push_subscriptions')
                .upsert({
                    user_id: this.userId,
                    subscription: this.subscription,
                    endpoint: this.subscription.endpoint,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });
            
            if (error) {
                console.error('❌ Error saving subscription to Supabase:', error);
                
                // Fallback to localStorage
                localStorage.setItem('push_subscription', JSON.stringify(this.subscription));
            } else {
                console.log('✅ Subscription saved to Supabase');
            }
            
        } catch (error) {
            console.error('❌ Error saving subscription:', error);
            // Fallback to localStorage
            localStorage.setItem('push_subscription', JSON.stringify(this.subscription));
        }
    }
    
    async loadSubscriptionFromServer() {
        try {
            const { data, error } = await this.supabase
                .from('push_subscriptions')
                .select('*')
                .eq('user_id', this.userId)
                .single();
            
            if (error) {
                console.log('ℹ️ No subscription found on server');
                return null;
            }
            
            if (data && data.subscription) {
                console.log('📡 Loaded subscription from server');
                this.subscription = data.subscription;
                this.isSubscribed = true;
                return data.subscription;
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Error loading subscription:', error);
            return null;
        }
    }
    
    async unsubscribe() {
        try {
            if (!this.subscription) {
                console.warn('⚠️ No active subscription');
                return false;
            }
            
            const success = await this.subscription.unsubscribe();
            
            if (success) {
                this.isSubscribed = false;
                this.subscription = null;
                
                // Remove from Supabase
                await this.supabase
                    .from('push_subscriptions')
                    .delete()
                    .eq('user_id', this.userId);
                
                localStorage.removeItem('push_subscription');
                console.log('✅ Unsubscribed from push notifications');
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Error unsubscribing:', error);
            return false;
        }
    }
    
    setupListeners() {
        // Listen for service worker updates
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('🔄 Service worker controller changed');
            this.subscribeToPush();
        });
        
        // Listen for push subscription changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // Check if subscription is still valid
                this.checkSubscription();
            }
        });
    }
    
    async checkSubscription() {
        try {
            if (!this.swRegistration) return;
            
            const subscription = await this.swRegistration.pushManager.getSubscription();
            
            if (!subscription && this.isSubscribed) {
                console.warn('⚠️ Subscription lost, re-subscribing...');
                await this.subscribeToPush();
            }
            
        } catch (error) {
            console.error('❌ Error checking subscription:', error);
        }
    }
    
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        
        return outputArray;
    }
    
    // Send a test notification
    async sendTestNotification() {
        if (!this.isSubscribed) {
            console.warn('⚠️ Not subscribed to push');
            return false;
        }
        
        try {
            // Send via Supabase Edge Function
            const response = await fetch('/api/send-push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.userId,
                    title: 'Test Notification',
                    body: 'This is a test notification from Sucess Technology!',
                    data: {
                        url: '/',
                        orderId: null
                    }
                })
            });
            
            const result = await response.json();
            console.log('📤 Test notification sent:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Error sending test notification:', error);
            return false;
        }
    }
}

// Initialize the push manager
const pushManager = new PushNotificationManager();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    pushManager.init();
});

// Expose for use in other scripts
window.pushManager = pushManager;
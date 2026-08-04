// push-notifications.js - Fixed & Optimized Version

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
        this.swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
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

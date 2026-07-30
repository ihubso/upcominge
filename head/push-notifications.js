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
};// push-notifications.js - Fixed Version with Proper Error Handling

class PushNotificationManager {
    constructor() {
        this.swRegistration = null;
        this.subscription = null;
        this.isSubscribed = false;
        this.vapidPublicKey = VAPID_CONFIG.publicKey;
        this.supabase = getSupabaseClient();
        this.userId = this.getUserId();
        this.initialized = false;
        this.maxRetries = 3;
    }
    
    getUserId() {
       return getCurrentCustomerId();
    }
    
    async init() {
        if (this.initialized) return;
        
        try {
            console.log('🔔 Initializing Push Notification Manager...');
            
            if (!('Notification' in window)) {
                console.warn('⚠️ This browser does not support notifications');
                return false;
            }
            
            if (!('serviceWorker' in navigator)) {
                console.warn('⚠️ Service workers not supported');
                return false;
            }
            
            if (!('PushManager' in window)) {
                console.warn('⚠️ Push notifications not supported');
                return false;
            }
            
            await this.registerServiceWorker();
            
            const permission = await this.getPermission();
            if (permission !== 'granted') {
                console.warn('⚠️ Notification permission not granted');
                return false;
            }
            
            await this.subscribeToPush();
            await this.loadSubscriptionFromServer();
            
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
            this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            
            console.log('✅ Service Worker registered:', this.swRegistration);
            
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
        let permission = Notification.permission;
        
        if (permission === 'default') {
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
            
            let existingSubscription = await this.swRegistration.pushManager.getSubscription();
            
            if (existingSubscription) {
                console.log('📡 Already subscribed to push');
                this.subscription = existingSubscription;
                this.isSubscribed = true;
                await this.saveSubscriptionToServer();
                return this.subscription;
            }
            
            const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
            
            const options = {
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            };
            
            this.subscription = await this.swRegistration.pushManager.subscribe(options);
            this.isSubscribed = true;
            
            console.log('📡 Push subscription created');
            await this.saveSubscriptionToServer();
            
            return this.subscription;
            
        } catch (error) {
            console.error('❌ Error subscribing to push:', error);
            throw error;
        }
    }
    
    async saveSubscriptionToServer(retryCount = 0) {
        if (!this.subscription) return;
        
        try {
            console.log('💾 Saving subscription to Supabase...');
            
            const subscriptionData = {
                user_id: this.userId,
                subscription: this.subscription,
                endpoint: this.subscription.endpoint,
                updated_at: new Date().toISOString()
            };
            
            // First try: UPSERT with the unique constraint
            const { data: upsertData, error: upsertError } = await this.supabase
                .from('push_subscriptions')
                .upsert(subscriptionData, {
                    onConflict: 'endpoint'  // Use endpoint as the conflict key
                })
                .select();
            
            if (upsertError) {
                console.warn('⚠️ Upsert failed, trying alternative methods...', upsertError.message);
                
                // Second try: Check if endpoint exists and update
                const { data: existing, error: findError } = await this.supabase
                    .from('push_subscriptions')
                    .select('*')
                    .eq('endpoint', this.subscription.endpoint)
                    .maybeSingle();
                
                if (findError) {
                    console.error('❌ Error finding existing:', findError);
                } else if (existing) {
                    // Update existing record
                    const { error: updateError } = await this.supabase
                        .from('push_subscriptions')
                        .update({
                            user_id: this.userId,
                            subscription: this.subscription,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existing.id);
                    
                    if (updateError) {
                        console.error('❌ Update failed:', updateError);
                    } else {
                        console.log('✅ Subscription updated successfully');
                        return;
                    }
                }
                
                // Third try: Simple insert (will fail if duplicate)
                const { error: insertError } = await this.supabase
                    .from('push_subscriptions')
                    .insert(subscriptionData);
                
                if (insertError) {
                    // If it's a duplicate error and we have retries left
                    if (insertError.code === '23505' && retryCount < this.maxRetries) {
                        console.log(`🔄 Duplicate detected, retry ${retryCount + 1}/${this.maxRetries}...`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        return this.saveSubscriptionToServer(retryCount + 1);
                    }
                    
                    console.error('❌ All insert methods failed:', insertError);
                    
                    // Final fallback: Save to localStorage
                    localStorage.setItem('push_subscription', JSON.stringify(this.subscription));
                    console.log('💾 Subscription saved to localStorage as fallback');
                } else {
                    console.log('✅ Subscription inserted successfully');
                }
            } else {
                console.log('✅ Subscription upserted successfully:', upsertData);
            }
            
        } catch (error) {
            console.error('❌ Error in saveSubscriptionToServer:', error);
            // Fallback to localStorage
            localStorage.setItem('push_subscription', JSON.stringify(this.subscription));
        }
    }
    
    async loadSubscriptionFromServer() {
        try {
            console.log('📥 Loading subscription from server...');
            
            // Check if there's a subscription with this endpoint
            let { data, error } = await this.supabase
                .from('push_subscriptions')
                .select('*')
                .eq('endpoint', this.subscription?.endpoint || '')
                .maybeSingle();
            
            // If not found by endpoint, try by user_id
            if (!data && !error) {
                const { data: userData, error: userError } = await this.supabase
                    .from('push_subscriptions')
                    .select('*')
                    .eq('user_id', this.userId)
                    .maybeSingle();
                
                if (userError) {
                    console.error('❌ Error loading by user:', userError);
                } else if (userData) {
                    data = userData;
                }
            }
            
            if (error) {
                console.error('❌ Error loading subscription:', error);
                return this.loadSubscriptionFromLocalStorage();
            }
            
            if (data && data.subscription) {
                console.log('📡 Loaded subscription from server');
                this.subscription = data.subscription;
                this.isSubscribed = true;
                return data.subscription;
            }
            
            return this.loadSubscriptionFromLocalStorage();
            
        } catch (error) {
            console.error('❌ Error loading subscription:', error);
            return this.loadSubscriptionFromLocalStorage();
        }
    }
    
    loadSubscriptionFromLocalStorage() {
        const localSub = localStorage.getItem('push_subscription');
        if (localSub) {
            try {
                const parsed = JSON.parse(localSub);
                if (parsed && parsed.endpoint) {
                    console.log('📡 Loaded subscription from localStorage');
                    this.subscription = parsed;
                    this.isSubscribed = true;
                    // Try to sync to server
                    this.saveSubscriptionToServer();
                    return parsed;
                }
            } catch (e) {
                console.warn('⚠️ Could not parse local subscription');
            }
        }
        
        console.log('ℹ️ No subscription found');
        return null;
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
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('🔄 Service worker controller changed');
            this.subscribeToPush();
        });
        
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
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
    
async sendTestNotification() {
    if (!this.isSubscribed) {
        console.warn('⚠️ Not subscribed to push');
        showToast('⚠️ Not subscribed to push notifications');
        return false;
    }
    
    try {
        // Get the Supabase anon key from config
        const supabaseUrl = 'https://bulprhgwuwatzobiojwz.supabase.co';
        const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bHByaGd3dXdhdHpvYmlvand6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDczNDksImV4cCI6MjA5MjA4MzM0OX0.2fcHrGX7iXw5G9nGRNkBy70W1Ex_om1C0v3qbryPmvw';
        
        const response = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`  // Add the auth header
            },
            body: JSON.stringify({
                userId: this.userId,
                targetUserId: this.userId,
                title: '🔔 Test Notification',
                body: 'This is a test notification from Sucess Technology! Your notifications are working ✅',
                data: {
                    url: '/',
                    orderId: null
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Server error:', errorData);
            showToast('❌ Failed to send notification: ' + (errorData.message || 'Server error'));
            return { success: false, error: errorData };
        }
        
        const result = await response.json();
        console.log('📤 Test notification sent:', result);
        
        if (result.success) {
            showToast('✅ Test notification sent successfully!');
        } else {
            showToast('⚠️ Notification sent but may not have been delivered: ' + (result.error || 'Unknown error'));
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Error sending test notification:', error);
        showToast('❌ Error sending notification: ' + error.message);
        return { success: false, error: error.message };
    }
}

}
async function sendPushNotification(userId, title, body, data = {}) {
    try {
        const supabaseUrl = 'https://bulprhgwuwatzobiojwz.supabase.co';
        const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bHByaGd3dXdhdHpvYmlvand6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDczNDksImV4cCI6MjA5MjA4MzM0OX0.2fcHrGX7iXw5G9nGRNkBy70W1Ex_om1C0v3qbryPmvw';
        
        const response = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`
            },
            body: JSON.stringify({
                userId: userId,
                targetUserId: userId,
                title: title,
                body: body,
                data: data
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Server error:', errorData);
            return { success: false, error: errorData };
        }
        
        const result = await response.json();
        console.log('📤 Notification sent:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Error sending notification:', error);
        return { success: false, error: error.message };
    }
}

// Expose to window
window.sendPushNotification = sendPushNotification;

// Initialize the push manager
const pushManager = new PushNotificationManager();

document.addEventListener('DOMContentLoaded', () => {
    // Delay initialization to allow page to load

});

window.pushManager = pushManager;
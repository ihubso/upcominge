const SUPABASE_CONFIG = {
    url: 'https://bulprhgwuwatzobiojwz.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bHByaGd3dXdhdHpvYmlvand6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDczNDksImV4cCI6MjA5MjA4MzM0OX0.2fcHrGX7iXw5G9nGRNkBy70W1Ex_om1C0v3qbryPmvw'
};

let supabaseClient = null;
let supabaseInitialized = false;

function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        supabaseClient = supabase.createClient(
            SUPABASE_CONFIG.url, 
            SUPABASE_CONFIG.anonKey
        );
        supabaseInitialized = true;
        console.log('✅ Supabase client initialized');
        return supabaseClient;
    }
    
    loadSupabaseSDK();
    return null;
}
function generateSessionId() {

    return 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
}

function getSessionId() {
    const customerId = getCurrentCustomerId();
    if (customerId) {
        return customerId;
    }

    try {
        let sessionId = localStorage.getItem('st_session_id');
        if (!sessionId) {
            sessionId = generateSessionId();
            localStorage.setItem('st_session_id', sessionId);
        }
        return sessionId;
    } catch (err) {
        return generateSessionId();
    }
}

function getCurrentCustomerId() {
    // First check if user is logged in via STHeader AppState
    if (window.STHeader?.AppState?.isLoggedIn && window.STHeader?.AppState?.user?.id) {
        return window.STHeader.AppState.user.id;
    }
    
    // Check localStorage for customer data
    try {
        const stored = localStorage.getItem('st_customer');
        if (stored) {
            const customer = JSON.parse(stored);
            if (customer?.id) {
                return customer.id;
            }
        }
    } catch (err) {
        // ignore
    }
    
    // Check sessionStorage as fallback
    try {
        const stored = sessionStorage.getItem('st_customer');
        if (stored) {
            const customer = JSON.parse(stored);
            if (customer?.id) {
                return customer.id;
            }
        }
    } catch (err) {
        // ignore
    }
    
    return null;
}

window.getCurrentCustomerId = getCurrentCustomerId;
window.getSessionId = getSessionId;

// Ensure a guest session ID exists on every page load
getSessionId();

function loadSupabaseSDK() {
    if (document.querySelector('script[src*=\"supabase-js\"]')) return;
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    script.onload = () => {
        if (typeof supabase !== 'undefined') {
            supabaseClient = supabase.createClient(
                SUPABASE_CONFIG.url, 
                SUPABASE_CONFIG.anonKey
            );
            supabaseInitialized = true;
            console.log('✅ Supabase client re-initialized');
        }
    };
    document.head.appendChild(script);
}
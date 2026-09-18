
// Preserve user/session parameters for every internal navigation.
function navigateWithUserInfo(path){
    try {
        const targetUrl = new URL(path, window.location.origin);
        
        // Get user from storage (not just URL)
        let user = null;
        try {
            const stored = localStorage.getItem("st_customer") || sessionStorage.getItem("st_customer");
            if (stored) user = JSON.parse(stored);
        } catch(e) {}
        
        // Also check AppState
        if (!user && window.STHeader?.AppState?.user) {
            user = window.STHeader.AppState.user;
        }
        
        // Add user params to URL if we have a user
        if (user?.id) {
            targetUrl.searchParams.set("user_id", user.id);
            if (user.email) targetUrl.searchParams.set("user_email", user.email);
            if (user.name) targetUrl.searchParams.set("user_name", user.name);
            if (user.phone) targetUrl.searchParams.set("user_phone", user.phone);
            if (user.address) targetUrl.searchParams.set("user_address", user.address);
            targetUrl.searchParams.set("session", Date.now().toString());
            targetUrl.searchParams.set("logged_in", "true");
        }
        
        window.location.href = targetUrl.pathname + targetUrl.search + targetUrl.hash;
    } catch(err) {
        console.warn("⚠️ Navigation error:", err.message);
        window.location.href = path;
    }
}

window.navigateWithUserInfo = navigateWithUserInfo;

document.addEventListener("click", function(event) {
    const link = event.target.closest("a");
    if (!link || event.defaultPrevented || event.button !== 0 || 
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        link.target === "_blank" || link.hasAttribute("download")) return;
    
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || 
        href.startsWith("tel:") || href.startsWith("http") && !href.includes(window.location.hostname)) {
        return; // Don't intercept external links
    }
    
    // Only intercept internal navigation
    event.preventDefault();
    navigateWithUserInfo(href);
});


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
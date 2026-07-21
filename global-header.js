/**
 * ============================================================
 * SUCCESS TECHNOLOGY - GLOBAL HEADER SYSTEM
 * Custom Authentication with customer_accounts table
 * Complete header with login/register modals, cart, wishlist
 * SECURE: bcrypt password hashing (server-side via Edge Function)
 * ============================================================
 */

// ============================================================
// 1. SUPABASE CONFIGURATION
// ============================================================

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

function loadSupabaseSDK() {
    if (document.querySelector('script[src*="supabase-js"]')) return;
    
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

// ============================================================
// 2. CUSTOM AUTH FUNCTIONS (Using customer_accounts table)
// ============================================================

async function signUpCustomer(email, password, name, phone = '', address = '') {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available');
    
    // Check if email already exists
    const { data: existing, error: checkError } = await client
        .from('customer_accounts')
        .select('id, email')
        .eq('email', email)
        .maybeSingle();
    
    if (checkError) throw new Error(checkError.message);
    if (existing) throw new Error('Email already registered. Please login.');
    
    // Generate UUID for id
    const id = crypto.randomUUID ? crypto.randomUUID() : 
        'cust_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const { data, error } = await client
        .rpc('create_customer_account', {
            p_id: id,
            p_name: name,
            p_email: email,
            p_phone: phone || '',
            p_address: address || '',
            p_password: password // Database function will hash this
        });
    
    if (error) {
        console.error('❌ Signup error:', error);
        throw new Error(error.message);
    }
    
    return { id, email, name, phone, address };
}

async function loginCustomer(email, password) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available');
    
    // Get customer by email
    const { data: customer, error } = await client
        .from('customer_accounts')
        .select('id, name, email, phone, address, password_hash')
        .eq('email', email)
        .maybeSingle();
    
    if (error) throw new Error(error.message);
    if (!customer) throw new Error('Invalid email or password');
    
    // Verify password using database function
    const { data: verified, error: verifyError } = await client
        .rpc('verify_customer_password', {
            p_email: email,
            p_password: password
        });
    
    if (verifyError) throw new Error(verifyError.message);
    if (!verified) throw new Error('Invalid email or password');
    
    // Update last_login
    await client
        .from('customer_accounts')
        .update({ last_login: new Date().toISOString() })
        .eq('id', customer.id);
    
    // Return customer data (without password_hash)
    return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address
    };
}

// ============================================================
// 3. DATABASE OPERATIONS (Cart & Wishlist)
// ============================================================

async function fetchCartFromDB(customerId) {
    const client = getSupabaseClient();
    if (!client || !customerId) return [];
    
    try {
        const { data, error } = await client
            .from('cart')
            .select('*')
            .eq('customer_id', customerId);
        
        if (error) throw error;
        
        return (data || []).map(item => ({
            product_id: item.product_id,
            id: item.product_id,
            name: item.name || 'Unknown Product',
            price: item.price || 0,
            qty: item.qty || 1,
            image: item.image || 'https://placehold.co/600x400',
            variants: item.variants || {},
            isDeal: item.is_deal || false,
            originalPrice: item.original_price || null,
            discount: item.discount || null
        }));
    } catch (err) {
        console.error('❌ Error fetching cart:', err.message);
        return [];
    }
}

async function saveCartToDB(customerId, cart) {
    const client = getSupabaseClient();
    if (!client || !customerId) return;
    
    try {
        await client.from('cart').delete().eq('customer_id', customerId);
        
        if (cart.length > 0) {
            const rows = cart.map(item => ({
                customer_id: customerId,
                product_id: item.product_id || item.id || '',
                name: item.name || 'Unknown Product',
                price: item.price || 0,
                qty: item.qty || 1,
                image: item.image || 'https://placehold.co/600x400',
                variants: item.variants || {},
                is_deal: item.isDeal || false,
                original_price: item.originalPrice || null,
                discount: item.discount || null
            }));
            
            const validRows = rows.filter(row => row.product_id);
            if (validRows.length > 0) {
                const { error } = await client.from('cart').insert(validRows);
                if (error) console.error('❌ Error saving cart:', error.message);
            }
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

async function fetchWishlistFromDB(customerId) {
    const client = getSupabaseClient();
    if (!client || !customerId) return [];
    
    try {
        const { data, error } = await client
            .from('wishlist')
            .select('product_id')
            .eq('customer_id', customerId);
        
        if (error) throw error;
        return (data || []).map(row => row.product_id);
    } catch (err) {
        console.error('❌ Error fetching wishlist:', err.message);
        return [];
    }
}

async function saveWishlistToDB(customerId, wishlist) {
    const client = getSupabaseClient();
    if (!client || !customerId) return;
    
    try {
        await client.from('wishlist').delete().eq('customer_id', customerId);
        
        if (wishlist.length > 0) {
            const rows = wishlist.map(pid => ({ customer_id: customerId, product_id: pid }));
            const { error } = await client.from('wishlist').insert(rows);
            if (error) console.error('❌ Error saving wishlist:', error.message);
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

// ============================================================
// 4. HEADER CONFIGURATION
// ============================================================

const HEADER_CONFIG = {
    shopName: 'shop<span class="st-brand-highlight">Boss</span>',
    logoText: 'SB',
    navLinks: [
        { label: 'Products', icon: 'fa-box', href: 'products.html', dropdown: true },
        { label: 'Categories', icon: 'fa-th-large', href: '#', dropdown: true },
        { label: 'Brands', icon: 'fa-tag', href: '#', dropdown: true },
        { label: 'Contact', icon: 'fa-envelope', href: 'contact.html' }
    ]
};

// ============================================================
// 5. STATE MANAGEMENT
// ============================================================

const AppState = {
    user: null,
    cart: [],
    wishlist: [],
    isLoggedIn: false,
    isAuthLoading: false,
    lastAuthAttempt: 0,
    authAttempts: 0
};

// ============================================================
// 6. HEADER HTML TEMPLATE
// ============================================================

function getHeaderHTML() {
    return `
        <style>
            /* ----- Reset & Base ----- */
            .st-header *, .st-header *::before, .st-header *::after {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            /* ----- CSS Variables ----- */
            .st-header {
                --st-primary: #6C3CE1;
                --st-primary-dark: #5A2FC4;
                --st-primary-light: #8B6BE8;
                --st-primary-glow: rgba(108, 60, 225, 0.3);
                --st-dark: #0F172A;
                --st-dark-secondary: #1E293B;
                --st-gray: #94A3B8;
                --st-gray-light: #E2E8F0;
                --st-white: #FFFFFF;
                --st-shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
                --st-shadow-md: 0 4px 20px rgba(0,0,0,0.08);
                --st-shadow-lg: 0 8px 40px rgba(0,0,0,0.12);
                --st-shadow-xl: 0 20px 60px rgba(0,0,0,0.15);
                --st-radius-sm: 8px;
                --st-radius-md: 12px;
                --st-radius-lg: 16px;
                --st-radius-xl: 24px;
                --st-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            }
            
            /* ----- Topbar ----- */
            .st-topbar {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 10000;
                background: rgba(255, 255, 255, 0.92);
                backdrop-filter: blur(20px) saturate(180%);
                -webkit-backdrop-filter: blur(20px) saturate(180%);
                border-bottom: 1px solid rgba(226, 232, 240, 0.6);
                padding: 12px 24px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                height: 76px;
                transition: var(--st-transition);
            }
            
            .st-topbar.scrolled {
                box-shadow: var(--st-shadow-md);
                background: rgba(255, 255, 255, 0.98);
            }
            
            /* ----- Brand ----- */
            .st-brand {
                display: flex;
                align-items: center;
                gap: 12px;
                cursor: pointer;
                flex-shrink: 0;
                text-decoration: none;
            }
            
            .st-brand-icon {
                width: 44px;
                height: 44px;
                background: linear-gradient(135deg, var(--st-primary), var(--st-primary-dark));
                border-radius: var(--st-radius-md);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 900;
                font-size: 20px;
                box-shadow: 0 4px 12px var(--st-primary-glow);
                transition: var(--st-transition);
                flex-shrink: 0;
            }
            
            .st-brand:hover .st-brand-icon {
                transform: scale(1.05) rotate(-3deg);
            }
            
            .st-brand-text {
                font-weight: 800;
                font-size: 22px;
                letter-spacing: -0.5px;
                color: var(--st-dark);
            }
            
            .st-brand-text .st-brand-highlight {
                color: var(--st-primary);
                position: relative;
            }
            
            .st-brand-text .st-brand-highlight::after {
                content: '';
                position: absolute;
                bottom: -2px;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, var(--st-primary), var(--st-primary-light));
                border-radius: 2px;
            }
            
            /* ----- Desktop Navigation ----- */
            .st-nav-desktop {
                display: flex;
                align-items: center;
                gap: 4px;
                flex: 1;
                justify-content: center;
                margin: 0 20px;
            }
            
            .st-nav-list {
                display: flex;
                align-items: center;
                gap: 2px;
                list-style: none;
            }
            
            .st-nav-item {
                position: relative;
            }
            
            .st-nav-link {
                padding: 10px 18px;
                border-radius: var(--st-radius-sm);
                text-decoration: none;
                color: var(--st-dark-secondary);
                font-weight: 500;
                font-size: 14px;
                transition: var(--st-transition);
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                background: none;
                border: none;
                font-family: inherit;
            }
            
            .st-nav-link i {
                font-size: 14px;
                opacity: 0.7;
            }
            
            .st-nav-link:hover {
                background: rgba(108, 60, 225, 0.08);
                color: var(--st-primary);
            }
            
            .st-nav-link.active {
                color: var(--st-primary);
                background: rgba(108, 60, 225, 0.1);
            }
            
            /* ----- Dropdown ----- */
            .st-dropdown {
                position: absolute;
                top: calc(100% + 8px);
                left: 50%;
                transform: translateX(-50%) translateY(10px);
                background: var(--st-white);
                border-radius: var(--st-radius-lg);
                box-shadow: var(--st-shadow-xl);
                padding: 16px;
                min-width: 240px;
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
                transition: var(--st-transition);
                border: 1px solid rgba(226, 232, 240, 0.5);
            }
            
            .st-nav-item:hover .st-dropdown {
                opacity: 1;
                visibility: visible;
                pointer-events: all;
                transform: translateX(-50%) translateY(0);
            }
            
            .st-dropdown::before {
                content: '';
                position: absolute;
                top: -6px;
                left: 50%;
                transform: translateX(-50%) rotate(45deg);
                width: 12px;
                height: 12px;
                background: var(--st-white);
                border-top: 1px solid rgba(226, 232, 240, 0.5);
                border-left: 1px solid rgba(226, 232, 240, 0.5);
            }
            
            .st-dropdown-item {
                display: block;
                padding: 10px 14px;
                border-radius: var(--st-radius-sm);
                color: var(--st-dark-secondary);
                text-decoration: none;
                font-size: 14px;
                font-weight: 500;
                transition: var(--st-transition);
            }
            
            .st-dropdown-item:hover {
                background: rgba(108, 60, 225, 0.08);
                color: var(--st-primary);
            }
            
            /* ----- Right Section (Desktop) ----- */
            .st-header-right {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-shrink: 0;
            }
            
            /* ----- Search ----- */
            .st-search-wrapper {
                position: relative;
            }
            
            .st-search-input {
                padding: 10px 16px 10px 40px;
                border: 2px solid var(--st-gray-light);
                border-radius: var(--st-radius-xl);
                font-size: 14px;
                font-weight: 500;
                outline: none;
                transition: var(--st-transition);
                width: 200px;
                background: var(--st-white);
                font-family: inherit;
            }
            
            .st-search-input:focus {
                border-color: var(--st-primary);
                box-shadow: 0 0 0 4px var(--st-primary-glow);
                width: 260px;
            }
            
            .st-search-icon {
                position: absolute;
                left: 14px;
                top: 50%;
                transform: translateY(-50%);
                color: var(--st-gray);
                pointer-events: none;
            }
            
            /* ----- Action Buttons (Desktop) ----- */
            .st-action-btn {
                position: relative;
                padding: 10px 14px;
                border: none;
                background: none;
                border-radius: var(--st-radius-sm);
                cursor: pointer;
                transition: var(--st-transition);
                color: var(--st-dark-secondary);
                font-size: 18px;
                display: flex;
                align-items: center;
                gap: 6px;
                font-family: inherit;
                font-weight: 500;
            }
            
            .st-action-btn:hover {
                background: rgba(108, 60, 225, 0.08);
                color: var(--st-primary);
            }
            
            .st-action-btn .st-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                background: var(--st-primary);
                color: white;
                font-size: 11px;
                font-weight: 700;
                min-width: 20px;
                height: 20px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0 5px;
                box-shadow: 0 2px 8px var(--st-primary-glow);
            }
            
            /* ----- Account Button ----- */
            .st-account-btn {
                padding: 8px 12px;
                border: none;
                background: none;
                border-radius: var(--st-radius-sm);
                cursor: pointer;
                transition: var(--st-transition);
                display: flex;
                align-items: center;
                gap: 8px;
                font-family: inherit;
                font-size: 14px;
                font-weight: 500;
                color: var(--st-dark-secondary);
            }
            
            .st-account-btn:hover {
                background: rgba(108, 60, 225, 0.08);
                color: var(--st-primary);
            }
            
            .st-account-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--st-primary), var(--st-primary-dark));
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 700;
                font-size: 14px;
            }
            
            /* ----- Account Dropdown ----- */
            .st-account-dropdown {
                position: absolute;
                top: calc(100% + 8px);
                right: 0;
                background: var(--st-white);
                border-radius: var(--st-radius-lg);
                box-shadow: var(--st-shadow-xl);
                padding: 16px;
                min-width: 260px;
                border: 1px solid rgba(226, 232, 240, 0.5);
                opacity: 0;
                visibility: hidden;
                transform: translateY(10px);
                transition: var(--st-transition);
            }
            
            .st-account-dropdown.open {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }
            
            .st-account-dropdown-header {
                text-align: center;
                padding-bottom: 12px;
                border-bottom: 1px solid var(--st-gray-light);
            }
            
            .st-account-dropdown-header .st-avatar-large {
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--st-primary), var(--st-primary-dark));
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 700;
                font-size: 24px;
                margin: 0 auto 8px;
            }
            
            .st-account-dropdown-header .st-name {
                font-weight: 700;
                color: var(--st-dark);
            }
            
            .st-account-dropdown-header .st-email {
                font-size: 12px;
                color: var(--st-gray);
            }
            
            .st-account-dropdown-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 12px;
                border: none;
                background: none;
                width: 100%;
                border-radius: var(--st-radius-sm);
                cursor: pointer;
                transition: var(--st-transition);
                font-family: inherit;
                font-size: 14px;
                font-weight: 500;
                color: var(--st-dark-secondary);
                text-align: left;
            }
            
            .st-account-dropdown-item:hover {
                background: rgba(108, 60, 225, 0.08);
                color: var(--st-primary);
            }
            
            .st-account-dropdown-item.danger:hover {
                background: rgba(239, 68, 68, 0.08);
                color: #EF4444;
            }
            
            .st-account-dropdown-item i {
                width: 20px;
                opacity: 0.7;
            }
            
            .st-account-dropdown-item .hidden {
                display: none;
            }
            
            /* ============================================
               MOBILE BOTTOM NAVIGATION
               ============================================ */
            .st-mobile-bottom-nav {
                display: none;
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                z-index: 9999;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(20px) saturate(180%);
                border-top: 1px solid rgba(226, 232, 240, 0.6);
                padding: 8px 0 env(safe-area-inset-bottom, 8px);
                box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.06);
            }
            
            .st-mobile-bottom-nav .st-nav-items {
                display: flex;
                align-items: center;
                justify-content: space-around;
                max-width: 500px;
                margin: 0 auto;
            }
            
            .st-mobile-bottom-nav .st-nav-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2px;
                padding: 4px 12px;
                border: none;
                background: none;
                cursor: pointer;
                transition: var(--st-transition);
                font-family: inherit;
                color: var(--st-gray);
                position: relative;
                min-width: 56px;
                text-decoration: none;
            }
            
            .st-mobile-bottom-nav .st-nav-item .st-icon-wrap {
                position: relative;
                font-size: 22px;
                transition: var(--st-transition);
            }
            
            .st-mobile-bottom-nav .st-nav-item .st-label {
                font-size: 10px;
                font-weight: 600;
                transition: var(--st-transition);
            }
            
            .st-mobile-bottom-nav .st-nav-item.active {
                color: var(--st-primary);
            }
            
            .st-mobile-bottom-nav .st-nav-item.active .st-icon-wrap {
                transform: scale(1.05);
            }
            
            .st-mobile-bottom-nav .st-nav-item .st-badge {
                position: absolute;
                top: -6px;
                right: -10px;
                background: var(--st-primary);
                color: white;
                font-size: 10px;
                font-weight: 700;
                min-width: 18px;
                height: 18px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0 4px;
                box-shadow: 0 2px 8px var(--st-primary-glow);
            }
            
            .st-mobile-bottom-nav .st-nav-item .st-avatar-small {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--st-primary), var(--st-primary-dark));
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 700;
                font-size: 12px;
            }
            
            /* ----- Mobile Top Bar (Logo + Search) ----- */
            .st-mobile-topbar {
                display: none;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                width: 100%;
            }
            
            .st-mobile-topbar .st-brand {
                flex-shrink: 0;
            }
            
            .st-mobile-topbar .st-brand-icon {
                width: 36px;
                height: 36px;
                font-size: 16px;
            }
            
            .st-mobile-topbar .st-brand-text {
                font-size: 18px;
            }
            
            .st-mobile-topbar .st-search-wrapper {
                flex: 1;
                max-width: 200px;
            }
            
            .st-mobile-topbar .st-search-input {
                width: 100%;
                padding: 8px 12px 8px 34px;
                font-size: 13px;
                border-radius: var(--st-radius-xl);
            }
            
            .st-mobile-topbar .st-search-input:focus {
                width: 100%;
            }
            
            .st-mobile-topbar .st-search-icon {
                left: 10px;
                font-size: 14px;
            }
            
            .st-mobile-toggle-bar {
                padding: 8px 12px;
                border: none;
                background: none;
                font-size: 24px;
                cursor: pointer;
                color: var(--st-dark);
                border-radius: var(--st-radius-sm);
                transition: var(--st-transition);
            }
            
            .st-mobile-toggle-bar:hover {
                background: rgba(108, 60, 225, 0.08);
                color: var(--st-primary);
            }
            
            /* ============================================
               MOBILE DRAWER
               ============================================ */
            .st-mobile-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 9998;
                opacity: 0;
                visibility: hidden;
                transition: var(--st-transition);
                backdrop-filter: blur(4px);
            }
            
            .st-mobile-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            
            .st-mobile-drawer {
                position: fixed;
                top: 0;
                left: -320px;
                width: 320px;
                max-width: 85vw;
                height: 100vh;
                background: var(--st-white);
                z-index: 10001;
                transition: var(--st-transition);
                box-shadow: var(--st-shadow-xl);
                overflow-y: auto;
                padding: 20px;
                padding-bottom: 100px;
            }
            
            .st-mobile-drawer.open {
                left: 0;
            }
            
            .st-mobile-drawer-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding-bottom: 16px;
                border-bottom: 1px solid var(--st-gray-light);
                margin-bottom: 16px;
            }
            
            .st-mobile-drawer-brand {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .st-mobile-drawer-brand .st-brand-icon {
                width: 36px;
                height: 36px;
                font-size: 16px;
            }
            
            .st-mobile-drawer-brand .st-brand-text {
                font-size: 18px;
            }
            
            .st-mobile-close {
                padding: 8px 12px;
                border: none;
                background: none;
                font-size: 28px;
                cursor: pointer;
                color: var(--st-dark);
                border-radius: var(--st-radius-sm);
                transition: var(--st-transition);
            }
            
            .st-mobile-close:hover {
                background: rgba(239, 68, 68, 0.08);
                color: #EF4444;
            }
            
            .st-mobile-nav-list {
                list-style: none;
                margin-bottom: 20px;
            }
            
            .st-mobile-nav-item {
                border-bottom: 1px solid var(--st-gray-light);
            }
            
            .st-mobile-nav-link {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 14px 12px;
                text-decoration: none;
                color: var(--st-dark-secondary);
                font-weight: 500;
                font-size: 16px;
                transition: var(--st-transition);
                border: none;
                background: none;
                width: 100%;
                cursor: pointer;
                font-family: inherit;
            }
            
            .st-mobile-nav-link:hover {
                background: rgba(108, 60, 225, 0.08);
                color: var(--st-primary);
                border-radius: var(--st-radius-sm);
            }
            
            .st-mobile-nav-link i {
                width: 24px;
                opacity: 0.7;
            }
            
            /* ============================================
               LOGIN / REGISTER MODAL
               ============================================ */
            .st-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(8px);
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: var(--st-transition);
                padding: 20px;
            }
            
            .st-modal-overlay.active {
                opacity: 1;
                visibility: visible;
            }
            
            .st-modal {
                background: var(--st-white);
                border-radius: var(--st-radius-xl);
                max-width: 440px;
                width: 100%;
                padding: 40px 32px;
                transform: scale(0.95) translateY(20px);
                transition: var(--st-transition);
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
            }
            
            .st-modal-overlay.active .st-modal {
                transform: scale(1) translateY(0);
            }
            
            .st-modal-close {
                position: absolute;
                top: 16px;
                right: 16px;
                padding: 8px;
                border: none;
                background: none;
                font-size: 24px;
                cursor: pointer;
                color: var(--st-gray);
                border-radius: var(--st-radius-sm);
                transition: var(--st-transition);
            }
            
            .st-modal-close:hover {
                background: rgba(239, 68, 68, 0.08);
                color: #EF4444;
            }
            
            .st-modal-icon {
                width: 64px;
                height: 64px;
                background: linear-gradient(135deg, var(--st-primary), var(--st-primary-dark));
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 16px;
                color: white;
                font-size: 28px;
                box-shadow: 0 8px 24px var(--st-primary-glow);
            }
            
            .st-modal-title {
                text-align: center;
                font-size: 24px;
                font-weight: 800;
                color: var(--st-dark);
                margin-bottom: 8px;
            }
            
            .st-modal-subtitle {
                text-align: center;
                color: var(--st-gray);
                font-size: 14px;
                margin-bottom: 24px;
            }
            
            .st-form-group {
                margin-bottom: 16px;
            }
            
            .st-form-label {
                display: block;
                font-weight: 600;
                font-size: 13px;
                color: var(--st-dark-secondary);
                margin-bottom: 4px;
            }
            
            .st-form-input {
                width: 100%;
                padding: 12px 16px;
                border: 2px solid var(--st-gray-light);
                border-radius: var(--st-radius-sm);
                font-size: 14px;
                font-weight: 500;
                transition: var(--st-transition);
                outline: none;
                font-family: inherit;
                background: var(--st-white);
            }
            
            .st-form-input:focus {
                border-color: var(--st-primary);
                box-shadow: 0 0 0 4px var(--st-primary-glow);
            }
            
            .st-form-input.error {
                border-color: #EF4444;
                box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
            }
            
            .st-form-error {
                color: #EF4444;
                font-size: 12px;
                font-weight: 500;
                margin-top: 4px;
                display: none;
            }
            
            .st-form-error.visible {
                display: block;
            }
            
            .st-btn-primary {
                width: 100%;
                padding: 14px;
                background: linear-gradient(135deg, var(--st-primary), var(--st-primary-dark));
                color: white;
                border: none;
                border-radius: var(--st-radius-sm);
                font-weight: 700;
                font-size: 16px;
                cursor: pointer;
                transition: var(--st-transition);
                font-family: inherit;
                box-shadow: 0 4px 12px var(--st-primary-glow);
            }
            
            .st-btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px var(--st-primary-glow);
            }
            
            .st-btn-primary:active {
                transform: translateY(0);
            }
            
            .st-btn-primary:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }
            
            .st-modal-footer {
                text-align: center;
                margin-top: 16px;
                font-size: 14px;
                color: var(--st-gray);
            }
            
            .st-modal-footer .st-link {
                color: var(--st-primary);
                font-weight: 600;
                cursor: pointer;
                transition: var(--st-transition);
                background: none;
                border: none;
                font-family: inherit;
                font-size: 14px;
            }
            
            .st-modal-footer .st-link:hover {
                color: var(--st-primary-dark);
                text-decoration: underline;
            }
            
            /* ============================================
               RESPONSIVE
               ============================================ */
            @media (max-width: 1024px) {
                .st-search-input {
                    width: 140px;
                }
                .st-search-input:focus {
                    width: 180px;
                }
                .st-nav-link {
                    padding: 8px 12px;
                    font-size: 13px;
                }
            }
            
            @media (max-width: 768px) {
                .st-topbar {
                    padding: 10px 16px;
                    height: 62px;
                }
                
                .st-nav-desktop {
                    display: none !important;
                }
                .st-header-desktop {
                    display: none !important;
                }
                .st-header-right {
                    display: none !important;
                }
                
                .st-mobile-topbar {
                    display: flex !important;
                }
                .st-mobile-bottom-nav {
                    display: block !important;
                }
                
                .st-brand-text {
                    font-size: 18px;
                }
                
                .st-brand-icon {
                    width: 36px;
                    height: 36px;
                    font-size: 16px;
                }
                
                .st-modal {
                    padding: 28px 20px;
                    max-width: 100%;
                    margin: 10px;
                }
                
                body {
                    padding-bottom: 70px;
                }
            }
            
            @media (max-width: 480px) {
                .st-topbar {
                    padding: 8px 12px;
                    height: 56px;
                }
                
                .st-brand-text {
                    font-size: 15px;
                }
                
                .st-brand-icon {
                    width: 32px;
                    height: 32px;
                    font-size: 14px;
                }
                
                .st-mobile-topbar .st-search-input {
                    font-size: 12px;
                    padding: 6px 10px 6px 28px;
                }
                
                .st-mobile-topbar .st-search-icon {
                    font-size: 12px;
                    left: 8px;
                }
                
                .st-mobile-drawer {
                    width: 280px;
                    padding: 16px;
                }
                
                .st-mobile-bottom-nav .st-nav-item {
                    padding: 2px 8px;
                    min-width: 44px;
                }
                
                .st-mobile-bottom-nav .st-nav-item .st-icon-wrap {
                    font-size: 18px;
                }
                
                .st-mobile-bottom-nav .st-nav-item .st-label {
                    font-size: 9px;
                }
            }
        </style>
        
        <!-- ============================================
             TOPBAR
             ============================================ -->
        <header class="st-topbar" id="stTopbar">
            <!-- Desktop Layout -->
            <div class="st-header-desktop" style="display:flex;align-items:center;justify-content:space-between;width:100%;">
                <!-- Brand -->
                <a href="/" class="st-brand">
                    <div class="st-brand-icon">${HEADER_CONFIG.logoText}</div>
                    <div class="st-brand-text">${HEADER_CONFIG.shopName}</div>
                </a>
                
                <!-- Desktop Navigation -->
                <nav class="st-nav-desktop" id="stNavDesktop">
                    <ul class="st-nav-list">
                        ${HEADER_CONFIG.navLinks.map(link => `
                            <li class="st-nav-item">
                                <a href="${link.href}" class="st-nav-link ${link.dropdown ? 'has-dropdown' : ''}">
                                    <i class="fas ${link.icon}"></i> ${link.label}
                                </a>
                                ${link.dropdown ? `
                                    <div class="st-dropdown">
                                        <a href="#" class="st-dropdown-item">All ${link.label}</a>
                                        <div class="st-dropdown-divider"></div>
                                        <a href="#" class="st-dropdown-item">Category 1</a>
                                        <a href="#" class="st-dropdown-item">Category 2</a>
                                        <a href="#" class="st-dropdown-item">Category 3</a>
                                    </div>
                                ` : ''}
                            </li>
                        `).join('')}
                    </ul>
                </nav>
                
                <!-- Desktop Right Section -->
                <div class="st-header-right">
                    <!-- Search -->
                    <div class="st-search-wrapper">
                        <i class="fas fa-search st-search-icon"></i>
                        <input type="search" class="st-search-input" id="stSearchInput" 
                               placeholder="Search..." autocomplete="off">
                    </div>
                    
                    <!-- Wishlist -->
                    <button class="st-action-btn" id="stWishlistBtn">
                        <i class="fas fa-heart"></i>
                        <span class="st-badge" id="stWishlistCount">0</span>
                    </button>
                    
                    <!-- Cart -->
                    <button class="st-action-btn" id="stCartBtn">
                        <i class="fas fa-shopping-bag"></i>
                        <span class="st-badge" id="stCartCount">0</span>
                    </button>
                    
                    <!-- Account -->
                    <div class="st-nav-item" style="position:relative;">
                        <button class="st-account-btn" id="stAccountBtn">
                            <div class="st-account-avatar" id="stAccountAvatar">G</div>
                            <span class="st-account-label" id="stAccountLabel">Guest</span>
                            <i class="fas fa-chevron-down" style="font-size:12px;opacity:0.5;"></i>
                        </button>
                        
                        <!-- Account Dropdown -->
                        <div class="st-account-dropdown" id="stAccountDropdown">
                            <div class="st-account-dropdown-header">
                                <div class="st-avatar-large" id="stDropdownAvatar">G</div>
                                <div class="st-name" id="stDropdownName">Guest</div>
                                <div class="st-email" id="stDropdownEmail"></div>
                            </div>
                            <div style="padding-top:12px;">
                                <button class="st-account-dropdown-item" id="stMyOrdersBtn">
                                    <i class="fas fa-shopping-bag"></i> My Orders
                                </button>
                                <button class="st-account-dropdown-item" id="stSettingsBtn">
                                    <i class="fas fa-cog"></i> Settings
                                </button>
                                <button class="st-account-dropdown-item danger" id="stLogoutBtn" style="display:none;">
                                    <i class="fas fa-sign-out-alt"></i> Logout
                                </button>
                            </div>
                            <div id="stAuthButtons" style="padding-top:12px;border-top:1px solid var(--st-gray-light);margin-top:4px;">
                                <button class="st-account-dropdown-item" id="stLoginBtn">
                                    <i class="fas fa-sign-in-alt"></i> Login
                                </button>
                                <button class="st-account-dropdown-item" id="stRegisterBtn">
                                    <i class="fas fa-user-plus"></i> Register
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- ============================================
                 MOBILE TOP BAR
                 ============================================ -->
            <div class="st-mobile-topbar">
                <a href="/" class="st-brand">
                    <div class="st-brand-icon">${HEADER_CONFIG.logoText}</div>
                    <div class="st-brand-text">${HEADER_CONFIG.shopName}</div>
                </a>
                
                <div class="st-search-wrapper">
                    <i class="fas fa-search st-search-icon"></i>
                    <input type="search" class="st-search-input" id="stMobileSearchInput" 
                           placeholder="Search..." autocomplete="off">
                </div>
                
                <button class="st-mobile-toggle-bar" id="stMobileToggle">
                    <i class="fas fa-bars"></i>
                </button>
            </div>
        </header>
        
        <!-- ============================================
             MOBILE BOTTOM NAVIGATION
             ============================================ -->
        <nav class="st-mobile-bottom-nav" id="stMobileBottomNav">
            <div class="st-nav-items">
                <a href="/index.html" class="st-nav-item active">
                    <span class="st-icon-wrap"><i class="fas fa-home"></i></span>
                    <span class="st-label">Home</span>
                </a>
                
                <button class="st-nav-item" id="stMobileWishlistBtn">
                    <span class="st-icon-wrap">
                        <i class="fas fa-heart"></i>
                        <span class="st-badge" id="stMobileWishlistCount">0</span>
                    </span>
                    <span class="st-label">Wishlist</span>
                </button>
                
                <button class="st-nav-item" id="stMobileCartBtn">
                    <span class="st-icon-wrap">
                        <i class="fas fa-shopping-bag"></i>
                        <span class="st-badge" id="stMobileCartCount">0</span>
                    </span>
                    <span class="st-label">Cart</span>
                </button>
                
                <button class="st-nav-item" id="stMobileAccountBtn">
                    <span class="st-icon-wrap">
                        <div class="st-avatar-small" id="stMobileAvatar">G</div>
                    </span>
                    <span class="st-label" id="stMobileAccountLabel">Account</span>
                </button>
            </div>
        </nav>
        
        <!-- ============================================
             MOBILE DRAWER
             ============================================ -->
        <div class="st-mobile-overlay" id="stMobileOverlay"></div>
        <div class="st-mobile-drawer" id="stMobileDrawer">
            <div class="st-mobile-drawer-header">
                <div class="st-mobile-drawer-brand">
                    <div class="st-brand-icon">${HEADER_CONFIG.logoText}</div>
                    <div class="st-brand-text">${HEADER_CONFIG.shopName}</div>
                </div>
                <button class="st-mobile-close" id="stMobileClose">&times;</button>
            </div>
            <ul class="st-mobile-nav-list" id="stMobileNavList">
                ${HEADER_CONFIG.navLinks.map(link => `
                    <li class="st-mobile-nav-item">
                        <a href="${link.href}" class="st-mobile-nav-link">
                            <i class="fas ${link.icon}"></i> ${link.label}
                        </a>
                    </li>
                `).join('')}
            </ul>
            <div style="padding-top:16px;border-top:1px solid var(--st-gray-light);">
                <button class="st-mobile-nav-link" id="stMobileLoginBtn">
                    <i class="fas fa-sign-in-alt"></i> Login
                </button>
                <button class="st-mobile-nav-link" id="stMobileRegisterBtn">
                    <i class="fas fa-user-plus"></i> Register
                </button>
            </div>
        </div>
        
        <!-- ============================================
             LOGIN / REGISTER MODAL
             ============================================ -->
        <div class="st-modal-overlay" id="stAuthModal">
            <div class="st-modal">
                <button class="st-modal-close" id="stAuthModalClose">&times;</button>
                
                <!-- Login Form -->
                <div id="stLoginForm">
                    <div class="st-modal-icon"><i class="fas fa-sign-in-alt"></i></div>
                    <h2 class="st-modal-title">Welcome Back</h2>
                    <p class="st-modal-subtitle">Login to your account</p>
                    
                    <div class="st-form-group">
                        <label class="st-form-label">Email Address</label>
                        <input type="email" class="st-form-input" id="stLoginEmail" 
                               placeholder="you@example.com">
                        <div class="st-form-error" id="stLoginEmailError">Please enter a valid email</div>
                    </div>
                    
                    <div class="st-form-group">
                        <label class="st-form-label">Password</label>
                        <input type="password" class="st-form-input" id="stLoginPassword" 
                               placeholder="Enter your password">
                        <div class="st-form-error" id="stLoginPasswordError">Password is required</div>
                    </div>
                    
                    <button class="st-btn-primary" id="stLoginSubmit">Login</button>
                    
                    <div class="st-modal-footer">
                        Don't have an account? <button class="st-link" id="stSwitchToRegister">Register</button>
                    </div>
                </div>
                
                <!-- Register Form -->
                <div id="stRegisterForm" style="display:none;">
                    <div class="st-modal-icon"><i class="fas fa-user-plus"></i></div>
                    <h2 class="st-modal-title">Create Account</h2>
                    <p class="st-modal-subtitle">Join Success Technology</p>
                    
                    <div class="st-form-group">
                        <label class="st-form-label">Full Name</label>
                        <input type="text" class="st-form-input" id="stRegisterName" 
                               placeholder="John Doe">
                        <div class="st-form-error" id="stRegisterNameError">Name is required</div>
                    </div>
                    
                    <div class="st-form-group">
                        <label class="st-form-label">Email Address</label>
                        <input type="email" class="st-form-input" id="stRegisterEmail" 
                               placeholder="you@example.com">
                        <div class="st-form-error" id="stRegisterEmailError">Please enter a valid email</div>
                    </div>
                    
                    <div class="st-form-group">
                        <label class="st-form-label">Password</label>
                        <input type="password" class="st-form-input" id="stRegisterPassword" 
                               placeholder="Min 6 characters">
                        <div class="st-form-error" id="stRegisterPasswordError">Password must be at least 6 characters</div>
                    </div>
                    
                    <button class="st-btn-primary" id="stRegisterSubmit">Create Account</button>
                    
                    <div class="st-modal-footer">
                        Already have an account? <button class="st-link" id="stSwitchToLogin">Login</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============================================================
// 7. HEADER LOGIC
// ============================================================

function initHeader() {
    // DOM Elements
    const elements = {
        topbar: document.getElementById('stTopbar'),
        accountBtn: document.getElementById('stAccountBtn'),
        accountDropdown: document.getElementById('stAccountDropdown'),
        mobileToggle: document.getElementById('stMobileToggle'),
        mobileDrawer: document.getElementById('stMobileDrawer'),
        mobileOverlay: document.getElementById('stMobileOverlay'),
        mobileClose: document.getElementById('stMobileClose'),
        searchInput: document.getElementById('stSearchInput'),
        mobileSearchInput: document.getElementById('stMobileSearchInput'),
        cartBtn: document.getElementById('stCartBtn'),
        wishlistBtn: document.getElementById('stWishlistBtn'),
        cartCount: document.getElementById('stCartCount'),
        wishlistCount: document.getElementById('stWishlistCount'),
        mobileCartBtn: document.getElementById('stMobileCartBtn'),
        mobileWishlistBtn: document.getElementById('stMobileWishlistBtn'),
        mobileCartCount: document.getElementById('stMobileCartCount'),
        mobileWishlistCount: document.getElementById('stMobileWishlistCount'),
        mobileAccountBtn: document.getElementById('stMobileAccountBtn'),
        mobileAvatar: document.getElementById('stMobileAvatar'),
        mobileAccountLabel: document.getElementById('stMobileAccountLabel'),
        accountAvatar: document.getElementById('stAccountAvatar'),
        accountLabel: document.getElementById('stAccountLabel'),
        dropdownAvatar: document.getElementById('stDropdownAvatar'),
        dropdownName: document.getElementById('stDropdownName'),
        dropdownEmail: document.getElementById('stDropdownEmail'),
        logoutBtn: document.getElementById('stLogoutBtn'),
        authButtons: document.getElementById('stAuthButtons'),
        loginBtn: document.getElementById('stLoginBtn'),
        registerBtn: document.getElementById('stRegisterBtn'),
        mobileLoginBtn: document.getElementById('stMobileLoginBtn'),
        mobileRegisterBtn: document.getElementById('stMobileRegisterBtn'),
        authModal: document.getElementById('stAuthModal'),
        authModalClose: document.getElementById('stAuthModalClose'),
        loginForm: document.getElementById('stLoginForm'),
        registerForm: document.getElementById('stRegisterForm'),
        loginEmail: document.getElementById('stLoginEmail'),
        loginPassword: document.getElementById('stLoginPassword'),
        loginSubmit: document.getElementById('stLoginSubmit'),
        registerName: document.getElementById('stRegisterName'),
        registerEmail: document.getElementById('stRegisterEmail'),
        registerPassword: document.getElementById('stRegisterPassword'),
        registerSubmit: document.getElementById('stRegisterSubmit'),
        switchToRegister: document.getElementById('stSwitchToRegister'),
        switchToLogin: document.getElementById('stSwitchToLogin'),
        myOrdersBtn: document.getElementById('stMyOrdersBtn'),
        settingsBtn: document.getElementById('stSettingsBtn'),
        loginEmailError: document.getElementById('stLoginEmailError'),
        loginPasswordError: document.getElementById('stLoginPasswordError'),
        registerNameError: document.getElementById('stRegisterNameError'),
        registerEmailError: document.getElementById('stRegisterEmailError'),
        registerPasswordError: document.getElementById('stRegisterPasswordError')
    };
    
    // ----- Scroll Effect -----
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            elements.topbar.classList.add('scrolled');
        } else {
            elements.topbar.classList.remove('scrolled');
        }
    });
    
    // ----- Account Dropdown Toggle (Desktop) -----
    elements.accountBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.accountDropdown.classList.toggle('open');
    });
    
    document.addEventListener('click', (e) => {
        if (!elements.accountBtn.contains(e.target) && !elements.accountDropdown.contains(e.target)) {
            elements.accountDropdown.classList.remove('open');
        }
    });
    
    // ----- Mobile Account Button -----
    elements.mobileAccountBtn.addEventListener('click', () => {
        if (AppState.isLoggedIn) {
            elements.accountDropdown.classList.toggle('open');
        } else {
            openLoginModal();
        }
    });
    
    // ----- Mobile Drawer -----
    function openMobileDrawer() {
        elements.mobileDrawer.classList.add('open');
        elements.mobileOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeMobileDrawer() {
        elements.mobileDrawer.classList.remove('open');
        elements.mobileOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    elements.mobileToggle.addEventListener('click', openMobileDrawer);
    elements.mobileClose.addEventListener('click', closeMobileDrawer);
    elements.mobileOverlay.addEventListener('click', closeMobileDrawer);
    
    // ----- Search -----
    function handleSearch(e) {
        if (e.key === 'Enter' && e.target.value.trim() !== '') {
            window.location.href = `products.html?search=${encodeURIComponent(e.target.value.trim())}`;
        }
    }
    
    elements.searchInput.addEventListener('keypress', handleSearch);
    elements.mobileSearchInput.addEventListener('keypress', handleSearch);
    
    // ----- Cart & Wishlist -----
    elements.cartBtn.addEventListener('click', () => window.location.href = 'cart.html');
    elements.mobileCartBtn.addEventListener('click', () => window.location.href = 'cart.html');
    elements.wishlistBtn.addEventListener('click', () => window.location.href = 'wishlist.html');
    elements.mobileWishlistBtn.addEventListener('click', () => window.location.href = 'wishlist.html');
    
    // ----- Auth Modal -----
    function openAuthModal() {
        elements.authModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeAuthModal() {
        elements.authModal.classList.remove('active');
        document.body.style.overflow = '';
        document.querySelectorAll('.st-form-error').forEach(el => el.classList.remove('visible'));
        document.querySelectorAll('.st-form-input').forEach(el => el.classList.remove('error'));
    }
    
    elements.authModalClose.addEventListener('click', closeAuthModal);
    elements.authModal.addEventListener('click', (e) => {
        if (e.target === elements.authModal) closeAuthModal();
    });
    
    function showLoginForm() {
        elements.loginForm.style.display = 'block';
        elements.registerForm.style.display = 'none';
    }
    
    function showRegisterForm() {
        elements.loginForm.style.display = 'none';
        elements.registerForm.style.display = 'block';
    }
    
    elements.switchToRegister.addEventListener('click', showRegisterForm);
    elements.switchToLogin.addEventListener('click', showLoginForm);
    
    function openLoginModal() {
        showLoginForm();
        openAuthModal();
    }
    
    function openRegisterModal() {
        showRegisterForm();
        openAuthModal();
    }
    
    elements.loginBtn.addEventListener('click', openLoginModal);
    elements.registerBtn.addEventListener('click', openRegisterModal);
    elements.mobileLoginBtn.addEventListener('click', () => {
        closeMobileDrawer();
        openLoginModal();
    });
    elements.mobileRegisterBtn.addEventListener('click', () => {
        closeMobileDrawer();
        openRegisterModal();
    });
    
    // ============================================================
    // LOGIN HANDLER (Custom customer_accounts)
    // ============================================================
    elements.loginSubmit.addEventListener('click', async () => {
        const email = elements.loginEmail.value.trim();
        const password = elements.loginPassword.value;
        let isValid = true;
        
        // Validate email
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            elements.loginEmail.classList.add('error');
            if (elements.loginEmailError) {
                elements.loginEmailError.textContent = emailValidation.message;
                elements.loginEmailError.classList.add('visible');
            }
            isValid = false;
        } else {
            elements.loginEmail.classList.remove('error');
            if (elements.loginEmailError) elements.loginEmailError.classList.remove('visible');
        }
        
        // Validate password
        if (!password || password.length < 6) {
            elements.loginPassword.classList.add('error');
            if (elements.loginPasswordError) elements.loginPasswordError.classList.add('visible');
            isValid = false;
        } else {
            elements.loginPassword.classList.remove('error');
            if (elements.loginPasswordError) elements.loginPasswordError.classList.remove('visible');
        }
        
        if (!isValid) return;
        
        // Rate limit check
        const rateLimit = checkRateLimit();
        if (!rateLimit.allowed) {
            showNotification(rateLimit.message, 'warning');
            return;
        }
        
        if (AppState.isAuthLoading) return;
        AppState.isAuthLoading = true;
        AppState.authAttempts++;
        AppState.lastAuthAttempt = Date.now();
        elements.loginSubmit.disabled = true;
        elements.loginSubmit.textContent = 'Logging in...';
        
        try {
            console.log('🔐 Attempting login for:', email);
            
            const user = await loginCustomer(email, password);
            
            console.log('✅ Login successful for:', user.email);
            AppState.authAttempts = 0;
            
            // Save user session
            AppState.user = user;
            AppState.isLoggedIn = true;
            localStorage.setItem('st_customer', JSON.stringify(user));
            
            // Load cart and wishlist
            await loadUserData();
            updateAuthUI();
            closeAuthModal();
            
            showNotification(`✅ Welcome back, ${user.name}!`);
            
        } catch (err) {
            console.error('❌ Login error:', err);
            showNotification(err.message || '❌ Login failed. Please try again.', 'error');
        } finally {
            AppState.isAuthLoading = false;
            elements.loginSubmit.disabled = false;
            elements.loginSubmit.textContent = 'Login';
        }
    });
    
    // ============================================================
    // REGISTER HANDLER (Custom customer_accounts)
    // ============================================================
    elements.registerSubmit.addEventListener('click', async () => {
        const name = elements.registerName.value.trim();
        const email = elements.registerEmail.value.trim();
        const password = elements.registerPassword.value;
        let isValid = true;
        
        // Validate name
        if (!name || name.length < 2) {
            elements.registerName.classList.add('error');
            if (elements.registerNameError) elements.registerNameError.classList.add('visible');
            isValid = false;
        } else {
            elements.registerName.classList.remove('error');
            if (elements.registerNameError) elements.registerNameError.classList.remove('visible');
        }
        
        // Validate email
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            elements.registerEmail.classList.add('error');
            if (elements.registerEmailError) {
                elements.registerEmailError.textContent = emailValidation.message;
                elements.registerEmailError.classList.add('visible');
            }
            isValid = false;
        } else {
            elements.registerEmail.classList.remove('error');
            if (elements.registerEmailError) elements.registerEmailError.classList.remove('visible');
        }
        
        // Validate password
        if (!password || password.length < 6) {
            elements.registerPassword.classList.add('error');
            if (elements.registerPasswordError) elements.registerPasswordError.classList.add('visible');
            isValid = false;
        } else {
            elements.registerPassword.classList.remove('error');
            if (elements.registerPasswordError) elements.registerPasswordError.classList.remove('visible');
        }
        
        if (!isValid) return;
        
        // Rate limit check
        const rateLimit = checkRateLimit();
        if (!rateLimit.allowed) {
            showNotification(rateLimit.message, 'warning');
            return;
        }
        
        if (AppState.isAuthLoading) return;
        AppState.isAuthLoading = true;
        AppState.authAttempts++;
        AppState.lastAuthAttempt = Date.now();
        elements.registerSubmit.disabled = true;
        elements.registerSubmit.textContent = 'Creating account...';
        
        try {
            console.log('🔐 Attempting signup for:', email);
            
            const user = await signUpCustomer(email, password, name);
            
            console.log('✅ Signup successful for:', user.email);
            AppState.authAttempts = 0;
            
            // Save user session
            AppState.user = user;
            AppState.isLoggedIn = true;
            localStorage.setItem('st_customer', JSON.stringify(user));
            
            // Load cart and wishlist
            await loadUserData();
            updateAuthUI();
            closeAuthModal();
            
            showNotification(`✅ Account created successfully! Welcome ${user.name}!`);
            
        } catch (err) {
            console.error('❌ Signup error:', err);
            showNotification(err.message || '❌ Registration failed. Please try again.', 'error');
        } finally {
            AppState.isAuthLoading = false;
            elements.registerSubmit.disabled = false;
            elements.registerSubmit.textContent = 'Create Account';
        }
    });
    
    // ----- Logout Handler -----
    async function handleLogout() {
        AppState.user = null;
        AppState.isLoggedIn = false;
        AppState.cart = [];
        AppState.wishlist = [];
        AppState.authAttempts = 0;
        
        localStorage.removeItem('st_customer');
        localStorage.removeItem('st_cart');
        localStorage.removeItem('st_wishlist');
        
        updateAuthUI();
        elements.accountDropdown.classList.remove('open');
        showNotification('👋 Logged out successfully');
    }
    
    elements.logoutBtn.addEventListener('click', handleLogout);
    
    // ----- My Orders / Settings -----
    elements.myOrdersBtn.addEventListener('click', () => {
        elements.accountDropdown.classList.remove('open');
        if (AppState.isLoggedIn) {
            window.location.href = 'orders.html';
        } else {
            openLoginModal();
        }
    });
    
    elements.settingsBtn.addEventListener('click', () => {
        elements.accountDropdown.classList.remove('open');
        if (AppState.isLoggedIn) {
            window.location.href = 'account-settings.html';
        } else {
            openLoginModal();
        }
    });
    
    // ----- Load User Data -----
    async function loadUserData() {
        try {
            const customerId = AppState.user?.id;
            if (!customerId) return;
            
            // Load cart from Supabase
            const dbCart = await fetchCartFromDB(customerId);
            if (dbCart && dbCart.length > 0) {
                AppState.cart = dbCart;
                localStorage.setItem('st_cart', JSON.stringify(dbCart));
            }
            
            // Load wishlist from Supabase
            const dbWishlist = await fetchWishlistFromDB(customerId);
            if (dbWishlist && dbWishlist.length > 0) {
                AppState.wishlist = dbWishlist;
                localStorage.setItem('st_wishlist', JSON.stringify(dbWishlist));
            }
            
            updateCounts();
        } catch (err) {
            console.warn('⚠️ Failed to load user data:', err.message);
        }
    }
    
    // ----- Update UI based on auth state -----
    function updateAuthUI() {
        const user = AppState.user;
        const isLoggedIn = AppState.isLoggedIn;
        
        if (isLoggedIn && user) {
            const name = user.name || user.email?.split('@')[0] || 'User';
            const initial = name.charAt(0).toUpperCase();
            
            // Desktop
            elements.accountAvatar.textContent = initial;
            elements.accountLabel.textContent = name;
            elements.dropdownAvatar.textContent = initial;
            elements.dropdownName.textContent = name;
            elements.dropdownEmail.textContent = user.email || '';
            
            // Mobile
            elements.mobileAvatar.textContent = initial;
            elements.mobileAccountLabel.textContent = name;
            
            elements.logoutBtn.style.display = 'flex';
            elements.authButtons.style.display = 'none';
        } else {
            // Desktop
            elements.accountAvatar.textContent = 'G';
            elements.accountLabel.textContent = 'Guest';
            elements.dropdownAvatar.textContent = 'G';
            elements.dropdownName.textContent = 'Guest';
            elements.dropdownEmail.textContent = '';
            
            // Mobile
            elements.mobileAvatar.textContent = 'G';
            elements.mobileAccountLabel.textContent = 'Account';
            
            elements.logoutBtn.style.display = 'none';
            elements.authButtons.style.display = 'block';
        }
        
        updateCounts();
    }
    
    // ----- Update Counts -----
    function updateCounts() {
        const totalItems = AppState.cart.reduce((sum, item) => sum + (item.qty || 1), 0);
        
        elements.cartCount.textContent = totalItems;
        elements.wishlistCount.textContent = AppState.wishlist.length;
        elements.mobileCartCount.textContent = totalItems;
        elements.mobileWishlistCount.textContent = AppState.wishlist.length;
    }
    
    // ----- Notification System -----
    function showNotification(message, type = 'success') {
        const existing = document.querySelector('.st-notification');
        if (existing) existing.remove();
        
        const colors = {
            success: '#10B981',
            error: '#EF4444',
            warning: '#F59E0B',
            info: '#3B82F6'
        };
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        let container = document.querySelector('.st-notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'st-notification-container';
            container.style.cssText = `
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 30000;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        
        const notif = document.createElement('div');
        notif.className = 'st-notification';
        notif.style.cssText = `
            padding: 14px 24px;
            background: ${colors[type] || colors.success};
            color: white;
            border-radius: 12px;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            max-width: 90%;
            text-align: center;
            animation: slideUp 0.3s ease;
            font-family: 'Inter', sans-serif;
            display: flex;
            align-items: center;
            gap: 10px;
            pointer-events: auto;
            transition: all 0.3s ease;
            opacity: 1;
            transform: translateY(0);
        `;
        notif.innerHTML = `${icons[type] || '✅'} ${message}`;
        container.appendChild(notif);
        
        if (!document.querySelector('#stNotificationStyle')) {
            const style = document.createElement('style');
            style.id = 'stNotificationStyle';
            style.textContent = `
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes slideDown {
                    from { transform: translateY(0); opacity: 1; }
                    to { transform: translateY(-20px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        setTimeout(() => {
            notif.style.animation = 'slideDown 0.3s ease forwards';
            setTimeout(() => {
                if (notif.parentNode) {
                    notif.remove();
                }
                if (container.children.length === 0) {
                    container.remove();
                }
            }, 300);
        }, 4000);
    }
    
    // ----- Validate Email -----
    function validateEmail(email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return { valid: false, message: 'Please enter a valid email address (e.g., name@domain.com)' };
        }
        
        const domain = email.split('@')[1];
        const commonTypos = {
            'gamil.com': 'gmail.com',
            'gmial.com': 'gmail.com',
            'gnail.com': 'gmail.com',
            'yhoo.com': 'yahoo.com',
            'yaho.com': 'yahoo.com',
            'hotmai.com': 'hotmail.com',
            'hotmial.com': 'hotmail.com',
            'outlok.com': 'outlook.com',
            'outllok.com': 'outlook.com'
        };
        
        if (commonTypos[domain]) {
            const corrected = email.split('@')[0] + '@' + commonTypos[domain];
            return { 
                valid: false, 
                message: `Did you mean ${corrected}? Please correct the email address.`,
                corrected: corrected
            };
        }
        
        return { valid: true };
    }
    
    // ----- Rate Limit Check -----
    function checkRateLimit() {
        const now = Date.now();
        const timeSinceLastAttempt = now - AppState.lastAuthAttempt;
        
        if (AppState.authAttempts >= 5 && timeSinceLastAttempt < 60000) {
            const waitTime = Math.ceil((60000 - timeSinceLastAttempt) / 1000);
            return { 
                allowed: false, 
                message: `Too many attempts. Please wait ${waitTime} seconds and try again.` 
            };
        }
        
        if (timeSinceLastAttempt > 60000) {
            AppState.authAttempts = 0;
        }
        
        return { allowed: true };
    }
    
    // ----- Restore Session -----
    function restoreSession() {
        const savedUser = localStorage.getItem('st_customer');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                AppState.user = user;
                AppState.isLoggedIn = true;
                loadUserData();
                updateAuthUI();
                console.log('🔄 Session restored for:', user.email);
            } catch (e) {
                console.warn('⚠️ Failed to restore session');
            }
        } else {
            updateAuthUI();
        }
    }
    
    // ----- Initialize -----
    restoreSession();
    
    // ----- Expose to window -----
    window.STHeader = {
        AppState,
        updateAuthUI,
        loadUserData,
        updateCounts,
        openLoginModal,
        openRegisterModal,
        closeAuthModal,
        handleLogout,
        showNotification,
        getSupabaseClient,
        loginCustomer,
        signUpCustomer,
        fetchCartFromDB,
        saveCartToDB,
        fetchWishlistFromDB,
        saveWishlistToDB,
        validateEmail,
        checkRateLimit
    };
    
    console.log('✅ Success Technology Header initialized (Custom Auth)');
    console.log('📦 Cart:', AppState.cart.length, 'items');
    console.log('❤️ Wishlist:', AppState.wishlist.length, 'items');
    console.log('👤 User:', AppState.isLoggedIn ? AppState.user?.email : 'Guest');
}

// ============================================================
// 8. INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    const headerContainer = document.createElement('div');
    headerContainer.className = 'st-header';
    headerContainer.innerHTML = getHeaderHTML();
    document.body.prepend(headerContainer);
    
    initHeader();
});

console.log('✅ Global Header System Loaded (Custom Auth with customer_accounts)');
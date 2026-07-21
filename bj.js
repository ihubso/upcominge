/**
 * ============================================================
 * SUCCESS TECHNOLOGY - GLOBAL HEADER SYSTEM
 * Complete header with Supabase integration, login/register modals
 * Mobile & Desktop responsive design
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

// ============================================================
// 2. FETCH CATEGORIES AND BRANDS FROM PRODUCTS
// ============================================================

async function fetchCategoriesAndBrands() {
    const client = getSupabaseClient();
    if (!client) {
        console.warn('⚠️ Supabase not available for categories/brands');
        return { categories: [], brands: [] };
    }

    try {
        const { data, error } = await client
            .from('products')
            .select('category, brand, image, id, name')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Extract unique categories with a sample product image
        const categoryMap = new Map();
        const brandMap = new Map();
        
        data.forEach(product => {
            // Categories
            if (product.category && !categoryMap.has(product.category)) {
                categoryMap.set(product.category, {
                    name: product.category,
                    image: product.image || 'https://placehold.co/100x100/6C3CE1/FFFFFF?text=Category',
                    productId: product.id,
                    count: 1
                });
            } else if (product.category) {
                const existing = categoryMap.get(product.category);
                if (existing) existing.count++;
            }
            
            // Brands
            if (product.brand && !brandMap.has(product.brand)) {
                brandMap.set(product.brand, {
                    name: product.brand,
                    image: product.image || 'https://placehold.co/100x100/6C3CE1/FFFFFF?text=Brand',
                    productId: product.id,
                    count: 1
                });
            } else if (product.brand) {
                const existing = brandMap.get(product.brand);
                if (existing) existing.count++;
            }
        });

        // Convert to arrays and sort by count (most popular first)
        const categories = Array.from(categoryMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 12); // Limit to 12 categories

        const brands = Array.from(brandMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 12); // Limit to 12 brands

        console.log(`✅ Loaded ${categories.length} categories and ${brands.length} brands`);
        return { categories, brands };

    } catch (err) {
        console.error('❌ Error fetching categories/brands:', err.message);
        return { categories: [], brands: [] };
    }
}

// ============================================================
// 3. HEADER CONFIGURATION
// ============================================================

const HEADER_CONFIG = {
    shopName: 'shop<span class="st-brand-highlight">Boss</span>',
    logoText: 'SB',
    navLinks: [
        { label: 'Products', icon: 'fa-box', href: 'Search.html', dropdown: true, dropdownType: 'products' },
        { label: 'Categories', icon: 'fa-th-large', href: 'category.html', dropdown: true, dropdownType: 'categories' },
        { label: 'Brands', icon: 'fa-tag', href: 'brand.html', dropdown: true, dropdownType: 'brands' },
        { label: 'Contact', icon: 'fa-envelope', href: 'contact.html' }
    ],
    pages: {
        cart: 'cart.html',
        wishlist: 'wishlist.html',
        orders: 'orders.html',
        settings: 'account-settings.html',
        products: 'Search.html',
        category: 'category.html',
        brand: 'brand.html'
    }
};

// ============================================================
// 4. STATE MANAGEMENT
// ============================================================

const AppState = {
    user: null,
    cart: [],
    wishlist: [],
    sessionId: localStorage.getItem('st_session_id') || 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    isLoggedIn: false,
    categories: [],
    brands: []
};

// Save session ID
localStorage.setItem('st_session_id', AppState.sessionId);

// ============================================================
// 5. HEADER HTML TEMPLATE
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
            
            /* ----- Dropdown Mega Menu ----- */
           
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
                text-decoration: none;
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
                text-decoration: none;
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
            
            /* ----- Mobile Bottom Navigation ----- */
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
            
            /* ----- Mobile Top Bar ----- */
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
            
            /* ----- Mobile Drawer ----- */
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
            
            /* ----- Login/Register Modal ----- */
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
            
            /* ----- Responsive ----- */
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
                .st-dropdown {
                    min-width: 380px;
                    max-width: 480px;
                }
                .st-dropdown-grid {
                    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
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
                                    <div class="st-dropdown" id="stDropdown_${link.dropdownType || 'products'}">
                                        <div class="st-dropdown-header">
                                            <h3>${link.label}</h3>
                                            <a href="${link.href}" class="st-view-all">View All →</a>
                                        </div>
                                        <div class="st-dropdown-grid" id="stDropdownGrid_${link.dropdownType || 'products'}">
                                            <!-- Will be populated dynamically -->
                                            <div class="st-dropdown-empty">Loading...</div>
                                        </div>
                                    </div>
                                ` : ''}
                            </li>
                        `).join('')}
                    </ul>
                </nav>
                
                <!-- Desktop Right Section -->
                <div class="st-header-right">
                    <div class="st-search-wrapper">
                        <i class="fas fa-search st-search-icon"></i>
                        <input type="search" class="st-search-input" id="stSearchInput" 
                               placeholder="Search..." autocomplete="off">
                    </div>
                    
                    <a href="${HEADER_CONFIG.pages.wishlist}" class="st-action-btn" id="stWishlistBtn">
                        <i class="fas fa-heart"></i>
                        <span class="st-badge" id="stWishlistCount">0</span>
                    </a>
                    
                    <a href="${HEADER_CONFIG.pages.cart}" class="st-action-btn" id="stCartBtn">
                        <i class="fas fa-shopping-bag"></i>
                        <span class="st-badge" id="stCartCount">0</span>
                    </a>
                    
                    <div class="st-nav-item" style="position:relative;">
                        <button class="st-account-btn" id="stAccountBtn">
                            <div class="st-account-avatar" id="stAccountAvatar">G</div>
                            <span class="st-account-label" id="stAccountLabel">Guest</span>
                            <i class="fas fa-chevron-down" style="font-size:12px;opacity:0.5;"></i>
                        </button>
                        
                        <div class="st-account-dropdown" id="stAccountDropdown">
                            <div class="st-account-dropdown-header">
                                <div class="st-avatar-large" id="stDropdownAvatar">G</div>
                                <div class="st-name" id="stDropdownName">Guest</div>
                                <div class="st-email" id="stDropdownEmail"></div>
                            </div>
                            <div style="padding-top:12px;">
                                <a href="${HEADER_CONFIG.pages.orders}" class="st-account-dropdown-item" id="stMyOrdersBtn">
                                    <i class="fas fa-shopping-bag"></i> My Orders
                                </a>
                                <a href="${HEADER_CONFIG.pages.settings}" class="st-account-dropdown-item" id="stSettingsBtn">
                                    <i class="fas fa-cog"></i> Settings
                                </a>
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
            
            <!-- Mobile Top Bar -->
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
        
        <!-- Mobile Bottom Navigation -->
        <nav class="st-mobile-bottom-nav" id="stMobileBottomNav">
            <div class="st-nav-items">
                <a href="/index.html" class="st-nav-item active">
                    <span class="st-icon-wrap"><i class="fas fa-home"></i></span>
                    <span class="st-label">Home</span>
                </a>
                <a href="${HEADER_CONFIG.pages.wishlist}" class="st-nav-item" id="stMobileWishlistBtn">
                    <span class="st-icon-wrap">
                        <i class="fas fa-heart"></i>
                        <span class="st-badge" id="stMobileWishlistCount">0</span>
                    </span>
                    <span class="st-label">Wishlist</span>
                </a>
                <a href="${HEADER_CONFIG.pages.cart}" class="st-nav-item" id="stMobileCartBtn">
                    <span class="st-icon-wrap">
                        <i class="fas fa-shopping-bag"></i>
                        <span class="st-badge" id="stMobileCartCount">0</span>
                    </span>
                    <span class="st-label">Cart</span>
                </a>
                <button class="st-nav-item" id="stMobileAccountBtn">
                    <span class="st-icon-wrap">
                        <div class="st-avatar-small" id="stMobileAvatar">G</div>
                    </span>
                    <span class="st-label" id="stMobileAccountLabel">Account</span>
                </button>
            </div>
        </nav>
        
        <!-- Mobile Drawer -->
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
                <button class="st-mobile-nav-link danger" id="stMobileLogoutBtn" style="display:none;">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            </div>
        </div>
        
        <!-- Login/Register Modal -->
        <div class="st-modal-overlay" id="stAuthModal">
            <div class="st-modal">
                <button class="st-modal-close" id="stAuthModalClose">&times;</button>
                
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
// 6. POPULATE DROPDOWNS
// ============================================================

async function populateDropdowns() {
    const { categories, brands } = await fetchCategoriesAndBrands();
    AppState.categories = categories;
    AppState.brands = brands;

    // Populate Categories dropdown
    const categoriesGrid = document.getElementById('stDropdownGrid_categories');
    if (categoriesGrid) {
        if (categories.length === 0) {
            categoriesGrid.innerHTML = '<div class="st-dropdown-empty">No categories available</div>';
        } else {
            categoriesGrid.innerHTML = categories.map(cat => `
                <a href="category.html?category=${encodeURIComponent(cat.name)}" class="st-dropdown-item">
                    <div class="st-item-icon">
                        <img src="${cat.image}" alt="${cat.name}" onerror="this.parentElement.innerHTML='<span class=\\'st-icon-fallback\\'><i class=\\'fas fa-folder\\'></i></span>'">
                    </div>
                    <div class="st-item-info">
                        <span class="st-item-name">${cat.name}</span>
                        <span class="st-item-count">${cat.count} products</span>
                    </div>
                </a>
            `).join('');
        }
    }

    // Populate Brands dropdown
    const brandsGrid = document.getElementById('stDropdownGrid_brands');
    if (brandsGrid) {
        if (brands.length === 0) {
            brandsGrid.innerHTML = '<div class="st-dropdown-empty">No brands available</div>';
        } else {
            brandsGrid.innerHTML = brands.map(brand => `
                <a href="brand.html?brand=${encodeURIComponent(brand.name)}" class="st-dropdown-item">
                    <div class="st-item-icon">
                        <img src="${brand.image}" alt="${brand.name}" onerror="this.parentElement.innerHTML='<span class=\\'st-icon-fallback\\'><i class=\\'fas fa-tag\\'></i></span>'">
                    </div>
                    <div class="st-item-info">
                        <span class="st-item-name">${brand.name}</span>
                        <span class="st-item-count">${brand.count} products</span>
                    </div>
                </a>
            `).join('');
        }
    }

    // Products dropdown (show some featured/recent products)
    const productsGrid = document.getElementById('stDropdownGrid_products');
    if (productsGrid) {
        const client = getSupabaseClient();
        if (client) {
            try {
                const { data, error } = await client
                    .from('products')
                    .select('id, name, image, price')
                    .order('created_at', { ascending: false })
                    .limit(8);

                if (!error && data && data.length > 0) {
                    productsGrid.innerHTML = data.map(product => `
                        <a href="item.html?product=${product.id}" class="st-dropdown-item">
                            <div class="st-item-icon">
                                <img src="${product.image || 'https://placehold.co/100x100/6C3CE1/FFFFFF?text=Product'}" 
                                     alt="${product.name}" 
                                     onerror="this.parentElement.innerHTML='<span class=\\'st-icon-fallback\\'><i class=\\'fas fa-box\\'></i></span>'">
                            </div>
                            <div class="st-item-info">
                                <span class="st-item-name">${product.name}</span>
                                <span class="st-item-count">$${(product.price || 0).toFixed(2)}</span>
                            </div>
                        </a>
                    `).join('');
                } else {
                    productsGrid.innerHTML = '<div class="st-dropdown-empty">No products available</div>';
                }
            } catch (err) {
                productsGrid.innerHTML = '<div class="st-dropdown-empty">Failed to load products</div>';
            }
        }
    }

    console.log('✅ Dropdowns populated with categories and brands');
}

// ============================================================
// 7. HEADER LOGIC
// ============================================================

async function initHeader() {
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
        mobileLogoutBtn: document.getElementById('stMobileLogoutBtn'),
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
            // Go to account page
            window.location.href = HEADER_CONFIG.pages.settings;
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
            window.location.href = `${HEADER_CONFIG.pages.products}?search=${encodeURIComponent(e.target.value.trim())}`;
        }
    }
    
    elements.searchInput.addEventListener('keypress', handleSearch);
    elements.mobileSearchInput.addEventListener('keypress', handleSearch);
    
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
        setTimeout(() => elements.loginEmail.focus(), 300);
    }
    
    function openRegisterModal() {
        showRegisterForm();
        openAuthModal();
        setTimeout(() => elements.registerName.focus(), 300);
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
    // LOGIN HANDLER
    // ============================================================
    elements.loginSubmit.addEventListener('click', async () => {
        const email = elements.loginEmail.value.trim();
        const password = elements.loginPassword.value;
        let isValid = true;
        
        if (!email || !email.includes('@')) {
            elements.loginEmail.classList.add('error');
            elements.loginEmailError.classList.add('visible');
            isValid = false;
        } else {
            elements.loginEmail.classList.remove('error');
            elements.loginEmailError.classList.remove('visible');
        }
        
        if (!password || password.length < 6) {
            elements.loginPassword.classList.add('error');
            elements.loginPasswordError.classList.add('visible');
            isValid = false;
        } else {
            elements.loginPassword.classList.remove('error');
            elements.loginPasswordError.classList.remove('visible');
        }
        
        if (!isValid) return;
        
        elements.loginSubmit.disabled = true;
        elements.loginSubmit.textContent = 'Logging in...';
        
        try {
            const client = getSupabaseClient();
            if (!client) throw new Error('Supabase not available');
            
            const { data, error } = await client.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            
            AppState.user = data.user;
            AppState.isLoggedIn = true;
            
            await loadUserData();
            updateAuthUI();
            closeAuthModal();
            
            showNotification(`✅ Welcome back, ${data.user.user_metadata?.full_name || data.user.email.split('@')[0]}!`);
            
        } catch (err) {
            showNotification(`❌ ${err.message}`, 'error');
        } finally {
            elements.loginSubmit.disabled = false;
            elements.loginSubmit.textContent = 'Login';
        }
    });
    
    // ============================================================
    // REGISTER HANDLER
    // ============================================================
    elements.registerSubmit.addEventListener('click', async () => {
        const name = elements.registerName.value.trim();
        const email = elements.registerEmail.value.trim();
        const password = elements.registerPassword.value;
        let isValid = true;
        
        if (!name || name.length < 2) {
            elements.registerName.classList.add('error');
            elements.registerNameError.classList.add('visible');
            isValid = false;
        } else {
            elements.registerName.classList.remove('error');
            elements.registerNameError.classList.remove('visible');
        }
        
        if (!email || !email.includes('@')) {
            elements.registerEmail.classList.add('error');
            elements.registerEmailError.classList.add('visible');
            isValid = false;
        } else {
            elements.registerEmail.classList.remove('error');
            elements.registerEmailError.classList.remove('visible');
        }
        
        if (!password || password.length < 6) {
            elements.registerPassword.classList.add('error');
            elements.registerPasswordError.classList.add('visible');
            isValid = false;
        } else {
            elements.registerPassword.classList.remove('error');
            elements.registerPasswordError.classList.remove('visible');
        }
        
        if (!isValid) return;
        
        elements.registerSubmit.disabled = true;
        elements.registerSubmit.textContent = 'Creating account...';
        
        try {
            const client = getSupabaseClient();
            if (!client) throw new Error('Supabase not available');
            
            const { data, error } = await client.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name
                    }
                }
            });
            
            if (error) throw error;
            
            if (data.user) {
                AppState.user = data.user;
                AppState.isLoggedIn = true;
                await loadUserData();
                updateAuthUI();
                closeAuthModal();
                showNotification(`✅ Account created successfully! Welcome ${name}!`);
            }
            
        } catch (err) {
            showNotification(`❌ ${err.message}`, 'error');
        } finally {
            elements.registerSubmit.disabled = false;
            elements.registerSubmit.textContent = 'Create Account';
        }
    });
    
    // ============================================================
    // LOGOUT HANDLER
    // ============================================================
    async function handleLogout() {
        try {
            const client = getSupabaseClient();
            if (client) {
                await client.auth.signOut();
            }
            
            AppState.user = null;
            AppState.isLoggedIn = false;
            AppState.cart = [];
            AppState.wishlist = [];
            
            localStorage.removeItem('st_cart');
            localStorage.removeItem('st_wishlist');
            
            updateAuthUI();
            elements.accountDropdown.classList.remove('open');
            showNotification('👋 Logged out successfully');
        } catch (err) {
            console.error('Logout error:', err);
        }
    }
    
    elements.logoutBtn.addEventListener('click', handleLogout);
    elements.mobileLogoutBtn.addEventListener('click', () => {
        closeMobileDrawer();
        handleLogout();
    });
    
    // ============================================================
    // LOAD USER DATA
    // ============================================================
    async function loadUserData() {
        try {
            // Load cart from localStorage (Supabase sync is handled by global-header.js)
            const localCart = JSON.parse(localStorage.getItem('st_cart') || '[]');
            AppState.cart = localCart;
            
            const localWishlist = JSON.parse(localStorage.getItem('st_wishlist') || '[]');
            AppState.wishlist = localWishlist;
            
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
            const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
            const initial = name.charAt(0).toUpperCase();
            
            elements.accountAvatar.textContent = initial;
            elements.accountLabel.textContent = name;
            elements.dropdownAvatar.textContent = initial;
            elements.dropdownName.textContent = name;
            elements.dropdownEmail.textContent = user.email || '';
            
            elements.mobileAvatar.textContent = initial;
            elements.mobileAccountLabel.textContent = name;
            
            elements.logoutBtn.style.display = 'flex';
            elements.mobileLogoutBtn.style.display = 'flex';
            elements.authButtons.style.display = 'none';
            elements.mobileLoginBtn.style.display = 'none';
            elements.mobileRegisterBtn.style.display = 'none';
        } else {
            elements.accountAvatar.textContent = 'G';
            elements.accountLabel.textContent = 'Guest';
            elements.dropdownAvatar.textContent = 'G';
            elements.dropdownName.textContent = 'Guest';
            elements.dropdownEmail.textContent = '';
            
            elements.mobileAvatar.textContent = 'G';
            elements.mobileAccountLabel.textContent = 'Account';
            
            elements.logoutBtn.style.display = 'none';
            elements.mobileLogoutBtn.style.display = 'none';
            elements.authButtons.style.display = 'block';
            elements.mobileLoginBtn.style.display = 'flex';
            elements.mobileRegisterBtn.style.display = 'flex';
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
        
        const notif = document.createElement('div');
        notif.className = 'st-notification';
        notif.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            padding: 14px 24px;
            background: ${colors[type] || colors.success};
            color: white;
            border-radius: 12px;
            font-weight: 600;
            font-size: 14px;
            z-index: 30000;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            max-width: 90%;
            text-align: center;
            animation: slideUp 0.3s ease;
            font-family: 'Inter', sans-serif;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        notif.innerHTML = `${icons[type] || '✅'} ${message}`;
        document.body.appendChild(notif);
        
        if (!document.querySelector('#stNotificationStyle')) {
            const style = document.createElement('style');
            style.id = 'stNotificationStyle';
            style.textContent = `
                @keyframes slideUp {
                    from { transform: translateX(-50%) translateY(20px); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        setTimeout(() => {
            notif.style.opacity = '0';
            notif.style.transform = 'translateX(-50%) translateY(-20px)';
            notif.style.transition = 'all 0.3s ease';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }
    
    // ============================================================
    // AUTO-LOGIN
    // ============================================================
    async function checkAutoLogin() {
        const client = getSupabaseClient();
        if (!client) {
            updateAuthUI();
            return;
        }
        
        try {
            const { data } = await client.auth.getSession();
            if (data.session) {
                AppState.user = data.session.user;
                AppState.isLoggedIn = true;
                await loadUserData();
                updateAuthUI();
                console.log('🔑 Auto-login successful');
            } else {
                updateAuthUI();
            }
        } catch (err) {
            console.warn('⚠️ Auto-login failed:', err.message);
            updateAuthUI();
        }
    }
    
    // ----- Auth state listener -----
    const client = getSupabaseClient();
    if (client && client.auth) {
        client.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                AppState.user = session.user;
                AppState.isLoggedIn = true;
                loadUserData();
                updateAuthUI();
            } else if (event === 'SIGNED_OUT') {
                AppState.user = null;
                AppState.isLoggedIn = false;
                updateAuthUI();
            }
        });
    }
    
    // ----- Populate dropdowns -----
    await populateDropdowns();
    
    // ----- Auto-login -----
    await checkAutoLogin();
    
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
        populateDropdowns,
        fetchCategoriesAndBrands
    };
    
    console.log('✅ Success Technology Header Initialized');
    console.log('📦 Cart:', AppState.cart.length, 'items');
    console.log('❤️ Wishlist:', AppState.wishlist.length, 'items');
    console.log('👤 User:', AppState.isLoggedIn ? AppState.user?.email : 'Guest');
    console.log('📂 Categories:', AppState.categories.length);
    console.log('🏷️ Brands:', AppState.brands.length);
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

// Expose critical functions globally
window.getSupabaseClient = getSupabaseClient;
window.fetchCategoriesAndBrands = fetchCategoriesAndBrands;

console.log('✅ Global Header System Loaded (with dynamic categories & brands)');
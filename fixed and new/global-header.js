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
// 3. DATABASE OPERATIONS (Cart & Wishlist) - NOW REQUIRES customer_id
// ============================================================

async function fetchCartFromDB(customerId) {
    if (!customerId) {
        console.warn('⚠️ fetchCartFromDB: No customer_id provided');
        return [];
    }
    
    const client = getSupabaseClient();
    if (!client) return [];
    
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
    if (!customerId) {
        console.warn('⚠️ saveCartToDB: No customer_id provided - skipping DB sync');
        return;
    }
    
    const client = getSupabaseClient();
    if (!client) return;
    
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
        console.error('❌ Error saving cart:', err.message);
    }
}

async function fetchWishlistFromDB(customerId) {
    if (!customerId) {
        console.warn('⚠️ fetchWishlistFromDB: No customer_id provided');
        return [];
    }
    
    const client = getSupabaseClient();
    if (!client) return [];
    
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
    if (!customerId) {
        console.warn('⚠️ saveWishlistToDB: No customer_id provided - skipping DB sync');
        return;
    }
    
    const client = getSupabaseClient();
    if (!client) return;
    
    try {
        await client.from('wishlist').delete().eq('customer_id', customerId);
        
        if (wishlist.length > 0) {
            const rows = wishlist.map(pid => ({ customer_id: customerId, product_id: pid }));
            const { error } = await client.from('wishlist').insert(rows);
            if (error) console.error('❌ Error saving wishlist:', error.message);
        }
    } catch (err) {
        console.error('❌ Error saving wishlist:', err.message);
    }
}
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
// 4. HEADER CONFIGURATION
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
;

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
             .st-dropdown {
                position: absolute;
                top: calc(100% + 8px);
                left: 50%;
                transform: translateX(-50%) translateY(10px);
                background: var(--st-white);
                border-radius: var(--st-radius-lg);
                box-shadow: var(--st-shadow-xl);
                padding: 20px 24px;
                min-width: 480px;
                max-width: 600px;
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
                transition: var(--st-transition);
                border: 1px solid rgba(226, 232, 240, 0.5);
                max-height: 80vh;
                overflow-y: auto;
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
            
            .st-dropdown-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid var(--st-gray-light);
            }
            
            .st-dropdown-header h3 {
                font-size: 16px;
                font-weight: 700;
                color: var(--st-dark);
            }
            
            .st-dropdown-header .st-view-all {
                font-size: 13px;
                color: var(--st-primary);
                text-decoration: none;
                font-weight: 600;
            }
            
            .st-dropdown-header .st-view-all:hover {
                text-decoration: underline;
            }
            
            .st-dropdown-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                gap: 10px;
            }
            
            .st-dropdown-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 12px;
                border-radius: var(--st-radius-sm);
                color: var(--st-dark-secondary);
                text-decoration: none;
                font-size: 13px;
                font-weight: 500;
                transition: var(--st-transition);
                cursor: pointer;
                border: 1px solid transparent;
            }
            
            .st-dropdown-item:hover {
                background: rgba(108, 60, 225, 0.08);
                color: var(--st-primary);
                border-color: var(--st-gray-light);
            }
            
            .st-dropdown-item .st-item-icon {
                width: 36px;
                height: 36px;
                border-radius: var(--st-radius-sm);
                overflow: hidden;
                flex-shrink: 0;
                background: #f1f5f9;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .st-dropdown-item .st-item-icon img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .st-dropdown-item .st-item-icon .st-icon-fallback {
                font-size: 16px;
                color: var(--st-gray);
            }
            
            .st-dropdown-item .st-item-info {
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            
            .st-dropdown-item .st-item-name {
                font-weight: 600;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .st-dropdown-item .st-item-count {
                font-size: 11px;
                color: var(--st-gray);
                font-weight: 400;
            }
            
            .st-dropdown-divider {
                height: 1px;
                background: var(--st-gray-light);
                margin: 6px 0;
            }
            
            .st-dropdown-empty {
                padding: 20px;
                text-align: center;
                color: var(--st-gray);
                font-size: 14px;
            }
            .st-dropdown {
            width: 650px;
            max-width: 90vw;
            }

            .st-dropdown-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            width: 100%;
            }
            /* 1. Fix the dropdown containers: width and hover 'bridge' gap */
#stDropdown_categories, 
#stDropdown_brands, 
#stDropdown_products {
    width: 650px !important;
    max-width: 95vw !important;
    
    /* Move closer and bridge the gap to prevent closing on hover */
    top: 100% !important;
    padding-top: 25px !important;
    margin-top: -10px !important;
    
    /* Ensure mouse interaction is allowed */
    pointer-events: auto !important;
}

/* 2. Force the grids inside to display in 3 columns */
#stDropdownGrid_categories,
#stDropdownGrid_brands,
#stDropdownGrid_products {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 15px !important;
    width: 100% !important;
}

/* 3. Ensure the dropdowns stay visible when hovering over the parent menu item */
.st-nav-item:hover #stDropdown_categories,
.st-nav-item:hover #stDropdown_brands,
.st-nav-item:hover #stDropdown_products {
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
}
                        
            /* Scrollbar styling */
            .st-dropdown::-webkit-scrollbar {
                width: 4px;
            }
            .st-dropdown::-webkit-scrollbar-track {
                background: transparent;
            }
            .st-dropdown::-webkit-scrollbar-thumb {
                background: var(--st-gray-light);
                border-radius: 4px;
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
            /* Hide on desktop (screens wider than 1024px) */
@media (min-width: 1025px) {
  button#stMobileToggle {
    display: none !important;
  }
}

/* Ensure it is visible on mobile/tablet (screens 1024px and below) */
@media (max-width: 1024px) {
  button#stMobileToggle {
    display: inline-block !important;
  }
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
                    <!-- Search -->
                       <form action="/search" method="GET" role="search">
                    <div class="st-search-wrapper">

                        <i class="fas fa-search st-search-icon"></i>
                        <input name="query" type="search" class="st-search-input" id="stSearchInput" 
                               placeholder="Search..." autocomplete="off">
                    </div>
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
                <form action="/search" method="GET" role="search">
                    <div class="st-search-wrapper">
                        <i class="fas fa-search st-search-icon"></i>
                        <input name="query" type="search" class="st-search-input" id="stMobileSearchInput" 
                            placeholder="Search..." autocomplete="off">
                        </div>
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
            <div id="stLogoutactt" style="padding-top:16px;border-top:1px solid var(--st-gray-light);">
                <button class="st-mobile-nav-link" id="stMobileLoginBtn">
                    <i class="fas fa-sign-in-alt"></i> Login
                </button>
                <button class="st-mobile-nav-link" id="stMobileRegisterBtn">
                    <i class="fas fa-user-plus"></i> Register
                </button>
            </div>
             <div style="padding-top:16px;border-top:1px solid var(--st-gray-light);">
                <button class="st-account-dropdown-item danger" id="stAndroidLogout" style="display:none;">
                <i class="fas fa-sign-out-alt"></i> Logout
                </button>
               </div>
            <button class="st-account-dropdown-item" id="andstSettingsBtn">
            <i class="fas fa-cog"></i> Settings
            </button>

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
                    
                    <div class="st-form-group" style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                            <input type="checkbox" id="stLoginRemember" style="width:16px;height:16px;margin:0;"> 
                            <span style="font-size:14px;color:var(--st-gray);">Remember me</span>
                        </label>
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
        androidLogout: document.getElementById('stAndroidLogout'),
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
        loginRemember: document.getElementById('stLoginRemember'),
        registerName: document.getElementById('stRegisterName'),
        registerEmail: document.getElementById('stRegisterEmail'),
        registerPassword: document.getElementById('stRegisterPassword'),
        registerSubmit: document.getElementById('stRegisterSubmit'),
        switchToRegister: document.getElementById('stSwitchToRegister'),
        switchToLogin: document.getElementById('stSwitchToLogin'),
        myOrdersBtn: document.getElementById('stMyOrdersBtn'),
        settingsBtn: document.getElementById('stSettingsBtn'),
        andsettingsBtn: document.getElementById('andstSettingsBtn'),
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
            window.location.href = `Search.html?search=${encodeURIComponent(e.target.value.trim())}`;
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
//  SEARCH WITH REAL-TIME RESULTS
// ============================================================

// --- Search State ---
let searchTimeout = null;
let searchResults = [];
let selectedSearchIndex = -1;
let isSearchOpen = false;

// --- Create Search Results Container ---
function createSearchResultsContainer() {
    // Check if already exists
    if (document.getElementById('stSearchResults')) return;

    const container = document.createElement('div');
    container.id = 'stSearchResults';
    container.className = 'st-search-results';
    container.style.cssText = `
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        right: 0;
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 40px rgba(0,0,0,0.15);
        border: 1px solid #E2E8F0;
        max-height: 400px;
        overflow-y: auto;
        display: none;
        z-index: 10001;
        padding: 8px 0;
    `;
    
    // Add scrollbar styling
    const style = document.createElement('style');
    style.textContent = `
        .st-search-results::-webkit-scrollbar {
            width: 4px;
        }
        .st-search-results::-webkit-scrollbar-track {
            background: transparent;
        }
        .st-search-results::-webkit-scrollbar-thumb {
            background: #E2E8F0;
            border-radius: 4px;
        }
        .st-search-results .st-search-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 16px;
            cursor: pointer;
            transition: background 0.2s ease;
            text-decoration: none;
            color: #0F172A;
        }
        .st-search-results .st-search-item:hover {
            background: #f8fafc;
        }
        .st-search-results .st-search-item.active {
            background: rgba(108, 60, 225, 0.08);
        }
        .st-search-results .st-search-item img {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            object-fit: cover;
            flex-shrink: 0;
            background: #f1f5f9;
        }
        .st-search-results .st-search-item .st-search-info {
            flex: 1;
            min-width: 0;
        }
        .st-search-results .st-search-item .st-search-name {
            font-weight: 600;
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .st-search-results .st-search-item .st-search-meta {
            font-size: 12px;
            color: #94A3B8;
        }
        .st-search-results .st-search-item .st-search-price {
            font-weight: 700;
            font-size: 14px;
            color: #6C3CE1;
            flex-shrink: 0;
        }
        .st-search-results .st-search-empty {
            padding: 20px;
            text-align: center;
            color: #94A3B8;
            font-size: 14px;
        }
        .st-search-results .st-search-loading {
            padding: 20px;
            text-align: center;
            color: #94A3B8;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
        }
        .st-search-results .st-search-loading .st-spinner-small {
            width: 20px;
            height: 20px;
            border: 3px solid #E2E8F0;
            border-top-color: #6C3CE1;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .st-search-results .st-search-view-all {
            padding: 10px 16px;
            text-align: center;
            border-top: 1px solid #E2E8F0;
            color: #6C3CE1;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: background 0.2s ease;
            text-decoration: none;
            display: block;
        }
        .st-search-results .st-search-view-all:hover {
            background: #f8fafc;
        }

        /* Mobile full-screen search overlay */
        .st-search-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999;
            display: none;
            backdrop-filter: blur(4px);
        }
        .st-search-overlay.active {
            display: block;
        }
        .st-search-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: white;
            z-index: 10000;
            display: none;
            flex-direction: column;
            padding: 16px;
        }
        .st-search-modal.active {
            display: flex;
        }
        .st-search-modal .st-search-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #E2E8F0;
        }
        .st-search-modal .st-search-header input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #E2E8F0;
            border-radius: 12px;
            font-size: 16px;
            outline: none;
            font-family: inherit;
        }
        .st-search-modal .st-search-header input:focus {
            border-color: #6C3CE1;
        }
        .st-search-modal .st-search-header .st-search-close {
            padding: 8px 12px;
            border: none;
            background: none;
            font-size: 24px;
            cursor: pointer;
            color: #475569;
        }
        .st-search-modal .st-search-results-mobile {
            flex: 1;
            overflow-y: auto;
            padding-top: 12px;
        }
        .st-search-modal .st-search-results-mobile .st-search-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 8px;
            border-bottom: 1px solid #f1f5f9;
            cursor: pointer;
            text-decoration: none;
            color: #0F172A;
        }
        .st-search-modal .st-search-results-mobile .st-search-item img {
            width: 50px;
            height: 50px;
            border-radius: 8px;
            object-fit: cover;
            flex-shrink: 0;
            background: #f1f5f9;
        }
        .st-search-modal .st-search-results-mobile .st-search-item .st-search-info {
            flex: 1;
        }
        .st-search-modal .st-search-results-mobile .st-search-item .st-search-name {
            font-weight: 600;
            font-size: 15px;
        }
        .st-search-modal .st-search-results-mobile .st-search-item .st-search-meta {
            font-size: 13px;
            color: #94A3B8;
        }
        .st-search-modal .st-search-results-mobile .st-search-item .st-search-price {
            font-weight: 700;
            font-size: 15px;
            color: #6C3CE1;
        }
        .st-search-modal .st-search-results-mobile .st-search-empty {
            padding: 40px 20px;
            text-align: center;
            color: #94A3B8;
        }
        .st-search-modal .st-search-results-mobile .st-search-view-all {
            padding: 16px;
            text-align: center;
            color: #6C3CE1;
            font-weight: 600;
            font-size: 15px;
            cursor: pointer;
            text-decoration: none;
            display: block;
            border-top: 1px solid #E2E8F0;
            margin-top: 8px;
        }

        /* Desktop results positioning */
        .st-search-wrapper {
            position: relative;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
            .st-search-results {
                display: none !important;
            }
        }
        @media (min-width: 769px) {
            .st-search-overlay,
            .st-search-modal {
                display: none !important;
            }
        }
    `;
    document.head.appendChild(style);

    // Append to search wrapper
    const wrapper = document.querySelector('.st-search-wrapper');
    if (wrapper) {
        wrapper.appendChild(container);
    }

    // Create mobile overlay and modal
    const overlay = document.createElement('div');
    overlay.id = 'stSearchOverlay';
    overlay.className = 'st-search-overlay';
    document.body.appendChild(overlay);

    const modal = document.createElement('div');
    modal.id = 'stSearchModal';
    modal.className = 'st-search-modal';
    modal.innerHTML = `
        <div class="st-search-header">
            <input type="search" id="stMobileSearchModalInput" placeholder="Search products..." autocomplete="off" />
            <button class="st-search-close" id="stSearchModalClose">&times;</button>
        </div>
        <div class="st-search-results-mobile" id="stSearchResultsMobile"></div>
    `;
    document.body.appendChild(modal);

    return container;
}

// --- Perform Search ---
async function performSearch(query) {
    if (!query || query.trim().length < 1) {
        hideSearchResults();
        return;
    }

    const trimmedQuery = query.trim().toLowerCase();
    
    // Show loading state
    const container = document.getElementById('stSearchResults');
    if (container) {
        container.innerHTML = `
            <div class="st-search-loading">
                <div class="st-spinner-small"></div>
                Searching...
            </div>
        `;
        container.style.display = 'block';
    }

    // Update mobile results
    const mobileContainer = document.getElementById('stSearchResultsMobile');
    if (mobileContainer) {
        mobileContainer.innerHTML = `
            <div style="padding:20px;text-align:center;color:#94A3B8;display:flex;align-items:center;justify-content:center;gap:12px;">
                <div style="width:20px;height:20px;border:3px solid #E2E8F0;border-top-color:#6C3CE1;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
                Searching...
            </div>
        `;
    }

    try {
        const client = getSupabaseClient();
        if (!client) {
            showSearchError();
            return;
        }

        // Search in products
        const { data, error } = await client
            .from('products')
            .select('id, name, price, image, brand, category')
            .or(`name.ilike.%${trimmedQuery}%,brand.ilike.%${trimmedQuery}%,category.ilike.%${trimmedQuery}%,description.ilike.%${trimmedQuery}%`)
            .order('created_at', { ascending: false })
            .limit(8);

        if (error) throw error;

        searchResults = data || [];
        selectedSearchIndex = -1;
        renderSearchResults(searchResults, trimmedQuery);

    } catch (err) {
        console.error('❌ Search error:', err);
        showSearchError();
    }
}

// --- Render Search Results ---
function renderSearchResults(results, query) {
    // Desktop results
    const container = document.getElementById('stSearchResults');
    if (!container) return;

    if (results.length === 0) {
        container.innerHTML = `
            <div class="st-search-empty">
                <i class="fas fa-search" style="font-size:24px;display:block;margin-bottom:8px;color:#E2E8F0;"></i>
                No products found for "<strong>${query}</strong>"
            </div>
            <a href="Search.html?search=${encodeURIComponent(query)}" class="st-search-view-all">
                View all results for "${query}" →
            </a>
        `;
        container.style.display = 'block';
    } else {
        container.innerHTML = results.map((item, index) => `
            <a href="item.html?product=${item.id}" class="st-search-item" data-index="${index}">
                <img src="${item.image || 'https://placehold.co/40x40/6C3CE1/FFFFFF?text=Product'}" 
                     alt="${item.name}" 
                     onerror="this.src='https://placehold.co/40x40/6C3CE1/FFFFFF?text=Product'">
                <div class="st-search-info">
                    <div class="st-search-name">${highlightMatch(item.name || 'Unknown', query)}</div>
                    <div class="st-search-meta">${item.brand || item.category || ''}</div>
                </div>
                <div class="st-search-price">FCFA ${(item.price || 0).toFixed(2)}</div>
            </a>
        `).join('') + `
            <a href="Search.html?search=${encodeURIComponent(query)}" class="st-search-view-all">
                View all ${results.length} results for "${query}" →
            </a>
        `;
        container.style.display = 'block';
    }

    // Mobile results
    const mobileContainer = document.getElementById('stSearchResultsMobile');
    if (mobileContainer) {
        if (results.length === 0) {
            mobileContainer.innerHTML = `
                <div class="st-search-empty">
                    <i class="fas fa-search" style="font-size:32px;display:block;margin-bottom:12px;color:#E2E8F0;"></i>
                    No products found for "<strong>${query}</strong>"
                </div>
                <a href="Search.html?search=${encodeURIComponent(query)}" class="st-search-view-all">
                    View all results for "${query}" →
                </a>
            `;
        } else {
            mobileContainer.innerHTML = results.map(item => `
                <a href="item.html?product=${item.id}" class="st-search-item">
                    <img src="${item.image || 'https://placehold.co/50x50/6C3CE1/FFFFFF?text=Product'}" 
                         alt="${item.name}" 
                         onerror="this.src='https://placehold.co/50x50/6C3CE1/FFFFFF?text=Product'">
                    <div class="st-search-info">
                        <div class="st-search-name">${highlightMatch(item.name || 'Unknown', query)}</div>
                        <div class="st-search-meta">${item.brand || item.category || ''}</div>
                    </div>
                    <div class="st-search-price">FCFA ${(item.price || 0).toFixed(2)}</div>
                </a>
            `).join('') + `
                <a href="Search.html?search=${encodeURIComponent(query)}" class="st-search-view-all">
                    View all ${results.length} results for "${query}" →
                </a>
            `;
        }
    }
}

// --- Highlight Match ---
function highlightMatch(text, query) {
    if (!text || !query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<strong style="color:#6C3CE1;">$1</strong>');
}

// --- Show Search Error ---
function showSearchError() {
    const container = document.getElementById('stSearchResults');
    if (container) {
        container.innerHTML = `
            <div class="st-search-empty">
                <i class="fas fa-exclamation-circle" style="font-size:24px;display:block;margin-bottom:8px;color:#EF4444;"></i>
                Search unavailable. Please try again.
            </div>
        `;
        container.style.display = 'block';
    }
    const mobileContainer = document.getElementById('stSearchResultsMobile');
    if (mobileContainer) {
        mobileContainer.innerHTML = `
            <div class="st-search-empty">
                <i class="fas fa-exclamation-circle" style="font-size:32px;display:block;margin-bottom:12px;color:#EF4444;"></i>
                Search unavailable. Please try again.
            </div>
        `;
    }
}

// --- Hide Search Results ---
function hideSearchResults() {
    const container = document.getElementById('stSearchResults');
    if (container) {
        container.style.display = 'none';
    }
    // Don't hide mobile modal on blur - it's controlled separately
}

// --- Open Mobile Search ---
function openMobileSearch() {
    const overlay = document.getElementById('stSearchOverlay');
    const modal = document.getElementById('stSearchModal');
    const input = document.getElementById('stMobileSearchModalInput');
    if (overlay) overlay.classList.add('active');
    if (modal) modal.classList.add('active');
    if (input) {
        // Copy value from mobile search input
        const mobileInput = document.getElementById('stMobileSearchInput');
        if (mobileInput) input.value = mobileInput.value;
        setTimeout(() => input.focus(), 100);
    }
    document.body.style.overflow = 'hidden';
}

// --- Close Mobile Search ---
function closeMobileSearch() {
    const overlay = document.getElementById('stSearchOverlay');
    const modal = document.getElementById('stSearchModal');
    if (overlay) overlay.classList.remove('active');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

// --- Navigate Search Results (Keyboard) ---
function navigateSearchResults(direction) {
    const items = document.querySelectorAll('.st-search-item');
    if (items.length === 0) return;

    // Remove previous active
    items.forEach(el => el.classList.remove('active'));

    selectedSearchIndex = Math.max(0, Math.min(items.length - 1, selectedSearchIndex + direction));
    
    const activeItem = items[selectedSearchIndex];
    if (activeItem) {
        activeItem.classList.add('active');
        activeItem.scrollIntoView({ block: 'nearest' });
    }
}

// --- Select Current Search Result ---
function selectCurrentSearchResult() {
    const items = document.querySelectorAll('.st-search-item');
    if (items.length === 0) return;
    
    const index = selectedSearchIndex >= 0 ? selectedSearchIndex : 0;
    const item = items[index];
    if (item) {
        window.location.href = item.href;
    }
}

// ============================================================
//  PATCH: Update Search Event Listeners
// ============================================================

// Replace the existing search event listeners with these

// --- Desktop Search ---
const desktopSearch = document.getElementById('stSearchInput');
if (desktopSearch) {
    // Create results container
    createSearchResultsContainer();

    // Input event for real-time search
    desktopSearch.addEventListener('input', function(e) {
        const query = this.value;
        
        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Debounce search
        searchTimeout = setTimeout(() => {
            if (query.trim().length >= 1) {
                performSearch(query);
            } else {
                hideSearchResults();
            }
        }, 300);
    });

    // Focus event - show results if there's a query
    desktopSearch.addEventListener('focus', function() {
        const query = this.value;
        if (query.trim().length >= 1) {
            performSearch(query);
        }
    });

    // Blur event - hide results with delay
    desktopSearch.addEventListener('blur', function() {
        setTimeout(() => {
            // Don't hide if clicking on results
            const active = document.activeElement;
            if (active && active.closest('.st-search-results')) {
                return;
            }
            hideSearchResults();
        }, 200);
    });

    // Keyboard navigation
    desktopSearch.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            navigateSearchResults(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            navigateSearchResults(-1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const query = this.value.trim();
            if (selectedSearchIndex >= 0) {
                selectCurrentSearchResult();
            } else if (query) {
                window.location.href = `Search.html?search=${encodeURIComponent(query)}`;
            }
        } else if (e.key === 'Escape') {
            hideSearchResults();
            this.blur();
        }
    });
}

// --- Mobile Search ---
const mobileSearch = document.getElementById('stMobileSearchInput');
if (mobileSearch) {
    // Open mobile search on focus (mobile only)
    mobileSearch.addEventListener('focus', function() {
        if (window.innerWidth <= 768) {
            openMobileSearch();
            // Keep the mobile input in sync
            const modalInput = document.getElementById('stMobileSearchModalInput');
            if (modalInput) {
                modalInput.value = this.value;
                if (this.value.trim().length >= 1) {
                    performSearch(this.value);
                }
            }
        }
    });

    // Also trigger on click for mobile
    mobileSearch.addEventListener('click', function() {
        if (window.innerWidth <= 768) {
            openMobileSearch();
        }
    });
}

// --- Mobile Modal Search ---
const modalSearchInput = document.getElementById('stMobileSearchModalInput');
if (modalSearchInput) {
    // Real-time search in modal
    modalSearchInput.addEventListener('input', function() {
        const query = this.value;
        
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        searchTimeout = setTimeout(() => {
            if (query.trim().length >= 1) {
                performSearch(query);
            } else {
                // Clear mobile results
                const mobileContainer = document.getElementById('stSearchResultsMobile');
                if (mobileContainer) {
                    mobileContainer.innerHTML = `
                        <div class="st-search-empty">
                            <i class="fas fa-search" style="font-size:32px;display:block;margin-bottom:12px;color:#E2E8F0;"></i>
                            Type to search products...
                        </div>
                    `;
                }
            }
        }, 300);
    });

    // Keyboard navigation in modal
    modalSearchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = this.value.trim();
            if (query) {
                closeMobileSearch();
                window.location.href = `Search.html?search=${encodeURIComponent(query)}`;
            }
        } else if (e.key === 'Escape') {
            closeMobileSearch();
        }
    });

    // Focus on modal open
    modalSearchInput.addEventListener('focus', function() {
        // If there's a value, trigger search
        if (this.value.trim().length >= 1) {
            performSearch(this.value);
        }
    });
}

// --- Mobile Search Close ---
const modalClose = document.getElementById('stSearchModalClose');
if (modalClose) {
    modalClose.addEventListener('click', closeMobileSearch);
}

// Close on overlay click
const overlay = document.getElementById('stSearchOverlay');
if (overlay) {
    overlay.addEventListener('click', closeMobileSearch);
}

// Close on escape key (global)
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (document.getElementById('stSearchModal')?.classList.contains('active')) {
            closeMobileSearch();
        }
        hideSearchResults();
    }
});

// Handle window resize - close mobile search on desktop
window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        closeMobileSearch();
    }
});

// Handle Android back button for mobile search
document.addEventListener('backbutton', function(e) {
    if (document.getElementById('stSearchModal')?.classList.contains('active')) {
        e.preventDefault();
        closeMobileSearch();
    }
});

// ----- Update the existing handleSearch function to also work with search results -----
// Replace the existing handleSearch function with this enhanced version
function handleSearch(e) {
    const input = e.target;
    const query = input.value.trim();
    
    if (e.key === 'Enter' && query) {
        // Check if there are search results and a result is selected
        if (selectedSearchIndex >= 0) {
            selectCurrentSearchResult();
        } else {
            window.location.href = `Search.html?search=${encodeURIComponent(query)}`;
        }
    }
}

// Update the search input event listeners
const allSearchInputs = [desktopSearch, mobileSearch, modalSearchInput];
allSearchInputs.forEach(input => {
    if (input) {
        // Remove old listeners by replacing with new ones
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        
        // Re-add event listeners
        if (newInput.id === 'stSearchInput') {
            // Desktop search
            newInput.addEventListener('input', function(e) {
                const query = this.value;
                if (searchTimeout) clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (query.trim().length >= 1) {
                        performSearch(query);
                    } else {
                        hideSearchResults();
                    }
                }, 300);
            });
            newInput.addEventListener('focus', function() {
                const query = this.value;
                if (query.trim().length >= 1) {
                    performSearch(query);
                }
            });
            newInput.addEventListener('blur', function() {
                setTimeout(() => {
                    const active = document.activeElement;
                    if (active && active.closest('.st-search-results')) {
                        return;
                    }
                    hideSearchResults();
                }, 200);
            });
            newInput.addEventListener('keydown', function(e) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    navigateSearchResults(1);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    navigateSearchResults(-1);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const query = this.value.trim();
                    if (selectedSearchIndex >= 0) {
                        selectCurrentSearchResult();
                    } else if (query) {
                        window.location.href = `Search.html?search=${encodeURIComponent(query)}`;
                    }
                } else if (e.key === 'Escape') {
                    hideSearchResults();
                    this.blur();
                }
            });
        } else if (newInput.id === 'stMobileSearchInput') {
            // Mobile search
            newInput.addEventListener('focus', function() {
                if (window.innerWidth <= 768) {
                    openMobileSearch();
                    const modalInput = document.getElementById('stMobileSearchModalInput');
                    if (modalInput) {
                        modalInput.value = this.value;
                        if (this.value.trim().length >= 1) {
                            performSearch(this.value);
                        }
                    }
                }
            });
            newInput.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    openMobileSearch();
                }
            });
        } else if (newInput.id === 'stMobileSearchModalInput') {
            // Modal search
            newInput.addEventListener('input', function() {
                const query = this.value;
                if (searchTimeout) clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (query.trim().length >= 1) {
                        performSearch(query);
                    } else {
                        const mobileContainer = document.getElementById('stSearchResultsMobile');
                        if (mobileContainer) {
                            mobileContainer.innerHTML = `
                                <div class="st-search-empty">
                                    <i class="fas fa-search" style="font-size:32px;display:block;margin-bottom:12px;color:#E2E8F0;"></i>
                                    Type to search products...
                                </div>
                            `;
                        }
                    }
                }, 300);
            });
            newInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const query = this.value.trim();
                    if (query) {
                        closeMobileSearch();
                        window.location.href = `Search.html?search=${encodeURIComponent(query)}`;
                    }
                } else if (e.key === 'Escape') {
                    closeMobileSearch();
                }
            });
            newInput.addEventListener('focus', function() {
                if (this.value.trim().length >= 1) {
                    performSearch(this.value);
                }
            });
        }
    }
});

console.log('✅ Search with real-time results initialized');
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
            
            // Check if "Remember Me" is checked
            const remember = elements.loginRemember && elements.loginRemember.checked;
            
            if (remember) {
                localStorage.setItem('st_customer', JSON.stringify(user));
                sessionStorage.removeItem('st_customer');
                console.log('🔑 Remember me: saved to localStorage');
            } else {
                sessionStorage.setItem('st_customer', JSON.stringify(user));
                localStorage.removeItem('st_customer');
                console.log('🔑 Session only: saved to sessionStorage');
            }
            
            // Load cart and wishlist from DB using customer_id
            await loadUserData(user.id);
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
            
            // Save user session - register always uses localStorage (persistent)
            AppState.user = user;
            AppState.isLoggedIn = true;
            localStorage.setItem('st_customer', JSON.stringify(user));
            sessionStorage.removeItem('st_customer');
            
            // Load cart and wishlist from DB using customer_id
            await loadUserData(user.id);
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
    
    // ============================================================
    // LOGOUT HANDLER
    // ============================================================
    async function handleLogout() {
        const customerId = AppState.user?.id;
        
        // Save cart and wishlist to DB before logout
        if (customerId) {
            try {
                await saveCartToDB(customerId, AppState.cart);
                await saveWishlistToDB(customerId, AppState.wishlist);
                console.log('💾 Data saved to DB before logout');
            } catch (err) {
                console.warn('⚠️ Failed to save data before logout:', err.message);
            }
        }
        
        AppState.user = null;
        AppState.isLoggedIn = false;
        AppState.cart = [];
        AppState.wishlist = [];
        AppState.authAttempts = 0;
        
        // Clear all storage
        localStorage.removeItem('st_customer');
        localStorage.removeItem('st_cart');
        localStorage.removeItem('st_wishlist');
        sessionStorage.removeItem('st_customer');
        sessionStorage.removeItem('st_cart');
        sessionStorage.removeItem('st_wishlist');
        
        updateAuthUI();
        elements.accountDropdown.classList.remove('open');
        showNotification('👋 Logged out successfully');
    }
    
// Add logout button event listener elements
elements.logoutBtn.addEventListener('click', handleLogout); 

elements.androidLogout.addEventListener('click', () => { 
    handleLogout(); 
    closeMobileDrawer(); 
});

    // Expose for inline onclick handlers in pages
    window.handleLogout = handleLogout;
    
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
        elements.andsettingsBtn.addEventListener('click', () => {
        elements.accountDropdown.classList.remove('open');
        if (AppState.isLoggedIn) {
            window.location.href = 'account-settings.html';
        } else {
            openLoginModal();
        }
    });
    
    // ============================================================
    // LOAD USER DATA FROM DB (using customer_id)
    // ============================================================
    async function loadUserData(customerId) {
        if (!customerId) {
            console.warn('⚠️ loadUserData: No customer_id provided');
            return;
        }
        
        try {
            // Load cart from Supabase using customer_id
            const dbCart = await fetchCartFromDB(customerId);
            if (dbCart && dbCart.length > 0) {
                AppState.cart = dbCart;
                localStorage.setItem('st_cart', JSON.stringify(dbCart));
            } else {
                // If no DB cart, try to migrate local cart to DB
                const localCart = JSON.parse(localStorage.getItem('st_cart') || '[]');
                if (localCart.length > 0) {
                    AppState.cart = localCart;
                    await saveCartToDB(customerId, localCart);
                    console.log('🔄 Migrated local cart to DB');
                } else {
                    AppState.cart = [];
                }
            }
            
            // Load wishlist from Supabase using customer_id
            const dbWishlist = await fetchWishlistFromDB(customerId);
            if (dbWishlist && dbWishlist.length > 0) {
                AppState.wishlist = dbWishlist;
                localStorage.setItem('st_wishlist', JSON.stringify(dbWishlist));
            } else {
                // If no DB wishlist, try to migrate local wishlist to DB
                const localWishlist = JSON.parse(localStorage.getItem('st_wishlist') || '[]');
                if (localWishlist.length > 0) {
                    AppState.wishlist = localWishlist;
                    await saveWishlistToDB(customerId, localWishlist);
                    console.log('🔄 Migrated local wishlist to DB');
                } else {
                    AppState.wishlist = [];
                }
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
            
            // Show logout button, hide auth buttons
            elements.logoutBtn.style.display = 'flex';
            elements.androidLogout.style.display = 'flex';
            elements.authButtons.style.display = 'none';
            elements.mobileLoginBtn.style.display = 'none';
            elements.mobileRegisterBtn.style.display = 'none';
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
            
            // Hide logout button, show auth buttons
            elements.logoutBtn.style.display = 'none';
             elements.androidLogout.style.display = 'none';
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
    
    // ============================================================
    // AUTO-LOGIN from stored session
    // ============================================================
    async function checkAutoLogin() {
        // Check localStorage first (persistent "Remember Me")
        let storedData = localStorage.getItem('st_customer');
        let source = 'localStorage';
        
        // If not in localStorage, check sessionStorage
        if (!storedData) {
            storedData = sessionStorage.getItem('st_customer');
            source = 'sessionStorage';
        }
        
        if (!storedData) {
            console.log('🔑 No stored session found');
            updateAuthUI();
            return;
        }
        
        try {
            const user = JSON.parse(storedData);
            if (!user?.id || !user?.email) {
                console.warn('⚠️ Invalid stored session data');
                localStorage.removeItem('st_customer');
                sessionStorage.removeItem('st_customer');
                updateAuthUI();
                return;
            }
            
            console.log(`🔑 Auto-login from ${source} for:`, user.email);
            
            // Set user state
            AppState.user = user;
            AppState.isLoggedIn = true;
            
            // Load cart and wishlist from DB
            await loadUserData(user.id);
            updateAuthUI();
            
            console.log('✅ Auto-login successful');
        } catch (err) {
            console.warn('⚠️ Auto-login failed:', err.message);
            localStorage.removeItem('st_customer');
            sessionStorage.removeItem('st_customer');
            updateAuthUI();
        }
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
    
    // ============================================================
    // FIX: Properly expose save functions without circular reference
    // ============================================================
    
    // Make sure these are the actual functions, not wrappers that call themselves
    window.saveCartToDB = saveCartToDB;
    window.saveWishlistToDB = saveWishlistToDB;
    window.fetchCartFromDB = fetchCartFromDB;
    window.fetchWishlistFromDB = fetchWishlistFromDB;
    window.getCurrentCustomerId = getCurrentCustomerId;
    window.getSupabaseClient = getSupabaseClient;
     await populateDropdowns();
    // ----- Initialize -----
    await checkAutoLogin();
    updateAuthUI();
    
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
        checkRateLimit,
        checkAutoLogin
    };
    
    console.log('✅ Success Technology Header Initialized (Customer-based Auth)');
    console.log('👤 User:', AppState.isLoggedIn ? AppState.user?.email : 'Guest');
    console.log('📦 Cart:', AppState.cart.length, 'items');
    console.log('❤️ Wishlist:', AppState.wishlist.length, 'items');
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

// Expose critical functions globally for other scripts
window.getSupabaseClient = getSupabaseClient;
window.getCurrentCustomerId = getCurrentCustomerId;
window.saveCartToDB = saveCartToDB;
window.saveWishlistToDB = saveWishlistToDB;
window.fetchCartFromDB = fetchCartFromDB;
window.fetchWishlistFromDB = fetchWishlistFromDB;
window.fetchCategoriesAndBrands = fetchCategoriesAndBrands;

console.log('✅ Global Header System Loaded (Customer-based Auth)');
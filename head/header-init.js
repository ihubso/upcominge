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
                <a href="/category/?category=${encodeURIComponent(cat.name)}" class="st-dropdown-item">
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
                <a href="/brand/?brand=${encodeURIComponent(brand.name)}" class="st-dropdown-item">
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
                        <a href="/item/?product=${product.id}" class="st-dropdown-item">
                            <div class="st-item-icon">
                                <img src="${product.image || 'https://placehold.co/100x100/6C3CE1/FFFFFF?text=Product'}" 
                                     alt="${product.name}" 
                                     onerror="this.parentElement.innerHTML='<span class=\\'st-icon-fallback\\'><i class=\\'fas fa-box\\'></i></span>'">
                            </div>
                            <div class="st-item-info">
                                <span class="st-item-name">${product.name}</span>
                                <span class="st-item-count">FCFA${(product.price || 0).toFixed(2)}</span>
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
let cachedBusinessInfo = null;

async function getBusinessInfo() {
    if (cachedBusinessInfo) return cachedBusinessInfo;
    
    try {
        const client = getSupabaseClient();
        if (!client) {
            console.warn('⚠️ Supabase client not available, using fallback');
            return getFallbackBusinessInfo();
        }

        const { data, error } = await client
            .from('business_info')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('❌ Error fetching business info:', error);
            return getFallbackBusinessInfo();
        }

        if (data) {
            cachedBusinessInfo = data;
            console.log('✅ Business info loaded:', cachedBusinessInfo.shop_name);
            return cachedBusinessInfo;
        }

        return getFallbackBusinessInfo();
    } catch (err) {
        console.error('❌ Error fetching business info:', err);
        return getFallbackBusinessInfo();
    }
}

function getFallbackBusinessInfo() {
    return {
        id: 'fallback',
        shop_name: 'Success Technology',
        email: 'austinlebechi02@gmail.com',
        phone: '+2250172934545',
        address: 'Angre djibi terminus 82/81',
        facebook: '',
        instagram: '',
        tiktok: '',
        created_at: new Date().toISOString()
    };
}

function setPendingCheckout(value = true) {
    try {
        const state = value ? '1' : '0';
        localStorage.setItem('st_pending_checkout', state);
        sessionStorage.setItem('st_pending_checkout', state);
    } catch (err) {
        console.warn('⚠️ Failed to save pending checkout state:', err);
    }
}

function clearPendingCheckout() {
    try {
        localStorage.removeItem('st_pending_checkout');
        sessionStorage.removeItem('st_pending_checkout');
    } catch (err) {
        console.warn('⚠️ Failed to clear pending checkout state:', err);
    }
}

function shouldRedirectToCheckout() {
    try {
        return localStorage.getItem('st_pending_checkout') === '1' || sessionStorage.getItem('st_pending_checkout') === '1';
    } catch (err) {
        return false;
    }
}

window.setPendingCheckout = setPendingCheckout;
window.clearPendingCheckout = clearPendingCheckout;
window.shouldRedirectToCheckout = shouldRedirectToCheckout;

async function initHeader() {
   
    const elements = {
        registerName: document.getElementById('stRegisterName'),
        registerEmail: document.getElementById('stRegisterEmail'),
        registerPassword: document.getElementById('stRegisterPassword'),
        registerCountryCode: document.getElementById('stRegisterCountryCode'),
        registerPhone: document.getElementById('stRegisterPhone'),
        registerAddress: document.getElementById('stRegisterAddress'),
        registerCountry: document.getElementById('stRegisterCountry'),
        registerTerms: document.getElementById('stRegisterTerms'),
        registerSubmit: document.getElementById('stRegisterSubmit'),
        
        switchToRegister: document.getElementById('stSwitchToRegister'),
        switchToLogin: document.getElementById('stSwitchToLogin'),
        myOrdersBtn: document.getElementById('stMyOrdersBtn'),
        andmyOrdersBtn: document.getElementById('andstMyOrdersBtn'),
        settingsBtn: document.getElementById('stSettingsBtn'),
        andsettingsBtn: document.getElementById('andstSettingsBtn'),
        loginEmailError: document.getElementById('stLoginEmailError'),
        loginPasswordError: document.getElementById('stLoginPasswordError'),
        registerNameError: document.getElementById('stRegisterNameError'),
        registerEmailError: document.getElementById('stRegisterEmailError'),
        registerPasswordError: document.getElementById('stRegisterPasswordError'),
        registerPhoneError: document.getElementById('stRegisterPhoneError'),
        registerAddressError: document.getElementById('stRegisterAddressError'),
        registerCountryError: document.getElementById('stRegisterCountryError'),
        registerTermsError: document.getElementById('stRegisterTermsError'),
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
        foryoumobileWishlistBtn: document.getElementById('stForyouMobileWishlistBtn'),
        mobileCartCount: document.getElementById('stMobileCartCount'),
        mobileWishlistCount: document.getElementById('stMobileWishlistCount'),
        mobileAccountBtn: document.getElementById('stMobileAccountBtn'),
        mobileAvatar: document.getElementById('stMobileAvatar'),
        accountAvatar: document.getElementById('stAccountAvatar'),
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
         andmyOrdersBtn: document.getElementById('andstMyOrdersBtn'),
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
   openMobileDrawer();
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
            window.location.href = `/Search/?search=${encodeURIComponent(e.target.value.trim())}`;
        }
    }
    
    elements.searchInput.addEventListener('keypress', handleSearch);
    elements.mobileSearchInput.addEventListener('keypress', handleSearch);
    
    // ----- Cart & Wishlist -----
    elements.cartBtn.addEventListener('click', () => window.location.href = '/Cart');
    elements.mobileCartBtn.addEventListener('click', () => window.location.href = '/Cart');
    elements.wishlistBtn.addEventListener('click', () => window.location.href = '/wishlist');
    elements.mobileWishlistBtn.addEventListener('click', () => window.location.href = '/wishlist');
        elements.foryoumobileWishlistBtn.addEventListener('click', () => window.location.href = '/ForYou');
    
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
            /* Prevent mobile search from capturing taps outside */
.st-mobile-topbar .st-search-wrapper {
    position: relative;
    z-index: 1;
}

.st-search-wrapper {
    position: relative;
    z-index: 1;
}

/* Make sure the search input doesn't capture clicks from outside */
.st-search-input {
    pointer-events: auto;
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
            /* Target the modal specifically for mobile devices */
@media (max-width: 768px) {
  #stAuthModal {
    display: flex !important;
    justify-content: center;
    align-items: center;
    padding: 0 !important;
  }

  #stAuthModal .st-modal {
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    margin: 0 !important;
    border-radius: 0 !important;
    overflow-y: auto; /* Ensure content is scrollable if it exceeds screen height */
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
            <a href="/Search/?search=${encodeURIComponent(query)}" class="st-search-view-all">
                View all results for "${query}" →
            </a>
        `;
        container.style.display = 'block';
    } else {
        container.innerHTML = results.map((item, index) => `
            <a href="/item/?product=${item.id}" class="st-search-item" data-index="${index}">
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
            <a href="/Search/?search=${encodeURIComponent(query)}" class="st-search-view-all">
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
                <a href="/Search/?search=${encodeURIComponent(query)}" class="st-search-view-all">
                    View all results for "${query}" →
                </a>
            `;
        } else {
            mobileContainer.innerHTML = results.map(item => `
                <a href="/item/?product=${item.id}" class="st-search-item">
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
                <a href="/Search/?search=${encodeURIComponent(query)}" class="st-search-view-all">
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


function openMobileSearch() {
    const overlay = document.getElementById('stSearchOverlay');
    const modal = document.getElementById('stSearchModal');
    const input = document.getElementById('stMobileSearchModalInput');
    const mobileInput = document.getElementById('stMobileSearchInput');
    
    if (overlay) overlay.classList.add('active');
    if (modal) modal.classList.add('active');
    if (input) {
        // Copy value from mobile search input
        if (mobileInput) input.value = mobileInput.value;
        setTimeout(() => input.focus(), 100);
    }
    document.body.style.overflow = 'hidden';
    
    // Add event listener for the modal close button
    const closeBtn = document.getElementById('stSearchModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeMobileSearch);
    }
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
                window.location.href = `/Search/?search=${encodeURIComponent(query)}`;
            }
        } else if (e.key === 'Escape') {
            hideSearchResults();
            this.blur();
        }
    });
}


const mobileSearch = document.getElementById('stMobileSearchInput');
if (mobileSearch) {

    
    mobileSearch.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (window.innerWidth <= 768) {
            // Only open if the click was directly on the input
            if (e.target === this) {
                openMobileSearch();
                const modalInput = document.getElementById('stMobileSearchModalInput');
                if (modalInput) {
                    modalInput.value = this.value;
                    if (this.value.trim().length >= 1) {
                        performSearch(this.value);
                    }
                    // Focus the modal input after a small delay
                    setTimeout(() => modalInput.focus(), 100);
                }
            }
        }
    });
    
    // Prevent touch events from bubbling up
    mobileSearch.addEventListener('touchstart', function(e) {
        e.stopPropagation();
    });
    
    // Prevent form submission on mobile
    const mobileForm = mobileSearch.closest('form');
    if (mobileForm) {
        mobileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const query = mobileSearch.value.trim();
            if (query) {
                window.location.href = `/Search/?search=${encodeURIComponent(query)}`;
            }
        });
    }
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
                window.location.href = `/Search/?search=${encodeURIComponent(query)}`;
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
            window.location.href = `/Search/?search=${encodeURIComponent(query)}`;
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
                        window.location.href = `/Search/?search=${encodeURIComponent(query)}`;
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
                        window.location.href = `/Search/?search=${encodeURIComponent(query)}`;
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
            const remember = elements.loginRemember && elements.loginRemember.checked;
            setAuthenticatedUser(user, { remember, persist: true });
            
            // Load cart and wishlist from DB using customer_id
            await loadUserData(user.id, false);
            closeAuthModal();
            
            if (window.shouldRedirectToCheckout && window.shouldRedirectToCheckout()) {
                window.clearPendingCheckout();
                showNotification('✅ Redirecting you to checkout...');
                setTimeout(() => {
                    window.location.href = '/checkout/';
                }, 300);
            } else {
                showNotification(`✅ Welcome back, ${user.name}!`);
                setTimeout(() => {
                    window.location.reload();
                }, 5000);
            }

            
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
// ============================================================
// REGISTER HANDLER - UPDATED with new fields
// ============================================================

elements.registerSubmit.addEventListener('click', async () => {
    const name = elements.registerName.value.trim();
    const email = elements.registerEmail.value.trim();
    const password = elements.registerPassword.value;
    
    // ✅ NEW: Get phone with country code
    const countryCode = elements.registerCountryCode.value || '+237';
    const phoneNumber = elements.registerPhone.value.trim();
    const fullPhone = phoneNumber ? countryCode + phoneNumber.replace(/^0+/, '') : '';
    
    // ✅ NEW: Get address and country
    const address = elements.registerAddress.value.trim();
    const country = elements.registerCountry.value;
    
    let isValid = true;
    
    // Validate name
    if (!name || name.length < 2) {
        elements.registerName.classList.add('error');
        elements.registerNameError.classList.add('visible');
        isValid = false;
    } else {
        elements.registerName.classList.remove('error');
        elements.registerNameError.classList.remove('visible');
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
    
    // ✅ NEW: Validate phone (optional but recommended)
    if (phoneNumber && phoneNumber.length < 4) {
        elements.registerPhone.classList.add('error');
        if (elements.registerPhoneError) elements.registerPhoneError.classList.add('visible');
        isValid = false;
    } else {
        elements.registerPhone.classList.remove('error');
        if (elements.registerPhoneError) elements.registerPhoneError.classList.remove('visible');
    }
    
    // ✅ NEW: Validate address (optional)
    if (address && address.length < 3) {
        elements.registerAddress.classList.add('error');
        if (elements.registerAddressError) elements.registerAddressError.classList.add('visible');
        isValid = false;
    } else {
        elements.registerAddress.classList.remove('error');
        if (elements.registerAddressError) elements.registerAddressError.classList.remove('visible');
    }
    
    // ✅ NEW: Validate terms
    if (!elements.registerTerms.checked) {
        elements.registerTermsError.classList.add('visible');
        isValid = false;
    } else {
        elements.registerTermsError.classList.remove('visible');
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
    elements.registerSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    
    try {
        console.log('🔐 Attempting signup for:', email);
        
        // ✅ NEW: Pass all fields to signup
        const user = await signUpCustomer(
            email, 
            password, 
            name, 
            fullPhone,      // phone with country code
            address,        // full address
            country         // country
        );
        
        console.log('✅ Signup successful for:', user.email);
        AppState.authAttempts = 0;
        
        // Save user session
        setAuthenticatedUser(user, { remember: true, persist: true });
        
        // Load cart and wishlist from DB
        await loadUserData(user.id, true);
        closeAuthModal();
        
        if (window.shouldRedirectToCheckout && window.shouldRedirectToCheckout()) {
            window.clearPendingCheckout();
            showNotification('✅ Redirecting you to checkout...');
            setTimeout(() => {
                window.location.href = '/checkout/';
            }, 300);
        } else {
            showNotification(`✅ Account created successfully! Welcome ${user.name}!`);
            setTimeout(() => {
                window.location.reload();
            }, 5000);
        }
        
    } catch (err) {
        console.error('❌ Signup error:', err);
        showNotification(err.message || '❌ Registration failed. Please try again.', 'error');
    } finally {
        AppState.isAuthLoading = false;
        elements.registerSubmit.disabled = false;
        elements.registerSubmit.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
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
       window.location.reload();
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
            window.location.href = '/orders';
        } else {
            openLoginModal();
        }
    });
     elements.andmyOrdersBtn.addEventListener('click', () => {
       closeMobileDrawer();
        if (AppState.isLoggedIn) {
            window.location.href = '/orders';
        } else {
            openLoginModal();
        }
    });
    
    elements.settingsBtn.addEventListener('click', () => {
        elements.accountDropdown.classList.remove('open');
        if (AppState.isLoggedIn) {
            window.location.href = '/account-settings';
        } else {
            openLoginModal();
        }
    });
        elements.andsettingsBtn.addEventListener('click', () => {
        elements.accountDropdown.classList.remove('open');
        if (AppState.isLoggedIn) {
            window.location.href = '/account-settings';
        } else {
            openLoginModal();
        }
    });
    
    // ============================================================
    // LOAD USER DATA FROM DB (using customer_id)
    // ============================================================

async function loadUserData(customerId, shouldMigrate = false) {
    if (!customerId) {
        console.warn('⚠️ loadUserData: No customer_id provided');
        return;
    }
    
    try {
        // Load cart from Supabase using customer_id
        const dbCart = await fetchCartFromDB(customerId);
        
        if (dbCart && dbCart.length > 0) {
            // User has existing cart in DB - use it
            AppState.cart = dbCart;
            // Update local storage to match DB
            localStorage.setItem('stdbcart', JSON.stringify(dbCart));
            console.log(`📦 Loaded ${dbCart.length} items from DB cart`);
        } else if (shouldMigrate) {
            // Only migrate local cart if this is a NEW account (signup)
            const localCart = JSON.parse(localStorage.getItem('st_cart') || '[]');
            if (localCart.length > 0) {
                AppState.cart = localCart;
                await saveCartToDB(customerId, localCart);
                console.log(`🔄 Migrated ${localCart.length} items from local cart to DB (NEW ACCOUNT)`);
            } else {
                AppState.cart = [];
            }
        } else {
            // Login - no DB cart and no migration
            AppState.cart = [];
            console.log('📦 No DB cart found for this user');
        }
        
        // Load wishlist from Supabase using customer_id
        const dbWishlist = await fetchWishlistFromDB(customerId);
        if (dbWishlist && dbWishlist.length > 0) {
            AppState.wishlist = dbWishlist;
            localStorage.setItem('st_wishlist', JSON.stringify(dbWishlist));
            console.log(`❤️ Loaded ${dbWishlist.length} items from DB wishlist`);
        } else if (shouldMigrate) {
            // Only migrate local wishlist on signup
            const localWishlist = JSON.parse(localStorage.getItem('st_wishlist') || '[]');
            if (localWishlist.length > 0) {
                AppState.wishlist = localWishlist;
                await saveWishlistToDB(customerId, localWishlist);
                console.log(`🔄 Migrated ${localWishlist.length} items from local wishlist to DB (NEW ACCOUNT)`);
            } else {
                AppState.wishlist = [];
            }
        } else {
            AppState.wishlist = [];
            console.log('❤️ No DB wishlist found for this user');
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
                if (elements.accountAvatar) elements.accountAvatar.textContent = initial;
                if (elements.dropdownAvatar) elements.dropdownAvatar.textContent = initial;
                if (elements.dropdownName) elements.dropdownName.textContent = name;
                if (elements.dropdownEmail) elements.dropdownEmail.textContent = user.email || '';
            
            // Mobile
                if (elements.mobileAvatar) elements.mobileAvatar.textContent = initial;
        
            
            // Show logout button, hide auth buttons
                if (elements.logoutBtn) elements.logoutBtn.style.display = 'flex';
                if (elements.androidLogout) elements.androidLogout.style.display = 'flex';
                if (elements.authButtons) elements.authButtons.style.display = 'none';
                if (elements.mobileLoginBtn) elements.mobileLoginBtn.style.display = 'none';
                if (elements.mobileRegisterBtn) elements.mobileRegisterBtn.style.display = 'none';
        } else {
            // Desktop
                if (elements.accountAvatar) elements.accountAvatar.textContent = 'G';
                if (elements.accountLabel) elements.accountLabel.textContent = 'Guest';
                if (elements.dropdownAvatar) elements.dropdownAvatar.textContent = 'G';
                if (elements.dropdownName) elements.dropdownName.textContent = 'Guest';
                if (elements.dropdownEmail) elements.dropdownEmail.textContent = '';
            
            // Mobile
                if (elements.mobileAvatar) elements.mobileAvatar.textContent = 'G';
          
            
            // Hide logout button, show auth buttons
                if (elements.logoutBtn) elements.logoutBtn.style.display = 'none';
                if (elements.androidLogout) elements.androidLogout.style.display = 'none';
                if (elements.authButtons) elements.authButtons.style.display = 'block';
        }
        
        updateCounts();
    }
    
    // ----- Update Counts -----
    function updateCounts() {
        const totalItems = AppState.cart.reduce((sum, item) => sum + (item.qty || 1), 0);
        
        if (elements.cartCount) elements.cartCount.textContent = totalItems;
        if (elements.wishlistCount) elements.wishlistCount.textContent = AppState.wishlist.length;
        if (elements.mobileCartCount) elements.mobileCartCount.textContent = totalItems;
        if (elements.mobileWishlistCount) elements.mobileWishlistCount.textContent = AppState.wishlist.length;
    }

    function setAuthenticatedUser(user, { remember = false, persist = true } = {}) {
        if (!user?.id) return false;

        AppState.user = user;
        AppState.isLoggedIn = true;

        if (window.STHeader) {
            window.STHeader.AppState = AppState;
        }

        window.AppState = AppState;

        if (persist) {
            if (remember) {
                localStorage.setItem('st_customer', JSON.stringify(user));
                sessionStorage.removeItem('st_customer');
            } else {
                sessionStorage.setItem('st_customer', JSON.stringify(user));
                localStorage.removeItem('st_customer');
            }
        }

        if (typeof window.updateUrlWithUserInfo === 'function') {
            window.updateUrlWithUserInfo();
        }

        updateAuthUI();
        return true;
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
            setAuthenticatedUser(user, { remember: source === 'localStorage', persist: true });
            
            await loadUserData(user.id, false);
            
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
    updateUrlWithUserInfo();
    window.getCurrentUser = getCurrentUser;
    window.getBusinessInfo = getBusinessInfo;
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
window.saveWishlistToDB = saveWishlistToDB;
window.fetchCartFromDB = fetchCartFromDB;
window.fetchWishlistFromDB = fetchWishlistFromDB;
window.fetchCategoriesAndBrands = fetchCategoriesAndBrands;

console.log('✅ Global Header System Loaded (Customer-based Auth)');
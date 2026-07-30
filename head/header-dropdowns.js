
const HEADER_CONFIG = {
    shopName: 'SUCESS<span class="st-brand-highlight">TECHNOLOGY</span>',
    logoText: 'ST',
    navLinks: [
        { label: 'Products', icon: 'fa-box', href: '/product/', dropdown: true, dropdownType: 'products' },
        { label: 'Categories', icon: 'fa-th-large', href: '/category/', dropdown: true, dropdownType: 'categories' },
        { label: 'Brands', icon: 'fa-tag', href: '/brand/', dropdown: true, dropdownType: 'brands' },
        { label: 'Contact', icon: 'fa-envelope', href: '/contactus' }
    ],
    pages: {
        cart: '/cart',
        wishlist: '/wishlist',
        orders: '/orders',
        settings: '/account-settings',
        products: '/product/',
        category: '/category/',
        brand: '/brand/'
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
(function () {
    'use strict';

    /* ============================================================
       MODULE STATE
       ============================================================ */
    let wishlistItems = [];
    let wishlistIds = [];
    let productCache = {};

    /* ============================================================
       ELEMENT LOOKUP
       ============================================================ */
    function getEls() {
        return {
            page:  document.getElementById('stWishlistPage'),
            grid:  document.getElementById('stWishlistGrid'),
            count: document.getElementById('stWishlistPageCount'),
            clear: document.getElementById('stClearWishlistBtn'),
        };
    }

    /* ============================================================
       IDENTIFIER
       ============================================================ */
    function getOwner() {
        const customerId = window.STHeader?.AppState?.user?.id || (function () {
            try {
                const s = localStorage.getItem('st_customer') || sessionStorage.getItem('st_customer');
                if (s) { const u = JSON.parse(s); if (u?.id) return u.id; }
            } catch (_) {}
            return null;
        })();

        if (customerId) return { id: customerId, isCustomer: true };

        let sessionId = localStorage.getItem('st_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
            localStorage.setItem('st_session_id', sessionId);
        }
        return { id: sessionId, isCustomer: false };
    }

    /* ============================================================
       SKELETON LOADER
       ============================================================ */
    function renderSkeletonLoader() {
        const { grid } = getEls();
        if (!grid) return;
        const skeletonCards = Array(8).fill(0).map(() => `
            <div class="st-skeleton-card">
                <div class="st-skeleton-image"><div class="st-shimmer"></div></div>
                <div class="st-skeleton-body">
                    <div class="st-skeleton-text st-skeleton-name"></div>
                    <div class="st-skeleton-text st-skeleton-brand"></div>
                    <div class="st-skeleton-text st-skeleton-price"></div>
                </div>
            </div>`).join('');
        grid.innerHTML = `<div class="st-skeleton-grid">${skeletonCards}</div>`;
    }

    /* ============================================================
       PRODUCT FETCH (fallback for individual IDs)
       ============================================================ */
    async function fetchProductDetails(productId) {
        if (productCache[productId]) return productCache[productId];

        try {
            const client = window.getSupabaseClient?.();
            if (client) {
                // Use the single-product RPC — efficient, hits PK index
                const { data, error } = await client.rpc(
                    'get_product_details_and_increment_views',
                    { p_product_id: productId }
                );
                // NOTE: that RPC increments views. If you don't want a view bump
                // from the wishlist, use `get_product_by_id` instead if it exists.

                if (!error && data && data.length > 0) {
                    const p = data[0];
                    if (typeof p.images === 'string') {
                        try { p.images = JSON.parse(p.images); } catch { p.images = [p.image]; }
                    }
                    productCache[productId] = p;
                    return p;
                }
            }
        } catch (err) {
            console.warn('⚠️ Failed to fetch product via RPC:', err.message);
        }

        // Fallback: local storage
        try {
            const allProducts = JSON.parse(localStorage.getItem('st_products') || '[]');
            const product = allProducts.find(p => (p.id === productId || p.product_id === productId));
            if (product) { productCache[productId] = product; return product; }
        } catch (_) {}

        // Last-resort placeholder
        return {
            id: productId,
            product_id: productId,
            name: 'Product Unavailable',
            price: 0,
            image: 'https://placehold.co/600x400/6C3CE1/FFFFFF?text=No+Image',
            brand: 'Unknown Brand'
        };
    }

    /* ============================================================
       LOAD WISHLIST DATA
       ============================================================ */
    async function loadWishlistData() {
        try {
            const owner = getOwner();
            const client = window.getSupabaseClient?.();
            let wishlistProducts = [];

            if (client) {
                // ✅ RPC now returns full product data (name, price, image, etc.)
                const { data, error } = await client.rpc('get_user_wishlist', {
                    p_customer_id: owner.isCustomer ? owner.id : null,
                    p_session_id: !owner.isCustomer ? owner.id : null
                });

                if (!error && data && data.length > 0) {
                    wishlistProducts = data;
                    const ids = wishlistProducts.map(p => p.product_id).filter(Boolean);
                    localStorage.setItem('st_wishlist', JSON.stringify(ids));
                } else {
                    console.warn('⚠️ RPC wishlist empty or failed:', error?.message);
                    wishlistProducts = await fetchLocalWishlistProducts();
                }
            } else {
                wishlistProducts = await fetchLocalWishlistProducts();
            }

            // Safety: keep only valid objects
            wishlistItems = wishlistProducts.filter(p => p && typeof p === 'object');
            wishlistIds = wishlistItems.map(p => p.product_id || p.id).filter(Boolean);

            // Sync header counters
            if (window.STHeader) {
                window.STHeader.AppState.wishlist = wishlistIds;
                window.STHeader.updateCounts?.();
            }

            await renderWishlist();
        } catch (err) {
            console.error('❌ Failed to load wishlist:', err.message);
            wishlistItems = [];
            wishlistIds = [];
            await renderWishlist();
        }
    }

    async function fetchLocalWishlistProducts() {
        const localData = JSON.parse(localStorage.getItem('st_wishlist') || '[]');
        const localIds = localData
            .map(item => typeof item === 'string' ? item : (item.product_id || item.id))
            .filter(Boolean);

        if (localIds.length === 0) return [];

        const products = await Promise.all(localIds.map(id => fetchProductDetails(id)));
        return products.filter(p => p && typeof p === 'object');
    }

    /* ============================================================
       RENDER WISHLIST
       ============================================================ */
    async function renderWishlist() {
        const { grid, count } = getEls();
        if (!grid) return;

        renderSkeletonLoader();

        if (!wishlistIds || wishlistIds.length === 0) {
            grid.innerHTML = `
                <div class="st-empty-wishlist">
                    <div class="st-empty-icon"><i class="fas fa-heart"></i></div>
                    <h2 data-translate="empty_wishlist_title">Your wishlist is empty</h2>
                    <p data-translate="empty_wishlist_sub">Save your favorite items and come back to them anytime.</p>
                    <a href="/product/" class="st-btn-shop" data-translate="start_exploring">
                        <i class="fas fa-store"></i> Start Exploring
                    </a>
                </div>`;
            if (count) count.textContent = translate('items_count');
            if (typeof translateUI === 'function') translateUI();
            return;
        }

        if (count) {
            count.textContent = wishlistIds.length +  (wishlistIds.length > 1 ? ' ' : '');
        }

        try {
            grid.innerHTML = wishlistItems.map((product, index) => {
                if (!product || typeof product !== 'object') return '';

                const productId = product.product_id || product.id;
                const name      = product.name   || 'Product Unavailable';
                const brand     = product.brand  || '';
                const price     = Number(product.price) || 0;

                // Handle both snake_case (RPC) and camelCase keys
                const originalPrice = Number(product.originalPrice || product.original_price) || price;
                const discount      = Number(product.discount) || 0;
                const isDeal        = product.isDeal  || product.is_deal  || (discount > 0);
                const isNew         = product.isNew   || product.is_new   || false;
                const isHot         = product.isHot   || product.is_hot   || false;
                const rating        = Number(product.rating) || 0;
                const reviewCount   = Number(product.reviewCount || product.review_count) || 0;
                const image         = product.image || 'https://placehold.co/600x400/6C3CE1/FFFFFF?text=No+Image';

                let badge = '';
                if (isDeal)      badge = `<span class="st-card-badge st-deal" data-translate="badge_deal">🔥 Deal</span>`;
                else if (isNew)  badge = `<span class="st-card-badge st-new"  data-translate="badge_new">✨ New</span>`;
                else if (isHot)  badge = `<span class="st-card-badge st-hot"  data-translate="badge_hot">⚡ Hot</span>`;

                const starsHtml = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));

                return `
                    <div class="st-wishlist-card" data-index="${index}">
                        <div class="st-card-image">
                            <img src="${image}" alt="${name}" onerror="this.src='https://placehold.co/600x400/6C3CE1/FFFFFF?text=No+Image'">
                            ${badge}
                            <button class="st-card-remove" onclick="removeFromWishlist('${productId}')" title="Remove from wishlist">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="st-card-body">
                            <a onclick="window.navigateWithUserInfo('/item/?product=${productId}'); return false;" class="st-card-name">
                                ${name}
                            </a>
                            ${brand ? `<div class="st-card-brand">${brand}</div>` : ''}
                            <div class="st-card-price">
                                FCFA ${price.toFixed(2)}
                                ${isDeal && originalPrice > price
                                    ? `<span class="st-original-price">FCFA ${originalPrice.toFixed(2)}</span>`
                                    : ''}
                            </div>
                            ${rating > 0 ? `
                                <div class="st-card-rating">
                                    <span class="st-stars">${starsHtml}</span>
                                    <span>(${reviewCount})</span>
                                </div>` : ''}
                            <div class="st-card-actions">
                                <a onclick="window.navigateWithUserInfo('/item/?product=${productId}'); return false;" class="st-btn-view" data-translate="view_details">
                                    <i class="fas fa-eye"></i>
                                </a>
                            </div>
                        </div>
                    </div>`;
            }).join('');

            if (typeof translateUI === 'function') translateUI();
        } catch (err) {
            console.error('❌ Error rendering wishlist:', err);
            grid.innerHTML = `
                <div class="st-empty-wishlist">
                    <div class="st-empty-icon"><i class="fas fa-exclamation-circle"></i></div>
                    <h2 data-translate="error_title">Something went wrong</h2>
                    <p data-translate="error_sub">We couldn't load your wishlist. Please try again later.</p>
                    <button class="st-btn-shop" onclick="window.location.reload()" data-translate="retry">
                        <i class="fas fa-sync"></i> Retry
                    </button>
                </div>`;
        }
    }

    /* ============================================================
       REMOVE / CLEAR (SECURED)
       ============================================================ */
    async function removeFromWishlist(productId) {
        const index = wishlistIds.indexOf(productId);
        if (index === -1) return;

        wishlistIds.splice(index, 1);
        wishlistItems = wishlistItems.filter(item => (item.product_id || item.id) !== productId);
        localStorage.setItem('st_wishlist', JSON.stringify(wishlistIds));

        const owner = getOwner();
        const client = window.getSupabaseClient?.();

        if (client) {
            try {
                await client.rpc('remove_from_wishlist', {
                    p_customer_id: owner.isCustomer ? owner.id : null,
                    p_session_id: !owner.isCustomer ? owner.id : null,
                    p_product_id: productId
                });
            } catch (err) {
                console.warn('Wishlist remove sync failed:', err.message);
            }
        }

        if (window.STHeader) {
            window.STHeader.AppState.wishlist = wishlistIds;
            window.STHeader.updateCounts?.();
        }

        await renderWishlist();
        showNotification('❤️ Removed from wishlist', 'info');
    }

    async function clearWishlist() {
        if (wishlistIds.length === 0) return;
        if (!confirm('Are you sure you want to clear your entire wishlist?')) return;

        wishlistIds = [];
        wishlistItems = [];
        localStorage.setItem('st_wishlist', JSON.stringify(wishlistIds));

        const owner = getOwner();
        const client = window.getSupabaseClient?.();

        if (client) {
            try {
                await client.rpc('clear_wishlist', {
                    p_customer_id: owner.isCustomer ? owner.id : null,
                    p_session_id: !owner.isCustomer ? owner.id : null
                });
            } catch (err) {
                console.warn('Wishlist clear sync failed:', err.message);
            }
        }

        if (window.STHeader) {
            window.STHeader.AppState.wishlist = wishlistIds;
            window.STHeader.updateCounts?.();
        }

        await renderWishlist();
        showNotification('🗑️ Wishlist cleared', 'info');
    }

    /* ============================================================
       NOTIFICATION
       ============================================================ */
    function showNotification(message, type = 'success') {
        document.querySelector('.st-notification')?.remove();
        const notif = document.createElement('div');
        notif.className = `st-notification ${type}`;
        notif.textContent = message;
        document.body.appendChild(notif);
        setTimeout(() => {
            notif.style.opacity = '0';
            notif.style.transform = 'translateX(-50%) translateY(-20px)';
            notif.style.transition = 'all .3s ease';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }

    /* ============================================================
       CLEANUP / INIT
       ============================================================ */
    function cleanup() {
        wishlistItems = [];
        wishlistIds = [];
        productCache = {};
    }

    async function init() {
        const els = getEls();
        if (!els.page) return;
        cleanup();

        console.log('📄 Wishlist page: init');
        if (els.clear) els.clear.onclick = clearWishlist;

        await loadWishlistData();
        console.log('📄 Wishlist page ready');
    }

    /* ============================================================
       GLOBAL BINDINGS
       ============================================================ */
    function bindGlobals() {
        window.removeFromWishlist = removeFromWishlist;
        window.clearWishlist      = clearWishlist;
        window.renderWishlist     = renderWishlist;
        window.showNotification   = showNotification;
    }

    /* ============================================================
       BOOTSTRAP
       ============================================================ */
    function start() {
        bindGlobals();
        renderSkeletonLoader();
        init();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }

    window.addEventListener('st:page-loaded', () => { bindGlobals(); init(); });
    window.addEventListener('st:pjax-before', cleanup);
    window.addEventListener('beforeunload',  cleanup);
    renderSkeletonLoader();

    console.log('✅ Wishlist page script loaded (FULL PRODUCT DATA)');
})();
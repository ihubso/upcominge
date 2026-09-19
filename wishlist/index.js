(function () {
    'use strict';

    /* ============================================================
       MODULE STATE
       ============================================================ */
    let wishlistItems = [];
    let wishlistIds = [];
    let productCache = {};

    /* ============================================================
       ELEMENT LOOKUP — fresh each time
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
       IDENTIFIER  — who owns this wishlist?
       ============================================================ */
    function getOwner() {
        // Prefer the logged-in customer id if available
        const customerId =
            window.STHeader?.AppState?.user?.id ||
            (function () {
                try {
                    const s = localStorage.getItem('st_customer') || sessionStorage.getItem('st_customer');
                    if (s) { const u = JSON.parse(s); if (u?.id) return u.id; }
                } catch (_) {}
                return null;
            })();

        if (customerId) return { id: customerId, isCustomer: true };

        // Fall back to a stable session id
        let sessionId = localStorage.getItem('st_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
            localStorage.setItem('st_session_id', sessionId);
        }
        return { id: sessionId, isCustomer: false };
    }

    /* ============================================================
       SKELETON
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
                    <div class="st-skeleton-rating">
                        <div class="st-skeleton-text st-skeleton-stars"></div>
                        <div class="st-skeleton-text st-skeleton-reviews"></div>
                    </div>
                    <div class="st-skeleton-actions">
                        <div class="st-skeleton-btn-cart"></div>
                        <div class="st-skeleton-btn-view"></div>
                    </div>
                </div>
            </div>`).join('');
        grid.innerHTML = `<div class="st-skeleton-grid">${skeletonCards}</div>`;
    }

    /* ============================================================
       PRODUCT FETCH
       ============================================================ */
    async function fetchProductDetails(productId) {
        if (productCache[productId]) return productCache[productId];

        try {
            const client = window.getSupabaseClient?.();
            if (client) {
                const { data, error } = await client
                    .from('products').select('*').eq('id', productId).single();
                if (!error && data) {
                    productCache[productId] = data;
                    return data;
                }
            }
        } catch (err) {
            console.warn('⚠️ Failed to fetch product:', err.message);
        }

        try {
            const allProducts = JSON.parse(localStorage.getItem('st_products') || '[]');
            const product = allProducts.find(p => p.id === productId);
            if (product) { productCache[productId] = product; return product; }
        } catch (_) {}

        return {
            id: productId, name: 'Product ' + productId, price: 0,
            image: 'https://placehold.co/600x400', brand: 'Unknown Brand',
            description: 'Product details not available'
        };
    }

    /* ============================================================
       RENDER WISHLIST
       ============================================================ */
    async function renderWishlist() {
        const { grid, count } = getEls();
        if (!grid) return;

        renderSkeletonLoader();

        if (!wishlistIds || wishlistIds.length === 0) {
            grid.innerHTML = emptyMarkup();
            if (count) count.textContent = '0 items';
            if (typeof translateUI === 'function') translateUI();
            return;
        }

        if (count) count.textContent = wishlistIds.length + ' item' + (wishlistIds.length > 1 ? 's' : '');

        try {
            const products = await Promise.all(wishlistIds.map(id => fetchProductDetails(id)));
            wishlistItems = products.filter(Boolean);

            if (wishlistItems.length === 0) {
                grid.innerHTML = emptyMarkup();
                if (typeof translateUI === 'function') translateUI();
                return;
            }

            grid.innerHTML = wishlistItems.map((product, index) => {
                const isDeal = product.isDeal || false;
                const isNew  = product.isNew  || false;
                const isHot  = product.isHot  || false;
                const discount = product.discount || 0;
                const originalPrice = product.originalPrice || product.price || 0;
                const currentPrice  = product.price || 0;
                const rating        = product.rating || 0;
                const reviewCount   = product.reviewCount || 0;

                let badge = '';
                if (isDeal)      badge = `<span class="st-card-badge st-deal" data-translate="badge_deal">🔥 Deal</span>`;
                else if (isNew)  badge = `<span class="st-card-badge st-new"  data-translate="badge_new">✨ New</span>`;
                else if (isHot)  badge = `<span class="st-card-badge st-hot"  data-translate="badge_hot">⚡ Hot</span>`;

                const starsHtml = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));

                return `
                    <div class="st-wishlist-card" data-index="${index}">
                        <div class="st-card-image">
                            <img src="${product.image || product.images?.[0] || 'https://placehold.co/600x400'}"
                                 alt="${product.name || 'Product'}"
                                 onerror="this.src='https://placehold.co/600x400'">
                            ${badge}
                            <button class="st-card-remove"
                                    onclick="removeFromWishlist('${product.id}')"
                                    title="Remove from wishlist" data-translate="remove">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="st-card-body">
                            <a onclick="window.navigateWithUserInfo('/item/?product=${product.id}'); return false;" class="st-card-name">
                                ${product.name || 'Unknown Product'}
                            </a>
                            ${product.brand ? `<div class="st-card-brand">${product.brand}</div>` : ''}
                            <div class="st-card-price">
                                FCFA ${currentPrice.toFixed(2)}
                                ${discount > 0 && originalPrice > currentPrice
                                    ? `<span class="st-original-price">FCFA ${originalPrice.toFixed(2)}</span>`
                                    : ''}
                            </div>
                            ${rating > 0 ? `
                                <div class="st-card-rating">
                                    <span class="st-stars">${starsHtml}</span>
                                    <span>(${reviewCount || 0})</span>
                                </div>` : ''}
                            <div class="st-card-actions">
                                <a onclick="window.navigateWithUserInfo('/item/?product=${product.id}'); return false;"
                                   class="st-btn-view" data-translate="view_details">
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

    function emptyMarkup() {
        return `
            <div class="st-empty-wishlist">
                <div class="st-empty-icon"><i class="fas fa-heart"></i></div>
                <h2 data-translate="empty_wishlist_title">Your wishlist is empty</h2>
                <p data-translate="empty_wishlist_sub">Save your favorite items and come back to them anytime.</p>
                <a href="/product/" class="st-btn-shop" data-translate="start_exploring">
                    <i class="fas fa-store"></i> Start Exploring
                </a>
            </div>`;
    }

    /* ============================================================
       REMOVE / CLEAR
       ============================================================ */
    async function removeFromWishlist(productId) {
        const index = wishlistIds.indexOf(productId);
        if (index === -1) return;

        wishlistIds.splice(index, 1);
        wishlistItems = wishlistItems.filter(item => item.id !== productId);
        localStorage.setItem('st_wishlist', JSON.stringify(wishlistIds));

        const owner = getOwner();
        const client = window.getSupabaseClient?.();
        if (client) {
            try {
                const col = owner.isCustomer ? 'customer_id' : 'session_id';
                await client.from('wishlist').delete().eq(col, owner.id).eq('product_id', productId);
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
                const col = owner.isCustomer ? 'customer_id' : 'session_id';
                await client.from('wishlist').delete().eq(col, owner.id);
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
       SUPABASE I/O
       ============================================================ */
    async function fetchWishlistFromDB(identifier, hasCustomerId = false) {
        const client = window.getSupabaseClient?.();
        if (!client) return [];
        try {
            const col = hasCustomerId ? 'customer_id' : 'session_id';
            const { data, error } = await client
                .from('wishlist').select('product_id').eq(col, identifier);
            if (error) throw error;
            return (data || []).map(r => r.product_id);
        } catch (err) {
            console.error('❌ Error fetching wishlist:', err.message);
            return [];
        }
    }

    async function saveWishlistToDB(identifier, list, hasCustomerId = false) {
        const client = window.getSupabaseClient?.();
        if (!client) return;
        const col = hasCustomerId ? 'customer_id' : 'session_id';
        try {
            await client.from('wishlist').delete().eq(col, identifier);
            if (list.length > 0) {
                const rows = list.map(pid => ({ [col]: identifier, product_id: pid }));
                const { error } = await client.from('wishlist').insert(rows);
                if (error) console.error('❌ Error saving wishlist:', error.message);
            }
        } catch (err) {
            console.error('❌ Error:', err.message);
        }
    }

    /* ============================================================
       LOAD
       ============================================================ */
    async function loadWishlistData() {
        try {
            const owner = getOwner();

            // Prefer DB (authoritative)
            const dbWishlist = await fetchWishlistFromDB(owner.id, owner.isCustomer);

            // Local copy as fallback / merge source
            let localWishlist = [];
            try { localWishlist = JSON.parse(localStorage.getItem('st_wishlist') || '[]'); } catch (_) {}

            // If DB has items → use it. If DB is empty but local has items →
            // push local up to DB (this is the "just logged in, migrate" path).
            if (dbWishlist.length > 0) {
                wishlistIds = dbWishlist;
                localStorage.setItem('st_wishlist', JSON.stringify(dbWishlist));
            } else if (localWishlist.length > 0) {
                wishlistIds = localWishlist;
                await saveWishlistToDB(owner.id, localWishlist, owner.isCustomer);
            } else {
                wishlistIds = [];
            }

            if (window.STHeader) {
                window.STHeader.AppState.wishlist = wishlistIds;
                window.STHeader.updateCounts?.();
            }

            await renderWishlist();
        } catch (err) {
            console.warn('⚠️ Failed to load wishlist:', err.message);
            try { wishlistIds = JSON.parse(localStorage.getItem('st_wishlist') || '[]'); }
            catch (_) { wishlistIds = []; }
            await renderWishlist();
        }
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
        if (!els.page) return;      // not on the wishlist page
        cleanup();

        console.log('📄 Wishlist page: init');

        // bind handlers with .onclick so repeated inits don't stack
        if (els.clear) els.clear.onclick = clearWishlist;

        await loadWishlistData();

        console.log('📄 Wishlist page ready');
    }

    /* ============================================================
       GLOBAL BINDINGS  (rebound each init)
       ============================================================ */
    function bindGlobals() {
        window.removeFromWishlist   = removeFromWishlist;
        window.clearWishlist        = clearWishlist;
        window.renderWishlist       = renderWishlist;
        window.showNotification     = showNotification;
        window.fetchProductDetails  = fetchProductDetails;
        window.fetchWishlistFromDB  = fetchWishlistFromDB;
        window.saveWishlistToDB     = saveWishlistToDB;
       
    }

    /* ============================================================
       BOOTSTRAP
       ============================================================ */
    function start() {
        bindGlobals();
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

    console.log('✅ Wishlist page script loaded');
})();
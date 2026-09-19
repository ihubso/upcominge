(function () {
    'use strict';

    /* ============================================================
       MODULE STATE
       ============================================================ */
    let currentCategory     = '';
    let allProductsCache    = [];       // renamed so it doesn't collide with 'allProducts'
    let page                = 1;
    const perPage           = 12;
    let isLoading           = false;
    let hasMoreProducts     = true;
    let groupedItemsCache   = [];

    let relatedProductsPool = [];
    let relatedLoadedCount  = 0;
    let relatedObserver     = null;
    const RELATED_BATCH_SIZE = 4;

    let heroImages          = [];
    let heroImageIndex      = 0;
    let heroInterval        = null;

    let infiniteScrollObserver = null;
    let _syncTimer             = null;

    /* ============================================================
       HELPERS
       ============================================================ */
    function t(key, fallback) {
        if (window.Translations?.translate) {
            const r = window.Translations.translate(key);
            if (r && r !== key) return r;
        }
        return fallback || key;
    }

    function getCategoryFromUrl() {
        return new URLSearchParams(location.search).get('category') || 'all';
    }

    function showToast(msg) {
        const el = document.getElementById('toastMsg');
        if (!el) return;
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(el._timeout);
        el._timeout = setTimeout(() => el.classList.remove('show'), 2500);
    }

    function renderStars(rating) {
        const full = Math.floor(rating);
        return '★'.repeat(full) + '☆'.repeat(5 - full);
    }

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function getAverageRating(id) {
        const revs = window._cachedReviews?.[id] || [];
        if (!revs.length) return 0;
        return revs.reduce((s, r) => s + r.rating, 0) / revs.length;
    }
    function getReviewCount(id) {
        return (window._cachedReviews?.[id] || []).length;
    }

    function getCategoryIcon(category) {
        const icons = {
            phone: '📱', tablet: '📋', audio: '🎧', laptop: '💻',
            accessories: '🔌', watch: '⌚', camera: '📷',
            gaming: '🎮', tv: '📺', headphones: '🎧',
            speaker: '🔊', charger: '🔋', case: '🛡️',
            screen: '🖥️', uncategorized: '📦'
        };
        return icons[String(category || '').toLowerCase()] || '📦';
    }

    function getTranslatedCategory(category) {
        const key = `category_${String(category).toLowerCase()}`;
        if (window.Translations?.translate) {
            const r = window.Translations.translate(key);
            if (r && r !== key) return r;
        }
        const s = String(category || '');
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    function escapeHtml(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /* ============================================================
       HERO ROTATION
       ============================================================ */
    function startHeroRotation(images) {
        const bg      = document.getElementById('heroBackground');
        const skel    = document.getElementById('heroSkeleton');
        const content = document.getElementById('heroContent');
        if (!bg || !skel || !content) return;

        if (heroInterval) { clearInterval(heroInterval); heroInterval = null; }

        heroImages = images || [];
        heroImageIndex = 0;

        if (heroImages.length > 0) {
            bg.style.backgroundImage = `url(${heroImages[0]})`;
            bg.classList.add('active');
        }

        skel.style.display = 'none';
        content.style.display = 'block';

        if (heroImages.length > 1) {
            heroInterval = setInterval(() => {
                heroImageIndex = (heroImageIndex + 1) % heroImages.length;
                bg.style.opacity = '0';
                setTimeout(() => {
                    bg.style.backgroundImage = `url(${heroImages[heroImageIndex]})`;
                    bg.style.opacity = '1';
                }, 300);
            }, 4000);
        }
    }

    function stopHeroRotation() {
        if (heroInterval) { clearInterval(heroInterval); heroInterval = null; }
    }

    /* ============================================================
       FETCH
       ============================================================ */
    async function fetchAllProducts() {
        if (allProductsCache.length > 0) return allProductsCache;
        const client = window.getSupabaseClient?.();
        if (!client) return [];

        try {
            const { data, error } = await client
                .from('products').select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            allProductsCache = data || [];
            return allProductsCache;
        } catch (err) {
            console.error('❌ Error fetching products:', err.message);
            return [];
        }
    }

    /* ============================================================
       CART
       ============================================================ */
    async function getCart() {
        try { return JSON.parse(localStorage.getItem('st_cart') || '[]'); }
        catch { return []; }
    }

    async function saveCart(cart) {
        const customerId = window.getCurrentCustomerId?.();
        const sessionId = localStorage.getItem('st_session_id') || 'session_' + Date.now();
        const client = window.getSupabaseClient?.();

        if (client) {
            try {
                const col = customerId ? 'customer_id' : 'session_id';
                const id  = customerId || sessionId;
                await client.from('cart').delete().eq(col, id);
                if (cart.length > 0) {
                    const rows = cart.map(item => ({
                        [col]: id,
                        product_id: item.product_id || item.id || '',
                        name: item.name || 'Unknown Product',
                        price: item.price || 0,
                        qty: item.qty || 1,
                        image: item.image || 'https://placehold.co/400x400'
                    })).filter(r => r.product_id);
                    if (rows.length) await client.from('cart').insert(rows);
                }
            } catch (err) {
                console.warn('Cart sync error:', err.message);
            }
        }

        localStorage.setItem('st_cart', JSON.stringify(cart));
        if (window.STHeader) {
            window.STHeader.AppState.cart = cart;
            window.STHeader.updateCounts?.();
        }
        await renderCart();
    }

    async function addToCart(productId, qty = 1) {
        const products = await fetchAllProducts();
        const product  = products.find(p => p.id === productId);
        if (!product) { showToast('❌ ' + t('product_not_found', 'Product not found')); return; }

        const cart = await getCart();
        const existing = cart.find(i => i.product_id === productId || i.id === productId);
        if (existing) {
            existing.qty = (existing.qty || 0) + qty;
        } else {
            cart.push({
                product_id: productId,
                id: productId,
                name: product.name,
                price: product.price || 0,
                qty,
                image: product.image || 'https://placehold.co/400x400',
                variants: {},
                category: product.category || ''
            });
        }
        await saveCart(cart);
        showToast(`✅ ${product.name} ${t('added_to_cart', 'added to cart!')}`);
    }

    async function renderCart() {
        const cart = await getCart();
        const container = document.getElementById('cartItems');
        if (!container) return;

        if (!cart.length) {
            container.innerHTML = '<div class="text-center py-8 text-gray-500" data-translate="cart_empty">Cart empty</div>';
            const tot = document.getElementById('cartTotal');
            if (tot) tot.innerText = '0.00';
            return;
        }

        let total = 0;
        container.innerHTML = cart.map((item, index) => {
            const price = item.price || 0;
            const qty = item.qty || 0;
            total += price * qty;
            return `
                <div class="cart-item flex justify-between items-center mb-4 border-b pb-2">
                    <div>
                        <strong>${escapeHtml(item.name)}</strong><br>
                        <small>FCFA ${price.toFixed(2)}</small>
                    </div>
                    <div>
                        <button class="cart-qty-dec px-2 bg-gray-200 rounded" data-index="${index}">-</button>
                        <span class="mx-2">${qty}</span>
                        <button class="cart-qty-inc px-2 bg-gray-200 rounded" data-index="${index}">+</button>
                    </div>
                </div>`;
        }).join('');

        const tot = document.getElementById('cartTotal');
        if (tot) tot.innerText = total.toFixed(2);

        container.querySelectorAll('.cart-qty-dec').forEach(btn =>
            btn.addEventListener('click', () => updateQtyByIndex(parseInt(btn.dataset.index), -1)));
        container.querySelectorAll('.cart-qty-inc').forEach(btn =>
            btn.addEventListener('click', () => updateQtyByIndex(parseInt(btn.dataset.index), 1)));
    }

    async function updateQtyByIndex(index, delta) {
        const cart = await getCart();
        if (index < 0 || index >= cart.length) return;
        const item = cart[index];
        const newQ = (item.qty || 0) + delta;
        if (newQ <= 0) cart.splice(index, 1);
        else item.qty = newQ;
        await saveCart(cart);
    }

    /* ============================================================
       RENDER PRODUCT CARD
       ============================================================ */
    function renderProductCard(p) {
        const avg = getAverageRating(p.id);
        const cnt = getReviewCount(p.id);

        let badge = '';
        if (p.isHot)       badge = `<span class="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full" data-translate="badge_hot">HOT</span>`;
        else if (p.isNew)  badge = `<span class="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full" data-translate="badge_new">NEW</span>`;
        else if (p.isDeal) badge = `<span class="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full" data-translate="badge_deal">DEAL</span>`;

        return `
            <div class="product-card" onclick="window.navigateWithUserInfo('/item/?product=${p.id}')">
                <div class="relative">
                    <img src="${p.image || 'https://placehold.co/400x400/6C3CE1/FFFFFF?text=Product'}"
                         alt="${escapeHtml(p.name)}" loading="lazy"
                         onerror="this.src='https://placehold.co/400x400/6C3CE1/FFFFFF?text=Product'">
                    ${badge}
                </div>
                <div class="product-info">
                    <div class="product-name">${escapeHtml(p.name) || 'Unknown Product'}</div>
                    <div class="product-category">${escapeHtml(p.category) || ''}</div>
                    <div class="product-rating">
                        ${renderStars(avg)}
                        <span>(${cnt})</span>
                    </div>
                    <div class="product-actions">
                        <span class="product-price">FCFA ${(p.price || 0).toFixed(2)}</span>
                        <button class="btn-cart"
                                onclick="event.stopPropagation(); window.addToCart('${p.id}')"
                                data-translate="add_to_cart">
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                    </div>
                </div>
            </div>`;
    }

    /* ============================================================
       INFINITE SCROLL
       ============================================================ */
    function setupInfiniteScroll() {
        if (infiniteScrollObserver) { infiniteScrollObserver.disconnect(); infiniteScrollObserver = null; }

        const grid = document.getElementById('productsGrid');
        if (!grid) return;

        let sentinel = document.getElementById('infiniteScrollSentinel');
        if (!sentinel) {
            sentinel = document.createElement('div');
            sentinel.id = 'infiniteScrollSentinel';
            sentinel.className = 'w-full h-20 flex items-center justify-center';
            sentinel.innerHTML = `
                <div class="flex items-center gap-3 text-gray-500">
                    <div class="loader-small" style="width:1.5rem;height:1.5rem;border:3px solid rgba(230,0,18,0.15);border-top-color:#e60012;border-radius:9999px;animation:spin 1s linear infinite;"></div>
                    <span data-translate="loading_more_products">Loading more products...</span>
                </div>`;
            grid.parentNode.insertBefore(sentinel, grid.nextSibling);
        }
        sentinel.style.display = 'flex';

        infiniteScrollObserver = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting && !isLoading && hasMoreProducts) {
                    loadCategoryProducts(false);
                }
            });
        }, { rootMargin: '0px 0px 200px 0px', threshold: 0.1 });
        infiniteScrollObserver.observe(sentinel);
    }

    function hideInfiniteScrollIndicator() {
        const s = document.getElementById('infiniteScrollSentinel');
        if (s) s.style.display = 'none';
    }

    /* ============================================================
       LOAD PRODUCTS
       ============================================================ */
    async function loadCategoryProducts(reset = true) {
        if (isLoading) return;
        if (!reset && !hasMoreProducts) { hideInfiniteScrollIndicator(); return; }
        isLoading = true;

        const grid = document.getElementById('productsGrid');
        if (!grid) { isLoading = false; return; }

        if (reset) {
            page = 1;
            hasMoreProducts = true;
            groupedItemsCache = [];
            grid.innerHTML = '';
            document.getElementById('noProducts')?.classList.add('hidden');
            showLoadingSkeletons();
            if (infiniteScrollObserver) { infiniteScrollObserver.disconnect(); infiniteScrollObserver = null; }
            hideInfiniteScrollIndicator();
        }

        try {
            const all = await fetchAllProducts();
            const category = getCategoryFromUrl();
            currentCategory = category;

            // Hero
            const title    = document.getElementById('categoryTitle');
            const subtitle = document.getElementById('categorySubtitle');
            const icon     = document.getElementById('categoryIcon');

            if (category === 'all') {
                if (title)    title.textContent    = t('all_categories', 'All Categories');
                if (subtitle) subtitle.textContent = t('explore_collection_full', 'Explore our complete collection');
                if (icon)     icon.textContent     = '🏷️';
            } else {
                const name = getTranslatedCategory(category);
                if (title)    title.textContent    = name;
                if (subtitle) subtitle.textContent = t('discover_products', `Discover our ${name} products`);
                if (icon)     icon.textContent     = getCategoryIcon(category);
            }
            document.title = `${category === 'all' ? t('all_categories', 'All Categories') : category} · Sucess Technology`;

            // Filter
            const lower = category.toLowerCase();
            const filtered = category === 'all'
                ? all
                : all.filter(p => p.category && p.category.toLowerCase() === lower);

            // Hero images
            const heroImageUrls = filtered.filter(p => p.image).slice(0, 10).map(p => p.image);
            startHeroRotation(heroImageUrls);

            if (filtered.length === 0) {
                document.getElementById('noProducts')?.classList.remove('hidden');
                isLoading = false;
                hasMoreProducts = false;
                hideInfiniteScrollIndicator();
                return;
            }

            // Build grouped items (only on reset)
            if (reset) {
                const grouped = {};
                filtered.forEach(product => {
                    const k = product.category || 'Uncategorized';
                    (grouped[k] = grouped[k] || []).push(product);
                });
                groupedItemsCache = [];
                Object.keys(grouped).sort().forEach(cat => {
                    groupedItemsCache.push({ type: 'header', category: cat, count: grouped[cat].length });
                    grouped[cat].forEach(p => groupedItemsCache.push({ type: 'product', product: p }));
                });
            }

            // Paginate
            const start = (page - 1) * perPage;
            const end   = start + perPage;
            const items = groupedItemsCache.slice(start, end);

            if (!items.length) {
                hasMoreProducts = false;
                isLoading = false;
                hideInfiniteScrollIndicator();
                return;
            }

            // Render
            let html = '';
            items.forEach(item => {
                if (item.type === 'header') {
                    const display = getTranslatedCategory(item.category);
                    html += `
                        <div class="col-span-2 md:col-span-3 lg:col-span-4 mt-8 mb-4">
                            <h2 class="text-2xl font-bold text-gray-800 border-b-2 border-primary pb-3 flex items-center gap-3">
                                <span class="text-3xl">${getCategoryIcon(item.category)}</span>
                                <span data-translate="category_${item.category.toLowerCase()}">${display}</span>
                                <span class="text-sm font-normal text-gray-500 ml-2">(${item.count})</span>
                            </h2>
                        </div>`;
                } else {
                    html += renderProductCard(item.product);
                }
            });

            if (reset) grid.innerHTML = html;
            else       grid.insertAdjacentHTML('beforeend', html);

            hasMoreProducts = end < groupedItemsCache.length;
            page++;

            if (hasMoreProducts) setupInfiniteScroll();
            else hideInfiniteScrollIndicator();

            await renderRelatedProducts(category, all);
            if (typeof translateUI === 'function') translateUI();

        } catch (e) {
            console.error('Error loading category products:', e);
            showToast(t('error_loading_products', 'Error loading products'));
            hideInfiniteScrollIndicator();
        } finally {
            isLoading = false;
        }
    }

    function showLoadingSkeletons() {
        const grid = document.getElementById('productsGrid');
        if (!grid || grid.children.length > 0) return;
        grid.innerHTML = Array(8).fill(0).map(() => `
            <div class="skeleton-card">
                <div class="skeleton-image"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-text short"></div>
                <div class="skeleton-text price"></div>
            </div>`).join('');
    }

    /* ============================================================
       RELATED PRODUCTS
       ============================================================ */
    function appendRelatedProducts(items) {
        const grid = document.getElementById('relatedGrid');
        if (!grid) return;
        grid.insertAdjacentHTML('beforeend', items.map(p => `
            <div class="related-card" onclick="window.navigateWithUserInfo('/item/?product=${p.id}')">
                <img src="${p.image || 'https://placehold.co/200x200'}"
                     alt="${escapeHtml(p.name)}" loading="lazy"
                     onerror="this.src='https://placehold.co/200x200?text=No+Image'">
                <h4>${escapeHtml(p.name) || 'Unknown Product'}</h4>
                <p class="text-gray-400">${escapeHtml(p.category) || ''}</p>
                <div class="price">FCFA ${(p.price || 0).toFixed(2)}</div>
            </div>`).join(''));
    }

    function updateRelatedLoadMore(visible) {
        const el = document.getElementById('relatedLoadMore');
        if (el) el.classList.toggle('hidden', !visible);
    }

    function loadMoreRelatedProducts() {
        if (!relatedProductsPool.length) {
            updateRelatedLoadMore(false);
            if (relatedObserver) { relatedObserver.disconnect(); relatedObserver = null; }
            return;
        }
        const next = relatedProductsPool.splice(0, RELATED_BATCH_SIZE);
        appendRelatedProducts(next);
        relatedLoadedCount += next.length;
        updateRelatedLoadMore(Boolean(relatedProductsPool.length));
    }

    function setupRelatedObserver() {
        const sentinel = document.getElementById('relatedLoadMore');
        if (!sentinel || !('IntersectionObserver' in window)) return;
        if (relatedObserver) relatedObserver.disconnect();
        relatedObserver = new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting) loadMoreRelatedProducts(); });
        }, { rootMargin: '0px 0px 200px 0px', threshold: 0.1 });
        relatedObserver.observe(sentinel);
    }

    async function renderRelatedProducts(category, all) {
        const grid = document.getElementById('relatedGrid');
        if (!grid) return;

        let same = [], other = [];
        if (category === 'all') {
            same = [...all];
        } else {
            const low = category.toLowerCase();
            same  = all.filter(p => p.category && p.category.toLowerCase() === low);
            other = all.filter(p => p.category && p.category.toLowerCase() !== low);
        }

        shuffleArray(same);
        shuffleArray(other);

        // Take up to RELATED_BATCH_SIZE, filling from `other` if `same` is short
        const initial = same.slice(0, RELATED_BATCH_SIZE);
        const need    = RELATED_BATCH_SIZE - initial.length;
        if (need > 0) initial.push(...other.slice(0, need));

        // Build the pool: everything else, shuffled
        const usedIds = new Set(initial.map(p => p.id));
        relatedProductsPool = [...same, ...other].filter(p => !usedIds.has(p.id));
        shuffleArray(relatedProductsPool);

        relatedLoadedCount = initial.length;

        grid.innerHTML = '';
        appendRelatedProducts(initial);
        updateRelatedLoadMore(Boolean(relatedProductsPool.length));
        setupRelatedObserver();
    }

    /* ============================================================
       REVIEWS
       ============================================================ */
    function loadReviews() {
        try { window._cachedReviews = JSON.parse(localStorage.getItem('st_reviews') || '{}'); }
        catch { window._cachedReviews = {}; }
    }

    /* ============================================================
       CLEANUP / INIT
       ============================================================ */
    function cleanup() {
        stopHeroRotation();
        if (infiniteScrollObserver) { infiniteScrollObserver.disconnect(); infiniteScrollObserver = null; }
        if (relatedObserver)        { relatedObserver.disconnect();        relatedObserver = null; }
        if (_syncTimer)             { clearTimeout(_syncTimer);            _syncTimer = null; }

        currentCategory    = '';
        allProductsCache   = [];      // ← cleared so pjax nav to a different category re-fetches
        page               = 1;
        isLoading          = false;
        hasMoreProducts    = true;
        groupedItemsCache  = [];
        relatedProductsPool = [];
        relatedLoadedCount = 0;
        heroImages         = [];
        heroImageIndex     = 0;
    }

    async function syncHeaderCart() {
        if (!window.STHeader) return;
        try {
            const cart = await getCart();
            window.STHeader.AppState.cart = cart;
            window.STHeader.updateCounts?.();
        } catch (err) { console.warn('syncHeaderCart:', err); }
    }

    async function init() {
        // Bail if we're not on the category page
        const page = document.getElementById('productsGrid')
                  && document.getElementById('categoryHero');
        if (!page) return;

        cleanup();

        console.log('📄 Category page: init');

        loadReviews();
        await loadCategoryProducts(true);
        await renderCart();
        await syncHeaderCart();

        console.log('📄 Category page ready');
    }

    /* ============================================================
       GLOBAL EXPORTS
       ============================================================ */
    function bindGlobals() {
        window.addToCart          = addToCart;
        window.renderCart         = renderCart;
        window.showToast          = showToast;
        window.fetchAllProducts   = fetchAllProducts;
        window.loadCategoryProducts = loadCategoryProducts;
        window.openModal          = (id) => document.getElementById(id)?.classList.remove('hidden');
        window.closeModal         = (id) => document.getElementById(id)?.classList.add('hidden');
        window.clearCart          = async () => {
            await saveCart([]);
            showToast(t('cart_cleared', 'Cart cleared'));
            await renderCart();
        };
    }

    /* ============================================================
       BOOTSTRAP
       ============================================================ */
    function start() { bindGlobals(); init(); }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
    window.addEventListener('st:page-loaded', () => { bindGlobals(); init(); });
    window.addEventListener('st:pjax-before', cleanup);
    window.addEventListener('beforeunload',  cleanup);

    console.log('✅ Category page script loaded');
})();
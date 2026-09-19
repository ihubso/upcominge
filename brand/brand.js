(function () {
    'use strict';

    /* ============================================================
       MODULE STATE
       ============================================================ */
    let currentBrand        = '';
    let allProductsCache    = [];
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

    function normalizeBrand(value) {
        return String(value || '').trim().toLowerCase();
    }

    function getBrandFromUrl() {
        const raw = new URLSearchParams(location.search).get('brand');
        return raw && raw.trim() ? raw.trim() : 'all';
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
        return revs.length ? revs.reduce((s, r) => s + r.rating, 0) / revs.length : 0;
    }
    function getReviewCount(id) {
        return (window._cachedReviews?.[id] || []).length;
    }

    function getBrandIcon(brand) {
        const icons = {
            phone: '📱', tablet: '📋', audio: '🎧', laptop: '💻',
            accessories: '🔌', watch: '⌚', camera: '📷',
            gaming: '🎮', tv: '📺', headphones: '🎧',
            speaker: '🔊', charger: '🔋', case: '🛡️',
            screen: '🖥️', uncategorized: '📦'
        };
        return icons[String(brand || '').toLowerCase()] || '📦';
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
            } catch (err) { console.warn('Cart sync error:', err.message); }
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
        if (!product) { showToast('❌ Product not found'); return; }

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
                brand: product.brand || ''
            });
        }
        await saveCart(cart);
        showToast(`✅ ${product.name} added to cart!`);
    }

    async function renderCart() {
        const cart = await getCart();
        const container = document.getElementById('cartItems');
        if (!container) return;

        const totalEl = document.getElementById('cartTotal');
        if (!cart.length) {
            container.innerHTML = '<div class="text-center py-8 text-gray-500" data-translate="cart_empty">Cart empty</div>';
            if (totalEl) totalEl.innerText = '0.00';
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
        if (totalEl) totalEl.innerText = total.toFixed(2);

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
       PRODUCT CARD
       ============================================================ */
    function renderProductCard(p) {
        const avg = getAverageRating(p.id);
        const cnt = getReviewCount(p.id);

        let badge = '';
        if (p.isHot)       badge = '<span class="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full" data-translate="badge_hot">HOT</span>';
        else if (p.isNew)  badge = '<span class="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full" data-translate="badge_new">NEW</span>';
        else if (p.isDeal) badge = '<span class="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full" data-translate="badge_deal">DEAL</span>';

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
                    <div class="product-brand">${escapeHtml(p.brand) || ''}</div>
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
                    loadBrandProducts(false);
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
       LOAD BRAND PRODUCTS
       ============================================================ */
    async function loadBrandProducts(reset = true) {
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
            const brand = getBrandFromUrl();   // ← always fresh
            const all   = await fetchAllProducts();
            currentBrand = brand;

            // Hero text
            const title    = document.getElementById('brandTitle');
            const subtitle = document.getElementById('brandSubtitle');
            const icon     = document.getElementById('brandIcon');

            if (brand === 'all') {
                if (title) {
                    title.textContent = t('all_brands', 'All Brands');
                    title.setAttribute('data-translate', 'all_brands');
                }
                if (subtitle) {
                    subtitle.textContent = t('explore_collection', 'Explore our collection');
                    subtitle.setAttribute('data-translate', 'explore_collection');
                }
                if (icon) icon.textContent = '🏷️';
            } else {
                const display = brand.charAt(0).toUpperCase() + brand.slice(1);
                if (title) {
                    title.textContent = display;
                    title.removeAttribute('data-translate');
                }
                if (subtitle) {
                    subtitle.textContent = `Discover our ${display} products`;
                    subtitle.removeAttribute('data-translate');
                }
                if (icon) icon.textContent = getBrandIcon(brand);
            }
            document.title = `${brand === 'all' ? 'All Brands' : brand} · Sucess Technology`;

            // Filter (case-insensitive)
            const norm = normalizeBrand(brand);
            const filtered = norm === 'all'
                ? all
                : all.filter(p => normalizeBrand(p.brand) === norm);

            if (norm !== 'all' && !filtered.length) {
                console.warn(`No products matched brand "${brand}". Available brands:`,
                    [...new Set(all.map(p => p.brand).filter(Boolean))]);
            }

            // Hero images
            const heroUrls = filtered.filter(p => p.image).slice(0, 10).map(p => p.image);
            startHeroRotation(heroUrls);

            if (!filtered.length) {
                document.getElementById('noProducts')?.classList.remove('hidden');
                isLoading = false;
                hasMoreProducts = false;
                hideInfiniteScrollIndicator();
                return;
            }

            // Group by brand (normalized key, original display)
            if (reset) {
                const groups = new Map();     // normalized → { display, items }
                filtered.forEach(product => {
                    const raw = product.brand || 'Uncategorized';
                    const key = normalizeBrand(raw);
                    if (!groups.has(key)) groups.set(key, { display: raw, items: [] });
                    groups.get(key).items.push(product);
                });

                groupedItemsCache = [];
                [...groups.entries()]
                    .sort((a, b) => a[1].display.localeCompare(b[1].display))
                    .forEach(([_, g]) => {
                        groupedItemsCache.push({ type: 'header', brand: g.display, count: g.items.length });
                        g.items.forEach(p => groupedItemsCache.push({ type: 'product', product: p }));
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
                    html += `
                        <div class="col-span-2 md:col-span-3 lg:col-span-4 mt-8 mb-4">
                            <h2 class="text-2xl font-bold text-gray-800 border-b-2 border-primary pb-3 flex items-center gap-3">
                                <span class="text-3xl">${getBrandIcon(item.brand)}</span>
                                ${escapeHtml(item.brand.charAt(0).toUpperCase() + item.brand.slice(1))}
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

            await renderRelatedProducts(brand, all);
            if (typeof translateUI === 'function') translateUI();

        } catch (e) {
            console.error('Error loading brand products:', e);
            showToast('Error loading products');
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
                <p class="text-gray-400">${escapeHtml(p.brand) || ''}</p>
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

    async function renderRelatedProducts(brand, all) {
        const grid = document.getElementById('relatedGrid');
        if (!grid) return;

        const norm = normalizeBrand(brand);
        let same = [], other = [];

        if (norm === 'all') {
            same = [...all];
        } else {
            same  = all.filter(p => normalizeBrand(p.brand) === norm);
            other = all.filter(p => normalizeBrand(p.brand) !== norm);
        }

        shuffleArray(same);
        shuffleArray(other);

        // Pick up to RELATED_BATCH_SIZE from same, fill the rest from other
        const initial = same.slice(0, RELATED_BATCH_SIZE);
        const need = RELATED_BATCH_SIZE - initial.length;
        if (need > 0) initial.push(...other.slice(0, need));

        // Pool: everything not already shown
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

        currentBrand        = '';
        allProductsCache    = [];   // re-fetch on next page in case products changed
        page                = 1;
        isLoading           = false;
        hasMoreProducts     = true;
        groupedItemsCache   = [];
        relatedProductsPool = [];
        relatedLoadedCount  = 0;
        heroImages          = [];
        heroImageIndex      = 0;
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
        // Bail if not on the brand page
        const page = document.getElementById('productsGrid')
                  && document.getElementById('brandHero');
        if (!page) return;

        cleanup();
        console.log('📄 Brand page: init');

        loadReviews();
        await loadBrandProducts(true);
        await renderCart();
        await syncHeaderCart();

        console.log('📄 Brand page ready');
    }

    /* ============================================================
       GLOBAL EXPORTS
       ============================================================ */
    function bindGlobals() {
        window.addToCart         = addToCart;
        window.renderCart        = renderCart;
        window.showToast         = showToast;
        window.fetchAllProducts  = fetchAllProducts;
        window.loadbrandProducts = loadBrandProducts;
        window.openModal         = (id) => document.getElementById(id)?.classList.remove('hidden');
        window.closeModal        = (id) => document.getElementById(id)?.classList.add('hidden');
        window.clearCart         = async () => {
            await saveCart([]);
            showToast('Cart cleared');
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

    console.log('✅ Brand page script loaded');
})();
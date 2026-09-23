(function () {
    'use strict';

    /* ============================================================
       CONFIG + MODULE STATE
       ============================================================ */
    const CONFIG = {
        batchSize: 8,
        maxProducts: 1000,
        containerId: 'randomProducts',
        sentinelId: 'rp-load-more'
    };

    let allProductsCache = [];
    let randomObserver    = null;
    let isLoading         = false;
    let randomProductsPool = [];
    let loadedCount       = 0;
    let currentContainer  = null;

    /* ============================================================
       HELPERS
       ============================================================ */
    function getClient() {
        // Use the header's client if present; NEVER reassign it.
        return window.getSupabaseClient?.() || window.supabaseClient || null;
    }

    function getContainer() {
        return document.getElementById(CONFIG.containerId);
    }

    /* ============================================================
       FETCH PRODUCTS
       ============================================================ */
async function fetchAllProducts() {
    if (allProductsCache.length > 0) return allProductsCache;
    const client = window.getSupabaseClient?.();
    if (!client) return [];
    try {
    
        const { data, error } = await client.rpc('get_all_products');
        
        if (error) throw error;
        allProductsCache = data || [];
        return allProductsCache;
    } catch (err) {
        console.error('❌ Error fetching products:', err.message);
        return [];
    }
}

    function getRandomProducts(allProducts) {
        if (!allProducts?.length) return [];
        const shuffled = [...allProducts];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, CONFIG.maxProducts);
    }

    /* ============================================================
       SKELETON
       ============================================================ */
    function renderSkeletonLoader(container, count = 8) {
        if (!container) return;
        const skeletonCards = Array(count).fill(0).map(() => `
            <div class="rp-skeleton-card">
                <div class="rp-skeleton-image"><div class="rp-shimmer"></div></div>
                <div class="rp-skeleton-body">
                    <div class="rp-skeleton-line rp-skeleton-title"></div>
                    <div class="rp-skeleton-line rp-skeleton-brand"></div>
                    <div class="rp-skeleton-line rp-skeleton-price"></div>
                    <div class="rp-skeleton-rating">
                        <div class="rp-skeleton-line rp-skeleton-stars"></div>
                        <div class="rp-skeleton-line rp-skeleton-reviews"></div>
                    </div>
                </div>
            </div>`).join('');
        container.innerHTML = `<div class="rp-grid rp-skeleton-grid">${skeletonCards}</div>`;
    }

    /* ============================================================
       RENDER CARDS (fixed HTML)
       ============================================================ */
    function renderProductCards(products, container) {
        if (!container) return;

        if (!products?.length) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:#94A3B8;grid-column:1/-1;">
                    <i class="fas fa-box-open" style="font-size:48px;display:block;margin-bottom:16px;color:#E2E8F0;"></i>
                    <p style="font-size:16px;font-weight:500;" data-translate="no_products_found">No products found</p>
                    <p style="font-size:14px;margin-top:4px;" data-translate="check_back_later">Check back later for new arrivals</p>
                </div>`;
            return;
        }

        let html = '';
        products.forEach(product => {
            const image        = product.image || product.images?.[0] || 'https://placehold.co/400x400/6C3CE1/FFFFFF?text=Product';
            const price        = product.price || 0;
            const originalPrice = product.originalPrice || price;
            const discount     = product.discount || 0;
            const isNew        = product.isNew  || false;
            const isHot        = product.isHot  || false;
            const rating       = product.rating || 0;
            const reviewCount  = product.reviewCount || 0;

            let discountPercent = 0;
            if (discount > 0) discountPercent = discount;
            else if (originalPrice > price && originalPrice > 0)
                discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);

            const starsHtml = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
            const isInWishlist = window.STHeader?.AppState?.wishlist?.includes(product.id) || false;

            html += `
                <div class="rp-card" data-product-id="${product.id}">
                    <div class="rp-card-image" onclick="window.navigateWithUserInfo('/item/?product=${product.id}')">
                        <img src="${image}" alt="${product.name || 'Product'}" loading="lazy"
                             onerror="this.src='https://placehold.co/400x400/6C3CE1/FFFFFF?text=Product'">
                        ${discountPercent > 0 ? `<span class="rp-deal-badge" data-translate="badge_discount">-${discountPercent}%</span>` : ''}
                        ${isNew && !discountPercent ? `<span class="rp-new-badge" data-translate="badge_new">✨ New</span>` : ''}
                        ${isHot && !discountPercent && !isNew ? `<span class="rp-hot-badge" data-translate="badge_hot">⚡ Hot</span>` : ''}
                        <button class="rp-wishlist-btn ${isInWishlist ? 'active' : ''}"
                                data-product-id="${product.id}"
                                onclick="event.stopPropagation(); toggleRandomWishlist('${product.id}')"
                                aria-label="Add to wishlist">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                    <div class="rp-card-body" onclick="window.navigateWithUserInfo('/item/?product=${product.id}')">
                        <h4 class="rp-card-title">${product.name || 'Unknown Product'}</h4>
                        ${product.brand ? `<p class="rp-card-brand">${product.brand}</p>` : ''}
                        <div class="rp-card-price">
                            <span class="rp-current-price">FCFA ${price.toFixed(2)}</span>
                            ${discountPercent > 0 ? `<span class="rp-original-price">FCFA ${originalPrice.toFixed(2)}</span>` : ''}
                        </div>
                        ${rating > 0 ? `
                            <div class="rp-card-rating">
                                <span class="rp-stars">${starsHtml}</span>
                                <span class="rp-reviews">(${reviewCount || 0})</span>
                            </div>` : ''}
                    </div>
                    <div class="rp-card-actions">
                        <a class="rp-btn-view"
                           onclick="window.navigateWithUserInfo('/item/?product=${product.id}'); return false;"
                           data-translate="view_details">
                            <i class="fas fa-eye"></i>
                        </a>
                    </div>
                </div>`;
        });

        container.innerHTML = html;
    }

    /* ============================================================
       WISHLIST TOGGLE
       ============================================================ */
async function toggleRandomWishlist(productId) {
    try {
        const client = getClient();
           const owner = window.getOwner();
        const customerId  = owner
     

        // Always prefer the AppState wishlist if it exists (kept fresh by header),
        // otherwise fall back to localStorage.
        let wishlist = Array.isArray(window.STHeader?.AppState?.wishlist)
            ? [...window.STHeader.AppState.wishlist]
            : JSON.parse(localStorage.getItem('st_wishlist') || '[]');

        const index = wishlist.indexOf(productId);
        if (index !== -1) {
            wishlist.splice(index, 1);
            showRandomToast('❤️ Removed from wishlist', 'info');
        } else {
            wishlist.push(productId);
            showRandomToast('❤️ Added to wishlist!', 'success');
        }

        localStorage.setItem('st_wishlist', JSON.stringify(wishlist));

        if (client) {
            // ✅ SECURE: sync via RPC
            await saveRandomWishlistToDB(customerId, wishlist, !!customerId);
        }

        if (window.STHeader) {
            window.STHeader.AppState.wishlist = wishlist;
            window.STHeader.updateCounts?.();
        }

        // Toggle heart icon in place
        document.querySelectorAll(`.rp-wishlist-btn[data-product-id="${productId}"]`)
            .forEach(btn => btn.classList.toggle('active'));

    } catch (err) {
        console.error('❌ Error toggling wishlist:', err);
        showRandomToast('❌ Failed to update wishlist', 'error');
    }
}

async function saveRandomWishlistToDB(identifier, wishlist, hasCustomerId = false) {
    const client = getClient();
    if (!client) return;
    try {
        // ✅ SECURE: Single RPC replaces the delete + insert loop
        await client.rpc('sync_user_wishlist', {
            p_customer_id: hasCustomerId ? identifier : null,
            p_session_id: !hasCustomerId ? identifier : null,
            p_product_ids: wishlist
        });
    } catch (err) {
        console.error('❌ Error saving wishlist:', err.message);
    }
}

    /* ============================================================
       TOAST
       ============================================================ */
    function showRandomToast(message, type = 'success') {
        document.querySelector('.rp-toast')?.remove();
        const toast = document.createElement('div');
        toast.className = 'rp-toast';
        toast.style.cssText = `
            position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
            padding:14px 24px;
            background:${type === 'error' ? '#EF4444' : type === 'info' ? '#3B82F6' : '#10B981'};
            color:white;border-radius:12px;font-weight:600;font-size:14px;
            z-index:30000;box-shadow:0 8px 32px rgba(0,0,0,0.2);
            max-width:90%;text-align:center;
            animation:rpToastSlideUp .3s ease;font-family:'Inter',sans-serif;`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-20px)';
            toast.style.transition = 'all .3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /* ============================================================
       INFINITE SCROLL
       ============================================================ */
    function setupInfiniteScroll(container) {
        const oldSentinel = document.getElementById(CONFIG.sentinelId);
        if (oldSentinel) oldSentinel.remove();

        const sentinel = document.createElement('div');
        sentinel.id = CONFIG.sentinelId;
        sentinel.className = 'rp-load-more';
        sentinel.style.cssText = 'text-align:center;padding:20px;color:#94A3B8;font-size:14px;grid-column:1/-1;';
        sentinel.innerHTML = sentinelSkeletonMarkup('load_more');
        container.parentNode.appendChild(sentinel);

        if (randomObserver) randomObserver.disconnect();
        randomObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !isLoading) loadMoreProducts();
            });
        }, { rootMargin: '0px 0px 200px 0px', threshold: 0.1 });
        randomObserver.observe(sentinel);
    }

    function sentinelSkeletonMarkup(translateKey = 'loading_more') {
        return `
            <div class="rp-loader" style="display:flex;align-items:center;justify-content:center;gap:12px;flex-direction:column;">
                <div class="rp-loader-skeleton-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:20px;width:100%;max-width:800px;margin:0 auto;">
                    ${Array(4).fill(0).map(() => `
                        <div class="rp-skeleton-card-mini">
                            <div class="rp-skeleton-image-mini"><div class="rp-shimmer"></div></div>
                            <div class="rp-skeleton-line-mini rp-skeleton-line-mini-75"></div>
                            <div class="rp-skeleton-line-mini rp-skeleton-line-mini-50"></div>
                            <div class="rp-skeleton-line-mini rp-skeleton-line-mini-50" style="height:1rem;"></div>
                        </div>`).join('')}
                </div>
                <div style="display:flex;align-items:center;gap:12px;margin-top:8px;">
                    <div style="width:24px;height:24px;border:3px solid #E2E8F0;border-top-color:#6C3CE1;border-radius:50%;animation:rp-spin .8s linear infinite;"></div>
                    <span data-translate="${translateKey}">Loading more products...</span>
                </div>
            </div>`;
    }

    function loadMoreProducts() {
        if (isLoading) return;
        const sentinel = document.getElementById(CONFIG.sentinelId);

        if (!randomProductsPool.length) {
            if (sentinel) sentinel.style.display = 'none';
            return;
        }

        isLoading = true;
        if (sentinel) {
            sentinel.style.display = 'block';
            sentinel.innerHTML = sentinelSkeletonMarkup('loading_more');
        }

        setTimeout(() => {
            const batch = randomProductsPool.splice(0, CONFIG.batchSize);
            loadedCount += batch.length;

            if (currentContainer) {
                const temp = document.createElement('div');
                renderProductCards(batch, temp);
                currentContainer.insertAdjacentHTML('beforeend', temp.innerHTML);
            }

            isLoading = false;

            const s = document.getElementById(CONFIG.sentinelId);
            if (!s) return;
            if (randomProductsPool.length === 0) {
                s.style.display = 'none';
            } else {
                s.style.display = 'block';
                s.innerHTML = `
                    <div style="display:flex;align-items:center;justify-content:center;gap:12px;color:#94A3B8;padding:8px;">
                        <span data-translate="load_more">Load more products</span>
                        <i class="fas fa-chevron-down"></i>
                    </div>`;
            }
            if (typeof translateUI === 'function') translateUI();
        }, 400);
    }

    /* ============================================================
       INIT
       ============================================================ */
    async function initRandomProducts() {
        const container = getContainer();
        if (!container) return;

        currentContainer = container;
        renderSkeletonLoader(container);

        try {
            const allProducts = await fetchAllProducts();

            if (!allProducts?.length) {
                container.innerHTML = `
                    <div style="text-align:center;padding:60px 20px;color:#94A3B8;grid-column:1/-1;">
                        <i class="fas fa-box-open" style="font-size:48px;display:block;margin-bottom:16px;color:#E2E8F0;"></i>
                        <p style="font-size:16px;font-weight:500;" data-translate="no_products_available">No products available</p>
                        <p style="font-size:14px;margin-top:4px;" data-translate="check_back_later">Check back later for new arrivals</p>
                    </div>`;
                return;
            }

            const random = getRandomProducts(allProducts);
            const initialBatch = random.slice(0, CONFIG.batchSize);
            randomProductsPool = random.slice(CONFIG.batchSize);
            loadedCount = initialBatch.length;

            container.innerHTML = '';
            renderProductCards(initialBatch, container);

            if (randomProductsPool.length > 0) setupInfiniteScroll(container);
            else document.getElementById(CONFIG.sentinelId)?.remove();

            if (typeof translateUI === 'function') translateUI();
            console.log(`✅ Random Products: ${loadedCount} shown, ${randomProductsPool.length} more`);
        } catch (err) {
            console.error('❌ Error loading random products:', err);
            container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:#EF4444;grid-column:1/-1;">
                    <i class="fas fa-exclamation-circle" style="font-size:48px;display:block;margin-bottom:16px;"></i>
                    <p style="font-size:16px;font-weight:500;" data-translate="error_loading">Error loading products</p>
                    <p style="font-size:14px;margin-top:4px;" data-translate="please_try_again">Please try again later</p>
                    <button onclick="location.reload()" style="margin-top:16px;padding:10px 24px;background:#6C3CE1;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-family:inherit;" data-translate="retry">
                        <i class="fas fa-sync"></i> Retry
                    </button>
                </div>`;
            if (typeof translateUI === 'function') translateUI();
        }
    }

// ============================================================
// STYLES (injected once)
// ============================================================
function injectStyles() {
    const styleId = 'rp-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* ============================================
           SKELETON LOADER STYLES
           ============================================ */

        .rp-skeleton-grid {
            opacity: 0.7;
        }

        .rp-skeleton-card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }

        .rp-skeleton-image {
            width: 100%;
            padding-top: 100%;
            background: #e2e8f0;
            position: relative;
            overflow: hidden;
        }

        .rp-skeleton-body {
            padding: 14px 16px;
        }

        .rp-skeleton-line {
            background: #e2e8f0;
            border-radius: 4px;
            position: relative;
            overflow: hidden;
            margin-bottom: 8px;
        }

        .rp-skeleton-line::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(
                90deg,
                transparent 0%,
                rgba(255, 255, 255, 0.4) 50%,
                transparent 100%
            );
            animation: rpShimmer 1.5s ease-in-out infinite;
        }

        .rp-shimmer {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(
                90deg,
                rgba(255, 255, 255, 0) 0%,
                rgba(255, 255, 255, 0.4) 50%,
                rgba(255, 255, 255, 0) 100%
            );
            animation: rpShimmer 1.5s ease-in-out infinite;
        }

        @keyframes rpShimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }

        .rp-skeleton-title {
            height: 18px;
            width: 85%;
        }

        .rp-skeleton-brand {
            height: 12px;
            width: 60%;
        }

        .rp-skeleton-price {
            height: 20px;
            width: 70%;
            margin-bottom: 6px;
        }

        .rp-skeleton-rating {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .rp-skeleton-stars {
            height: 14px;
            width: 80px;
            margin-bottom: 0;
        }

        .rp-skeleton-reviews {
            height: 12px;
            width: 40px;
            margin-bottom: 0;
        }

        /* Mini skeleton for load more */
        .rp-skeleton-card-mini {
            background: white;
            border-radius: 12px;
            padding: 0.75rem;
            border: 1px solid #e2e8f0;
        }

        .rp-skeleton-image-mini {
            width: 100%;
            aspect-ratio: 1/1;
            background: #e2e8f0;
            border-radius: 8px;
            margin-bottom: 0.5rem;
            position: relative;
            overflow: hidden;
        }

        .rp-skeleton-line-mini {
            height: 0.8rem;
            background: #e2e8f0;
            border-radius: 4px;
            margin-bottom: 0.4rem;
            position: relative;
            overflow: hidden;
        }

        .rp-skeleton-line-mini::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(
                90deg,
                transparent 0%,
                rgba(255, 255, 255, 0.4) 50%,
                transparent 100%
            );
            animation: rpShimmer 1.5s ease-in-out infinite;
        }

        .rp-skeleton-line-mini-75 { width: 75%; }
        .rp-skeleton-line-mini-50 { width: 50%; }

        /* ============================================
           RANDOM PRODUCTS STYLES
           ============================================ */

        .rp-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 20px;
            width: 100%;
        }

        .rp-card {
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            transition: all 0.3s ease;
            border: 1px solid #f0f0f0;
            position: relative;
        }

        .rp-card:hover:not(.skeleton) {
            transform: translateY(-4px);
            box-shadow: 0 8px 30px rgba(0,0,0,0.1);
        }

        .rp-card-image {
            position: relative;
            width: 100%;
            padding-top: 100%;
            overflow: hidden;
            background: #f8fafc;
        }

        .rp-card-image img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
        }

        .rp-card:hover .rp-card-image img {
            transform: scale(1.05);
        }

        .rp-deal-badge,
        .rp-new-badge,
        .rp-hot-badge {
            position: absolute;
            top: 8px;
            left: 8px;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 700;
            z-index: 2;
        }

        .rp-deal-badge {
            background: #EF4444;
            color: white;
        }

        .rp-new-badge {
            background: #10B981;
            color: white;
        }

        .rp-hot-badge {
            background: #F59E0B;
            color: white;
        }

        .rp-wishlist-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 34px;
            height: 34px;
            border: none;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(4px);
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #94A3B8;
            font-size: 15px;
            z-index: 2;
        }

        .rp-wishlist-btn:hover {
            background: #EF4444;
            color: white;
            transform: scale(1.1);
        }

        .rp-wishlist-btn.active {
            background: #EF4444;
            color: white;
        }

        .rp-card-body {
            padding: 14px 16px;
            cursor: pointer;
        }

        .rp-card-title {
            font-weight: 700;
            font-size: 15px;
            color: #0F172A;
            margin: 0 0 2px 0;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            line-height: 1.3;
        }

        .rp-card-title:hover {
            color: #6C3CE1;
        }

        .rp-card-brand {
            font-size: 12px;
            color: #94A3B8;
            margin: 0 0 6px 0;
        }

        .rp-card-price {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            margin-bottom: 4px;
        }

        .rp-current-price {
            font-weight: 700;
            font-size: 18px;
            color: #0F172A;
        }

        .rp-original-price {
            font-size: 14px;
            color: #94A3B8;
            text-decoration: line-through;
        }

        .rp-card-rating {
            display: flex;
            align-items: center;
            gap: 4px;
            margin-top: 4px;
        }

        .rp-stars {
            color: #F59E0B;
            font-size: 13px;
        }

        .rp-reviews {
            color: #94A3B8;
            font-size: 13px;
        }

        .rp-card-actions {
            display: flex;
            gap: 8px;
            margin-top: 10px;
        }

        .rp-btn-cart {
            flex: 1;
            padding: 8px 14px;
            background: linear-gradient(135deg, #6C3CE1, #5A2FC4);
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: inherit;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .rp-btn-cart:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(108, 60, 225, 0.3);
        }

        .rp-btn-cart:active {
            transform: scale(0.95);
        }

        .rp-btn-view {
            padding: 8px 14px;
            border: 2px solid #E2E8F0;
            background: transparent;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            color: #0F172A;
            text-decoration: none;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
        }

        .rp-btn-view:hover {
            border-color: #6C3CE1;
            color: #6C3CE1;
            background: rgba(108, 60, 225, 0.05);
        }

        @keyframes rp-spin {
            to { transform: rotate(360deg); }
        }

        @keyframes rpToastSlideUp {
            from { transform: translateX(-50%) translateY(20px); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }

        /* ============================================
           RESPONSIVE
           ============================================ */
/* Mobile First: 2 columns by default */
#randomProducts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px; /* Adjust the spacing between items as needed */
}

/* Desktop: 6 columns for screens wider than 1024px */
@media (min-width: 1024px) {
  #randomProducts {
    grid-template-columns: repeat(4, 1fr);
  }
}
        @media (max-width: 768px) {
            .rp-grid {
                grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                gap: 16px;
            }
            .rp-card-title {
                font-size: 14px;
            }
            .rp-current-price {
                font-size: 16px;
            }
            .rp-btn-cart {
                font-size: 12px;
                padding: 6px 12px;
            }
            .rp-btn-cart i {
                font-size: 12px;
            }
            .rp-btn-view {
                font-size: 12px;
                padding: 6px 12px;
            }
            .rp-wishlist-btn {
                width: 30px;
                height: 30px;
                font-size: 13px;
                top: 6px;
                right: 6px;
            }
            .rp-deal-badge,
            .rp-new-badge,
            .rp-hot-badge {
                font-size: 10px;
                padding: 2px 8px;
                top: 6px;
                left: 6px;
            }
            .rp-loader-skeleton-grid {
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 12px !important;
            }
        }

        @media (max-width: 480px) {
            .rp-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
            }
            .rp-card-body {
                padding: 10px 12px;
            }
            .rp-card-title {
                font-size: 13px;
            }
            .rp-current-price {
                font-size: 14px;
            }
            .rp-original-price {
                font-size: 12px;
            }
            .rp-card-brand {
                font-size: 11px;
            }
            .rp-btn-cart {
                font-size: 10px;
                padding: 6px 8px;
            }
            .rp-btn-cart i {
                display: none;
            }
            .rp-btn-view {
                font-size: 10px;
                padding: 6px 10px;
                min-width: 30px;
            }
            .rp-card-rating {
                font-size: 11px;
            }
            .rp-wishlist-btn {
                width: 26px;
                height: 26px;
                font-size: 11px;
                top: 4px;
                right: 4px;
            }
            .rp-deal-badge,
            .rp-new-badge,
            .rp-hot-badge {
                font-size: 8px;
                padding: 2px 6px;
                top: 4px;
                left: 4px;
            }
            .rp-loader-skeleton-grid {
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 8px !important;
            }
            .rp-skeleton-card-mini {
                padding: 0.5rem;
            }
        }
    `;
    document.head.appendChild(style);
}

//
    /* ============================================================
       CLEANUP
       ============================================================ */
    function cleanup() {
        if (randomObserver) { randomObserver.disconnect(); randomObserver = null; }
        isLoading = false;
        randomProductsPool = [];
        loadedCount = 0;
        currentContainer = null;
        // keep allProductsCache — it's expensive to fetch and safe to reuse
    }

    /* ============================================================
       INIT + BOOTSTRAP
       ============================================================ */
    async function init() {
        const container = getContainer();
        if (!container) return;   // not on a page that has randomProducts
        cleanup();
        injectStyles();
        console.log('📄 Random Products: init');
        await initRandomProducts();
    }

    function start() { init(); }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
    window.addEventListener('st:page-loaded', init);
    window.addEventListener('st:pjax-before', cleanup);
    window.addEventListener('beforeunload',  cleanup);

    /* ============================================================
       GLOBAL EXPORTS
       ============================================================ */
    window.toggleRandomWishlist = toggleRandomWishlist;
    window.RandomProducts = {
        init: initRandomProducts,
        fetchAll: fetchAllProducts,
        getRandom: getRandomProducts,
        loadMore: loadMoreProducts,
        toggleWishlist: toggleRandomWishlist
    };

    console.log('✅ Random Products Component Loaded');
})();
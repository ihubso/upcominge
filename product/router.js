(function () {
    'use strict';

    // ---- module state (reset by cleanup) ----
    let allProducts = [];
    let processedProducts = new Set();
    let groups = [];
    let currentPage = 0;
    const PRODUCTS_PER_GROUP = 6;
    const GROUPS_PER_PAGE = 50;
    let isLoading = false;
    let hasMore = true;
    let wishlist = [];
    let cart = [];
    let heroInterval = null;
    let currentSlide = 0;
    let pageObserver = null;
    let activeFilterKey = 'default';   // ← remembered so re-render knows the mode

    // ============================================================
    //  HELPERS
    // ============================================================

    function t(key, fallback) {
        if (window.Translations?.translate) {
            const r = window.Translations.translate(key);
            if (r && r !== key) return r;
        }
        return fallback || key;
    }

    function getClient() {
        return (typeof getSupabaseClient === 'function' && getSupabaseClient())
            || window.supabaseClient
            || null;
    }

    // ============================================================
    //  FILTER CONFIG (with translation keys)
    // ============================================================
    const FILTER_CONFIG = {
        hot: {
            rpc: 'get_hot_products',
            badge: '🔥 Trending Now',
            badgeKey: 'badge_trending',
            chipIcon: 'fa-fire',
            chipLabel: 'Hot Products',
            chipLabelKey: 'filter_hot',
            title: 'Hot <span class="gradient-text">Right Now</span>',
            titleKey: 'title_hot',
            subtitle: 'The products everyone is buying this week — grab them before they sell out.',
            subtitleKey: 'subtitle_hot',
            heroHeading: 'Hot Products',
            heroHeadingKey: 'filter_hot'
        },
        new: {
            rpc: 'get_new_products',
            badge: '✨ Just Dropped',
            badgeKey: 'badge_just_dropped',
            chipIcon: 'fa-sparkles',
            chipLabel: 'New Arrivals',
            chipLabelKey: 'filter_new',
            title: 'Fresh <span class="gradient-text">Arrivals</span>',
            titleKey: 'title_new',
            subtitle: 'The newest additions to our catalog, updated daily.',
            subtitleKey: 'subtitle_new',
            heroHeading: 'New Arrivals',
            heroHeadingKey: 'filter_new'
        },
        deals: {
            rpc: 'get_active_deals',
            badge: '🔥 Limited-Time Deals',
            badgeKey: 'badge_limited_deals',
            chipIcon: 'fa-tags',
            chipLabel: 'Active Deals',
            chipLabelKey: 'filter_deals',
            title: 'Deals <span class="gradient-text">Too Good</span> To Miss',
            titleKey: 'title_deals',
            subtitle: 'Massive discounts on top products — while stocks last.',
            subtitleKey: 'subtitle_deals',
            heroHeading: 'Active Deals',
            heroHeadingKey: 'filter_deals'
        },
        featured: {
            rpc: 'get_featured_products',
            badge: '⭐ Editor\'s Picks',
            badgeKey: 'badge_editors_picks',
            chipIcon: 'fa-star',
            chipLabel: 'Featured',
            chipLabelKey: 'filter_featured',
            title: 'Featured <span class="gradient-text">Selections</span>',
            titleKey: 'title_featured',
            subtitle: 'Curated by our team for quality and value.',
            subtitleKey: 'subtitle_featured',
            heroHeading: 'Featured',
            heroHeadingKey: 'filter_featured'
        },
        default: {
            rpc: 'get_all_products',
            badge: 'Curated Just For You',
            badgeKey: 'badge_curated',
            chipIcon: null,
            chipLabel: 'All Products',
            chipLabelKey: 'filter_all_products',
            title: 'Discover <span class="gradient-text">Your</span> Perfect Picks',
            titleKey: 'title_default',
            subtitle: 'Handpicked products from your favorite brands and categories. Personalized recommendations updated daily.',
            subtitleKey: 'subtitle_default',
            heroHeading: 'For You',
            heroHeadingKey: 'for_you'
        }
    };

    function getActiveFilter() {
        const params = new URLSearchParams(window.location.search);
        const raw = (params.get('filter') || '').toLowerCase().trim();
        return FILTER_CONFIG[raw] ? raw : 'default';
    }

    function renderFilterBar(filterKey, cfg) {
        const bar = document.getElementById('filterBar');
        if (!bar) return;

        if (filterKey === 'default') {
            bar.style.display = 'none';
            bar.innerHTML = '';
            return;
        }

        bar.style.display = 'flex';
        bar.innerHTML = `
            <span class="filter-chip">
                <i class="fas ${cfg.chipIcon || 'fa-filter'}"></i>
                <span data-translate="${cfg.chipLabelKey}">${t(cfg.chipLabelKey, cfg.chipLabel)}</span>
            </span>
            <span class="filter-subtitle" data-translate="${cfg.subtitleKey}">${t(cfg.subtitleKey, cfg.subtitle)}</span>
            <select id="filterSort" class="filter-sort">
                <option value="default" data-translate="sort_featured">Sort: Featured</option>
                <option value="price-asc" data-translate="sort_price_asc">Price: Low → High</option>
                <option value="price-desc" data-translate="sort_price_desc">Price: High → Low</option>
                <option value="name" data-translate="sort_name_az">Name: A → Z</option>
                <option value="newest" data-translate="sort_newest">Newest first</option>
            </select>
            <a class="filter-clear" href="/product/">
                <i class="fas fa-times"></i> <span data-translate="clear">Clear</span>
            </a>
        `;

        // wire up sort (operates on allProducts snapshot for this filter)
        bar.querySelector('#filterSort')?.addEventListener('change', (e) => {
            const v = e.target.value;
            const arr = [...allProducts];
            if (v === 'price-asc')  arr.sort((a, b) => (a.price || 0) - (b.price || 0));
            if (v === 'price-desc') arr.sort((a, b) => (b.price || 0) - (a.price || 0));
            if (v === 'name')       arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            if (v === 'newest')     arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            const c = document.getElementById('foryouGroups');
            if (c) c.innerHTML = renderFilterGrid(arr);
        });
    }

    // Grab elements fresh — DOM is swapped by pjax
    function getEls() {
        return {
            container:      document.getElementById('foryouGroups'),
            loader:         document.getElementById('infiniteLoader'),
            endResults:     document.getElementById('endResults'),
            heroSkeleton:   document.getElementById('heroSkeleton'),
            heroContent:    document.getElementById('heroContent'),
            heroIndicators: document.getElementById('heroIndicators'),
            heroSlideshow:  document.getElementById('heroSlideshow'),
        };
    }

    function showToast(message, type = 'success') {
        document.querySelector('.toast-msg')?.remove();
        const toast = document.createElement('div');
        toast.className = `toast-msg ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-20px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function loadWishlist() { try { wishlist = JSON.parse(localStorage.getItem('st_wishlist') || '[]'); } catch { wishlist = []; } }
    function loadCart()     { try { cart     = JSON.parse(localStorage.getItem('st_cart')     || '[]'); } catch { cart     = []; } }
    function isInCart(id)   { return cart.some(i => i.product_id === id || i.id === id); }

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function getGroupIcon(name) {
        const icons = {
            'Apple': 'fab fa-apple', 'Samsung': 'fab fa-samsung',
            'Xiaomi': 'fa-mobile-alt', 'Huawei': 'fa-mobile-alt',
            'Google': 'fab fa-google', 'Microsoft': 'fab fa-microsoft',
            'Dell': 'fa-laptop', 'HP': 'fa-laptop', 'Lenovo': 'fa-laptop',
            'Asus': 'fa-laptop', 'Sony': 'fa-headphones', 'Bose': 'fa-headphones',
            'JBL': 'fa-headphones', 'Panasonic': 'fa-camera', 'Canon': 'fa-camera',
            'Nikon': 'fa-camera', 'Philips': 'fa-lightbulb', 'Logitech': 'fa-mouse',
            'Kingston': 'fa-hdd', 'SanDisk': 'fa-hdd', 'TP-Link': 'fa-wifi',
            'Netgear': 'fa-wifi', 'Belkin': 'fa-plug', 'Anker': 'fa-battery-full',
            'Ugreen': 'fa-plug', 'Crucial': 'fa-memory',
            'smartphone': 'fa-mobile-alt', 'laptop': 'fa-laptop',
            'tablet': 'fa-tablet', 'audio': 'fa-headphones',
            'accessories': 'fa-plug', 'wearable': 'fa-clock',
            'gaming': 'fa-gamepad', 'tv': 'fa-tv', 'camera': 'fa-camera',
            'printer': 'fa-print', 'storage': 'fa-hdd', 'network': 'fa-wifi',
            'power': 'fa-bolt', 'monitor': 'fa-desktop'
        };
        return icons[name] || 'fa-folder';
    }

    // ============================================================
    //  HERO SLIDESHOW
    // ============================================================

    async function fetchHeroImages(count = 6, sourceProducts = null) {
        const pool = sourceProducts && sourceProducts.length
            ? sourceProducts
            : await fetchProductsForFilter('default');
        return shuffleArray(pool.filter(p => p.image)).slice(0, count).map(p => p.image);
    }

    function initHeroSlideshow(images, els) {
        if (!images?.length) {
            images = [
                'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&q=80',
                'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80',
                'https://images.unsplash.com/photo-1517994112540-009c47ea476b?w=1200&q=80',
                'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=1200&q=80',
                'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80'
            ];
        }

        els.heroSlideshow.innerHTML = '';
        images.forEach((img, index) => {
            const slide = document.createElement('div');
            slide.className = `hero-slide ${index === 0 ? 'active' : ''}`;
            slide.style.backgroundImage = `url(${img})`;
            const overlay = document.createElement('div');
            overlay.className = 'slide-overlay';
            slide.appendChild(overlay);
            els.heroSlideshow.appendChild(slide);
        });

        els.heroIndicators.innerHTML = '';
        images.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.className = `dot ${index === 0 ? 'active' : ''}`;
            dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
            dot.addEventListener('click', () => goToSlide(index, els));
            els.heroIndicators.appendChild(dot);
        });

        els.heroSkeleton.style.display = 'none';
        els.heroContent.style.display = 'block';
        els.heroIndicators.style.display = 'flex';

        if (heroInterval) { clearInterval(heroInterval); heroInterval = null; }
        if (images.length > 1) {
            heroInterval = setInterval(() => {
                const slides = els.heroSlideshow.querySelectorAll('.hero-slide');
                const dots   = els.heroIndicators.querySelectorAll('.dot');
                slides.forEach(s => s.classList.remove('active'));
                dots.forEach(d => d.classList.remove('active'));
                currentSlide = (currentSlide + 1) % images.length;
                slides[currentSlide]?.classList.add('active');
                dots[currentSlide]?.classList.add('active');
            }, 4000);
        }
    }

    function goToSlide(index, els) {
        const slides = els.heroSlideshow.querySelectorAll('.hero-slide');
        const dots   = els.heroIndicators.querySelectorAll('.dot');
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        currentSlide = index;
        slides[index]?.classList.add('active');
        dots[index]?.classList.add('active');
    }

    // ============================================================
    //  FETCH
    // ============================================================

    async function fetchProductsForFilter(filterKey) {
        const client = getClient();
        if (!client) return [];
        const cfg = FILTER_CONFIG[filterKey] || FILTER_CONFIG.default;
        try {
            const { data, error } = await client.rpc(cfg.rpc);
            if (error) throw error;
            return (data || []).map(p => {
                if (typeof p.variants === 'string') { try { p.variants = JSON.parse(p.variants); } catch { p.variants = []; } }
                if (typeof p.images   === 'string') { try { p.images   = JSON.parse(p.images);   } catch { p.images = [p.image]; } }
                if (p.deal_discount && !p.discount) p.discount = Number(p.deal_discount);
                if (p.discounted_price && !p.price)  p.price    = Number(p.discounted_price);
                if (p.original_price   && !p.originalPrice) p.originalPrice = Number(p.original_price);
                if (p.is_deal) p.isDeal = p.is_deal;
                return p;
            });
        } catch (err) {
            console.error(`❌ RPC ${cfg.rpc} failed:`, err.message);
            return [];
        }
    }

    // ============================================================
    //  BUILD GROUPS (default mode only)
    // ============================================================

    function buildGroups() {
        const brands = new Map();
        const categories = new Map();

        allProducts.forEach(p => {
            if (p.brand && !processedProducts.has(p.id)) {
                if (!brands.has(p.brand)) brands.set(p.brand, []);
                brands.get(p.brand).push(p);
            }
            if (p.category && !processedProducts.has(p.id)) {
                if (!categories.has(p.category)) categories.set(p.category, []);
                categories.get(p.category).push(p);
            }
        });

        let brandGroups = Array.from(brands.entries()).map(([name, products]) =>
            ({ name, type: 'brand', products: shuffleArray(products) }));
        let categoryGroups = Array.from(categories.entries()).map(([name, products]) =>
            ({ name, type: 'category', products: shuffleArray(products) }));

        brandGroups    = brandGroups.filter(g => g.products.length >= 3);
        categoryGroups = categoryGroups.filter(g => g.products.length >= 3);

        brandGroups.sort((a, b) => b.products.length - a.products.length);
        categoryGroups.sort((a, b) => b.products.length - a.products.length);

        const shuffledBrands     = shuffleArray(brandGroups);
        const shuffledCategories = shuffleArray(categoryGroups);
        const interleaved = [];
        const maxLen = Math.max(shuffledBrands.length, shuffledCategories.length);
        for (let i = 0; i < maxLen; i++) {
            if (i < shuffledBrands.length)     interleaved.push(shuffledBrands[i]);
            if (i < shuffledCategories.length) interleaved.push(shuffledCategories[i]);
        }
        return interleaved;
    }

    // ============================================================
    //  RENDER
    // ============================================================

    function renderGroup(group, products) {
        const icon = getGroupIcon(group.name);
        const iconClass = icon.startsWith('fab') ? icon : `fas ${icon}`;
        const typeLabel = group.type === 'brand' ? t('brand', 'Brand') : t('category', 'Category');
        return `
            <div class="group-section">
                <div class="group-header">
                    <div class="group-title">
                        <div class="group-icon"><i class="${iconClass}"></i></div>
                        <h3>${group.name}</h3>
                        <span style="font-size:12px;color:#94A3B8;font-weight:400;" data-translate="${group.type === 'brand' ? 'brand' : 'category'}">${typeLabel}</span>
                    </div>
                    <span class="group-count">${products.length} <span data-translate="products">${t('products', 'products')}</span></span>
                </div>
                <div class="group-scroll">
                    ${products.map(p => renderProductCard(p)).join('')}
                </div>
            </div>
        `;
    }

    // Flat grid used on filtered pages (?filter=hot etc.)
    function renderFilterGrid(products) {
        if (!products.length) return '';
        return `
            <div class="group-section">
                <div class="group-header">
                    <div class="group-title">
                        <div class="group-icon"><i class="fas fa-th"></i></div>
                        <h3 data-translate="results">${t('results', 'Results')}</h3>
                    </div>
                    <span class="group-count">${products.length} <span data-translate="products">${t('products', 'products')}</span></span>
                </div>
                <div class="group-scroll filter-grid">
                    ${products.map(p => renderProductCard(p)).join('')}
                </div>
            </div>
        `;
    }

    function renderProductCard(product) {
        const isWished = wishlist.includes(product.id);
        const isDeal = product.isDeal || (product.discount && product.discount > 0);
        const discount = product.discount || 0;
        const originalPrice = product.originalPrice || product.price || 0;
        const currentPrice = isDeal ? originalPrice * (1 - discount / 100) : originalPrice;
        const image = product.image || 'https://placehold.co/200x200/6C3CE1/FFFFFF?text=Product';

        let badge = '';
        if (isDeal) badge = `<span class="card-badge deal" data-translate="deal">🔥 Deal</span>`;
        else if (product.isHot) badge = `<span class="card-badge hot" data-translate="hot">⚡ Hot</span>`;
        else if (product.isNew) badge = `<span class="card-badge new" data-translate="new">✨ New</span>`;

        return `
            <div class="scroll-card" onclick="window.navigateWithUserInfo('/item/?product=${product.id}')">
                <div class="card-image">
                    <img src="${image}" alt="${product.name || 'Product'}" loading="lazy"
                         onerror="this.src='https://placehold.co/200x200/6C3CE1/FFFFFF?text=Product'">
                    ${badge}
                </div>
                <div class="card-body">
                    <div class="card-name">${product.name || 'Unknown Product'}</div>
                    ${product.brand ? `<div class="card-brand">${product.brand}</div>` : ''}
                    <div class="card-price">
                        FCFA ${currentPrice.toFixed(2)}
                        ${isDeal && originalPrice > currentPrice
                            ? `<span class="original">FCFA ${originalPrice.toFixed(2)}</span>` : ''}
                    </div>
                    <div class="card-actions">
                        <button class="btn-wish ${isWished ? 'active' : ''}"
                                onclick="event.stopPropagation(); toggleWishlist('${product.id}')">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ============================================================
    //  LOAD MORE + INFINITE SCROLL (default mode)
    // ============================================================

    function loadMoreGroups(els) {
        if (isLoading || !hasMore) return;
        isLoading = true;
        els.loader.classList.add('visible');

        setTimeout(() => {
            const start = currentPage * GROUPS_PER_PAGE;
            const end = start + GROUPS_PER_PAGE;
            const pageGroups = groups.slice(start, end);

            if (pageGroups.length === 0) {
                hasMore = false;
                els.loader.classList.remove('visible');
                els.endResults.style.display = 'block';
                isLoading = false;
                return;
            }

            pageGroups.forEach(group => {
                const products = group.products.slice(0, PRODUCTS_PER_GROUP);
                products.forEach(p => processedProducts.add(p.id));
                els.container.insertAdjacentHTML('beforeend', renderGroup(group, products));
            });

            currentPage++;
            els.loader.classList.remove('visible');
            isLoading = false;

            if (currentPage * GROUPS_PER_PAGE >= groups.length) {
                hasMore = false;
                els.endResults.style.display = 'block';
            }
        }, 400);
    }

    function setupInfiniteScroll(els) {
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !isLoading && hasMore) loadMoreGroups(els);
            });
        }, { rootMargin: '0px 0px 100px 0px', threshold: 0.1 });
        obs.observe(els.loader);
        obs.observe(els.endResults);
        return obs;
    }

    // ============================================================
    //  WISHLIST
    // ============================================================

    async function toggleWishlist(productId) {
        try {
            const index = wishlist.indexOf(productId);
            if (index !== -1) {
                wishlist.splice(index, 1);
                showToast('❤️ ' + t('removed_wishlist', 'Removed from wishlist'), 'info');
            } else {
                wishlist.push(productId);
                showToast('❤️ ' + t('added_wishlist', 'Added to wishlist!'));
            }

            localStorage.setItem('st_wishlist', JSON.stringify(wishlist));
            if (window.STHeader) {
                window.STHeader.AppState.wishlist = wishlist;
                window.STHeader.updateCounts?.();
            }

            const els = getEls();
            if (!els.container) return;

            // Respect the current mode when re-rendering
            if (activeFilterKey !== 'default') {
                els.container.innerHTML = renderFilterGrid(allProducts);
            } else {
                const currentGroups = groups.slice(0, currentPage * GROUPS_PER_PAGE);
                els.container.innerHTML = '';
                currentGroups.forEach(group => {
                    const products = group.products.slice(0, PRODUCTS_PER_GROUP);
                    els.container.insertAdjacentHTML('beforeend', renderGroup(group, products));
                });
                if (!hasMore && els.endResults) els.endResults.style.display = 'block';
            }
        } catch (err) {
            console.error('❌ Wishlist error:', err);
            showToast('❌ ' + t('wishlist_failed', 'Failed to update wishlist'), 'error');
        }
    }

    // ============================================================
    //  CLEANUP + INIT
    // ============================================================

    function cleanup() {
        if (heroInterval) { clearInterval(heroInterval); heroInterval = null; }
        if (pageObserver) { pageObserver.disconnect(); pageObserver = null; }
        if (window.STHeader?._foryouPatched && window.STHeader._foryouOriginalUpdate) {
            window.STHeader.updateAuthUI = window.STHeader._foryouOriginalUpdate;
            delete window.STHeader._foryouPatched;
            delete window.STHeader._foryouOriginalUpdate;
        }
        allProducts = [];
        processedProducts = new Set();
        groups = [];
        currentPage = 0;
        isLoading = false;
        hasMore = true;
        currentSlide = 0;
    }

    function applyHeroCopy(cfg, els) {
        const heroContent = els.heroContent;
        if (!heroContent) return;

        const badgeEl = heroContent.querySelector('.hero-badge');
        const h1El    = heroContent.querySelector('h1');
        const pEl     = heroContent.querySelector('p');
        if (badgeEl) badgeEl.innerHTML = `<i class="fas fa-star"></i> <span data-translate="${cfg.badgeKey}">${t(cfg.badgeKey, cfg.badge)}</span>`;
        if (h1El)    h1El.innerHTML    = `<span data-translate="${cfg.titleKey}">${t(cfg.titleKey, cfg.title)}</span>`;
        if (pEl)     pEl.innerHTML     = `<span data-translate="${cfg.subtitleKey}">${t(cfg.subtitleKey, cfg.subtitle)}</span>`;

        if (els.heroSkeleton) els.heroSkeleton.style.display = 'none';
        heroContent.style.display = 'block';

        document.title = `${t(cfg.heroHeadingKey, cfg.heroHeading)} · Sucess Technology`;
    }

    async function init() {
        const els = getEls();
        if (!els.container) return;

        cleanup();
        loadWishlist();
        loadCart();

        const filterKey = getActiveFilter();
        const cfg = FILTER_CONFIG[filterKey];
        const isFiltered = filterKey !== 'default';
        activeFilterKey = filterKey;

        // ── INSTANT: hero copy + filter bar (before any async work) ──
        applyHeroCopy(cfg, els);
        renderFilterBar(filterKey, cfg);

        // ── Grid loading placeholder ──
        els.container.innerHTML = `
            <div style="text-align:center;padding:60px 20px;grid-column:1/-1;">
                <div style="width:48px;height:48px;border:4px solid #E2E8F0;border-top-color:#6C3CE1;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>
                <p style="color:#94A3B8;font-weight:500;" data-translate="curating_picks">${t('curating_picks', 'Loading…')}</p>
            </div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        `;

        // ── Fetch filtered products ──
        const products = await fetchProductsForFilter(filterKey);
        allProducts = products;

        const heroImages = await fetchHeroImages(6, products);
        initHeroSlideshow(heroImages, els);

        // ── Empty state ──
        if (allProducts.length === 0) {
            els.container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;grid-column:1/-1;">
                    <i class="fas fa-box-open" style="font-size:48px;color:#E2E8F0;margin-bottom:16px;display:block;"></i>
                    <h3 style="font-weight:700;font-size:20px;color:#0F172A;">
                        <span data-translate="no_products_filtered">No products available</span>
                    </h3>
                    <p style="color:#94A3B8;margin-top:4px;" data-translate="check_back_or_browse">Check back later or browse all products.</p>
                    <a href="/product/" style="display:inline-block;margin-top:16px;padding:10px 22px;
                       background:#6C3CE1;color:white;border-radius:12px;font-weight:600;
                       text-decoration:none;font-size:14px;" data-translate="browse_all_products">Browse all products</a>
                </div>
            `;
            return;
        }

        // ══════════════════════════════════════════════════════════
        //  FILTER MODE → one flat grid of ALL matching products
        // ══════════════════════════════════════════════════════════
        if (isFiltered) {
            processedProducts = new Set(allProducts.map(p => p.id));
            els.container.innerHTML = renderFilterGrid(allProducts);
            if (els.endResults) els.endResults.style.display = 'none';
            if (els.loader)     els.loader.classList.remove('visible');
            hasMore = false;
            console.log(`📄 For You [${filterKey}] — ${allProducts.length} products (flat grid)`);
            return;
        }

        // ══════════════════════════════════════════════════════════
        //  DEFAULT MODE → grouped sections + infinite scroll
        // ══════════════════════════════════════════════════════════
        groups = buildGroups();
        currentPage = 0;
        hasMore = groups.length > 0;
        processedProducts.clear();

        els.container.innerHTML = '';
        loadMoreGroups(els);
        pageObserver = setupInfiniteScroll(els);

        // Patch the header's updateAuthUI exactly once, remembering the original
        if (window.STHeader && !window.STHeader._foryouPatched) {
            window.STHeader._foryouOriginalUpdate = window.STHeader.updateAuthUI;
            window.STHeader._foryouPatched = true;
            window.STHeader.updateAuthUI = function () {
                window.STHeader._foryouOriginalUpdate?.();
                if (!document.getElementById('foryouGroups')) return;  // not on this page
                loadWishlist();
                loadCart();
                const c = document.getElementById('foryouGroups');
                if (activeFilterKey !== 'default') {
                    c.innerHTML = renderFilterGrid(allProducts);
                    return;
                }
                const cur = groups.slice(0, currentPage * GROUPS_PER_PAGE);
                c.innerHTML = '';
                cur.forEach(g => {
                    const ps = g.products.slice(0, PRODUCTS_PER_GROUP);
                    c.insertAdjacentHTML('beforeend', renderGroup(g, ps));
                });
                if (!hasMore && els.endResults) els.endResults.style.display = 'block';
            };
        }

        console.log(`📄 For You ready — ${allProducts.length} products, ${groups.length} groups`);
    }

    // expose for onclick="toggleWishlist(...)"
    window.toggleWishlist = toggleWishlist;

    // ---- Bootstrap ----
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
    window.addEventListener('st:page-loaded', init);
    window.addEventListener('st:pjax-before', cleanup);
    window.addEventListener('beforeunload', cleanup);
})();
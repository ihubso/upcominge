(function () {
    'use strict';

    /* ============================================================
       MODULE STATE
       ============================================================ */
    let currentCategory     = 'all';
    let page                = 1;
    const perPage           = 12;
    let isLoading           = false;
    let hasMoreProducts     = true;
    let totalProducts       = 0;
    const productCache      = new Map();
    const categoryCountMap  = new Map();
    let lastRenderedCategory = null;

    let relatedProductsPool = [];
    let relatedLoadedCount  = 0;
    let relatedObserver     = null;
    const RELATED_BATCH_SIZE = 4;

    let heroImages          = [];
    let heroImageIndex      = 0;
    let heroInterval        = null;

    let infiniteScrollObserver = null;

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
        if (!el) { console.log(msg); return; }
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(el._timeout);
        el._timeout = setTimeout(() => el.classList.remove('show'), 2500);
    }

    function renderStars(rating) {
        const full = Math.max(0, Math.min(5, Math.floor(rating || 0)));
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
            smartphone: 'fas fa-mobile-alt', phone: 'fas fa-mobile-alt', tablet: 'fas fa-tablet-alt',
            laptop: 'fas fa-laptop', desktop: 'fas fa-desktop', computer: 'fas fa-desktop', monitor: 'fas fa-desktop',
            tv: 'fas fa-tv', camera: 'fas fa-camera', dslr_camera: 'fas fa-camera',
            action_camera: 'fas fa-video', security_camera: 'fas fa-video', camera_lens: 'fas fa-camera-retro',
            audio: 'fas fa-headphones', headphones: 'fas fa-headphones', speaker: 'fas fa-volume-up',
            earbuds: 'fas fa-headphones-alt', microphone: 'fas fa-microphone',
            amplifier: 'fas fa-volume-up', turntable: 'fas fa-compact-disc',
            gaming: 'fas fa-gamepad', console: 'fas fa-gamepad', joystick: 'fas fa-gamepad',
            printer: 'fas fa-print', scanner: 'fas fa-scanner', projector: 'fas fa-video',
            network: 'fas fa-network-wired', wireless_router: 'fas fa-wifi', network_switch: 'fas fa-network-wired',
            storage: 'fas fa-hdd', hdd: 'fas fa-hdd', external_hdd: 'fas fa-hdd', ssd: 'fas fa-server',
            flash_drive: 'fas fa-usb', memory_card: 'fas fa-sd-card', usb_hub: 'fas fa-usb',
            processor: 'fas fa-microchip', cpu: 'fas fa-microchip', motherboard: 'fas fa-microchip',
            ram: 'fas fa-memory', graphics_card: 'fas fa-tv', cpu_cooler: 'fas fa-fan',
            power_supply: 'fas fa-bolt', ups_battery: 'fas fa-car-battery',
            pc_case: 'fas fa-server', keyboard: 'fas fa-keyboard', mouse: 'fas fa-mouse',
            charger: 'fas fa-plug', charging_pad: 'fas fa-bolt', power_bank: 'fas fa-battery-full',
            cable_adapter: 'fas fa-plug', surge_protector: 'fas fa-bolt',
            air_fryer: 'fas fa-utensils', blender: 'fas fa-blender', coffee_maker: 'fas fa-mug-hot',
            electric_grill: 'fas fa-fire', electric_kettle: 'fas fa-mug-hot', food_processor: 'fas fa-blender',
            juicer: 'fas fa-glass-whiskey', microwave: 'fas fa-microwave', toaster: 'fas fa-bread-slice',
            refrigerator: 'fas fa-snowflake', vacuum: 'fas fa-broom', robot_vacuum: 'fas fa-robot',
            air_purifier: 'fas fa-wind', humidifier: 'fas fa-tint', fan: 'fas fa-fan',
            hair_dryer: 'fas fa-wind', electric_shaver: 'fas fa-cut', massage_gun: 'fas fa-hand-sparkles',
            toothbrush: 'fas fa-tooth', electric_toothbrush: 'fas fa-tooth',
            lamp: 'fas fa-lightbulb', desk_lamp: 'fas fa-lightbulb',
            led_strip_light: 'fas fa-lightbulb', smart_bulb: 'fas fa-lightbulb', light: 'fas fa-lightbulb',
            smart_lock: 'fas fa-lock', baby_monitor: 'fas fa-baby', doorbell: 'fas fa-bell',
            thermostat: 'fas fa-thermometer-half', digital_thermometer: 'fas fa-thermometer-half',
            watch: 'fas fa-clock', smartwatch: 'fas fa-clock', fitness_tracker: 'fas fa-heartbeat',
            accessories: 'fas fa-plug', tripod: 'fas fa-camera-retro', drone: 'fas fa-helicopter',
            walkie_talkie: 'fas fa-walkie-talkie', dash_cam: 'fas fa-car',
            car_charger: 'fas fa-car', car_subwoofer: 'fas fa-volume-up', bluetooth_car_kit: 'fas fa-car',
            barcode_scanner: 'fas fa-barcode', voice_recorder: 'fas fa-microphone',
            e_reader: 'fas fa-book-reader', streaming_stick: 'fas fa-tv',
            vr_headset: 'fas fa-vr-cardboard', laminator: 'fas fa-file-alt',
            pulse_oximeter: 'fas fa-heartbeat', thermometer: 'fas fa-thermometer-half',
            router: 'fas fa-wifi', modem: 'fas fa-wifi',
            uncategorized: 'fas fa-box'
        };
        const key = String(category || '').toLowerCase();
        return icons[key] || 'fas fa-tag';
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

        heroImages = Array.isArray(images) ? images : [];
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
       RPC HELPERS
       ============================================================ */
    async function fetchCategoryPage(category = 'all', pageNum = 1) {
        const client = window.getSupabaseClient?.();
        if (!client) return { products: [], total: 0 };

        const offset = (Math.max(1, pageNum) - 1) * perPage;
        const { data, error } = await client.rpc('get_category_products', {
            p_category: category || 'all',
            p_limit:    perPage,
            p_offset:   offset
        });

        if (error) throw error;

        const rows = data || [];
        if (!rows.length) return { products: [], total: 0 };

        const total = Number(rows[0].total_count || rows.length);
        const products = rows.map(({ total_count, ...p }) => p);

        products.forEach(p => productCache.set(p.id, p));

        return { products, total };
    }

    async function fetchCategoryCounts() {
        const client = window.getSupabaseClient?.();
        if (!client) return [];
        const { data, error } = await client.rpc('get_categories_with_counts');
        if (error) throw error;
        return data || [];
    }

    async function fetchRelatedProducts(category = 'all', limit = 16) {
        const client = window.getSupabaseClient?.();
        if (!client) return [];
        const { data, error } = await client.rpc('get_related_products', {
            p_category: category || 'all',
            p_limit:    limit
        });
        if (error) throw error;
        return data || [];
    }

    async function fetchProductById(productId) {
        if (productCache.has(productId)) return productCache.get(productId);

        const client = window.getSupabaseClient?.();
        if (!client) return null;
    const { data, error } = await client
      .rpc('get_product_by_id', { p_id: product });
        if (error || !data) return null;
        productCache.set(data.id, data);
        return data;
    }
    function getCartOwnerId() {
        const juId = window.getCurrentCustomerId?.();
        let sessionId = localStorage.getItem('st_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
            localStorage.setItem('st_session_id', sessionId);
        }
        return juId || sessionId;
    }

    async function addToCart(productId, qty = 1) {
        try {
            const product = await fetchProductById(productId);
            if (!product) {
                showToast('❌ ' + t('product_not_found', 'Product not found'));
                return;
            }

              const owner = window.getOwner();
        const customerId  = owner
            const cart = (await window.fetchCartFromDB?.(customerId)) || [];
            const existing = cart.find(i => i.product_id === productId || i.id === productId);

            if (existing) {
                existing.qty = (existing.qty || 0) + qty;
            } else {
                cart.push({
                    product_id: productId,
                    id:         productId,
                    name:       product.name,
                    price:      product.price || 0,
                    qty,
                    image:      product.image || 'https://placehold.co/400x400',
                    variants:   {},
                    category:   product.category || ''
                });
            }

            await window.saveCartToDB?.(customerId, cart);

            showToast(`✅ ${product.name} ${t('added_to_cart', 'added to cart!')}`);

            if (window.STHeader) {
                window.STHeader.AppState.cart = cart;
                window.STHeader.updateCounts?.();
            }
        } catch (err) {
            console.error('addToCart failed:', err);
            showToast('❌ ' + t('cart_error', 'Could not add to cart'));
        }
    }

    /* ============================================================
       RENDER HELPERS
       ============================================================ */

    /* --- In-grid category header (like the screenshot) --------- */
    function renderCategoryHeader(category, count) {
        const key     = String(category || 'uncategorized').toLowerCase();
        const display = getTranslatedCategory(key);
        const icon    = getCategoryIcon(key);
        const badge   = Number(count) || 0;

        return `
            <div class="col-span-2 md:col-span-3 lg:col-span-4 mt-8 mb-4 st-cat-header" data-cat="${escapeHtml(key)}">
                <h2 class="text-2xl font-bold text-gray-800 border-b-2 border-primary pb-3 flex items-center gap-3">
                    <span class="text-3xl" style="color:#6C3CE1;">
                        <i class="${icon}"></i>
                    </span>
                    <span data-translate="category_${key}">${escapeHtml(display)}</span>
                    <span class="text-sm font-normal text-gray-500 ml-2">(${badge})</span>
                </h2>
            </div>`;
    }

    /* --- Single product card ----------------------------------- */
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
                        <span class="product-price">FCFA ${(Number(p.price) || 0).toFixed(2)}</span>
                        <button class="btn-cart"
                                onclick="event.stopPropagation(); window.addToCart('${p.id}')"
                                data-translate="add_to_cart">
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                    </div>
                </div>
            </div>`;
    }

    /* --- Build HTML for a batch of products, inserting category
           headers whenever the category changes. Works across pages. */
    function buildGroupedHtml(products, category, isReset) {
        let html = '';

        // ---- Specific category page: one header at the very top ----
        if (category !== 'all' && category !== '') {
            if (isReset) {
                const count = categoryCountMap.get(category) || totalProducts || products.length;
                html += renderCategoryHeader(category, count);
            }
            html += products.map(renderProductCard).join('');
            return html;
        }

        // ---- "All" page: insert a header each time category changes ----
        for (const p of products) {
            const cat = String(p.category || 'uncategorized').toLowerCase();
            if (cat !== lastRenderedCategory) {
                const count = categoryCountMap.get(cat) || 0;
                html += renderCategoryHeader(cat, count);
                lastRenderedCategory = cat;
            }
            html += renderProductCard(p);
        }
        return html;
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
       CATEGORY SELECTOR BAR
       ============================================================ */
    async function buildCategoryBar(categoriesData) {
        document.getElementById('stCategoryBar')?.remove();
        if (!categoriesData?.length) return;

        const activeCategory = getCategoryFromUrl().toLowerCase();
        const totalCount = categoriesData.reduce((s, c) => s + Number(c.product_count || 0), 0);

        const chipsHtml = `
            <a href="/category/?category=all"
               class="st-cat-chip ${activeCategory === 'all' || !activeCategory ? 'active' : ''}"
               data-cat="all">
                <i class="fas fa-th-large"></i>
                <span data-translate="all_categories">All</span>
                <span class="st-cat-count">${totalCount}</span>
            </a>
            ${categoriesData.map(c => {
                const key      = String(c.category || '').toLowerCase();
                const display  = getTranslatedCategory(key);
                const icon     = getCategoryIcon(key);
                const isActive = activeCategory === key;
                const encoded  = encodeURIComponent(key);
                return `
                    <a href="/category/?category=${encoded}"
                       class="st-cat-chip ${isActive ? 'active' : ''}"
                       data-cat="${encoded}">
                        <i class="${icon}"></i>
                        <span>${escapeHtml(display)}</span>
                        <span class="st-cat-count">${c.product_count}</span>
                    </a>`;
            }).join('')}
        `;

        const grid = document.getElementById('productsGrid');
        if (!grid) return;

        const bar = document.createElement('div');
        bar.id = 'stCategoryBar';
        bar.className = 'st-cat-bar';
        bar.innerHTML = `
            <button type="button" class="st-cat-nav st-cat-nav-left hidden" aria-label="Scroll left">
                <i class="fas fa-chevron-left"></i>
            </button>
            <div class="st-cat-bar-inner" id="stCatBarInner">${chipsHtml}</div>
            <button type="button" class="st-cat-nav st-cat-nav-right hidden" aria-label="Scroll right">
                <i class="fas fa-chevron-right"></i>
            </button>`;

        grid.parentNode.insertBefore(bar, grid);

        const inner    = document.getElementById('stCatBarInner');
        const btnLeft  = bar.querySelector('.st-cat-nav-left');
        const btnRight = bar.querySelector('.st-cat-nav-right');
        if (!inner || !btnLeft || !btnRight) return;

        const SCROLL_AMOUNT = 320;
        btnLeft.addEventListener('click',  () => inner.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' }));
        btnRight.addEventListener('click', () => inner.scrollBy({ left:  SCROLL_AMOUNT, behavior: 'smooth' }));

        const updateArrows = () => {
            const atStart  = inner.scrollLeft <= 4;
            const atEnd    = inner.scrollLeft + inner.clientWidth >= inner.scrollWidth - 4;
            const noScroll = inner.scrollWidth <= inner.clientWidth + 4;
            bar.classList.toggle('at-start', atStart);
            bar.classList.toggle('at-end', atEnd);
            btnLeft.classList.toggle('hidden', noScroll || atStart);
            btnRight.classList.toggle('hidden', noScroll || atEnd);
        };

        inner.addEventListener('scroll', updateArrows, { passive: true });
        window.addEventListener('resize', updateArrows, { passive: true });

        const activeChip = bar.querySelector('.st-cat-chip.active');
        if (activeChip) {
            const chipRect  = activeChip.getBoundingClientRect();
            const innerRect = inner.getBoundingClientRect();
            if (chipRect.left < innerRect.left || chipRect.right > innerRect.right) {
                activeChip.scrollIntoView({ inline: 'center', block: 'nearest' });
            }
        }

        requestAnimationFrame(updateArrows);

        bar.addEventListener('click', (e) => {
            const chip = e.target.closest('.st-cat-chip');
            if (!chip) return;
            const href = chip.getAttribute('href');
            if (!href) return;
            if (typeof window.navigateWithUserInfo === 'function') {
                e.preventDefault();
                window.navigateWithUserInfo(href);
            }
        });

        if (typeof window.translateUI === 'function') window.translateUI();
    }

    /* ============================================================
       LOAD PRODUCTS (server-side pagination + in-grid headers)
       ============================================================ */
    async function loadCategoryProducts(reset = true) {
        if (isLoading) return;
        if (!reset && !hasMoreProducts) { hideInfiniteScrollIndicator(); return; }
        isLoading = true;

        const grid = document.getElementById('productsGrid');
        if (!grid) { isLoading = false; return; }

        const category = (getCategoryFromUrl() || 'all').toLowerCase();

        if (reset) {
            page                 = 1;
            hasMoreProducts      = true;
            totalProducts        = 0;
            currentCategory      = category;
            lastRenderedCategory = null;
            productCache.clear();
            grid.innerHTML       = '';
            document.getElementById('noProducts')?.classList.add('hidden');
            showLoadingSkeletons();

            if (infiniteScrollObserver) { infiniteScrollObserver.disconnect(); infiniteScrollObserver = null; }
            hideInfiniteScrollIndicator();
        }

        try {
            const { products, total } = await fetchCategoryPage(category, page);

            /* ---------- Reset-only UI work ---------- */
            if (reset) {
                totalProducts = total;

                // Category bar + build the count map used by headers
                try {
                    const cats = await fetchCategoryCounts();

                    categoryCountMap.clear();
                    cats.forEach(c => {
                        const k = String(c.category || '').toLowerCase();
                        categoryCountMap.set(k, Number(c.product_count || 0));
                    });

                    await buildCategoryBar(cats);
                } catch (e) {
                    console.warn('Category bar failed:', e);
                }

                // Hero header
                const title    = document.getElementById('categoryTitle');
                const subtitle = document.getElementById('categorySubtitle');
                const icon     = document.getElementById('categoryIcon');

                if (category === 'all') {
                    if (title) {
                        title.textContent = t('all_categories', 'All Categories');
                        title.setAttribute('data-translate', 'all_categories');
                    }
                    if (subtitle) {
                        subtitle.textContent = t('explore_collection_full', 'Explore our complete collection');
                        subtitle.setAttribute('data-translate', 'explore_collection_full');
                    }
                    if (icon) icon.innerHTML = '<i class="fas fa-th-large"></i>';
                } else {
                    const name = getTranslatedCategory(category);
                    if (title) { title.textContent = name; title.removeAttribute('data-translate'); }
                    if (subtitle) {
                        subtitle.textContent = t('discover_products', `Discover our ${name} products`);
                        subtitle.removeAttribute('data-translate');
                    }
                    if (icon) icon.innerHTML = `<i class="${getCategoryIcon(category)}"></i>`;
                }

                // Hero images
                const heroImageUrls = products.filter(p => p.image).slice(0, 10).map(p => p.image);
                startHeroRotation(heroImageUrls);
            }

            /* ---------- Empty state ---------- */
            if (products.length === 0 && reset) {
                document.getElementById('noProducts')?.classList.remove('hidden');
                hasMoreProducts = false;
                hideInfiniteScrollIndicator();
                return;
            }

            /* ---------- Render cards (with category headers) ---------- */
            const html = buildGroupedHtml(products, category, reset);
            if (reset) grid.innerHTML = html;
            else       grid.insertAdjacentHTML('beforeend', html);

            /* ---------- Pagination bookkeeping ---------- */
            hasMoreProducts = (page * perPage) < totalProducts;
            page++;

            if (hasMoreProducts) setupInfiniteScroll();
            else                 hideInfiniteScrollIndicator();

            /* ---------- Related products (first page only) ---------- */
            if (reset) {
                try {
                    const related = await fetchRelatedProducts(category, 32);
                    renderRelatedProductsFromList(related, category);
                } catch (e) {
                    console.warn('Related products failed:', e);
                }
            }

            if (typeof window.translateUI === 'function') window.translateUI();

        } catch (e) {
            console.error('Error loading category products:', e);
            showToast(t('error_loading_products', 'Error loading products'));
            hideInfiniteScrollIndicator();
        } finally {
            isLoading = false;
        }
    }

    /* ============================================================
       RELATED PRODUCTS
       ============================================================ */
    function appendRelatedProducts(items) {
        const grid = document.getElementById('relatedGrid');
        if (!grid || !items?.length) return;
        grid.insertAdjacentHTML('beforeend', items.map(p => `
            <div class="related-card" onclick="window.navigateWithUserInfo('/item/?product=${p.id}')">
                <img src="${p.image || 'https://placehold.co/200x200'}"
                     alt="${escapeHtml(p.name)}" loading="lazy"
                     onerror="this.src='https://placehold.co/200x200?text=No+Image'">
                <h4>${escapeHtml(p.name) || 'Unknown Product'}</h4>
                <p class="text-gray-400">${escapeHtml(p.category) || ''}</p>
                <div class="price">FCFA ${(Number(p.price) || 0).toFixed(2)}</div>
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

    function renderRelatedProductsFromList(relatedList, category) {
        const grid = document.getElementById('relatedGrid');
        if (!grid) return;

        const onPageIds = new Set(productCache.keys());
        const pool = (relatedList || []).filter(p => p && p.id && !onPageIds.has(p.id));

        shuffleArray(pool);

        const initial = pool.splice(0, RELATED_BATCH_SIZE);
        relatedProductsPool = pool;
        relatedLoadedCount  = initial.length;

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
        document.getElementById('stCategoryBar')?.remove();

        currentCategory      = 'all';
        page                 = 1;
        isLoading            = false;
        hasMoreProducts      = true;
        totalProducts        = 0;
        lastRenderedCategory = null;
        productCache.clear();
        categoryCountMap.clear();
        relatedProductsPool = [];
        relatedLoadedCount  = 0;
        heroImages          = [];
        heroImageIndex      = 0;
    }

    async function syncHeaderCart() {
        if (!window.STHeader) return;
        try {
               const owner = window.getOwner();
        const customerId  = owner
            const cart = (await window.fetchCartFromDB?.(customerId)) || [];
            window.STHeader.AppState.cart = cart;
            window.STHeader.updateCounts?.();
        } catch (err) {
            console.warn('syncHeaderCart:', err);
        }
    }

    async function init() {
        const grid = document.getElementById('productsGrid');
        const hero = document.getElementById('categoryHero');
        if (!grid || !hero) return;

        cleanup();

        console.log('📄 Category page: init');

        loadReviews();
        await loadCategoryProducts(true);
        await syncHeaderCart();

        console.log('📄 Category page ready');
    }

    /* ============================================================
       GLOBAL EXPORTS
       ============================================================ */
    function bindGlobals() {
        window.addToCart            = addToCart;
        window.showToast            = showToast;
        window.fetchCategoryPage    = fetchCategoryPage;
        window.loadCategoryProducts = loadCategoryProducts;

        window.openModal  = (id) => document.getElementById(id)?.classList.remove('hidden');
        window.closeModal = (id) => document.getElementById(id)?.classList.add('hidden');

        window.clearCart = async () => {
            try {
                   const owner = window.getOwner();
        const customerId  = owner
                await window.saveCartToDB?.(customerId, []);
                if (window.STHeader) {
                    window.STHeader.AppState.cart = [];
                    window.STHeader.updateCounts?.();
                }
                showToast(t('cart_cleared', 'Cart cleared'));
            } catch (e) {
                console.warn('clearCart failed:', e);
            }
        };
    }

    /* ============================================================
       BOOTSTRAP
       ============================================================ */
    function start() {
        bindGlobals();
        init();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true } ,showLoadingSkeletons());
    } else {
        start();
        showLoadingSkeletons();
    }

    window.addEventListener('st:page-loaded', () => { bindGlobals(); init(); });
    window.addEventListener('st:pjax-before', cleanup);
    window.addEventListener('beforeunload',  cleanup);

    console.log('✅ Category page script loaded');
})();
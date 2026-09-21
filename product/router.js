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
    //  HERO SLIDESHOW (SECURED)
    // ============================================================

    async function fetchHeroImages(count = 6) {
        const client = getClient();
        if (!client) return [];
        try {
            const { data, error } = await client.rpc('get_all_products');
            
            if (error) throw error;
            
            // Filter for items with images and shuffle
            const withImages = (data || []).filter(p => p.image);
            return shuffleArray(withImages).slice(0, count).map(p => p.image);
        } catch (err) {
            console.error('❌ Error fetching hero images:', err.message);
            return [];
        }
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
    //  FETCH + BUILD (SECURED)
    // ============================================================

    async function fetchAllProducts() {
        const client = getClient();
        if (!client) return [];
        try {
            const { data, error } = await client.rpc('get_all_products');
            
            if (error) throw error;
            
            return (data || []).map(p => {
                if (typeof p.variants === 'string') { try { p.variants = JSON.parse(p.variants); } catch { p.variants = []; } }
                if (typeof p.images   === 'string') { try { p.images   = JSON.parse(p.images);   } catch { p.images = [p.image]; } }
                return p;
            });
        } catch (err) {
            console.error('❌ Error fetching products:', err.message);
            return [];
        }
    }

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
                        <span style="font-size:12px;color:#94A3B8;font-weight:400;">${typeLabel}</span>
                    </div>
                    <span class="group-count">${products.length} ${t('products', 'products')}</span>
                </div>
                <div class="group-scroll">
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
    //  LOAD MORE + INFINITE SCROLL
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

            // Re-render visible groups (only if we're still on the For You page)
            const els = getEls();
            if (!els.container) return;
            const currentGroups = groups.slice(0, currentPage * GROUPS_PER_PAGE);
            els.container.innerHTML = '';
            currentGroups.forEach(group => {
                const products = group.products.slice(0, PRODUCTS_PER_GROUP);
                els.container.insertAdjacentHTML('beforeend', renderGroup(group, products));
            });
            if (!hasMore && els.endResults) els.endResults.style.display = 'block';
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

    async function init() {
        // 1. Bail if we're not on the For You page
        const els = getEls();
        if (!els.container) return;

        // 2. Tear down previous instance
        cleanup();

        loadWishlist();
        loadCart();

        els.container.innerHTML = `
            <div style="text-align:center;padding:60px 20px;grid-column:1/-1;">
                <div style="width:48px;height:48px;border:4px solid #E2E8F0;border-top-color:#6C3CE1;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>
                <p style="color:#94A3B8;font-weight:500;" data-translate="curating_picks">Curating your personalized picks...</p>
            </div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        `;

        const [heroImages, products] = await Promise.all([
            fetchHeroImages(6),
            fetchAllProducts()
        ]);
        allProducts = products;

        initHeroSlideshow(heroImages, els);

        if (allProducts.length === 0) {
            els.container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;grid-column:1/-1;">
                    <i class="fas fa-box-open" style="font-size:48px;color:#E2E8F0;margin-bottom:16px;display:block;"></i>
                    <h3 style="font-weight:700;font-size:20px;color:#0F172A;" data-translate="no_products_title">No products available</h3>
                    <p style="color:#94A3B8;margin-top:4px;" data-translate="no_products_sub">Check back later for personalized recommendations.</p>
                </div>
            `;
            return;
        }

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
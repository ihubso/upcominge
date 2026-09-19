(function () {
    'use strict';

    /* ============================================================
       MODULE STATE
       ============================================================ */
    let allDeals         = [];
    let filteredDeals    = [];
    let wishlist         = [];
    let currentFilter    = 'all';
    let countdownInterval = null;
    let heroImages       = [];
    let heroImageIndex   = 0;
    let heroInterval     = null;
    let _headerPatched   = false;

    /* ============================================================
       ELEMENT LOOKUP — fresh each init
       ============================================================ */
    function getEls() {
        return {
            page:             document.getElementById('dealsHero') || document.getElementById('dealsGrid'),
            grid:             document.getElementById('dealsGrid'),
            productSkeletons: document.getElementById('productSkeletons'),
            totalDeals:       document.getElementById('totalDeals'),
            totalSavings:     document.getElementById('totalSavings'),
            totalItems:       document.getElementById('totalItems'),
            filterBtns:       document.querySelectorAll('#dealsFilter button'),
            cdDays:           document.getElementById('cdDays'),
            cdHours:          document.getElementById('cdHours'),
            cdMinutes:        document.getElementById('cdMinutes'),
            cdSeconds:        document.getElementById('cdSeconds'),
            heroSkeleton:     document.getElementById('heroSkeleton'),
            heroContent:      document.getElementById('heroContent'),
            heroSlides:       document.getElementById('heroSlides'),
        };
    }

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

    function showToast(message, type = 'success') {
        document.querySelector('.deals-toast')?.remove();
        const toast = document.createElement('div');
        toast.className = `deals-toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-20px)';
            toast.style.transition = 'all .3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function renderStars(rating) {
        const full = Math.floor(rating);
        return '★'.repeat(full) + '☆'.repeat(5 - full);
    }

    function formatPrice(price) { return (price || 0).toFixed(2); }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function getBadge(discount, isHot, isNew) {
        if (discount >= 40) return { label: '🔥 Mega', class: 'mega' };
        if (discount >= 25) return { label: '⚡ Hot',  class: 'hot'  };
        if (isNew)          return { label: '✨ New',  class: 'new'  };
        if (discount >= 10) return { label: '💸 Deal', class: 'deal' };
        return null;
    }

    /* ============================================================
       FETCHERS
       ============================================================ */
    async function fetchHeroImages(count = 5) {
        const client = window.getSupabaseClient?.();
        if (!client) return [];
        try {
            const { data, error } = await client
                .from('products').select('image').not('image', 'is', null).limit(20);
            if (error) throw error;
            return shuffleArray(data || []).slice(0, count).map(p => p.image).filter(Boolean);
        } catch (err) {
            console.error('❌ Error fetching hero images:', err.message);
            return [];
        }
    }

    async function fetchDeals() {
        const client = window.getSupabaseClient?.();
        if (!client) return [];
        try {
            const { data: dealsData, error } = await client
                .from('deals').select('product_id, discount');
            if (error) throw error;
            if (!dealsData?.length) return [];

            const ids = dealsData.map(d => d.product_id).filter(Boolean);
            if (!ids.length) return [];

            const { data: productsData, error: perr } = await client
                .from('products').select('*').in('id', ids);
            if (perr) throw perr;

            return dealsData.map(deal => {
                const product = productsData?.find(p => p.id === deal.product_id);
                if (!product) return null;
                return {
                    ...product,
                    dealDiscount: deal.discount,
                    isDeal: true,
                    originalPrice: product.price,
                    discountedPrice: product.price * (1 - deal.discount / 100)
                };
            }).filter(Boolean);
        } catch (err) {
            console.error('❌ Error fetching deals:', err.message);
            return [];
        }
    }

    /* ============================================================
       HERO SLIDER
       ============================================================ */
    function initHeroSlider(images) {
        const els = getEls();
        if (!els.heroSlides) return;

        if (!images?.length) {
            images = [
                'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&q=80',
                'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80',
                'https://images.unsplash.com/photo-1517994112540-009c47ea476b?w=1200&q=80',
                'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=1200&q=80',
                'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80'
            ];
        }

        heroImages = images;
        heroImageIndex = 0;
        els.heroSlides.innerHTML = '';
        images.forEach((img, index) => {
            const slide = document.createElement('div');
            slide.className = `hero-slide ${index === 0 ? 'active' : ''}`;
            slide.style.backgroundImage = `url(${img})`;
            els.heroSlides.appendChild(slide);
        });

        if (els.heroSkeleton) els.heroSkeleton.style.display = 'none';
        if (els.heroContent)  els.heroContent.style.display  = 'block';

        if (heroInterval) { clearInterval(heroInterval); heroInterval = null; }
        if (images.length > 1) {
            heroInterval = setInterval(() => {
                const slides = els.heroSlides.querySelectorAll('.hero-slide');
                slides.forEach(s => s.classList.remove('active'));
                heroImageIndex = (heroImageIndex + 1) % images.length;
                slides[heroImageIndex]?.classList.add('active');
            }, 4000);
        }
    }

    /* ============================================================
       COUNTDOWN
       ============================================================ */
    function startCountdown() {
        const els = getEls();
        if (!els.cdDays) return;

        const target = new Date();
        target.setHours(target.getHours() + 24, 0, 0, 0);

        if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }

        const tick = () => {
            const distance = target.getTime() - Date.now();
            if (distance < 0) {
                clearInterval(countdownInterval);
                countdownInterval = null;
                ['cdDays','cdHours','cdMinutes','cdSeconds'].forEach(k => {
                    const el = document.getElementById(k);
                    if (el) el.textContent = '00';
                });
                return;
            }
            const days    = Math.floor(distance / 86400000);
            const hours   = Math.floor((distance % 86400000) / 3600000);
            const minutes = Math.floor((distance % 3600000) / 60000);
            const seconds = Math.floor((distance % 60000) / 1000);

            // Re-query each tick — pjax may swap the DOM under us
            const cd = getEls();
            if (cd.cdDays)    cd.cdDays.textContent    = String(days).padStart(2, '0');
            if (cd.cdHours)   cd.cdHours.textContent   = String(hours).padStart(2, '0');
            if (cd.cdMinutes) cd.cdMinutes.textContent = String(minutes).padStart(2, '0');
            if (cd.cdSeconds) cd.cdSeconds.textContent = String(seconds).padStart(2, '0');
        };
        tick();
        countdownInterval = setInterval(tick, 1000);
    }

    /* ============================================================
       RENDER DEALS
       ============================================================ */
    function renderDeals(deals) {
        const els = getEls();
        if (!els.grid) return;

        if (els.productSkeletons) els.productSkeletons.style.display = 'none';

        if (!deals?.length) {
            els.grid.innerHTML = `
                <div class="deals-empty">
                    <div class="empty-icon"><i class="fas fa-tags"></i></div>
                    <h2 data-translate="no_deals_title">No Deals Available</h2>
                    <p data-translate="no_deals_sub">Check back soon for amazing offers!</p>
                    <a href="/product/" style="display:inline-block;padding:12px 32px;background:#6C3CE1;color:white;border-radius:12px;text-decoration:none;font-weight:600;" data-translate="browse_products">
                        <i class="fas fa-store"></i> Browse Products
                    </a>
                </div>`;
            if (typeof translateUI === 'function') translateUI();
            return;
        }

        // Hero stats
        if (els.totalDeals) els.totalDeals.textContent = deals.length;
        if (els.totalSavings) {
            const maxDiscount = Math.max(...deals.map(d => d.dealDiscount || 0));
            els.totalSavings.textContent = maxDiscount + '%';
        }
        if (els.totalItems) {
            const totalItems = deals.reduce((s, d) => s + (d.stock || 0), 0);
            els.totalItems.textContent = totalItems;
        }

        els.grid.innerHTML = deals.map(deal => {
            const discount = deal.dealDiscount || 0;
            const originalPrice = deal.originalPrice || deal.price || 0;
            const currentPrice = deal.discountedPrice || originalPrice * (1 - discount / 100);
            const isWished = wishlist.includes(deal.id);
            const rating = deal.rating || 0;
            const reviewCount = deal.reviewCount || 0;
            const stock = deal.stock || 0;
            const stockPercent = stock > 0 ? Math.min((stock / 50) * 100, 100) : 0;
            const badge = getBadge(discount, deal.isHot, deal.isNew);
            const image = deal.image || deal.images?.[0] || 'https://placehold.co/400x400/6C3CE1/FFFFFF?text=Product';

            return `
                <div class="deal-card" data-id="${deal.id}" data-discount="${discount}">
                    <div class="deal-image">
                        <img src="${image}" alt="${deal.name || 'Product'}" loading="lazy"
                             onerror="this.src='https://placehold.co/400x400/6C3CE1/FFFFFF?text=Product'">
                        <div class="deal-badge-top">
                            ${badge ? `<span class="deal-badge ${badge.class}" data-translate="badge_${badge.class}">${badge.label}</span>` : ''}
                        </div>
                        <span class="deal-discount-float">-${discount}%</span>
                        <button class="deal-wishlist ${isWished ? 'active' : ''}"
                                data-wish-id="${deal.id}"
                                onclick="event.stopPropagation(); toggleWishlist('${deal.id}')">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                    <div class="deal-body">
                        <a href="#" onclick="window.navigateWithUserInfo('/item/?product=${deal.id}'); return false;" class="deal-name">
                            ${deal.name || 'Unknown Product'}
                        </a>
                        ${deal.brand ? `<div class="deal-brand">${deal.brand}</div>` : ''}
                        <div class="deal-rating">
                            <span class="stars">${renderStars(rating)}</span>
                            <span class="count">(${reviewCount})</span>
                        </div>
                        <div class="deal-price-row">
                            <span class="deal-current-price">FCFA ${formatPrice(currentPrice)}</span>
                            <span class="deal-original-price">FCFA ${formatPrice(originalPrice)}</span>
                            <span class="deal-savings" data-translate="save_percent">Save ${discount}%</span>
                        </div>
                        <div class="deal-actions">
                            <button class="deal-btn-view"
                                    onclick="event.stopPropagation(); window.navigateWithUserInfo('/item/?product=${deal.id}')"
                                    data-translate="view_details">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                        ${stock > 0 ? `
                            <div class="deal-stock">
                                <span class="stock-text" data-translate="left_in_stock">${stock} left</span>
                                <div class="stock-bar">
                                    <div class="stock-fill" style="width:${stockPercent}%"></div>
                                </div>
                            </div>` : `
                            <div class="deal-stock">
                                <span class="stock-text" style="color:#EF4444;" data-translate="out_of_stock">Out of Stock</span>
                            </div>`}
                    </div>
                </div>`;
        }).join('');

        if (typeof translateUI === 'function') translateUI();
    }

    /* ============================================================
       WISHLIST TOGGLE — in-place, no re-render
       ============================================================ */
    async function toggleWishlist(productId) {
        try {
            const index = wishlist.indexOf(productId);
            if (index !== -1) {
                wishlist.splice(index, 1);
                showToast('❤️ ' + t('removed_from_wishlist', 'Removed from wishlist'), 'info');
            } else {
                wishlist.push(productId);
                showToast('❤️ ' + t('added_to_wishlist', 'Added to wishlist!'));
            }

            localStorage.setItem('st_wishlist', JSON.stringify(wishlist));

            const customerId = window.getCurrentCustomerId?.();
            if (customerId && window.saveWishlistToDB) {
                try { await window.saveWishlistToDB(customerId, wishlist); } catch (_) {}
            }

            if (window.STHeader) {
                window.STHeader.AppState.wishlist = wishlist;
                window.STHeader.updateCounts?.();
            }

            // Update heart icon in place — no full re-render
            document.querySelectorAll(`[data-wish-id="${productId}"]`)
                .forEach(btn => btn.classList.toggle('active'));
        } catch (err) {
            console.error('❌ Wishlist error:', err);
            showToast('❌ ' + t('wishlist_error', 'Failed to update wishlist'), 'error');
        }
    }

    /* ============================================================
       FILTER
       ============================================================ */
    function filterDeals(filter) {
        currentFilter = filter;
        if (filter === 'all')        filteredDeals = [...allDeals];
        else if (filter === 'mega')  filteredDeals = allDeals.filter(d => (d.dealDiscount || 0) >= 40);
        else if (filter === 'hot')   filteredDeals = allDeals.filter(d => (d.dealDiscount || 0) >= 25 && (d.dealDiscount || 0) < 40);
        else if (filter === 'new')   filteredDeals = allDeals.filter(d => d.isNew === true);
        else                         filteredDeals = [...allDeals];

        // Reflect active state
        const els = getEls();
        els.filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        renderDeals(filteredDeals);
    }

    /* ============================================================
       HEADER PATCH
       ============================================================ */
    function patchHeader() {
        if (!window.STHeader || _headerPatched) return;
        window.STHeader._dealsOriginalUpdate = window.STHeader.updateAuthUI;
        _headerPatched = true;
        window.STHeader.updateAuthUI = function () {
            window.STHeader._dealsOriginalUpdate?.();
            if (document.getElementById('dealsGrid')) {
                loadWishlist();
                renderDeals(filteredDeals);
            }
        };
    }
    function unpatchHeader() {
        if (_headerPatched && window.STHeader?._dealsOriginalUpdate) {
            window.STHeader.updateAuthUI = window.STHeader._dealsOriginalUpdate;
            delete window.STHeader._dealsOriginalUpdate;
        }
        _headerPatched = false;
    }

    /* ============================================================
       CLEANUP / INIT
       ============================================================ */
    function cleanup() {
        if (heroInterval)      { clearInterval(heroInterval);      heroInterval = null; }
        if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
        unpatchHeader();

        allDeals = [];
        filteredDeals = [];
        wishlist = [];
        heroImages = [];
        heroImageIndex = 0;
        currentFilter = 'all';
    }

    async function init() {
        const els = getEls();
        if (!els.page || !els.grid) return;      // not the deals page
        cleanup();

        console.log('📄 Deals page: init');

    
        startCountdown();

        // Bind filter buttons (assignment = idempotent)
        els.filterBtns.forEach(btn => {
            btn.onclick = function () {
                filterDeals(this.dataset.filter);
            };
        });

        // Fetch in parallel
        const [heroImgs, deals] = await Promise.all([
            fetchHeroImages(6),
            fetchDeals()
        ]);

        initHeroSlider(heroImgs);

        allDeals = deals;
        filteredDeals = [...allDeals];

        renderDeals(filteredDeals);
        patchHeader();

        console.log(`🔥 ${allDeals.length} deals available`);
    }

    /* ============================================================
       GLOBAL EXPORTS
       ============================================================ */
    function bindGlobals() {
        window.toggleWishlist = toggleWishlist;
        window.filterDeals    = filterDeals;
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

    console.log('✅ Deals page script loaded');
})();
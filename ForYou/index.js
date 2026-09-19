(function () {
    'use strict';

    /* ============================================================
       MODULE STATE
       ============================================================ */
    let wishlist        = [];
    let allProducts     = [];
    let categories      = [];
    let foryouProducts  = [];
    let currentCategory = null;   // null = all

    /* ============================================================
       ELEMENT LOOKUP — fresh each init
       ============================================================ */
    function getEls() {
        return {
            root:                document.querySelector('.categories-container'),
            categoryList:        document.getElementById('categoryList'),
            categorySkeleton:    document.getElementById('categorySkeleton'),
            recommendedGrid:     document.getElementById('recommendedGrid'),
            recommendedSkeleton: document.getElementById('recommendedSkeleton'),
            foryouGrid:          document.getElementById('foryouGrid'),
            foryouSkeleton:      document.getElementById('foryouSkeleton'),
            categorySub:         document.getElementById('categorySub'),
            productSectionTitle: document.getElementById('productSectionTitle'),
            viewallforsection:   document.getElementById('viewallforsection'),
            categoryBadge:       document.getElementById('categoryBadge'),
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
        document.querySelector('.toast-msg')?.remove();
        const toast = document.createElement('div');
        toast.className = `toast-msg ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-20px)';
            toast.style.transition = 'all .3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function getCategoryIcon(category) {
        const icons = {
            smartphone: 'fa-mobile-alt', phone: 'fa-mobile-alt', laptop: 'fa-laptop',
            tablet: 'fa-tablet', audio: 'fa-headphones', accessories: 'fa-plug',
            wearable: 'fa-clock', gaming: 'fa-gamepad', tv: 'fa-tv',
            camera: 'fa-camera', printer: 'fa-print', storage: 'fa-hdd',
            network: 'fa-wifi', power: 'fa-bolt', monitor: 'fa-desktop',
            furniture: 'fa-couch', clothing: 'fa-tshirt', beauty: 'fa-spa',
            jewelry: 'fa-gem', toys: 'fa-rocket', shoes: 'fa-shoe-prints',
            health: 'fa-heartbeat', pet: 'fa-paw', home: 'fa-home',
            kitchen: 'fa-utensils', office: 'fa-briefcase'
        };
        return icons[category?.toLowerCase()] || 'fa-folder';
    }

    function loadWishlist() {
        try { wishlist = JSON.parse(localStorage.getItem('st_wishlist') || '[]'); }
        catch { wishlist = []; }
    }

    /* ============================================================
       FETCH
       ============================================================ */
    async function fetchAllData() {
        const client = window.getSupabaseClient?.();
        if (!client) return;

        try {
            const { data: products, error } = await client
                .from('products').select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;

            allProducts = products || [];

            const catMap = new Map();
            allProducts.forEach(p => {
                if (!p.category) return;
                const key = p.category.toLowerCase();
                if (!catMap.has(key)) catMap.set(key, { name: p.category, count: 1 });
                else catMap.get(key).count++;
            });
            categories = Array.from(catMap.values())
                .sort((a, b) => b.count - a.count).slice(0, 20);

            foryouProducts = allProducts
                .filter(p => p.isHot || p.isNew || (p.rating || 0) >= 4)
                .slice(0, 6);
            if (foryouProducts.length < 6) {
                const used = new Set(foryouProducts.map(p => p.id));
                const extra = allProducts
                    .filter(p => !used.has(p.id))
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 6 - foryouProducts.length);
                foryouProducts = [...foryouProducts, ...extra];
            }

            hideSkeletons();
            renderCategories(categories);
            renderForYou(foryouProducts);
            filterProducts(currentCategory);
        } catch (err) {
            console.error('❌ Fetch error:', err);
            showToast(t('load_error', 'Failed to load data'), 'error');
            hideSkeletons();
        }
    }

    function hideSkeletons() {
        const els = getEls();
        if (els.categorySkeleton)    els.categorySkeleton.style.display = 'none';
        if (els.recommendedSkeleton) els.recommendedSkeleton.style.display = 'none';
        if (els.foryouSkeleton)      els.foryouSkeleton.style.display = 'none';
    }

    /* ============================================================
       CATEGORIES
       ============================================================ */
    function renderCategories(cats) {
        const els = getEls();
        if (!els.categoryList) return;

        if (!cats?.length) {
            els.categoryList.innerHTML = `<div style="padding:12px;color:#94A3B8;" data-translate="no_categories">No categories</div>`;
            if (els.categoryBadge) els.categoryBadge.textContent = '0';
            return;
        }

        if (els.categoryBadge) els.categoryBadge.textContent = cats.length;

        // NOTE: no inline onclick with category name (apostrophes break it).
        // We use data-cat + delegation bound once in bindInteractions().
        els.categoryList.innerHTML = `
            <div class="category-chip-side ${!currentCategory ? 'active' : ''}" data-cat="">
                <div class="chip-icon"><i class="fas fa-th"></i></div>
                <span class="chip-label" data-translate="all">All</span>
                <span class="chip-count">${allProducts.length}</span>
            </div>
            ${cats.map(cat => `
                <div class="category-chip-side ${currentCategory === cat.name ? 'active' : ''}"
                     data-cat="${escapeHtml(cat.name)}">
                    <div class="chip-icon"><i class="fas ${getCategoryIcon(cat.name)}"></i></div>
                    <span class="chip-label">${escapeHtml(cat.name)}</span>
                    <span class="chip-count">${cat.count}</span>
                </div>`).join('')}`;

        if (typeof translateUI === 'function') translateUI();
    }

    function escapeHtml(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function selectCategory(categoryName) {
        currentCategory = categoryName;
        const els = getEls();
        els.categoryList?.querySelectorAll('.category-chip-side').forEach(el => {
            const cat = el.dataset.cat || '';
            const match = (cat === '' && !categoryName) || cat === categoryName;
            el.classList.toggle('active', match);
        });
        filterProducts(categoryName);
        // Hide "For You" section once a category is chosen
        if (els.foryouGrid) els.foryouGrid.style.display = 'none';
        
    }

    /* ============================================================
       FILTER + RENDER RECOMMENDED
       ============================================================ */
    function filterProducts(categoryName) {
        let filtered, title, subText;

        if (categoryName) {
            filtered = allProducts.filter(p =>
                p.category && p.category.toLowerCase() === categoryName.toLowerCase()
            );
            title = categoryName;
            subText = categoryName;
        } else {
            filtered = allProducts.filter(p =>
                p.isDeal || (p.rating || 0) >= 4.5 || p.discount > 0
            );
            if (!filtered.length) filtered = allProducts.slice(0, 8);
            title = t('recommended', 'Recommended');
            subText = t('all', 'All');
        }

        const els = getEls();
        if (els.categorySub) {
            els.categorySub.innerHTML =
                `${t('showing_in', 'Showing products in')} <strong>${escapeHtml(subText)}</strong> (${filtered.length} ${t('items', 'items')})`;
        }
        if (els.productSectionTitle) els.productSectionTitle.textContent = title;
        if (els.viewallforsection) {
            els.viewallforsection.href = `/category/?category=${encodeURIComponent(categoryName || '')}`;
        }

        renderRecommended(filtered);
    }

    function renderRecommended(products) {
        const els = getEls();
        if (!els.recommendedGrid) return;

        if (!products?.length) {
            els.recommendedGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:#94A3B8;" data-translate="no_products">No products in this category</div>`;
            return;
        }

        els.recommendedGrid.innerHTML = products.map(p => {
            const image = p.image || 'https://placehold.co/300x300/6C3CE1/FFFFFF?text=Product';
            const isWished = wishlist.includes(p.id);
            const rating = p.rating || 0;
            const sold = p.sold || Math.floor(Math.random() * 500) + 50;
            const isDeal = p.isDeal || p.discount > 0;

            return `
                <div class="recommended-card" data-product-id="${p.id}"
                     onclick="window.navigateWithUserInfo('/item/?product=${p.id}')">
                    <div class="card-image">
                        <img src="${image}" alt="${escapeHtml(p.name)}" loading="lazy"
                             onerror="this.src='https://placehold.co/300x300/6C3CE1/FFFFFF?text=Product'">
                        ${isDeal ? `<span class="card-badge" data-translate="deal">🔥 Deal</span>` : ''}
                        <span class="card-sold" data-translate="sold">${sold} sold</span>
                        ${rating > 0 ? `<span class="card-rating-float"><i class="fas fa-star" style="color:#F59E0B;"></i> ${rating.toFixed(1)}</span>` : ''}
                    </div>
                    <div class="card-body">
                        <div class="card-name">${escapeHtml(p.name) || 'Unknown Product'}</div>
                        <div class="card-meta">
                            ${p.brand ? `<span>${escapeHtml(p.brand)}</span><span class="dot"></span>` : ''}
                            <span>${sold} ${t('sold', 'sold')}</span>
                        </div>
                        <div class="card-price">
                            FCFA ${(p.price || 0).toFixed(2)}
                            ${isDeal && p.originalPrice ? `<span class="original">FCFA ${(p.originalPrice || 0).toFixed(2)}</span>` : ''}
                        </div>
                        <div class="card-actions">
                            <button class="btn-wish ${isWished ? 'active' : ''}"
                                    data-wish-id="${p.id}"
                                    onclick="event.stopPropagation(); window.__catsToggleWishlist('${p.id}')">
                                <i class="fas fa-heart"></i>
                            </button>
                        </div>
                    </div>
                </div>`;
        }).join('');

        if (typeof translateUI === 'function') translateUI();
    }

    /* ============================================================
       RENDER FOR YOU
       ============================================================ */
    function renderForYou(products) {
        const els = getEls();
        if (!els.foryouGrid) return;

        if (!products?.length) {
            els.foryouGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;color:#94A3B8;" data-translate="no_recommendations">No recommendations</div>`;
            return;
        }

        els.foryouGrid.innerHTML = products.map(p => {
            const image = p.image || 'https://placehold.co/80x80/6C3CE1/FFFFFF?text=Product';
            const isWished = wishlist.includes(p.id);
            const rating = p.rating || 0;
            const sold = p.sold || Math.floor(Math.random() * 500) + 50;
            const isDeal = p.isDeal || p.discount > 0;

            let tag = '';
            if (p.isHot) tag = t('hot', 'Hot');
            else if (p.isNew) tag = t('new', 'New');
            else if (isDeal) tag = t('deal', 'Deal');

            return `
                <div class="foryou-card" data-product-id="${p.id}"
                     onclick="window.navigateWithUserInfo('/item/?product=${p.id}')">
                    <div class="foryou-image"><img src="${image}" alt="${escapeHtml(p.name)}" loading="lazy"
                         onerror="this.src='https://placehold.co/80x80/6C3CE1/FFFFFF?text=Product'"></div>
                    <div class="foryou-info">
                        <div class="foryou-name">${escapeHtml(p.name) || 'Unknown'}</div>
                        <div class="foryou-meta">
                            ${p.brand ? `<span>${escapeHtml(p.brand)}</span>` : ''}
                            ${tag ? `<span class="tag">${tag}</span>` : ''}
                        </div>
                        <div class="foryou-price">
                            FCFA ${(p.price || 0).toFixed(2)}
                            ${isDeal && p.originalPrice ? `<span class="original">FCFA ${(p.originalPrice || 0).toFixed(2)}</span>` : ''}
                        </div>
                        <div class="foryou-stats">
                            ${rating > 0 ? `<span class="rating"><i class="fas fa-star" style="color:#F59E0B;"></i> ${rating.toFixed(1)}</span>` : ''}
                            <span>${sold} ${t('sold', 'sold')}</span>
                        </div>
                    </div>
                    <div class="foryou-actions">
                        <button class="btn-wish-small ${isWished ? 'active' : ''}"
                                data-wish-id="${p.id}"
                                onclick="event.stopPropagation(); window.__catsToggleWishlist('${p.id}')">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>`;
        }).join('');

        if (typeof translateUI === 'function') translateUI();
    }

    /* ============================================================
       WISHLIST TOGGLE — no full re-render
       ============================================================ */
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

            // Toggle the active class in place — no re-render
            document.querySelectorAll(`[data-wish-id="${productId}"]`).forEach(btn => {
                btn.classList.toggle('active');
            });
        } catch (err) {
            console.error(err);
            showToast('❌ ' + t('failed', 'Failed'), 'error');
        }
    }

    /* ============================================================
       BIND INTERACTIONS — assignment (idempotent)
       ============================================================ */
    function bindInteractions() {
        const els = getEls();
        if (!els.categoryList) return;

        // Delegated click on the category list. Survives re-render.
        els.categoryList.onclick = function (e) {
            const chip = e.target.closest('.category-chip-side');
            if (!chip || chip.classList.contains('skeleton-chip-side')) return;

            const rawCat = chip.dataset.cat || '';
            const category = rawCat || null;

            selectCategory(category);

            // scroll + blink feedback
            const targetGrid = document.getElementById('recommendedGrid');
            if (!targetGrid) return;

            const offset = 100;
            const targetPosition = targetGrid.getBoundingClientRect().top + window.pageYOffset - offset;
            const startPosition  = window.pageYOffset;
            const distance       = targetPosition - startPosition;
            const duration       = 400;
            let start = null;

            const ease = (timeElapsed, b, c, d) => {
                let t2 = timeElapsed / (d / 2);
                if (t2 < 1) return c / 2 * t2 * t2 * t2 + b;
                t2 -= 2;
                return c / 2 * (t2 * t2 * t2 + 2) + b;
            };
            const animation = (currentTime) => {
                if (start === null) start = currentTime;
                const elapsed = currentTime - start;
                window.scrollTo(0, ease(elapsed, startPosition, distance, duration));
                if (elapsed < duration) requestAnimationFrame(animation);
            };
            requestAnimationFrame(animation);

            chip.style.transition = 'transform .1s, background .1s';
            chip.style.transform = 'scale(0.95)';
            chip.style.background = 'rgba(108, 60, 225, 0.2)';
            setTimeout(() => {
                chip.style.transform = 'scale(1)';
                chip.style.background = '';
            }, 150);
        };
    }

    /* ============================================================
       CLEANUP / INIT
       ============================================================ */
    function cleanup() {
        wishlist = [];
        allProducts = [];
        categories = [];
        foryouProducts = [];
        currentCategory = null;
        // Unhook delegated listener so no stale closures survive
        const list = document.getElementById('categoryList');
        if (list) list.onclick = null;
    }

    function init() {
        const els = getEls();
        if (!els.root) return;      // not the categories page
        cleanup();

        console.log('📄 Categories page: init');

        loadWishlist();
        bindInteractions();
        fetchAllData();

        console.log('📄 Categories page ready');
    }
    
const contentRight = document.querySelector('section.content-right');
const categoryList = document.querySelector('div#categoryList');

if (categoryList && contentRight) {
  categoryList.addEventListener('click', (event) => {
    // Check if a category was clicked
    const isChip = event.target.closest('.category-chip-side');
    
    if (isChip) {
      // Scroll the CONTENT section (right side) to the top
      contentRight.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  });
}
    /* ============================================================
       GLOBAL EXPORTS
       ============================================================ */
    function bindGlobals() {
        window.selectCategory         = selectCategory;
        window.toggleWishlist         = toggleWishlist;
        window.__catsToggleWishlist   = toggleWishlist;   // used by inline onclick
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

    console.log('✅ Categories page script loaded');
})();
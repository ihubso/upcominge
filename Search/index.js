(function () {
    'use strict';

    /* ============================================================
       MODULE STATE
       ============================================================ */
    let allProducts        = [];
    let filteredProducts   = [];
    let currentQuery       = '';
    let currentFilter      = 'all';
    let currentSort        = 'relevance';
    let currentPage        = 1;
    const perPage          = 20;
    let isLoading          = false;
    let hasMore            = true;
    let wishlist           = [];

    let _headerPatched     = false;
    let _liveSearchTimer   = null;

    /* ============================================================
       ELEMENT LOOKUP
       ============================================================ */
    function getEls() {
        return {
            page:         document.getElementById('stSearchPage'),
            grid:         document.getElementById('stProductsGrid'),
            loading:      document.getElementById('stLoading'),
            loadMore:     document.getElementById('stLoadMore'),
            loadMoreBtn:  document.getElementById('stLoadMoreBtn'),
            queryDisplay: document.getElementById('stSearchQueryDisplay'),
            searchMeta:   document.getElementById('stSearchMeta'),
            resultCount:  document.getElementById('stResultCount'),
            searchInput:  document.getElementById('stSearchInput'),
            searchBtn:    document.getElementById('stSearchBtn'),
            sortSelect:   document.getElementById('stSortSelect'),
            filterChips:  document.querySelectorAll('.st-filter-chip'),
        };
    }

    /* ============================================================
       TRANSLATION
       ============================================================ */
    function t(key, fallback) {
        if (window.Translations?.translate) {
            const r = window.Translations.translate(key);
            if (r && r !== key) return r;
        }
        return fallback || key;
    }

    /* ============================================================
       HELPERS
       ============================================================ */
    function showToast(message, type = 'success') {
        document.querySelector('.st-toast')?.remove();
        const toast = document.createElement('div');
        toast.className = `st-toast ${type}`;
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
        let html = '';
        for (let i = 0; i < full; i++) html += '★';
        for (let i = full; i < 5; i++) html += '☆';
        return html;
    }

    function getQueryFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('search') || params.get('q') || '';
    }

    function highlightMatch(text, query) {
        if (!text || !query) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<strong style="color:#6C3CE1;">$1</strong>');
    }

    function loadWishlist() {
        try { wishlist = JSON.parse(localStorage.getItem('st_wishlist') || '[]'); }
        catch (_) { wishlist = []; }
    }

    /* ============================================================
       URL CLEANUP — strip ?search= from address bar
       ============================================================ */
    function cleanURL() {
        try {
            if (window.location.search && window.location.pathname.endsWith('/Search/')) {
                window.history.replaceState({}, '', '/Search/');
            }
        } catch (_) { /* noop */ }
    }

    /* ============================================================
       SKELETON CARDS — shown while live-searching
       ============================================================ */
    function showSearchSkeleton(count = 8) {
        const els = getEls();
        if (!els.grid) return;
        els.grid.innerHTML = Array(count).fill(0).map(() => `
            <div class="st-skeleton-card">
                <div class="st-skeleton-image"></div>
                <div class="st-skeleton-body">
                    <div class="st-skeleton-line name"></div>
                    <div class="st-skeleton-line brand"></div>
                    <div class="st-skeleton-line price"></div>
                    <div class="st-skeleton-line btn"></div>
                </div>
            </div>`).join('');
    }

    function clearGridState() {
        const els = getEls();
        if (els.grid) els.grid.innerHTML = '';
        if (els.loadMore) els.loadMore.style.display = 'none';
        if (els.resultCount) els.resultCount.textContent = '';
        if (els.searchMeta) els.searchMeta.textContent = '';
    }

    /* ============================================================
       FETCH — SERVER-SIDE SEARCH + PAGINATION (via RPC)
       ============================================================ */
    async function fetchProducts(query, page = 1) {
        const client = window.getSupabaseClient?.();
        if (!client) return { products: [], total: 0 };

        try {
            const offset = (page - 1) * perPage;
            const { data, error } = await client.rpc('search_products_paginated', {
                p_query:  (query || '').trim(),
                p_limit:  perPage,
                p_offset: offset
            });
            if (error) throw error;

            const rows = data || [];
            if (!rows.length) return { products: [], total: 0 };

            const total = Number(rows[0].total_count || rows.length);
            const products = rows.map(({ total_count, ...p }) => p);
            return { products, total };
        } catch (err) {
            console.error('❌ Search RPC error:', err.message);
            return { products: [], total: 0 };
        }
    }

    /* ============================================================
       RENDER
       ============================================================ */
    function renderProducts(products, append = false) {
        const els = getEls();
        if (!els.grid) return;

        if (!append) els.grid.innerHTML = '';

        if (!products?.length) {
            if (!append) {
                els.grid.innerHTML = `
                    <div class="st-empty-state">
                        <div class="st-empty-icon"><i class="fas fa-search"></i></div>
                        <h2 data-translate="no_products_found">No products found</h2>
                        <p data-translate="no_products_message">We couldn't find any products matching "<strong>${currentQuery}</strong>"</p>
                        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                            <a href="/product/" class="st-btn-shop" data-translate="browse_all">
                                <i class="fas fa-store"></i> Browse All Products
                            </a>
                            <button onclick="clearSearch()" class="st-btn-shop" style="background:#94A3B8;box-shadow:none;" data-translate="clear_search">
                                <i class="fas fa-undo"></i> Clear Search
                            </button>
                        </div>
                    </div>`;
                if (typeof translateUI === 'function') translateUI();
            }
            return;
        }

        const cards = products.map(product => {
            const isWished = wishlist.includes(product.id);
            const isDeal   = product.isDeal || false;
            const isHot    = product.isHot  || false;
            const isNew    = product.isNew  || false;

            let badge = '';
            if (isDeal)      badge = `<span class="st-product-badge deal" data-translate="badge_deal">🔥 Deal</span>`;
            else if (isHot)  badge = `<span class="st-product-badge hot"  data-translate="badge_hot">⚡ Hot</span>`;
            else if (isNew)  badge = `<span class="st-product-badge new"  data-translate="badge_new">✨ New</span>`;

            const image       = product.image || 'https://placehold.co/400x400/6C3CE1/FFFFFF?text=Product';
            const rating      = product.rating || 0;
            const reviewCount = product.review_count || product.reviewCount || 0;

            return `
                <div class="st-product-card" onclick="window.navigateWithUserInfo('/item/?product=${product.id}')">
                    <div class="st-product-image">
                        <img src="${image}" alt="${product.name}" loading="lazy"
                             onerror="this.src='https://placehold.co/400x400/6C3CE1/FFFFFF?text=Product'">
                        ${badge}
                    </div>
                    <div class="st-product-body">
                        <div class="st-product-name">${highlightMatch(product.name || 'Unknown', currentQuery)}</div>
                        ${product.brand ? `<div class="st-product-brand">${highlightMatch(product.brand, currentQuery)}</div>` : ''}
                        <div class="st-product-price">
                            FCFA ${(Number(product.price) || 0).toFixed(2)}
                            ${product.originalPrice && product.originalPrice > product.price
                                ? `<span class="st-original-price">FCFA ${(Number(product.originalPrice) || 0).toFixed(2)}</span>`
                                : ''}
                        </div>
                        ${rating > 0 ? `
                            <div class="st-product-rating">
                                ${renderStars(rating)}
                                <span>(${reviewCount})</span>
                            </div>` : ''}
                        <div class="st-product-actions">
                            <button class="st-btn-wishlist ${isWished ? 'active' : ''}"
                                    onclick="event.stopPropagation(); toggleWishlist('${product.id}')">
                                <i class="fas fa-heart"></i>
                            </button>
                        </div>
                    </div>
                </div>`;
        }).join('');

        if (append) els.grid.insertAdjacentHTML('beforeend', cards);
        else        els.grid.innerHTML = cards;

        if (typeof translateUI === 'function') translateUI();
    }

    /* ============================================================
       ANALYTICS
       ============================================================ */
    async function saveSearchAnalyticsToDB(query) {
      if (!query || !query.trim()) return;
      const client = window.getSupabaseClient?.();
      if (!client) return;

      const q = query.trim().toLowerCase();

      try {
        const { data: existing, error: selectErr } = await client
          .from('search_analytics')
          .select('id, count')
          .eq('query', q)
          .maybeSingle();

        if (selectErr && selectErr.code !== 'PGRST116') {
          console.warn('analytics select failed:', selectErr.message);
          return;
        }

        if (existing) {
          const { error: updErr } = await client
            .from('search_analytics')
            .update({
              count: (existing.count || 0) + 1,
              last_searched: new Date().toISOString(),
            })
            .eq('id', existing.id);
          if (updErr) console.warn('analytics update failed:', updErr.message);
        } else {
          const { error: insErr } = await client
            .from('search_analytics')
            .insert({
              query: q,
              count: 1,
              last_searched: new Date().toISOString(),
            });
          if (insErr) console.warn('analytics insert failed:', insErr.message);
        }
      } catch (err) {
        console.warn('analytics error:', err);
      }
    }

    async function recordSearchQuery(query) {
        if (!query?.trim() || !window.saveSearchAnalyticsToDB) return;
        try { await window.saveSearchAnalyticsToDB(query.trim()); }
        catch (err) { console.warn('⚠️ Search analytics save failed:', err); }
    }

    /* ============================================================
       SORT + FILTER
       ============================================================ */
    function sortProducts(products, sortBy) {
        const sorted = [...products];
        switch (sortBy) {
            case 'price_asc':  sorted.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)); break;
            case 'price_desc': sorted.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0)); break;
            case 'newest':     sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
            case 'rating':     sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
            case 'relevance':
            default:           break;
        }
        return sorted;
    }

    function applyFilter(products) {
        if (currentFilter === 'all') return products;
        return products.filter(p =>
            p.category && p.category.toLowerCase() === currentFilter.toLowerCase()
        );
    }

    function refreshView() {
        const filtered = applyFilter(allProducts);
        const sorted = sortProducts(filtered, currentSort);
        filteredProducts = sorted;
        renderProducts(sorted, false);

        const els = getEls();
        if (els.resultCount) {
            const n = sorted.length;
            els.resultCount.textContent = `${n} ${t('product', 'product')}${n !== 1 ? 's' : ''}`;
        }
    }

    /* ============================================================
       SEARCH — the master routine
       silent=true → don't record analytics (used for live typing)
       ============================================================ */
    async function performSearch(query, page = 1, append = false, silent = false) {
        if (isLoading) return;
        isLoading = true;

        const els = getEls();
        if (!els.grid) { isLoading = false; return; }

        if (!append) {
            // Skeleton is already shown by the live-search handler.
            // Hide the legacy spinner so it doesn't fight for space.
            if (els.loading) els.loading.style.display = 'none';
            if (els.loadMore) els.loadMore.style.display = 'none';
        }

        try {
            const result = await fetchProducts(query, page);
            const products = result.products || [];
            const total    = result.total || 0;

            // Only record analytics when NOT silent (user pressed Enter / clicked Search)
            if (!append && query?.trim() && !silent) {
                recordSearchQuery(query).catch(() => {});
            }

            // Reflect the current query in the header
            if (els.queryDisplay) {
                els.queryDisplay.textContent = query || t('all_products', 'All Products');
            }

            let finalProducts = products;
            if (currentSort && currentSort !== 'relevance' && currentSort !== 'newest') {
                finalProducts = sortProducts(products, currentSort);
            }

            if (append) {
                allProducts = [...allProducts, ...finalProducts];
                renderProducts(finalProducts, true);
            } else {
                allProducts = finalProducts;
                renderProducts(finalProducts, false);
            }

            if (els.resultCount) {
                const n = append ? allProducts.length : total;
                els.resultCount.textContent = `${n} ${t('product', 'product')}${n !== 1 ? 's' : ''}`;
            }
            if (els.searchMeta) {
                const n = append ? allProducts.length : total;
                els.searchMeta.textContent = query
                    ? `${t('found_results', 'Found')} ${n} ${t('results_for', 'results for')} "${query}"`
                    : '';
            }

            hasMore = (page * perPage) < total;
            if (els.loadMore && els.loadMoreBtn) {
                if (hasMore && finalProducts.length > 0) {
                    els.loadMore.style.display = 'block';
                    els.loadMoreBtn.innerHTML = `<i class="fas fa-chevron-down"></i> ${t('load_more', 'Load More')}`;
                    els.loadMoreBtn.disabled = false;
                } else {
                    els.loadMore.style.display = 'none';
                }
            }

            currentPage = page;

            // ✅ Strip the query param from the address bar after search
            cleanURL();
        } catch (err) {
            console.error('❌ Search error:', err);
            showToast(t('search_failed', 'Failed to search products'), 'error');
        } finally {
            isLoading = false;
            if (els.loading) els.loading.style.display = 'none';
        }
    }

    /* ============================================================
       WISHLIST
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

               const owner = window.getOwner();
        const customerId  = owner
            if (customerId && window.saveWishlistToDB) {
                try { await window.saveWishlistToDB(customerId, wishlist); } catch (_) {}
            }

            if (window.STHeader) {
                window.STHeader.AppState.wishlist = wishlist;
                window.STHeader.updateCounts?.();
            }

            document.querySelectorAll('.st-product-card').forEach(card => {
                const btn = card.querySelector('.st-btn-wishlist');
                if (!btn) return;
                const onclick = btn.getAttribute('onclick') || '';
                const m = onclick.match(/toggleWishlist\('([^']+)'\)/);
                if (m && m[1] === productId) btn.classList.toggle('active');
            });
        } catch (err) {
            console.error('❌ Wishlist error:', err);
            showToast('❌ ' + t('wishlist_failed', 'Failed to update wishlist'), 'error');
        }
    }

    /* ============================================================
       CLEAR SEARCH
       ============================================================ */
    function clearSearch() {
        window.navigateWithUserInfo('/Search/');
    }

    /* ============================================================
       BIND INTERACTIONS
       ============================================================ */
    function bindInteractions() {
        const els = getEls();

        /* ------- Live search on typing ------- */
        if (els.searchInput) {
            els.searchInput.oninput = function () {
                const q = this.value.trim();

                // ✅ Clean the URL as soon as the user types
                cleanURL();

                clearTimeout(_liveSearchTimer);

                // Empty input → reset the grid
                if (!q) {
                    currentQuery = '';
                    allProducts = [];
                    clearGridState();
                    if (els.queryDisplay) {
                        els.queryDisplay.textContent = t('all_products', 'All Products');
                    }
                    return;
                }

                // Show skeleton immediately (feels instant)
                showSearchSkeleton(8);
                if (els.loadMore) els.loadMore.style.display = 'none';

                // Debounce the actual fetch
                _liveSearchTimer = setTimeout(() => {
                    currentQuery = q;
                    performSearch(q, 1, false, /* silent = */ true);
                }, 350);
            };

            /* ------- Enter key — search in place, no navigation ------- */
            els.searchInput.onkeypress = function (e) {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                clearTimeout(_liveSearchTimer);
                const q = this.value.trim();
                if (!q) return;
                currentQuery = q;
                showSearchSkeleton(8);
                performSearch(q, 1, false, /* silent = */ false);
            };
        }

        /* ------- Search button — search in place, no reload ------- */
        if (els.searchBtn) {
            els.searchBtn.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                clearTimeout(_liveSearchTimer);
                const q = els.searchInput?.value.trim();
                if (!q) return;
                currentQuery = q;
                showSearchSkeleton(8);
                performSearch(q, 1, false, /* silent = */ false);
            };
        }

        /* ------- Sort dropdown ------- */
        if (els.sortSelect) {
            els.sortSelect.value = currentSort;
            els.sortSelect.onchange = function () {
                currentSort = this.value;
                refreshView();
            };
        }

        /* ------- Filter chips ------- */
        els.filterChips.forEach(chip => {
            chip.classList.toggle('active', chip.dataset.filter === currentFilter);
            chip.onclick = function () {
                els.filterChips.forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                currentFilter = this.dataset.filter;
                refreshView();
            };
        });

        /* ------- Load more ------- */
        if (els.loadMoreBtn) {
            els.loadMoreBtn.onclick = function () {
                if (isLoading || !hasMore) return;
                this.innerHTML = `<span class="st-loader-small"></span> ${t('loading', 'Loading...')}`;
                this.disabled = true;
                performSearch(currentQuery, currentPage + 1, true);
            };
        }
    }

    /* ============================================================
       HEADER PATCH
       ============================================================ */
    function patchHeader() {
        if (!window.STHeader || _headerPatched) return;
        window.STHeader._searchOriginalUpdate = window.STHeader.updateAuthUI;
        _headerPatched = true;
        window.STHeader.updateAuthUI = function () {
            window.STHeader._searchOriginalUpdate?.();
            if (document.getElementById('stSearchPage')) {
                loadWishlist();
                renderProducts(filteredProducts.length ? filteredProducts : allProducts, false);
            }
        };
    }

    function unpatchHeader() {
        if (_headerPatched && window.STHeader?._searchOriginalUpdate) {
            window.STHeader.updateAuthUI = window.STHeader._searchOriginalUpdate;
            delete window.STHeader._searchOriginalUpdate;
        }
        _headerPatched = false;
    }

    /* ============================================================
       CLEANUP / INIT
       ============================================================ */
    function cleanup() {
        unpatchHeader();
        if (_liveSearchTimer) { clearTimeout(_liveSearchTimer); _liveSearchTimer = null; }
        allProducts = [];
        filteredProducts = [];
        currentQuery = '';
        currentFilter = 'all';
        currentSort = 'relevance';
        currentPage = 1;
        isLoading = false;
        hasMore = true;
    }

    async function init() {
        const els = getEls();
        if (!els.page) return;
        cleanup();

        console.log('📄 Search page: init');

        // Support deep-links: /Search/?search=usb — but strip it right after
        const initialQuery = getQueryFromUrl();
        currentQuery = initialQuery;

        if (els.queryDisplay) {
            els.queryDisplay.textContent = initialQuery || t('all_products', 'All Products');
        }
        if (els.searchInput) els.searchInput.value = initialQuery;

        currentFilter = 'all';
        currentSort = 'relevance';

        loadWishlist();
        bindInteractions();

        if (initialQuery) {
            showSearchSkeleton(8);
            await performSearch(initialQuery, 1, false, /* silent = */ false);
        } else {
            clearGridState();
        }

        // ✅ Strip the URL param on load (deep-link cleanup)
        cleanURL();

        patchHeader();

        console.log(`🔍 Query: "${currentQuery}"`);
        console.log('📄 Search page ready');
    }

    /* ============================================================
       GLOBAL EXPORTS
       ============================================================ */
    function bindGlobals() {
        window.toggleWishlist = toggleWishlist;
        window.clearSearch    = clearSearch;
        window.performSearch  = performSearch;
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

    console.log('✅ Search page script loaded (LIVE SEARCH + IN-PLACE BUTTON)');
})();
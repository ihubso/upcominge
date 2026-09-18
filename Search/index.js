 
        function t(key, fallback) {
            if (window.Translations && window.Translations.translate) {
                const result = window.Translations.translate(key);
                if (result && result !== key) return result;
            }
            return fallback || key;
        }

        // --- State ---
        let allProducts = [];
        let filteredProducts = [];
        let currentQuery = '';
        let currentFilter = 'all';
        let currentSort = 'relevance';
        let currentPage = 1;
        const perPage = 20;
        let isLoading = false;
        let hasMore = true;
        let wishlist = [];

        // --- DOM Elements ---
        const elements = {
            grid: document.getElementById('stProductsGrid'),
            loading: document.getElementById('stLoading'),
            loadMore: document.getElementById('stLoadMore'),
            loadMoreBtn: document.getElementById('stLoadMoreBtn'),
            queryDisplay: document.getElementById('stSearchQueryDisplay'),
            searchMeta: document.getElementById('stSearchMeta'),
            resultCount: document.getElementById('stResultCount'),
            searchInput: document.getElementById('stSearchInput'),
            searchBtn: document.getElementById('stSearchBtn'),
            sortSelect: document.getElementById('stSortSelect'),
            filterChips: document.querySelectorAll('.st-filter-chip')
        };

        // ============================================================
        //  HELPERS
        // ============================================================

        function showToast(message, type = 'success') {
            const existing = document.querySelector('.st-toast');
            if (existing) existing.remove();

            const toast = document.createElement('div');
            toast.className = `st-toast ${type}`;
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(-50%) translateY(-20px)';
                toast.style.transition = 'all 0.3s ease';
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

        // ============================================================
        //  FETCH PRODUCTS
        // ============================================================

        async function fetchProducts(query, page = 1) {
            const client = getSupabaseClient();
            if (!client) return [];

            try {
                const start = (page - 1) * perPage;
                const end = start + perPage - 1;

                let supabaseQuery = client
                    .from('products')
                    .select('*', { count: 'exact' });

                if (query && query.trim()) {
                    const trimmedQuery = query.trim();
                    supabaseQuery = supabaseQuery.or(
                        `name.ilike.%${trimmedQuery}%,` +
                        `brand.ilike.%${trimmedQuery}%,` +
                        `category.ilike.%${trimmedQuery}%,` +
                        `description.ilike.%${trimmedQuery}%`
                    );
                }

                const { data, error, count } = await supabaseQuery
                    .order('created_at', { ascending: false })
                    .range(start, end);

                if (error) throw error;

                return {
                    products: data || [],
                    total: count || 0
                };
            } catch (err) {
                console.error('❌ Search error:', err);
                return { products: [], total: 0 };
            }
        }

        // ============================================================
        //  LOAD WISHLIST
        // ============================================================

        function loadWishlist() {
            try {
                wishlist = JSON.parse(localStorage.getItem('st_wishlist') || '[]');
            } catch (e) {
                wishlist = [];
            }
        }

        // ============================================================
        //  RENDER PRODUCTS
        // ============================================================

        function renderProducts(products, append = false) {
            const grid = elements.grid;

            if (!append) {
                grid.innerHTML = '';
            }

            if (!products || products.length === 0) {
                if (!append) {
                    grid.innerHTML = `
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
                        </div>
                    `;
                  
                }
                return;
            }

            const cards = products.map(product => {
                const isWished = wishlist.includes(product.id);
                const isDeal = product.isDeal || false;
                const isHot = product.isHot || false;
                const isNew = product.isNew || false;

                let badge = '';
                if (isDeal) badge = `<span class="st-product-badge deal" data-translate="badge_deal">🔥 Deal</span>`;
                else if (isHot) badge = `<span class="st-product-badge hot" data-translate="badge_hot">⚡ Hot</span>`;
                else if (isNew) badge = `<span class="st-product-badge new" data-translate="badge_new">✨ New</span>`;

                const image = product.image || 'https://placehold.co/400x400/6C3CE1/FFFFFF?text=Product';
                const rating = product.rating || 0;
                const reviewCount = product.reviewCount || 0;

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
                                FCFA ${(product.price || 0).toFixed(2)}
                                ${product.originalPrice && product.originalPrice > product.price ? 
                                    `<span class="st-original-price">FCFA ${(product.originalPrice || 0).toFixed(2)}</span>` : ''}
                            </div>
                            ${rating > 0 ? `
                                <div class="st-product-rating">
                                    ${renderStars(rating)}
                                    <span>(${reviewCount})</span>
                                </div>
                            ` : ''}
                            <div class="st-product-actions">
                                <button class="st-btn-wishlist ${isWished ? 'active' : ''}" 
                                        onclick="event.stopPropagation(); toggleWishlist('${product.id}')">
                                    <i class="fas fa-heart"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            if (append) {
                grid.insertAdjacentHTML('beforeend', cards);
            } else {
                grid.innerHTML = cards;
            }
        }

        // ============================================================
        //  SEARCH
        // ============================================================

        async function recordSearchQuery(query) {
            if (!query || !query.trim()) return;
            const normalized = query.trim();

            if (window.saveSearchAnalyticsToDB) {
                try {
                    await window.saveSearchAnalyticsToDB(normalized);
                } catch (err) {
                    console.warn('⚠️ Search analytics save failed:', err);
                }
            }
        }

        async function performSearch(query, page = 1, append = false) {
            if (isLoading) return;
            isLoading = true;

            if (!append) {
                elements.loading.style.display = 'flex';
                elements.loadMore.style.display = 'none';
            }

            try {
                const result = await fetchProducts(query, page);
                const products = result.products || [];
                const total = result.total || 0;
                if (!append && query && query.trim()) {
                    recordSearchQuery(query).catch(() => {});
                }

                // Filter by category if selected
                let filtered = products;
                if (currentFilter !== 'all') {
                    filtered = products.filter(p => 
                        p.category && p.category.toLowerCase() === currentFilter.toLowerCase()
                    );
                }

                // Sort
                filtered = sortProducts(filtered, currentSort);

                if (append) {
                    allProducts = [...allProducts, ...filtered];
                    renderProducts(filtered, true);
                      translateUI();
                } else {
                    allProducts = filtered;
                    renderProducts(filtered);
                      translateUI();
                }

                // Update UI
                const totalDisplay = currentFilter !== 'all' ? filtered.length : total;
                elements.resultCount.textContent = `${totalDisplay} ${t('product', 'product')}${totalDisplay !== 1 ? 's' : ''}`;
                elements.searchMeta.textContent = `${t('found_results', 'Found')} ${totalDisplay} ${t('results_for', 'results for')} "${query}"`;

                // Update load more
                hasMore = (page * perPage) < total;
                if (hasMore && filtered.length > 0) {
                    elements.loadMore.style.display = 'block';
                    elements.loadMoreBtn.innerHTML = `<i class="fas fa-chevron-down"></i> ${t('load_more', 'Load More')}`;
                    elements.loadMoreBtn.disabled = false;
                } else {
                    elements.loadMore.style.display = 'none';
                }

                currentPage = page;

            } catch (err) {
                console.error('❌ Search error:', err);
                showToast(t('search_failed', 'Failed to search products'), 'error');
            } finally {
                isLoading = false;
                elements.loading.style.display = 'none';
            }
        }

        // ============================================================
        //  SORT PRODUCTS
        // ============================================================

        function sortProducts(products, sortBy) {
            const sorted = [...products];
            switch (sortBy) {
                case 'price_asc':
                    sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
                    break;
                case 'price_desc':
                    sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
                    break;
                case 'newest':
                    sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    break;
                case 'rating':
                    sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                    break;
                case 'relevance':
                default:
                    // Keep as is (already relevance from search)
                    break;
            }
            return sorted;
        }



        // ============================================================
        //  TOGGLE WISHLIST
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

                // Sync with Supabase
                const customerId = window.getCurrentCustomerId ? window.getCurrentCustomerId() : null;
                if (customerId && window.saveWishlistToDB) {
                    await window.saveWishlistToDB(customerId, wishlist);
                }

                // Update header
                if (window.STHeader) {
                    window.STHeader.AppState.wishlist = wishlist;
                    if (window.STHeader.updateCounts) {
                        window.STHeader.updateCounts();
                    }
                }

                // Re-render to update heart icons
                renderProducts(allProducts);

            } catch (err) {
                console.error('❌ Wishlist error:', err);
                showToast('❌ ' + t('wishlist_failed', 'Failed to update wishlist'), 'error');
            }
        }

        // ============================================================
        //  CLEAR SEARCH
        // ============================================================

        function clearSearch() {
            window.navigateWithUserInfo('/Search/');
        }

        // ============================================================
        //  INITIALIZE
        // ============================================================

        document.addEventListener('DOMContentLoaded', function() {
            // Get query from URL
            currentQuery = getQueryFromUrl();
            
            if (!currentQuery) {
                // No query, show all products
                currentQuery = '';
                elements.queryDisplay.textContent = t('all_products', 'All Products');
                elements.searchMeta.textContent = t('showing_all', 'Showing all products');
            } else {
                elements.queryDisplay.textContent = currentQuery;
            }

            // Set search input value
            elements.searchInput.value = currentQuery;

            // Load wishlist
            loadWishlist();

            // Perform search
            performSearch(currentQuery);

            // ---- Event Listeners ----

            // Search button
            elements.searchBtn.addEventListener('click', function() {
                const query = elements.searchInput.value.trim();
                if (query) {
                    window.navigateWithUserInfo(`/Search/?search=${encodeURIComponent(query)}`);
                } else {
                    window.navigateWithUserInfo('/Search/');
                }
            });

            // Search input enter key
            elements.searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    const query = this.value.trim();
                    if (query) {
                        window.navigateWithUserInfo(`/Search/?search=${encodeURIComponent(query)}`);
                    } else {
                        window.navigateWithUserInfo('/Search/');
                    }
                }
            });

            // Sort select
            elements.sortSelect.addEventListener('change', function() {
                currentSort = this.value;
                renderProducts(sortProducts(allProducts, currentSort));
            });

            // Filter chips
            elements.filterChips.forEach(chip => {
                chip.addEventListener('click', function() {
                    elements.filterChips.forEach(c => c.classList.remove('active'));
                    this.classList.add('active');
                    currentFilter = this.dataset.filter;
                    
                    // Refilter current products
                    let filtered = allProducts;
                    if (currentFilter !== 'all') {
                        filtered = allProducts.filter(p => 
                            p.category && p.category.toLowerCase() === currentFilter.toLowerCase()
                        );
                    }
                    renderProducts(sortProducts(filtered, currentSort));
                    
                    // Update count
                    elements.resultCount.textContent = `${filtered.length} ${t('product', 'product')}${filtered.length !== 1 ? 's' : ''}`;
                });
            });

            // Load more
            elements.loadMoreBtn.addEventListener('click', function() {
                if (!isLoading && hasMore) {
                    this.innerHTML = `<span class="st-loader-small"></span> ${t('loading', 'Loading...')}`;
                    this.disabled = true;
                    performSearch(currentQuery, currentPage + 1, true);
                }
            });

            // Watch for header login changes
            if (window.STHeader) {
                const originalUpdate = window.STHeader.updateAuthUI;
                window.STHeader.updateAuthUI = function() {
                    if (originalUpdate) originalUpdate();
                    loadWishlist();
                    renderProducts(allProducts);
                      translateUI();
                };
            }

            console.log('📄 Search results page loaded');
            console.log(`🔍 Query: "${currentQuery}"`);
            console.log(`📦 Products: ${allProducts.length}`);
        });

        // ============================================================
        //  EXPOSE GLOBALLY
        // ============================================================

     
        window.toggleWishlist = toggleWishlist;
        window.clearSearch = clearSearch;
        window.performSearch = performSearch;

        console.log('✅ Search page ready');
 
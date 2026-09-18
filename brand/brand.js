

    // ============================================================
    //  STATE
    // ============================================================
    let currentbrand = '';
    let allProducts = [];
    let page = 1;
    const perPage = 12;
    let isLoading = false;
    let hasMoreProducts = true;
    let groupedItemsCache = []; // Store all grouped items for infinite scroll
    let relatedProductsPool = [];
    let relatedLoadedCount = 0;
    let relatedObserver = null;
    const RELATED_BATCH_SIZE = 4;
    let heroImages = [];
    let heroImageIndex = 0;
    let heroInterval = null;
    let isHeroReady = false;
    let infiniteScrollObserver = null;

    // ============================================================
    //  HELPERS
    // ============================================================
    function normalizeBrand(value) {
        return String(value || '').trim().toLocaleLowerCase();
    }

    function getbrandFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const brand = params.get('brand');
        return brand && brand.trim() ? brand.trim() : 'all';
    }

    function showToast(msg) {
        const t = document.getElementById('toastMsg');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(t._timeout);
        t._timeout = setTimeout(() => t.classList.remove('show'), 2500);
    }

    function renderStars(rating) {
        const full = Math.floor(rating);
        let html = '';
        for (let i = 0; i < full; i++) html += '★';
        for (let i = full; i < 5; i++) html += '☆';
        return html;
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function getAverageRating(productId) {
        const reviews = window._cachedReviews || {};
        const revs = reviews[productId] || [];
        if (!revs.length) return 0;
        const sum = revs.reduce((s, r) => s + r.rating, 0);
        return sum / revs.length;
    }

    function getReviewCount(productId) {
        const reviews = window._cachedReviews || {};
        const revs = reviews[productId] || [];
        return revs.length;
    }

    // ============================================================
    //  brand ICON HELPER
    // ============================================================
    function getbrandIcon(brand) {
        const icons = {
            'phone': '📱',
            'tablet': '📋',
            'audio': '🎧',
            'laptop': '💻',
            'accessories': '🔌',
            'watch': '⌚',
            'camera': '📷',
            'gaming': '🎮',
            'tv': '📺',
            'headphones': '🎧',
            'speaker': '🔊',
            'charger': '🔋',
            'case': '🛡️',
            'screen': '🖥️',
            'uncategorized': '📦'
        };
        return icons[brand.toLowerCase()] || '📦';
    }

    // ============================================================
    //  HERO BACKGROUND ROTATOR
    // ============================================================
    function showHeroContent() {
        const skeleton = document.getElementById('heroSkeleton');
        const content = document.getElementById('heroContent');
        const background = document.getElementById('heroBackground');
        
        skeleton.style.display = 'none';
        content.style.display = 'block';
        background.classList.add('active');
        isHeroReady = true;
    }

    function startHeroRotation(images) {
        if (!images || images.length === 0) {
            showHeroContent();
            return;
        }
        
        heroImages = images;
        heroImageIndex = 0;
        
        const heroBg = document.getElementById('heroBackground');
        
        heroBg.style.backgroundImage = `url(${heroImages[0]})`;
        showHeroContent();
        
        if (heroImages.length > 1) {
            if (heroInterval) clearInterval(heroInterval);
            heroInterval = setInterval(() => {
                heroImageIndex = (heroImageIndex + 1) % heroImages.length;
                heroBg.style.opacity = '0';
                setTimeout(() => {
                    heroBg.style.backgroundImage = `url(${heroImages[heroImageIndex]})`;
                    heroBg.style.opacity = '1';
                }, 300);
            }, 4000);
        }
    }

    function stopHeroRotation() {
        if (heroInterval) {
            clearInterval(heroInterval);
            heroInterval = null;
        }
    }

    // ============================================================
    //  FETCH PRODUCTS FROM SUPABASE
    // ============================================================
    async function fetchAllProducts() {
        if (allProducts.length > 0) return allProducts;

        const client = getSupabaseClient();
        if (!client) return [];

        try {
            const { data, error } = await client
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            allProducts = data || [];
            return allProducts;
        } catch (err) {
            console.error('❌ Error fetching products:', err.message);
            return [];
        }
    }

    // ============================================================
    //  CART FUNCTIONS
    // ============================================================
    async function getCart() {
        try {
            return JSON.parse(localStorage.getItem('st_cart') || '[]');
        } catch (e) {
            return [];
        }
    }

    async function saveCart(cart) {
        const customerId = window.getCurrentCustomerId?.();
        const sessionId = localStorage.getItem('st_session_id') || 'session_' + Date.now();
        const client = getSupabaseClient();
        if (client) {
            try {
                if (customerId) {
                    await client.from('cart').delete().eq('customer_id', customerId);
                } else {
                    await client.from('cart').delete().eq('session_id', sessionId);
                }
                if (cart.length > 0) {
                    const rows = cart.map(item => ({
                        ...(customerId ? { customer_id: customerId } : { session_id: sessionId }),
                        product_id: item.product_id || item.id || '',
                        name: item.name || 'Unknown Product',
                        price: item.price || 0,
                        qty: item.qty || 1,
                        image: item.image || 'https://placehold.co/400x400'
                    }));
                    const validRows = rows.filter(row => row.product_id);
                    if (validRows.length > 0) {
                        await client.from('cart').insert(validRows);
                    }
                }
            } catch (err) {
                console.warn('Cart sync error:', err.message);
            }
        }

        if (window.STHeader) {
            window.STHeader.AppState.cart = cart;
            if (window.STHeader.updateCounts) {
                window.STHeader.updateCounts();
            }
        }
        renderCart();
    }

    async function addToCart(productId, qty = 1) {
        const products = await fetchAllProducts();
        const product = products.find(p => p.id === productId);
        if (!product) {
            showToast('❌ Product not found');
            return;
        }

        const cart = await getCart();
        const existing = cart.find(item => item.product_id === productId || item.id === productId);

        if (existing) {
            existing.qty = (existing.qty || 0) + qty;
        } else {
            cart.push({
                product_id: productId,
                id: productId,
                name: product.name,
                price: product.price || 0,
                qty: qty,
                image: product.image || 'https://placehold.co/400x400',
                variants: {},
                brand: product.brand || ''
            });
        }

        await saveCart(cart);
        showToast(`✅ ${product.name} added to cart!`);
    }

    // ============================================================
    //  RENDER CART (for modal)
    // ============================================================
    async function renderCart() {
        const cart = await getCart();
        const container = document.getElementById('cartItems');
        if (!container) return;

        if (!cart.length) {
            container.innerHTML = '<div class="text-center py-8 text-gray-500" data-translate="cart_empty">Cart empty</div>';
            document.getElementById('cartTotal').innerText = '0.00';
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
                        <strong>${item.name}</strong><br>
                        <small>FCFA ${price.toFixed(2)}</small>
                    </div>
                    <div>
                        <button class="cart-qty-dec px-2 bg-gray-200 rounded" data-index="${index}">-</button>
                        <span class="mx-2">${qty}</span>
                        <button class="cart-qty-inc px-2 bg-gray-200 rounded" data-index="${index}">+</button>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('cartTotal').innerText = total.toFixed(2);

        container.querySelectorAll('.cart-qty-dec').forEach(btn => {
            btn.addEventListener('click', () => updateQtyByIndex(parseInt(btn.dataset.index), -1));
        });
        container.querySelectorAll('.cart-qty-inc').forEach(btn => {
            btn.addEventListener('click', () => updateQtyByIndex(parseInt(btn.dataset.index), 1));
        });
    }

    async function updateQtyByIndex(index, delta) {
        const cart = await getCart();
        if (index < 0 || index >= cart.length) return;
        const item = cart[index];
        const newQ = (item.qty || 0) + delta;
        if (newQ <= 0) {
            cart.splice(index, 1);
        } else {
            item.qty = newQ;
        }
        await saveCart(cart);
    }

    window.clearCart = async function() {
        await saveCart([]);
        showToast('Cart cleared');
        await renderCart();
    };

    window.openModal = (id) => document.getElementById(id)?.classList.remove('hidden');
    window.closeModal = (id) => document.getElementById(id)?.classList.add('hidden');

    // ============================================================
    //  RENDER PRODUCT CARDS
    // ============================================================
    function renderProductCard(p) {
        const avgRating = getAverageRating(p.id);
        const reviewCount = getReviewCount(p.id);

        let badge = '';
        if (p.isHot) badge = '<span class="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full" data-translate="badge_hot">HOT</span>';
        else if (p.isNew) badge = '<span class="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full" data-translate="badge_new">NEW</span>';
        else if (p.isDeal) badge = '<span class="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full" data-translate="badge_deal">DEAL</span>';

        return `
            <div class="product-card" onclick="window.navigateWithUserInfo('/item/?product=${p.id}')">
                <div class="relative">
                    <img src="${p.image || 'https://placehold.co/400x400/6C3CE1/FFFFFF?text=Product'}" 
                         alt="${p.name}" 
                         loading="lazy"
                         onerror="this.src='https://placehold.co/400x400/6C3CE1/FFFFFF?text=Product'">
                    ${badge}
                </div>
                <div class="product-info">
                    <div class="product-name">${p.name || 'Unknown Product'}</div>
                    <div class="product-brand">${p.brand || ''}</div>
                    <div class="product-rating">
                        ${renderStars(avgRating)}
                        <span>(${reviewCount})</span>
                    </div>
                    <div class="product-actions">
                        <span class="product-price">FCFA ${(p.price || 0).toFixed(2)}</span>
                        <button class="btn-cart" onclick="event.stopPropagation(); addToCart('${p.id}')" data-translate="add_to_cart">
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // ============================================================
    //  INFINITE SCROLL - SETUP OBSERVER
    // ============================================================
    function setupInfiniteScroll() {
        // Remove old observer
        if (infiniteScrollObserver) {
            infiniteScrollObserver.disconnect();
            infiniteScrollObserver = null;
        }

        // Create or get sentinel
        let sentinel = document.getElementById('infiniteScrollSentinel');
        if (!sentinel) {
            sentinel = document.createElement('div');
            sentinel.id = 'infiniteScrollSentinel';
            sentinel.className = 'w-full h-20 flex items-center justify-center';
            sentinel.innerHTML = `
                <div class="flex items-center gap-3 text-gray-500">
                    <div class="loader-small" style="width:1.5rem;height:1.5rem;border:3px solid rgba(230,0,18,0.15);border-top-color:#e60012;border-radius:9999px;animation:spin 1s linear infinite;"></div>
                    <span data-translate="loading_more_products">Loading more products...</span>
                </div>
            `;
            // Insert after products grid
            const grid = document.getElementById('productsGrid');
            if (grid && grid.parentNode) {
                grid.parentNode.insertBefore(sentinel, grid.nextSibling);
            }
        }

        // Show loading indicator
        sentinel.style.display = 'flex';

        // Create observer
        infiniteScrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !isLoading && hasMoreProducts) {
                    loadbrandProducts(false);
                }
            });
        }, {
            rootMargin: '0px 0px 200px 0px',
            threshold: 0.1
        });

        infiniteScrollObserver.observe(sentinel);
    }

    function hideInfiniteScrollIndicator() {
        const sentinel = document.getElementById('infiniteScrollSentinel');
        if (sentinel) {
            sentinel.style.display = 'none';
        }
    }

    // ============================================================
    //  LOAD brand PRODUCTS (WITH INFINITE SCROLL)
    // ============================================================
    async function loadbrandProducts(reset = true) {
        if (isLoading) return;
        if (!reset && !hasMoreProducts) {
            hideInfiniteScrollIndicator();
            return;
        }

        isLoading = true;

        if (reset) {
            page = 1;
            hasMoreProducts = true;
            groupedItemsCache = [];
            document.getElementById('productsGrid').innerHTML = '';
            document.getElementById('noProducts').classList.add('hidden');
            showLoadingSkeletons();
            
            if (infiniteScrollObserver) {
                infiniteScrollObserver.disconnect();
                infiniteScrollObserver = null;
            }
            hideInfiniteScrollIndicator();
        }

        try {
             const brand = await getbrandFromUrl();
            const all = await fetchAllProducts();
           
            currentbrand = brand;

            // Update hero
            const brandTitle = document.getElementById('brandTitle');
            const brandSubtitle = document.getElementById('brandSubtitle');
            const brandIcon = document.getElementById('brandIcon');
            
            if (brand === 'all') {
                brandTitle.textContent = typeof translate === 'function' ? translate('all_brands') : 'All Brands';
                brandSubtitle.textContent = typeof translate === 'function' ? translate('explore_collection') : 'Explore our collection';
                brandTitle.setAttribute('data-translate', 'all_brands');
                brandSubtitle.setAttribute('data-translate', 'explore_collection');
                brandIcon.textContent = '🏷️';
            } else {
                const displayName = brand.charAt(0).toUpperCase() + brand.slice(1);
                brandTitle.textContent = displayName;
                brandSubtitle.textContent = `Discover our ${displayName} products`;
                brandTitle.removeAttribute('data-translate');
                brandSubtitle.removeAttribute('data-translate');
                brandIcon.textContent = getbrandIcon(brand);
            }
            document.title = `${brand === 'all' ? 'All Brands' : brand} · Sucess Technology`;

            // Filter products
            const normalizedBrand = normalizeBrand(brand);
            let filtered = normalizedBrand === 'all'
                ? all
                : all.filter(p => normalizeBrand(p.brand) === normalizedBrand);

            if (normalizedBrand !== 'all' && filtered.length === 0) {
                console.warn(`No products matched brand "${brand}". Available brands:`, [
                    ...new Set(all.map(product => product.brand).filter(Boolean))
                ]);
            }

            // Extract hero images
            const heroImageUrls = filtered
                .filter(p => p.image)
                .slice(0, 10)
                .map(p => p.image);
            
            startHeroRotation(heroImageUrls);

            if (filtered.length === 0) {
                document.getElementById('noProducts').classList.remove('hidden');
                isLoading = false;
                hasMoreProducts = false;
                hideInfiniteScrollIndicator();
                return;
            }

            // GROUP PRODUCTS BY brand (only on reset)
            if (reset) {
                const groupedProducts = {};
                filtered.forEach(product => {
                    const catKey = product.brand || 'Uncategorized';
                    if (!groupedProducts[catKey]) {
                        groupedProducts[catKey] = [];
                    }
                    groupedProducts[catKey].push(product);
                });

                groupedItemsCache = [];
                Object.keys(groupedProducts).sort().forEach(cat => {
                    groupedItemsCache.push({ type: 'header', brand: cat, count: groupedProducts[cat].length });
                    groupedProducts[cat].forEach(product => {
                        groupedItemsCache.push({ type: 'product', product: product });
                    });
                });
            }

            // Paginate
            const start = (page - 1) * perPage;
            const end = start + perPage;
            const paginatedItems = groupedItemsCache.slice(start, end);

            if (paginatedItems.length === 0) {
                hasMoreProducts = false;
                isLoading = false;
                hideInfiniteScrollIndicator();
                return;
            }

            // Render items
            const grid = document.getElementById('productsGrid');
            let html = '';
            
            paginatedItems.forEach(item => {
                if (item.type === 'header') {
                    html += `
                        <div class="col-span-2 md:col-span-3 lg:col-span-4 mt-8 mb-4">
                            <h2 class="text-2xl font-bold text-gray-800 border-b-2 border-primary pb-3 flex items-center gap-3">
                                <span class="text-3xl">${getbrandIcon(item.brand)}</span>
                                ${item.brand.charAt(0).toUpperCase() + item.brand.slice(1)}
                                <span class="text-sm font-normal text-gray-500 ml-2">(${item.count})</span>
                            </h2>
                        </div>
                    `;
                } else {
                    html += renderProductCard(item.product);
                }
            });

            if (reset) {
                grid.innerHTML = html;
            } else {
                grid.insertAdjacentHTML('beforeend', html);
            }

            // Update pagination state
            hasMoreProducts = end < groupedItemsCache.length;
            page++;

            // Setup infinite scroll if more products
            if (hasMoreProducts) {
                setupInfiniteScroll();
            } else {
                hideInfiniteScrollIndicator();
            }

            // Load related products
            await renderRelatedProducts(brand, all);
             translateUI();

        } catch (e) {
            console.error('Error loading brand products:', e);
            showToast('Error loading products');
            hideInfiniteScrollIndicator();
        } finally {
            isLoading = false;
        }
    }

    // ============================================================
    //  LOADING SKELETONS
    // ============================================================
    function showLoadingSkeletons() {
        const grid = document.getElementById('productsGrid');
        if (grid.children.length === 0) {
            grid.innerHTML = Array(8).fill(0).map(() => `
                <div class="skeleton-card">
                    <div class="skeleton-image"></div>
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text short"></div>
                    <div class="skeleton-text price"></div>
                </div>
            `).join('');
        }
    }

    // ============================================================
    //  RELATED PRODUCTS
    // ============================================================
    function appendRelatedProducts(items) {
        const grid = document.getElementById('relatedGrid');
        if (!grid) return;
        grid.insertAdjacentHTML('beforeend', items.map(p => `
            <div class="related-card" onclick="window.navigateWithUserInfo('/item/?product=${p.id}')">
                <img src="${p.image || 'https://placehold.co/200x200'}" 
                     alt="${p.name}" 
                     loading="lazy" 
                     onerror="this.src='https://placehold.co/200x200?text=No+Image'">
                <h4>${p.name || 'Unknown Product'}</h4>
                <p class="text-gray-400">${p.brand || ''}</p>
                <div class="price">FCFA ${(p.price || 0).toFixed(2)}</div>
            </div>
        `).join(''));
    }

    function updateRelatedLoadMore(visible) {
        const loadMore = document.getElementById('relatedLoadMore');
        if (!loadMore) return;
        loadMore.classList.toggle('hidden', !visible);
    }

    function loadMoreRelatedProducts() {
        if (!relatedProductsPool.length) {
            updateRelatedLoadMore(false);
            if (relatedObserver) relatedObserver.disconnect();
            return;
        }
        const nextBatch = relatedProductsPool.splice(0, RELATED_BATCH_SIZE);
        appendRelatedProducts(nextBatch);
        relatedLoadedCount += nextBatch.length;
        updateRelatedLoadMore(Boolean(relatedProductsPool.length));
    }

    function setupRelatedObserver() {
        const sentinel = document.getElementById('relatedLoadMore');
        if (!sentinel || !window.IntersectionObserver) return;
        if (relatedObserver) relatedObserver.disconnect();
        relatedObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    loadMoreRelatedProducts();
                }
            });
        }, {
            rootMargin: '0px 0px 200px 0px',
            threshold: 0.1
        });
        relatedObserver.observe(sentinel);
    }

    async function renderRelatedProducts(brand, allProducts) {
        const grid = document.getElementById('relatedGrid');
        if (!grid) return;

        let samebrand = [];
        let otherCategories = [];

        if (brand === 'all') {
            samebrand = [...allProducts];
            otherCategories = [];
        } else {
            const lowerbrand = brand.toLowerCase();
            samebrand = allProducts.filter(p => p.brand && p.brand.toLowerCase() === lowerbrand);
            otherCategories = allProducts.filter(p => p.brand && p.brand.toLowerCase() !== lowerbrand);
        }

        shuffleArray(samebrand);
        shuffleArray(otherCategories);

        const initialRelated = [];
        initialRelated.push(...samebrand.slice(0, RELATED_BATCH_SIZE));
        if (initialRelated.length < RELATED_BATCH_SIZE) {
            const needed = RELATED_BATCH_SIZE - initialRelated.length;
            initialRelated.push(...otherCategories.slice(0, needed));
        }

        const remainingSame = samebrand.slice(RELATED_BATCH_SIZE);
        const remainingOther = otherCategories.slice(initialRelated.length - (samebrand.slice(0, RELATED_BATCH_SIZE).length > 0 ? RELATED_BATCH_SIZE : RELATED_BATCH_SIZE - samebrand.slice(0, RELATED_BATCH_SIZE).length));
        relatedProductsPool = [...remainingSame, ...remainingOther];
        shuffleArray(relatedProductsPool);

        relatedLoadedCount = initialRelated.length;

        grid.innerHTML = '';
        appendRelatedProducts(initialRelated);
        updateRelatedLoadMore(Boolean(relatedProductsPool.length));
        setupRelatedObserver();
    }

    // ============================================================
    //  REVIEWS (load from localStorage)
    // ============================================================
    function loadReviews() {
        try {
            const saved = JSON.parse(localStorage.getItem('st_reviews') || '{}');
            window._cachedReviews = saved;
        } catch (e) {
            window._cachedReviews = {};
        }
    }

    // ============================================================
    //  INITIALIZE
    // ============================================================
    document.addEventListener('DOMContentLoaded', () => {
        loadReviews();
        loadbrandProducts(true);
        renderCart();
        

        setTimeout(async () => {
            if (window.STHeader) {
                const cart = await getCart();
                window.STHeader.AppState.cart = cart;
                if (window.STHeader.updateCounts) {
                    window.STHeader.updateCounts();
                }
            }
        }, 500);
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        stopHeroRotation();
        if (infiniteScrollObserver) {
            infiniteScrollObserver.disconnect();
            infiniteScrollObserver = null;
        }
    });

    // ============================================================
    //  EXPOSE GLOBALLY
    // ============================================================
    window.addToCart = addToCart;
    window.renderCart = renderCart;
    window.showToast = showToast;
    window.fetchAllProducts = fetchAllProducts;
    window.loadbrandProducts = loadbrandProducts;

    console.log('📄 brand page loaded with infinite scroll');

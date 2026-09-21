(function () {
    'use strict';

    /* ============================================================
       MODULE STATE  (reset by cleanup())
       ============================================================ */
    let currentProduct     = null;
    let currentProductId   = null;
    let currentVariants    = {};
    let currentGallery     = [];
    let isWished           = false;

    let relatedProductsPool = [];
    let relatedLoadedCount  = 0;
    const RELATED_BATCH_SIZE = 4;
    let relatedObserver     = null;
    let allProductsCache    = [];
    let isLoadingMore       = false;

    let _cachedReviews = {};

    // deals slider
    let slideInterval  = null;
    let currentPosition = 0;

    // header auth patch bookkeeping
    let _headerPatched = false;

    /* ============================================================
       TRANSLATION HELPER
       ============================================================ */
    function t(key, fallback) {
        if (window.Translations?.translate) {
            const r = window.Translations.translate(key);
            if (r && r !== key) return r;
        }
        return fallback || key;
    }

    /* ============================================================
       ELEMENT LOOKUP
       ============================================================ */
    function getEls() {
        return {
            root:               document.getElementById('productContent'),
            loadingState:       document.getElementById('loadingState'),
            notFoundState:      document.getElementById('notFoundState'),
            mainProductImage:   document.getElementById('mainProductImage'),
            thumbnailGallery:   document.getElementById('thumbnailGallery'),
            productBrand:       document.getElementById('productBrand'),
            productcategory:    document.getElementById('productcategory'),
            productName:        document.getElementById('productName'),
            productRating:      document.getElementById('productRating'),
            reviewCount:        document.getElementById('reviewCount'),
            reviewCountLabel:   document.getElementById('reviewCountLabel'),
            priceSection:       document.getElementById('priceSection'),
            dealInfo:           document.getElementById('dealInfo'),
            dealBadgeOverlay:   document.getElementById('dealBadgeOverlay'),
            productDescription: document.getElementById('productDescription'),
            specsGrid:          document.getElementById('specsGrid'),
            variantsSection:    document.getElementById('variantsSection'),
            stockDisplay:       document.getElementById('stockDisplay'),
            qtyInput:           document.getElementById('qtyInput'),
            addToCartBtn:       document.getElementById('addToCartBtn'),
            wishlistBtn:        document.getElementById('wishlistBtn'),
            shareBtn:           document.getElementById('shareBtn'),
            breadcrumbBrand:    document.getElementById('breadcrumbBrand'),
            breadcrumbCategory: document.getElementById('breadcrumbCategory'),
            breadcrumbName:     document.getElementById('breadcrumbName'),
            relatedGrid:        document.getElementById('relatedGrid'),
            relatedLoadMore:    document.getElementById('relatedLoadMore'),
            reviewsList:        document.getElementById('reviewsList'),
            reviewsToggleBtn:   document.getElementById('reviewsToggleBtn'),
            reviewsContent:     document.getElementById('reviewsContent'),
            reviewsToggleIcon:  document.getElementById('reviewsToggleIcon'),
            reviewForm:         document.getElementById('reviewForm'),
            reviewUserName:     document.getElementById('reviewUserName'),
            reviewRating:       document.getElementById('reviewRating'),
            reviewComment:      document.getElementById('reviewComment'),
            submitReviewBtn:    document.getElementById('submitReviewBtn'),
            dealsContainer:     document.getElementById('dealsContainer'),
        };
    }

    /* ============================================================
       TOAST
       ============================================================ */
    function showToast(message) {
        const existing = document.querySelector('.toast-msg');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = 'toast-msg show';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-20px)';
            toast.style.transition = 'all .3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    /* ============================================================
       STARS
       ============================================================ */
    function renderStars(rating) {
        const full = Math.floor(rating);
        let html = '';
        for (let i = 0; i < full; i++) html += '★';
        for (let i = full; i < 5; i++) html += '☆';
        return html;
    }

    /* ============================================================
       CART / WISHLIST
       ============================================================ */
    /* ============================================================
       CART (SECURED)
       ============================================================ */
    async function getCart() {
        const customerId = window.getCurrentCustomerId?.();
        const sessionId = localStorage.getItem('st_session_id') || 'session_' + Date.now();
        const client = getSupabaseClient();

        if (client) {
            try {
                // ✅ SECURE: Fetch cart via RPC
                const { data, error } = await client.rpc('get_user_cart', {
                    p_customer_id: customerId || null,
                    p_session_id: !customerId ? sessionId : null
                });
                
                if (!error && data) {
                    // Map DB columns back to the format expected by the app
                    const mappedCart = data.map(item => ({
                        id: item.id,
                        product_id: item.product_id,
                        name: item.name,
                        price: item.price,
                        qty: item.qty,
                        image: item.image,
                        variants: item.variants || {},
                        isDeal: item.is_deal,
                        originalPrice: item.original_price,
                        discount: item.discount,
                        brand: item.brand
                    }));
                    // Sync local storage to match DB
                    localStorage.setItem('st_cart', JSON.stringify(mappedCart));
                    return mappedCart;
                }
            } catch (err) {
                console.warn('⚠️ Cart fetch error, falling back to local:', err.message);
            }
        }
        
        // Fallback to local storage
        try { return JSON.parse(localStorage.getItem('st_cart') || '[]'); } 
        catch { return []; }
    }

    async function saveCart(cart) {
        const customerId = window.getCurrentCustomerId?.();
        const sessionId = localStorage.getItem('st_session_id') || 'session_' + Date.now();
        const client = getSupabaseClient();

        // Format cart items for the RPC payload
        const cartItemsPayload = cart.map(item => ({
            product_id: item.product_id || item.id || '',
            name: item.name || 'Unknown Product',
            price: item.price || 0,
            qty: item.qty || 1,
            image: item.image || 'https://placehold.co/400x400',
            variants: item.variants || {},
            is_deal: item.isDeal ?? false,
            original_price: item.originalPrice ?? null,
            discount: item.discount ?? null,
            brand: item.brand || null
        }));

        if (client) {
            try {
                // ✅ SECURE: Single RPC call replaces the entire delete + insert loop
                await client.rpc('sync_user_cart', {
                    p_customer_id: customerId || null,
                    p_session_id: !customerId ? sessionId : null,
                    p_cart_items: cartItemsPayload
                });
            } catch (err) {
                console.warn('⚠️ Cart sync error:', err.message);
            }
        }

        localStorage.setItem('st_cart', JSON.stringify(cart));
        if (window.STHeader) {
            window.STHeader.AppState.cart = cart;
            window.STHeader.updateCounts?.();
        }
        await renderCart();
    }

    window.clearCart = async function () {
        const customerId = window.getCurrentCustomerId?.();
        const sessionId = localStorage.getItem('st_session_id') || 'session_' + Date.now();
        const client = getSupabaseClient();
        
        if (client) {
            try {
                // ✅ SECURE: Clear cart by passing an empty array to the sync RPC
                await client.rpc('sync_user_cart', {
                    p_customer_id: customerId || null,
                    p_session_id: !customerId ? sessionId : null,
                    p_cart_items: [] 
                });
            } catch (err) { 
                console.warn('Failed to clear cart from DB:', err.message); 
            }
        }
        
        await saveCart([]);
        showToast(t('cart_cleared', 'Cart cleared'));
        await renderCart();
    };
    /* ============================================================
       QUANTITY & IMAGES
       ============================================================ */
    window.incrementQty = function (max) {
        const input = document.getElementById('qtyInput');
        if (!input) return;
        let v = parseInt(input.value) || 1;
        if (v < max) input.value = v + 1;
    };
    window.decrementQty = function () {
        const input = document.getElementById('qtyInput');
        if (!input) return;
        let v = parseInt(input.value) || 1;
        if (v > 1) input.value = v - 1;
    };

    window.switchImage = function (src, index) {
        const main = document.getElementById('mainProductImage');
        if (main) main.src = src;
        document.querySelectorAll('.thumb-gallery img').forEach((el, i) => {
            el.classList.toggle('active', i === index);
        });
    };

    /* ============================================================
       PRODUCT FETCH (SECURED & OPTIMIZED)
       ============================================================ */
    async function fetchProductDetails(productId) {
        const client = getSupabaseClient();
        if (!client) return null;
        try {
            // ✅ SECURE: Single RPC call gets details, deal info, and increments views
            const { data, error } = await client.rpc('get_product_details_and_increment_views', { 
                p_product_id: productId 
            });
            
            if (error) { 
                console.error('Error fetching product:', error.message); 
                return null; 
            }
            if (!data || data.length === 0) return null;

            const product = data[0];

            // Parse JSON strings if necessary
            if (typeof product.variants === 'string') { 
                try { product.variants = JSON.parse(product.variants); } catch { product.variants = []; } 
            }
            if (typeof product.images === 'string') { 
                try { product.images = JSON.parse(product.images); } catch { product.images = [product.image]; } 
            }
            if (!Array.isArray(product.images)) product.images = [product.image];
            
            // Map deal info from RPC response
            if (product.is_deal) {
                product.isDeal = true;
                product.discount = product.deal_discount;
                product.originalPrice = product.price;
            } else {
                product.isDeal = false;
                product.discount = 0;
            }
            
            return product;
        } catch (err) { 
            console.error('Error:', err.message); 
            return null; 
        }
    }

    async function fetchAllDeals() {
        const client = getSupabaseClient();
        if (!client) return [];
        try {
            // ✅ SECURE: Use RPC
            const { data, error } = await client.rpc('get_active_deals');
            if (error) throw error;
            
            return (data || []).map(item => ({
                ...item,
                dealDiscount: item.deal_discount,
                isDeal: true,
                originalPrice: item.original_price,
                discountedPrice: item.discounted_price,
                price: item.price
            }));
        } catch (err) { 
            console.error('❌ Error fetching deals:', err.message); 
            return []; 
        }
    }

    async function getAllProducts() {
        if (allProductsCache.length > 0) return allProductsCache;
        const client = getSupabaseClient();
        if (!client) return [];
        try {
            // ✅ SECURE: Use RPC
            const { data, error } = await client.rpc('get_all_products');
            if (error) { 
                console.error('Error fetching products:', error.message); 
                return []; 
            }
            allProductsCache = data || [];
            return allProductsCache;
        } catch (err) { 
            console.error('Error:', err.message); 
            return []; 
        }
    }

    /* ============================================================
       DEALS SLIDER
       ============================================================ */
    function renderDealsSlider(deals, containerId = 'dealsContainer') {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (slideInterval) { clearInterval(slideInterval); slideInterval = null; }

        if (!deals?.length) {
            container.innerHTML = `<div style="text-align:center;padding:20px;color:#94A3B8;"><p style="font-size:14px;" data-translate="no_deals_available">No deals available right now</p></div>`;
            return;
        }

        let html = `<div class="deals-slider-wrapper"><div class="deals-slider-track" id="dealsSliderTrack">`;
        const doubled = [...deals, ...deals, ...deals];
        doubled.forEach((deal, index) => {
            const image = deal.image || deal.images?.[0] || 'https://placehold.co/400x400/6C3CE1/FFFFFF?text=Deal';
            const discount = deal.dealDiscount || 0;
            const originalPrice = deal.originalPrice || deal.price || 0;
            const currentPrice = deal.discountedPrice || originalPrice * (1 - discount / 100);
            html += `
                <div class="deal-slide" data-index="${index}">
                    <div class="deal-card" onclick="window.navigateWithUserInfo('/item/?product=${deal.id}')">
                        <div class="deal-card-image">
                            <img src="${image}" alt="${deal.name || 'Product'}" loading="lazy"
                                 onerror="this.src='https://placehold.co/400x400/6C3CE1/FFFFFF?text=Deal'">
                            <div class="deal-discount-badge">-${discount}%</div>
                        </div>
                        <div class="deal-card-body">
                            <h3 class="deal-card-title">${deal.name || 'Unknown Product'}</h3>
                            ${deal.brand ? `<p class="deal-card-brand">${deal.brand}</p>` : ''}
                            <div class="deal-card-price">
                                <span class="deal-current-price">FCFA ${currentPrice.toFixed(2)}</span>
                                <span class="deal-original-price">FCFA ${originalPrice.toFixed(2)}</span>
                            </div>
                            <div class="deal-card-actions">
                                <button class="deal-btn-cart" onclick="window.navigateWithUserInfo('/item/?product=${deal.id}')" data-translate="view_details">
                                    <i class="fas fa-shopping-bag"></i> VIEW DETAILS
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
        });
        html += `</div></div>`;
        container.innerHTML = html;
        setTimeout(() => startSlider(deals.length), 100);
    }

    function startSlider(totalItems) {
        const track = document.getElementById('dealsSliderTrack');
        if (!track) return;
        if (slideInterval) { clearInterval(slideInterval); slideInterval = null; }

        const slideWidth = track.querySelector('.deal-slide')?.offsetWidth || 220;
        const itemWidth  = slideWidth + 20;
        currentPosition = 0;
        track.style.transform = 'translateX(0)';

        slideInterval = setInterval(() => {
            currentPosition -= itemWidth;
            track.style.transform = `translateX(${currentPosition}px)`;
            track.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            const totalWidth = totalItems * itemWidth;
            if (Math.abs(currentPosition) >= totalWidth) {
                setTimeout(() => {
                    track.style.transition = 'none';
                    currentPosition = 0;
                    track.style.transform = 'translateX(0)';
                    track.offsetHeight;
                    setTimeout(() => { track.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)'; }, 50);
                }, 800);
            }
        }, 3000);

        const wrapper = track.closest('.deals-slider-wrapper');
        if (wrapper) {
            wrapper.addEventListener('mouseenter', () => { clearInterval(slideInterval); slideInterval = null; });
            wrapper.addEventListener('mouseleave', () => { if (!slideInterval) startSlider(totalItems); });
        }
    }

    /* ============================================================
       REVIEWS
       ============================================================ */
    async function loadReviewsFromSupabase() {
        try {
            const client = getSupabaseClient();
            if (!client) { loadReviewsFromLocalStorage(); return; }
            const { data, error } = await client.from('reviews').select('*')
                .order('created_at', { ascending: false });
            if (error) { console.error('❌ Error loading reviews:', error); loadReviewsFromLocalStorage(); return; }
            const reviews = {};
            data.forEach(r => {
                if (!reviews[r.product_id]) reviews[r.product_id] = [];
                reviews[r.product_id].push({
                    id: r.id, user: r.user_name, rating: r.rating,
                    comment: r.comment,
                    date: r.date || new Date(r.created_at).toLocaleDateString()
                });
            });
            _cachedReviews = reviews;
            localStorage.setItem('st_reviews', JSON.stringify(reviews));
        } catch (err) { console.error('❌ Error loading reviews:', err); loadReviewsFromLocalStorage(); }
    }

    function loadReviewsFromLocalStorage() {
        try { _cachedReviews = JSON.parse(localStorage.getItem('st_reviews') || '{}'); }
        catch { _cachedReviews = {}; }
    }

    function getProductReviews(productId) { return _cachedReviews[productId] || []; }
    function getAverageRating(productId) {
        const revs = getProductReviews(productId);
        if (!revs.length) return 0;
        return revs.reduce((s, r) => s + r.rating, 0) / revs.length;
    }
    function getReviewCount(productId) { return getProductReviews(productId).length; }

    function renderReviews(productId) {
        const reviews = getProductReviews(productId);
        const list = document.getElementById('reviewsList');
        if (!list) return;
        if (!reviews.length) {
            list.innerHTML = '<p class="text-gray-400 text-sm" data-translate="no_reviews_yet">No reviews yet. Be the first to review!</p>';
            return;
        }
        list.innerHTML = reviews.map(r => `
            <div class="bg-gray-50 rounded-xl p-4">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-semibold">${r.user || 'Anonymous'}</p>
                        <div class="star-rating text-sm">${renderStars(r.rating)}</div>
                    </div>
                    <span class="text-xs text-gray-400">${r.date || ''}</span>
                </div>
                <p class="text-sm text-gray-700 mt-2">${r.comment}</p>
            </div>
        `).join('');
    }

    function updateReviewUI(productId) {
        const avg = getAverageRating(productId);
        const count = getReviewCount(productId);
        const ratingEl = document.getElementById('productRating');
        const countEl  = document.getElementById('reviewCount');
        const labelEl  = document.getElementById('reviewCountLabel');
        if (ratingEl) ratingEl.innerHTML = renderStars(avg);
        if (countEl)  countEl.textContent  = `${count} ${t('reviews', 'Reviews')}`;
        if (labelEl)  labelEl.textContent  = count;
    }

    async function handleSubmitReview(productId) {
        const nameInput    = document.getElementById('reviewUserName');
        const ratingSelect = document.getElementById('reviewRating');
        const commentInput = document.getElementById('reviewComment');
        const submitBtn    = document.getElementById('submitReviewBtn');
        if (!nameInput || !ratingSelect || !commentInput || !submitBtn) return;

        const userName = nameInput.value.trim();
        if (!userName) return showToast(t('please_enter_name', 'Please enter your name'));
        const rating  = parseInt(ratingSelect.value);
        const comment = commentInput.value.trim();
        if (!comment) return showToast(t('please_write_review', 'Please write a review'));

        submitBtn.disabled = true;
        submitBtn.textContent = t('submitting', 'Submitting...');

        try {
            const client = getSupabaseClient();
            const reviewData = {
                id: Date.now(), product_id: productId, user_name: userName,
                rating, comment,
                date: new Date().toLocaleDateString(),
                created_at: new Date().toISOString()
            };
            if (client) {
                const { error } = await client.from('reviews').insert([reviewData]).select();
                if (error) console.warn('Supabase review error:', error);
            }
            saveReviewLocally(productId, userName, rating, comment);
            commentInput.value = '';
            showToast(t('thank_you_review', 'Thank you for your review! 🎉'));
        } catch (e) {
            console.error('Review error:', e);
            saveReviewLocally(productId, userName, rating, comment);
            showToast(t('error_saving_review', 'Error saving review. Saved locally.'));
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = t('submit_review', 'Submit Review');
        }
    }

    function saveReviewLocally(productId, userName, rating, comment) {
        if (!_cachedReviews[productId]) _cachedReviews[productId] = [];
        _cachedReviews[productId].push({
            id: Date.now(), user: userName, rating, comment,
            date: new Date().toLocaleDateString()
        });
        localStorage.setItem('st_reviews', JSON.stringify(_cachedReviews));
        renderReviews(productId);
        updateReviewUI(productId);
    }

    /* ============================================================
       ADD TO CART
       ============================================================ */
    async function handleAddToCart(product) {
        const btn = document.getElementById('addToCartBtn');
        const qtyInput = document.getElementById('qtyInput');
        if (!btn || !qtyInput) return;
        if (btn.dataset.loading === 'true') return;

        const qty = parseInt(qtyInput.value) || 1;
        btn.dataset.loading = 'true';
        btn.disabled = true;
        btn.innerHTML = `<span class="add-to-cart-content"><span class="add-to-cart-spinner"></span> ${t('adding', 'Adding...')}</span>`;

        try {
            if (product.stock !== undefined && qty > product.stock) {
                showToast(`⚠️ ${t('only_items_available', 'Only ')}${product.stock} ${t('items_available', 'items available')}`);
                return;
            }
            const cart = await getCart();
            const variants = Object.keys(currentVariants).length > 0 ? { ...currentVariants } : {};
            const variantsJson = JSON.stringify(variants);

            const existingIndex = cart.findIndex(item =>
                (item.product_id === product.id || item.id === product.id) &&
                JSON.stringify(item.variants || {}) === variantsJson
            );

            if (existingIndex !== -1) {
                cart[existingIndex].qty = (cart[existingIndex].qty || 0) + qty;
            } else {
                // ✅ Use the already fetched deal info from the product object
                const dealDiscount = product.isDeal ? (product.discount || 0) : 0;
                
                cart.push({
                    product_id: product.id, id: product.id,
                    name: product.name,
                    price: dealDiscount > 0 ? product.price * (1 - dealDiscount / 100) : product.price,
                    qty, image: product.image || 'https://placehold.co/400x400',
                    variants,
                    isDeal: dealDiscount > 0,
                    originalPrice: dealDiscount > 0 ? product.price : null,
                    discount: dealDiscount > 0 ? dealDiscount : null,
                    brand: product.brand || ''
                });
            }
            await saveCart(cart);
            showToast('✅ ' + t('added_to_cart', 'Added to cart!'));
        } finally {
            btn.dataset.loading = 'false';
            btn.disabled = false;
            btn.innerHTML = `<span class="add-to-cart-content"><i class="fas fa-shopping-cart"></i> ${t('add_to_cart', 'Add to Cart')}</span>`;
        }
    }

    async function handleToggleWishlist(productId) {
        try {
            let wish = await getWishlist();
            if (wish.includes(productId)) {
                wish = wish.filter(id => id !== productId);
                isWished = false;
                showToast('❤️ ' + t('removed_from_wishlist', 'Removed from wishlist'));
            } else {
                wish.push(productId);
                isWished = true;
                showToast('❤️ ' + t('added_to_wishlist', 'Added to wishlist!'));
            }
            await saveWishlist(wish);
            updateWishlistButton();
        } catch (e) {
            console.error('Wishlist error:', e);
            showToast(t('wishlist_error', 'Error updating wishlist'));
        }
    }

    function updateWishlistButton() {
        const btn = document.getElementById('wishlistBtn');
        if (!btn) return;
        if (isWished) {
            btn.innerHTML = `<i class="fas fa-heart text-primary"></i> ${t('in_wishlist', 'In Wishlist')}`;
            btn.classList.add('border-primary', 'text-primary');
        } else {
            btn.innerHTML = `<i class="far fa-heart"></i> ${t('wishlist', 'Wishlist')}`;
            btn.classList.remove('border-primary', 'text-primary');
        }
    }

    async function handleShare(product) {
        const url = `${window.location.origin}/api/item?product=${product.id}`;
        if (navigator.share) {
            try { await navigator.share({ title: product.name, url }); } catch {}
        } else {
            try { await navigator.clipboard.writeText(url); showToast(t('link_copied', 'Link copied to clipboard!')); }
            catch { showToast('Share: ' + url); }
        }
    }

    /* ============================================================
       RELATED PRODUCTS
       ============================================================ */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function appendRelatedProducts(items) {
        const grid = document.getElementById('relatedGrid');
        if (!grid) return;
        grid.insertAdjacentHTML('beforeend', items.map(p => `
            <div class="related-card" onclick="window.navigateWithUserInfo('/item/?product=${p.id}')">
                <img src="${p.image || 'https://placehold.co/200x200'}" alt="${p.name}" loading="lazy"
                     onerror="this.src='https://placehold.co/200x200?text=No+Image'">
                <h4>${p.name}</h4>
                <p class="text-xs text-gray-400">${p.brand || ''}</p>
                <div class="price">FCFA ${(p.price || 0).toFixed(2)}</div>
            </div>
        `).join(''));
    }

    function showRelatedSkeletonLoader() {
        const loadMore = document.getElementById('relatedLoadMore');
        if (!loadMore) return;
        loadMore.classList.remove('hidden');
        loadMore.innerHTML = `
            <div class="loader-skeleton">
                <div class="skeleton-cards">
                    ${Array(4).fill(0).map(() => `
                        <div class="skeleton-card-mini">
                            <div class="skeleton-img-mini"><div class="shimmer"></div></div>
                            <div class="skeleton-line w-75"></div>
                            <div class="skeleton-line w-50"></div>
                            <div class="skeleton-line w-50" style="height:1rem;"></div>
                        </div>
                    `).join('')}
                </div>
                <div class="loading-text">
                    <div class="mini-spinner"></div>
                    <span data-translate="loading_more_products">Loading more products...</span>
                </div>
            </div>
        `;
    }

    function updateRelatedLoadMore(visible) {
        const loadMore = document.getElementById('relatedLoadMore');
        if (!loadMore) return;
        if (visible) showRelatedSkeletonLoader();
        else loadMore.classList.add('hidden');
    }

    function loadMoreRelatedProducts() {
        if (isLoadingMore) return;
        if (!relatedProductsPool.length) {
            updateRelatedLoadMore(false);
            if (relatedObserver) relatedObserver.disconnect();
            return;
        }
        isLoadingMore = true;
        showRelatedSkeletonLoader();
        setTimeout(() => {
            const nextBatch = relatedProductsPool.splice(0, RELATED_BATCH_SIZE);
            const loadMore = document.getElementById('relatedLoadMore');
            if (loadMore) loadMore.classList.add('hidden');
            appendRelatedProducts(nextBatch);
            relatedLoadedCount += nextBatch.length;
            isLoadingMore = false;
            updateRelatedLoadMore(Boolean(relatedProductsPool.length));
            setTimeout(setupRelatedObserver, 100);
        }, 400);
    }

    function setupRelatedObserver() {
        const sentinel = document.getElementById('relatedLoadMore');
        if (!sentinel || !window.IntersectionObserver) return;
        if (relatedObserver) relatedObserver.disconnect();
        relatedObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !isLoadingMore) loadMoreRelatedProducts();
            });
        }, { rootMargin: '0px 0px 200px 0px', threshold: 0.1 });
        relatedObserver.observe(sentinel);
    }

    async function renderRelatedProducts(product) {
        const products = await getAllProducts();
        const candidates = products.filter(p => p.id !== product.id);
        const relatedMatch = candidates.filter(p => p.category === product.category || p.brand === product.brand);
        const fallback = candidates.filter(p => !relatedMatch.includes(p));

        const initialRelated = [...relatedMatch.slice(0, RELATED_BATCH_SIZE)];
        if (initialRelated.length < RELATED_BATCH_SIZE) {
            initialRelated.push(...shuffleArray([...fallback]).slice(0, RELATED_BATCH_SIZE - initialRelated.length));
        }
        const usedIds = new Set(initialRelated.map(p => p.id));
        relatedProductsPool = shuffleArray(candidates.filter(p => !usedIds.has(p.id)));
        relatedLoadedCount = initialRelated.length;

        const grid = document.getElementById('relatedGrid');
        if (!grid) return;
        grid.innerHTML = '';
        appendRelatedProducts(initialRelated);
        updateRelatedLoadMore(Boolean(relatedProductsPool.length));
        setTimeout(setupRelatedObserver, 100);
    }

    /* ============================================================
       RENDER PRODUCT
       ============================================================ */
    async function renderProduct(product) {
        const els = getEls();
        if (!els.root) return;

        currentProduct = product;
        currentProductId = product.id;
        document.title = `${product.name} · Sucess Technology`;

        if (product.brand) {
            els.breadcrumbBrand.textContent = product.brand;
            els.breadcrumbBrand.href = `/brand/?brand=${encodeURIComponent(product.brand)}`;
            els.breadcrumbBrand.style.display = 'inline';
        } else els.breadcrumbBrand.style.display = 'none';

        if (product.category) {
            els.breadcrumbCategory.textContent = product.category;
            els.breadcrumbCategory.href = `/category/?category=${encodeURIComponent(product.category)}`;
            els.breadcrumbCategory.style.display = 'inline';
        } else els.breadcrumbCategory.style.display = 'none';

        els.breadcrumbName.textContent = product.name;

        els.productBrand.textContent   = product.brand    || 'all';
        els.productcategory.textContent = product.category || 'all';
        els.productName.textContent    = product.name;

        loadReviewsFromLocalStorage();
        const avg = getAverageRating(product.id);
        const count = getReviewCount(product.id);
        els.productRating.innerHTML = renderStars(avg);
        els.reviewCount.textContent = `${count} ${t('reviews', 'Reviews')}`;
        els.reviewCountLabel.textContent = count;

        let allImages = [product.image];
        if (product.images && Array.isArray(product.images)) {
            const extra = product.images.filter(img => img !== product.image);
            allImages = [...allImages, ...extra];
        }
        currentGallery = allImages;

        const mainImg = els.mainProductImage;
        mainImg.src = product.image || 'https://placehold.co/600x400';
        mainImg.alt = product.name;
        mainImg.onerror = () => { mainImg.src = 'https://placehold.co/600x400?text=No+Image'; };

        els.thumbnailGallery.innerHTML = allImages.map((img, i) =>
            `<img src="${img}" alt="View ${i+1}" class="${i === 0 ? 'active' : ''}"
                  onclick="switchImage('${img}', ${i})"
                  onerror="this.src='https://placehold.co/70x70?text=No+Image'">`
        ).join('');

        mainImg.onclick = () => {
            if (typeof zoomImage === 'function') zoomImage(mainImg.src, product.name, allImages, 0);
        };

        const originalPrice = product.price || 0;
        const hasDeal = product.isDeal || false;
        const discount = product.discount || 0;
        const discountedPrice = hasDeal ? originalPrice * (1 - discount / 100) : originalPrice;

        if (hasDeal && discount > 0) {
            els.priceSection.innerHTML = `
                <div class="flex items-center gap-3 mb-2">
                    <span class="text-2xl text-gray-400 line-through">FCFA ${originalPrice.toFixed(2)}</span>
                    <span class="bg-primary text-white px-3 py-1 rounded-full text-sm font-bold">${t('save', 'SAVE')} ${discount}%</span>
                </div>
                <div class="text-5xl font-bold text-primary">FCFA ${discountedPrice.toFixed(2)}</div>
            `;
            els.dealBadgeOverlay.classList.remove('hidden');
            els.dealBadgeOverlay.textContent = `-${discount}% ${t('off', 'OFF')}`;
            els.dealInfo.classList.remove('hidden');
            els.dealInfo.querySelector('p').textContent = `🔥 ${t('deal_of_day_text', 'Deal of the Day')} - ${discount}% ${t('off', 'OFF')}!`;
        } else {
            els.priceSection.innerHTML = `<div class="text-4xl font-light text-gray-900">FCFA ${originalPrice.toFixed(2)}</div>`;
            els.dealBadgeOverlay.classList.add('hidden');
            els.dealInfo.classList.add('hidden');
        }

        els.productDescription.textContent = product.description || t('no_description', 'No description available.');

        const specItems = [];
        if (product.cpu)  specItems.push({ label: t('processor', 'Processor'), value: product.cpu });
        if (product.os)   specItems.push({ label: t('operating_system', 'Operating System'), value: product.os });
        if (product.specs) specItems.push({ label: t('specifications', 'Specifications'), value: product.specs });
        if (product.stock !== undefined) {
            const stockText  = product.stock > 0 ? `${t('in_stock', 'In Stock')} (${product.stock})` : t('out_of_stock', 'Out of Stock');
            const stockColor = product.stock > 0 ? 'text-green-600' : 'text-red-600';
            specItems.push({ label: t('stock_status', 'Stock Status'), value: `<span class="${stockColor} font-semibold">${stockText}</span>` });
        }
        
        // Display View Count
        if (product.view !== undefined) {
            specItems.push({ label: t('views', 'Views'), value: `<span class="text-blue-600 font-semibold">${product.view}</span>` });
        }

        if (specItems.length === 0) {
            els.specsGrid.innerHTML = '<p class="text-sm text-gray-400 col-span-2" data-translate="no_specs">No specifications available.</p>';
        } else {
            els.specsGrid.innerHTML = specItems.map(i =>
                `<div><p class="text-xs text-gray-500">${i.label}</p><p class="font-semibold text-sm">${i.value}</p></div>`
            ).join('');
        }

        /* --- variants --- */
        currentVariants = {};
        if (product.variants && product.variants.length > 0) {
            els.variantsSection.innerHTML = product.variants.map(v => `
                <div>
                    <label class="text-sm font-medium text-gray-700 block mb-2">${v.type}:</label>
                    <div class="flex flex-wrap gap-2" data-variant-type="${v.type}">
                        ${v.values.map(val => `
                            <button type="button" class="variant-option px-4 py-2 border border-gray-300 rounded-full text-sm transition-colors"
                                    data-variant-value="${val}">${val}</button>
                        `).join('')}
                    </div>
                </div>
            `).join('');

            els.variantsSection.querySelectorAll('.variant-option').forEach(btn => {
                btn.addEventListener('click', function () {
                    const container = this.closest('div[data-variant-type]');
                    const type = container.dataset.variantType;
                    container.querySelectorAll('.variant-option').forEach(b => b.classList.remove('selected'));
                    this.classList.add('selected');
                    currentVariants[type] = this.dataset.variantValue;
                });
            });

            els.variantsSection.querySelectorAll('div[data-variant-type]').forEach(container => {
                const first = container.querySelector('.variant-option');
                if (first) {
                    first.classList.add('selected');
                    currentVariants[container.dataset.variantType] = first.dataset.variantValue;
                }
            });
            els.variantsSection.classList.remove('hidden');
        } else {
            els.variantsSection.innerHTML = '';
            els.variantsSection.classList.add('hidden');
        }

        if (product.stock !== undefined) {
            els.stockDisplay.textContent = product.stock > 0 ? `${product.stock} ${t('available', 'available')}` : t('out_of_stock', 'Out of stock');
            els.stockDisplay.className = `text-xs ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`;
        } else els.stockDisplay.textContent = '';

        const wishlist = await getWishlist();
        isWished = wishlist.includes(product.id);
        updateWishlistButton();

        renderReviews(product.id);
        await renderRelatedProducts(product);

        const deals = await fetchAllDeals();
        renderDealsSlider(deals, 'dealsContainer');

        els.loadingState.classList.add('hidden');
        els.root.classList.remove('hidden');

        els.addToCartBtn.onclick = () => handleAddToCart(product);
        els.wishlistBtn.onclick  = () => handleToggleWishlist(product.id);
        els.shareBtn.onclick     = () => handleShare(product);

        if (els.submitReviewBtn) {
            els.submitReviewBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSubmitReview(product.id);
            };
        }
        if (els.reviewForm) {
            els.reviewForm.onsubmit = (e) => { e.preventDefault(); handleSubmitReview(product.id); };
        }

        const customerName = window.STHeader?.AppState?.user?.name
                          || window.STHeader?.AppState?.user?.full_name
                          || window.STHeader?.AppState?.user?.email || '';
        if (els.reviewUserName && customerName) {
            els.reviewUserName.value = customerName;
            els.reviewUserName.readOnly = true;
        }

        const qtyInput = els.qtyInput;
        if (qtyInput) {
            qtyInput.max = product.stock || 99;
            qtyInput.onchange = () => {
                const v = parseInt(qtyInput.value) || 1;
                if (v < 1) qtyInput.value = 1;
                if (product.stock && v > product.stock) qtyInput.value = product.stock;
            };
        }

        // sync header counts
        if (window.STHeader) {
            const cart = await getCart();
            window.STHeader.AppState.cart = cart;
            window.STHeader.AppState.wishlist = wishlist;
            window.STHeader.updateCounts?.();
        }

        if (typeof translateUI === 'function') translateUI();
    }

    /* ============================================================
       LOAD PRODUCT
       ============================================================ */
    async function loadProduct() {
        const params = new URLSearchParams(location.search);
        const id = params.get('product') || params.get('id');

        const loading  = document.getElementById('loadingState');
        const notFound = document.getElementById('notFoundState');

        if (!id) {
            loading?.classList.add('hidden');
            notFound?.classList.remove('hidden');
            return;
        }

        try {
            let product = await fetchProductDetails(id);
            if (!product) {
                const all = await getAllProducts();
                const norm = String(id).trim().toLowerCase();
                product = all.find(p =>
                    String(p.id).toLowerCase() === norm ||
                    p.name?.toLowerCase().includes(norm)
                );
            }
            if (!product) {
                loading?.classList.add('hidden');
                notFound?.classList.remove('hidden');
                return;
            }
            await renderProduct(product);
        } catch (e) {
            console.error('Load product error:', e);
            loading?.classList.add('hidden');
            notFound?.classList.remove('hidden');
        }
    }

    /* ============================================================
       REVIEW DROPDOWN
       ============================================================ */
    function initReviewDropdown() {
        const toggleBtn = document.getElementById('reviewsToggleBtn');
        const content   = document.getElementById('reviewsContent');
        const icon      = document.getElementById('reviewsToggleIcon');
        if (!toggleBtn || !content || !icon) return;

        toggleBtn.onclick = function () {
            content.classList.toggle('hidden');
            const expanded = !content.classList.contains('hidden');
            toggleBtn.setAttribute('aria-expanded', expanded);
            icon.style.transform = expanded ? 'rotate(180deg)' : 'rotate(0deg)';
        };
    }

    /* ============================================================
       CART MODAL
       ============================================================ */
    async function renderCart() {
        const cart = await getCart();
        const container = document.getElementById('cartItems');
        if (!container) return;

        if (!cart.length) {
            container.innerHTML = '<div class="text-center py-8 text-gray-500" data-translate="cart_empty">Cart empty</div>';
            const tot = document.getElementById('cartTotal');
            if (tot) tot.innerText = '0.00';
            return;
        }

        let total = 0;
        container.innerHTML = cart.map((item, index) => {
            const price = item.price || 0;
            const qty = item.qty || 0;
            total += price * qty;
            const variantText = item.variants && Object.keys(item.variants).length
                ? Object.entries(item.variants).map(([k, v]) => `${k}: ${v}`).join(', ')
                : '';
            return `
                <div class="cart-item flex justify-between items-center mb-4 border-b pb-2">
                    <div>
                        <strong>${item.name}</strong><br>
                        <small>FCFA ${price.toFixed(2)}</small>
                        ${variantText ? `<div class="text-xs text-gray-500">${variantText}</div>` : ''}
                    </div>
                    <div>
                        <button class="cart-qty-dec px-2 bg-gray-200 rounded" data-index="${index}">-</button>
                        <span class="mx-2">${qty}</span>
                        <button class="cart-qty-inc px-2 bg-gray-200 rounded" data-index="${index}">+</button>
                    </div>
                </div>`;
        }).join('');

        const totEl = document.getElementById('cartTotal');
        if (totEl) totEl.innerText = total.toFixed(2);

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


    window.openCheckout = function () {
        const cart = JSON.parse(localStorage.getItem('st_cart') || '[]');
        if (!cart.length) return showToast(t('cart_empty', 'Cart empty'));
        window.closeModal?.('cartModal');
        showToast('🛒 ' + t('checkout_coming', 'Checkout coming soon!'));
    };

    /* ============================================================
       CLEANUP + INIT
       ============================================================ */
    function cleanup() {
        if (slideInterval)   { clearInterval(slideInterval); slideInterval = null; }
        if (relatedObserver) { relatedObserver.disconnect(); relatedObserver = null; }

        if (_headerPatched && window.STHeader?._productOriginalUpdate) {
            window.STHeader.updateAuthUI = window.STHeader._productOriginalUpdate;
            delete window.STHeader._productOriginalUpdate;
        }
        _headerPatched = false;

        currentProduct = null;
        currentProductId = null;
        currentVariants = {};
        currentGallery = [];
        isWished = false;
        relatedProductsPool = [];
        relatedLoadedCount = 0;
        allProductsCache = [];
        isLoadingMore = false;
        _cachedReviews = {};
    }

    async function syncHeaderCounts() {
        if (!window.STHeader) return;
        try {
            const [cart, wishlist] = await Promise.all([getCart(), getWishlist()]);
            window.STHeader.AppState.cart = cart;
            window.STHeader.AppState.wishlist = wishlist;
            window.STHeader.updateCounts?.();
        } catch (err) { console.warn('syncHeaderCounts failed:', err); }
    }

    async function init() {
        const els = getEls();
        if (!els.root) return;

        cleanup();
        console.log('📄 Product page: init');

        loadReviewsFromLocalStorage();
        renderCart();
        initReviewDropdown();

        await loadReviewsFromSupabase();
        await loadProduct();
        await syncHeaderCounts();

        if (window.STHeader && !_headerPatched) {
            window.STHeader._productOriginalUpdate = window.STHeader.updateAuthUI;
            _headerPatched = true;
            window.STHeader.updateAuthUI = function () {
                window.STHeader._productOriginalUpdate?.();
                if (document.getElementById('productContent')) syncHeaderCounts();
            };
        }

        console.log('📄 Product page ready');
    }

    function bindGlobals() {
        window.addToCart      = handleAddToCart;
        window.toggleWishlist = handleToggleWishlist;
        window.renderCart     = renderCart;
        window.showToast      = showToast;
    }

    function start() {
        bindGlobals();
        init();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }

    window.addEventListener('st:page-loaded', () => {
        bindGlobals();
        init();
    });

    window.addEventListener('st:pjax-before', cleanup);
    window.addEventListener('beforeunload',  cleanup);

    console.log('✅ Product page script loaded (SECURE & OPTIMIZED)');
})();
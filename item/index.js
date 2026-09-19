
        function t(key, fallback) {
            if (window.Translations && window.Translations.translate) {
                const result = window.Translations.translate(key);
                if (result && result !== key) return result;
            }
            return fallback || key;
        }

        let currentProduct = null;
        let currentProductId = null;
        let currentVariants = {};
        let currentGallery = [];
        let isWished = false;
        let relatedProductsPool = [];
        let relatedLoadedCount = 0;
        const RELATED_BATCH_SIZE = 4;
        let relatedObserver = null;
        let allProductsCache = [];
        let isLoadingMore = false;

        // --- Toast ---
        function showToast(msg) {
            const t = document.getElementById('toastMsg');
            if (!t) return;
            t.textContent = msg;
            t.classList.add('show');
            clearTimeout(t._timeout);
            t._timeout = setTimeout(() => t.classList.remove('show'), 2500);
        }

        // --- Modal Helpers ---
        window.openModal = (id) => document.getElementById(id)?.classList.remove('hidden');
        window.closeModal = (id) => document.getElementById(id)?.classList.add('hidden');

        // --- Star Rating ---
        function renderStars(rating) {
            const full = Math.floor(rating);
            let html = '';
            for (let i = 0; i < full; i++) html += '★';
            for (let i = full; i < 5; i++) html += '<span class="empty">☆</span>';
            return html;
        }
        // --- Fetch Product Details ---
        async function fetchProductDetails(productId) {
            const client = getSupabaseClient();
            if (!client) return null;

            try {
                const { data, error } = await client
                    .from('products')
                    .select('*')
                    .eq('id', productId)
                    .single();

                if (error) {
                    console.error('Error fetching product:', error.message);
                    return null;
                }

                // Normalize data
                if (typeof data.variants === 'string') {
                    try { data.variants = JSON.parse(data.variants); } catch (e) { data.variants = []; }
                }
                if (typeof data.images === 'string') {
                    try { data.images = JSON.parse(data.images); } catch (e) { data.images = [data.image]; }
                }
                if (!Array.isArray(data.images)) {
                    data.images = [data.image];
                }

                // Check if product has a deal
                const deal = await checkProductDeal(productId);
                if (deal) {
                    data.isDeal = true;
                    data.discount = deal.discount;
                }

                return data;
            } catch (err) {
                console.error('Error:', err.message);
                return null;
            }
        }

        // --- Check Product Deal ---
        async function checkProductDeal(productId) {
            const client = getSupabaseClient();
            if (!client) return null;

            try {
                const { data, error } = await client
                    .from('deals')
                    .select('discount')
                    .eq('product_id', productId)
                    .maybeSingle();

                if (error) {
                    if (error.code !== 'PGRST116') {
                        console.warn('⚠️ Deal lookup error:', error.message);
                    }
                    return null;
                }

                return data || null;
            } catch (err) {
                return null;
            }
        }

        // --- Fetch All Deals ---
        async function fetchAllDeals() {
            const client = getSupabaseClient();
            if (!client) return [];

            try {
                const { data: dealsData, error: dealsError } = await client
                    .from('deals')
                    .select('product_id, discount');

                if (dealsError) throw dealsError;
                if (!dealsData || dealsData.length === 0) {
                    console.log('ℹ️ No deals found');
                    return [];
                }

                const productIds = dealsData.map(d => d.product_id).filter(id => id);
                if (productIds.length === 0) return [];

                const { data: productsData, error: productsError } = await client
                    .from('products')
                    .select('*')
                    .in('id', productIds);

                if (productsError) throw productsError;

                const dealsWithProducts = dealsData
                    .map(deal => {
                        const product = productsData?.find(p => p.id === deal.product_id);
                        if (!product) return null;
                        return {
                            ...product,
                            dealDiscount: deal.discount,
                            isDeal: true,
                            originalPrice: product.price,
                            discountedPrice: product.price * (1 - deal.discount / 100)
                        };
                    })
                    .filter(item => item !== null);

                return dealsWithProducts;
            } catch (err) {
                console.error('❌ Error fetching deals:', err.message);
                return [];
            }
        }

        // --- Deals Slider ---
        let slideInterval = null;
        let currentPosition = 0;

        function renderDealsSlider(deals, containerId = 'dealsContainer') {
            const container = document.getElementById(containerId);
            if (!container) {
                console.warn(`⚠️ Container #${containerId} not found`);
                return;
            }

            if (!deals || deals.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center;padding:20px;color:#94A3B8;">
                        <p style="font-size:14px;" data-translate="no_deals_available">No deals available right now</p>
                    </div>
                `;
                return;
            }

            // Clear any existing interval
            if (slideInterval) {
                clearInterval(slideInterval);
                slideInterval = null;
            }

            let html = `
                <div class="deals-slider-wrapper">
                    <div class="deals-slider-track" id="dealsSliderTrack">
            `;

            // Duplicate deals for seamless looping
            const doubledDeals = [...deals, ...deals, ...deals];

            doubledDeals.forEach((deal, index) => {
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
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;

            container.innerHTML = html;

            // Initialize slider after DOM update
            setTimeout(() => {
                startSlider(deals.length);
            }, 100);
        }

        function startSlider(totalItems) {
            const track = document.getElementById('dealsSliderTrack');
            if (!track) return;

            if (slideInterval) {
                clearInterval(slideInterval);
                slideInterval = null;
            }

            const slideWidth = track.querySelector('.deal-slide')?.offsetWidth || 220;
            const gap = 20;
            const itemWidth = slideWidth + gap;
            currentPosition = 0;
            track.style.transform = `translateX(0)`;

            slideInterval = setInterval(() => {
                currentPosition -= itemWidth;
                track.style.transform = `translateX(${currentPosition}px)`;
                track.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                
                const totalWidth = totalItems * itemWidth;
                if (Math.abs(currentPosition) >= totalWidth) {
                    setTimeout(() => {
                        track.style.transition = 'none';
                        currentPosition = 0;
                        track.style.transform = `translateX(0)`;
                        track.offsetHeight;
                        setTimeout(() => {
                            track.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                        }, 50);
                    }, 800);
                }
            }, 3000);

            const wrapper = track.closest('.deals-slider-wrapper');
            if (wrapper) {
                wrapper.addEventListener('mouseenter', () => {
                    if (slideInterval) {
                        clearInterval(slideInterval);
                        slideInterval = null;
                    }
                });
                wrapper.addEventListener('mouseleave', () => {
                    if (!slideInterval) {
                        startSlider(totalItems);
                    }
                });
            }
        }

        // --- Add to Cart from Deal ---

        // --- Fetch All Products (for related) ---
        async function getAllProducts() {
            if (allProductsCache.length > 0) return allProductsCache;

            const client = getSupabaseClient();
            if (!client) return [];

            try {
                const { data, error } = await client
                    .from('products')
                    .select('*')
                    .order('created_at', { ascending: false });

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

        // --- Cart Functions ---
async function getCart() {
    try {
        // First try to get from localStorage
        const cart = JSON.parse(localStorage.getItem('st_cart') || '[]');
        return cart;
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
            // Customer-specific query: Delete with correct customer_id or session_id
            if (customerId) {
                await client.from('cart').delete().eq('customer_id', customerId);
            } else {
                await client.from('cart').delete().eq('session_id', sessionId);
            }
            
            if (cart.length > 0) {
                // Process each cart item with variant matching
                for (const item of cart) {
                    // Check if this product + variant combination already exists
                    const variantsJson = item.variants ? JSON.stringify(item.variants) : '{}';
                    
                    let existingQuery = client
                        .from('cart')
                        .select('*')
                        .eq('product_id', item.product_id || item.id || '')
                        .eq('variants', variantsJson);
                    
                    // Add customer/session filter
                    if (customerId) {
                        existingQuery = existingQuery.eq('customer_id', customerId);
                    } else {
                        existingQuery = existingQuery.eq('session_id', sessionId);
                    }
                    
                    const { data: existingItems, error: queryError } = await existingQuery;
                    
                    if (queryError) throw queryError;
                    
                    const row = {
                        ...(customerId ? { customer_id: customerId } : { session_id: sessionId }),
                        product_id: item.product_id || item.id || '',
                        name: item.name || 'Unknown Product',
                        price: item.price || 0,
                        qty: item.qty || 1,
                        image: item.image || 'https://placehold.co/400x400',
                        variants: item.variants || {},
                        is_deal: item.is_deal ?? item.isDeal ?? false,
                        original_price: item.original_price ?? item.originalPrice ?? null,
                        discount: item.discount || null,
                        brand: item.brand || null
                    };
                    
                    if (existingItems && existingItems.length > 0) {
                        // UPDATE: Same product + same variants exists → UPDATE quantity
                        const existingItem = existingItems[0];
                        const newQty = (existingItem.qty || 0) + (item.qty || 1);
                        await client
                            .from('cart')
                            .update({ qty: newQty })
                            .eq('id', existingItem.id);
                    } else {
                        // INSERT: Different product or different variants → INSERT new row
                        await client.from('cart').insert([row]);
                    }
                }
            }
        } catch (err) {
            console.warn('Cart sync error:', err.message);
        }
    }

    // Update localStorage
    localStorage.setItem('st_cart', JSON.stringify(cart));

    // Update header
    if (window.STHeader) {
        window.STHeader.AppState.cart = cart;
        if (window.STHeader.updateCounts) {
            window.STHeader.updateCounts();
        }
    }

    await renderCart();
}

        // --- Wishlist Functions ---
        async function getWishlist() {
            try {
                return JSON.parse(localStorage.getItem('st_wishlist') || '[]');
            } catch (e) {
                return [];
            }
        }

        async function saveWishlist(wishlist) {
            localStorage.setItem('st_wishlist', JSON.stringify(wishlist));

            const customerId = window.getCurrentCustomerId?.();
            const sessionId = localStorage.getItem('st_session_id') || 'session_' + Date.now();
            const client = getSupabaseClient();
            if (client) {
                try {
                    if (customerId) {
                        await client.from('wishlist').delete().eq('customer_id', customerId);
                    } else {
                        await client.from('wishlist').delete().eq('session_id', sessionId);
                    }
                    if (wishlist.length > 0) {
                        const rows = wishlist.map(pid => ({
                            ...(customerId ? { customer_id: customerId } : { session_id: sessionId }),
                            product_id: pid
                        }));
                        await client.from('wishlist').insert(rows);
                    }
                } catch (err) {
                    console.warn('Wishlist sync error:', err.message);
                }
            }

            if (window.STHeader) {
                window.STHeader.AppState.wishlist = wishlist;
                if (window.STHeader.updateCounts) {
                    window.STHeader.updateCounts();
                }
            }
        }

        // --- Get URL parameters ---
        function getProductIdFromUrl() {
            const params = new URLSearchParams(window.location.search);
            return params.get('product') || params.get('id');
        }

        // --- Quantity Controls ---
        window.incrementQty = function(max) {
            const input = document.getElementById('qtyInput');
            let val = parseInt(input.value) || 1;
            if (val < max) input.value = val + 1;
        };

        window.decrementQty = function() {
            const input = document.getElementById('qtyInput');
            let val = parseInt(input.value) || 1;
            if (val > 1) input.value = val - 1;
        };

        // --- Switch Image ---
        window.switchImage = function(src, index) {
            const main = document.getElementById('mainProductImage');
            main.src = src;
            document.querySelectorAll('.thumb-gallery img').forEach((el, i) => {
                el.classList.toggle('active', i === index);
            });
        };

        // --- Add to Cart ---
async function handleAddToCart(product) {
    const btn = document.getElementById('addToCartBtn');
    const qtyInput = document.getElementById('qtyInput');
    const qty = parseInt(qtyInput.value) || 1;

    if (!btn) return;

    if (btn.dataset.loading === 'true') return;

    btn.dataset.loading = 'true';
    btn.disabled = true;
    btn.innerHTML = '<span class="add-to-cart-content"><span class="add-to-cart-spinner"></span> ' + t('adding', 'Adding...') + '</span>';

    try {
        if (product.stock !== undefined && qty > product.stock) {
            showToast('⚠️ ' + t('only_items_available', 'Only ') + product.stock + ' ' + t('items_available', 'items available'));
            return;
        }

        const cart = await getCart();
    const variants = Object.keys(currentVariants).length > 0 ? { ...currentVariants } : {};
    const variantsJson = JSON.stringify(variants);
    
    // Check for existing item with same product_id AND same variants
    const existingIndex = cart.findIndex(item => 
        (item.product_id === product.id || item.id === product.id) && 
        JSON.stringify(item.variants || {}) === variantsJson
    );

    if (existingIndex !== -1) {
        // UPDATE: Same product + same variants → UPDATE quantity
        cart[existingIndex].qty = (cart[existingIndex].qty || 0) + qty;
    } else {
        // INSERT: New row (different product or different variants)
        const deal = await checkProductDeal(product.id);
        const dealDiscount = deal ? deal.discount : 0;
        cart.push({
            product_id: product.id,
            id: product.id,
            name: product.name,
            price: dealDiscount > 0 ? product.price * (1 - dealDiscount / 100) : product.price,
            qty: qty,
            image: product.image || 'https://placehold.co/400x400',
            variants: variants,
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
        btn.innerHTML = '<span class="add-to-cart-content"><i class="fas fa-shopping-cart"></i> ' + t('add_to_cart', 'Add to Cart') + '</span>';
    }
}


        // --- Toggle Wishlist ---
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
            if (isWished) {
                btn.innerHTML = '<i class="fas fa-heart text-primary"></i> ' + t('in_wishlist', 'In Wishlist');
                btn.classList.add('border-primary', 'text-primary');
            } else {
                btn.innerHTML = '<i class="far fa-heart"></i> ' + t('wishlist', 'Wishlist');
                btn.classList.remove('border-primary', 'text-primary');
            }
        }

        // --- Share ---
        async function handleShare(product) {
            const url = `${window.location.origin}/api/item?product=${product.id}`;
            if (navigator.share) {
                try {
                    await navigator.share({ title: product.name, url: url });
                } catch (e) { /* user cancelled */ }
            } else {
                try {
                    await navigator.clipboard.writeText(url);
                    showToast(t('link_copied', 'Link copied to clipboard!'));
                } catch (e) {
                    showToast('Share: ' + url);
                }
            }
        }

        // --- Render Reviews ---
        function renderReviews(productId) {
            const reviews = getProductReviews(productId);
            const list = document.getElementById('reviewsList');
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

        // --- Submit Review ---
// ============================================================
//  REVIEWS - Full Implementation with Supabase
// ============================================================

// --- State ---
let _cachedReviews = {};

// --- Load Reviews from Supabase ---
async function loadReviewsFromSupabase() {
    try {
        const client = getSupabaseClient();
        if (!client) {
            loadReviewsFromLocalStorage();
            return;
        }

        const { data, error } = await client
            .from('reviews')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error loading reviews:', error);
            loadReviewsFromLocalStorage();
            return;
        }

        // Organize reviews by product_id
        const reviews = {};
        data.forEach(review => {
            if (!reviews[review.product_id]) {
                reviews[review.product_id] = [];
            }
            reviews[review.product_id].push({
                id: review.id,
                user: review.user_name,
                rating: review.rating,
                comment: review.comment,
                date: review.date || new Date(review.created_at).toLocaleDateString()
            });
        });

        _cachedReviews = reviews;
        localStorage.setItem('st_reviews', JSON.stringify(reviews));
        
        console.log(`✅ Loaded ${data.length} reviews from Supabase`);
        return reviews;

    } catch (err) {
        console.error('❌ Error loading reviews:', err);
        loadReviewsFromLocalStorage();
    }
}

// --- Load Reviews from localStorage (Fallback) ---
function loadReviewsFromLocalStorage() {
    try {
        const saved = JSON.parse(localStorage.getItem('st_reviews') || '{}');
        _cachedReviews = saved;
        console.log(`✅ Loaded reviews from localStorage`);
    } catch (e) {
        _cachedReviews = {};
    }
}

// --- Get Reviews for a Product ---
function getProductReviews(productId) {
    return _cachedReviews[productId] || [];
}

// --- Get Average Rating ---
function getAverageRating(productId) {
    const revs = getProductReviews(productId);
    if (!revs.length) return 0;
    const sum = revs.reduce((s, r) => s + r.rating, 0);
    return sum / revs.length;
}

// --- Get Review Count ---
function getReviewCount(productId) {
    return getProductReviews(productId).length;
}
// Prevent the review form from doing a native submit (page reload)
const reviewForm = document.getElementById('reviewForm');
if (reviewForm) {
    reviewForm.addEventListener('submit', function (e) {
        e.preventDefault();
        // Optionally trigger the review handler directly:
        if (currentProductId) {
            handleSubmitReview(currentProductId);
        }
    });
}
// --- Submit Review ---
async function handleSubmitReview(productId) {
    const nameInput = document.getElementById('reviewUserName');
    const ratingSelect = document.getElementById('reviewRating');
    const commentInput = document.getElementById('reviewComment');
    const submitBtn = document.getElementById('submitReviewBtn');

    const userName = nameInput.value.trim();
    if (!userName) {
        showToast(t('please_enter_name', 'Please enter your name'));
        return;
    }
    const rating = parseInt(ratingSelect.value);
    const comment = commentInput.value.trim();
    if (!comment) {
        showToast(t('please_write_review', 'Please write a review'));
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="inline-flex items-center gap-2"><span class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span> ' + t('submitting', 'Submitting...') + '</span>';

    try {
        const client = getSupabaseClient();
        if (!client) {
            showToast('⚠️ ' + t('offline_mode', 'Offline mode: Review saved locally'), 'warning');
            saveReviewLocally(productId, userName, rating, comment);
            return;
        }

        const reviewData = {
            id: Date.now(),
            product_id: productId,
            user_name: userName,
            rating: rating,
            comment: comment,
            date: new Date().toLocaleDateString(),
            created_at: new Date().toISOString()
        };

        const { data, error } = await client
            .from('reviews')
            .insert([reviewData])
            .select();

        if (error) {
            console.error('❌ Supabase error:', error);
            showToast('⚠️ ' + t('network_error', 'Network error: Review saved locally'), 'warning');
            saveReviewLocally(productId, userName, rating, comment);
            return;
        }

        console.log('✅ Review saved to Supabase:', data);
        saveReviewLocally(productId, userName, rating, comment);

        commentInput.value = '';
        showToast(t('thank_you_review', 'Thank you for your review! 🎉'));

    } catch (e) {
        console.error('Review error:', e);
        showToast('⚠️ ' + t('error_saving_review', 'Error saving review. Saved locally.'), 'warning');
        saveReviewLocally(productId, userName, rating, comment);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = t('submit_review', 'Submit Review');
    }
}

// --- Save Review Locally ---
function saveReviewLocally(productId, userName, rating, comment) {
    if (!_cachedReviews[productId]) _cachedReviews[productId] = [];

    _cachedReviews[productId].push({
        id: Date.now(),
        user: userName,
        rating: rating,
        comment: comment,
        date: new Date().toLocaleDateString()
    });

    localStorage.setItem('st_reviews', JSON.stringify(_cachedReviews));
    
    renderReviews(productId);
    updateReviewUI(productId);
}

// --- Render Reviews ---
function renderReviews(productId) {
    const reviews = getProductReviews(productId);
    const list = document.getElementById('reviewsList');
    if (!list) return;

    if (reviews.length === 0) {
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

// --- Update Review UI ---
function updateReviewUI(productId) {
    const avg = getAverageRating(productId);
    const count = getReviewCount(productId);
    const ratingEl = document.getElementById('productRating');
    const countEl = document.getElementById('reviewCount');
    const labelEl = document.getElementById('reviewCountLabel');

    if (ratingEl) ratingEl.innerHTML = renderStars(avg);
    if (countEl) countEl.textContent = `${count} ${t('reviews', 'Reviews')}`;
    if (labelEl) labelEl.textContent = count;
}

// --- Render Stars ---
function renderStars(rating) {
    const full = Math.floor(rating);
    let html = '';
    for (let i = 0; i < full; i++) html += '★';
    for (let i = full; i < 5; i++) html += '☆';
    return html;
}

// --- Show Toast ---
function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast-msg');
    if (existing) existing.remove();

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
        // --- Render Cart Modal ---
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
                const variantText = item.variants && Object.keys(item.variants).length ?
                    Object.entries(item.variants).map(([k, v]) => `${k}: ${v}`).join(', ') :
                    '';
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
        // Remove item
        cart.splice(index, 1);
    } else {
        item.qty = newQ;
    }
    
    await saveCart(cart);
}


window.clearCart = async function() {
    const customerId = window.getCurrentCustomerId?.();
    const sessionId = localStorage.getItem('st_session_id') || 'session_' + Date.now();
    const client = getSupabaseClient();
    
    if (client) {
        try {
            // Customer-specific cleanup: Remove all items for this customer/session
            if (customerId) {
                await client.from('cart').delete().eq('customer_id', customerId);
            } else {
                await client.from('cart').delete().eq('session_id', sessionId);
            }
        } catch (err) {
            console.warn('Failed to clear cart from DB:', err.message);
        }
    }
    
    await saveCart([]);
    showToast(t('cart_cleared', 'Cart cleared'));
    await renderCart();
};

        window.openCheckout = function() {
            const cart = JSON.parse(localStorage.getItem('st_cart') || '[]');
            if (!cart.length) {
                showToast(t('cart_empty', 'Cart empty'));
                return;
            }
            closeModal('cartModal');
            showToast('🛒 ' + t('checkout_coming', 'Checkout coming soon!'));
        };

        // --- Related Products ---
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
                    <img src="${p.image || 'https://placehold.co/200x200'}" alt="${p.name}" loading="lazy" onerror="this.src='https://placehold.co/200x200?text=No+Image'">
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
                                <div class="skeleton-img-mini">
                                    <div class="shimmer"></div>
                                </div>
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
            if (visible) {
                showRelatedSkeletonLoader();
            } else {
                loadMore.classList.add('hidden');
            }
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
                if (loadMore) {
                    loadMore.classList.add('hidden');
                }
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
                    if (entry.isIntersecting && !isLoadingMore) {
                        loadMoreRelatedProducts();
                    }
                });
            }, {
                rootMargin: '0px 0px 200px 0px',
                threshold: 0.1
            });
            relatedObserver.observe(sentinel);
        }

        async function renderRelatedProducts(product) {
            const products = await getAllProducts();
            const candidates = products.filter(p => p.id !== product.id);
            const relatedMatch = candidates.filter(p => p.category === product.category || p.brand === product.brand);
            const fallback = candidates.filter(p => !relatedMatch.includes(p));

            const initialRelated = [...relatedMatch.slice(0, RELATED_BATCH_SIZE)];
            if (initialRelated.length < RELATED_BATCH_SIZE) {
                const shuffledFallback = shuffleArray([...fallback]);
                initialRelated.push(...shuffledFallback.slice(0, RELATED_BATCH_SIZE - initialRelated.length));
            }

            const usedIds = new Set(initialRelated.map(p => p.id));
            relatedProductsPool = candidates.filter(p => !usedIds.has(p.id));
            shuffleArray(relatedProductsPool);
            relatedLoadedCount = initialRelated.length;

            const grid = document.getElementById('relatedGrid');
            if (!grid) return;
            grid.innerHTML = '';
            appendRelatedProducts(initialRelated);
            updateRelatedLoadMore(Boolean(relatedProductsPool.length));
            setTimeout(setupRelatedObserver, 100);
        }

        // --- Render Product ---
        async function renderProduct(product) {
            currentProduct = product;
            currentProductId = product.id;

            document.title = `${product.name} · Sucess Technology`;

            // Breadcrumb
            const brandLink = document.getElementById('breadcrumbBrand');
            if (product.brand) {
                brandLink.textContent = product.brand;
                brandLink.href = `/brand/?brand=${encodeURIComponent(product.brand)}`;
                brandLink.style.display = 'inline';
            } else {
                brandLink.style.display = 'none';
            }
            const categoryLink = document.getElementById('breadcrumbCategory');
            if (product.category) {
                categoryLink.textContent = product.category;
                categoryLink.href = `/category/?category=${encodeURIComponent(product.category)}`;
                categoryLink.style.display = 'inline';
            } else {
                categoryLink.style.display = 'none';
            }
            document.getElementById('breadcrumbName').textContent = product.name;

            document.getElementById('productBrand').textContent = product.brand || 'all';
            document.getElementById('productcategory').textContent = product.category || 'all';
            document.getElementById('productName').textContent = product.name;

            loadReviewsFromLocalStorage();

            const avg = getAverageRating(product.id);
            const count = getReviewCount(product.id);
            document.getElementById('productRating').innerHTML = renderStars(avg);
            document.getElementById('reviewCount').textContent = `${count} ${t('reviews', 'Reviews')}`;
            document.getElementById('reviewCountLabel').textContent = count;

            let allImages = [product.image];
            if (product.images && Array.isArray(product.images)) {
                const extra = product.images.filter(img => img !== product.image);
                allImages = [...allImages, ...extra];
            }
            currentGallery = allImages;

            const mainImg = document.getElementById('mainProductImage');
            mainImg.src = product.image || 'https://placehold.co/600x400';
            mainImg.alt = product.name;
            mainImg.onerror = () => { mainImg.src = 'https://placehold.co/600x400?text=No+Image'; };

            const gallery = document.getElementById('thumbnailGallery');
            gallery.innerHTML = allImages.map((img, i) =>
                `<img src="${img}" alt="View ${i+1}" class="${i === 0 ? 'active' : ''}"
                      onclick="switchImage('${img}', ${i})"
                      onerror="this.src='https://placehold.co/70x70?text=No+Image'">`
            ).join('');

            mainImg.onclick = () => {
                if (typeof zoomImage === 'function') {
                    zoomImage(mainImg.src, product.name, allImages, 0);
                }
            };

            const originalPrice = product.price || 0;
            const priceSection = document.getElementById('priceSection');

            const hasDeal = product.isDeal || false;
            const discount = product.discount || 0;
            const discountedPrice = hasDeal ? originalPrice * (1 - discount / 100) : originalPrice;

            if (hasDeal && discount > 0) {
                priceSection.innerHTML = `
                    <div class="flex items-center gap-3 mb-2">
                        <span class="text-2xl text-gray-400 line-through">FCFA ${originalPrice.toFixed(2)}</span>
                        <span class="bg-primary text-white px-3 py-1 rounded-full text-sm font-bold">${t('save', 'SAVE')} ${discount}%</span>
                    </div>
                    <div class="text-5xl font-bold text-primary">FCFA ${discountedPrice.toFixed(2)}</div>
                `;
                document.getElementById('dealBadgeOverlay').classList.remove('hidden');
                document.getElementById('dealBadgeOverlay').textContent = `-${discount}% ${t('off', 'OFF')}`;
                document.getElementById('dealInfo').classList.remove('hidden');
                document.getElementById('dealInfo').querySelector('p').textContent = `🔥 ${t('deal_of_day_text', 'Deal of the Day')} - ${discount}% ${t('off', 'OFF')}!`;
            } else {
                priceSection.innerHTML = `
                    <div class="text-4xl font-light text-gray-900">FCFA ${originalPrice.toFixed(2)}</div>
                `;
                document.getElementById('dealBadgeOverlay').classList.add('hidden');
                document.getElementById('dealInfo').classList.add('hidden');
            }

            document.getElementById('productDescription').textContent = product.description || t('no_description', 'No description available.');

            const specsGrid = document.getElementById('specsGrid');
            const specItems = [];
            if (product.cpu) specItems.push({ label: t('processor', 'Processor'), value: product.cpu });
            if (product.os) specItems.push({ label: t('operating_system', 'Operating System'), value: product.os });
            if (product.specs) specItems.push({ label: t('specifications', 'Specifications'), value: product.specs });
            if (product.stock !== undefined) {
                const stockText = product.stock > 0 ? `${t('in_stock', 'In Stock')} (${product.stock})` : t('out_of_stock', 'Out of Stock');
                const stockColor = product.stock > 0 ? 'text-green-600' : 'text-red-600';
                specItems.push({ label: t('stock_status', 'Stock Status'), value: `<span class="${stockColor} font-semibold">${stockText}</span>` });
            }
            if (specItems.length === 0) {
                specsGrid.innerHTML = '<p class="text-sm text-gray-400 col-span-2" data-translate="no_specs">No specifications available.</p>';
            } else {
                specsGrid.innerHTML = specItems.map(item =>
                    `<div><p class="text-xs text-gray-500">${item.label}</p><p class="font-semibold text-sm">${item.value}</p></div>`
                ).join('');
            }

            // Replace the variant button rendering & click logic inside renderProduct() with this:
            const variantsSection = document.getElementById('variantsSection');
            if (product.variants && product.variants.length > 0) {
                variantsSection.innerHTML = product.variants.map(v => `
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

                // Active Selection Handler
                variantsSection.querySelectorAll('.variant-option').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const container = this.closest('div[data-variant-type]');
                        const type = container.dataset.variantType;
                        
                        // Remove 'selected' from siblings
                        container.querySelectorAll('.variant-option').forEach(b => b.classList.remove('selected'));
                        
                        // Add 'selected' to clicked element
                        this.classList.add('selected');
                        currentVariants[type] = this.dataset.variantValue;
                    });
                });

                // Select the first variant option by default
                variantsSection.querySelectorAll('div[data-variant-type]').forEach(container => {
                    const first = container.querySelector('.variant-option');
                    if (first) {
                        first.classList.add('selected');
                        const type = container.dataset.variantType;
                        currentVariants[type] = first.dataset.variantValue;
                    }
                });
                variantsSection.classList.remove('hidden');
            } else {
                variantsSection.innerHTML = '';
                variantsSection.classList.add('hidden');
            }

            const stockDisplay = document.getElementById('stockDisplay');
            if (product.stock !== undefined) {
                stockDisplay.textContent = product.stock > 0 ? `${product.stock} ${t('available', 'available')}` : t('out_of_stock', 'Out of stock');
                stockDisplay.className = `text-xs ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`;
            } else {
                stockDisplay.textContent = '';
            }

            const wishlist = await getWishlist();
            isWished = wishlist.includes(product.id);
            updateWishlistButton();
                       if (typeof trackProductView === 'function') {
                await trackProductView(product.id);
            }

            renderReviews(product.id);
            await renderRelatedProducts(product);

            // Load and render deals
            const deals = await fetchAllDeals();
            renderDealsSlider(deals, 'dealsContainer');

            document.getElementById('loadingState').classList.add('hidden');
            document.getElementById('productContent').classList.remove('hidden');

            document.getElementById('addToCartBtn').onclick = () => handleAddToCart(product);
            document.getElementById('wishlistBtn').onclick = () => handleToggleWishlist(product.id);
            document.getElementById('shareBtn').onclick = () => handleShare(product);
           document.getElementById('submitReviewBtn').addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    handleSubmitReview(product.id);
});

            const nameInput = document.getElementById('reviewUserName');
            const customerName = window.STHeader?.AppState?.user?.name || window.STHeader?.AppState?.user?.full_name || window.STHeader?.AppState?.user?.email || '';
            if (nameInput && customerName) {
                nameInput.value = customerName;
                nameInput.readOnly = true;
            }

            const qtyInput = document.getElementById('qtyInput');
            qtyInput.max = product.stock || 99;
            qtyInput.addEventListener('change', () => {
                const val = parseInt(qtyInput.value) || 1;
                if (val < 1) qtyInput.value = 1;
                if (product.stock && val > product.stock) qtyInput.value = product.stock;
            });

            if (window.STHeader) {
                const cart = await getCart();
                window.STHeader.AppState.cart = cart;
                window.STHeader.AppState.wishlist = wishlist;
                if (window.STHeader.updateCounts) {
                    window.STHeader.updateCounts();
                }
            }
            translateUI();
        }

        // --- Load Product ---
        async function loadProduct() {
            const id = await getProductIdFromUrl();
            if (!id) {
                document.getElementById('loadingState').classList.add('hidden');
                document.getElementById('notFoundState').classList.remove('hidden');
                return;
            }

            try {
                let product = await fetchProductDetails(id);
                if (!product) {
                    const all = await getAllProducts();
                    const normalizedId = String(id).trim().toLowerCase();
                    product = all.find(p =>
                        String(p.id).toLowerCase() === normalizedId ||
                        p.name?.toLowerCase().includes(normalizedId)
                    );
                }

                if (!product) {
                    document.getElementById('loadingState').classList.add('hidden');
                    document.getElementById('notFoundState').classList.remove('hidden');
                    return;
                }

                await renderProduct(product);
            } catch (e) {
                console.error('Load product error:', e);
                document.getElementById('loadingState').classList.add('hidden');
                document.getElementById('notFoundState').classList.remove('hidden');
            }
        }

        // --- Review Dropdown ---
        function initReviewDropdown() {
            const toggleBtn = document.getElementById('reviewsToggleBtn');
    const reviewsContent = document.getElementById('reviewsContent');
    const toggleIcon = document.getElementById('reviewsToggleIcon');
    
    toggleBtn.addEventListener('click', function() {
        // Toggle the hidden class
        reviewsContent.classList.toggle('hidden');
        
        // Update aria-expanded attribute
        const isExpanded = !reviewsContent.classList.contains('hidden');
        toggleBtn.setAttribute('aria-expanded', isExpanded);
        
        // Rotate the icon
        if (isExpanded) {
            toggleIcon.style.transform = 'rotate(180deg)';
        } else {
            toggleIcon.style.transform = 'rotate(0deg)';
        }
    });
        }

        // --- Initialize ---
        document.addEventListener('DOMContentLoaded', async () => {
            loadReviewsFromLocalStorage();
            await loadReviewsFromSupabase();

               setTimeout(() => {
                    loadProduct();
                }, 500);

            renderCart();
            initReviewDropdown();

            setTimeout(async () => {
                if (window.STHeader) {
                    const cart = await getCart();
                    const wishlist = await getWishlist();
                    window.STHeader.AppState.cart = cart;
                    window.STHeader.AppState.wishlist = wishlist;
                    if (window.STHeader.updateCounts) {
                        window.STHeader.updateCounts();
                    }
                }
            }, 1000);
        });

        // --- Expose globally ---
        window.addToCart = handleAddToCart;
        window.toggleWishlist = handleToggleWishlist;
        window.renderCart = renderCart;
        window.showToast = showToast;

        console.log('📄 Product page loaded with Supabase integration and deals');

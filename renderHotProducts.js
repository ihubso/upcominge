/**
 * ============================================================
 * HOT PRODUCTS - Featured Products Grid
 * Fetches and displays products marked as "Hot" from Supabase
 * ============================================================
 */

// ============================================================
// 1. SUPABASE CONFIGURATION
// ============================================================

const HOT_SUPABASE_CONFIG = {
    url: 'https://bulprhgwuwatzobiojwz.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bHByaGd3dXdhdHpvYmlvand6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDczNDksImV4cCI6MjA5MjA4MzM0OX0.2fcHrGX7iXw5G9nGRNkBy70W1Ex_om1C0v3qbryPmvw'
};

let hotSupabaseClient = null;

function getHotSupabaseClient() {
    if (hotSupabaseClient) return hotSupabaseClient;
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        hotSupabaseClient = supabase.createClient(HOT_SUPABASE_CONFIG.url, HOT_SUPABASE_CONFIG.anonKey);
        return hotSupabaseClient;
    }
    return null;
}

// ============================================================
// 2. FETCH HOT PRODUCTS
// ============================================================

async function fetchHotProducts() {
    const client = getHotSupabaseClient();
    if (!client) {
        console.warn('⚠️ Supabase not available for hot products');
        return [];
    }

    try {
        const { data, error } = await client
            .from('products')
            .select('*')
            .eq('isHot', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error fetching hot products:', error.message);
            return [];
        }

        console.log(`✅ Loaded ${data?.length || 0} hot products`);
        return data || [];

    } catch (err) {
        console.error('❌ Error fetching hot products:', err.message);
        return [];
    }
}

// ============================================================
// 3. FETCH REVIEWS (FIXED - uses the same client)
// ============================================================

async function fetchReviewsFromDB() {
    const client = getHotSupabaseClient(); // ✅ FIXED: Use the same client
    if (!client) return {};
    
    try {
        const { data, error } = await client.from('reviews').select('*');
        
        if (error) {
            console.error('❌ Error fetching reviews:', error.message);
            return {};
        }
        
        const reviews = {};
        (data || []).forEach(r => {
            if (!reviews[r.product_id]) reviews[r.product_id] = [];
            reviews[r.product_id].push({
                id: r.id,
                user: r.user_name,
                rating: r.rating,
                comment: r.comment,
                date: r.date
            });
        });
        return reviews;
    } catch (err) {
        console.error('❌ Error fetching reviews:', err.message);
        return {};
    }
}

// ============================================================
// 3.5. RENDER SKELETON LOADER
// ============================================================

function renderHotSkeletonLoader(containerId = 'hotProducts') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const skeletonCards = Array(8).fill(0).map(() => `
        <div class="hot-product-card skeleton">
            <div class="hot-product-image skeleton-image">
                <div class="skeleton-shimmer"></div>
            </div>
            <div class="hot-product-info">
                <div class="skeleton-text skeleton-name"></div>
                <div class="skeleton-text skeleton-brand"></div>
                <div class="skeleton-price-row">
                    <div class="skeleton-text skeleton-current-price"></div>
                    <div class="skeleton-text skeleton-original-price"></div>
                </div>
                <div class="skeleton-rating">
                    <div class="skeleton-text skeleton-stars"></div>
                    <div class="skeleton-text skeleton-reviews"></div>
                </div>
                <div class="skeleton-actions">
                    <div class="skeleton-text skeleton-btn-cart"></div>
                    <div class="skeleton-text skeleton-btn-view"></div>
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="hot-products-header">
            <h2><i class="fas fa-fire"></i> Hot Products</h2>
            <a href="products.html?filter=hot" class="hot-view-all">View All <i class="fas fa-arrow-right"></i></a>
        </div>
        <div class="hot-products-grid skeleton-grid">
            ${skeletonCards}
        </div>
    `;
}

// ============================================================
// 4. RENDER STARS
// ============================================================

function renderStars(rating) {
    const full = Math.floor(rating);
    const half = (rating % 1) >= 0.5;
    let html = '';
    for (let i = 0; i < full; i++) html += '★';
    if (half) html += '½';
    for (let i = html.length; i < 5; i++) html += '<span class="empty">☆</span>';
    return html;
}

// ============================================================
// 5. RENDER HOT PRODUCTS (FIXED)
// ============================================================

// Helper function to get reviews for a product
function getProductReviews(productId) {
    const reviews = window.productReviews || {};
    return reviews[productId] || [];
}

function getAverageRating(productId) {
    const revs = getProductReviews(productId);
    if (!revs.length) return 0;
    const sum = revs.reduce((s, r) => s + r.rating, 0);
    return sum / revs.length;
}

function getReviewCount(productId) {
    const revs = getProductReviews(productId);
    return revs.length;
}

async function renderHotProducts(products, containerId = 'hotProducts') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`⚠️ Container #${containerId} not found`);
        return;
    }

    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="hot-products-header">
                <h2><i class="fas fa-fire"></i> Hot Products</h2>
                <a href="products.html?filter=hot" class="hot-view-all">View All <i class="fas fa-arrow-right"></i></a>
            </div>
            <div style="text-align:center;padding:40px 20px;background:#f8fafc;border-radius:16px;">
                <p style="color:#94A3B8;font-size:16px;">No hot products available</p>
            </div>
        `;
        return;
    }

    // Fetch reviews first
    const reviews = await fetchReviewsFromDB();
    window.productReviews = reviews; // Make available globally for helper functions

    // Build the HTML
    let html = `
        <div class="hot-products-header">
            <h2><i class="fas fa-fire"></i> Hot Products</h2>
            <a href="products.html?filter=hot" class="hot-view-all">View All <i class="fas fa-arrow-right"></i></a>
        </div>
        <div class="hot-products-grid">
    `;

    products.forEach((product) => {
        const image = product.image || product.images?.[0] || 'https://placehold.co/400x400/6C3CE1/FFFFFF?text=Product';
        const price = product.price || 0;
        const originalPrice = product.originalPrice || price;
        const discount = product.discount || 0;
        const rating = getAverageRating(product.id);
        const reviewCount = getReviewCount(product.id);

        // Calculate discount percentage
        let discountPercent = 0;
        if (discount > 0) {
            discountPercent = discount;
        } else if (originalPrice > price && originalPrice > 0) {
            discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
        }

        // Star rating
        const starsHtml = renderStars(rating);

        // Check if product is in wishlist
        const isInWishlist = window.STHeader?.AppState?.wishlist?.includes(product.id) || false;

        html += `
            <div class="hot-product-card" data-product-id="${product.id}">
                <div class="hot-product-image">
                    <img src="${image}" alt="${product.name || 'Product'}" loading="lazy" onerror="this.src='https://placehold.co/400x400/6C3CE1/FFFFFF?text=Product'">
                    ${discountPercent > 0 ? `<span class="hot-product-discount">-${discountPercent}%</span>` : ''}
                    <button class="hot-product-wishlist ${isInWishlist ? 'active' : ''}" onclick="toggleWishlist('${product.id}')" aria-label="Add to wishlist">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <div class="hot-product-info" a href="item.html?id=${product.id}" >
                    <a href="item.html?id=${product.id}" class="hot-product-name">
                        ${product.name || 'Unknown Product'}
                    </a>
                    ${product.brand ? `<span class="hot-product-brand">${product.brand}</span>` : ''}
                    <div class="hot-product-price">
                        <span class="hot-current-price">$${price.toFixed(2)}</span>
                        ${discountPercent > 0 ? `
                            <span class="hot-original-price">$${originalPrice.toFixed(2)}</span>
                        ` : ''}
                    </div>
                    ${rating > 0 ? `
                        <div class="hot-product-rating">
                            <span class="hot-stars">${starsHtml}</span>
                            <span class="hot-reviews">(${reviewCount || 0})</span>
                        </div>
                    ` : ''}
                    <div class="hot-product-actions">
                        <button class="hot-btn-cart" onclick="addToCart('${product.id}')">
                            <i class="fas fa-shopping-bag"></i> Add to Cart
                        </button>
                        <a href="item.html?id=${product.id}" class="hot-btn-view">
                            <i class="fas fa-eye"></i>
                        </a>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

// ============================================================
// 6. WISHLIST TOGGLE
// ============================================================

async function toggleWishlist(productId) {
    try {
        // Get current wishlist
        let wishlist = JSON.parse(localStorage.getItem('st_wishlist') || '[]');
        const index = wishlist.indexOf(productId);

        if (index !== -1) {
            // Remove from wishlist
            wishlist.splice(index, 1);
            showToast('❤️ Removed from wishlist', 'info');
        } else {
            // Add to wishlist
            wishlist.push(productId);
            showToast('❤️ Added to wishlist', 'success');
        }

        // Save to localStorage
        localStorage.setItem('st_wishlist', JSON.stringify(wishlist));

        // Save to Supabase
        const sessionId = localStorage.getItem('st_session_id') || 'session_' + Date.now();
        const client = getHotSupabaseClient();
        if (client) {
            await saveWishlistToDB(sessionId, wishlist);
        }

        // Update header
        if (window.STHeader) {
            window.STHeader.AppState.wishlist = wishlist;
            window.STHeader.updateCounts();
        }

        // Update UI - toggle heart icon
        const buttons = document.querySelectorAll(`.hot-product-wishlist[onclick*="${productId}"]`);
        buttons.forEach(btn => {
            btn.classList.toggle('active');
        });

    } catch (err) {
        console.error('❌ Error toggling wishlist:', err);
        showToast('❌ Failed to update wishlist', 'error');
    }
}

// ============================================================
// 7. ADD TO CART
// ============================================================

async function addToCart(productId) {
    try {
        // Get product details
        const client = getHotSupabaseClient();
        let product = null;

        if (client) {
            const { data, error } = await client
                .from('products')
                .select('*')
                .eq('id', productId)
                .single();

            if (!error && data) {
                product = data;
            }
        }


        if (!product) {
            const card = document.querySelector(`.hot-product-card[data-product-id="${productId}"]`);
            if (card) {
                const name = card.querySelector('.hot-product-name')?.textContent || 'Unknown Product';
                const priceText = card.querySelector('.hot-current-price')?.textContent || '$0';
                const price = parseFloat(priceText.replace('$', ''));
                const image = card.querySelector('.hot-product-image img')?.src || 'https://placehold.co/400x400';
                product = { id: productId, name, price, image };
            }
        }

        if (!product) {
            showToast('❌ Product not found', 'error');
            return;
        }

        // Get current cart
        let cart = JSON.parse(localStorage.getItem('st_cart') || '[]');

        // Check if product already in cart
        const existingIndex = cart.findIndex(item => item.product_id === productId || item.id === productId);

        if (existingIndex !== -1) {
            cart[existingIndex].qty = (cart[existingIndex].qty || 1) + 1;
        } else {
            cart.push({
                product_id: productId,
                id: productId,
                name: product.name || 'Unknown Product',
                price: product.price || 0,
                qty: 1,
                image: product.image || product.images?.[0] || 'https://placehold.co/400x400',
                variants: product.variants || {},
                isDeal: product.isDeal || false,
                originalPrice: product.originalPrice || null,
                discount: product.discount || null,
                brand: product.brand || ''
            });
        }

        // Save to localStorage
        localStorage.setItem('st_cart', JSON.stringify(cart));

        // Save to Supabase
        const sessionId = localStorage.getItem('st_session_id') || 'session_' + Date.now();
        const client2 = getHotSupabaseClient();
        if (client2) {
            await saveCartToDB(sessionId, cart);
        }

        // Update header
        if (window.STHeader) {
            window.STHeader.AppState.cart = cart;
            window.STHeader.updateCounts();
        }

        showToast('✅ Added to cart!', 'success');

    } catch (err) {
        console.error('❌ Error adding to cart:', err);
        showToast('❌ Failed to add to cart', 'error');
    }
}

// ============================================================
// 8. SUPABASE SYNC FUNCTIONS
// ============================================================

async function saveWishlistToDB(sessionId, wishlist) {
    const client = getHotSupabaseClient();
    if (!client) return;

    try {
        await client.from('wishlist').delete().eq('session_id', sessionId);

        if (wishlist.length > 0) {
            const rows = wishlist.map(pid => ({ session_id: sessionId, product_id: pid }));
            const { error } = await client.from('wishlist').insert(rows);
            if (error) console.error('❌ Error saving wishlist:', error.message);
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

async function saveCartToDB(sessionId, cart) {
    const client = getHotSupabaseClient();
    if (!client) return;

    try {
        await client.from('cart').delete().eq('session_id', sessionId);

        if (cart.length > 0) {
            const rows = cart.map(item => ({
                session_id: sessionId,
                product_id: item.product_id || item.id || '',
                name: item.name || 'Unknown Product',
                price: item.price || 0,
                qty: item.qty || 1,
                image: item.image || 'https://placehold.co/400x400',
                variants: item.variants || {},
                is_deal: item.isDeal || false,
                original_price: item.originalPrice || null,
                discount: item.discount || null
            }));

            const validRows = rows.filter(row => row.product_id);
            if (validRows.length > 0) {
                const { error } = await client.from('cart').insert(validRows);
                if (error) console.error('❌ Error saving cart:', error.message);
            }
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

// ============================================================
// 9. TOAST NOTIFICATION
// ============================================================

function showToast(message, type = 'success') {
    const existing = document.querySelector('.hot-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'hot-toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        padding: 14px 24px;
        background: ${type === 'error' ? '#EF4444' : type === 'info' ? '#3B82F6' : '#10B981'};
        color: white;
        border-radius: 12px;
        font-weight: 600;
        font-size: 14px;
        z-index: 30000;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        max-width: 90%;
        text-align: center;
        animation: toastSlideUp 0.3s ease;
        font-family: 'Inter', sans-serif;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes toastSlideUp {
            from { transform: translateX(-50%) translateY(20px); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================================
// 10. HOT PRODUCTS STYLES (Includes Skeleton)
// ============================================================

function injectHotStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* ============================================
           SKELETON LOADER STYLES
           ============================================ */

        .hot-product-card.skeleton {
            animation: none;
            background: #f8fafc;
        }

        .hot-product-card.skeleton .hot-product-image {
            background: #e2e8f0;
            position: relative;
            overflow: hidden;
        }

        .skeleton-shimmer {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(
                90deg,
                rgba(255, 255, 255, 0) 0%,
                rgba(255, 255, 255, 0.3) 50%,
                rgba(255, 255, 255, 0) 100%
            );
            animation: skeletonShimmer 1.5s ease-in-out infinite;
        }

        @keyframes skeletonShimmer {
            0% {
                transform: translateX(-100%);
            }
            100% {
                transform: translateX(100%);
            }
        }

        .skeleton-text {
            background: #e2e8f0;
            border-radius: 4px;
            position: relative;
            overflow: hidden;
        }

        .skeleton-text::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(
                90deg,
                transparent 0%,
                rgba(255, 255, 255, 0.4) 50%,
                transparent 100%
            );
            animation: skeletonShimmer 1.5s ease-in-out infinite;
        }

        .skeleton-name {
            height: 20px;
            width: 85%;
            margin-bottom: 6px;
        }

        .skeleton-brand {
            height: 14px;
            width: 60%;
            margin-bottom: 8px;
        }

        .skeleton-price-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
        }

        .skeleton-current-price {
            height: 22px;
            width: 80px;
        }

        .skeleton-original-price {
            height: 16px;
            width: 60px;
        }

        .skeleton-rating {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 12px;
        }

        .skeleton-stars {
            height: 16px;
            width: 80px;
        }

        .skeleton-reviews {
            height: 14px;
            width: 40px;
        }

        .skeleton-actions {
            display: flex;
            gap: 8px;
        }

        .skeleton-btn-cart {
            height: 38px;
            flex: 1;
            border-radius: 10px;
        }

        .skeleton-btn-view {
            height: 38px;
            width: 44px;
            border-radius: 10px;
            flex-shrink: 0;
        }

        .skeleton-grid {
            opacity: 0.7;
        }

        .skeleton-grid .hot-product-card {
            box-shadow: none;
            border: 1px solid #e2e8f0;
        }

        /* ============================================
           HOT PRODUCTS STYLES
           ============================================ */
        .hot-products-section {
            max-width: 1200px;
            margin: 40px auto;
            padding: 0 24px;
        }

        .hot-products-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
            flex-wrap: wrap;
            gap: 12px;
        }

        .hot-products-header h2 {
            font-size: 28px;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .hot-products-header h2 i {
            color: #EF4444;
        }

        .hot-products-header .hot-view-all {
            padding: 8px 20px;
            background: transparent;
            border: 2px solid #6C3CE1;
            color: #6C3CE1;
            border-radius: 10px;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.2s ease;
        }

        .hot-products-header .hot-view-all:hover {
            background: #6C3CE1;
            color: white;
        }

        .hot-products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 24px;
        }

        /* Product Card */
        .hot-product-card {
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
            transition: all 0.3s ease;
        }

        .hot-product-card:hover:not(.skeleton) {
            transform: translateY(-4px);
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
        }

        .hot-product-image {
            position: relative;
            width: 100%;
            padding-top: 100%;
            overflow: hidden;
            background: #f1f5f9;
        }

        .hot-product-image img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
        }

        .hot-product-card:not(.skeleton):hover .hot-product-image img {
            transform: scale(1.05);
        }

        .hot-product-discount {
            position: absolute;
            top: 12px;
            left: 12px;
            padding: 4px 12px;
            background: #EF4444;
            color: white;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            z-index: 2;
        }

        .hot-product-wishlist {
            position: absolute;
            top: 12px;
            right: 12px;
            width: 36px;
            height: 36px;
            border: none;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(4px);
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #94A3B8;
            font-size: 16px;
            z-index: 2;
        }

        .hot-product-wishlist:hover {
            background: #EF4444;
            color: white;
            transform: scale(1.1);
        }

        .hot-product-wishlist.active {
            background: #EF4444;
            color: white;
        }

        .hot-product-info {
            padding: 16px;
        }

        .hot-product-name {
            font-weight: 700;
            font-size: 15px;
            color: #0F172A;
            text-decoration: none;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            transition: color 0.2s ease;
        }

        .hot-product-name:hover {
            color: #6C3CE1;
        }

        .hot-product-brand {
            font-size: 12px;
            color: #94A3B8;
            display: block;
            margin-top: 2px;
        }

        .hot-product-price {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 8px;
            flex-wrap: wrap;
        }

        .hot-current-price {
            font-weight: 700;
            font-size: 18px;
            color: #0F172A;
        }

        .hot-original-price {
            font-size: 14px;
            color: #94A3B8;
            text-decoration: line-through;
        }

        .hot-product-rating {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-top: 6px;
            font-size: 13px;
            color: #64748B;
        }

        .hot-stars {
            color: #F59E0B;
        }

        .hot-product-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }

        .hot-btn-cart {
            flex: 1;
            padding: 10px 16px;
            background: linear-gradient(135deg, #6C3CE1, #5A2FC4);
            color: white;
            border: none;
            border-radius: 10px;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: inherit;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .hot-btn-cart:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(108, 60, 225, 0.4);
        }

        .hot-btn-cart:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .hot-btn-view {
            padding: 10px 14px;
            border: 2px solid #E2E8F0;
            background: transparent;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s ease;
            color: #0F172A;
            text-decoration: none;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
        }

        .hot-btn-view:hover {
            border-color: #6C3CE1;
            color: #6C3CE1;
            background: rgba(108, 60, 225, 0.05);
        }

        /* Loading */
        .hot-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            flex-direction: column;
            gap: 16px;
            grid-column: 1 / -1;
        }

        .hot-loading .hot-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #E2E8F0;
            border-top-color: #6C3CE1;
            border-radius: 50%;
            animation: hotSpin 0.8s linear infinite;
        }

        @keyframes hotSpin {
            to { transform: rotate(360deg); }
        }

        /* ============================================
           ✅ RESPONSIVE - FORCED 2 COLUMNS
           ============================================ */
        
        /* Tablet/Medium (max-width: 1024px) - Force 2 columns */
        @media (max-width: 1024px) {
            .hot-products-grid,
            .skeleton-grid {
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 16px;
            }
        }

        /* Mobile (max-width: 768px) - Force exactly 2 columns with !important */
        @media (max-width: 768px) {
            .hot-products-section {
                padding: 0 12px;
                margin: 24px auto;
            }

            .hot-products-header h2 {
                font-size: 22px;
            }

            /* FORCE 2 COLUMNS - OVERRIDES EVERYTHING */
            .hot-products-grid,
            .skeleton-grid {
                display: grid !important;
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 12px !important;
                width: 100% !important;
            }

            .hot-product-card,
            .hot-product-card.skeleton {
                width: 100% !important;
                min-width: 0 !important;
                border-radius: 12px;
            }

            .hot-product-info {
                padding: 12px;
            }

            .hot-product-image {
                aspect-ratio: 1 / 1;
                padding-top: 0;
                height: auto;
            }

            .hot-product-image img {
                position: relative;
                height: auto;
                aspect-ratio: 1 / 1;
            }

            .hot-product-name {
                font-size: 14px;
                -webkit-line-clamp: 2;
                min-height: 38px;
            }

            .hot-product-brand {
                font-size: 11px;
            }

            .hot-current-price {
                font-size: 16px;
            }

            .hot-original-price {
                font-size: 12px;
            }

            .hot-product-rating {
                font-size: 12px;
            }

            .hot-btn-cart {
                font-size: 12px;
                padding: 8px 12px;
            }

            .hot-btn-cart i {
                font-size: 12px;
            }

            .hot-btn-view {
                padding: 8px 12px;
                font-size: 12px;
            }

            .hot-product-wishlist {
                width: 32px;
                height: 32px;
                font-size: 14px;
                top: 8px;
                right: 8px;
            }

            .hot-product-discount {
                font-size: 10px;
                padding: 3px 10px;
                top: 8px;
                left: 8px;
            }

            /* Skeleton responsive */
            .skeleton-name {
                height: 16px;
                width: 80%;
            }
            .skeleton-brand {
                height: 12px;
                width: 50%;
            }
            .skeleton-current-price {
                height: 18px;
                width: 60px;
            }
            .skeleton-original-price {
                height: 14px;
                width: 50px;
            }
            .skeleton-btn-cart {
                height: 32px;
            }
            .skeleton-btn-view {
                height: 32px;
                width: 38px;
            }
        }

        /* Small phones (max-width: 480px) - Keep 2 columns with tighter spacing */
        @media (max-width: 480px) {
            .hot-products-section {
                padding: 0 8px !important;
                margin: 16px auto !important;
            }

            .hot-products-grid,
            .skeleton-grid {
                gap: 8px !important;
            }

            .hot-product-info {
                padding: 8px !important;
            }

            .hot-product-name {
                font-size: 12px !important;
                min-height: 32px !important;
            }

            .hot-current-price {
                font-size: 14px !important;
            }

            .hot-original-price {
                font-size: 10px !important;
            }

            .hot-product-rating {
                font-size: 10px !important;
            }

            .hot-btn-cart {
                font-size: 10px !important;
                padding: 6px 8px !important;
            }

            .hot-btn-cart i {
                display: none !important;
            }

            .hot-btn-view {
                padding: 6px 8px !important;
                font-size: 10px !important;
                min-width: 30px !important;
            }

            .hot-product-wishlist {
                width: 28px !important;
                height: 28px !important;
                font-size: 12px !important;
                top: 6px !important;
                right: 6px !important;
            }

            .hot-product-discount {
                font-size: 8px !important;
                padding: 2px 8px !important;
                top: 6px !important;
                left: 6px !important;
            }

            .hot-products-header h2 {
                font-size: 18px !important;
            }

            .hot-products-header .hot-view-all {
                font-size: 12px !important;
                padding: 6px 14px !important;
            }

            /* Skeleton small phones */
            .skeleton-name {
                height: 14px !important;
            }
            .skeleton-brand {
                height: 10px !important;
            }
            .skeleton-current-price {
                height: 16px !important;
                width: 50px !important;
            }
            .skeleton-original-price {
                height: 12px !important;
                width: 40px !important;
            }
            .skeleton-stars {
                height: 12px !important;
                width: 60px !important;
            }
            .skeleton-reviews {
                height: 10px !important;
                width: 30px !important;
            }
            .skeleton-btn-cart {
                height: 28px !important;
            }
            .skeleton-btn-view {
                height: 28px !important;
                width: 32px !important;
            }
        }
    `;
    document.head.appendChild(style);
}

// ============================================================
// 11. INITIALIZE HOT PRODUCTS
// ============================================================

async function initHotProducts(containerId = 'hotProducts', limit = 8) {
    // Inject styles
    injectHotStyles();

    // Get container
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`⚠️ Container #${containerId} not found. Hot products not initialized.`);
        return;
    }

    // Show skeleton loader
    renderHotSkeletonLoader(containerId);

    // Fetch hot products
    let products = await fetchHotProducts();

    // Apply limit if specified
    if (limit > 0 && products.length > limit) {
        products = products.slice(0, limit);
    }

    // Re-render with products
    await renderHotProducts(products, containerId);

    // Expose functions globally for onclick handlers
    window.toggleWishlist = toggleWishlist;
    window.addToCart = addToCart;

    console.log('✅ Hot products initialized with', products.length, 'products');
}

// ============================================================
// 12. AUTO-INITIALIZE ON DOM READY
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Check if hot products container exists
    const container = document.getElementById('hotProducts');
    if (container) {
        // Auto-initialize
        initHotProducts('hotProducts', 8);
    } else {
        // Check for alternative container IDs
        const altContainers = ['hotProductsGrid', 'featuredHot', 'hotProductsContainer'];
        for (const id of altContainers) {
            const alt = document.getElementById(id);
            if (alt) {
                initHotProducts(id, 8);
                break;
            }
        }
    }
});

// ============================================================
// 13. EXPOSE FOR USE IN OTHER SCRIPTS
// ============================================================

window.hotProducts = {
    init: initHotProducts,
    fetch: fetchHotProducts,
    render: renderHotProducts,
    addToCart: addToCart,
    toggleWishlist: toggleWishlist,
    showToast: showToast,
    getSupabaseClient: getHotSupabaseClient
};

console.log('✅ Hot Products System Loaded');
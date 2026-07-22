/**
 * ============================================================
 * CATEGORY SHOWCASE - Smartphones & Tablets Style
 * Displays products from any category with modern layout
 * Includes countdown timer and product grid
 * ============================================================
 */

(function() {
    'use strict';

    const showcaseCONFIG = {
        maxProducts: 8,
        countdownTarget: null // Will be set to 24 hours from now
    };

    // ============================================================
    // 1. SUPABASE CLIENT
    // ============================================================

    function getSupabaseClient() {
        if (window.supabaseClient) return window.supabaseClient;
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            const client = supabase.createClient(
                'https://bulprhgwuwatzobiojwz.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bHByaGd3dXdhdHpvYmlvand6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDczNDksImV4cCI6MjA5MjA4MzM0OX0.2fcHrGX7iXw5G9nGRNkBy70W1Ex_om1C0v3qbryPmvw'
            );
            window.supabaseClient = client;
            return client;
        }
        return null;
    }

    // ============================================================
    // 2. FETCH PRODUCTS
    // ============================================================

    async function fetchProductsByCategoryOrBrand(filterType, filterValue) {
        const client = getSupabaseClient();
        if (!client) return [];

        try {
            let query = client
                .from('products')
                .select('*');

            if (filterType === 'category') {
                query = query.eq('category', filterValue);
            } else if (filterType === 'brand') {
                query = query.eq('brand', filterValue);
            } else if (filterType === 'deals') {
                query = query.eq('isDeal', true);
            } else {
                query = query.order('created_at', { ascending: false }).limit(showcaseCONFIG.maxProducts);
            }

            const { data, error } = await query
                .order('created_at', { ascending: false })
                .limit(showcaseCONFIG.maxProducts);

            if (error) throw error;

            const products = (data || []).map(p => {
                if (typeof p.variants === 'string') {
                    try { p.variants = JSON.parse(p.variants); } catch (e) { p.variants = []; }
                }
                if (typeof p.images === 'string') {
                    try { p.images = JSON.parse(p.images); } catch (e) { p.images = [p.image]; }
                }
                return p;
            });

            return products;

        } catch (err) {
            console.error('❌ Error fetching products:', err.message);
            return [];
        }
    }

    // ============================================================
    // 3. FETCH RANDOM PRODUCT IMAGES FOR HERO
    // ============================================================

    async function fetchRandomProductImages(count = 5) {
        const client = getSupabaseClient();
        if (!client) return [];

        try {
            const { data, error } = await client
                .from('products')
                .select('image, id')
                .not('image', 'is', null)
                .limit(20);

            if (error) throw error;

            // Shuffle and pick random images
            const shuffled = shuffleArray(data || []);
            const selected = shuffled.slice(0, count);
            return selected.map(p => p.image);
        } catch (err) {
            console.error('❌ Error fetching hero images:', err.message);
            return [];
        }
    }

    // ============================================================
    // 4. SHUFFLE ARRAY
    // ============================================================

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // ============================================================
    // 5. COUNTDOWN TIMER
    // ============================================================

    function startCountdown(targetDate, elementId = 'countdownTimer') {
        const container = document.getElementById(elementId);
        if (!container) return;

        function updateTimer() {
            const now = new Date().getTime();
            const distance = targetDate - now;

            if (distance < 0) {
                container.innerHTML = `
                    <span class="countdown-expired">🎉 Offer Expired!</span>
                `;
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            container.innerHTML = `
                <span class="countdown-unit">
                    <span class="countdown-number">${String(days).padStart(2, '0')}</span>
                    <span class="countdown-label">Days</span>
                </span>
                <span class="countdown-unit">
                    <span class="countdown-number">${String(hours).padStart(2, '0')}</span>
                    <span class="countdown-label">Hours</span>
                </span>
                <span class="countdown-unit">
                    <span class="countdown-number">${String(minutes).padStart(2, '0')}</span>
                    <span class="countdown-label">Mins</span>
                </span>
                <span class="countdown-unit">
                    <span class="countdown-number">${String(seconds).padStart(2, '0')}</span>
                    <span class="countdown-label">Secs</span>
                </span>
            `;
        }

        updateTimer();
        setInterval(updateTimer, 1000);
    }

    // ============================================================
    // 6. HERO SLIDER (Multi-image Background)
    // ============================================================

    function initHeroSlider(images, containerId = 'heroSliderContainer') {
        const container = document.getElementById(containerId);
        if (!container || !images || images.length === 0) return;

        // Clear existing slides
        const slidesContainer = container.querySelector('.hero-slides');
        if (!slidesContainer) return;

        slidesContainer.innerHTML = '';

        // Add slides
        images.forEach((img, index) => {
            const slide = document.createElement('div');
            slide.className = `hero-slide ${index === 0 ? 'active' : ''}`;
            slide.style.backgroundImage = `url(${img})`;
            slidesContainer.appendChild(slide);
        });

        // Auto-rotate
        let currentIndex = 0;
        const totalSlides = images.length;

        setInterval(() => {
            const slides = slidesContainer.querySelectorAll('.hero-slide');
            slides.forEach(s => s.classList.remove('active'));
            currentIndex = (currentIndex + 1) % totalSlides;
            slides[currentIndex].classList.add('active');
        }, 4000);
    }

    // ============================================================
    // 7. RENDER PRODUCTS
    // ============================================================

    function renderProducts(products, containerId = 'categoryProducts', title = '') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`⚠️ Container #${containerId} not found`);
            return;
        }

        if (!products || products.length === 0) {
            container.innerHTML = `
                <div class="category-empty">
                    <p>No products available in this category</p>
                </div>
            `;
            return;
        }

        let html = '';
        products.forEach((product, index) => {
            const image = product.image || product.images?.[0] || 'https://placehold.co/300x300/6C3CE1/FFFFFF?text=Product';
            const price = product.price || 0;
            const originalPrice = product.originalPrice || price;
            const discount = product.discount || 0;
            const rating = product.rating || 0;
            const isDeal = product.isDeal || discount > 0;
            const isNew = product.isNew || false;
            const isHot = product.isHot || false;

            let discountPercent = discount;
            if (!discountPercent && originalPrice > price && originalPrice > 0) {
                discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
            }

            const starsHtml = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));

            // Badge
            let badge = '';
            if (isDeal && discountPercent > 0) {
                badge = `<span class="category-badge deal">-${discountPercent}%</span>`;
            } else if (isNew) {
                badge = `<span class="category-badge new">✨ New</span>`;
            } else if (isHot) {
                badge = `<span class="category-badge hot">⚡ Hot</span>`;
            }

            html += `
                <div class="category-product-card" onclick="window.location.href='item.html?product=${product.id}'">
                    <div class="category-product-image">
                        <img src="${image}" alt="${product.name || 'Product'}" loading="lazy"
                             onerror="this.src='https://placehold.co/300x300/6C3CE1/FFFFFF?text=Product'">
                        ${badge}
                    </div>
                    <div class="category-product-info">
                        <h4 class="category-product-name">${product.name || 'Unknown Product'}</h4>
                        ${product.brand ? `<p class="category-product-brand">${product.brand}</p>` : ''}
                        <div class="category-product-rating">
                            <span class="stars">${starsHtml}</span>
                            <span class="rating-count">(${product.reviewCount || 0})</span>
                        </div>
                        <div class="category-product-price">
                            <span class="current-price">${formatPrice(price)}</span>
                            ${isDeal && originalPrice > price ? 
                                `<span class="original-price">${formatPrice(originalPrice)}</span>` : ''}
                        </div>
                        <button class="category-add-btn" onclick="event.stopPropagation(); window.addToCategoryCart('${product.id}')">
                            <i class="fas fa-shopping-bag"></i> Add
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // ============================================================
    // 8. FORMAT PRICE
    // ============================================================

    function formatPrice(price) {
        if (price >= 1000000) {
            return (price / 1000000).toFixed(0) + 'M FCFA';
        } else if (price >= 1000) {
            return (price / 1000).toFixed(0) + 'K FCFA';
        }
        return price.toFixed(0) + ' FCFA';
    }

    // ============================================================
    // 9. ADD TO CART
    // ============================================================

    async function addToCategoryCart(productId) {
        try {
            const client = getSupabaseClient();
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
                showCategoryToast('❌ Product not found', 'error');
                return;
            }

            let cart = JSON.parse(localStorage.getItem('st_cart') || '[]');
            const existing = cart.find(item => item.product_id === productId || item.id === productId);

            if (existing) {
                existing.qty = (existing.qty || 0) + 1;
            } else {
                cart.push({
                    product_id: productId,
                    id: productId,
                    name: product.name || 'Unknown',
                    price: product.price || 0,
                    qty: 1,
                    image: product.image || 'https://placehold.co/400x400',
                    variants: product.variants || {},
                    brand: product.brand || '',
                    isDeal: product.isDeal || false,
                    originalPrice: product.originalPrice || null,
                    discount: product.discount || null
                });
            }

            localStorage.setItem('st_cart', JSON.stringify(cart));

            const customerId = window.getCurrentCustomerId ? window.getCurrentCustomerId() : null;
            if (customerId && window.saveCartToDB) {
                await window.saveCartToDB(customerId, cart);
            }

            if (window.STHeader) {
                window.STHeader.AppState.cart = cart;
                if (window.STHeader.updateCounts) {
                    window.STHeader.updateCounts();
                }
            }

            showCategoryToast(`✅ ${product.name || 'Product'} added!`, 'success');
        } catch (err) {
            console.error('❌ Add to cart error:', err);
            showCategoryToast('❌ Failed to add', 'error');
        }
    }

    // ============================================================
    // 10. TOAST NOTIFICATION
    // ============================================================

    function showCategoryToast(message, type = 'success') {
        const existing = document.querySelector('.category-toast');
        if (existing) existing.remove();

        const colors = {
            success: '#10B981',
            error: '#EF4444',
            info: '#3B82F6',
            warning: '#F59E0B'
        };

        const toast = document.createElement('div');
        toast.className = 'category-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            padding: 14px 24px;
            background: ${colors[type] || colors.success};
            color: white;
            border-radius: 12px;
            font-weight: 600;
            font-size: 14px;
            z-index: 30000;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            max-width: 90%;
            text-align: center;
            animation: categoryToastUp 0.3s ease;
            font-family: 'Inter', sans-serif;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        if (!document.getElementById('categoryToastStyle')) {
            const style = document.createElement('style');
            style.id = 'categoryToastStyle';
            style.textContent = `
                @keyframes categoryToastUp {
                    from { transform: translateX(-50%) translateY(20px); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-20px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ============================================================
    // 11. INJECT STYLES
    // ============================================================

    function injectCategoryStyles() {
        const styleId = 'categoryShowcaseStyles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* ============================================
               CATEGORY SHOWCASE STYLES
               ============================================ */

            .category-showcase {
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 24px;
            }

            /* ----- Hero Banner with Slider ----- */
            .category-hero {
                border-radius: 20px;
                padding: 40px 48px;
                color: white;
                margin-bottom: 32px;
                position: relative;
                overflow: hidden;
                min-height: 320px;
            }

            .category-hero .hero-slider-container {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                overflow: hidden;
                border-radius: 20px;
                z-index: 0;
            }

            .category-hero .hero-slides {
                display: flex;
                width: 100%;
                height: 100%;
            }

            .category-hero .hero-slide {
                min-width: 100%;
                height: 100%;
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
                opacity: 0;
                transition: opacity 1.2s ease;
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
            }

            .category-hero .hero-slide.active {
                opacity: 1;
            }

            .category-hero .hero-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.5) 60%, rgba(15,23,42,0.3) 100%);
                z-index: 1;
                border-radius: 20px;
            }

            .category-hero .hero-content {
                position: relative;
                z-index: 2;
                max-width: 650px;
            }

            .category-hero .hero-badge {
                display: inline-block;
                background: linear-gradient(135deg, #EF4444, #DC2626);
                color: white;
                padding: 6px 18px;
                border-radius: 50px;
                font-size: 12px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                margin-bottom: 16px;
                box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
            }

            .category-hero h2 {
                font-size: 38px;
                font-weight: 800;
                margin-bottom: 8px;
                text-shadow: 0 2px 20px rgba(0,0,0,0.2);
                line-height: 1.1;
            }

            .category-hero p {
                font-size: 16px;
                opacity: 0.9;
                margin-bottom: 16px;
                line-height: 1.7;
                max-width: 500px;
            }

            .category-hero .countdown-timer {
                display: flex;
                gap: 16px;
                margin: 16px 0 20px;
                flex-wrap: wrap;
            }

            .category-hero .countdown-timer .countdown-unit {
                display: flex;
                flex-direction: column;
                align-items: center;
                background: rgba(255,255,255,0.12);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                padding: 10px 20px;
                border-radius: 14px;
                min-width: 70px;
                border: 1px solid rgba(255,255,255,0.08);
            }

            .category-hero .countdown-timer .countdown-number {
                font-size: 32px;
                font-weight: 800;
                color: #fff;
                font-variant-numeric: tabular-nums;
                line-height: 1;
            }

            .category-hero .countdown-timer .countdown-label {
                font-size: 10px;
                text-transform: uppercase;
                opacity: 0.7;
                letter-spacing: 0.8px;
                margin-top: 4px;
            }

            .category-hero .countdown-timer .countdown-expired {
                font-size: 20px;
                font-weight: 700;
                color: #EF4444;
                background: rgba(239, 68, 68, 0.15);
                padding: 10px 24px;
                border-radius: 12px;
                backdrop-filter: blur(4px);
            }

            .category-hero .hero-actions {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
            }

            .category-hero .hero-btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 14px 36px;
                background: linear-gradient(135deg, #7C3AED, #6D28D9);
                color: white;
                border: none;
                border-radius: 50px;
                font-weight: 700;
                font-size: 16px;
                cursor: pointer;
                text-decoration: none;
                transition: all 0.3s ease;
                box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4);
            }

            .category-hero .hero-btn:hover {
                transform: translateY(-3px) scale(1.02);
                box-shadow: 0 8px 40px rgba(124, 58, 237, 0.5);
            }

            .category-hero .hero-btn-secondary {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 14px 28px;
                background: rgba(255,255,255,0.1);
                backdrop-filter: blur(8px);
                color: white;
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 50px;
                font-weight: 600;
                font-size: 16px;
                cursor: pointer;
                text-decoration: none;
                transition: all 0.3s ease;
            }

            .category-hero .hero-btn-secondary:hover {
                background: rgba(255,255,255,0.2);
                transform: translateY(-2px);
            }

            /* ----- Products Grid ----- */
            .category-products-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                gap: 20px;
            }

            /* ----- Product Card ----- */
            .category-product-card {
                background: white;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                transition: all 0.3s ease;
                cursor: pointer;
                border: 1px solid #f0f0f0;
            }

            .category-product-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 30px rgba(0,0,0,0.1);
                border-color: #7C3AED;
            }

            .category-product-image {
                position: relative;
                width: 100%;
                padding-top: 100%;
                overflow: hidden;
                background: #f8fafc;
            }

            .category-product-image img {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.3s ease;
            }

            .category-product-card:hover .category-product-image img {
                transform: scale(1.05);
            }

            .category-badge {
                position: absolute;
                top: 8px;
                left: 8px;
                padding: 3px 12px;
                border-radius: 50px;
                font-size: 11px;
                font-weight: 700;
                z-index: 2;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .category-badge.deal {
                background: linear-gradient(135deg, #EF4444, #DC2626);
                color: white;
            }

            .category-badge.new {
                background: linear-gradient(135deg, #10B981, #059669);
                color: white;
            }

            .category-badge.hot {
                background: linear-gradient(135deg, #F59E0B, #D97706);
                color: white;
            }

            .category-product-info {
                padding: 14px 16px;
            }

            .category-product-name {
                font-weight: 700;
                font-size: 14px;
                color: #0F172A;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                margin: 0 0 2px;
                line-height: 1.3;
            }

            .category-product-brand {
                font-size: 12px;
                color: #94A3B8;
                margin: 0 0 4px;
            }

            .category-product-rating {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 12px;
                margin-bottom: 4px;
            }

            .category-product-rating .stars {
                color: #F59E0B;
                letter-spacing: 1px;
            }

            .category-product-rating .rating-count {
                color: #94A3B8;
                font-size: 11px;
            }

            .category-product-price {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
                margin-bottom: 10px;
            }

            .category-product-price .current-price {
                font-weight: 700;
                font-size: 17px;
                color: #0F172A;
            }

            .category-product-price .original-price {
                font-size: 13px;
                color: #94A3B8;
                text-decoration: line-through;
            }

            .category-add-btn {
                width: 100%;
                padding: 9px 14px;
                background: linear-gradient(135deg, #0F172A, #1E293B);
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

            .category-add-btn:hover {
                background: linear-gradient(135deg, #7C3AED, #6D28D9);
                transform: scale(1.02);
                box-shadow: 0 4px 16px rgba(124, 58, 237, 0.3);
            }

            .category-add-btn i {
                font-size: 13px;
            }

            /* ----- Empty State ----- */
            .category-empty {
                text-align: center;
                padding: 60px 20px;
                color: #94A3B8;
                grid-column: 1 / -1;
            }

            /* ----- Responsive ----- */
            @media (max-width: 768px) {
                .category-showcase {
                    padding: 0 16px;
                }

                .category-hero {
                    padding: 28px 24px;
                    min-height: 280px;
                }

                .category-hero h2 {
                    font-size: 26px;
                }

                .category-hero p {
                    font-size: 14px;
                    max-width: 100%;
                }

                .category-hero .countdown-timer {
                    gap: 10px;
                }

                .category-hero .countdown-timer .countdown-unit {
                    min-width: 56px;
                    padding: 8px 14px;
                }

                .category-hero .countdown-timer .countdown-number {
                    font-size: 24px;
                }

                .category-hero .hero-btn {
                    padding: 12px 28px;
                    font-size: 14px;
                }

                .category-hero .hero-btn-secondary {
                    padding: 12px 24px;
                    font-size: 14px;
                }

                .category-products-grid {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 14px;
                }
            }

            @media (max-width: 480px) {
                .category-hero {
                    padding: 20px 16px;
                    min-height: 240px;
                }

                .category-hero h2 {
                    font-size: 22px;
                }

                .category-hero .countdown-timer .countdown-unit {
                    min-width: 44px;
                    padding: 6px 10px;
                }

                .category-hero .countdown-timer .countdown-number {
                    font-size: 18px;
                }

                .category-hero .countdown-timer .countdown-label {
                    font-size: 8px;
                }

                .category-hero .hero-actions {
                    flex-direction: column;
                    width: 100%;
                }

                .category-hero .hero-btn,
                .category-hero .hero-btn-secondary {
                    justify-content: center;
                    width: 100%;
                }

                .category-products-grid {
                    gap: 10px;
                }

                .category-product-info {
                    padding: 10px 12px;
                }

                .category-product-name {
                    font-size: 12px;
                    -webkit-line-clamp: 1;
                }

                .category-product-brand {
                    font-size: 10px;
                }

                .category-product-price .current-price {
                    font-size: 14px;
                }

                .category-product-price .original-price {
                    font-size: 11px;
                }

                .category-add-btn {
                    font-size: 11px;
                    padding: 7px 10px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // ============================================================
    // 12. MAIN INITIALIZATION
    // ============================================================

    async function initCategoryShowcase(containerId = 'categoryShowcase', options = {}) {
        injectCategoryStyles();

        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`⚠️ Container #${containerId} not found`);
            return;
        }

        // Parse options
        const filterType = options.filterType || 'category';
        const filterValue = options.filterValue || 'smartphone';
        const title = options.title || 'Smartphones & Tablets';
        const subtitle = options.subtitle || 'Hurry! Take advantage of discounts of up to 50% on our collection.';
        const badge = options.badge || '🔥 Limited Time Offer';
        const countdownHours = options.countdownHours || 24;
        const viewAllLink = options.viewAllLink || 'category.html?category=' + encodeURIComponent(filterValue);
        const ctaText = options.ctaText || 'Shop Now →';
        const ctaSecondaryText = options.ctaSecondaryText || 'View All';
        const showHero = options.showHero !== false;

        // Show loading
        container.innerHTML = `
            <div class="category-showcase">
                <div style="text-align:center;padding:60px 20px;">
                    <div style="width:48px;height:48px;border:4px solid #E2E8F0;border-top-color:#7C3AED;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>
                    <p style="color:#94A3B8;font-weight:500;">Loading products...</p>
                </div>
                <style>
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                </style>
            </div>
        `;

        try {
            // Fetch products
            let products = [];
            let heroImages = [];

            if (filterType === 'category' || filterType === 'brand' || filterType === 'deals') {
                products = await fetchProductsByCategoryOrBrand(filterType, filterValue);
            } else {
                // Random products
                const allProducts = await fetchProductsByCategoryOrBrand('all', '');
                products = allProducts.slice(0, showcaseCONFIG.maxProducts);
            }

            // Fetch random product images for hero (up to 6 images)
            const randomImages = await fetchRandomProductImages(6);
            heroImages = randomImages.length > 0 ? randomImages : [
                'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&q=80',
                'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80',
                'https://images.unsplash.com/photo-1517994112540-009c47ea476b?w=1200&q=80',
                'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=1200&q=80'
            ];

            // Set countdown target
            const targetDate = new Date().getTime() + (countdownHours * 60 * 60 * 1000);

            // Build hero slides HTML
            let slidesHtml = heroImages.map((img, index) => `
                <div class="hero-slide ${index === 0 ? 'active' : ''}" style="background-image: url('${img}');"></div>
            `).join('');

            // Build HTML
            let html = `
                <div class="category-showcase">
            `;

            if (showHero) {
                html += `
                    <div class="category-hero">
                        <div class="hero-slider-container">
                            <div class="hero-slides">
                                ${slidesHtml}
                            </div>
                        </div>
                        <div class="hero-overlay"></div>
                        <div class="hero-content">
                            ${badge ? `<span class="hero-badge">${badge}</span>` : ''}
                            <h2>${title}</h2>
                            <p>${subtitle}</p>
                            <div class="countdown-timer" id="countdownTimer">
                                <!-- Will be populated by JavaScript -->
                            </div>
                            <div class="hero-actions">
                                <a href="${viewAllLink}" class="hero-btn">
                                    ${ctaText}
                                </a>
                                <a href="${viewAllLink}" class="hero-btn-secondary">
                                    ${ctaSecondaryText}
                                </a>
                            </div>
                        </div>
                    </div>
                `;
            }

            html += `
                    <div class="category-products-grid" id="categoryProducts">
                        <!-- Will be populated by JavaScript -->
                    </div>
                </div>
            `;

            container.innerHTML = html;

            // Start countdown
            if (showHero) {
                startCountdown(targetDate, 'countdownTimer');
            }

            // Render products
            renderProducts(products, 'categoryProducts', title);

            // Expose functions
            window.addToCategoryCart = addToCategoryCart;

            console.log(`✅ Category Showcase initialized: ${products.length} products, filter: ${filterType}=${filterValue}, ${heroImages.length} hero images`);

        } catch (err) {
            console.error('❌ Error initializing category showcase:', err);
            container.innerHTML = `
                <div class="category-showcase">
                    <div style="text-align:center;padding:60px 20px;color:#EF4444;">
                        <p style="font-size:18px;font-weight:600;">Error loading products</p>
                        <p style="color:#94A3B8;margin-top:8px;">Please try again later</p>
                        <button onclick="location.reload()" style="margin-top:16px;padding:10px 24px;background:#7C3AED;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-family:inherit;">
                            <i class="fas fa-sync"></i> Retry
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // ============================================================
    // 13. AUTO-DETECT CATEGORY FROM URL
    // ============================================================

    function detectCategoryFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const category = params.get('category');
        const brand = params.get('brand');
        const type = params.get('type');

        if (category) {
            return { filterType: 'category', filterValue: category };
        } else if (brand) {
            return { filterType: 'brand', filterValue: brand };
        } else if (type === 'deals') {
            return { filterType: 'deals', filterValue: '' };
        }
        return null;
    }

    // ============================================================
    // 14. EXPOSE GLOBALLY
    // ============================================================

    window.CategoryShowcase = {
        init: initCategoryShowcase,
        fetchProducts: fetchProductsByCategoryOrBrand,
        renderProducts: renderProducts,
        addToCart: addToCategoryCart,
        startCountdown: startCountdown,
        detectCategory: detectCategoryFromUrl,
        fetchHeroImages: fetchRandomProductImages
    };

    // ============================================================
    // 15. AUTO-INITIALIZE ON DOM READY
    // ============================================================

    document.addEventListener('DOMContentLoaded', function() {
        const container = document.getElementById('categoryShowcase');
        if (!container) return;

        // Check for data attributes
        const filterType = container.dataset.filterType || 'category';
        const filterValue = container.dataset.filterValue || 'smartphone';
        const title = container.dataset.title || 'Smartphones & Tablets';
        const subtitle = container.dataset.subtitle || 'Hurry! Take advantage of discounts of up to 50% on our collection.';
        const badge = container.dataset.badge || '🔥 Limited Time Offer';
        const countdownHours = parseInt(container.dataset.countdownHours) || 24;
        const viewAllLink = container.dataset.viewAllLink || 'category.html?category=' + encodeURIComponent(filterValue);
        const ctaText = container.dataset.ctaText || 'Shop Now →';
        const ctaSecondaryText = container.dataset.ctaSecondaryText || 'View All';
        const showHero = container.dataset.showHero !== 'false';

        // Auto-detect from URL if available
        const detected = detectCategoryFromUrl();
        const finalFilterType = detected?.filterType || filterType;
        const finalFilterValue = detected?.filterValue || filterValue;

        initCategoryShowcase('categoryShowcase', {
            filterType: finalFilterType,
            filterValue: finalFilterValue,
            title: title,
            subtitle: subtitle,
            badge: badge,
            countdownHours: countdownHours,
            viewAllLink: viewAllLink,
            ctaText: ctaText,
            ctaSecondaryText: ctaSecondaryText,
            showHero: showHero
        });
    });

    console.log('✅ Category Showcase Component Loaded');
})();
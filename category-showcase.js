/**
 * ============================================================
 * CATEGORY SHOWCASE - Smartphones & Tablets Style
 * Displays products from any category with modern layout
 * Includes countdown timer and product grid
 * NOW ONLY USES Supabase CONFIG - NO URL PARAMETERS
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. DEFAULT CONFIG (Hardcoded Fallback)
    // ============================================================

    const DEFAULT_CONFIG = {
        filterType: 'category',
        filterValue: 'smartphone',
        title: 'Smartphones & Tablets',
        subtitle: 'Hurry! Take advantage of discounts of up to 50% on our collection.',
        badge: '🔥 Limited Time Offer',
        countdownHours: 24,
        viewAllLink: '/category/?category=smartphone',
        ctaText: 'Shop Now →',
        ctaSecondaryText: 'View All',
        showHero: true,
        maxProducts: 8,
        heroImages: [
            'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&q=80',
            'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80',
            'https://images.unsplash.com/photo-1517994112540-009c47ea476b?w=1200&q=80',
            'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=1200&q=80'
        ]
    };

    let cachedConfig = null;
    let cachedCategories = [];
    let cachedBrands = [];
   


    // ============================================================
    // 2.5 FETCH DISTINCT CATEGORIES AND BRANDS
    // ============================================================

    async function fetchDistinctCategories() {
        if (cachedCategories.length > 0) return cachedCategories;

        const client = getSupabaseClient();
        if (!client) return [];

        try {
            const { data, error } = await client
                .from('products')
                .select('category')
                .not('category', 'is', null)
                .not('category', 'eq', '');

            if (error) throw error;

            const categories = [...new Set(data.map(item => item.category))].sort();
            cachedCategories = categories;
            return categories;
        } catch (err) {
            console.error('❌ Error fetching categories:', err.message);
            return [];
        }
    }

    async function fetchDistinctBrands() {
        if (cachedBrands.length > 0) return cachedBrands;

        const client = getSupabaseClient();
        if (!client) return [];

        try {
            const { data, error } = await client
                .from('products')
                .select('brand')
                .not('brand', 'is', null)
                .not('brand', 'eq', '');

            if (error) throw error;

            const brands = [...new Set(data.map(item => item.brand))].sort();
            cachedBrands = brands;
            return brands;
        } catch (err) {
            console.error('❌ Error fetching brands:', err.message);
            return [];
        }
    }

    // ============================================================
    // 3. FETCH CONFIG FROM SUPABASE (ONLY SOURCE OF TRUTH)
    // ============================================================

    async function fetchShowcaseConfig() {
        if (cachedConfig) return cachedConfig;

        const client = getSupabaseClient();
        if (!client) {
            console.warn('⚠️ Supabase not available, using default config');
            cachedConfig = DEFAULT_CONFIG;
            return DEFAULT_CONFIG;
        }

        try {
            const { data, error } = await client
                .from('category_showcase_config')
                .select('*')
                .eq('id', 1)
                .single();

            if (error) {
                console.warn('⚠️ No config found in Supabase, using default:', error.message);
                cachedConfig = DEFAULT_CONFIG;
                return DEFAULT_CONFIG;
            }

            if (!data) {
                console.warn('⚠️ No config data, using default');
                cachedConfig = DEFAULT_CONFIG;
                return DEFAULT_CONFIG;
            }

            let heroImages = DEFAULT_CONFIG.heroImages;
            if (data.hero_images) {
                if (Array.isArray(data.hero_images)) {
                    heroImages = data.hero_images;
                } else if (typeof data.hero_images === 'string') {
                    try {
                        heroImages = JSON.parse(data.hero_images);
                        if (!Array.isArray(heroImages)) {
                            heroImages = [data.hero_images];
                        }
                    } catch (parseError) {
                        heroImages = [data.hero_images];
                    }
                }
            }

            const config = {
                ...DEFAULT_CONFIG,
                filterType: data.filter_type || DEFAULT_CONFIG.filterType,
                filterValue: data.filter_value || DEFAULT_CONFIG.filterValue,
                title: data.title || DEFAULT_CONFIG.title,
                subtitle: data.subtitle || DEFAULT_CONFIG.subtitle,
                badge: data.badge || DEFAULT_CONFIG.badge,
                countdownHours: data.countdown_hours || DEFAULT_CONFIG.countdownHours,
                viewAllLink: data.view_all_link || DEFAULT_CONFIG.viewAllLink,
                ctaText: data.cta_text || DEFAULT_CONFIG.ctaText,
                ctaSecondaryText: data.cta_secondary_text || DEFAULT_CONFIG.ctaSecondaryText,
                showHero: data.show_hero !== undefined ? data.show_hero : DEFAULT_CONFIG.showHero,
                maxProducts: data.max_products || DEFAULT_CONFIG.maxProducts,
                heroImages
            };

            cachedConfig = config;
            console.log('✅ Category Showcase config loaded from Supabase');
            console.log(`📋 Filter: ${config.filterType} = "${config.filterValue}"`);
            return config;

        } catch (err) {
            console.error('❌ Error fetching config:', err);
            cachedConfig = DEFAULT_CONFIG;
            return DEFAULT_CONFIG;
        }
    }

    // ============================================================
    // 4. FETCH PRODUCTS BASED ON CONFIG
    // ============================================================

    async function fetchProductsByCategoryOrBrand(filterType, filterValue, maxProducts = 8) {
        const client = getSupabaseClient();
        if (!client) return [];

        try {
            let query = client
                .from('products')
                .select('*');

            // Filter based on config
            if (filterType === 'category' && filterValue) {
                query = query.eq('category', filterValue);
                console.log(`🔍 Filtering by category: "${filterValue}"`);
            } else if (filterType === 'brand' && filterValue) {
                query = query.eq('brand', filterValue);
                console.log(`🔍 Filtering by brand: "${filterValue}"`);
            } else if (filterType === 'deals') {
                query = query.eq('isDeal', true);
                console.log(`🔍 Filtering by deals`);
            } else if (filterType === 'all' || filterType === '') {
                query = query.order('created_at', { ascending: false });
                console.log(`🔍 Showing all latest products`);
            } else {
                query = query.order('created_at', { ascending: false });
            }

            const { data, error } = await query
                .order('created_at', { ascending: false })
                .limit(maxProducts);

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

            console.log(`✅ Found ${products.length} products matching filter`);
            return products;

        } catch (err) {
            console.error('❌ Error fetching products:', err.message);
            return [];
        }
    }

    // ============================================================
    // 5. FETCH RANDOM PRODUCT IMAGES FOR HERO
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

            const shuffled = shuffleArray(data || []);
            const selected = shuffled.slice(0, count);
            return selected.map(p => resolveProductImageUrl(p.image));
        } catch (err) {
            console.error('❌ Error fetching hero images:', err.message);
            return [];
        }
    }

    // ============================================================
    // 6. SHUFFLE ARRAY
    // ============================================================

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // ============================================================
    // 6.1. RESOLVE PRODUCT IMAGE URL
    // ============================================================

    function resolveProductImageUrl(image, placeholder = 'https://placehold.co/300x300/6C3CE1/FFFFFF?text=Product') {
        if (!image) return placeholder;

        const src = String(image).trim();
        if (!src) return placeholder;

        if (/^(https?:|data:|blob:)/i.test(src)) return src;
        if (src.startsWith('/')) return src;
        if (src.includes('supabase.co/storage/v1/object/public')) return src;

        const client = getSupabaseClient();
        if (!client) return placeholder;

        let objectPath = src;
        if (objectPath.startsWith('product-images/')) {
            objectPath = objectPath.slice('product-images/'.length);
        }
        if (objectPath.startsWith('public/')) {
            objectPath = objectPath.slice('public/'.length);
        }
        if (objectPath.startsWith('/')) {
            objectPath = objectPath.slice(1);
        }

        if (!objectPath.includes('/')) {
            objectPath = `products/${objectPath}`;
        }

        const { data, error } = client.storage.from('product-images').getPublicUrl(objectPath);
        if (error || !data?.publicUrl) {
            console.warn('⚠️ Unable to build Supabase public URL for image:', objectPath, error?.message || 'unknown error');
            return placeholder;
        }

        return data.publicUrl;
    }

    // ============================================================
    // 7. COUNTDOWN TIMER
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
    // 8. HERO SLIDER (Multi-image Background)
    // ============================================================

    function initHeroSlider(images, containerId = 'heroSliderContainer') {
        const container = document.getElementById(containerId);
        if (!container || !images || images.length === 0) return;

        const slidesContainer = container.querySelector('.hero-slides');
        if (!slidesContainer) return;

        slidesContainer.innerHTML = '';

        images.forEach((img, index) => {
            const slide = document.createElement('div');
            slide.className = `hero-slide ${index === 0 ? 'active' : ''}`;
            slide.style.backgroundImage = `url(${img})`;
            slidesContainer.appendChild(slide);
        });

        let currentIndex = 0;
        const totalSlides = images.length;

        setInterval(() => {
            const slides = slidesContainer.querySelectorAll('.hero-slide');
            slides.forEach(s => s.classList.remove('active'));
            currentIndex = (currentIndex + 1) % totalSlides;
            slides[currentIndex].classList.add('active');
        }, 2000);
    }

    // ============================================================
    // 9. RENDER PRODUCTS
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
                    <p>No products available matching the selected filter</p>
                    <p style="font-size:13px;margin-top:8px;color:#94A3B8;">Try changing the filter in the admin settings</p>
                </div>
            `;
            return;
        }

        let html = '';
        products.forEach((product, index) => {
            const image = resolveProductImageUrl(product.image || product.images?.[0], 'https://placehold.co/300x300/6C3CE1/FFFFFF?text=Product');
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

            let badge = '';
            if (isDeal && discountPercent > 0) {
                badge = `<span class="category-badge deal">-${discountPercent}%</span>`;
            } else if (isNew) {
                badge = `<span class="category-badge new">✨ New</span>`;
            } else if (isHot) {
                badge = `<span class="category-badge hot">⚡ Hot</span>`;
            }

            html += `
                <div class="category-product-card" onclick="window.location.href='/item/?product=${product.id}'">
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
                        <a href="/item/?id=${product.id}" class="st-btn-view">
                            <i class="fas fa-eye"></i>
                        </a>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // ============================================================
    // 10. FORMAT PRICE
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

            .category-products-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                gap: 20px;
            }

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

            .st-btn-view {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 6px 12px;
                background: #f1f5f9;
                color: #475569;
                border-radius: 8px;
                text-decoration: none;
                transition: all 0.2s ease;
                font-size: 13px;
            }

            .st-btn-view:hover {
                background: #7C3AED;
                color: white;
            }

            .category-empty {
                text-align: center;
                padding: 60px 20px;
                color: #94A3B8;
                grid-column: 1 / -1;
            }

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
            }
        `;
        document.head.appendChild(style);
    }

    // ============================================================
    // 12. MAIN INITIALIZATION - ONLY USES SUPABASE CONFIG
    // ============================================================

    async function initCategoryShowcase(containerId = 'categoryShowcase', options = {}) {
        injectCategoryStyles();

        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`⚠️ Container #${containerId} not found`);
            return;
        }

        // Fetch config from Supabase ONLY
        const config = await fetchShowcaseConfig();

        // Fetch distinct categories and brands from Supabase (for validation)
        const [categories, brands] = await Promise.all([
            fetchDistinctCategories(),
            fetchDistinctBrands()
        ]);

        console.log(`📋 Found ${categories.length} categories and ${brands.length} brands in Supabase`);

        // Use ONLY the config from Supabase - no URL params, no options override
        const finalConfig = {
            ...config,
            filterType: config.filterType,
            filterValue: config.filterValue,
            title: config.title,
            subtitle: config.subtitle,
            badge: config.badge,
            countdownHours: config.countdownHours,
            viewAllLink: config.viewAllLink,
            ctaText: config.ctaText,
            ctaSecondaryText: config.ctaSecondaryText,
            showHero: config.showHero,
            maxProducts: config.maxProducts,
            heroImages: config.heroImages
        };

        console.log(`🎯 Using config: ${finalConfig.filterType} = "${finalConfig.filterValue}"`);

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
            // Fetch products based on config
            let products = [];
            let heroImages = [];

            const filterType = finalConfig.filterType;
            const filterValue = finalConfig.filterValue;

            // Validate that the filter value exists in the fetched data
            let isValidFilter = false;
            if (filterType === 'category') {
                isValidFilter = categories.includes(filterValue);
                if (!isValidFilter) {
                    console.warn(`⚠️ Category "${filterValue}" not found in products. Using fallback.`);
                }
            } else if (filterType === 'brand') {
                isValidFilter = brands.includes(filterValue);
                if (!isValidFilter) {
                    console.warn(`⚠️ Brand "${filterValue}" not found in products. Using fallback.`);
                }
            } else if (filterType === 'deals' || filterType === 'all') {
                isValidFilter = true;
            }

            // If filter is invalid, use first available category or brand as fallback
            let effectiveFilterType = filterType;
            let effectiveFilterValue = filterValue;

            if (!isValidFilter && filterType !== 'deals' && filterType !== 'all') {
                if (filterType === 'category' && categories.length > 0) {
                    effectiveFilterValue = categories[0];
                    console.log(`🔄 Using fallback category: "${effectiveFilterValue}"`);
                } else if (filterType === 'brand' && brands.length > 0) {
                    effectiveFilterValue = brands[0];
                    console.log(`🔄 Using fallback brand: "${effectiveFilterValue}"`);
                }
            }

            // Fetch products with the (possibly fallback) filter
            if (filterType === 'category' || filterType === 'brand' || filterType === 'deals' || filterType === 'all') {
                products = await fetchProductsByCategoryOrBrand(
                    effectiveFilterType, 
                    effectiveFilterValue, 
                    finalConfig.maxProducts
                );
            } else {
                products = await fetchProductsByCategoryOrBrand('all', '', finalConfig.maxProducts);
            }

            // Use configured hero images or fetch random ones
            if (finalConfig.heroImages && finalConfig.heroImages.length > 0) {
                heroImages = finalConfig.heroImages;
            } else {
                const randomImages = await fetchRandomProductImages(6);
                heroImages = randomImages.length > 0 ? randomImages : DEFAULT_CONFIG.heroImages;
            }

            // Set countdown target
            const targetDate = new Date().getTime() + (finalConfig.countdownHours * 60 * 60 * 1000);

            // Build hero slides HTML
            let slidesHtml = heroImages.map((img, index) => `
                <div class="hero-slide ${index === 0 ? 'active' : ''}" style="background-image: url('${img}');"></div>
            `).join('');

            // Build HTML
            let html = `
                <div class="category-showcase">
            `;

            if (finalConfig.showHero) {
                html += `
                    <div class="category-hero">
                        <div class="hero-slider-container">
                            <div class="hero-slides">
                                ${slidesHtml}
                            </div>
                        </div>
                        <div class="hero-overlay"></div>
                        <div class="hero-content">
                            ${finalConfig.badge ? `<span class="hero-badge">${finalConfig.badge}</span>` : ''}
                            <h2>${finalConfig.title}</h2>
                            <p>${finalConfig.subtitle}</p>
                            <div class="countdown-timer" id="countdownTimer">
                                <!-- Will be populated by JavaScript -->
                            </div>
                            <div class="hero-actions">
                                <a href="${finalConfig.viewAllLink}" class="hero-btn">
                                    ${finalConfig.ctaText}
                                </a>
                                <a href="${finalConfig.viewAllLink}" class="hero-btn-secondary">
                                    ${finalConfig.ctaSecondaryText}
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
            if (finalConfig.showHero) {
                startCountdown(targetDate, 'countdownTimer');
                initHeroSlider(heroImages, containerId);
            }

            // Render products
            renderProducts(products, 'categoryProducts', finalConfig.title);

            console.log(`✅ Category Showcase initialized: ${products.length} products, filter: ${effectiveFilterType}=${effectiveFilterValue}, ${heroImages.length} hero images`);
            console.log(`📋 Config source: Supabase category_showcase_config (id=1)`);

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
    // 13. AUTO-INITIALIZE ON DOM READY - NO URL PARAMETERS
    // ============================================================

    document.addEventListener('DOMContentLoaded', function() {
        const container = document.getElementById('categoryShowcase');
        if (!container) return;

        console.log('🚀 Initializing Category Showcase from Supabase config ONLY...');
        
        // Initialize with NO options - only Supabase config will be used
        initCategoryShowcase('categoryShowcase', {});
    });

    console.log('✅ Category Showcase Component Loaded - Supabase Config ONLY');
    console.log('📌 URL parameters are IGNORED - only category_showcase_config (id=1) is used');
})();
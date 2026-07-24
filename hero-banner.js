/**
 * ============================================================
 * HERO BANNER - Featured Products Slider
 * Fetches featured products from Supabase and displays them
 * as a hero banner with smooth sliding animation
 * ============================================================
 */

// ============================================================
// 1. SUPABASE CONFIGURATION
// ============================================================

const HERO_SUPABASE_CONFIG = {
    url: 'https://bulprhgwuwatzobiojwz.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bHByaGd3dXdhdHpvYmlvand6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDczNDksImV4cCI6MjA5MjA4MzM0OX0.2fcHrGX7iXw5G9nGRNkBy70W1Ex_om1C0v3qbryPmvw'
};

let heroSupabaseClient = null;

function getHeroSupabaseClient() {
    if (heroSupabaseClient) return heroSupabaseClient;
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        heroSupabaseClient = supabase.createClient(HERO_SUPABASE_CONFIG.url, HERO_SUPABASE_CONFIG.anonKey);
        return heroSupabaseClient;
    }
    return null;
}

// ============================================================
// 2. FETCH FEATURED PRODUCTS
// ============================================================

async function fetchFeaturedProducts() {
    const client = getHeroSupabaseClient();
    if (!client) {
        console.warn('⚠️ Supabase not available for hero banner');
        return [];
    }

    try {
        const { data: featuredData, error: featuredError } = await client
            .from('featured_products')
            .select('product_id')
            .order('created_at', { ascending: true });

        if (featuredError) {
            console.error('❌ Error fetching featured products:', featuredError.message);
            return [];
        }

        if (!featuredData || featuredData.length === 0) {
            console.warn('⚠️ No featured products found');
            return [];
        }

        const productIds = featuredData.map(item => item.product_id);
        console.log('📦 Featured product IDs:', productIds);

        const { data: productsData, error: productsError } = await client
            .from('products')
            .select('*')
            .in('id', productIds);

        if (productsError) {
            console.error('❌ Error fetching product details:', productsError.message);
            return [];
        }

        const orderedProducts = productIds
            .map(id => productsData.find(p => p.id === id))
            .filter(p => p !== undefined);

        console.log(`✅ Loaded ${orderedProducts.length} featured products`);
        return orderedProducts;

    } catch (err) {
        console.error('❌ Error fetching featured products:', err.message);
        return [];
    }
}

// ============================================================
// 3. RENDER SKELETON LOADER
// ============================================================

function renderSkeletonLoader(containerId = 'heroBanner') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="hero-skeleton-wrapper">
            <div class="hero-skeleton-slide">
                <div class="hero-skeleton-content">
                    <div class="hero-skeleton-text">
                        <div class="skeleton-badge"></div>
                        <div class="skeleton-title"></div>
                        <div class="skeleton-brand"></div>
                        <div class="skeleton-price">
                            <div class="skeleton-current-price"></div>
                            <div class="skeleton-original-price"></div>
                            <div class="skeleton-discount"></div>
                        </div>
                        <div class="skeleton-description"></div>
                        <div class="skeleton-btn"></div>
                    </div>
                </div>
            </div>
            <div class="hero-skeleton-dots">
                <div class="skeleton-dot active"></div>
                <div class="skeleton-dot"></div>
                <div class="skeleton-dot"></div>
                <div class="skeleton-dot"></div>
            </div>
        </div>
    `;
}

// ============================================================
// 4. RENDER HERO BANNER
// ============================================================

function renderHeroBanner(products, containerId = 'heroBanner') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`⚠️ Container #${containerId} not found`);
        return;
    }

    if (!products || products.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px 20px;background:linear-gradient(135deg,#f8fafc,#e2e8f0);border-radius:16px;">
                <h2 style="color:#94A3B8;font-size:20px;">No featured products available</h2>
                <p style="color:#94A3B8;margin-top:8px;">Check back soon for our latest deals!</p>
            </div>
        `;
        return;
    }

    let html = `
        <div class="hero-slider" id="heroSlider">
            <div class="hero-slides" id="heroSlides">
    `;

    products.forEach((product, index) => {
        const image = product.image || product.images?.[0] || 'https://placehold.co/1200x600/6C3CE1/FFFFFF?text=Product';
        const price = product.price || 0;
        const isDeal = product.isDeal || false;
        const isNew = product.isNew || false;
        const isHot = product.isHot || false;
        const discount = product.discount || 0;
        const originalPrice = product.originalPrice || price;

        let badge = '';
        if (isDeal) badge = `<span class="hero-badge deal">🔥 Deal</span>`;
        else if (isNew) badge = `<span class="hero-badge new">✨ New</span>`;
        else if (isHot) badge = `<span class="hero-badge hot">⚡ Hot</span>`;

        let discountPercent = 0;
        if (discount > 0) {
            discountPercent = discount;
        } else if (originalPrice > price && originalPrice > 0) {
            discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
        }

        html += `
            <div class="hero-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
                <div class="hero-slide-content" style="background-image: linear-gradient(135deg, rgba(15,23,42,0.7) 0%, rgba(15,23,42,0.3) 100%), url('${image}');">
                    <div class="hero-text">
                        ${badge}
                        <h2 class="hero-title">${product.name || 'Featured Product'}</h2>
                        ${product.brand ? `<p class="hero-brand">${product.brand}</p>` : ''}
                        <div class="hero-price">
                            <span class="hero-current-price">$${price.toFixed(2)}</span>
                            ${discountPercent > 0 ? `
                                <span class="hero-original-price">$${originalPrice.toFixed(2)}</span>
                                <span class="hero-discount">-${discountPercent}%</span>
                            ` : ''}
                        </div>
                        <div class="hero-description">${product.description || ''}</div>
                        <a href="item.html?id=${product.id}" class="hero-btn">
                            <i class="fas fa-eye"></i> View Details
                        </a>
                    </div>
                </div>
            </div>
        `;
    });

    html += `
            </div>
            <button class="hero-nav hero-prev" id="heroPrev" aria-label="Previous slide">
                <i class="fas fa-chevron-left"></i>
            </button>
            <button class="hero-nav hero-next" id="heroNext" aria-label="Next slide">
                <i class="fas fa-chevron-right"></i>
            </button>
            <div class="hero-dots" id="heroDots">
                ${products.map((_, index) => `
                    <button class="hero-dot ${index === 0 ? 'active' : ''}" data-index="${index}" aria-label="Go to slide ${index + 1}"></button>
                `).join('')}
            </div>
        </div>
    `;

    container.innerHTML = html;
    initHeroSlider(products.length);
}

// ============================================================
// 5. HERO SLIDER CONTROLS
// ============================================================

let currentSlide = 0;
let slideCount = 0;
let autoSlideInterval = null;

function initHeroSlider(count) {
    slideCount = count;
    currentSlide = 0;

    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    const prevBtn = document.getElementById('heroPrev');
    const nextBtn = document.getElementById('heroNext');

    function goToSlide(index) {
        if (index < 0) index = slideCount - 1;
        if (index >= slideCount) index = 0;

        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));

        slides[index].classList.add('active');
        dots[index].classList.add('active');

        currentSlide = index;
    }

    function nextSlide() {
        goToSlide(currentSlide + 1);
    }

    function prevSlide() {
        goToSlide(currentSlide - 1);
    }

    function startAutoSlide() {
        if (autoSlideInterval) clearInterval(autoSlideInterval);
        if (slideCount > 1) {
            autoSlideInterval = setInterval(nextSlide, 5000);
        }
    }

    function stopAutoSlide() {
        if (autoSlideInterval) {
            clearInterval(autoSlideInterval);
            autoSlideInterval = null;
        }
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            stopAutoSlide();
            prevSlide();
            startAutoSlide();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            stopAutoSlide();
            nextSlide();
            startAutoSlide();
        });
    }

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            stopAutoSlide();
            goToSlide(index);
            startAutoSlide();
        });
    });

    const slider = document.getElementById('heroSlider');
    if (slider) {
        slider.addEventListener('mouseenter', stopAutoSlide);
        slider.addEventListener('mouseleave', startAutoSlide);
        
        let touchStartX = 0;
        let touchEndX = 0;
        slider.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });
        slider.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) {
                stopAutoSlide();
                if (diff > 0) nextSlide();
                else prevSlide();
                startAutoSlide();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
            stopAutoSlide();
            nextSlide();
            startAutoSlide();
        } else if (e.key === 'ArrowLeft') {
            stopAutoSlide();
            prevSlide();
            startAutoSlide();
        }
    });

    if (slideCount > 1) {
        startAutoSlide();
    }

    window.addEventListener('beforeunload', () => {
        stopAutoSlide();
    });
}

// ============================================================
// 6. HERO BANNER STYLES (Includes Skeleton)
// ============================================================

function injectHeroStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* ============================================
           SKELETON LOADER STYLES
           ============================================ */

        .hero-skeleton-wrapper {
            position: relative;
            width: 100%;
            overflow: hidden;
            background: #0F172A;
            min-height: 500px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
        }

        .hero-skeleton-slide {
            width: 100%;
            min-height: 500px;
        }

        .hero-skeleton-content {
            width: 100%;
            min-height: 500px;
            background: linear-gradient(135deg, 
                rgba(15, 23, 42, 0.95) 0%, 
                rgba(30, 41, 59, 0.8) 50%, 
                rgba(15, 23, 42, 0.7) 100%
            );
            display: flex;
            align-items: center;
            padding: 80px 100px;
            position: relative;
            background-image: 
                linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.8) 100%),
                radial-gradient(circle at 70% 30%, rgba(124,58,237,0.1) 0%, transparent 50%);
        }

        .hero-skeleton-text {
            max-width: 650px;
            padding: 40px 50px;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 24px;
            width: 100%;
        }

        .skeleton-badge {
            width: 80px;
            height: 28px;
            background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
            background-size: 200% 100%;
            animation: skeletonShimmer 1.5s ease-in-out infinite;
            border-radius: 50px;
            margin-bottom: 16px;
        }

        .skeleton-title {
            width: 85%;
            height: 44px;
            background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.05) 75%);
            background-size: 200% 100%;
            animation: skeletonShimmer 1.5s ease-in-out infinite;
            border-radius: 8px;
            margin-bottom: 12px;
        }

        .skeleton-brand {
            width: 40%;
            height: 20px;
            background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
            background-size: 200% 100%;
            animation: skeletonShimmer 1.5s ease-in-out infinite;
            border-radius: 6px;
            margin-bottom: 16px;
        }

        .skeleton-price {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }

        .skeleton-current-price {
            width: 120px;
            height: 36px;
            background: linear-gradient(90deg, rgba(124,58,237,0.15) 25%, rgba(124,58,237,0.25) 50%, rgba(124,58,237,0.15) 75%);
            background-size: 200% 100%;
            animation: skeletonShimmer 1.5s ease-in-out infinite;
            border-radius: 6px;
        }

        .skeleton-original-price {
            width: 80px;
            height: 22px;
            background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
            background-size: 200% 100%;
            animation: skeletonShimmer 1.5s ease-in-out infinite;
            border-radius: 4px;
        }

        .skeleton-discount {
            width: 60px;
            height: 26px;
            background: linear-gradient(90deg, rgba(239,68,68,0.15) 25%, rgba(239,68,68,0.25) 50%, rgba(239,68,68,0.15) 75%);
            background-size: 200% 100%;
            animation: skeletonShimmer 1.5s ease-in-out infinite;
            border-radius: 50px;
        }

        .skeleton-description {
            width: 90%;
            height: 18px;
            background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
            background-size: 200% 100%;
            animation: skeletonShimmer 1.5s ease-in-out infinite;
            border-radius: 4px;
            margin-bottom: 24px;
        }

        .skeleton-btn {
            width: 160px;
            height: 48px;
            background: linear-gradient(90deg, rgba(124,58,237,0.15) 25%, rgba(124,58,237,0.25) 50%, rgba(124,58,237,0.15) 75%);
            background-size: 200% 100%;
            animation: skeletonShimmer 1.5s ease-in-out infinite;
            border-radius: 50px;
        }

        .hero-skeleton-dots {
            position: absolute;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
        }

        .skeleton-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;
        }

        .skeleton-dot.active {
            width: 32px;
            border-radius: 6px;
            background: rgba(124,58,237,0.3);
        }

        @keyframes skeletonShimmer {
            0% {
                background-position: 200% 0;
            }
            100% {
                background-position: -200% 0;
            }
        }

        /* ============================================
           MODERN HERO BANNER STYLES
           ============================================ */

        .hero-slider {
            position: relative;
            width: 100%;
            overflow: hidden;
            background: #0F172A;
            min-height: 500px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
        }

        .hero-slides {
            position: relative;
            width: 100%;
            height: 100%;
            min-height: 500px;
        }

        .hero-slide {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            visibility: hidden;
            transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            transform: scale(0.95);
        }

        .hero-slide.active {
            opacity: 1;
            visibility: visible;
            transform: scale(1);
            position: relative;
        }

        .hero-slide-content {
            width: 100%;
            min-height: 500px;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            display: flex;
            align-items: center;
            padding: 80px 100px;
            position: relative;
          
        }

        .hero-slide-content::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, 
                rgba(15, 23, 42, 0.85) 0%, 
                rgba(15, 23, 42, 0.5) 50%, 
                rgba(15, 23, 42, 0.2) 100%
            );
            z-index: 1;
            border-radius: 24px;
        }

        .hero-text {
            position: relative;
            z-index: 2;
            max-width: 650px;
            padding: 40px 50px;
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            color: white;
            animation: heroFadeIn 0.8s ease;
        }

        @keyframes heroFadeIn {
            from {
                opacity: 0;
                transform: translateY(30px) scale(0.98);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        .hero-badge {
            display: inline-block;
            padding: 6px 18px;
            border-radius: 50px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 16px;
        }

        .hero-badge.deal {
            background: linear-gradient(135deg, #EF4444, #DC2626);
            color: white;
            box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
        }

        .hero-badge.new {
            background: linear-gradient(135deg, #10B981, #059669);
            color: white;
            box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
        }

        .hero-badge.hot {
            background: linear-gradient(135deg, #F59E0B, #D97706);
            color: white;
            box-shadow: 0 4px 16px rgba(245, 158, 11, 0.3);
        }

        .hero-title {
            font-size: 42px;
            font-weight: 800;
            line-height: 1.15;
            margin-bottom: 12px;
            letter-spacing: -0.02em;
            text-shadow: 0 2px 20px rgba(0, 0, 0, 0.2);
        }

        .hero-brand {
            font-size: 16px;
            font-weight: 500;
            opacity: 0.8;
            margin-bottom: 16px;
            letter-spacing: 0.3px;
        }

        .hero-price {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }

        .hero-current-price {
            font-size: 36px;
            font-weight: 800;
            background: linear-gradient(135deg, #A78BFA, #7C3AED);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .hero-original-price {
            font-size: 20px;
            text-decoration: line-through;
            opacity: 0.5;
            font-weight: 500;
        }

        .hero-discount {
            background: linear-gradient(135deg, #EF4444, #DC2626);
            color: white;
            padding: 4px 14px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 700;
        }

        .hero-description {
            font-size: 15px;
            opacity: 0.85;
            margin-bottom: 24px;
            line-height: 1.7;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .hero-btn {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 14px 34px;
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
            letter-spacing: 0.3px;
        }

        .hero-btn:hover {
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 8px 40px rgba(124, 58, 237, 0.5);
        }

        .hero-btn i {
            font-size: 14px;
            transition: transform 0.3s ease;
        }

        .hero-btn:hover i {
            transform: translateX(4px);
        }

        .hero-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            z-index: 30;
            width: 56px;
            height: 56px;
            border: none;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.12);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #fff;
            cursor: pointer;
            transition: all 0.3s ease;
            opacity: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        }

        .hero-slider:hover .hero-nav {
            opacity: 1;
        }

        .hero-prev {
            left: 24px;
        }

        .hero-next {
            right: 24px;
        }

        .hero-nav:hover {
            background: rgba(124, 58, 237, 0.8);
            border-color: rgba(124, 58, 237, 0.5);
            transform: translateY(-50%) scale(1.08);
            box-shadow: 0 4px 20px rgba(124, 58, 237, 0.3);
        }

        .hero-dots {
            position: absolute;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 20;
            display: flex;
            gap: 10px;
        }

        .hero-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
            padding: 0;
        }

        .hero-dot.active {
            background: #7C3AED;
            width: 32px;
            border-radius: 6px;
            box-shadow: 0 0 20px rgba(124, 58, 237, 0.4);
        }

        .hero-dot:hover {
            background: rgba(255, 255, 255, 0.6);
        }

        .hero-dot.active:hover {
            background: #7C3AED;
        }

        /* ============================================
           RESPONSIVE
           ============================================ */

        @media (max-width: 1024px) {
            .hero-slide-content,
            .hero-skeleton-content {
                padding: 60px;
                min-height: 420px;
            }
            .hero-text,
            .hero-skeleton-text {
                padding: 32px 40px;
                max-width: 550px;
            }
            .hero-title {
                font-size: 34px;
            }
            .hero-current-price {
                font-size: 30px;
            }
            .hero-skeleton-wrapper,
            .hero-slider {
                min-height: 420px;
            }
            .hero-skeleton-slide,
            .hero-slides {
                min-height: 420px;
            }
        }

        @media (max-width: 768px) {
            .hero-nav {
                display: none !important;
            }

            .hero-slide-content,
            .hero-skeleton-content {
                padding: 40px 24px;
                min-height: 380px;
                align-items: flex-end;
            }
            .hero-text,
            .hero-skeleton-text {
                padding: 28px 24px;
                max-width: 100%;
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
            }
            .hero-title {
                font-size: 28px;
            }
            .hero-current-price {
                font-size: 26px;
            }
            .hero-description {
                -webkit-line-clamp: 1;
                font-size: 14px;
            }
            .hero-btn {
                padding: 12px 28px;
                font-size: 14px;
            }
            .hero-dots,
            .hero-skeleton-dots {
                bottom: 20px;
                gap: 8px;
            }
            .hero-dot,
            .skeleton-dot {
                width: 8px;
                height: 8px;
            }
            .hero-dot.active,
            .skeleton-dot.active {
                width: 24px;
            }
            .skeleton-title {
                height: 32px;
            }
            .skeleton-current-price {
                width: 100px;
                height: 28px;
            }
            .hero-skeleton-wrapper,
            .hero-slider {
                min-height: 380px;
            }
            .hero-skeleton-slide,
            .hero-slides {
                min-height: 380px;
            }
        }

        @media (max-width: 480px) {
            .hero-slide-content,
            .hero-skeleton-content {
                padding: 24px 16px;
                min-height: 320px;
            }
            .hero-text,
            .hero-skeleton-text {
                padding: 20px 16px;
            }
            .hero-title {
                font-size: 22px;
            }
            .hero-current-price {
                font-size: 22px;
            }
            .hero-brand {
                font-size: 13px;
            }
            .hero-price {
                gap: 10px;
            }
            .hero-original-price {
                font-size: 16px;
            }
            .hero-discount {
                font-size: 12px;
                padding: 2px 10px;
            }
            .hero-btn {
                padding: 10px 20px;
                font-size: 13px;
            }
            .hero-dots,
            .hero-skeleton-dots {
                bottom: 16px;
                gap: 6px;
            }
            .hero-dot,
            .skeleton-dot {
                width: 6px;
                height: 6px;
            }
            .hero-dot.active,
            .skeleton-dot.active {
                width: 18px;
            }
            .skeleton-title {
                height: 26px;
            }
            .skeleton-current-price {
                width: 80px;
                height: 24px;
            }
            .hero-skeleton-wrapper,
            .hero-slider {
                min-height: 320px;
            }
            .hero-skeleton-slide,
            .hero-slides {
                min-height: 320px;
            }
        }
    `;
    document.head.appendChild(style);
}

// ============================================================
// 7. INITIALIZE HERO BANNER
// ============================================================

async function initHeroBanner(containerId = 'heroBanner') {
    injectHeroStyles();

    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`⚠️ Container #${containerId} not found. Hero banner not initialized.`);
        return;
    }

    // Show skeleton loader
    renderSkeletonLoader(containerId);

    const products = await fetchFeaturedProducts();
    renderHeroBanner(products, containerId);

    const wrapper = container.closest('.hero-banner-wrapper');
    if (wrapper) {
        wrapper.style.display = 'block';
        wrapper.style.marginTop = '80px';
    } else {
        container.style.display = 'block';
    }

    console.log('✅ Hero banner initialized with', products.length, 'products');
}

// ============================================================
// 8. AUTO-INITIALIZE ON DOM READY
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('heroBanner');
    if (container) {
        initHeroBanner('heroBanner');
    } else {
        const altContainers = ['heroSlider', 'featuredHero', 'heroBannerContainer'];
        for (const id of altContainers) {
            const alt = document.getElementById(id);
            if (alt) {
                initHeroBanner(id);
                break;
            }
        }
    }
});

// ============================================================
// 9. EXPOSE FOR USE IN OTHER SCRIPTS
// ============================================================

window.heroBanner = {
    init: initHeroBanner,
    fetchFeatured: fetchFeaturedProducts,
    render: renderHeroBanner,
    getSupabaseClient: getHeroSupabaseClient
};

console.log('✅ Hero Banner System Loaded');
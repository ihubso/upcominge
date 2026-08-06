/**
 * ============================================================
 * HERO BANNER - Featured Products Slider
 * Fetches featured products from Supabase and displays them
 * as a hero banner with smooth sliding animation
 * ============================================================
 */

// ============================================================
// 2. FETCH FEATURED PRODUCTS
// ============================================================

async function fetchFeaturedProducts() {
    const client = getSupabaseClient();
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
                <h2 style="color:#94A3B8;font-size:20px;" data-translate="no_featured_title">No featured products available</h2>
                <p style="color:#94A3B8;margin-top:8px;" data-translate="no_featured_sub">Check back soon for our latest deals!</p>
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
        if (isDeal) badge = `<span class="hero-badge deal" data-translate="badge_deal">🔥 Deal</span>`;
        else if (isNew) badge = `<span class="hero-badge new" data-translate="badge_new">✨ New</span>`;
        else if (isHot) badge = `<span class="hero-badge hot" data-translate="badge_hot">⚡ Hot</span>`;

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
                            <span class="hero-current-price">FCFA${price.toFixed(2)}</span>
                            ${discountPercent > 0 ? `
                                <span class="hero-original-price">FCFA${originalPrice.toFixed(2)}</span>
                                <span class="hero-discount">-${discountPercent}%</span>
                            ` : ''}
                        </div>
                        <div class="hero-description">${product.description || ''}</div>
                        <a href="/item/?id=${product.id}" class="hero-btn" data-translate="view_details">
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
     // ============================================================
     // HERO BANNER STYLES WAS MOVED TO ANOTHER CSS FILE FOR BETTER MAINTAINABILITY
     // ============================================================
    
    `;
    document.head.appendChild(style);
}

// ============================================================
// 7. INITIALIZE HERO BANNER
// ============================================================

async function initHeroBanner(containerId = 'heroBanner') {


    await injectHeroStyles();

    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`⚠️ Container #${containerId} not found. Hero banner not initialized.`);
        return;
    }



    const products = await fetchFeaturedProducts();
    await renderHeroBanner(products, containerId);
    translateUI();

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

document.addEventListener('DOMContentLoaded', async() => {
    const containerId = 'heroBanner';
     await renderSkeletonLoader(containerId);
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
};

console.log('✅ Hero Banner System Loaded');
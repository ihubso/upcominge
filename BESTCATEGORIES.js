// ============================================
// BEST CATEGORIES - LOAD & AUTO-SLIDE
// ============================================

async function loadBestCategories() {
    const grid = document.getElementById('bestCategoriesGrid');

    try {
        const client = getSupabaseClient();
        if (!client) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12 text-gray-400">
                    <i class="fas fa-database text-4xl block mb-3"></i>
                    <p>Unable to load categories</p>
                </div>
            `;
            return;
        }

        const { data: products, error } = await client
            .from('products')
            .select('category, brand, image, id, name');

        if (error) throw error;

        const categoryMap = new Map();
        products.forEach(p => {
            if (p.category) {
                const key = p.category.toLowerCase();
                if (!categoryMap.has(key)) {
                    categoryMap.set(key, {
                        name: p.category,
                        count: 0,
                        brands: new Set(),
                        image: p.image || null,
                        productId: p.id
                    });
                }
                const cat = categoryMap.get(key);
                cat.count++;
                if (p.brand) cat.brands.add(p.brand);
                if (!cat.image && p.image) {
                    cat.image = p.image;
                    cat.productId = p.id;
                }
            }
        });

        const categories = Array.from(categoryMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 4);

        if (categories.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12 text-gray-400">
                    <i class="fas fa-box-open text-4xl block mb-3"></i>
                    <p>No categories available</p>
                </div>
            `;
            return;
        }

        // Generate HTML
        grid.innerHTML = categories.map((cat) => {
            const imageUrl = cat.image || `https://placehold.co/400x400/6C3CE1/FFFFFF?text=${encodeURIComponent(cat.name)}`;
            const displayName = cat.name.charAt(0).toUpperCase() + cat.name.slice(1);
            
            return `
                <div class="category-card" 
                     onclick="location.href='/category/?category=${encodeURIComponent(cat.name)}'">
                    <img src="${imageUrl}" 
                         alt="${displayName}" 
                         loading="lazy" 
                         onerror="this.src='https://placehold.co/600x600'">
                    <div class="category-gradient"></div>
                    <div class="category-info">
                        <h3>${displayName}</h3>
                        <button>
                            Explore
                            <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Initialize auto-slide on mobile
        initMobileAutoSlide();

    } catch (err) {
        console.error('❌ Error loading categories:', err);
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-400">
                <i class="fas fa-exclamation-circle text-4xl block mb-3"></i>
                <p>Failed to load categories. Please refresh.</p>
            </div>
        `;
    }
}

// ============================================
// MOBILE AUTO-SLIDE FUNCTIONALITY
// ============================================

function initMobileAutoSlide() {
    const wrapper = document.getElementById('bestCategoriesGrid');
    const dotsContainer = document.getElementById('mobileDots');
    
    if (!wrapper) return;

    // Only run on mobile
    if (window.innerWidth > 768) {
        dotsContainer.innerHTML = '';
        return;
    }

    const cards = wrapper.querySelectorAll('.category-card');
    const totalCards = cards.length;
    
    if (totalCards <= 1) {
        dotsContainer.innerHTML = '';
        return;
    }

    // Clear existing dots
    dotsContainer.innerHTML = '';

    // Create dots
    for (let i = 0; i < totalCards; i++) {
        const dot = document.createElement('button');
        dot.className = 'dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('data-index', i);
        dot.setAttribute('aria-label', `Slide ${i + 1}`);
        
        dot.addEventListener('click', () => {
            scrollToCard(i);
        });
        
        dotsContainer.appendChild(dot);
    }

    // Auto-slide variables
    let currentIndex = 0;
    let autoSlideInterval = null;
    let isUserInteracting = false;

    // Scroll to specific card
    function scrollToCard(index) {
        if (index < 0 || index >= totalCards) return;
        
        const card = cards[index];
        if (!card) return;
        
        wrapper.scrollTo({
            left: card.offsetLeft - wrapper.offsetLeft,
            behavior: 'smooth'
        });
        
        updateDots(index);
        currentIndex = index;
    }

    // Update active dot
    function updateDots(activeIndex) {
        const dots = dotsContainer.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === activeIndex);
        });
    }

    // Go to next slide
    function nextSlide() {
        if (isUserInteracting) return;
        const nextIndex = (currentIndex + 1) % totalCards;
        scrollToCard(nextIndex);
    }

    // Start auto-slide
    function startAutoSlide() {
        if (autoSlideInterval) {
            clearInterval(autoSlideInterval);
        }
        autoSlideInterval = setInterval(nextSlide, 4000);
    }

    // Stop auto-slide
    function stopAutoSlide() {
        if (autoSlideInterval) {
            clearInterval(autoSlideInterval);
            autoSlideInterval = null;
        }
    }

    // Reset timer on user interaction
    function resetAutoSlide() {
        isUserInteracting = true;
        stopAutoSlide();
        
        // Restart after user stops interacting
        clearTimeout(window._slideTimeout);
        window._slideTimeout = setTimeout(() => {
            isUserInteracting = false;
            startAutoSlide();
        }, 5000);
    }

    // Detect scroll to update dots
    let isScrolling = false;
    wrapper.addEventListener('scroll', () => {
        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                const scrollLeft = wrapper.scrollLeft;
                let closestIndex = 0;
                let closestDistance = Infinity;
                
                cards.forEach((card, index) => {
                    const cardLeft = card.offsetLeft - wrapper.offsetLeft;
                    const distance = Math.abs(scrollLeft - cardLeft);
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestIndex = index;
                    }
                });
                
                if (closestIndex !== currentIndex) {
                    currentIndex = closestIndex;
                    updateDots(currentIndex);
                    resetAutoSlide();
                }
                
                isScrolling = false;
            });
        }
        isScrolling = true;
    });

    // Touch/click events for user interaction
    wrapper.addEventListener('touchstart', resetAutoSlide);
    wrapper.addEventListener('mousedown', resetAutoSlide);
    
    // Visibility change - pause when tab not visible
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAutoSlide();
        } else {
            startAutoSlide();
        }
    });

    // Start auto-slide
    startAutoSlide();

    // Cleanup on resize
    const resizeHandler = () => {
        if (window.innerWidth > 768) {
            stopAutoSlide();
            dotsContainer.innerHTML = '';
        } else {
            startAutoSlide();
        }
    };
    
    window.addEventListener('resize', resizeHandler);

    // Store cleanup function
    window._cleanupAutoSlide = () => {
        stopAutoSlide();
        window.removeEventListener('resize', resizeHandler);
        document.removeEventListener('visibilitychange', () => {});
    };
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for Supabase to initialize
    setTimeout(loadBestCategories, 500);
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (window._cleanupAutoSlide) {
        window._cleanupAutoSlide();
    }
});
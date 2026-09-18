

        // Helper translation function for dynamic content
        function t(key, fallback) {
            if (window.Translations && window.Translations.translate) {
                const result = window.Translations.translate(key);
                if (result && result !== key) return result;
            }
            return fallback || key;
        }

        // --- State ---
        let allDeals = [];
        let filteredDeals = [];
        let wishlist = [];
        let currentFilter = 'all';
        let countdownInterval = null;
        let heroImages = [];
        let heroImageIndex = 0;
        let heroInterval = null;
        let isHeroReady = false;

        // --- DOM Elements ---
        const elements = {
            grid: document.getElementById('dealsGrid'),
            productSkeletons: document.getElementById('productSkeletons'),
            totalDeals: document.getElementById('totalDeals'),
            totalSavings: document.getElementById('totalSavings'),
            totalItems: document.getElementById('totalItems'),
            filterBtns: document.querySelectorAll('#dealsFilter button'),
            cdDays: document.getElementById('cdDays'),
            cdHours: document.getElementById('cdHours'),
            cdMinutes: document.getElementById('cdMinutes'),
            cdSeconds: document.getElementById('cdSeconds'),
            heroSkeleton: document.getElementById('heroSkeleton'),
            heroContent: document.getElementById('heroContent'),
            heroSlides: document.getElementById('heroSlides')
        };

        // ============================================================
        //  FETCH RANDOM PRODUCT IMAGES FOR HERO
        // ============================================================

        async function fetchHeroImages(count = 5) {
            const client = getSupabaseClient();
            if (!client) return [];

            try {
                const { data, error } = await client
                    .from('products')
                    .select('image')
                    .not('image', 'is', null)
                    .limit(20);

                if (error) throw error;

                // Shuffle and pick random images
                const shuffled = shuffleArray(data || []);
                const selected = shuffled.slice(0, count);
                return selected.map(p => p.image).filter(Boolean);
            } catch (err) {
                console.error('❌ Error fetching hero images:', err.message);
                return [];
            }
        }

        // ============================================================
        //  SHUFFLE ARRAY
        // ============================================================

        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        // ============================================================
        //  HERO SLIDER
        // ============================================================

        function initHeroSlider(images) {
            if (!elements.heroSlides || !images || images.length === 0) {
                // Fallback images if none from DB
                const fallbackImages = [
                    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&q=80',
                    'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80',
                    'https://images.unsplash.com/photo-1517994112540-009c47ea476b?w=1200&q=80',
                    'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?w=1200&q=80',
                    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&q=80'
                ];
                images = fallbackImages;
            }

            heroImages = images;
            elements.heroSlides.innerHTML = '';

            images.forEach((img, index) => {
                const slide = document.createElement('div');
                slide.className = `hero-slide ${index === 0 ? 'active' : ''}`;
                slide.style.backgroundImage = `url(${img})`;
                elements.heroSlides.appendChild(slide);
            });

            // Show hero content, hide skeleton
            elements.heroSkeleton.style.display = 'none';
            elements.heroContent.style.display = 'block';
            isHeroReady = true;

            // Start rotation if more than 1 image
            if (images.length > 1) {
                if (heroInterval) clearInterval(heroInterval);
                heroInterval = setInterval(() => {
                    const slides = elements.heroSlides.querySelectorAll('.hero-slide');
                    slides.forEach(s => s.classList.remove('active'));
                    heroImageIndex = (heroImageIndex + 1) % images.length;
                    slides[heroImageIndex].classList.add('active');
                }, 4000);
            }
        }

        // ============================================================
        //  HELPERS
        // ============================================================

        function showToast(message, type = 'success') {
            const existing = document.querySelector('.deals-toast');
            if (existing) existing.remove();

            const toast = document.createElement('div');
            toast.className = `deals-toast ${type}`;
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

        function formatPrice(price) {
            return price.toFixed(2);
        }

        function getBadge(discount, isHot, isNew) {
            if (discount >= 40) return { label: '🔥 Mega', class: 'mega' };
            if (discount >= 25) return { label: '⚡ Hot', class: 'hot' };
            if (isNew) return { label: '✨ New', class: 'new' };
            if (discount >= 10) return { label: '💸 Deal', class: 'deal' };
            return null;
        }

        // ============================================================
        //  FETCH DEALS
        // ============================================================

        async function fetchDeals() {
            const client = getSupabaseClient();
            if (!client) return [];

            try {
                const { data: dealsData, error: dealsError } = await client
                    .from('deals')
                    .select('product_id, discount')

                if (dealsError) throw dealsError;

                if (!dealsData || dealsData.length === 0) {
                    console.log('ℹ️ No deals found');
                    return [];
                }

                const productIds = dealsData.map(d => d.product_id).filter(Boolean);

                if (productIds.length === 0) return [];

                const { data: productsData, error: productsError } = await client
                    .from('products')
                    .select('*')
                    .in('id', productIds);

                if (productsError) throw productsError;

                const deals = dealsData
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

                console.log(`✅ Loaded ${deals.length} deals`);
                return deals;

            } catch (err) {
                console.error('❌ Error fetching deals:', err.message);
                return [];
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
        //  RENDER DEALS
        // ============================================================

        function renderDeals(deals) {
            const grid = elements.grid;

            // Hide skeletons
            if (elements.productSkeletons) {
                elements.productSkeletons.style.display = 'none';
            }

            if (!deals || deals.length === 0) {
                grid.innerHTML = `
                    <div class="deals-empty">
                        <div class="empty-icon"><i class="fas fa-tags"></i></div>
                        <h2 data-translate="no_deals_title">No Deals Available</h2>
                        <p data-translate="no_deals_sub">Check back soon for amazing offers!</p>
                        <a href="/product/" style="display:inline-block;padding:12px 32px;background:#6C3CE1;color:white;border-radius:12px;text-decoration:none;font-weight:600;" data-translate="browse_products">
                            <i class="fas fa-store"></i> Browse Products
                        </a>
                    </div>
                `;
                return;
            }

            // Update stats
            elements.totalDeals.textContent = deals.length;
            const maxDiscount = Math.max(...deals.map(d => d.dealDiscount || 0));
            elements.totalSavings.textContent = maxDiscount + '%';
            const totalItems = deals.reduce((sum, d) => sum + (d.stock || 0), 0);
            elements.totalItems.textContent = totalItems;

            grid.innerHTML = deals.map(deal => {
                const discount = deal.dealDiscount || 0;
                const originalPrice = deal.originalPrice || deal.price || 0;
                const currentPrice = deal.discountedPrice || originalPrice * (1 - discount / 100);
                const isWished = wishlist.includes(deal.id);
                const rating = deal.rating || 0;
                const reviewCount = deal.reviewCount || 0;
                const stock = deal.stock || 0;
                const stockPercent = stock > 0 ? Math.min((stock / 50) * 100, 100) : 0;

                const badge = getBadge(discount, deal.isHot, deal.isNew);
                const image = deal.image || deal.images?.[0] || 'https://placehold.co/400x400/6C3CE1/FFFFFF?text=Product';

                return `
                    <div class="deal-card" data-id="${deal.id}" data-discount="${discount}">
                        <div class="deal-image">
                            <img src="${image}" alt="${deal.name || 'Product'}" loading="lazy"
                                 onerror="this.src='https://placehold.co/400x400/6C3CE1/FFFFFF?text=Product'">
                            <div class="deal-badge-top">
                                ${badge ? `<span class="deal-badge ${badge.class}" data-translate="badge_${badge.class}">${badge.label}</span>` : ''}
                            </div>
                            <span class="deal-discount-float">-${discount}%</span>
                            <button class="deal-wishlist ${isWished ? 'active' : ''}" 
                                    onclick="event.stopPropagation(); toggleWishlist('${deal.id}')">
                                <i class="fas fa-heart"></i>
                            </button>
                        </div>
                        <div class="deal-body">
                            <a href="/item/?product=${deal.id}" class="deal-name">${deal.name || 'Unknown Product'}</a>
                            ${deal.brand ? `<div class="deal-brand">${deal.brand}</div>` : ''}
                            <div class="deal-rating">
                                <span class="stars">${renderStars(rating)}</span>
                                <span class="count">(${reviewCount})</span>
                            </div>
                            <div class="deal-price-row">
                                <span class="deal-current-price">FCFA ${formatPrice(currentPrice)}</span>
                                <span class="deal-original-price">FCFA ${formatPrice(originalPrice)}</span>
                                <span class="deal-savings" data-translate="save_percent">Save ${discount}%</span>
                            </div>
                            <div class="deal-actions">
                                <button class="deal-btn-view" onclick="event.stopPropagation(); window.navigateWithUserInfo('/item/?product=${deal.id}')" data-translate="view_details">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                            ${stock > 0 ? `
                                <div class="deal-stock">
                                    <span class="stock-text" data-translate="left_in_stock">${stock} left</span>
                                    <div class="stock-bar">
                                        <div class="stock-fill" style="width:${stockPercent}%"></div>
                                    </div>
                                </div>
                            ` : `
                                <div class="deal-stock">
                                    <span class="stock-text" style="color:#EF4444;" data-translate="out_of_stock">Out of Stock</span>
                                </div>
                            `}
                        </div>
                    </div>
                `;
            }).join('');
            translateUI();
        }

        // ============================================================
        //  TOGGLE WISHLIST
        // ============================================================

        async function toggleWishlist(productId) {
            try {
                const index = wishlist.indexOf(productId);
                if (index !== -1) {
                    wishlist.splice(index, 1);
                    showToast('❤️ ' + t('removed_from_wishlist', 'Removed from wishlist'), 'info');
                } else {
                    wishlist.push(productId);
                    showToast('❤️ ' + t('added_to_wishlist', 'Added to wishlist!'));
                }

                localStorage.setItem('st_wishlist', JSON.stringify(wishlist));

                const customerId = window.getCurrentCustomerId ? window.getCurrentCustomerId() : null;
                if (customerId && window.saveWishlistToDB) {
                    await window.saveWishlistToDB(customerId, wishlist);
                }

                if (window.STHeader) {
                    window.STHeader.AppState.wishlist = wishlist;
                    if (window.STHeader.updateCounts) {
                        window.STHeader.updateCounts();
                    }
                }

                renderDeals(filteredDeals);
            } catch (err) {
                console.error('❌ Wishlist error:', err);
                showToast('❌ ' + t('wishlist_error', 'Failed to update wishlist'), 'error');
            }
        }

        // ============================================================
        //  COUNTDOWN TIMER
        // ============================================================

        function startCountdown() {
            const target = new Date();
            target.setHours(target.getHours() + 24);
            target.setMinutes(0);
            target.setSeconds(0);
            target.setMilliseconds(0);

            if (countdownInterval) clearInterval(countdownInterval);

            countdownInterval = setInterval(() => {
                const now = new Date().getTime();
                const distance = target.getTime() - now;

                if (distance < 0) {
                    clearInterval(countdownInterval);
                    elements.cdDays.textContent = '00';
                    elements.cdHours.textContent = '00';
                    elements.cdMinutes.textContent = '00';
                    elements.cdSeconds.textContent = '00';
                    return;
                }

                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                elements.cdDays.textContent = String(days).padStart(2, '0');
                elements.cdHours.textContent = String(hours).padStart(2, '0');
                elements.cdMinutes.textContent = String(minutes).padStart(2, '0');
                elements.cdSeconds.textContent = String(seconds).padStart(2, '0');
            }, 1000);
        }

        // ============================================================
        //  FILTER DEALS
        // ============================================================

        function filterDeals(filter) {
            currentFilter = filter;

            if (filter === 'all') {
                filteredDeals = [...allDeals];
            } else if (filter === 'mega') {
                filteredDeals = allDeals.filter(d => (d.dealDiscount || 0) >= 40);
            } else if (filter === 'hot') {
                filteredDeals = allDeals.filter(d => (d.dealDiscount || 0) >= 25 && (d.dealDiscount || 0) < 40);
            } else if (filter === 'new') {
                filteredDeals = allDeals.filter(d => d.isNew === true);
            }

            renderDeals(filteredDeals);
        }

        // ============================================================
        //  INITIALIZE
        // ============================================================

        document.addEventListener('DOMContentLoaded', async function() {
            // Load wishlist
            loadWishlist();

            // Start countdown
            startCountdown();

            // Fetch hero images and deals in parallel
            const [heroImages, deals] = await Promise.all([
                fetchHeroImages(6),
                fetchDeals()
            ]);

            // Initialize hero slider
            initHeroSlider(heroImages);

            // Set deals
            allDeals = deals;
            filteredDeals = [...allDeals];

            // Render
            renderDeals(filteredDeals);

            // Filter buttons
            elements.filterBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    elements.filterBtns.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    filterDeals(this.dataset.filter);
                });
            });

            // Watch for header updates
            if (window.STHeader) {
                const originalUpdate = window.STHeader.updateAuthUI;
                window.STHeader.updateAuthUI = function() {
                    if (originalUpdate) originalUpdate();
                    loadWishlist();
                    renderDeals(filteredDeals);
                };
            }

            console.log('📄 Deals page loaded');
            console.log(`🔥 ${allDeals.length} deals available`);
            console.log(`🖼️ ${heroImages.length} hero images loaded`);
        });

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (heroInterval) {
                clearInterval(heroInterval);
                heroInterval = null;
            }
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
        });

        // ============================================================
        //  EXPOSE GLOBALLY
        // ============================================================

        
        window.toggleWishlist = toggleWishlist;
        window.filterDeals = filterDeals;

        console.log('✅ Deals page ready');

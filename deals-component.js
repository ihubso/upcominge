/**
 * ============================================================
 * DEALS DU JOUR - Featured Deals Component
 * Fetches products with active deals from Supabase
 * Displays them in a beautiful carousel/grid layout
 * ============================================================
 */

(function() {
    'use strict';

    // ============================================================
    // 1. dealCONFIGURATION
    // ============================================================

    const dealCONFIG = {
        maxDeals: 12,
        autoSlideInterval: 3000 // Sliding interval in milliseconds
    };

    // ============================================================
    // 2. SUPABASE CLIENT HELPER
    // ============================================================


    // ============================================================
    // 3. FETCH DEALS
    // ============================================================

    async function fetchDeals() {
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

            if (productIds.length === 0) {
                console.log('ℹ️ No valid product IDs in deals');
                return [];
            }

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

            console.log(`✅ Loaded ${dealsWithProducts.length} deals`);
            return dealsWithProducts;

        } catch (err) {
            console.error('❌ Error fetching deals:', err.message);
            return [];
        }
    }

    // ============================================================
    // 4. RENDER DEALS - Single Row with Right-to-Left Sliding
    // ============================================================

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
                <div style="text-align:center;padding:40px 20px;color:#94A3B8;">
                    <p style="font-size:16px;">No deals available right now</p>
                    <p style="font-size:14px;">Check back soon for great offers!</p>
                </div>
            `;
            return;
        }

        // Limit deals
        const displayDeals = deals.slice(0, dealCONFIG.maxDeals);

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
        const doubledDeals = [...displayDeals, ...displayDeals, ...displayDeals];

        doubledDeals.forEach((deal, index) => {
            const image = deal.image || deal.images?.[0] || 'https://placehold.co/400x400/6C3CE1/FFFFFF?text=Deal';
            const discount = deal.dealDiscount || 0;
            const originalPrice = deal.originalPrice || deal.price || 0;
            const currentPrice = deal.discountedPrice || originalPrice * (1 - discount / 100);

            html += `
                <div class="deal-slide" data-index="${index}">
                    <div class="deal-card" onclick="window.location.href='item.html?product=${deal.id}'">
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
                                <button class="deal-btn-cart" onclick="event.stopPropagation(); window.addToCartFromDeal('${deal.id}')">
                                    <i class="fas fa-shopping-bag"></i> Add to Cart
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
            startSlider(displayDeals.length);
        }, 100);
    }

    // ============================================================
    // 5. SLIDER CONTROLS
    // ============================================================

    function startSlider(totalItems) {
        const track = document.getElementById('dealsSliderTrack');
        if (!track) return;

        // Clear any existing interval
        if (slideInterval) {
            clearInterval(slideInterval);
            slideInterval = null;
        }

        // Get the width of one slide
        const slideWidth = track.querySelector('.deal-slide')?.offsetWidth || 220;
        const gap = 20; // Gap between slides
        
        // Calculate total width including gaps
        const itemWidth = slideWidth + gap;
        
        // Start from the first set of items
        currentPosition = 0;
        
        // Set initial position
        track.style.transform = `translateX(0)`;

        // Start sliding from right to left
        slideInterval = setInterval(() => {
            // Move one item at a time
            currentPosition -= itemWidth;
            
            // Apply the transform
            track.style.transform = `translateX(${currentPosition}px)`;
            track.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            
            // Check if we've scrolled past the first set of items
            const totalWidth = totalItems * itemWidth;
            if (Math.abs(currentPosition) >= totalWidth) {
                // Reset to beginning without animation
                setTimeout(() => {
                    track.style.transition = 'none';
                    currentPosition = 0;
                    track.style.transform = `translateX(0)`;
                    
                    // Force reflow
                    track.offsetHeight;
                    
                    // Resume with animation
                    setTimeout(() => {
                        track.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                    }, 50);
                }, 800);
            }
        }, dealCONFIG.autoSlideInterval);

        // Pause on hover
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

    // ============================================================
    // 6. ADD TO CART FROM DEALS
    // ============================================================


async function addToCartFromDeal(productId) {
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


        const customerId = window.getCurrentCustomerId?.();
        const sessionId = localStorage.getItem('st_session_id') || 'session_' + Date.now();
        const client2 = getHotSupabaseClient();
        if (client2) {
            await saveCartToDB(customerId || sessionId, cart, !!customerId);
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
    // 7. TOAST NOTIFICATION
    // ============================================================

    function showDealsToast(message, type = 'success') {
        const existing = document.querySelector('.deals-toast');
        if (existing) existing.remove();

        const colors = {
            success: '#10B981',
            error: '#EF4444',
            info: '#3B82F6',
            warning: '#F59E0B'
        };

        const toast = document.createElement('div');
        toast.className = 'deals-toast';
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
            animation: dealsToastSlideUp 0.3s ease;
            font-family: 'Inter', sans-serif;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        if (!document.getElementById('dealsToastStyle')) {
            const style = document.createElement('style');
            style.id = 'dealsToastStyle';
            style.textContent = `
                @keyframes dealsToastSlideUp {
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
    // 8. INJECT STYLES
    // ============================================================

    function injectDealsStyles() {
        const styleId = 'dealsStyles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* ============================================
               DEALS DU JOUR - SLIDER STYLES
               ============================================ */
            
            /* ----- Section Container ----- */
            .deals-section {
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 24px;
                overflow: hidden;
            }

            .deals-section .deals-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 24px;
                flex-wrap: wrap;
                gap: 12px;
            }

            .deals-section .deals-header h2 {
                font-size: 28px;
                font-weight: 800;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .deals-section .deals-header h2 i {
                color: #EF4444;
            }

            .deals-section .deals-header .deals-subtitle {
                font-size: 14px;
                color: #94A3B8;
                font-weight: 500;
            }

            /* ----- Slider Wrapper ----- */
            .deals-slider-wrapper {
                position: relative;
                overflow: hidden;
                border-radius: 16px;
                padding: 8px 0;
            }

            .deals-slider-track {
                display: flex;
                gap: 20px;
                transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                will-change: transform;
            }

            .deal-slide {
                flex: 0 0 220px;
                min-width: 220px;
            }

            /* ----- Card ----- */
            .deal-card {
                background: white;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                transition: all 0.3s ease;
                cursor: pointer;
                border: 1px solid transparent;
                position: relative;
                height: 100%;
            }

            .deal-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 30px rgba(0,0,0,0.1);
                border-color: #6C3CE1;
            }

            .deal-card .deal-card-image {
                position: relative;
                width: 100%;
                padding-top: 100%;
                overflow: hidden;
                background: #f8fafc;
            }

            .deal-card .deal-card-image img {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                transition: transform 0.3s ease;
            }

            .deal-card:hover .deal-card-image img {
                transform: scale(1.05);
            }

            .deal-discount-badge {
                position: absolute;
                bottom: 8px;
                right: 8px;
                background: #EF4444;
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 800;
                z-index: 2;
                box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
            }

            /* ----- Card Body ----- */
            .deal-card .deal-card-body {
                padding: 14px 16px;
            }

            .deal-card .deal-card-title {
                font-weight: 700;
                font-size: 15px;
                color: #0F172A;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                margin: 0;
            }

            .deal-card .deal-card-brand {
                font-size: 12px;
                color: #94A3B8;
                margin: 2px 0 6px;
            }

            .deal-card .deal-card-price {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }

            .deal-card .deal-current-price {
                font-weight: 700;
                font-size: 18px;
                color: #EF4444;
            }

            .deal-card .deal-original-price {
                font-size: 14px;
                color: #94A3B8;
                text-decoration: line-through;
                font-weight: 400;
            }

            .deal-card .deal-card-actions {
                margin-top: 10px;
            }

            .deal-card .deal-btn-cart {
                width: 100%;
                padding: 8px 14px;
                background: linear-gradient(135deg, #EF4444, #DC2626);
                color: white;
                border: none;
                border-radius: 10px;
                font-weight: 600;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: inherit;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }

            .deal-card .deal-btn-cart:hover {
                transform: scale(1.02);
                box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
            }

            .deal-view-all {
                padding: 10px 24px;
                background: transparent;
                border: 2px solid #6C3CE1;
                color: #6C3CE1;
                border-radius: 10px;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: inherit;
                margin-top: 20px;
            }

            .deal-view-all:hover {
                background: #6C3CE1;
                color: white;
            }

            /* ----- Responsive ----- */
            @media (max-width: 768px) {
                .deals-section {
                    padding: 0 16px;
                }

                .deals-section .deals-header h2 {
                    font-size: 22px;
                }

                .deal-slide {
                    flex: 0 0 160px;
                    min-width: 160px;
                }

                .deal-card .deal-card-title {
                    font-size: 13px;
                }

                .deal-card .deal-current-price {
                    font-size: 15px;
                }

                .deal-card .deal-original-price {
                    font-size: 12px;
                }

                .deal-card .deal-btn-cart {
                    font-size: 11px;
                    padding: 6px 10px;
                }

                .deal-discount-badge {
                    font-size: 12px;
                    padding: 2px 10px;
                }
            }

            @media (max-width: 480px) {
                .deal-slide {
                    flex: 0 0 140px;
                    min-width: 140px;
                }

                .deal-card .deal-card-body {
                    padding: 10px 12px;
                }

                .deal-card .deal-card-title {
                    font-size: 12px;
                    -webkit-line-clamp: 1;
                }

                .deal-card .deal-current-price {
                    font-size: 14px;
                }

                .deal-card .deal-original-price {
                    font-size: 11px;
                }

                .deal-card .deal-btn-cart {
                    font-size: 10px;
                    padding: 4px 8px;
                }

                .deals-section .deals-header h2 {
                    font-size: 18px;
                }

                .deals-section .deals-header .deals-view-all {
                    font-size: 12px;
                    padding: 6px 14px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // ============================================================
    // 9. MAIN INITIALIZATION
    // ============================================================

    async function initDeals(containerId = 'dealsContainer') {
        injectDealsStyles();

        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`⚠️ Container #${containerId} not found`);
            return;
        }

        container.innerHTML = `
            <div style="text-align:center;padding:40px 20px;">
                <div style="width:40px;height:40px;border:4px solid #E2E8F0;border-top-color:#6C3CE1;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>
                <p style="color:#94A3B8;font-weight:500;">Loading deals...</p>
            </div>
            <style>
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
        `;

        const deals = await fetchDeals();
        renderDealsSlider(deals, containerId);

        window.dealsData = deals;
        window.loadAllDeals = function() {
            window.location.href = 'deals.html';
        };
        window.addToCartFromDeal = addToCartFromDeal;

        console.log(`✅ Deals initialized: ${deals.length} deals - Slider Mode`);
    }



    // ============================================================
    // 11. AUTO-INITIALIZE ON DOM READY
    // ============================================================

    document.addEventListener('DOMContentLoaded', function() {
        const container = document.getElementById('dealsContainer');
        if (container) {
            initDeals('dealsContainer');
        }
    });

    console.log('✅ Deals Slider Component Loaded');
})();
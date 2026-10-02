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
    // 1. CONFIGURATION
    // ============================================================

    const dealCONFIG = {
        maxDeals: 12,
        autoSlideInterval: 3000 // Sliding interval in milliseconds
    };

    // ============================================================
    // 2. SUPABASE CLIENT HELPER
    // ============================================================
    // Assuming getSupabaseClient() is available globally from header-core.js

    // ============================================================
    // 3. FETCH DEALS (SECURED)
    // ============================================================

    async function fetchDeals() {
        const client = window.getSupabaseClient?.();
        if (!client) return [];

        try {
            const { data, error } = await client.rpc('get_active_deals');

            if (error) throw error;
            
            // Map the RPC result to the format expected by the slider
            const dealsWithProducts = (data || []).map(item => ({
                ...item,
                dealDiscount: item.deal_discount,
                isDeal: true,
                originalPrice: item.original_price,
                discountedPrice: item.discounted_price,
                price: item.price // Keep original price field for fallback
            }));

            console.log(`✅ Loaded ${dealsWithProducts.length} deals via RPC`);
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
           DEALS DU JOUR — SLIDER STYLES (polished)
           ============================================ */

        /* ----- Section Container ----- */
        .deals-section {
            max-width: 1200px;
            margin: 0 auto;
            padding: 48px 24px;
            overflow: hidden;
            background: #f8f9fc;
            border-radius: 24px;
            position: relative;
        }

        .deals-section::before {
            content: '';
            position: absolute;
            top: -80px;
            right: -80px;
            width: 240px;
            height: 240px;
            background: radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%);
            pointer-events: none;
        }

        /* ----- Header ----- */
        .deals-section .deals-header {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            margin-bottom: 32px;
            flex-wrap: wrap;
            gap: 16px;
            position: relative;
            z-index: 1;
        }

        .deals-section .deals-header-left {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .deals-section .deals-header h2 {
            font-size: 30px;
            font-weight: 800;
            letter-spacing: -0.5px;
            color: #0F172A;
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 0;
            line-height: 1.15;
        }

        .deals-section .deals-header h2 i {
            color: #EF4444;
            filter: drop-shadow(0 4px 10px rgba(239,68,68,0.35));
        }

        .deals-section .deals-header .deals-subtitle {
            font-size: 14px;
            color: #64748B;
            font-weight: 500;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .deals-section .deals-subtitle .live-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #EF4444;
            box-shadow: 0 0 0 4px rgba(239,68,68,0.18);
            animation: dealPulse 1.6s ease-in-out infinite;
        }

        @keyframes dealPulse {
            0%, 100% { transform: scale(1);   opacity: 1;   }
            50%      { transform: scale(1.2); opacity: 0.7; }
        }

        /* Countdown pill in the header */
        .deals-section .deals-timer {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #0F172A;
            color: white;
            padding: 8px 14px;
            border-radius: 50px;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.4px;
            box-shadow: 0 6px 20px rgba(15,23,42,0.18);
        }

        .deals-section .deals-timer i {
            color: #F59E0B;
            font-size: 12px;
        }

        /* ----- Slider Wrapper ----- */
        .deals-slider-wrapper {
            position: relative;
            overflow: hidden;
            border-radius: 20px;
            padding: 8px 4px 20px;
            -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%);
                    mask-image: linear-gradient(90deg, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%);
        }

        .deals-slider-track {
            display: flex;
            gap: 20px;
            transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            will-change: transform;
        }

        .deal-slide {
            flex: 0 0 240px;
            min-width: 240px;
        }

        /* ----- Card ----- */
        .deal-card {
            background: #ffffff;
            border-radius: 18px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04);
            transition: transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94),
                        box-shadow 0.35s ease,
                        border-color 0.35s ease;
            cursor: pointer;
            border: 1px solid #eef0f4;
            position: relative;
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        .deal-card:hover {
            transform: translateY(-6px);
            box-shadow: 0 20px 40px rgba(15,23,42,0.12);
            border-color: rgba(108,60,225,0.35);
        }

        /* ----- Image ----- */
        .deal-card .deal-card-image {
            position: relative;
            width: 100%;
            padding-top: 100%;
            overflow: hidden;
            background: linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%);
        }

        .deal-card .deal-card-image img {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94);
        }

        .deal-card:hover .deal-card-image img {
            transform: scale(1.08);
        }

        /* Discount badge — now top-left, more prominent */
        .deal-discount-badge {
            position: absolute;
            top: 10px;
            left: 10px;
            background: linear-gradient(135deg, #EF4444, #DC2626);
            color: white;
            padding: 5px 12px;
            border-radius: 50px;
            font-size: 13px;
            font-weight: 800;
            z-index: 2;
            box-shadow: 0 6px 18px rgba(239,68,68,0.35);
            letter-spacing: 0.3px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .deal-discount-badge i {
            font-size: 10px;
        }

        /* Soft scrim at bottom of image so nothing clashes */
        .deal-card .deal-card-image::after {
            content: '';
            position: absolute;
            left: 0; right: 0; bottom: 0;
            height: 40%;
            background: linear-gradient(to top, rgba(0,0,0,0.08), transparent);
            pointer-events: none;
        }

        /* ----- Card Body ----- */
        .deal-card .deal-card-body {
            padding: 16px 16px 18px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            flex: 1;
        }

        .deal-card .deal-card-brand {
            font-size: 11px;
            color: #6C3CE1;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            font-weight: 700;
            margin: 0;
        }

        .deal-card .deal-card-title {
            font-weight: 700;
            font-size: 15px;
            color: #0F172A;
            line-height: 1.35;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            margin: 0;
            min-height: 40px;
        }

        .deal-card .deal-card-price {
            display: flex;
            align-items: baseline;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 4px;
        }

        .deal-card .deal-current-price {
            font-weight: 800;
            font-size: 19px;
            color: #EF4444;
            letter-spacing: -0.3px;
        }

        .deal-card .deal-original-price {
            font-size: 13px;
            color: #94A3B8;
            text-decoration: line-through;
            font-weight: 500;
        }

        .deal-card .deal-card-actions {
            margin-top: auto;
            padding-top: 12px;
        }

        .deal-card .deal-btn-cart {
            width: 100%;
            padding: 10px 14px;
            background: linear-gradient(135deg, #6C3CE1, #5A2FC4);
            color: white;
            border: none;
            border-radius: 12px;
            font-weight: 700;
            font-size: 13px;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
            font-family: inherit;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            letter-spacing: 0.2px;
            box-shadow: 0 4px 14px rgba(108,60,225,0.25);
        }

        .deal-card .deal-btn-cart:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 22px rgba(108,60,225,0.4);
            filter: brightness(1.05);
        }

        .deal-card .deal-btn-cart i {
            font-size: 12px;
            transition: transform 0.25s ease;
        }

        .deal-card .deal-btn-cart:hover i {
            transform: translateX(3px);
        }

        /* ----- View All Button ----- */
        .deal-view-all {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 11px 26px;
            background: #ffffff;
            border: 2px solid #6C3CE1;
            color: #6C3CE1;
            border-radius: 50px;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.25s ease;
            font-family: inherit;
            margin-top: 24px;
            text-decoration: none;
        }

        .deal-view-all:hover {
            background: #6C3CE1;
            color: #ffffff;
            transform: translateX(4px);
            box-shadow: 0 8px 24px rgba(108,60,225,0.3);
        }

        .deal-view-all i {
            transition: transform 0.3s ease;
        }

        .deal-view-all:hover i {
            transform: translateX(3px);
        }

        /* ----- Responsive ----- */
        @media (max-width: 768px) {
            .deals-section {
                padding: 36px 16px;
                border-radius: 20px;
            }

            .deals-section .deals-header h2 {
                font-size: 22px;
            }

            .deals-section .deals-header .deals-subtitle {
                font-size: 13px;
            }

            .deals-section .deals-timer {
                font-size: 12px;
                padding: 6px 12px;
            }

            .deal-slide {
                flex: 0 0 180px;
                min-width: 180px;
            }

            .deal-card .deal-card-body {
                padding: 14px 14px 16px;
            }

            .deal-card .deal-card-title {
                font-size: 13px;
                min-height: 36px;
            }

            .deal-card .deal-current-price {
                font-size: 16px;
            }

            .deal-card .deal-original-price {
                font-size: 12px;
            }

            .deal-card .deal-btn-cart {
                font-size: 12px;
                padding: 9px 12px;
            }

            .deal-discount-badge {
                font-size: 12px;
                padding: 4px 10px;
            }
        }

        @media (max-width: 480px) {
            .deals-section {
                padding: 28px 12px;
            }

            .deals-section .deals-header h2 {
                font-size: 19px;
            }

            .deal-slide {
                flex: 0 0 155px;
                min-width: 155px;
            }

            .deal-card .deal-card-body {
                padding: 12px 12px 14px;
            }

            .deal-card .deal-card-title {
                font-size: 12.5px;
                -webkit-line-clamp: 2;
                min-height: 34px;
            }

            .deal-card .deal-current-price {
                font-size: 15px;
            }

            .deal-card .deal-original-price {
                font-size: 11px;
            }

            .deal-card .deal-btn-cart {
                font-size: 11px;
                padding: 8px 10px;
                border-radius: 10px;
            }

            .deal-discount-badge {
                font-size: 11px;
                padding: 3px 9px;
                top: 8px;
                left: 8px;
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
            window.navigateWithUserInfo('/deals/');
        };
      

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

    console.log('✅ Deals Slider Component Loaded (SECURE RPC VERSION)');
})();
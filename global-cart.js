// ============================================================
//  GLOBAL CART MODULE - Universal Add to Cart
//  Save this as global-cart.js
// ============================================================

(function() {
    'use strict';

    // ============================================================
    //  1. CART FUNCTIONS - Single source of truth
    // ============================================================

    /**
     * Get current cart from localStorage or memory
     */
    async function getCart() {
        try {
            // First check if STHeader has the cart (more reliable)
            if (window.STHeader && window.STHeader.AppState && window.STHeader.AppState.cart) {
                return window.STHeader.AppState.cart;
            }
            return JSON.parse(localStorage.getItem('st_cart') || '[]');
        } catch (e) {
            return [];
        }
    }

    /**
     * Save cart to localStorage and Supabase
     */
    async function saveCart(cart) {
        // Update localStorage
        localStorage.setItem('st_cart', JSON.stringify(cart));

        // Update STHeader
        if (window.STHeader) {
            window.STHeader.AppState.cart = cart;
            if (window.STHeader.updateCounts) {
                window.STHeader.updateCounts();
            }
        }

        // Save to Supabase if logged in
        const customerId = window.getCurrentCustomerId ? window.getCurrentCustomerId() : null;
        const sessionId = localStorage.getItem('st_session_id') || 'session_' + Date.now();
        const client = getSupabaseClient();

        if (client) {
            try {
                if (customerId) {
                    await client.from('cart').delete().eq('customer_id', customerId);
                } else {
                    await client.from('cart').delete().eq('session_id', sessionId);
                }

                if (cart.length > 0) {
                    const rows = cart.map(item => ({
                        ...(customerId ? { customer_id: customerId } : { session_id: sessionId }),
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
                        await client.from('cart').insert(validRows);
                    }
                }
            } catch (err) {
                console.warn('Cart sync error:', err.message);
            }
        }
    }


    async function checkProductDeal(productId) {
        const client = getSupabaseClient();
        if (!client) return null;

        try {
            const { data, error } = await client
                .from('deals')
                .select('discount')
                .eq('product_id', productId)
                .single();

            if (error || !data) return null;
            return data;
        } catch (err) {
            return null;
        }
    }

    /**
     * Show toast notification
     */
    function showToast(message, type = 'success') {
        // Remove existing toast
        const existing = document.querySelector('.global-toast');
        if (existing) existing.remove();

        const colors = {
            success: '#10B981',
            error: '#EF4444',
            info: '#3B82F6',
            warning: '#F59E0B'
        };

        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };

        const toast = document.createElement('div');
        toast.className = 'global-toast';
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
            animation: globalToastSlideUp 0.3s ease;
            font-family: 'Inter', sans-serif;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        toast.innerHTML = `${icons[type] || '✅'} ${message}`;
        document.body.appendChild(toast);

        // Add animation style if not exists
        if (!document.getElementById('globalToastStyle')) {
            const style = document.createElement('style');
            style.id = 'globalToastStyle';
            style.textContent = `
                @keyframes globalToastSlideUp {
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
    //  2. MAIN ADD TO CART - UNIVERSAL
    // ============================================================

    async function addToCart(product, qty = 1, variants = {}) {
        try {
            let productData;
            let productId;

            // Handle both string ID and object
            if (typeof product === 'string') {
                productId = product;
                // Try to find product from various caches
                productData = await findProduct(productId);
            } else if (product && typeof product === 'object') {
                productId = product.id;
                productData = product;
            } else {
                showToast('❌ Invalid product', 'error');
                return false;
            }

            if (!productData) {
                showToast('❌ Product not found', 'error');
                return false;
            }

            // Check stock
            if (productData.stock !== undefined && qty > productData.stock) {
                showToast(`⚠️ Only ${productData.stock} items available`, 'warning');
                return false;
            }

            // Get current cart
            const cart = await getCart();
            const existingIndex = cart.findIndex(item =>
                item.product_id === productId || item.id === productId
            );

            // Check for deal
            const deal = await checkProductDeal(productId);
            const dealDiscount = deal ? deal.discount : 0;
            const finalPrice = dealDiscount > 0 ? productData.price * (1 - dealDiscount / 100) : productData.price;

            // Build cart item
            const cartItem = {
                product_id: productId,
                id: productId,
                name: productData.name || 'Unknown Product',
                price: finalPrice,
                qty: qty,
                image: productData.image || productData.images?.[0] || 'https://placehold.co/400x400',
                variants: variants || {},
                isDeal: dealDiscount > 0,
                originalPrice: dealDiscount > 0 ? productData.price : null,
                discount: dealDiscount > 0 ? dealDiscount : null,
                brand: productData.brand || ''
            };

            if (existingIndex !== -1) {
                cart[existingIndex].qty = (cart[existingIndex].qty || 0) + qty;
            } else {
                cart.push(cartItem);
            }

            // Save cart
            await saveCart(cart);

            // Show success
            showToast(`✅ ${productData.name} added to cart!`, 'success');

            // Also update any page-specific cart UI
            if (window.renderCart) {
                window.renderCart();
            }

            return true;

        } catch (err) {
            console.error('❌ Add to cart error:', err);
            showToast('❌ Failed to add to cart', 'error');
            return false;
        }
    }

    // ============================================================
    //  3. FIND PRODUCT - Searches all caches
    // ============================================================

    async function findProduct(productId) {
        // Check if product is in any global cache
        const caches = [
            window.allProductsCache,
            window._allProducts,
            window.products,
            window.productData
        ];

        for (const cache of caches) {
            if (Array.isArray(cache) && cache.length > 0) {
                const found = cache.find(p => p.id === productId);
                if (found) return found;
            }
        }

        // Try to fetch from Supabase
        const client = getSupabaseClient();
        if (client) {
            try {
                const { data, error } = await client
                    .from('products')
                    .select('*')
                    .eq('id', productId)
                    .single();

                if (!error && data) return data;
            } catch (err) {
                // ignore
            }
        }

        // Try to get from page DOM
        const card = document.querySelector(`[data-product-id="${productId}"]`);
        if (card) {
            const name = card.querySelector('.product-name')?.textContent ||
                         card.querySelector('.hot-product-name')?.textContent ||
                         card.querySelector('.category-product-name')?.textContent ||
                         'Unknown Product';
            const priceText = card.querySelector('.current-price')?.textContent ||
                             card.querySelector('.hot-current-price')?.textContent ||
                             card.querySelector('.category-current-price')?.textContent ||
                             '0';
            const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
            const image = card.querySelector('img')?.src || 'https://placehold.co/400x400';
            return { id: productId, name, price, image };
        }

        return null;
    }

    // ============================================================
    //  4. WISHLIST FUNCTIONS
    // ============================================================

    async function toggleWishlist(productId) {
        try {
            let wishlist = JSON.parse(localStorage.getItem('st_wishlist') || '[]');
            const index = wishlist.indexOf(productId);

            if (index !== -1) {
                wishlist.splice(index, 1);
                showToast('❤️ Removed from wishlist', 'info');
            } else {
                wishlist.push(productId);
                showToast('❤️ Added to wishlist!', 'success');
            }

            localStorage.setItem('st_wishlist', JSON.stringify(wishlist));

            // Save to Supabase
            const customerId = window.getCurrentCustomerId ? window.getCurrentCustomerId() : null;
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

            // Update header
            if (window.STHeader) {
                window.STHeader.AppState.wishlist = wishlist;
                if (window.STHeader.updateCounts) {
                    window.STHeader.updateCounts();
                }
            }

            // Update UI
            document.querySelectorAll(`.wishlist-btn, .hot-product-wishlist, .rp-wishlist-btn`).forEach(btn => {
                if (btn.dataset.productId === productId || btn.getAttribute('onclick')?.includes(productId)) {
                    btn.classList.toggle('active');
                }
            });

            return wishlist;

        } catch (err) {
            console.error('❌ Wishlist error:', err);
            showToast('❌ Failed to update wishlist', 'error');
            return [];
        }
    }

    // ============================================================
    //  5. EXPOSE GLOBALLY
    // ============================================================

    // Expose all functions
    window.GlobalCart = {
        getCart,
        saveCart,
        addToCart,
        toggleWishlist,
        checkProductDeal,
        showToast,
        getSupabaseClient,
        findProduct
    };

    // Also expose individual functions for inline onclick
    window.addToCart = addToCart;
    window.toggleWishlist = toggleWishlist;
    window.showToast = showToast;
    window.getCart = getCart;
    window.saveCart = saveCart;
    window.getSupabaseClient = getSupabaseClient;

    // Also expose as handleAddToCart for compatibility
    window.handleAddToCart = addToCart;

    console.log('✅ Global Cart Module loaded');

})();
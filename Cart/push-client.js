
    // ============================================================
    // 1. CART STATE
    // ============================================================

    let cartItems = [];
    let discountApplied = 0;
    let discountCode = '';

    // Helper function to translate dynamic content
    function t(key, fallback) {
        if (window.Translations && window.Translations.translate) {
            const result = window.Translations.translate(key);
            if (result && result !== key) return result;
        }
        return fallback || key;
    }

    // ============================================================
    // 2. RENDER CART
    // ============================================================

function renderCart() {
    const container = document.getElementById('stCartItemsContainer');
    const loading = document.getElementById('stCartLoading');
    const cartCount = document.getElementById('stCartPageCount');

    loading.style.display = 'none';

    if (!cartItems || cartItems.length === 0) {
        container.innerHTML = `
            <div class="st-empty-cart">
                <div class="st-empty-icon"><i class="fas fa-shopping-bag"></i></div>
                <h2 data-translate="cart_empty_title">Your cart is empty</h2>
                <p data-translate="cart_empty_sub">Looks like you haven't added any items to your cart yet.</p>
                <a href="/product/" class="st-btn-shop" data-translate="start_shopping">
                    <i class="fas fa-store"></i> Start Shopping
                </a>
            </div>
        `;
        cartCount.textContent = t('items_count_zero', '0 items');
        updateSummary();
        translateUI();
        return;
    }

    cartCount.textContent = cartItems.length + ' ' + t('items', 'item') + (cartItems.length > 1 ? 's' : '');

    container.innerHTML = cartItems.map((item, index) => {
        // --- 1. SAFE VARIANT HANDLING ---
        let variantMarkup = '';
        
        if (item.variants) {
            let parsedVariants = item.variants;
            
            // Handle raw JSON strings from Supabase
            if (typeof parsedVariants === 'string') {
                try {
                    parsedVariants = JSON.parse(parsedVariants);
                } catch (e) {
                    if (parsedVariants.trim() !== '{}') {
                        variantMarkup = `<span class="st-item-variant">${parsedVariants}</span>`;
                    }
                }
            }

            // Handle parsed object (Ensure it's not empty `{}`)
            if (typeof parsedVariants === 'object' && parsedVariants !== null && !variantMarkup) {
                const entries = Object.entries(parsedVariants);
                if (entries.length > 0) {
                    const formattedText = entries.map(([key, val]) => `${key}: ${val}`).join(' | ');
                    variantMarkup = `<span class="st-item-variant">${formattedText}</span>`;
                }
            }
        }

        // --- 2. SAFE DEAL & PRICE HANDLING ---
        const price = Number(item.price || 0);
        const originalPrice = Number(item.original_price || item.originalPrice || 0);
        const isDeal = item.is_deal || item.isDeal || (originalPrice > price);
        
        let dealBadgeMarkup = '';
        let originalPriceMarkup = '';

        if (isDeal) {
            dealBadgeMarkup = `<span class="st-deal-badge" style="background:#EF4444; color:white; font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px; margin-left:6px;"><i class="fas fa-fire"></i> ${t('deal', 'DEAL')}</span>`;
            
            if (originalPrice > price) {
                const discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
                originalPriceMarkup = `
                    <span class="st-original-price" style="text-decoration:line-through; color:#94A3B8; font-size:14px; margin-left:6px;">FCFA${originalPrice.toFixed(2)}</span>
                    <span class="st-deal-badge" style="background:#10B981; color:white; font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px; margin-left:4px;">-${discountPercent}%</span>
                `;
            }
        }

        return `
            <div class="st-cart-item" data-index="${index}">
                <div class="st-cart-item-image">
                    <img src="${item.image || 'https://placehold.co/600x400'}" 
                         alt="${item.name || 'Product'}" 
                         onerror="this.src='https://placehold.co/600x400'">
                </div>
                <div class="st-cart-item-details">
                    <a onclick="window.navigateWithUserInfo('/item/?product=${item.product_id || item.id}'); return false;"  class="st-item-name">
                        ${item.name || 'Unknown Product'}
                    </a>
                    ${item.brand ? `<span class="st-item-brand">${item.brand}</span>` : ''}
                    
                    <!-- Renders variant if present -->
                    ${variantMarkup}

                    <div class="st-item-price">
                        FCFA${price.toFixed(2)}
                        <!-- Renders original price & deal badge if present -->
                        ${originalPriceMarkup}
                        ${dealBadgeMarkup}
                    </div>
                </div>
                <div class="st-cart-item-actions">
                    <div class="st-quantity-control">
                        <button onclick="updateQuantity(${index}, -1)" aria-label="${t('decrease_quantity', 'Decrease quantity')}">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="st-qty-value">${item.qty || 1}</span>
                        <button onclick="updateQuantity(${index}, 1)" aria-label="${t('increase_quantity', 'Increase quantity')}">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <button class="st-remove-btn" onclick="removeItem(${index})" aria-label="${t('remove_item', 'Remove item')}" data-translate="remove">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    updateSummary();
}
    // ============================================================
    // 3. CART OPERATIONS
    // ============================================================

    function updateQuantity(index, change) {
        if (!cartItems[index]) return;
        const newQty = (cartItems[index].qty || 1) + change;
        if (newQty < 1) return;
        
        cartItems[index].qty = newQty;
        
        // ✅ CRITICAL: Save to localStorage AND Supabase
        saveCart();
        renderCart();
    }

    function removeItem(index) {
        if (!cartItems[index]) return;
        
        const removedItem = cartItems[index];
        cartItems.splice(index, 1);
        
        // ✅ CRITICAL: Save to localStorage AND Supabase
        saveCart();
        renderCart();
        
        if (removedItem && removedItem.name) {
            showNotification(`🗑️ ${t('removed_from_cart', 'Removed')} "${removedItem.name}" ${t('from_cart', 'from cart')}`);
        }
    }

    // ============================================================
    // 4. SAVE CART - FIXED: Always saves to localStorage
    // ============================================================

    async function saveCart() {
        // 1. DEDUPLICATE: Remove duplicate product entries before saving
        const uniqueCart = [];
        const seen = new Set();
        
        for (const item of cartItems) {
            const key = item.product_id || item.id;
            if (!key) continue;
            
            if (seen.has(key)) {
                const existing = uniqueCart.find(i => (i.product_id || i.id) === key);
                if (existing) {
                    existing.qty = (existing.qty || 0) + (item.qty || 1);
                }
            } else {
                seen.add(key);
                uniqueCart.push({ ...item });
            }
        }
        
        // Use the deduplicated cart
        cartItems = uniqueCart;
        
        // ✅ 2. ALWAYS save to localStorage first (for checkout page)
        localStorage.setItem('st_cartcheckout', JSON.stringify(cartItems));
        sessionStorage.setItem('st_cartcheckeout', JSON.stringify(cartItems));
        localStorage.removeItem('st_cart');
        console.log('💾 Cart saved to localStorage:', cartItems.length, 'items');

        // 3. Update header badge
        if (window.STHeader && window.STHeader.AppState) {
            window.STHeader.AppState.cart = cartItems;
            if (window.STHeader.updateCounts) {
                window.STHeader.updateCounts();
            }
        }

        // 4. Save to Supabase asynchronously (don't block UI)
        const customerId = window.getCurrentCustomerId ? window.getCurrentCustomerId() : null;
        const sessionId = localStorage.getItem('st_session_id') || 'session_' + Date.now();

        if (cartItems.length === 0) {
            // Clear from Supabase
            if (customerId) {
                deleteCartFromDB(customerId, true);
            } else {
                deleteCartFromDB(sessionId, false);
            }
        } else {
            if (customerId) {
                saveCartToDB(customerId, cartItems, true);
            } else {
                saveCartToDB(sessionId, cartItems, false);
            }
        }
    }

    // ============================================================
    // 5. DELETE CART FROM DATABASE
    // ============================================================

    async function deleteCartFromDB(identifier, hasCustomerId = false) {
        const client = getSupabaseClient();
        if (!client) return;
        
        try {
            let query;
            if (hasCustomerId) {
                query = client.from('cart').delete().eq('customer_id', identifier);
            } else {
                query = client.from('cart').delete().eq('session_id', identifier);
            }
            
            const { error } = await query;
            if (error) {
                console.error('❌ Error deleting cart from DB:', error.message);
            } else {
                console.log(`✅ Cart cleared from DB (${hasCustomerId ? 'customer_id' : 'session_id'})`);
            }
        } catch (err) {
            console.error('❌ Error deleting cart from DB:', err.message);
        }
    }

    // ============================================================
    // 6. SAVE CART TO DB
    // ============================================================


    // ============================================================
    // 7. SUMMARY
    // ============================================================

    function updateSummary() {
        const subtotal = cartItems.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);
        const shipping = subtotal >= 50 ? 0 : 5.99;
        const discountAmount = discountApplied > 0 ? (subtotal * discountApplied / 100) : 0;
        const total = subtotal + shipping - discountAmount;

        document.getElementById('stSubtotal').textContent = '$' + subtotal.toFixed(2);
        document.getElementById('stShipping').textContent = shipping === 0 ? t('free', 'Free') : '$' + shipping.toFixed(2);
        document.getElementById('stDiscount').textContent = discountAmount > 0 ? '-$' + discountAmount.toFixed(2) : '$0.00';
        document.getElementById('stTotal').textContent = '$' + total.toFixed(2);

        const checkoutBtn = document.getElementById('stCheckoutBtn');
        if (checkoutBtn) checkoutBtn.disabled = cartItems.length === 0;
    }

    // ============================================================
    // 8. DISCOUNT CODE
    // ============================================================

    document.addEventListener('DOMContentLoaded', () => {
        const applyBtn = document.getElementById('stApplyDiscount');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                const code = document.getElementById('stDiscountCode').value.trim().toUpperCase();
                if (code === 'SAVE10') {
                    discountApplied = 10;
                    discountCode = code;
                    showNotification('✅ ' + t('discount_applied', '10% discount applied!'));
                } else if (code === 'SAVE20') {
                    discountApplied = 20;
                    discountCode = code;
                    showNotification('✅ ' + t('discount_applied_20', '20% discount applied!'));
                } else if (code === '') {
                    discountApplied = 0;
                    discountCode = '';
                    showNotification('ℹ️ ' + t('discount_removed', 'Discount removed'));
                } else {
                    showNotification('❌ ' + t('invalid_discount', 'Invalid discount code'), 'error');
                    return;
                }
                updateSummary();
            });
        }
    });

    // ============================================================
    // 9. CHECKOUT - FIXED: Saves cart before navigating
    // ============================================================

    document.addEventListener('DOMContentLoaded', () => {
        const checkoutBtn = document.getElementById('stCheckoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click',  async () => {
                if (cartItems.length === 0) return;
                
                // ✅ CRITICAL: Save cart to localStorage before navigating
                await saveCart();
                
                const isLoggedIn = window.STHeader?.AppState?.isLoggedIn || false;
                
                if (!isLoggedIn) {
                    if (window.setPendingCheckout) {
                        window.setPendingCheckout(true);
                    } else {
                        localStorage.setItem('st_pending_checkout', '1');
                        sessionStorage.setItem('st_pending_checkout', '1');
                    }
                    
                    showNotification('⚠️ ' + t('please_login_to_checkout', 'Please login to checkout'), 'error');
                    if (window.STHeader?.openLoginModal) {
                        window.STHeader.openLoginModal();
                    }
                    return;
                }
                
                if (window.clearPendingCheckout) {
                    window.clearPendingCheckout();
                }
                window.navigateWithUserInfo('/checkout/');
            });
        }
    });

    // ============================================================
    // 10. NOTIFICATION
    // ============================================================

    function showNotification(message, type = 'success') {
        const existing = document.querySelector('.st-notification');
        if (existing) existing.remove();
        
        const notif = document.createElement('div');
        notif.className = 'st-notification';
        notif.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            padding: 14px 24px;
            background: ${type === 'error' ? '#EF4444' : '#10B981'};
            color: white;
            border-radius: 12px;
            font-weight: 600;
            font-size: 14px;
            z-index: 30000;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            max-width: 90%;
            text-align: center;
            animation: slideUp 0.3s ease;
            font-family: 'Inter', sans-serif;
        `;
        notif.textContent = message;
        document.body.appendChild(notif);
        
        setTimeout(() => {
            notif.style.opacity = '0';
            notif.style.transform = 'translateX(-50%) translateY(-20px)';
            notif.style.transition = 'all 0.3s ease';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }

    // ============================================================
    // 11. FETCH CART FROM DB
    // ============================================================

    async function fetchCartFromDB(identifier, hasCustomerId = false) {
        const client = getSupabaseClient();
        if (!client) return [];
        
        try {
            let query = client.from('cart').select('*');
            
            if (hasCustomerId) {
                query = query.eq('customer_id', identifier);
            } else {
                query = query.eq('session_id', identifier);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            return (data || []).map(item => ({
                product_id: item.product_id,
                id: item.product_id,
                name: item.name || 'Unknown Product',
                price: item.price || 0,
                qty: item.qty || 1,
                image: item.image || 'https://placehold.co/600x400',
                variants: item.variants || {},
                isDeal: item.is_deal || false,
                originalPrice: item.original_price || null,
                discount: item.discount || null,
                brand: item.brand || ''
            }));
        } catch (err) {
            console.error('❌ Error fetching cart:', err.message);
            return [];
        }
    }

    // ============================================================
    // 12. LOAD CART DATA - FIXED: Prioritizes localStorage
    // ============================================================
    async function getCart() {
        try {
            return JSON.parse(localStorage.getItem('st_cart') || '[]');
        } catch (e) {
            return [];
        }
    }

async function loadCartData() {
    try {
        // 1. Get customer ID and session ID
        const customerId = window.getCurrentCustomerId ? window.getCurrentCustomerId() : null;
        const sessionId = window.getSessionId ? window.getSessionId() : localStorage.getItem('st_session_id') || 'session_' + Date.now();
        
        // 2. Check if user is logged in (using AppState if available)
        const isLoggedIn = window.AppState?.isLoggedIn || false;
        
        let dbCart = [];
        let loadedFromDB = false;

        // 3. If logged in, try customer_id first
        if (isLoggedIn && customerId) {
            dbCart = await fetchCartFromDB(customerId, true);
            if (dbCart && dbCart.length > 0) {
                console.log('📦 Cart loaded from DB using customer_id:', dbCart.length, 'items');
                cartItems = dbCart;
                loadedFromDB = true;
                renderCart();
                return;
            }
        }

        // 4. Try session_id cart (for guests or if customer_id didn't work)
        if (!loadedFromDB) {
            dbCart = await fetchCartFromDB(sessionId, false);
            if (dbCart && dbCart.length > 0) {
                console.log('📦 Cart loaded from DB using session_id:', dbCart.length, 'items');
                cartItems = dbCart;
                
                // 5. Migrate guest cart to customer_id if user is logged in
                if (isLoggedIn && customerId) {
                    console.log('🔄 Migrating guest cart to customer_id');
                    await saveCartToDB(customerId, cartItems, true);
                    await saveCartToDB(sessionId, [], false);
                }
                
                loadedFromDB = true;
                renderCart();
                return;
            }
        }

        // 6. No cart found - check localStorage or start empty
        if (!loadedFromDB) {
            // Try to load from localStorage as fallback
            try {
                const localCart = JSON.parse(localStorage.getItem('st_cart') || '[]');
                if (localCart && localCart.length > 0) {
                    console.log('📦 Cart loaded from localStorage:', localCart.length, 'items');
                    cartItems = localCart;
                    
                    // If logged in, save localStorage cart to DB
                    if (isLoggedIn && customerId) {
                        console.log('🔄 Migrating localStorage cart to DB');
                        await saveCartToDB(customerId, cartItems, true);
                    }
                    
                    renderCart();
                    return;
                }
            } catch (e) {
                console.warn('Failed to load from localStorage:', e.message);
            }
        }

        // 7. No cart found anywhere - start empty
        if (!loadedFromDB) {
            console.log('🛒 Starting with empty cart');
            cartItems = [];
            // Clear any stale data
            await saveCartToDB(sessionId, [], false);
            if (isLoggedIn && customerId) {
                await saveCartToDB(customerId, [], true);
            }
            renderCart();
        }
        
    } catch (err) {
        console.error('❌ Failed to load cart:', err.message);
        // Fallback to empty cart
        cartItems = [];
        renderCart();
    }
}


    // ============================================================
    // 14. INITIALIZATION
    // ============================================================

    document.addEventListener('DOMContentLoaded', () => {
        loadCartData();
        
        window.cartOperations = {
            updateQuantity,
            removeItem,
            saveCart,
            renderCart,
            getCart: () => cartItems,
            setCart: (items) => { cartItems = items; renderCart(); }
        };
    });

    // ============================================================
    // 15. EXPOSE FUNCTIONS GLOBALLY
    // ============================================================

    window.updateQuantity = updateQuantity;
    window.removeItem = removeItem;
    window.saveCart = saveCart;
    window.renderCart = renderCart;
    window.showNotification = showNotification;
    window.fetchCartFromDB = fetchCartFromDB;
    window.loadCartData = loadCartData;
  

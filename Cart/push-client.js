(function () {
    'use strict';

    /* ============================================================
       MODULE STATE
       ============================================================ */
    let cartItems       = [];
    let discountApplied = 0;
    let discountCode    = '';

    /* ============================================================
       ELEMENT LOOKUP — fresh each init
       ============================================================ */
    function getEls() {
        return {
            page:              document.getElementById('stCartPage'),
            container:         document.getElementById('stCartItemsContainer'),
            loading:           document.getElementById('stCartLoading'),
            cartCount:         document.getElementById('stCartPageCount'),
            subtotal:          document.getElementById('stSubtotal'),
            shipping:          document.getElementById('stShipping'),
            discount:          document.getElementById('stDiscount'),
            total:             document.getElementById('stTotal'),
            checkoutBtn:       document.getElementById('stCheckoutBtn'),
            applyBtn:          document.getElementById('stApplyDiscount'),
            discountInput:     document.getElementById('stDiscountCode'),
        };
    }

    /* ============================================================
       TRANSLATION + SUPABASE
       ============================================================ */
    function t(key, fallback) {
        if (window.Translations?.translate) {
            const r = window.Translations.translate(key);
            if (r && r !== key) return r;
        }
        return fallback || key;
    }

    function getSupabase() { return window.getSupabaseClient?.() || null; }

    function escapeHtml(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /* ============================================================
       NOTIFICATION
       ============================================================ */
    function showNotification(message, type = 'success') {
        document.querySelector('.st-notification')?.remove();
        const notif = document.createElement('div');
        notif.className = 'st-notification';
        notif.style.cssText = `
            position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
            padding:14px 24px;
            background:${type === 'error' ? '#EF4444' : '#10B981'};
            color:white;border-radius:12px;font-weight:600;font-size:14px;
            z-index:30000;box-shadow:0 8px 32px rgba(0,0,0,0.2);
            max-width:90%;text-align:center;
            animation:stSlideUp .3s ease;font-family:'Inter',sans-serif;`;
        notif.textContent = message;
        document.body.appendChild(notif);
        setTimeout(() => {
            notif.style.opacity = '0';
            notif.style.transform = 'translateX(-50%) translateY(-20px)';
            notif.style.transition = 'all .3s ease';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    }

    /* ============================================================
       RENDER CART
       ============================================================ */
    function renderCart() {
        const els = getEls();
        if (!els.container || !els.loading) return;

        els.loading.style.display = 'none';

        if (!cartItems?.length) {
            els.container.innerHTML = `
                <div class="st-empty-cart">
                    <div class="st-empty-icon"><i class="fas fa-shopping-bag"></i></div>
                    <h2 data-translate="cart_empty_title">Your cart is empty</h2>
                    <p data-translate="cart_empty_sub">Looks like you haven't added any items to your cart yet.</p>
                    <a href="/product/" class="st-btn-shop" data-translate="start_shopping">
                        <i class="fas fa-store"></i> Start Shopping
                    </a>
                </div>`;
            if (els.cartCount) els.cartCount.textContent = t('items_count_zero', '0 items');
            updateSummary();
            if (typeof translateUI === 'function') translateUI();
            return;
        }

        if (els.cartCount) {
            els.cartCount.textContent =
                `${cartItems.length} ${t('items', 'item')}${cartItems.length > 1 ? 's' : ''}`;
        }

        els.container.innerHTML = cartItems.map((item, index) => {
            // ---- Safe variant handling ----
            let variantMarkup = '';
            if (item.variants) {
                let pv = item.variants;
                if (typeof pv === 'string') {
                    try { pv = JSON.parse(pv); }
                    catch {
                        if (pv.trim() !== '{}') variantMarkup = `<span class="st-item-variant">${escapeHtml(pv)}</span>`;
                    }
                }
                if (typeof pv === 'object' && pv !== null && !variantMarkup) {
                    const entries = Object.entries(pv);
                    if (entries.length > 0) {
                        const text = entries.map(([k, v]) => `${k}: ${v}`).join(' | ');
                        variantMarkup = `<span class="st-item-variant">${escapeHtml(text)}</span>`;
                    }
                }
            }

            // ---- Safe price / deal handling ----
            const price         = Number(item.price || 0);
            const originalPrice = Number(item.original_price || item.originalPrice || 0);
            const isDeal        = item.is_deal || item.isDeal || (originalPrice > price);

            let dealBadgeMarkup = '';
            let originalPriceMarkup = '';

            if (isDeal) {
                dealBadgeMarkup = `<span class="st-deal-badge" style="background:#EF4444;color:white;font-size:11px;font-weight:700;padding:2px 8px;border-radius:12px;margin-left:6px;"><i class="fas fa-fire"></i> ${t('deal', 'DEAL')}</span>`;

                if (originalPrice > price) {
                    const discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
                    originalPriceMarkup = `
                        <span class="st-original-price" style="text-decoration:line-through;color:#94A3B8;font-size:14px;margin-left:6px;">FCFA${originalPrice.toFixed(2)}</span>
                        <span class="st-deal-badge" style="background:#10B981;color:white;font-size:11px;font-weight:700;padding:2px 8px;border-radius:12px;margin-left:4px;">-${discountPercent}%</span>`;
                }
            }

            return `
                <div class="st-cart-item" data-index="${index}">
                    <div class="st-cart-item-image">
                        <img src="${escapeHtml(item.image || 'https://placehold.co/600x400')}"
                             alt="${escapeHtml(item.name || 'Product')}"
                             onerror="this.src='https://placehold.co/600x400'">
                    </div>
                    <div class="st-cart-item-details">
                        <a onclick="window.navigateWithUserInfo('/item/?product=${item.product_id || item.id}'); return false;"
                           class="st-item-name">
                            ${escapeHtml(item.name) || 'Unknown Product'}
                        </a>
                        ${item.brand ? `<span class="st-item-brand">${escapeHtml(item.brand)}</span>` : ''}
                        ${variantMarkup}
                        <div class="st-item-price">
                            FCFA ${price.toFixed(2)}
                            ${originalPriceMarkup}
                            ${dealBadgeMarkup}
                        </div>
                    </div>
                    <div class="st-cart-item-actions">
                        <div class="st-quantity-control">
                            <button onclick="window.updateQuantity(${index}, -1)" aria-label="${t('decrease_quantity', 'Decrease')}">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="st-qty-value">${item.qty || 1}</span>
                            <button onclick="window.updateQuantity(${index}, 1)" aria-label="${t('increase_quantity', 'Increase')}">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <button class="st-remove-btn" onclick="window.removeItem(${index})">
                              <i  aria-label="${t('remove_item', 'Remove')}" data-translate="remove"></i>
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>`;
        }).join('');

        updateSummary();
        if (typeof translateUI === 'function') translateUI();
    }

    /* ============================================================
       CART OPERATIONS
       ============================================================ */
    function updateQuantity(index, change) {
        if (!cartItems[index]) return;
        const newQty = (cartItems[index].qty || 1) + change;
        if (newQty < 1) return;

        cartItems[index].qty = newQty;
        saveCart();
        renderCart();
    }

    function removeItem(index) {
        if (!cartItems[index]) return;
        const removed = cartItems[index];
        cartItems.splice(index, 1);
        saveCart();
        renderCart();
        if (removed?.name) {
            showNotification(`🗑️ ${t('removed_from_cart', 'Removed')} "${removed.name}" ${t('from_cart', 'from cart')}`);
        }
    }

    /* ============================================================
       SAVE CART  (localStorage authoritative, DB best-effort)
       ============================================================ */
    async function saveCart() {
        // Deduplicate by product_id
        const unique = [];
        const seen = new Set();
        for (const item of cartItems) {
            const key = item.product_id || item.id;
            if (!key) continue;
            if (seen.has(key)) {
                const existing = unique.find(i => (i.product_id || i.id) === key);
                if (existing) existing.qty = (existing.qty || 0) + (item.qty || 1);
            } else {
                seen.add(key);
                unique.push({ ...item });
            }
        }
        cartItems = unique;

        // localStorage (authoritative — checkout page reads from here)
        localStorage.setItem('st_cartcheckout', JSON.stringify(cartItems));
        sessionStorage.setItem('st_cartcheckout', JSON.stringify(cartItems));   // ← typo fixed
        // Legacy key used by other pages' getCart(); keep in sync
        localStorage.setItem('st_cart', JSON.stringify(cartItems));

        if (window.STHeader?.AppState) {
            window.STHeader.AppState.cart = cartItems;
            window.STHeader.updateCounts?.();
        }

        // Supabase best-effort
        const customerId = window.getCurrentCustomerId?.() || null;
        const sessionId = localStorage.getItem('st_session_id') || 'session_' + Date.now();

        if (cartItems.length === 0) {
            if (customerId) await deleteCartFromDB(customerId, true);
            else            await deleteCartFromDB(sessionId, false);
        } else {
            if (customerId) await window.saveCartToDB?.(customerId, cartItems, true);
            else            await window.saveCartToDB?.(sessionId, cartItems, false);
        }
    }

    /* ============================================================
       SUPABASE I/O
       ============================================================ */
    async function deleteCartFromDB(identifier, hasCustomerId = false) {
        const client = getSupabase();
        if (!client) return;
        try {
            const col = hasCustomerId ? 'customer_id' : 'session_id';
            const { error } = await client.from('cart').delete().eq(col, identifier);
            if (error) console.error('❌ Error deleting cart from DB:', error.message);
        } catch (err) {
            console.error('❌ Error deleting cart from DB:', err.message);
        }
    }

    async function fetchCartFromDB(identifier, hasCustomerId = false) {
        const client = getSupabase();
        if (!client) return [];
        try {
            const col = hasCustomerId ? 'customer_id' : 'session_id';
            const { data, error } = await client.from('cart').select('*').eq(col, identifier);
            if (error) throw error;
            return (data || []).map(item => ({
                product_id:    item.product_id,
                id:            item.product_id,
                name:          item.name || 'Unknown Product',
                price:         item.price || 0,
                qty:           item.qty || 1,
                image:         item.image || 'https://placehold.co/600x400',
                variants:      item.variants || {},
                isDeal:        item.is_deal || false,
                originalPrice: item.original_price || null,
                discount:      item.discount || null,
                brand:         item.brand || ''
            }));
        } catch (err) {
            console.error('❌ Error fetching cart:', err.message);
            return [];
        }
    }

    /* ============================================================
       SUMMARY
       ============================================================ */
    function updateSummary() {
        const els = getEls();

        const subtotal = cartItems.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
        const shipping = subtotal >= 50000 ? 0 : 2000;
        const discountAmt = discountApplied > 0 ? (subtotal * discountApplied / 100) : 0;
        const total = subtotal + shipping - discountAmt;

        if (els.subtotal) els.subtotal.textContent = `FCFA ${subtotal.toFixed(2)}`;
        if (els.shipping) els.shipping.textContent = shipping === 0 ? t('free', 'Free') : `FCFA ${shipping.toFixed(2)}`;
        if (els.discount) els.discount.textContent = discountAmt > 0 ? `-FCFA ${discountAmt.toFixed(2)}` : 'FCFA 0.00';
        if (els.total)    els.total.textContent    = `FCFA ${total.toFixed(2)}`;

        if (els.checkoutBtn) els.checkoutBtn.disabled = cartItems.length === 0;
    }

    /* ============================================================
       BIND INTERACTIONS — assignment (idempotent)
       ============================================================ */
    function bindInteractions() {
        const els = getEls();

        if (els.applyBtn && els.discountInput) {
            els.applyBtn.onclick = () => {
                const code = els.discountInput.value.trim().toUpperCase();
                if (code === 'SAVE10') {
                    discountApplied = 10; discountCode = code;
                    showNotification('✅ ' + t('discount_applied', '10% discount applied!'));
                } else if (code === 'SAVE20') {
                    discountApplied = 20; discountCode = code;
                    showNotification('✅ ' + t('discount_applied_20', '20% discount applied!'));
                } else if (code === '') {
                    discountApplied = 0; discountCode = '';
                    showNotification('ℹ️ ' + t('discount_removed', 'Discount removed'));
                } else {
                    showNotification('❌ ' + t('invalid_discount', 'Invalid discount code'), 'error');
                    return;
                }
                updateSummary();
            };
        }

        if (els.checkoutBtn) {
            els.checkoutBtn.onclick = async () => {
                if (!cartItems.length) return;
                await saveCart();

                const isLoggedIn = window.STHeader?.AppState?.isLoggedIn || false;
                if (!isLoggedIn) {
                    if (window.setPendingCheckout) window.setPendingCheckout(true);
                    else {
                        localStorage.setItem('st_pending_checkout', '1');
                        sessionStorage.setItem('st_pending_checkout', '1');
                    }
                    showNotification('⚠️ ' + t('please_login_to_checkout', 'Please login to checkout'), 'error');
                    window.STHeader?.openLoginModal?.();
                    return;
                }
                window.clearPendingCheckout?.();
                window.navigateWithUserInfo?.('/checkout/');
            };
        }
    }

    /* ============================================================
       LOAD CART
       ============================================================ */
    async function loadCartData() {
        try {
            const customerId = window.getCurrentCustomerId?.() || null;
            const sessionId  = (window.getSessionId?.())
                            || localStorage.getItem('st_session_id')
                            || 'session_' + Date.now();
            const isLoggedIn = window.STHeader?.AppState?.isLoggedIn || window.AppState?.isLoggedIn || false;

            let dbCart = [];

            if (isLoggedIn && customerId) {
                dbCart = await fetchCartFromDB(customerId, true);
                if (dbCart.length) {
                    cartItems = dbCart;
                    renderCart();
                    return;
                }
            }

            dbCart = await fetchCartFromDB(sessionId, false);
            if (dbCart.length) {
                cartItems = dbCart;
                if (isLoggedIn && customerId) {
                    await window.saveCartToDB?.(customerId, cartItems, true);
                    await window.saveCartToDB?.(sessionId, [], false);
                }
                renderCart();
                return;
            }

            // localStorage fallback
            try {
                const local = JSON.parse(localStorage.getItem('st_cart') || '[]');
                if (local.length) {
                    cartItems = local;
                    if (isLoggedIn && customerId) {
                        await window.saveCartToDB?.(customerId, cartItems, true);
                    }
                    renderCart();
                    return;
                }
            } catch (e) {
                console.warn('Failed to load from localStorage:', e.message);
            }

            // Nothing anywhere
            cartItems = [];
            renderCart();
        } catch (err) {
            console.error('❌ Failed to load cart:', err.message);
            cartItems = [];
            renderCart();
        }
    }

    /* ============================================================
       CLEANUP / INIT
       ============================================================ */
    function cleanup() {
        cartItems       = [];
        discountApplied = 0;
        discountCode    = '';
    }

    async function init() {
        const els = getEls();
        if (!els.container && !els.page) return;   // not the cart page
        cleanup();

        console.log('📄 Cart page: init');

        bindInteractions();
        await loadCartData();

        console.log('📄 Cart page ready');
    }

    /* ============================================================
       GLOBAL EXPORTS (rebound every init so closures stay fresh)
       ============================================================ */
    function bindGlobals() {
        window.updateQuantity    = updateQuantity;
        window.removeItem        = removeItem;
        window.saveCart          = saveCart;
        window.renderCart        = renderCart;
        window.showNotification  = showNotification;
        window.fetchCartFromDB   = fetchCartFromDB;
        window.loadCartData      = loadCartData;
        window.cartOperations = {
            updateQuantity,
            removeItem,
            saveCart,
            renderCart,
            getCart:  () => cartItems,
            setCart:  (items) => { cartItems = items; renderCart(); }
        };
    }

    /* ============================================================
       BOOTSTRAP
       ============================================================ */
    function start() { bindGlobals(); init(); }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
    window.addEventListener('st:page-loaded', () => { bindGlobals(); init(); });
    window.addEventListener('st:pjax-before', cleanup);
    window.addEventListener('beforeunload',  cleanup);

    console.log('✅ Cart page script loaded');
})();
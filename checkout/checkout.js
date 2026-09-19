(function () {
    'use strict';

    /* ============================================================
       MODULE STATE
       ============================================================ */
    let cartItems      = [];
    let orderTotal     = 0;
    let isSubmitting   = false;
    let businessInfo   = null;
    let _autofillTimer = null;

    /* ============================================================
       ELEMENT LOOKUP — fresh each init
       ============================================================ */
    function getEls() {
        return {
            page:                  document.getElementById('stCheckoutPage'),
            customerName:          document.getElementById('stCustomerName'),
            customerEmail:         document.getElementById('stCustomerEmail'),
            customerPhone:         document.getElementById('stCustomerPhone'),
            customerAddress:       document.getElementById('stCustomerAddress'),
            orderNotes:            document.getElementById('stOrderNotes'),
            paymentMethod:         document.getElementById('stPaymentMethod'),
            termsCheckbox:         document.getElementById('stTermsCheckbox'),
            placeOrderBtn:         document.getElementById('stPlaceOrderBtn'),
            checkoutForm:          document.getElementById('stCheckoutFormSubmit'),
            checkoutFormContent:   document.getElementById('stCheckoutFormContent'),
            successState:          document.getElementById('stSuccessState'),
            orderIdDisplay:        document.getElementById('stOrderIdDisplay'),
            orderItemsList:        document.getElementById('stOrderItemsList'),
            orderTotals:           document.getElementById('stOrderTotals'),
            emptyCart:             document.getElementById('stEmptyCart'),
            summaryLoading:        document.getElementById('stSummaryLoading'),
            subtotal:              document.getElementById('stSubtotal'),
            deliveryFee:           document.getElementById('stDeliveryFee'),
            total:                 document.getElementById('stTotal'),
            whatsappBtn:           document.getElementById('stWhatsAppBtn'),
            whatsappSuccess:       document.getElementById('stWhatsAppSuccess'),
            customerNameError:     document.getElementById('stCustomerNameError'),
            customerEmailError:    document.getElementById('stCustomerEmailError'),
            customerPhoneError:    document.getElementById('stCustomerPhoneError'),
            customerAddressError:  document.getElementById('stCustomerAddressError'),
            paymentMethodError:    document.getElementById('stPaymentMethodError'),
            termsError:            document.getElementById('stTermsError'),
        };
    }

    /* ============================================================
       HELPERS
       ============================================================ */
    function t(key, fallback) {
        if (window.Translations?.translate) {
            const r = window.Translations.translate(key);
            if (r && r !== key) return r;
        }
        return fallback || key;
    }

    function showToast(message, type = 'success') {
        document.querySelector('.st-toast')?.remove();
        const toast = document.createElement('div');
        toast.className = `st-toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-20px)';
            toast.style.transition = 'all .3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function formatPhoneNumber(phone) {
        let cleaned = String(phone || '').replace(/\D/g, '');
        if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
        if (!cleaned.startsWith('237') && cleaned.length > 0) cleaned = '237' + cleaned;
        return cleaned;
    }

    function getSupabase() { return window.getSupabaseClient?.() || null; }

    function escapeHtml(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /* ============================================================
       BUSINESS INFO
       ============================================================ */
    async function getBusinessInfo() {
        if (businessInfo) return businessInfo;
        const client = getSupabase();
        if (!client) return getFallbackBusinessInfo();

        try {
            const { data, error } = await client
                .from('business_info').select('*').limit(1).maybeSingle();
            if (error) throw error;
            businessInfo = data || getFallbackBusinessInfo();
            return businessInfo;
        } catch (err) {
            console.warn('⚠️ business_info fetch failed:', err.message);
            return getFallbackBusinessInfo();
        }
    }

    function getFallbackBusinessInfo() {
        return {
            shop_name: 'Success Technology',
            email:     'austinlebechi02@gmail.com',
            phone:     '+2250172934545',
            address:   'Angre djibi terminus 82/81',
        };
    }

    /* ============================================================
       LOAD CART
       ============================================================ */
    function loadCart() {
        try {
            cartItems = JSON.parse(localStorage.getItem('st_cartcheckout') || '[]');
        } catch { cartItems = []; }
        renderOrderSummary();
    }

    /* ============================================================
       RENDER SUMMARY
       ============================================================ */
    function renderOrderSummary() {
        const els = getEls();
        if (!els.orderItemsList) return;

        if (els.summaryLoading) els.summaryLoading.style.display = 'none';

        if (!cartItems?.length) {
            els.orderItemsList.innerHTML = '';
            if (els.orderTotals) els.orderTotals.style.display = 'none';
            if (els.emptyCart)   els.emptyCart.style.display   = 'block';
            if (els.whatsappBtn) els.whatsappBtn.style.display = 'none';
            return;
        }

        if (els.emptyCart)   els.emptyCart.style.display   = 'none';
        if (els.orderTotals) els.orderTotals.style.display = 'block';

        els.orderItemsList.innerHTML = cartItems.map(item => {
            const price = item.price || 0;
            const qty   = item.qty || 1;
            const line  = price * qty;
            const image = item.image || 'https://placehold.co/50x50/6C3CE1/FFFFFF?text=Product';
            const variants = item.variants && Object.keys(item.variants).length
                ? Object.entries(item.variants).map(([k, v]) => `${k}: ${v}`).join(', ')
                : '';

            return `
                <div class="st-cart-item">
                    <div class="st-item-image">
                        <img src="${image}" alt="${escapeHtml(item.name)}"
                             onerror="this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#f1f5f9;color:#94A3B8;font-size:16px;\\'><i class=\\'fas fa-box\\'></i></div>'">
                    </div>
                    <div class="st-item-details">
                        <div class="st-item-name">${escapeHtml(item.name) || 'Unknown Product'}</div>
                        ${variants ? `<div class="st-item-meta">${escapeHtml(variants)}</div>` : ''}
                        <div class="st-item-meta">${t('qty', 'Qty')}: ${qty}</div>
                    </div>
                    <div class="st-item-price">FCFA ${line.toFixed(2)}</div>
                </div>`;
        }).join('');

        const subtotal    = cartItems.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
        const deliveryFee = subtotal >= 50000 ? 0 : 2000;
        orderTotal = subtotal + deliveryFee;

        if (els.subtotal)    els.subtotal.textContent    = `FCFA ${subtotal.toFixed(2)}`;
        if (els.deliveryFee) els.deliveryFee.textContent = deliveryFee === 0 ? t('free', 'Free') : `FCFA ${deliveryFee.toFixed(2)}`;
        if (els.total)       els.total.textContent       = `FCFA ${orderTotal.toFixed(2)}`;
        if (els.whatsappBtn) els.whatsappBtn.style.display = 'flex';

        updateWhatsAppLink();
    }

    /* ============================================================
       WHATSAPP LINK
       ============================================================ */
    async function updateWhatsAppLink() {
        const els = getEls();
        if (!els.whatsappBtn) return;

        const business = await getBusinessInfo();
        const phone    = business?.phone || '+2250172934545';
        const shopName = business?.shop_name || 'Success Technology';

        const name = els.customerName?.value.trim() || 'Customer';
        const items = cartItems.map(i => `${i.name || 'Product'} (${i.qty || 1}x)`).join('%0A• ');

        const message =
            `🛒 *New Order from ${shopName}*%0A%0A` +
            `👤 *${t('customer', 'Customer')}:* ${name}%0A` +
            `📧 *${t('email', 'Email')}:* ${els.customerEmail?.value.trim() || 'N/A'}%0A` +
            `📱 *${t('phone', 'Phone')}:* ${els.customerPhone?.value.trim() || 'N/A'}%0A` +
            `📍 *${t('address', 'Address')}:* ${els.customerAddress?.value.trim() || 'N/A'}%0A` +
            `💳 *${t('payment', 'Payment')}:* ${els.paymentMethod?.options[els.paymentMethod.selectedIndex]?.text || 'N/A'}%0A` +
            `📝 *${t('notes', 'Notes')}:* ${els.orderNotes?.value.trim() || 'None'}%0A%0A` +
            `📦 *${t('items', 'Items')}:*%0A• ${items}%0A%0A` +
            `💰 *${t('total', 'Total')}:* FCFA ${orderTotal.toFixed(2)}`;

        const cleanPhone = String(phone).replace(/\D/g, '');
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        els.whatsappBtn.href = url;
        if (els.whatsappSuccess) els.whatsappSuccess.href = url;
    }

    /* ============================================================
       PLACE ORDER
       ============================================================ */
    async function placeOrder(e) {
        if (e) e.preventDefault();
        if (isSubmitting) return;

        const els = getEls();
        if (!els.placeOrderBtn) return;

        if (!cartItems?.length) {
            showToast('❌ ' + t('cart_empty_error', 'Your cart is empty'), 'error');
            return;
        }

        let isValid = true;
        const setErr = (input, err, bad) => {
            input?.classList.toggle('error', bad);
            err?.classList.toggle('visible', bad);
            if (bad) isValid = false;
        };

        const name  = els.customerName?.value.trim() || '';
        const email = els.customerEmail?.value.trim() || '';
        const phone = els.customerPhone?.value.trim() || '';
        const addr  = els.customerAddress?.value.trim() || '';
        const pay   = els.paymentMethod?.value || '';

        setErr(els.customerName,    els.customerNameError,    !name);
        setErr(els.customerEmail,   els.customerEmailError,   !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
        setErr(els.customerPhone,   els.customerPhoneError,   !phone || phone.length < 6);
        setErr(els.customerAddress, els.customerAddressError, !addr);
        setErr(els.paymentMethod,   els.paymentMethodError,   !pay);
        els.termsError?.classList.toggle('visible', !els.termsCheckbox?.checked);
        if (!els.termsCheckbox?.checked) isValid = false;

        if (!isValid) return;

        // Resolve user (only once, with a single fallback chain)
        let user = window.STHeader?.AppState?.user || null;
        if (!user?.id) {
            try { user = (typeof getCurrentUser === 'function') ? await getCurrentUser() : null; } catch {}
        }
        if (!user?.id) {
            try {
                const raw = localStorage.getItem('st_customer') || sessionStorage.getItem('st_customer');
                if (raw) user = JSON.parse(raw);
            } catch {}
        }
        const customerId = user?.id || window.getCurrentCustomerId?.() || null;

        if (!customerId) {
            showToast('⚠️ ' + t('please_login', 'Please login to place an order'), 'warning');
            window.STHeader?.openLoginModal?.();
            return;
        }

        const formattedPhone = formatPhoneNumber(phone);
        const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();

        const orderItems = cartItems.map(item => ({
            id:       item.product_id || item.id || 'unknown',
            name:     item.name || 'Unknown Product',
            price:    parseFloat(item.price) || 0,
            qty:      parseInt(item.qty) || 1,
            variants: item.variants || {},
        }));

        const orderData = {
            id:             orderId,
            customer_name:  name,
            phone:          formattedPhone || phone,
            address:        addr,
            email:          email || 'no-email@provided.com',
            items:          orderItems,
            total:          parseFloat(orderTotal) || 0,
            status:         'pending',
            payment_method: pay,
            notes:          els.orderNotes?.value.trim() || '',
            customer_id:    customerId,
            created_at:     new Date().toISOString(),
        };

        isSubmitting = true;
        els.placeOrderBtn.disabled = true;
        els.placeOrderBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t('placing_order', 'Placing Order...')}`;

        try {
            const client = getSupabase();
            if (!client) throw new Error('Supabase client not available');

            // Insert with retry-on-email-error
            let insertResult = await client.from('orders').insert([orderData]).select();
            if (insertResult.error?.message?.includes('email')) {
                orderData.email = 'customer@example.com';
                insertResult = await client.from('orders').insert([orderData]).select();
            }
            if (insertResult.error) throw insertResult.error;

            // Fire-and-forget admin push (don't block UI)
            (async () => {
                try {
                    const url  = window.SUPABASE_CONFIG?.url    || 'https://bulprhgwuwatzobiojwz.supabase.co';
                    const key  = window.SUPABASE_CONFIG?.anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bHByaGd3dXdhdHpvYmlvand6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDczNDksImV4cCI6MjA5MjA4MzM0OX0.2fcHrGX7iXw5G9nGRNkBy70W1Ex_om1C0v3qbryPmvw';
                    const count = orderItems.reduce((s, it) => s + (it.qty || 1), 0);
                    const first = orderItems[0]?.name || 'item';
                    const body  = count === 1
                        ? `${name} ordered ${first} — FCFA ${orderData.total.toFixed(2)}`
                        : `${name} ordered ${count} items — FCFA ${orderData.total.toFixed(2)}`;
                    await fetch(`${url}/functions/v1/send-push`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                        body: JSON.stringify({
                            targetUserId: 'admin@sucesstechnology.com',
                            title: '🛒 New Order Received!',
                            body,
                            data: { url: `/vievorder/?order=${encodeURIComponent(orderId)}`, orderId, type: 'new_order' }
                        })
                    });
                } catch (e) { console.warn('⚠️ Admin push failed:', e); }
            })();

            // Clear local cart
            localStorage.removeItem('st_cartcheckout');
            sessionStorage.removeItem('st_cartcheckout');
            if (window.STHeader?.AppState) {
                window.STHeader.AppState.cart = [];
                window.STHeader.updateCounts?.();
            }

            // Clear DB cart
            (async () => {
                try {
                    await client.from('cart').delete().eq('customer_id', customerId);
                } catch (e) { console.warn('DB cart clear failed:', e.message); }
            })();

            // Archive to localStorage (best-effort)
            try {
                const local = JSON.parse(localStorage.getItem('shop_orders_v1') || '[]');
                local.unshift(orderData);
                localStorage.setItem('shop_orders_v1', JSON.stringify(local));
            } catch {}

            // Switch to success state
            const business = await getBusinessInfo();
            const shopPhone = business?.phone || '+2250172934545';
            const shopName  = business?.shop_name || 'Success Technology';

            if (els.checkoutFormContent) els.checkoutFormContent.style.display = 'none';
            if (els.successState)        els.successState.style.display        = 'block';
            if (els.orderIdDisplay)      els.orderIdDisplay.textContent        = `Order #${orderId}`;

            const orderMessage =
                `🛒 *${t('order', 'Order')} #${orderId} from ${shopName}*%0A%0A` +
                `👤 *${t('customer', 'Customer')}:* ${name}%0A` +
                `📧 *${t('email', 'Email')}:* ${email}%0A` +
                `📱 *${t('phone', 'Phone')}:* ${formattedPhone || phone}%0A` +
                `📍 *${t('address', 'Address')}:* ${addr}%0A` +
                `💳 *${t('payment', 'Payment')}:* ${els.paymentMethod?.options[els.paymentMethod.selectedIndex]?.text || 'N/A'}%0A` +
                `📝 *${t('notes', 'Notes')}:* ${els.orderNotes?.value.trim() || 'None'}%0A%0A` +
                `📦 *${t('items', 'Items')}:*%0A• ${cartItems.map(i =>
                    `${i.name || 'Product'} (${i.qty || 1}x) - FCFA ${((i.price || 0) * (i.qty || 1)).toFixed(2)}`
                ).join('%0A• ')}%0A%0A` +
                `💰 *${t('total', 'Total')}:* FCFA ${orderTotal.toFixed(2)}`;

            const cleanPhone = String(shopPhone).replace(/\D/g, '');
            const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(orderMessage)}`;
            if (els.whatsappSuccess) els.whatsappSuccess.href = waUrl;

            cartItems = [];
            orderTotal = 0;

            showToast('✅ ' + t('order_placed_success', 'Order placed successfully! 🎉'));

            // Notification fanout (in-app + service worker)
            try {
                const title = `✅ ${t('order', 'Order')} ${orderId} ${t('placed', 'Placed')}`;
                const text  = `${t('thank_you', 'Thank you')} ${name}! ${t('your_order', 'Your order')} ${orderId} ${t('totaling', 'totaling')} FCFA ${orderData.total} ${t('has_been_received', 'has been received.')}`;
                const link  = `/orders/?order=${encodeURIComponent(orderId)}`;
                if (window.notificationSystem?.add) window.notificationSystem.add(title, text, 'order', link, null);
                navigator.serviceWorker?.controller?.postMessage({
                    type: 'ORDER_CREATED',
                    payload: { id: orderId, title, body: text, url: link }
                });
            } catch (e) { console.warn('⚠️ Notification fanout failed:', e); }

        } catch (err) {
            console.error('❌ Error placing order:', err);
            showToast('❌ ' + (err.message || t('order_failed', 'Failed to place order. Please try again.')), 'error');
        } finally {
            isSubmitting = false;
            if (els.placeOrderBtn) {
                els.placeOrderBtn.disabled = false;
                els.placeOrderBtn.innerHTML = `<i class="fas fa-check"></i> ${t('place_order', 'Place Order')}`;
            }
        }
    }

    /* ============================================================
       AUTOFILL
       ============================================================ */
    async function autofillUserData() {
        const els = getEls();
        if (!els.customerName) return;

        let user = window.STHeader?.AppState?.user || null;
        if (!user?.id && typeof getCurrentUser === 'function') {
            try { user = await getCurrentUser(); } catch {}
        }
        if (!user?.id) {
            try {
                const raw = localStorage.getItem('st_customer') || sessionStorage.getItem('st_customer');
                if (raw) user = JSON.parse(raw);
            } catch {}
        }
        if (!user?.id) return;

        if (user.name    && els.customerName)    els.customerName.value    = user.name;
        if (user.email   && els.customerEmail)   els.customerEmail.value   = user.email;
        if (user.phone   && els.customerPhone)   els.customerPhone.value   = user.phone;
        if (user.address && els.customerAddress) els.customerAddress.value = user.address;
    }

    /* ============================================================
       BIND INTERACTIONS — assignment (idempotent)
       ============================================================ */
    function bindInteractions() {
        const els = getEls();

        // Form submit
        if (els.checkoutForm) els.checkoutForm.onsubmit = placeOrder;

        // Live WhatsApp message refresh
        const refresh = () => updateWhatsAppLink();
        [els.customerName, els.customerEmail, els.customerPhone,
         els.customerAddress, els.orderNotes].forEach(inp => {
            if (inp) inp.oninput = refresh;
        });
        if (els.paymentMethod) els.paymentMethod.onchange = refresh;

        // Real-time validation clearing
        if (els.customerName) {
            els.customerName.oninput = function () {
                if (this.value.trim()) {
                    this.classList.remove('error');
                    els.customerNameError?.classList.remove('visible');
                }
                refresh();
            };
        }
        if (els.customerEmail) {
            els.customerEmail.oninput = function () {
                if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value.trim())) {
                    this.classList.remove('error');
                    els.customerEmailError?.classList.remove('visible');
                }
                refresh();
            };
        }
        if (els.customerPhone) {
            els.customerPhone.oninput = function () {
                if (this.value.trim().length >= 6) {
                    this.classList.remove('error');
                    els.customerPhoneError?.classList.remove('visible');
                }
                refresh();
            };
        }
        if (els.customerAddress) {
            els.customerAddress.oninput = function () {
                if (this.value.trim()) {
                    this.classList.remove('error');
                    els.customerAddressError?.classList.remove('visible');
                }
                refresh();
            };
        }
        if (els.paymentMethod) {
            els.paymentMethod.onchange = function () {
                if (this.value) {
                    this.classList.remove('error');
                    els.paymentMethodError?.classList.remove('visible');
                }
                refresh();
            };
        }
        if (els.termsCheckbox) {
            els.termsCheckbox.onchange = function () {
                els.termsError?.classList.toggle('visible', !this.checked);
            };
        }
    }

    /* ============================================================
       CLEANUP / INIT
       ============================================================ */
    function cleanup() {
        if (_autofillTimer) { clearTimeout(_autofillTimer); _autofillTimer = null; }
        cartItems = [];
        orderTotal = 0;
        isSubmitting = false;
        // Keep businessInfo cache — safe to reuse across navigations
    }

    async function init() {
        const els = getEls();
        if (!els.page) return;    // not the checkout page
        cleanup();

        console.log('📄 Checkout page: init');

        loadCart();
        bindInteractions();
        await autofillUserData();

        // One retry in case the header's auto-login finishes after us
        _autofillTimer = setTimeout(() => {
            _autofillTimer = null;
            if (document.getElementById('stCheckoutPage')) autofillUserData();
        }, 900);

        console.log('✅ Checkout page ready');
    }

    /* ============================================================
       GLOBAL EXPORTS
       ============================================================ */
    window.checkout = {
        loadCart,
        renderOrderSummary,
        placeOrder,
        updateWhatsAppLink,
    };

    /* ============================================================
       BOOTSTRAP
       ============================================================ */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
    window.addEventListener('st:page-loaded', init);
    window.addEventListener('st:pjax-before', cleanup);
    window.addEventListener('beforeunload',  cleanup);

    console.log('✅ Checkout page script loaded');
})();
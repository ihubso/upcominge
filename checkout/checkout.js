
        // ============================================================
        //  CHECKOUT - Standalone Page
        // ============================================================

        // Helper translation function for dynamic content
        function t(key, fallback) {
            if (window.Translations && window.Translations.translate) {
                const result = window.Translations.translate(key);
                if (result && result !== key) return result;
            }
            return fallback || key;
        }

        // --- State ---
        let cartItems = [];
        let orderTotal = 0;
        let isSubmitting = false;
        let currentOrderId = null;
        let businessInfo = null;

        const elements = {
            customerName: document.getElementById('stCustomerName'),
            customerEmail: document.getElementById('stCustomerEmail'),
            customerPhone: document.getElementById('stCustomerPhone'),
            customerAddress: document.getElementById('stCustomerAddress'),
            orderNotes: document.getElementById('stOrderNotes'),
            paymentMethod: document.getElementById('stPaymentMethod'),
            termsCheckbox: document.getElementById('stTermsCheckbox'),
            placeOrderBtn: document.getElementById('stPlaceOrderBtn'),
            checkoutForm: document.getElementById('stCheckoutFormSubmit'),
            checkoutFormContent: document.getElementById('stCheckoutFormContent'),
            successState: document.getElementById('stSuccessState'),
            orderIdDisplay: document.getElementById('stOrderIdDisplay'),
            orderItemsList: document.getElementById('stOrderItemsList'),
            orderTotals: document.getElementById('stOrderTotals'),
            emptyCart: document.getElementById('stEmptyCart'),
            summaryLoading: document.getElementById('stSummaryLoading'),
            subtotal: document.getElementById('stSubtotal'),
            deliveryFee: document.getElementById('stDeliveryFee'),
            total: document.getElementById('stTotal'),
            whatsappBtn: document.getElementById('stWhatsAppBtn'),
            whatsappSuccess: document.getElementById('stWhatsAppSuccess'),
            customerNameError: document.getElementById('stCustomerNameError'),
            customerEmailError: document.getElementById('stCustomerEmailError'),
            customerPhoneError: document.getElementById('stCustomerPhoneError'),
            customerAddressError: document.getElementById('stCustomerAddressError'),
            paymentMethodError: document.getElementById('stPaymentMethodError'),
            termsError: document.getElementById('stTermsError')
        };

        // ============================================================
        //  HELPERS
        // ============================================================

        function showToast(message, type = 'success') {
            const existing = document.querySelector('.st-toast');
            if (existing) existing.remove();

            const toast = document.createElement('div');
            toast.className = `st-toast ${type}`;
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(-50%) translateY(-20px)';
                toast.style.transition = 'all 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

 

        function formatPhoneNumber(phone) {
            let cleaned = phone.replace(/\D/g, '');
            if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
            if (!cleaned.startsWith('237') && cleaned.length > 0) cleaned = '237' + cleaned;
            return cleaned;
        }

async function getBusinessInfo() {
    if (businessInfo) return businessInfo;
    
    try {
        const client = getSupabaseClient();
        if (!client) {
            console.warn('⚠️ Supabase client not available, using fallback');
            return getFallbackBusinessInfo();
        }

        const { data, error } = await client
            .from('business_info')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('❌ Error fetching business info:', error);
            return getFallbackBusinessInfo();
        }

        if (data) {
            businessInfo = data;
            console.log('✅ Business info loaded:', businessInfo.shop_name);
            return businessInfo;
        }

        return getFallbackBusinessInfo();
    } catch (err) {
        console.error('❌ Error fetching business info:', err);
        return getFallbackBusinessInfo();
    }
}

function getFallbackBusinessInfo() {
    return {
        shop_name: 'Success Technology',
        email: 'austinlebechi02@gmail.com',
        phone: '+2250172934545',
        address: 'Angre djibi terminus 82/81',
        facebook: '',
        instagram: '',
        tiktok: ''
    };
}

        // ============================================================
        //  LOAD CART
        // ============================================================

        function loadCart() {
            try {
                const cart = JSON.parse(localStorage.getItem('st_cartcheckout') || '[]');
                cartItems = cart;
                renderOrderSummary();
            } catch (e) {
                cartItems = [];
                renderOrderSummary();
            }
        }

        // ============================================================
        //  RENDER ORDER SUMMARY
        // ============================================================

        function renderOrderSummary() {
            const loading = elements.summaryLoading;
            const list = elements.orderItemsList;
            const totals = elements.orderTotals;
            const empty = elements.emptyCart;

            loading.style.display = 'none';

            if (!cartItems || cartItems.length === 0) {
                list.innerHTML = '';
                totals.style.display = 'none';
                empty.style.display = 'block';
                elements.whatsappBtn.style.display = 'none';
                return;
            }

            empty.style.display = 'none';
            totals.style.display = 'block';

            list.innerHTML = cartItems.map(item => {
                const price = item.price || 0;
                const qty = item.qty || 1;
                const total = price * qty;
                const image = item.image || 'https://placehold.co/50x50/6C3CE1/FFFFFF?text=Product';
                const variantText = item.variants && Object.keys(item.variants).length > 0 ?
                    Object.entries(item.variants).map(([k, v]) => `${k}: ${v}`).join(', ') :
                    '';

                return `
                    <div class="st-cart-item">
                        <div class="st-item-image">
                            <img src="${image}" alt="${item.name}" onerror="this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#f1f5f9;color:#94A3B8;font-size:16px;\\'><i class=\\'fas fa-box\\'></i></div>'">
                        </div>
                        <div class="st-item-details">
                            <div class="st-item-name">${item.name || 'Unknown Product'}</div>
                            ${variantText ? `<div class="st-item-meta">${variantText}</div>` : ''}
                            <div class="st-item-meta">${t('qty', 'Qty')}: ${qty}</div>
                        </div>
                        <div class="st-item-price">FCFA ${total.toFixed(2)}</div>
                    </div>
                `;
            }).join('');

            const subtotal = cartItems.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);
            const deliveryFee = subtotal >= 50000 ? 0 : 2000;
            const total = subtotal + deliveryFee;
            orderTotal = total;

            elements.subtotal.textContent = `FCFA ${subtotal.toFixed(2)}`;
            elements.deliveryFee.textContent = deliveryFee === 0 ? t('free', 'Free') : `FCFA ${deliveryFee.toFixed(2)}`;
            elements.total.textContent = `FCFA ${total.toFixed(2)}`;

            elements.whatsappBtn.style.display = 'flex';
            updateWhatsAppLink();
        }

        // ============================================================
        //  UPDATE WHATSAPP LINK
        // ============================================================

async function updateWhatsAppLink() {
    const business = await getBusinessInfo();
    const phone = business?.phone || '+2250172934545';
    const shopName = business?.shop_name || 'Success Technology';
    
    const name = elements.customerName.value.trim() || 'Customer';
    const items = cartItems.map(item => 
        `${item.name || 'Product'} (${item.qty || 1}x)`
    ).join('\n• ');
    const total = orderTotal || 0;
    
    const message = `🛒 *New Order from ${shopName}*%0A%0A` +
        `👤 *${t('customer', 'Customer')}:* ${name}%0A` +
        `📧 *${t('email', 'Email')}:* ${elements.customerEmail.value.trim() || 'N/A'}%0A` +
        `📱 *${t('phone', 'Phone')}:* ${elements.customerPhone.value.trim() || 'N/A'}%0A` +
        `📍 *${t('address', 'Address')}:* ${elements.customerAddress.value.trim() || 'N/A'}%0A` +
        `💳 *${t('payment', 'Payment')}:* ${elements.paymentMethod.options[elements.paymentMethod.selectedIndex]?.text || 'N/A'}%0A` +
        `📝 *${t('notes', 'Notes')}:* ${elements.orderNotes.value.trim() || 'None'}%0A%0A` +
        `📦 *${t('items', 'Items')}:*%0A• ${items}%0A%0A` +
        `💰 *${t('total', 'Total')}:* FCFA ${total.toFixed(2)}`;

    // Clean phone number for WhatsApp
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    elements.whatsappBtn.href = url;
    elements.whatsappSuccess.href = url;
}

        // ============================================================
        //  PLACE ORDER
        // ============================================================

async function placeOrder(e) {
    e.preventDefault();

    if (isSubmitting) return;
    if (!cartItems || cartItems.length === 0) {
        showToast('❌ ' + t('cart_empty_error', 'Your cart is empty'), 'error');
        return;
    }

    let isValid = true;

    // Validate name
    const name = elements.customerName.value.trim();
    if (!name) {
        elements.customerName.classList.add('error');
        elements.customerNameError.classList.add('visible');
        isValid = false;
    } else {
        elements.customerName.classList.remove('error');
        elements.customerNameError.classList.remove('visible');
    }

    // Validate email
    const email = elements.customerEmail.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        elements.customerEmail.classList.add('error');
        elements.customerEmailError.classList.add('visible');
        isValid = false;
    } else {
        elements.customerEmail.classList.remove('error');
        elements.customerEmailError.classList.remove('visible');
    }

    // Validate phone
    const phoneRaw = elements.customerPhone.value.trim();
    if (!phoneRaw || phoneRaw.length < 6) {
        elements.customerPhone.classList.add('error');
        elements.customerPhoneError.classList.add('visible');
        isValid = false;
    } else {
        elements.customerPhone.classList.remove('error');
        elements.customerPhoneError.classList.remove('visible');
    }

    // Validate address
    const address = elements.customerAddress.value.trim();
    if (!address) {
        elements.customerAddress.classList.add('error');
        elements.customerAddressError.classList.add('visible');
        isValid = false;
    } else {
        elements.customerAddress.classList.remove('error');
        elements.customerAddressError.classList.remove('visible');
    }

    // Validate payment method
    const paymentMethod = elements.paymentMethod.value;
    if (!paymentMethod) {
        elements.paymentMethod.classList.add('error');
        elements.paymentMethodError.classList.add('visible');
        isValid = false;
    } else {
        elements.paymentMethod.classList.remove('error');
        elements.paymentMethodError.classList.remove('visible');
    }

    // Validate terms
    if (!elements.termsCheckbox.checked) {
        elements.termsError.classList.add('visible');
        isValid = false;
    } else {
        elements.termsError.classList.remove('visible');
    }

    if (!isValid) return;

    const formattedPhone = formatPhoneNumber(phoneRaw);
    
    // ✅ FIXED: Remove duplicate await
    const user = await getCurrentUser();
    const customerId = user?.id || window.getCurrentCustomerId?.() || null;

    if (!customerId) {
        showToast('⚠️ ' + t('please_login', 'Please login to place an order'), 'warning');
        if (window.STHeader && window.STHeader.openLoginModal) {
            window.STHeader.openLoginModal();
        }
        return;
    }

    const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();

    const orderItems = cartItems.map(item => ({
        id: item.product_id || item.id || 'unknown',
        name: item.name || 'Unknown Product',
        price: parseFloat(item.price) || 0,
        qty: parseInt(item.qty) || 1,
        variants: item.variants || {}
    }));

    const orderData = {
        id: orderId,
        customer_name: name,
        phone: formattedPhone || phoneRaw,
        address: address,
        email: email || 'no-email@provided.com',
        items: orderItems,
        total: parseFloat(orderTotal) || 0,
        status: 'pending',
        payment_method: paymentMethod,
        notes: elements.orderNotes.value.trim() || '',
        customer_id: customerId,
        created_at: new Date().toISOString()
    };

    console.log('📦 Order data being sent:', JSON.stringify(orderData, null, 2));

    isSubmitting = true;
    elements.placeOrderBtn.disabled = true;
    elements.placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + t('placing_order', 'Placing Order...');

    try {
        const client = getSupabaseClient();
        if (!client) throw new Error('Supabase client not available');

        const { data, error } = await client
            .from('orders')
            .insert([orderData])
            .select();

        if (error) {
            console.error('❌ Supabase error details:', error);
            if (error.message && error.message.includes('email')) {
                console.log('🔄 Retrying with default email...');
                orderData.email = 'customer@example.com';
                const { data: retryData, error: retryError } = await client
                    .from('orders')
                    .insert([orderData])
                    .select();
                if (retryError) throw retryError;
            } else {
                throw error;
            }
        }

        console.log('✅ Order saved to Supabase:', orderId);
         try {
        const supabaseUrl =  SUPABASE_CONFIG.url || 'https://bulprhgwuwatzobiojwz.supabase.co';
        const supabaseAnonKey = SUPABASE_CONFIG.anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bHByaGd3dXdhdHpvYmlvand6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDczNDksImV4cCI6MjA5MjA4MzM0OX0.2fcHrGX7iXw5G9nGRNkBy70W1Ex_om1C0v3qbryPmvw';

        const itemCount = orderItems.reduce((sum, it) => sum + (it.qty || 1), 0);
        const firstItem = orderItems[0]?.name || 'item';
        const bodyText = itemCount === 1
            ? `${name} ordered ${firstItem} — FCFA ${orderData.total.toFixed(2)}`
            : `${name} ordered ${itemCount} items — FCFA ${orderData.total.toFixed(2)}`;

        await fetch(`${supabaseUrl}/functions/v1/send-push`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`
            },
            body: JSON.stringify({
                targetUserId: 'admin@sucesstechnology.com',
                title: '🛒 New Order Received!',
                body: bodyText,
                data: {
                    url: `/vievorder/?order=${encodeURIComponent(orderId)}`,
                    orderId: orderId,
                    type: 'new_order'
                }
            })
        });
        console.log('📤 Admin push sent for order', orderId);
    } catch (adminPushErr) {
        console.warn('⚠️ Admin push failed:', adminPushErr);
    }

        // Clear cart
        localStorage.removeItem('st_cartcheckout');
        sessionStorage.removeItem('st_cartcheckout');
        if (window.STHeader && window.STHeader.AppState) {
            window.STHeader.AppState.cart = [];
            if (window.STHeader.updateCounts) window.STHeader.updateCounts();
        }

        try {
            const { error: deleteError } = await client
                .from('cart')
                .delete()
                .eq('customer_id', customerId);
            if (deleteError) console.error('❌ Error clearing Supabase cart:', deleteError);
            else console.log('✅ Supabase cart cleared successfully.');
        } catch (cartErr) {
            console.warn('⚠️ Could not clear Supabase cart:', cartErr.message);
        }

        try {
            const localOrders = JSON.parse(localStorage.getItem('shop_orders_v1') || '[]');
            localOrders.unshift(orderData);
            localStorage.setItem('shop_orders_v1', JSON.stringify(localOrders));
        } catch (localErr) {
            console.warn('Could not save to localStorage:', localErr);
        }

        // ✅ FIXED: Get business info for WhatsApp
        const business = await getBusinessInfo();
        const shopPhone = business?.phone || '+2250172934545';
        const shopName = business?.shop_name || 'Success Technology';

        elements.checkoutFormContent.style.display = 'none';
        elements.successState.style.display = 'block';
        elements.orderIdDisplay.textContent = `Order #${orderId}`;

        // ✅ FIXED: Use business info in WhatsApp message
        const orderMessage = `🛒 *${t('order', 'Order')} #${orderId} from ${shopName}*%0A%0A` +
            `👤 *${t('customer', 'Customer')}:* ${name}%0A` +
            `📧 *${t('email', 'Email')}:* ${email}%0A` +
            `📱 *${t('phone', 'Phone')}:* ${formattedPhone || phoneRaw}%0A` +
            `📍 *${t('address', 'Address')}:* ${address}%0A` +
            `💳 *${t('payment', 'Payment')}:* ${elements.paymentMethod.options[elements.paymentMethod.selectedIndex]?.text || 'N/A'}%0A` +
            `📝 *${t('notes', 'Notes')}:* ${elements.orderNotes.value.trim() || 'None'}%0A%0A` +
            `📦 *${t('items', 'Items')}:*%0A• ${cartItems.map(item => 
                `${item.name || 'Product'} (${item.qty || 1}x) - FCFA ${((item.price || 0) * (item.qty || 1)).toFixed(2)}`
            ).join('%0A• ')}%0A%0A` +
            `💰 *${t('total', 'Total')}:* FCFA ${orderTotal.toFixed(2)}`;

        // ✅ FIXED: Use business phone for WhatsApp
        const cleanPhone = shopPhone.replace(/\D/g, '');
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(orderMessage)}`;
        elements.whatsappSuccess.href = waUrl;

        cartItems = [];
        orderTotal = 0;

        showToast('✅ ' + t('order_placed_success', 'Order placed successfully! 🎉'));
        // --- Trigger in-app + native notification for the placed order ---
        try {
            const notifTitle = `✅ ${t('order', 'Order')} ${orderId} ${t('placed', 'Placed')}`;
            const notifText = `${t('thank_you', 'Thank you')} ${name}! ${t('your_order', 'Your order')} ${orderId} ${t('totaling', 'totaling')} FCFA ${orderData.total} ${t('has_been_received', 'has been received.')}`;
            const orderLink = `/orders/?order=${encodeURIComponent(orderId)}`;

            if (window.notificationSystem && typeof window.notificationSystem.add === 'function') {
                window.notificationSystem.add(notifTitle, notifText, 'order', orderLink, null);
            } else if (typeof addNotification === 'function') {
                addNotification(notifTitle, notifText, 'order', orderLink, null);
            }

            // Post a message to the service worker to simulate/show a notification while page is active
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'ORDER_CREATED',
                    payload: { id: orderId, title: notifTitle, body: notifText, url: orderLink }
                });
            }
        } catch (e) {
            console.warn('⚠️ Order notification trigger failed:', e);
        }

    } catch (err) {
        console.error('❌ Error placing order:', err);
        let errorMessage = t('order_failed', 'Failed to place order. Please try again.');
        if (err.message) errorMessage = err.message;
        showToast('❌ ' + errorMessage, 'error');
        
        isSubmitting = false;
        elements.placeOrderBtn.disabled = false;
        elements.placeOrderBtn.innerHTML = '<i class="fas fa-check"></i> ' + t('place_order', 'Place Order');
    }
}
// ============================================================
//  AUTO-FILL USER DATA (Improved)
// ============================================================

async function autofillUserData() {
    try {
        // Wait a bit for the header to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get user from the header system
        let user = null;
        
        // Try to get user from STHeader first
        if (window.STHeader?.AppState?.isLoggedIn && window.STHeader?.AppState?.user) {
            user = window.STHeader.AppState.user;
        } 
        
        // If not found, try the await getCurrentUser function
        if (!user || !user.id) {
            user = await await getCurrentUser();
        }
        
        // If still not found, check localStorage directly
        if (!user || !user.id) {
            const stored = localStorage.getItem('st_customer') || sessionStorage.getItem('st_customer');
            if (stored) {
                try {
                    user = JSON.parse(stored);
                } catch (e) {
                    console.warn('Could not parse stored user data');
                }
            }
        }

        if (user) {
            console.log('✅ Autofill: User data found', user);
            
            // Populate form fields
            if (user.name) {
                elements.customerName.value = user.name;
                console.log('📝 Filled name:', user.name);
            }
            
            if (user.email) {
                elements.customerEmail.value = user.email;
                console.log('📝 Filled email:', user.email);
            }
            
            if (user.phone) {
                elements.customerPhone.value = user.phone;
                console.log('📝 Filled phone:', user.phone);
            }
            
            if (user.address) {
                elements.customerAddress.value = user.address;
                console.log('📝 Filled address:', user.address);
            }
        } else {
            console.log('ℹ️ No user data available for autofill');
        }
    } catch (err) {
        console.warn('⚠️ Autofill error:', err.message);
    }
}

        // ============================================================
        //  INITIALIZE
        // ============================================================

        document.addEventListener('DOMContentLoaded', function() {
            loadCart();
            autofillUserData();

            setTimeout(() => {
                autofillUserData();
            }, 900);

            // Update WhatsApp link on form changes
            elements.customerName.addEventListener('input', updateWhatsAppLink);
            elements.customerEmail.addEventListener('input', updateWhatsAppLink);
            elements.customerPhone.addEventListener('input', updateWhatsAppLink);
            elements.customerAddress.addEventListener('input', updateWhatsAppLink);
            elements.paymentMethod.addEventListener('change', updateWhatsAppLink);
            elements.orderNotes.addEventListener('input', updateWhatsAppLink);

            elements.checkoutForm.addEventListener('submit', placeOrder);

            // Real-time validation clearing
            elements.customerName.addEventListener('input', function() {
                if (this.value.trim()) {
                    this.classList.remove('error');
                    elements.customerNameError.classList.remove('visible');
                }
            });

            elements.customerEmail.addEventListener('input', function() {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (emailRegex.test(this.value.trim())) {
                    this.classList.remove('error');
                    elements.customerEmailError.classList.remove('visible');
                }
            });

            elements.customerPhone.addEventListener('input', function() {
                if (this.value.trim().length >= 6) {
                    this.classList.remove('error');
                    elements.customerPhoneError.classList.remove('visible');
                }
            });

            elements.customerAddress.addEventListener('input', function() {
                if (this.value.trim()) {
                    this.classList.remove('error');
                    elements.customerAddressError.classList.remove('visible');
                }
            });

            elements.paymentMethod.addEventListener('change', function() {
                if (this.value) {
                    this.classList.remove('error');
                    elements.paymentMethodError.classList.remove('visible');
                }
            });

            elements.termsCheckbox.addEventListener('change', function() {
                if (this.checked) {
                    elements.termsError.classList.remove('visible');
                } else {
                    elements.termsError.classList.add('visible');
                }
            });
        });

        // ============================================================
        //  EXPOSE GLOBALLY
        // ============================================================

        window.checkout = {
            loadCart,
            renderOrderSummary,
            placeOrder,
            updateWhatsAppLink,
        };

        console.log('📄 Checkout page loaded');

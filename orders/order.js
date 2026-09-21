(function () {
    'use strict';

    /* ============================================================
       MODULE STATE
       ============================================================ */
    let allOrders       = [];
    let filteredOrders  = [];
    let currentStatus   = 'all';
    let selectedOrder   = null;
    let routeOrderId    = null;

    let _escHandler      = null;   // document-level keydown
    let _backHandler     = null;   // Android backbutton
    let _popHandler      = null;   // window popstate
    let _headerPatched   = false;
    let _pendingOpenId   = null;   // order id to open after load completes

    /* ============================================================
       ELEMENT LOOKUP — fresh every init
       ============================================================ */
    function getEls() {
        return {
            page:            document.getElementById('stOrdersPage'),
            ordersContainer: document.getElementById('stOrdersContainer'),
            ordersLoading:   document.getElementById('stOrdersLoading'),
            orderCount:      document.getElementById('stOrderCount'),
            detailOverlay:   document.getElementById('stDetailOverlay'),
            detailSheet:     document.getElementById('stDetailSheet'),
            detailClose:     document.getElementById('stDetailClose'),
            detailBody:      document.getElementById('stDetailBody'),
            detailLoading:   document.getElementById('stDetailLoading'),
            tabs:            document.querySelectorAll('.st-tab-btn'),
            countAll:        document.getElementById('stCountAll'),
            countPending:    document.getElementById('stCountPending'),
            countConfirmed:  document.getElementById('stCountConfirmed'),
            countProcessing: document.getElementById('stCountProcessing'),
            countShipped:    document.getElementById('stCountShipped'),
            countDelivered:  document.getElementById('stCountDelivered'),
            countCancelled:  document.getElementById('stCountCancelled'),
        };
    }

    /* ============================================================
       TRANSLATION
       ============================================================ */
    function t(key, fallback) {
        if (window.Translations?.translate) {
            const r = window.Translations.translate(key);
            if (r && r !== key) return r;
        }
        return fallback || key;
    }

    /* ============================================================
       HELPERS
       ============================================================ */
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

    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        } catch { return dateStr; }
    }

    function getStatusIcon(status) {
        return {
            pending: '⏳', confirmed: '✅', processing: '⚙️',
            shipped: '🚚', delivered: '📦', cancelled: '❌'
        }[status] || '📋';
    }

    function getStatusColor(status) {
        return {
            pending: 'pending', confirmed: 'confirmed', processing: 'processing',
            shipped: 'shipped', delivered: 'delivered', cancelled: 'cancelled'
        }[status] || 'pending';
    }

    function getStatusSteps(status) {
        const steps = [
            t('placed', 'Placed'), t('confirmed', 'Confirmed'),
            t('processing', 'Processing'), t('done', 'Done')
        ];
        const map = { pending: 0, confirmed: 1, processing: 2, shipped: 3, delivered: 3, cancelled: -1 };
        const currentIndex = map[status] ?? 0;
        return steps.map((label, i) => ({
            label,
            completed: i <= currentIndex && status !== 'cancelled',
            active:    i === currentIndex && status !== 'cancelled',
            cancelled: status === 'cancelled'
        }));
    }

    function orderBelongsToUser(order, user) {
        if (!order || !user) return false;
        if (order.customer_id && user.id && order.customer_id === user.id) return true;
        if (order.email && user.email && order.email === user.email) return true;
        if (order.customer_name && user.name && order.customer_name === user.name) return true;
        return false;
    }

    function getOrderIdFromUrl() {
        const params = new URLSearchParams(location.search);
        for (const key of ['order', 'orderId', 'id', 'order_id']) {
            const v = params.get(key);
            if (v) return decodeURIComponent(v);
        }
        const raw = location.search.replace(/^\?/, '').trim();
        if (raw && !raw.includes('=')) return decodeURIComponent(raw);
        return null;
    }

    /* ============================================================
       GET USER
       ============================================================ */
    async function getUserData() {
        if (window.STHeader?.AppState?.isLoggedIn && window.STHeader.AppState.user?.id) {
            return window.STHeader.AppState.user;
        }
        if (typeof getCurrentUser === 'function' && window.STHeader?.AppState?.isLoggedIn) {
            try { const u = await getCurrentUser(); if (u?.id) return u; } catch (_) {}
        }
        const raw = localStorage.getItem('st_customer') || sessionStorage.getItem('st_customer');
        if (raw) { try { const u = JSON.parse(raw); if (u?.id) return u; } catch (_) {} }
        const p = new URLSearchParams(location.search);
        const id = p.get('user_id');
        if (id) {
            return {
                id,
                email: p.get('user_email') ? decodeURIComponent(p.get('user_email')) : '',
                name:  p.get('user_name')  ? decodeURIComponent(p.get('user_name'))  : ''
            };
        }
        return null;
    }

    /* ============================================================
       LOAD ORDERS
       ============================================================ */
async function loadOrders() {
    const els = getEls();
    if (!els.ordersContainer || !els.ordersLoading) return;

    els.ordersContainer.innerHTML = '';
    els.ordersLoading.style.display = 'flex';

    try {
        const user = await getUserData();
        if (!user?.id) {
            els.ordersLoading.style.display = 'none';
            els.ordersContainer.innerHTML = `
                <div class="st-order-empty">
                    <div class="st-empty-icon"><i class="fas fa-lock"></i></div>
                    <p style="font-weight:600;color:#0F172A;" data-translate="please_login">Please Login</p>
                    <p style="font-size:14px;" data-translate="login_to_view_orders">Login to view your orders.</p>
                </div>`;
            if (typeof translateUI === 'function') translateUI();
            return;
        }

        const client = getSupabase();
        let orders = [];

    if (client) {
    try {
        const { data, error } = await client.rpc('get_customer_orders', { 
            p_customer_id: user.id 
        });

        if (error) {
            console.error('❌ RPC error:', error);      // ← was hidden before
            throw new Error(error.message);
        }
        if (data?.length) {
            orders = data;
        }
    } catch (e) {
        console.error('❌ get_customer_orders failed:', e.message);
        // Do NOT rethrow — fall through to localStorage
    }
}

        // Fallback to local storage if DB fails or is empty
        if (!orders.length) {
            const localOrders = JSON.parse(localStorage.getItem('shop_orders_v1') || '[]');
            orders = localOrders.filter(o =>
                o.customer_id === user.id ||
                o.email === user.email ||
                o.customer_name === user.name
            );
        }

        els.ordersLoading.style.display = 'none';

        if (!orders.length) {
            // Clear any pending deep-link if no orders exist
            if (typeof _pendingOpenId !== 'undefined') _pendingOpenId = null;
            
            els.ordersContainer.innerHTML = `
                <div class="st-order-empty">
                    <div class="st-empty-icon"><i class="fas fa-shopping-bag"></i></div>
                    <p style="font-weight:600;color:#0F172A;" data-translate="no_orders_title">No Orders Yet</p>
                    <p style="font-size:14px;" data-translate="no_orders_sub">Start shopping to see your orders here.</p>
                    <a href="/product/" style="display:inline-block;margin-top:16px;padding:10px 24px;background:#6C3CE1;color:white;border-radius:10px;text-decoration:none;font-weight:600;" data-translate="browse_products">
                        Browse Products
                    </a>
                </div>`;
            if (typeof translateUI === 'function') translateUI();
            return;
        }

        // Update global/module state
        if (typeof allOrders !== 'undefined') allOrders = orders;
        else window.allOrders = orders;

        // If you have a filter function, call it here. Otherwise, render directly.
        if (typeof filterOrders === 'function' && typeof currentStatus !== 'undefined') {
            filterOrders(currentStatus);
        } else {
            renderOrders(orders);
        }

        // Handle ?order= param (deep-link) — one-shot
        if (typeof _pendingOpenId !== 'undefined' && typeof handlePendingOrderRoute === 'function') {
            const pending = _pendingOpenId || (typeof getOrderIdFromUrl === 'function' ? getOrderIdFromUrl() : null);
            _pendingOpenId = null;
            if (pending) await handlePendingOrderRoute(pending);
        }

    } catch (err) {
        console.error('❌ Error loading orders:', err);
        els.ordersLoading.style.display = 'none';
        els.ordersContainer.innerHTML = `
            <div class="st-order-empty">
                <div class="st-empty-icon"><i class="fas fa-exclamation-circle"></i></div>
                <p style="font-weight:600;color:#0F172A;" data-translate="failed_to_load">Failed to load orders</p>
                <p style="font-size:14px;" data-translate="try_again_later">Please try again later.</p>
                <button onclick="window.accountSettings?.loadOrders()" style="margin-top:16px;padding:10px 24px;background:#6C3CE1;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:600;">
                    <i class="fas fa-sync"></i> ${t('retry', 'Retry')}
                </button>
            </div>`;
    }
}

    async function handlePendingOrderRoute(orderId) {
        if (!orderId) return;
        const user = await getUserData();
        if (!user?.id) { showToast(t('please_login', 'Please log in.'), 'info'); return; }
        const order = allOrders.find(o => o.id === orderId);
        if (!order) return;
        if (!orderBelongsToUser(order, user)) {
            showToast(t('order_not_belong', 'This order does not belong to your account.'), 'error');
            return;
        }
        routeOrderId = orderId;
        openOrderDetail(order.id);
    }

    /* ============================================================
       COUNTS + FILTER + RENDER
       ============================================================ */
    function updateCounts(orders) {
        const els = getEls();
        const counts = {
            all:        orders.length,
            pending:    orders.filter(o => o.status === 'pending').length,
            confirmed:  orders.filter(o => o.status === 'confirmed').length,
            processing: orders.filter(o => o.status === 'processing').length,
            shipped:    orders.filter(o => o.status === 'shipped').length,
            delivered:  orders.filter(o => o.status === 'delivered').length,
            cancelled:  orders.filter(o => o.status === 'cancelled').length,
        };
        if (els.countAll)        els.countAll.textContent = counts.all;
        if (els.countPending)    els.countPending.textContent = counts.pending;
        if (els.countConfirmed)  els.countConfirmed.textContent = counts.confirmed;
        if (els.countProcessing) els.countProcessing.textContent = counts.processing;
        if (els.countShipped)    els.countShipped.textContent = counts.shipped;
        if (els.countDelivered)  els.countDelivered.textContent = counts.delivered;
        if (els.countCancelled)  els.countCancelled.textContent = counts.cancelled;
        if (els.orderCount) {
            els.orderCount.textContent =
                `${counts.all} ${t('orders', 'order')}${counts.all !== 1 ? 's' : ''}`;
        }
    }

    function filterOrders(status) {
        currentStatus = status;
        filteredOrders = status === 'all'
            ? [...allOrders]
            : allOrders.filter(o => o.status === status);

        // reflect active tab
        const els = getEls();
        els.tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.status === status);
        });

        renderOrders(filteredOrders);
        if (typeof translateUI === 'function') translateUI();
    }

    function renderOrders(orders) {
        const els = getEls();
        if (!els.ordersContainer) return;

        if (!orders?.length) {
            els.ordersContainer.innerHTML = `
                <div class="st-empty-orders" style="padding:40px 20px;text-align:center;">
                    <div class="st-empty-icon" style="font-size:48px;color:#E2E8F0;margin-bottom:12px;">
                        <i class="fas fa-inbox"></i>
                    </div>
                    <p style="font-weight:600;color:#0F172A;" data-translate="no_orders_status">No orders with status</p>
                    <p style="font-weight:600;color:#0F172A;">"${currentStatus}"</p>
                    <p style="font-size:14px;color:#94A3B8;" data-translate="try_different_filter">Try a different filter.</p>
                </div>`;
            return;
        }

        els.ordersContainer.innerHTML = orders.map(order => {
            const statusClass = getStatusColor(order.status);
            const statusLabel = order.status
                ? order.status.charAt(0).toUpperCase() + order.status.slice(1)
                : 'Pending';
            const totalItems = order.items?.reduce((s, i) => s + (i.qty || 1), 0) || 0;
            const itemNames = order.items?.map(i => i.name).slice(0, 3).join(', ') || 'No items';
            const moreItems = order.items?.length > 3
                ? ` +${order.items.length - 3} ${t('more', 'more')}` : '';

            return `
                <div class="st-order-card" onclick="openOrderDetail('${order.id}')" data-order-id="${order.id}">
                    <div class="st-order-top">
                        <span class="st-order-id">${order.id || 'N/A'}</span>
                        <span class="st-order-status ${statusClass}">
                            <span class="st-status-dot"></span> ${statusLabel}
                        </span>
                    </div>
                    <div class="st-order-meta">
                        <span><i class="fas fa-calendar-alt"></i> ${formatDate(order.created_at || order.date)}</span>
                        <span><i class="fas fa-box"></i> ${totalItems} ${t('item', 'item')}${totalItems !== 1 ? 's' : ''}</span>
                        ${order.customer_name ? `<span><i class="fas fa-user"></i> ${order.customer_name}</span>` : ''}
                    </div>
                    <div class="st-order-bottom">
                        <div class="st-order-items-preview">${itemNames}${moreItems}</div>
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span class="st-order-total">FCFA ${(order.total || 0).toFixed(2)}</span>
                            <span class="st-order-arrow"><i class="fas fa-chevron-right"></i></span>
                        </div>
                    </div>
                </div>`;
        }).join('');
    }

    function showEmptyState(title, message, type) {
        const els = getEls();
        if (!els.ordersContainer) return;

        let action = '';
        if (type === 'shop') {
            action = `<a href="/product/" class="st-btn-shop" data-translate="browse_products"><i class="fas fa-store"></i> Browse Products</a>`;
        } else if (type === 'login') {
            action = `<button onclick="window.navigateWithUserInfo('/account-settings')" class="st-btn-shop" data-translate="go_to_login">
                        <i class="fas fa-sign-in-alt"></i> Go to Login
                      </button>`;
        } else if (type === 'retry') {
            action = `<button onclick="window.loadOrders()" class="st-btn-shop" data-translate="retry">
                        <i class="fas fa-sync"></i> Retry
                      </button>`;
        }

        els.ordersContainer.innerHTML = `
            <div class="st-empty-orders" style="text-align:center;padding:40px 20px;">
                <div class="st-empty-icon" style="font-size:48px;color:#E2E8F0;margin-bottom:12px;">
                    <i class="fas fa-shopping-bag"></i>
                </div>
                <h2 style="font-size:18px;font-weight:700;color:#0F172A;">${title}</h2>
                <p style="font-size:14px;color:#94A3B8;margin-bottom:16px;">${message}</p>
                ${action}
            </div>`;
    }

    /* ============================================================
       ORDER DETAIL — NO HISTORY MANIPULATION
       ============================================================ */
    async function openOrderDetail(orderId) {
        const order = allOrders.find(o => o.id === orderId);
        if (!order) { showToast(t('order_not_found', 'Order not found'), 'error'); return; }

        const user = await getUserData();
        if (user && !orderBelongsToUser(order, user)) {
            showToast(t('order_not_belong', 'This order does not belong to your account.'), 'error');
            return;
        }

        selectedOrder = order;
        renderOrderDetail(order);

        const els = getEls();
        els.detailOverlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
        routeOrderId = orderId;
    }

    function closeOrderDetail() {
        const els = getEls();
        if (!els.detailOverlay?.classList.contains('active')) return;
        els.detailOverlay.classList.remove('active');
        document.body.style.overflow = '';
        routeOrderId = null;
    }

    function renderOrderDetail(order) {
        const els = getEls();
        if (!els.detailBody) return;

        els.detailLoading.style.display = 'none';

        const statusClass = getStatusColor(order.status);
        const statusLabel = order.status
            ? order.status.charAt(0).toUpperCase() + order.status.slice(1)
            : 'Pending';
        const steps = getStatusSteps(order.status);
        const totalItems = order.items?.reduce((s, i) => s + (i.qty || 1), 0) || 0;

        let itemsHtml = '';
        if (order.items?.length) {
            itemsHtml = order.items.map(item => `
                <div class="st-order-item-detail" style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;">
                    <div class="st-item-info">
                        <span class="st-item-name" style="font-weight:600;font-size:14px;">${item.name || 'Unknown Product'}</span>
                        <span class="st-item-meta" style="font-size:12px;color:#94A3B8;display:block;">
                            ${item.qty || 1}x ${item.variants && Object.keys(item.variants).length > 0
                                ? '· ' + Object.entries(item.variants).map(([k, v]) => `${k}: ${v}`).join(', ')
                                : ''}
                        </span>
                    </div>
                    <span class="st-item-price" style="font-weight:700;font-size:14px;color:#0F172A;">
                        FCFA ${((item.price || 0) * (item.qty || 1)).toFixed(2)}
                    </span>
                </div>`).join('');
        }

        let timelineHtml = '';
        if (order.status === 'cancelled') {
            timelineHtml = `
                <div style="text-align:center;padding:12px 0;color:#DC2626;font-weight:600;" data-translate="order_cancelled">
                    <i class="fas fa-times-circle"></i> Order Cancelled
                </div>`;
        } else {
            timelineHtml = steps.map((step, index) => `
                <div class="st-status-step ${step.completed ? 'completed' : ''} ${step.active ? 'active' : ''}"
                     style="display:flex;align-items:center;gap:12px;padding:6px 0;">
                    <div class="st-step-circle" style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;${step.completed ? 'background:#10B981;color:white;' : step.active ? 'background:#6C3CE1;color:white;' : 'background:#E2E8F0;color:#94A3B8;'}">
                        ${step.completed ? '<i class="fas fa-check"></i>' : (step.active ? '<i class="fas fa-circle"></i>' : index + 1)}
                    </div>
                    <span class="st-step-label" style="font-weight:${step.active ? '700' : '500'};color:${step.completed ? '#10B981' : step.active ? '#6C3CE1' : '#94A3B8'};">${step.label}</span>
                </div>`).join('');
        }

        const waMessage = `🛒 *${t('order', 'Order')} #${order.id}*%0A%0A` +
            `👤 *${t('customer', 'Customer')}:* ${order.customer_name || 'N/A'}%0A` +
            `📧 *${t('email', 'Email')}:* ${order.email || 'N/A'}%0A` +
            `📱 *${t('phone', 'Phone')}:* ${order.phone || 'N/A'}%0A` +
            `📍 *${t('address', 'Address')}:* ${order.address || 'N/A'}%0A` +
            `📦 *${t('status', 'Status')}:* ${statusLabel}%0A` +
            `📅 *${t('date', 'Date')}:* ${formatDate(order.created_at || order.date)}%0A%0A` +
            `📦 *${t('items', 'Items')}:*%0A${order.items?.map(i =>
                `• ${i.name} (${i.qty || 1}x) - FCFA ${((i.price || 0) * (i.qty || 1)).toFixed(2)}`
            ).join('%0A') || 'No items'}%0A%0A` +
            `💰 *${t('total', 'Total')}:* FCFA ${(order.total || 0).toFixed(2)}`;

        const phone = order.phone ? order.phone.replace(/\D/g, '') : '0172934545';
        const waUrl = `https://wa.me/${phone}?text=${waMessage}`;

        els.detailBody.innerHTML = `
            <div class="st-sheet-header" style="margin-bottom:16px;">
                <div class="st-order-id" style="font-weight:700;font-size:18px;display:flex;align-items:center;gap:8px;">
                    ${order.id || 'N/A'}
                    <button class="st-copy-btn" onclick="copyOrderId('${order.id}')" title="Copy order ID" style="background:none;border:none;color:#6C3CE1;cursor:pointer;font-size:14px;" data-translate="copy">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
                <div class="st-order-date" style="font-size:13px;color:#94A3B8;margin-top:4px;">
                    <i class="fas fa-calendar-alt"></i> ${formatDate(order.created_at || order.date)}
                </div>
                <div style="margin-top:8px;">
                    <span class="st-order-status ${statusClass}" style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">
                        <span class="st-status-dot" style="width:6px;height:6px;border-radius:50%;display:inline-block;background:currentColor;"></span>
                        ${getStatusIcon(order.status)} ${statusLabel}
                    </span>
                </div>
            </div>

            <div class="st-status-timeline" style="padding:12px 0;border-top:1px solid #E2E8F0;border-bottom:1px solid #E2E8F0;margin-bottom:16px;">
                ${timelineHtml}
            </div>

            <div class="st-detail-section" style="margin-bottom:12px;">
                <div class="st-section-label" style="font-weight:600;font-size:14px;color:#475569;margin-bottom:4px;"><i class="fas fa-user"></i> <span data-translate="customer">Customer</span></div>
                <div class="st-section-value" style="font-size:14px;color:#0F172A;">
                    ${order.customer_name || 'N/A'}<br>
                    ${order.phone ? `<a href="tel:${order.phone}" style="color:#6C3CE1;text-decoration:none;">${order.phone}</a>` : ''}
                    ${order.address ? `<br>${order.address}` : ''}
                </div>
            </div>

            <div class="st-detail-section" style="margin-bottom:12px;">
                <div class="st-section-label" style="font-weight:600;font-size:14px;color:#475569;margin-bottom:4px;"><i class="fas fa-money-bill-wave"></i> <span data-translate="order_total">Order Total</span></div>
                <div class="st-section-value" style="font-size:24px;font-weight:800;color:#6C3CE1;">
                    FCFA ${(order.total || 0).toFixed(2)}
                </div>
            </div>

            <div class="st-detail-section" style="margin-bottom:12px;">
                <div class="st-section-label" style="font-weight:600;font-size:14px;color:#475569;margin-bottom:4px;"><i class="fas fa-boxes"></i> <span data-translate="order_items">Order Items</span> (${totalItems})</div>
                ${itemsHtml}
            </div>

            ${order.notes ? `
                <div class="st-detail-section" style="margin-bottom:12px;">
                    <div class="st-section-label" style="font-weight:600;font-size:14px;color:#475569;margin-bottom:4px;"><i class="fas fa-sticky-note"></i> <span data-translate="notes">Notes</span></div>
                    <div class="st-section-value" style="font-size:14px;color:#64748B;">${order.notes}</div>
                </div>` : ''}

            <div class="st-sheet-actions" style="display:flex;gap:12px;flex-wrap:wrap;padding-top:12px;border-top:1px solid #E2E8F0;margin-top:8px;">
                <a href="/product/" class="st-btn-primary" style="flex:1;padding:12px 20px;background:linear-gradient(135deg,#6C3CE1,#5A2FC4);color:white;border:none;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;text-decoration:none;text-align:center;transition:all .3s ease;" data-translate="continue_shopping">
                    <i class="fas fa-shopping-bag"></i> Continue Shopping
                </a>
                <a href="${waUrl}" target="_blank" class="st-btn-whatsapp" style="flex:1;padding:12px 20px;background:#25D366;color:white;border:none;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;text-decoration:none;text-align:center;transition:all .3s ease;" data-translate="contact_us">
                    <i class="fab fa-whatsapp"></i> Contact Us
                </a>
            </div>`;

        if (typeof translateUI === 'function') translateUI();
    }

    /* ============================================================
       COPY ORDER ID
       ============================================================ */
    function copyOrderId(orderId) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(orderId)
                .then(() => showToast('✅ ' + t('order_id_copied', 'Order ID copied!')))
                .catch(() => fallbackCopy(orderId));
        } else fallbackCopy(orderId);
    }
    function fallbackCopy(text) {
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast('✅ ' + t('order_id_copied', 'Order ID copied!'));
    }

    /* ============================================================
       BIND INTERACTIONS — assignment (idempotent)
       ============================================================ */
    function bindInteractions() {
        const els = getEls();

        els.tabs.forEach(tab => {
            tab.onclick = function () {
                const status = this.dataset.status;
                filterOrders(status);
            };
        });

        if (els.detailClose)  els.detailClose.onclick  = () => closeOrderDetail();
        if (els.detailOverlay) els.detailOverlay.onclick = function (e) {
            if (e.target === this) closeOrderDetail();
        };

        // Swipe-down to close
        if (els.detailSheet) {
            let startY = 0, dragging = false;
            els.detailSheet.ontouchstart = function (e) {
                startY = e.touches[0].clientY;
                dragging = true;
            };
            els.detailSheet.ontouchmove = function (e) {
                if (!dragging) return;
                if (e.touches[0].clientY - startY > 50) {
                    closeOrderDetail();
                    dragging = false;
                }
            };
            els.detailSheet.ontouchend = function () { dragging = false; };
        }

        // Document-level ESC
        if (_escHandler) document.removeEventListener('keydown', _escHandler);
        _escHandler = function (e) {
            if (e.key === 'Escape' && getEls().detailOverlay?.classList.contains('active')) {
                closeOrderDetail();
            }
        };
        document.addEventListener('keydown', _escHandler);

        // Android hardware back
        if (_backHandler) document.removeEventListener('backbutton', _backHandler);
        _backHandler = function (e) {
            if (getEls().detailOverlay?.classList.contains('active')) {
                e.preventDefault();
                closeOrderDetail();
            }
        };
        document.addEventListener('backbutton', _backHandler);

        // Window popstate — only close the sheet, do NOT re-navigate.
        // (pjax handles route changes on popstate; we only react to the sheet.)
        if (_popHandler) window.removeEventListener('popstate', _popHandler);
        _popHandler = function () {
            if (getEls().detailOverlay?.classList.contains('active')) {
                closeOrderDetail();
            }
        };
        window.addEventListener('popstate', _popHandler);
    }

    /* ============================================================
       HEADER PATCH
       ============================================================ */
    function patchHeader() {
        if (!window.STHeader || _headerPatched) return;
        window.STHeader._ordersOriginalUpdate = window.STHeader.updateAuthUI;
        _headerPatched = true;
        window.STHeader.updateAuthUI = function () {
            window.STHeader._ordersOriginalUpdate?.();
            if (document.getElementById('stOrdersPage')) loadOrders();
        };
    }
    function unpatchHeader() {
        if (_headerPatched && window.STHeader?._ordersOriginalUpdate) {
            window.STHeader.updateAuthUI = window.STHeader._ordersOriginalUpdate;
            delete window.STHeader._ordersOriginalUpdate;
        }
        _headerPatched = false;
    }

    /* ============================================================
       CLEANUP / INIT
       ============================================================ */
    function cleanup() {
        if (_escHandler)  { document.removeEventListener('keydown',    _escHandler);  _escHandler = null; }
        if (_backHandler) { document.removeEventListener('backbutton', _backHandler); _backHandler = null; }
        if (_popHandler)  { window.removeEventListener('popstate',     _popHandler);  _popHandler = null; }
        unpatchHeader();

        // Close sheet if it was open
        const overlay = document.getElementById('stDetailOverlay');
        if (overlay?.classList.contains('active')) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }

        allOrders = [];
        filteredOrders = [];
        currentStatus = 'all';
        selectedOrder = null;
        routeOrderId = null;
        _pendingOpenId = null;
    }

    function init() {
        const els = getEls();
        if (!els.page) return;      // not the orders page
        cleanup();

        console.log('📄 Orders page: init');

        bindInteractions();

        // Preserve ?order= deep-link across init (read it before we start)
        _pendingOpenId = getOrderIdFromUrl();

        // Load orders — wait briefly for the header if it hasn't hydrated yet
        if (window.STHeader?.AppState?.isLoggedIn || window.STHeader?.AppState?.user) {
            loadOrders();
        } else {
            // Listen for the header's one-shot auth-ready signal
            const onAuth = () => {
                window.removeEventListener('st:auth-ready', onAuth);
                loadOrders();
            };
            window.addEventListener('st:auth-ready', onAuth);
            // Fallback: after 1.5s, load anyway (header might not fire the event
            // if it's an older version; getUserData() will still find the user
            // from localStorage).
            setTimeout(() => {
                window.removeEventListener('st:auth-ready', onAuth);
                if (document.getElementById('stOrdersPage')) loadOrders();
            }, 1500);
        }

        patchHeader();
    }

    /* ============================================================
       GLOBAL EXPORTS
       ============================================================ */
    function bindGlobals() {
        window.openOrderDetail  = openOrderDetail;
        window.closeOrderDetail = closeOrderDetail;
        window.copyOrderId      = copyOrderId;
        window.loadOrders       = loadOrders;
        window.getUserData      = getUserData;
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

    console.log('✅ Orders page script loaded');
})();
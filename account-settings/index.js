(function () {
    'use strict';

    /* ============================================================
       MODULE STATE
       ============================================================ */
    let currentUser         = null;
    let isLoggedIn          = false;
    let orders              = [];
    let isEditingEnabled    = false;

    let _supabaseClient     = null;
    let _authPollId         = null;
    let _hasRenderedWithUser = false;

    /* ============================================================
       ELEMENT LOOKUP
       ============================================================ */
    function getEls() {
        return {
            sidebarAvatar:    document.getElementById('stSidebarAvatar'),
            sidebarName:      document.getElementById('stSidebarName'),
            sidebarEmail:     document.getElementById('stSidebarEmail'),
            accountStatus:    document.getElementById('stAccountStatus'),
            profileName:      document.getElementById('stProfileName'),
            profileEmail:     document.getElementById('stProfileEmail'),
            profilePhone:     document.getElementById('stProfilePhone'),
            profileAddress:   document.getElementById('stProfileAddress'),
            profileBio:       document.getElementById('stProfileBio'),
            profileForm:      document.getElementById('stProfileForm'),
            profileReset:     document.getElementById('stProfileReset'),
            profileNameError: document.getElementById('stProfileNameError'),
            ordersContainer:  document.getElementById('stOrdersContainer'),
            ordersLoading:    document.getElementById('stOrdersLoading'),
            securityForm:     document.getElementById('stSecurityForm'),
            currentPassword:  document.getElementById('stCurrentPassword'),
            newPassword:      document.getElementById('stNewPassword'),
            confirmPassword:  document.getElementById('stConfirmPassword'),
            currentPasswordError: document.getElementById('stCurrentPasswordError'),
            newPasswordError:     document.getElementById('stNewPasswordError'),
            confirmPasswordError: document.getElementById('stConfirmPasswordError'),
            deleteAccountBtn: document.getElementById('stDeleteAccountBtn'),
            deleteModal:      document.getElementById('stDeleteModal'),
            deleteModalClose: document.getElementById('stDeleteModalClose'),
            deleteCancel:     document.getElementById('stDeleteCancel'),
            deleteConfirm:    document.getElementById('stDeleteConfirm'),
            sidebarLogout:    document.getElementById('stSidebarLogout'),
            savePreferences:  document.getElementById('stSavePreferences'),
            prefOrderUpdates: document.getElementById('stPrefOrderUpdates'),
            prefPromotions:   document.getElementById('stPrefPromotions'),
            prefNewsletter:   document.getElementById('stPrefNewsletter'),
            prefProfileVisibility: document.getElementById('stPrefProfileVisibility'),
            prefOrderHistory:      document.getElementById('stPrefOrderHistory'),
            editToggleBtn:    document.getElementById('stEditToggleBtn'),
            saveProfileBtn:   document.getElementById('stSaveProfileBtn'),
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

    function getSupabase() {
        // Prefer the header's client.
        const header = window.STHeader?.getSupabaseClient?.();
        if (header) return header;
        
        if (_supabaseClient) return _supabaseClient;
        
        try {
            if (typeof supabase !== 'undefined' && supabase.createClient) {
                _supabaseClient = supabase.createClient(
                    'https://bulprhgwuwatzobiojwz.supabase.co',
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bHByaGd3dXdhdHpvYmlvand6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDczNDksImV4cCI6MjA5MjA4MzM0OX0.2fcHrGX7iXw5G9nGRNkBy70W1Ex_om1C0v3qbryPmvw'
                );
                return _supabaseClient;
            }
        } catch (e) {
            console.warn('⚠️ Could not create Supabase client:', e.message);
        }
        return null;
    }

    /* ============================================================
       TOAST
       ============================================================ */
    function showToast(message, type = 'success') {
        document.querySelector('.st-toast')?.remove();
        const toast = document.createElement('div');
        toast.className = `st-toast ${type}`;
        toast.textContent = message;
        // Add basic styles if not present in CSS
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.padding = '12px 24px';
        toast.style.borderRadius = '8px';
        toast.style.color = 'white';
        toast.style.fontWeight = '600';
        toast.style.zIndex = '99999';
        toast.style.background = type === 'error' ? '#EF4444' : (type === 'warning' ? '#F59E0B' : '#10B981');
        
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'all .3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /* ============================================================
       GET USER (SECURE)
       ============================================================ */
    async function getUserData() {
        // 1. Check Header AppState
        if (window.STHeader?.AppState?.isLoggedIn && window.STHeader?.AppState?.user?.id) {
            return window.STHeader.AppState.user;
        }

        // 2. Try Secure RPC Refresh if logged in but data is partial
        if (window.STHeader?.AppState?.isLoggedIn && typeof getCurrentUser === 'function') {
            try { 
                const u = await getCurrentUser(); 
                if (u?.id) return u; 
            } catch (_) {}
        }

        // 3. Check Local Storage
        const stored = localStorage.getItem('st_customer') || sessionStorage.getItem('st_customer');
        if (stored) {
            try { 
                const u = JSON.parse(stored); 
                if (u?.id) return u; 
            } catch (_) {}
        }

        return null;
    }

    /* ============================================================
       ORDERS
       ============================================================ */
    function renderOrders(ordersData) {
        const els = getEls();
        if (!els.ordersContainer || !els.ordersLoading) return;

        els.ordersLoading.style.display = 'none';

        if (!ordersData?.length) {
            els.ordersContainer.innerHTML = `
                <div class="st-order-empty">
                    <div class="st-empty-icon"><i class="fas fa-shopping-bag"></i></div>
                    <p style="font-weight:600;color:#0F172A;" data-translate="no_orders_yet">No orders yet</p>
                    <p style="font-size:14px;" data-translate="start_shopping">Start shopping to see your orders here.</p>
                    <a href="/product/" style="display:inline-block;margin-top:16px;padding:10px 24px;background:#6C3CE1;color:white;border-radius:10px;text-decoration:none;font-weight:600;" data-translate="browse_products">
                        Browse Products
                    </a>
                </div>`;
            return;
        }

        els.ordersContainer.innerHTML = ordersData.map(order => {
            const statusClass = order.status || 'pending';
            const statusLabel = order.status || 'Pending';
            const totalItems  = order.items?.reduce((s, i) => s + (i.qty || 1), 0) || 0;
            const itemNames   = order.items?.map(i => i.name).join(', ') || 'No items';
            const orderId     = encodeURIComponent(order.id || '');

            return `
                <div class="st-order-card" onclick="window.navigateWithUserInfo('/orders/?order=${orderId}')" style="cursor:pointer;">
                    <div class="st-order-header">
                        <span class="st-order-id">${t('order_number', 'Order')} #${order.id || 'N/A'}</span>
                        <span class="st-order-status ${statusClass}">${statusLabel}</span>
                    </div>
                    <div class="st-order-details">
                        <div>
                            <div class="st-order-items">${totalItems} ${t('items', 'items')}: ${itemNames}</div>
                            <div style="font-size:12px;color:#94A3B8;margin-top:2px;">
                                ${order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                            </div>
                        </div>
                        <div class="st-order-total">FCFA ${(order.total || 0).toFixed(2)}</div>
                    </div>
                </div>`;
        }).join('');

        if (typeof translateUI === 'function') translateUI();
    }

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

        const client = getSupabaseClient();
        let orders = [];

        if (client) {
            try {
                const { data, error } = await client.rpc('get_customer_orders', { 
                    p_customer_id: user.id 
                });
                
                if (!error && data?.length) {
                    orders = data;
                }
            } catch (e) { 
                console.warn('⚠️ Supabase RPC fetch error:', e); 
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
    /* ============================================================
       PROFILE UI
       ============================================================ */
    async function updateProfileUI() {
        const els = getEls();
        if (!els.sidebarAvatar) return;

        try {
            const user = await getUserData();

            if (user?.id) {
                currentUser = user;
                isLoggedIn  = true;

                els.sidebarAvatar.textContent = (user.name || 'User').charAt(0).toUpperCase();
                els.sidebarName.textContent   = user.name  || 'User';
                els.sidebarEmail.textContent  = user.email || 'No email';
                els.accountStatus.textContent = `Signed in as ${user.name || 'User'}`;

                els.profileName.value    = user.name    || '';
                els.profileEmail.value   = user.email   || '';
                els.profilePhone.value   = user.phone   || '';
                els.profileAddress.value = user.address || '';
                els.profileBio.value     = user.bio     || '';

                ['profile','orders','security','preferences'].forEach(s => {
                    const el = document.getElementById(`section-${s}`);
                    if (el) el.style.display = 'block';
                });
                showSection('profile');
            } else {
                isLoggedIn  = false;
                currentUser = null;

                els.sidebarAvatar.textContent = 'G';
                els.sidebarName.textContent   = 'Guest';
                els.sidebarEmail.textContent  = 'Not logged in';
                els.accountStatus.textContent = 'Signed in as Guest';

                ['profileName','profileEmail','profilePhone','profileAddress','profileBio'].forEach(k => {
                    if (els[k]) els[k].value = '';
                });
                ['orders','security','preferences'].forEach(s => {
                    const el = document.getElementById(`section-${s}`);
                    if (el) el.style.display = 'none';
                });
            }

            setEditingEnabled(false);
        } catch (err) {
            console.error('❌ Error in updateProfileUI:', err);
        }
    }

    function setEditingEnabled(enabled) {
        const els = getEls();
        isEditingEnabled = enabled;
        [els.profileName, els.profilePhone, els.profileAddress, els.profileBio]
            .forEach(inp => { if (inp) inp.disabled = !enabled; });
        if (els.profileEmail) els.profileEmail.disabled = true;
        if (els.saveProfileBtn) els.saveProfileBtn.disabled = !enabled;

        if (!els.editToggleBtn) return;
        if (enabled) {
            els.editToggleBtn.innerHTML = '<i class="fas fa-check-circle"></i> Editing Enabled';
            els.editToggleBtn.style.borderColor = '#10B981';
            els.editToggleBtn.style.color = '#10B981';
        } else {
            els.editToggleBtn.innerHTML = '<i class="fas fa-pen"></i> Enable Editing';
            els.editToggleBtn.style.borderColor = '#E2E8F0';
            els.editToggleBtn.style.color = '#475569';
        }
    }

    function toggleEditMode() {
        if (!isLoggedIn) { showToast('Please log in to edit your profile.', 'warning'); return; }
        setEditingEnabled(!isEditingEnabled);
        showToast(isEditingEnabled ? '✏️ Editing enabled' : '🔒 Editing disabled', 'info');
    }

    function showSection(sectionName) {
        document.querySelectorAll('.st-section').forEach(el => el.style.display = 'none');
        const section = document.getElementById(`section-${sectionName}`);
        if (section) section.style.display = 'block';

        document.querySelectorAll('.st-sidebar-nav .st-nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.section === sectionName);
        });

        if (sectionName === 'orders' && isLoggedIn) loadOrders();
    }

    /* ============================================================
       SAVE PROFILE (SECURE RPC)
       ============================================================ */
    async function saveProfile(e) {
        if (e) e.preventDefault();
        const els = getEls();
        if (!els.profileName) return;

        const name    = els.profileName.value.trim();
        const phone   = els.profilePhone.value.trim();
        const address = els.profileAddress.value.trim();
        const bio     = els.profileBio.value.trim();

        if (!name) {
            els.profileName.classList.add('error');
            els.profileNameError.classList.add('visible');
            return;
        }
        els.profileName.classList.remove('error');
        els.profileNameError.classList.remove('visible');

        try {
            const client = getSupabaseClient();
            if (!client) return showToast('❌ Supabase client not available', 'error');

            const user = await getUserData();
            if (!user?.id) return showToast('❌ No user logged in', 'error');

        
            const { error } = await client.rpc('update_customer_profile', {
                p_id: user.id,
                p_name: name,
                p_phone: phone,
                p_address: address,
                p_bio: bio
            });

            if (error) throw error;

            // Update Local State
            if (window.STHeader?.AppState?.user) {
                Object.assign(window.STHeader.AppState.user, { name, phone, address, bio });
            }

            // Update Local Storage
            try {
                const ls = localStorage.getItem('st_customer');
                if (ls) {
                    const c = JSON.parse(ls);
                    Object.assign(c, { name, phone, address, bio });
                    localStorage.setItem('st_customer', JSON.stringify(c));
                }
            } catch (_) {}

            if (currentUser) Object.assign(currentUser, { name, phone, address, bio });

            await updateProfileUI();
            showToast('✅ Profile updated successfully!');
        } catch (err) {
            console.error('❌ Error saving profile:', err);
            showToast('❌ Failed to update profile: ' + err.message, 'error');
        }
    }

    async function refreshUserFromSupabase() {
        // This now uses the secure getCurrentUser RPC defined in header-auth.js
        if (typeof getCurrentUser === 'function') {
            const freshUser = await getCurrentUser();
            if (freshUser) {
                currentUser = freshUser;
                await updateProfileUI();
                showToast('🔄 Profile refreshed from database');
            }
        }
    }

    /* ============================================================
       PASSWORD
       ============================================================ */
    async function updatePassword(e) {
        if (e) e.preventDefault();
        const els = getEls();

        const currentPw = els.currentPassword.value;
        const newPw     = els.newPassword.value;
        const confirmPw = els.confirmPassword.value;

        let isValid = true;
        const flag = (input, err, bad) => {
            input.classList.toggle('error', bad);
            err.classList.toggle('visible', bad);
            if (bad) isValid = false;
        };
        flag(els.currentPassword, els.currentPasswordError, !currentPw || currentPw.length < 6);
        flag(els.newPassword,     els.newPasswordError,     !newPw     || newPw.length     < 6);
        flag(els.confirmPassword, els.confirmPasswordError, newPw !== confirmPw);
        if (!isValid) return;

        try {
            const client = getSupabaseClient();
            if (client) {
                // Note: This updates the Supabase Auth password, not the customer_accounts table
                // If you are using custom auth, you might need a different RPC here.
                const { error } = await client.auth.updateUser({ password: newPw });
                if (error) throw error;
            }
            showToast('✅ Password updated successfully!');
            els.securityForm.reset();
        } catch (err) {
            console.error('❌ Error updating password:', err);
            showToast('❌ Failed to update password: ' + err.message, 'error');
        }
    }

    /* ============================================================
       DELETE ACCOUNT (SECURE RPC)
       ============================================================ */
    async function deleteAccount() {
        try {
            const client = getSupabaseClient();
            const user = await getUserData();
            
            if (client && user?.id) {
               
                const { error } = await client.rpc('delete_customer_account', { p_id: user.id });
                if (error) throw error;
                
                // Sign out from Supabase Auth if used
                await client.auth.signOut();
            }

            localStorage.removeItem('st_cart');
            localStorage.removeItem('st_wishlist');
            localStorage.removeItem('st_customer');
            sessionStorage.removeItem('st_customer');
            sessionStorage.removeItem('st_user_synced');

            currentUser = null;
            isLoggedIn  = false;
            await updateProfileUI();
            closeDeleteModal();
            showToast('🗑️ Account deleted successfully');

            setTimeout(() => window.navigateWithUserInfo('/'), 1500);
        } catch (err) {
            console.error('❌ Error deleting account:', err);
            showToast('❌ Failed to delete account: ' + err.message, 'error');
        }
    }

    function openDeleteModal() {
        const els = getEls();
        els.deleteModal?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeDeleteModal() {
        const els = getEls();
        els.deleteModal?.classList.remove('active');
        document.body.style.overflow = '';
    }

    /* ============================================================
       PREFERENCES
       ============================================================ */
    function savePreferences() {
        const els = getEls();
        const prefs = {
            orderUpdates:      els.prefOrderUpdates.checked,
            promotions:        els.prefPromotions.checked,
            newsletter:        els.prefNewsletter.checked,
            profileVisibility: els.prefProfileVisibility.checked,
            orderHistory:      els.prefOrderHistory.checked
        };
        localStorage.setItem('st_preferences', JSON.stringify(prefs));
        showToast('✅ Preferences saved!');
    }

    function loadPreferences() {
        const els = getEls();
        if (!els.prefOrderUpdates) return;
        try {
            const p = JSON.parse(localStorage.getItem('st_preferences') || '{}');
            els.prefOrderUpdates.checked        = p.orderUpdates      ?? true;
            els.prefPromotions.checked          = p.promotions        ?? false;
            els.prefNewsletter.checked          = p.newsletter        ?? false;
            els.prefProfileVisibility.checked   = p.profileVisibility ?? true;
            els.prefOrderHistory.checked        = p.orderHistory      ?? true;
        } catch (_) {}
    }

    /* ============================================================
       LOGOUT
       ============================================================ */
    async function handleLogout() {
        try {
            const client = getSupabaseClient();
            if (client) await client.auth.signOut();

            localStorage.removeItem('st_cart');
            localStorage.removeItem('st_wishlist');
            localStorage.removeItem('st_customer');
            sessionStorage.removeItem('st_customer');
            sessionStorage.removeItem('st_user_synced');

            currentUser = null;
            isLoggedIn  = false;
            await updateProfileUI();
            showToast('👋 Logged out successfully');
            setTimeout(() => window.navigateWithUserInfo('/'), 1000);
        } catch (err) {
            console.error('❌ Logout error:', err);
            showToast('❌ Logout failed', 'error');
        }
    }

    /* ============================================================
       BIND INTERACTIONS
       ============================================================ */
    function bindInteractions() {
        const els = getEls();

        // Sidebar nav
        document.querySelectorAll('.st-sidebar-nav .st-nav-item').forEach(btn => {
            btn.onclick = function () {
                const s = this.dataset.section;
                if (['profile','orders','security','preferences'].includes(s)) showSection(s);
            };
        });

        // Profile
        if (els.editToggleBtn) els.editToggleBtn.onclick = toggleEditMode;
        if (els.profileForm)   els.profileForm.onsubmit  = saveProfile;
        if (els.profileReset)  els.profileReset.onclick  = () => {
            refreshUserFromSupabase();
            setEditingEnabled(false);
        };
        if (els.profileName) {
            els.profileName.oninput = function () {
                if (this.value.trim()) {
                    this.classList.remove('error');
                    els.profileNameError?.classList.remove('visible');
                }
            };
        }

        // Security
        if (els.securityForm)    els.securityForm.onsubmit = updatePassword;
        if (els.currentPassword) els.currentPassword.oninput = function () {
            if (this.value.length >= 6) {
                this.classList.remove('error');
                els.currentPasswordError?.classList.remove('visible');
            }
        };
        if (els.newPassword) els.newPassword.oninput = function () {
            if (this.value.length >= 6) {
                this.classList.remove('error');
                els.newPasswordError?.classList.remove('visible');
            }
            validateConfirmPassword();
        };
        if (els.confirmPassword) els.confirmPassword.oninput = validateConfirmPassword;

        function validateConfirmPassword() {
            const newPw     = els.newPassword.value;
            const confirmPw = els.confirmPassword.value;
            if (confirmPw && newPw === confirmPw) {
                els.confirmPassword.classList.remove('error');
                els.confirmPasswordError.classList.remove('visible');
            } else if (confirmPw) {
                els.confirmPassword.classList.add('error');
                els.confirmPasswordError.classList.add('visible');
            }
        }

        // Delete modal
        if (els.deleteAccountBtn) els.deleteAccountBtn.onclick = openDeleteModal;
        if (els.deleteModalClose) els.deleteModalClose.onclick = closeDeleteModal;
        if (els.deleteCancel)     els.deleteCancel.onclick     = closeDeleteModal;
        if (els.deleteConfirm)    els.deleteConfirm.onclick    = deleteAccount;
        if (els.deleteModal) {
            els.deleteModal.onclick = function (e) {
                if (e.target === this) closeDeleteModal();
            };
        }

        // Logout + preferences
        if (els.sidebarLogout)   els.sidebarLogout.onclick   = handleLogout;
        if (els.savePreferences) els.savePreferences.onclick = savePreferences;
    }

    /* ============================================================
       STORAGE LISTENER
       ============================================================ */
    let _storageHandler = null;
    function attachStorageListener() {
        if (_storageHandler) return;
        _storageHandler = async (ev) => {
            if (ev.key !== 'st_customer') return;
            if (!document.getElementById('stAccountPage')) return;
            await updateProfileUI();
        };
        window.addEventListener('storage', _storageHandler);
    }
    function detachStorageListener() {
        if (_storageHandler) {
            window.removeEventListener('storage', _storageHandler);
            _storageHandler = null;
        }
    }

    /* ============================================================
       AUTH-AWARE RENDER
       ============================================================ */
    let _authReadyHandler = null;

    function startAuthFlow() {
        (async () => {
            const user = await getUserData();
            _hasRenderedWithUser = !!user?.id;
            await updateProfileUI();
        })();

        _authReadyHandler = async (e) => {
            const d = e?.detail || {};
            if (d.isLoggedIn && d.user?.id) {
                _hasRenderedWithUser = true;
                await updateProfileUI();
            } else if (!_hasRenderedWithUser) {
                await updateProfileUI();
            }
        };
        window.addEventListener('st:auth-ready', _authReadyHandler);

        _authPollId = setInterval(async () => {
            if (_hasRenderedWithUser || !document.getElementById('stAccountPage')) {
                clearInterval(_authPollId);
                _authPollId = null;
                return;
            }
            const user = await getUserData();
            if (user?.id) {
                clearInterval(_authPollId);
                _authPollId = null;
                _hasRenderedWithUser = true;
                await updateProfileUI();
            }
        }, 100);

        setTimeout(() => {
            if (_authPollId) { clearInterval(_authPollId); _authPollId = null; }
        }, 5000);
    }

    /* ============================================================
       CLEANUP / INIT
       ============================================================ */
    function cleanup() {
        if (_authPollId) { clearInterval(_authPollId); _authPollId = null; }
        if (_authReadyHandler) {
            window.removeEventListener('st:auth-ready', _authReadyHandler);
            _authReadyHandler = null;
        }
        detachStorageListener();

        const modal = document.getElementById('stDeleteModal');
        if (modal?.classList.contains('active')) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }

        currentUser = null;
        isLoggedIn  = false;
        orders      = [];
        isEditingEnabled     = false;
        _hasRenderedWithUser = false;
    }

    async function init() {
        const els = getEls();
        if (!els.profileForm) return;
        cleanup();

        console.log('📄 Account Settings: init');

        loadPreferences();
        bindInteractions();
        attachStorageListener();
        startAuthFlow();

        console.log('📄 Account Settings ready');
    }

    /* ============================================================
       GLOBAL EXPORTS
       ============================================================ */
    window.accountSettings = {
        updateProfileUI,
        showSection,
        loadOrders,
        renderOrders,
        handleLogout,
        toggleEditMode,
        setEditingEnabled,
        refreshUserFromSupabase,
        saveProfile,
        updatePassword,
        deleteAccount,
        getUserData,
        getSupabase,
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

    console.log('✅ Account Settings script loaded (SECURE RPC VERSION)');
})();
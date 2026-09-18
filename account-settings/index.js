

    // --- State ---
    let currentUser = null;
    let isLoggedIn = false;
    let orders = [];
    let isEditingEnabled = false;
    let isInitialized = false;

    // --- DOM Elements ---
    const elements = {
        sidebarAvatar: document.getElementById('stSidebarAvatar'),
        sidebarName: document.getElementById('stSidebarName'),
        sidebarEmail: document.getElementById('stSidebarEmail'),
        accountStatus: document.getElementById('stAccountStatus'),
        profileName: document.getElementById('stProfileName'),
        profileEmail: document.getElementById('stProfileEmail'),
        profilePhone: document.getElementById('stProfilePhone'),
        profileAddress: document.getElementById('stProfileAddress'),
        profileBio: document.getElementById('stProfileBio'),
        profileForm: document.getElementById('stProfileForm'),
        profileReset: document.getElementById('stProfileReset'),
        profileNameError: document.getElementById('stProfileNameError'),
        ordersList: document.getElementById('stOrdersList'),
        ordersContainer: document.getElementById('stOrdersContainer'),
        ordersLoading: document.getElementById('stOrdersLoading'),
        securityForm: document.getElementById('stSecurityForm'),
        currentPassword: document.getElementById('stCurrentPassword'),
        newPassword: document.getElementById('stNewPassword'),
        confirmPassword: document.getElementById('stConfirmPassword'),
        currentPasswordError: document.getElementById('stCurrentPasswordError'),
        newPasswordError: document.getElementById('stNewPasswordError'),
        confirmPasswordError: document.getElementById('stConfirmPasswordError'),
        deleteAccountBtn: document.getElementById('stDeleteAccountBtn'),
        deleteModal: document.getElementById('stDeleteModal'),
        deleteModalClose: document.getElementById('stDeleteModalClose'),
        deleteCancel: document.getElementById('stDeleteCancel'),
        deleteConfirm: document.getElementById('stDeleteConfirm'),
        sidebarLogout: document.getElementById('stSidebarLogout'),
        savePreferences: document.getElementById('stSavePreferences'),
        prefOrderUpdates: document.getElementById('stPrefOrderUpdates'),
        prefPromotions: document.getElementById('stPrefPromotions'),
        prefNewsletter: document.getElementById('stPrefNewsletter'),
        prefProfileVisibility: document.getElementById('stPrefProfileVisibility'),
        prefOrderHistory: document.getElementById('stPrefOrderHistory'),
        editToggleBtn: document.getElementById('stEditToggleBtn'),
        saveProfileBtn: document.getElementById('stSaveProfileBtn')
    };

    // ============================================================
    //  GET USER - MULTIPLE METHODS
    // ============================================================

    async function getUserData() {
        // Method 1: STHeader AppState
        if (window.STHeader?.AppState?.isLoggedIn && window.STHeader?.AppState?.user) {
            return window.STHeader.AppState.user;
        }

        // Method 2: getCurrentUser function
        if (typeof getCurrentUser === 'function') {
            try {
                const user = await getCurrentUser();
                if (user?.id) return user;
            } catch (e) {
                console.log('getCurrentUser() not available yet');
            }
        }

        // Method 3: localStorage / sessionStorage
        const stored = localStorage.getItem('st_customer') || sessionStorage.getItem('st_customer');
        if (stored) {
            try {
                const user = JSON.parse(stored);
                if (user?.id) return user;
            } catch (e) {}
        }

        // Method 4: URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('user_id');
        if (userId) {
            return {
                id: userId,
                email: urlParams.get('user_email') ? decodeURIComponent(urlParams.get('user_email')) : '',
                name: urlParams.get('user_name') ? decodeURIComponent(urlParams.get('user_name')) : ''
            };
        }

        return null;
    }

    // ============================================================
    //  TOAST NOTIFICATION
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

    // ============================================================
    //  GET SUPABASE CLIENT
    // ============================================================

    function getSupabase() {
        if (window.STHeader && window.STHeader.getSupabaseClient) {
            return window.STHeader.getSupabaseClient();
        }
        if (window.supabaseClient) {
            return window.supabaseClient;
        }
        try {
            if (typeof supabase !== 'undefined' && supabase.createClient) {
                return supabase.createClient(
                    'https://bulprhgwuwatzobiojwz.supabase.co',
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bHByaGd3dXdhdHpvYmlvand6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDczNDksImV4cCI6MjA5MjA4MzM0OX0.2fcHrGX7iXw5G9nGRNkBy70W1Ex_om1C0v3qbryPmvw'
                );
            }
        } catch (e) {
            console.warn('⚠️ Could not create Supabase client:', e.message);
        }
        return null;
    }

    // ============================================================
    //  RENDER ORDERS
    // ============================================================

    function renderOrders(ordersData) {
        const container = elements.ordersContainer;
        const loading = elements.ordersLoading;

        loading.style.display = 'none';

        if (!ordersData || ordersData.length === 0) {
            container.innerHTML = `
                <div class="st-order-empty">
                    <div class="st-empty-icon"><i class="fas fa-shopping-bag"></i></div>
                    <p style="font-weight:600;color:#0F172A;" data-translate="no_orders_yet">No orders yet</p>
                    <p style="font-size:14px;" data-translate="start_shopping">Start shopping to see your orders here.</p>
                    <a href="/product/" style="display:inline-block;margin-top:16px;padding:10px 24px;background:#6C3CE1;color:white;border-radius:10px;text-decoration:none;font-weight:600;" data-translate="browse_products">
                        Browse Products
                    </a>
                </div>
            `;
            return;
        }

        container.innerHTML = ordersData.map(order => {
            const statusClass = order.status || 'pending';
            const statusLabel = order.status || 'Pending';
            const totalItems = order.items?.reduce((sum, item) => sum + (item.qty || 1), 0) || 0;
            const itemNames = order.items?.map(item => item.name).join(', ') || 'No items';
            const orderId = encodeURIComponent(order.id || '');

            return `
                <div class="st-order-card" onclick="window.navigateWithUserInfo('/orders/?order=${orderId}')" style="cursor:pointer;">
                    <div class="st-order-header">
                        <span class="st-order-id">${dataTranslate('order_number')} #${order.id || 'N/A'}</span>
                        <span class="st-order-status ${statusClass}">${statusLabel}</span>
                    </div>
                    <div class="st-order-details">
                        <div>
                            <div class="st-order-items">${totalItems} ${dataTranslate('items')}: ${itemNames}</div>
                            <div style="font-size:12px;color:#94A3B8;margin-top:2px;">
                                ${order.created_at ? new Date(order.created_at).toLocaleDateString() : (order.date ? new Date(order.date).toLocaleDateString() : 'N/A')}
                            </div>
                        </div>
                        <div class="st-order-total">FCFA ${(order.total || 0).toFixed(2)}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Simple data-translate helper for dynamic content
    function dataTranslate(key) {
        const translations = {
            'order_number': 'Order',
            'items': 'items',
            'items_short': 'items'
        };
        return translations[key] || key;
    }

    // ============================================================
    //  LOAD ORDERS - FIXED with await
    // ============================================================

    async function loadOrders() {
        const container = elements.ordersContainer;
        const loading = elements.ordersLoading;

        container.innerHTML = '';
        loading.style.display = 'flex';

        try {
            // ✅ AWAIT the user
            const user = await getUserData();
            
            if (!user || !user.id) {
                loading.style.display = 'none';
                container.innerHTML = `
                    <div class="st-order-empty">
                        <div class="st-empty-icon"><i class="fas fa-lock"></i></div>
                        <p style="font-weight:600;color:#0F172A;" data-translate="please_login">Please Login</p>
                        <p style="font-size:14px;" data-translate="login_to_view_orders">Login to view your orders.</p>
                    </div>
                `;
                return;
            }

            const client = getSupabase();
            if (client) {
                const { data, error } = await client
                    .from('orders')
                    .select('*')
                    .eq('customer_id', user.id)
                    .order('created_at', { ascending: false });

                if (!error && data && data.length > 0) {
                    orders = data;
                    renderOrders(orders);
                    return;
                }
            }

            // Fallback to local orders
            const localOrders = JSON.parse(localStorage.getItem('shop_orders_v1') || '[]');
            const userOrders = localOrders.filter(o => o.customer_id === user.id || o.email === user.email);
            orders = userOrders;
            renderOrders(orders);

        } catch (err) {
            console.error('❌ Error loading orders:', err);
            loading.style.display = 'none';
            container.innerHTML = `
                <div class="st-order-empty">
                    <div class="st-empty-icon"><i class="fas fa-exclamation-circle"></i></div>
                    <p style="font-weight:600;color:#0F172A;" data-translate="failed_to_load">Failed to load orders</p>
                    <p style="font-size:14px;" data-translate="try_again_later">Please try again later.</p>
                    <button onclick="window.accountSettings.loadOrders()" style="margin-top:16px;padding:10px 24px;background:#6C3CE1;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:600;" data-translate="retry">
                        <i class="fas fa-sync"></i> Retry
                    </button>
                </div>
            `;
        }
    }

    // ============================================================
    //  UPDATE PROFILE UI - FIXED with await
    // ============================================================

    async function updateProfileUI() {
        console.log('🔄 updateProfileUI called');
        
        try {
            // ✅ AWAIT the user data
            const user = await getUserData();

            if (user && user.id) {
                currentUser = user;
                isLoggedIn = true;
                console.log('✅ User loaded:', user.email || user.id);

                const initial = (user.name || 'User').charAt(0).toUpperCase();
                elements.sidebarAvatar.textContent = initial;
                elements.sidebarName.textContent = user.name || 'User';
                elements.sidebarEmail.textContent = user.email || 'No email';
                elements.accountStatus.textContent = `Signed in as ${user.name || 'User'}`;

                elements.profileName.value = user.name || '';
                elements.profileEmail.value = user.email || '';
                elements.profilePhone.value = user.phone || '';
                elements.profileAddress.value = user.address || '';
                elements.profileBio.value = user.bio || '';
                
                // Show profile section if logged in
                const sections = ['profile', 'orders', 'security', 'preferences'];
                sections.forEach(section => {
                    const el = document.getElementById(`section-${section}`);
                    if (el) {
                        el.style.display = 'block';
                    }
                });
                showSection('profile');
                
            } else {
                isLoggedIn = false;
                currentUser = null;
                console.log('👤 No user found, showing guest view');

                elements.sidebarAvatar.textContent = 'G';
                elements.sidebarName.textContent = 'Guest';
                elements.sidebarEmail.textContent = 'Not logged in';
                elements.accountStatus.textContent = 'Signed in as Guest';

                elements.profileName.value = '';
                elements.profileEmail.value = '';
                elements.profilePhone.value = '';
                elements.profileAddress.value = '';
                elements.profileBio.value = '';
                
                // Hide all sections except profile
                ['orders', 'security', 'preferences'].forEach(section => {
                    const el = document.getElementById(`section-${section}`);
                    if (el) {
                        el.style.display = 'none';
                    }
                });
            }

            setEditingEnabled(false);
            isInitialized = true;

        } catch (err) {
            console.error('❌ Error in updateProfileUI:', err);
        }
    }

    // ============================================================
    //  EDITING MODE TOGGLE
    // ============================================================

    function setEditingEnabled(enabled) {
        isEditingEnabled = enabled;
        const inputs = [
            elements.profileName,
            elements.profilePhone,
            elements.profileAddress,
            elements.profileBio
        ];
        inputs.forEach(inp => {
            if (inp) inp.disabled = !enabled;
        });
        elements.profileEmail.disabled = true;
        elements.saveProfileBtn.disabled = !enabled;

        if (enabled) {
            elements.editToggleBtn.innerHTML = '<i class="fas fa-check-circle"></i> Editing Enabled';
            elements.editToggleBtn.style.borderColor = '#10B981';
            elements.editToggleBtn.style.color = '#10B981';
        } else {
            elements.editToggleBtn.innerHTML = '<i class="fas fa-pen"></i> Enable Editing';
            elements.editToggleBtn.style.borderColor = '#E2E8F0';
            elements.editToggleBtn.style.color = '#475569';
        }
    }

    function toggleEditMode() {
        if (!isLoggedIn) {
            showToast('Please log in to edit your profile.', 'warning');
            return;
        }
        setEditingEnabled(!isEditingEnabled);
        showToast(isEditingEnabled ? '✏️ Editing enabled' : '🔒 Editing disabled', 'info');
    }

    // ============================================================
    //  SHOW SECTION
    // ============================================================

    function showSection(sectionName) {
        document.querySelectorAll('.st-section').forEach(el => {
            el.style.display = 'none';
        });

        const section = document.getElementById(`section-${sectionName}`);
        if (section) {
            section.style.display = 'block';
        }

        document.querySelectorAll('.st-sidebar-nav .st-nav-item').forEach(el => {
            el.classList.remove('active');
            if (el.dataset.section === sectionName) {
                el.classList.add('active');
            }
        });

        if (sectionName === 'orders' && isLoggedIn) {
            loadOrders();
        }
    }

    // ============================================================
    //  SAVE PROFILE - FIXED with await
    // ============================================================

    async function saveProfile(e) {
        e.preventDefault();

        const name = elements.profileName.value.trim();
        if (!name) {
            elements.profileName.classList.add('error');
            elements.profileNameError.classList.add('visible');
            return;
        }

        elements.profileName.classList.remove('error');
        elements.profileNameError.classList.remove('visible');

        const phone = elements.profilePhone.value.trim();
        const address = elements.profileAddress.value.trim();
        const bio = elements.profileBio.value.trim();

        try {
            const client = getSupabase();
            if (!client) {
                showToast('❌ Supabase client not available', 'error');
                return;
            }

            // ✅ AWAIT the user
            const user = await getUserData();
            if (!user?.id) {
                showToast('❌ No user logged in', 'error');
                return;
            }

            // Update customer_accounts
            const { error: updateError } = await client
                .from('customer_accounts')
                .update({
                    name: name,
                    phone: phone,
                    address: address,
                    bio: bio,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (updateError) {
                console.error('❌ Supabase update error:', updateError);
                showToast('❌ Failed to update profile', 'error');
                return;
            }

            // Update STHeader state
            if (window.STHeader && window.STHeader.AppState) {
                const headerUser = window.STHeader.AppState.user;
                if (headerUser) {
                    headerUser.name = name;
                    headerUser.phone = phone;
                    headerUser.address = address;
                    headerUser.bio = bio;
                }
            }

            // Update localStorage/sessionStorage
            try {
                const stored = localStorage.getItem('st_customer');
                if (stored) {
                    const customer = JSON.parse(stored);
                    customer.name = name;
                    customer.phone = phone;
                    customer.address = address;
                    customer.bio = bio;
                    localStorage.setItem('st_customer', JSON.stringify(customer));
                }
                const sessionStored = sessionStorage.getItem('st_customer');
                if (sessionStored) {
                    const customer = JSON.parse(sessionStored);
                    customer.name = name;
                    customer.phone = phone;
                    customer.address = address;
                    customer.bio = bio;
                    sessionStorage.setItem('st_customer', JSON.stringify(customer));
                }
            } catch (e) {}

            // Update currentUser
            if (currentUser) {
                currentUser.name = name;
                currentUser.phone = phone;
                currentUser.address = address;
                currentUser.bio = bio;
            }

            // Refresh UI
            await updateProfileUI();
            showToast('✅ Profile updated successfully!');

        } catch (err) {
            console.error('❌ Error saving profile:', err);
            showToast('❌ Failed to update profile: ' + err.message, 'error');
        }
    }

    // ============================================================
    //  REFRESH USER FROM SUPABASE - FIXED with await
    // ============================================================

    async function refreshUserFromSupabase() {
        try {
            const client = getSupabase();
            const user = await getUserData();
            if (!client || !user?.id) return;

            const { data, error } = await client
                .from('customer_accounts')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                console.warn('⚠️ Could not refresh user data:', error);
                return;
            }

            if (data) {
                // Merge data
                currentUser = {
                    id: data.id,
                    name: data.name || user.name,
                    email: data.email || user.email,
                    phone: data.phone || '',
                    address: data.address || '',
                    bio: data.bio || ''
                };
                await updateProfileUI();
                showToast('🔄 Profile refreshed from database');
            }
        } catch (err) {
            console.warn('⚠️ Error refreshing user:', err);
        }
    }

    // ============================================================
    //  UPDATE PASSWORD
    // ============================================================

    async function updatePassword(e) {
        e.preventDefault();

        const currentPw = elements.currentPassword.value;
        const newPw = elements.newPassword.value;
        const confirmPw = elements.confirmPassword.value;

        let isValid = true;

        if (!currentPw || currentPw.length < 6) {
            elements.currentPassword.classList.add('error');
            elements.currentPasswordError.classList.add('visible');
            isValid = false;
        } else {
            elements.currentPassword.classList.remove('error');
            elements.currentPasswordError.classList.remove('visible');
        }

        if (!newPw || newPw.length < 6) {
            elements.newPassword.classList.add('error');
            elements.newPasswordError.classList.add('visible');
            isValid = false;
        } else {
            elements.newPassword.classList.remove('error');
            elements.newPasswordError.classList.remove('visible');
        }

        if (newPw !== confirmPw) {
            elements.confirmPassword.classList.add('error');
            elements.confirmPasswordError.classList.add('visible');
            isValid = false;
        } else {
            elements.confirmPassword.classList.remove('error');
            elements.confirmPasswordError.classList.remove('visible');
        }

        if (!isValid) return;

        try {
            const client = getSupabase();
            if (client) {
                const { error } = await client.auth.updateUser({
                    password: newPw
                });
                if (error) throw error;
            }
            showToast('✅ Password updated successfully!');
            elements.securityForm.reset();
        } catch (err) {
            console.error('❌ Error updating password:', err);
            showToast('❌ Failed to update password: ' + err.message, 'error');
        }
    }

    // ============================================================
    //  DELETE ACCOUNT
    // ============================================================

    async function deleteAccount() {
        try {
            const client = getSupabase();
            const user = await getUserData();
            if (client && user?.id) {
                await client.from('customer_accounts').delete().eq('id', user.id);
                await client.auth.signOut();
            }

            localStorage.removeItem('st_cart');
            localStorage.removeItem('st_wishlist');
            localStorage.removeItem('st_customer');
            sessionStorage.removeItem('st_customer');

            currentUser = null;
            isLoggedIn = false;
            await updateProfileUI();
            closeDeleteModal();
            showToast('🗑️ Account deleted successfully');

            setTimeout(() => {
                window.navigateWithUserInfo('index.html');
            }, 1500);

        } catch (err) {
            console.error('❌ Error deleting account:', err);
            showToast('❌ Failed to delete account: ' + err.message, 'error');
        }
    }

    // ============================================================
    //  DELETE MODAL
    // ============================================================

    function openDeleteModal() {
        elements.deleteModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeDeleteModal() {
        elements.deleteModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // ============================================================
    //  SAVE PREFERENCES
    // ============================================================

    function savePreferences() {
        const prefs = {
            orderUpdates: elements.prefOrderUpdates.checked,
            promotions: elements.prefPromotions.checked,
            newsletter: elements.prefNewsletter.checked,
            profileVisibility: elements.prefProfileVisibility.checked,
            orderHistory: elements.prefOrderHistory.checked
        };
        localStorage.setItem('st_preferences', JSON.stringify(prefs));
        showToast('✅ Preferences saved!');
    }

    function loadPreferences() {
        try {
            const prefs = JSON.parse(localStorage.getItem('st_preferences') || '{}');
            elements.prefOrderUpdates.checked = prefs.orderUpdates !== undefined ? prefs.orderUpdates : true;
            elements.prefPromotions.checked = prefs.promotions || false;
            elements.prefNewsletter.checked = prefs.newsletter || false;
            elements.prefProfileVisibility.checked = prefs.profileVisibility !== undefined ? prefs.profileVisibility : true;
            elements.prefOrderHistory.checked = prefs.orderHistory !== undefined ? prefs.orderHistory : true;
        } catch (e) {}
    }

    // ============================================================
    //  LOGOUT
    // ============================================================

    async function handleLogout() {
        try {
            const client = getSupabase();
            if (client) {
                await client.auth.signOut();
            }

            localStorage.removeItem('st_cart');
            localStorage.removeItem('st_wishlist');
            localStorage.removeItem('st_customer');
            sessionStorage.removeItem('st_customer');

            currentUser = null;
            isLoggedIn = false;
            await updateProfileUI();
            showToast('👋 Logged out successfully');

            setTimeout(() => {
                window.navigateWithUserInfo('index.html');
            }, 1000);

        } catch (err) {
            console.error('❌ Logout error:', err);
            showToast('❌ Logout failed', 'error');
        }
    }

    // ============================================================
    //  INITIALIZE - FIXED
    // ============================================================

    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 Account Settings initializing...');

        // Load preferences first
        loadPreferences();

        // Initial UI update with await
        (async function init() {
            await updateProfileUI();
            console.log('✅ Account Settings initialized');
        })();

        // ---- Event Listeners ----

        // Edit toggle
        elements.editToggleBtn.addEventListener('click', toggleEditMode);

        // Sidebar navigation
        document.querySelectorAll('.st-sidebar-nav .st-nav-item').forEach(btn => {
            btn.addEventListener('click', function() {
                const section = this.dataset.section;
                if (section === 'profile' || section === 'orders' ||
                    section === 'security' || section === 'preferences') {
                    showSection(section);
                }
            });
        });

        // Profile form
        elements.profileForm.addEventListener('submit', saveProfile);

        // Reset profile
        elements.profileReset.addEventListener('click', function() {
            refreshUserFromSupabase();
            setEditingEnabled(false);
        });

        // Profile name validation
        elements.profileName.addEventListener('input', function() {
            if (this.value.trim()) {
                this.classList.remove('error');
                elements.profileNameError.classList.remove('visible');
            }
        });

        // Security form
        elements.securityForm.addEventListener('submit', updatePassword);

        // Password validation
        elements.currentPassword.addEventListener('input', function() {
            if (this.value.length >= 6) {
                this.classList.remove('error');
                elements.currentPasswordError.classList.remove('visible');
            }
        });

        elements.newPassword.addEventListener('input', function() {
            if (this.value.length >= 6) {
                this.classList.remove('error');
                elements.newPasswordError.classList.remove('visible');
            }
            validateConfirmPassword();
        });

        elements.confirmPassword.addEventListener('input', validateConfirmPassword);

        function validateConfirmPassword() {
            const newPw = elements.newPassword.value;
            const confirmPw = elements.confirmPassword.value;
            if (confirmPw && newPw === confirmPw) {
                elements.confirmPassword.classList.remove('error');
                elements.confirmPasswordError.classList.remove('visible');
            } else if (confirmPw) {
                elements.confirmPassword.classList.add('error');
                elements.confirmPasswordError.classList.add('visible');
            }
        }

        // Delete account
        elements.deleteAccountBtn.addEventListener('click', openDeleteModal);
        elements.deleteModalClose.addEventListener('click', closeDeleteModal);
        elements.deleteCancel.addEventListener('click', closeDeleteModal);
        elements.deleteModal.addEventListener('click', function(e) {
            if (e.target === this) closeDeleteModal();
        });
        elements.deleteConfirm.addEventListener('click', deleteAccount);

        // Logout
        elements.sidebarLogout.addEventListener('click', handleLogout);

        // Save preferences
        elements.savePreferences.addEventListener('click', savePreferences);
    });

    // ============================================================
    //  EXPOSE GLOBALLY
    // ============================================================

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
        getSupabase
    };

    console.log('📄 Account Settings page loaded (FIXED)');

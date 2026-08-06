const HEADER_CONFIG = {
    shopName: 'SUCESS<span class="st-brand-highlight">TECHNOLOGY</span>',
    logoText: 'ST',
    navLinks: [
        { label: 'Products', icon: 'fa-box', href: '/product/', dropdown: true, dropdownType: 'products', 'data-translate': 'nav_products' },
        { label: 'Categories', icon: 'fa-th-large', href: '/category/', dropdown: true, dropdownType: 'categories', 'data-translate': 'nav_categories' },
        { label: 'Brands', icon: 'fa-tag', href: '/brand/', dropdown: true, dropdownType: 'brands', 'data-translate': 'nav_brands' },
        { label: 'Contact', icon: 'fa-envelope', href: '/contactus', 'data-translate': 'nav_contact' }
    ],
    pages: {
        cart: '/cart',
        wishlist: '/wishlist',
        orders: '/orders',
        settings: '/account-settings',
        products: '/product/',
        category: '/category/',
        brand: '/brand/'
    }
};


// ============================================================
// 5. STATE MANAGEMENT
// ============================================================

const AppState = {
    user: null,
    cart: [],
    wishlist: [],
    isLoggedIn: false,
    isAuthLoading: false,
    lastAuthAttempt: 0,
    authAttempts: 0
};





let notifications = [];
let unreadCount = 0;
let notificationSubscription = null;

function isNotificationSupported() {
    return typeof window !== 'undefined' && 'Notification' in window;
}

async function requestNotificationPermission() {
    if (!isNotificationSupported()) {
        console.warn('⚠️ Browser does not support native notifications');
        return;
    }

    if (Notification.permission === 'default') {
        try {
            const permission = await Notification.requestPermission();
            console.log('🔔 Notification permission:', permission);
            if (permission !== 'granted') {
                console.warn('⚠️ Native notifications are not enabled');
            }
        } catch (err) {
            console.error('❌ Notification permission request failed:', err);
        }
    }
}

function showNativeNotification(title, text, link = null, image = null) {
    if (!isNotificationSupported() || Notification.permission !== 'granted') {
        return;
    }

    try {
        const options = {
            body: text,
            icon: image || '/favicon.ico',
            badge: '/favicon.ico'
        };

        if (image) {
            options.image = image;
        }

        const notification = new Notification(title, options);

        notification.onclick = function(event) {
            event.preventDefault();
            window.focus();
            if (link) {
                window.location.href = link;
            }
            notification.close();
        };

        setTimeout(() => {
            if (notification && typeof notification.close === 'function') {
                notification.close();
            }
        }, 8000);
    } catch (err) {
        console.warn('⚠️ Unable to show native notification:', err);
    }
}

// --- Initialize Notification System ---
function initNotificationSystem() {
    // Load saved notifications from localStorage
    loadNotifications();
    
    // Request native notification permission if supported
    requestNotificationPermission();

    // Set up real-time subscription
    setupNotificationSubscription();
    
    // Set up notification badge click handlers
    setupNotificationUI();
}

// --- Load Notifications from localStorage ---
function loadNotifications() {
    try {
        const saved = JSON.parse(localStorage.getItem('st_notifications') || '[]');
        notifications = saved;
        unreadCount = notifications.filter(n => !n.read).length;
        updateNotificationBadge();
        renderNotifications();
    } catch (e) {
        notifications = [];
        unreadCount = 0;
    }
}

// --- Save Notifications to localStorage ---
function saveNotifications() {
    localStorage.setItem('st_notifications', JSON.stringify(notifications));
    unreadCount = notifications.filter(n => !n.read).length;
    updateNotificationBadge();
}

// --- Setup Supabase Real-time Subscription ---
function setupNotificationSubscription() {
    const client = getSupabaseClient();
    if (!client) {
        console.warn('⚠️ Supabase client not available for notifications');
        return;
    }

    try {
        // Subscribe to new product inserts
        notificationSubscription = client
            .channel('public:products')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'products'
            }, async (payload) => {
                console.log('🆕 New product added:', payload.new);
                
                // Get the new product details
                const product = payload.new;
                
                // Add notification
                addNotification(
                    '🆕 New Product Added!',
                    `${product.name || 'A new product'} has been added to the store.`,
                    'product',
                    `/item/?product=${product.id}`,
                    product.image
                );
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Real-time notification subscription active');
                } else if (status === 'CHANNEL_ERROR') {
                    console.warn('⚠️ Notification subscription error');
                }
            });

    } catch (err) {
        console.error('❌ Failed to setup notification subscription:', err);
    }
}

// --- Add Notification ---
function addNotification(title, text, type = 'info', link = null, image = null) {
    const notif = {
        id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        title: title,
        text: text,
        type: type,
        link: link,
        image: image,
        read: false,
        createdAt: new Date().toISOString()
    };
    
    notifications.unshift(notif);
    
    // Keep only last 50 notifications
    if (notifications.length > 50) {
        notifications = notifications.slice(0, 50);
    }
    
    saveNotifications();
    renderNotifications();

    // Show native notification if permission was granted
    if (isNotificationSupported() && Notification.permission === 'granted') {
        showNativeNotification(title, text, link, image);
    }
    
    // Show a toast notification
    showNotificationToast(title, text, image, type);
    
    // Play sound if available
    playNotificationSound();
}

// --- Mark Notification as Read ---
function markNotificationAsRead(id) {
    const notif = notifications.find(n => n.id === id);
    if (notif) {
        notif.read = true;
        saveNotifications();
        renderNotifications();
    }
}

// --- Mark All Notifications as Read ---
function markAllNotificationsAsRead() {
    notifications.forEach(n => n.read = true);
    saveNotifications();
    renderNotifications();
}

// --- Delete Notification ---
function deleteNotification(id) {
    notifications = notifications.filter(n => n.id !== id);
    saveNotifications();
    renderNotifications();
}

// --- Clear All Notifications ---
function clearAllNotifications() {
    notifications = [];
    saveNotifications();
    renderNotifications();
}

// --- Update Notification Badge ---
function updateNotificationBadge() {
    const count = unreadCount || 0;
    const badges = document.querySelectorAll('#stNotificationCount, #stMobileNotificationCount');
    badges.forEach(badge => {
        if (badge) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    });
}

// --- Render Notifications in Modal ---
function renderNotifications() {
    const body = document.getElementById('stNotificationBody');
    if (!body) return;

    if (notifications.length === 0) {
        body.innerHTML = `
            <div class="notification-empty">
                <i class="fas fa-bell-slash"></i>
                <p style="font-weight:600;color:#0F172A;font-size:16px;" data-translate="notif_empty_title">No notifications</p>
                <p style="font-size:13px;color:#94A3B8;" data-translate="notif_empty_sub">You're all caught up!</p>
            </div>
        `;
        return;
    }

    // Count unread
    const unreadCount = notifications.filter(n => !n.read).length;
    
    // Add mark all read button if there are unread
    const markAllHtml = unreadCount > 0 ? `
        <button class="notification-mark-all" onclick="markAllNotificationsAsRead()" data-translate="notif_mark_all">
            <i class="fas fa-check-double"></i> Mark all as read
        </button>
    ` : '';

    let html = `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0 4px 12px;border-bottom:1px solid #f1f5f9;margin-bottom:8px;">
            <span style="font-size:13px;color:#94A3B8;" data-translate="notif_unread_count">${unreadCount} unread</span>
            ${markAllHtml}
        </div>
    `;

    html += notifications.map(n => {
        const timeAgo = getTimeAgo(n.createdAt);
        const isUnread = !n.read;
        const icon = getNotificationIcon(n.type);
        const iconColor = getNotificationColor(n.type);

        return `
            <div class="notification-item ${isUnread ? 'unread' : ''}" 
                 onclick="${n.link ? `window.location.href='${n.link}'` : `markNotificationAsRead('${n.id}')`}"
                 style="${isUnread ? 'background:#f8fafc;cursor:pointer;' : 'cursor:pointer;'}">
                ${n.image ? `
                    <div class="notif-image">
                        <img src="${n.image}" alt="Product" onerror="this.style.display='none'">
                    </div>
                ` : `
                    <div class="notif-icon ${iconColor}">
                        <i class="${icon}"></i>
                    </div>
                `}
                <div class="notif-content">
                    <div class="notif-title">${n.title}</div>
                    <div class="notif-text">${n.text}</div>
                    <div class="notif-time">${timeAgo}</div>
                </div>
                ${isUnread ? `<span class="notif-unread-dot"></span>` : ''}
                <button class="notif-delete" onclick="event.stopPropagation(); deleteNotification('${n.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }).join('');

    // Add clear all button
    if (notifications.length > 0) {
        html += `
            <div style="text-align:center;padding-top:12px;border-top:1px solid #f1f5f9;margin-top:4px;">
                <button class="notification-clear-all" onclick="clearAllNotifications()" data-translate="notif_clear_all">
                    <i class="fas fa-trash-alt"></i> Clear all notifications
                </button>
            </div>
        `;
    }

    body.innerHTML = html;
}

// --- Get Notification Icon ---
function getNotificationIcon(type) {
    const icons = {
        'product': 'fas fa-box',
        'deal': 'fas fa-fire',
        'order': 'fas fa-shopping-bag',
        'info': 'fas fa-info-circle',
        'success': 'fas fa-check-circle',
        'warning': 'fas fa-exclamation-triangle'
    };
    return icons[type] || icons.info;
}

// --- Get Notification Color ---
function getNotificationColor(type) {
    const colors = {
        'product': 'info',
        'deal': 'deal',
        'order': 'success',
        'info': 'info',
        'success': 'success',
        'warning': 'warning'
    };
    return colors[type] || 'info';
}

// --- Get Time Ago ---
function getTimeAgo(dateStr) {
    if (!dateStr) return 'Just now';
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    if (diff < 2592000) return Math.floor(diff / 604800) + 'w ago';
    return date.toLocaleDateString();
}

// --- Show Toast Notification ---
function showNotificationToast(title, text, image = null, type = 'info') {
    const existing = document.querySelector('.st-notif-toast');
    if (existing) existing.remove();

    // Dynamically inject animation keyframes if not present
    if (!document.getElementById('bellDropAnimStyle')) {
        const animStyle = document.createElement('style');
        animStyle.id = 'bellDropAnimStyle';
        animStyle.textContent = `
            @keyframes bellDropAndExpand {
                0% {
                    top: -100px;
                    left: auto;
                    right: 24px;
                    transform: scale(0.8);
                    opacity: 0;
                }
                40% {
                    top: 100px;
                    transform: scale(1.05);
                    opacity: 1;
                }
                60% {
                    top: 85px;
                    transform: scale(0.95);
                }
                80% {
                    top: 95px;
                    transform: scale(1.02);
                }
                100% {
                    top: 90px;
                    transform: scale(1);
                    opacity: 1;
                }
            }
            
            @keyframes bellReverse {
                0% {
                    top: 90px;
                    transform: scale(1);
                    opacity: 1;
                }
                60% {
                    top: 50px;
                    transform: scale(1.05);
                    opacity: 0.8;
                }
                100% {
                    top: -100px;
                    transform: scale(0.8);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(animStyle);
    }

    const toast = document.createElement('div');
    toast.className = 'st-notif-toast';
    const colors = {
        'product': '#6C3CE1',
        'deal': '#EF4444',
        'order': '#10B981',
        'info': '#3B82F6',
        'success': '#10B981',
        'warning': '#F59E0B'
    };

    toast.style.cssText = `
        position: fixed;
        top: 90px;
        right: 24px;
        max-width: 380px;
        width: 100%;
        background: white;
        border-radius: 16px;
        padding: 16px 20px;
        box-shadow: 0 8px 40px rgba(0,0,0,0.15);
        border-left: 4px solid ${colors[type] || colors.info};
        z-index: 30001;
        animation: bellDropAndExpand 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        font-family: 'Inter', sans-serif;
        cursor: pointer;
        transition: all 0.3s ease;
    `;

    // Display image if available, otherwise show fallback icon container
    const mediaContent = image 
        ? `<div style="width:48px;height:48px;border-radius:10px;overflow:hidden;flex-shrink:0;background:#f1f5f9;">
               <img src="${image}" alt="Product" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">
           </div>`
        : `<div style="width:36px;height:36px;border-radius:50%;background:${colors[type] || colors.info}20;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
               <i class="${getNotificationIcon(type)}" style="color:${colors[type] || colors.info};font-size:16px;"></i>
           </div>`;

    toast.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:12px;">
            ${mediaContent}
            <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:14px;color:#0F172A;">${title}</div>
                <div style="font-size:13px;color:#64748B;margin-top:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${text}</div>
                <div style="font-size:11px;color:#94A3B8;margin-top:4px;" data-translate="notif_just_now">Just now</div>
            </div>
            <button onclick="event.stopPropagation(); this.parentElement.parentElement.remove();" style="border:none;background:none;color:#94A3B8;cursor:pointer;font-size:14px;padding:4px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    // Click to open notification link
    toast.addEventListener('click', function() {
        const latest = notifications[0];
        if (latest && latest.link) {
            window.location.href = latest.link;
        }
        this.remove();
    });

    document.body.appendChild(toast);
    playNotificationSound();

    // Auto-remove after 6-7 seconds with reverse animation
    setTimeout(() => {
        if (toast.parentNode) {
            // Apply reverse animation
            toast.style.animation = 'bellReverse 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
            
            // Remove after animation completes
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 600);
        }
    }, 6500); // 6.5 seconds visible
}
// --- Play Notification Sound ---
function playNotificationSound() {
    try {
        // Replace 'notification.mp3' with the path to your file
        const audio = new Audio('../head/note.mp3' || '/head/note.mp3'); 
        audio.volume = 0.9;
        audio.play().catch((error) => {
            console.log("Playback prevented by browser policy:", error);
        });
    } catch (e) {
        // Silent fail
    }
}

// --- Open Notification Modal ---
function openNotificationModal() {
    const modal = document.getElementById('stNotificationModal');
    const overlay = document.getElementById('stNotificationOverlay');
    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
        
        // Push modal state to history
        if (history.state?.modal !== 'notifications') {
            history.pushState({ modal: 'notifications' }, '');
        }
        
        // Mark all as read when opened
        markAllNotificationsAsRead();
    }
    if (overlay) overlay.classList.add('active');
}

// --- Close Notification Modal ---
function closeNotificationModal(isBackNavigation = false) {
    const modal = document.getElementById('stNotificationModal');
    const overlay = document.getElementById('stNotificationOverlay');
    if (modal) modal.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';

    // Remove state from history if closed manually (not via back button)
    if (!isBackNavigation && history.state?.modal === 'notifications') {
        history.back();
    }
}
window.addEventListener('popstate', (event) => {
    // If the modal state is gone, close the modal
    if (!event.state || event.state.modal !== 'notifications') {
        closeNotificationModal(true);
    }
});



// --- Setup Notification UI ---
function setupNotificationUI() {
    const notifBtn = document.getElementById('stNotificationBtn');
    const mobileNotifBtn = document.getElementById('stMobileNotificationBtn');
    const notifClose = document.getElementById('stNotificationClose');
    const notifOverlay = document.getElementById('stNotificationOverlay');

    if (notifBtn) notifBtn.addEventListener('click', openNotificationModal);
    if (mobileNotifBtn) mobileNotifBtn.addEventListener('click', openNotificationModal);
    if (notifClose) notifClose.addEventListener('click', closeNotificationModal);
    if (notifOverlay) notifOverlay.addEventListener('click', closeNotificationModal);

    // Close with ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeNotificationModal();
        }
    });

    // Close with Android back button
    document.addEventListener('backbutton', function(e) {
        if (document.getElementById('stNotificationModal')?.classList.contains('open')) {
            e.preventDefault();
            closeNotificationModal();
        }
    });
}
window.notificationSystem = {
    add: addNotification,
    load: loadNotifications,
    render: renderNotifications,
    open: openNotificationModal,
    close: closeNotificationModal,
    markAllRead: markAllNotificationsAsRead,
    clearAll: clearAllNotifications,
    markRead: markNotificationAsRead,
    delete: deleteNotification
};
function initNotifications() {
    // Add notification button to header
    const headerRight = document.querySelector('.st-header-right');
    if (headerRight && !document.getElementById('stNotificationBtn')) {
        const notifBtn = document.createElement('button');
        notifBtn.id = 'stNotificationBtn';
        notifBtn.className = 'st-action-btn';
        notifBtn.style.position = 'relative';
        notifBtn.innerHTML = `
            <i class="fas fa-bell"></i>
            <span class="st-badge" id="stNotificationCount" style="background:#EF4444;font-size:9px;min-width:18px;height:18px;top:-2px;right:-2px;display:none;">0</span>
        `;
        headerRight.appendChild(notifBtn);
    }


    // Initialize notification system
    initNotificationSystem();
}



function getViewAnalytics() {
  try {
    const stored = localStorage.getItem('st_view_analytics');
    if (!stored) return {};
    return JSON.parse(stored);
  } catch (err) {
    console.warn('⚠️ Could not read view analytics locally:', err.message);
    return {};
  }
}

function setViewAnalytics(analytics) {
  try {
    localStorage.setItem('st_view_analytics', JSON.stringify(analytics));
  } catch (err) {
    console.warn('⚠️ Could not save view analytics locally:', err.message);
  }
}

async function saveViewAnalyticsToDB(productId, data) {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { error } = await client
      .from('view_analytics')
      .upsert({
        product_id: productId,
        count: data.count,
        first_viewed: data.firstViewed,
        last_viewed: data.lastViewed
      }, {
        onConflict: 'product_id'
      });

    if (error) {
      console.warn('⚠️ Could not save view analytics:', error.message);
    }
  } catch (err) {
    console.warn('⚠️ View analytics sync skipped:', err.message);
  }
}

async function trackProductView(productId) {
  if (!productId) return;

  const analytics = getViewAnalytics();
  const now = new Date().toISOString();
  const entry = analytics[productId] || {
    count: 0,
    firstViewed: now,
    lastViewed: now
  };

  entry.count = (Number(entry.count) || 0) + 1;
  entry.lastViewed = now;
  analytics[productId] = entry;

  setViewAnalytics(analytics);
  await saveViewAnalyticsToDB(productId, entry);
}
(function () {
    'use strict';

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
       ELEMENT LOOKUP — fresh each init
       ============================================================ */
    function getEls() {
        return {
            page:                 document.getElementById('contactPage'),
            loading:              document.getElementById('contactLoading'),
            content:              document.getElementById('contactContent'),
            heroShopName:         document.getElementById('heroShopName'),
            heroDescription:      document.getElementById('heroDescription'),
            heroLocationText:     document.getElementById('heroLocationText'),
            heroHoursText:        document.getElementById('heroHoursText'),
            heroShopImage:        document.getElementById('heroShopImage'),
            shopPhotoPlaceholder: document.getElementById('shopPhotoPlaceholder'),
            contactAddress:       document.getElementById('contactAddress'),
            contactPhoneLink:     document.getElementById('contactPhoneLink'),
            contactEmailLink:     document.getElementById('contactEmailLink'),
            contactHours:         document.getElementById('contactHours'),
            contactShopName:      document.getElementById('contactShopName'),
            contactDescription:   document.getElementById('contactDescription'),
            descriptionCard:      document.getElementById('descriptionCard'),
            mapAddress:           document.getElementById('mapAddress'),
            mapCoords:            document.getElementById('mapCoords'),
            mapDirectionsBtn:     document.getElementById('mapDirectionsBtn'),
            mapLinkBtn:           document.getElementById('mapLinkBtn'),
            directionsAction:     document.getElementById('directionsAction'),
            ctaDirectionsBtn:     document.getElementById('ctaDirectionsBtn'),
            callAction:           document.getElementById('callAction'),
            ctaCallBtn:           document.getElementById('ctaCallBtn'),
            whatsappBtn:          document.getElementById('whatsappBtn'),
            emailBtn:             document.getElementById('emailBtn'),
            openBadge:            document.getElementById('openBadge'),
            socialLinks:          document.getElementById('socialLinks'),
        };
    }

    /* ============================================================
       HELPERS
       ============================================================ */
    function showToast(message, type = 'success') {
        document.querySelector('.toast-msg')?.remove();
        const toast = document.createElement('div');
        toast.className = `toast-msg ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-20px)';
            toast.style.transition = 'all .3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function checkIfOpen(hoursText) {
        // … (unchanged from your version)
        const now = new Date();
        const day = now.getDay();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        for (const line of (hoursText || '').toLowerCase().split('\n')) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.includes('closed')) {
                const days = ['sun','mon','tue','wed','thu','fri','sat'];
                for (let i = 0; i < days.length; i++) {
                    if (trimmed.includes(days[i]) && day === i) return false;
                }
            }

            const m = trimmed.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–to]+\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
            if (!m) continue;

            let sh = parseInt(m[1]);
            const sm = parseInt(m[2] || '0');
            const sp = m[3]?.toLowerCase();
            let eh = parseInt(m[4]);
            const em = parseInt(m[5] || '0');
            const ep = m[6]?.toLowerCase();

            if (sp === 'pm' && sh !== 12) sh += 12;
            if (sp === 'am' && sh === 12) sh = 0;
            if (ep === 'pm' && eh !== 12) eh += 12;
            if (ep === 'am' && eh === 12) eh = 0;

            const startTime = sh * 60 + sm;
            const endTime   = eh * 60 + em;

            const dayMatch =
                (day === 0 && trimmed.includes('sun')) ||
                (day === 1 && trimmed.includes('mon')) ||
                (day === 2 && trimmed.includes('tue')) ||
                (day === 3 && trimmed.includes('wed')) ||
                (day === 4 && trimmed.includes('thu')) ||
                (day === 5 && trimmed.includes('fri')) ||
                (day === 6 && trimmed.includes('sat')) ||
                (day >= 1 && day <= 5 && trimmed.includes('mon') && trimmed.includes('fri'));

            if (dayMatch && currentTime >= startTime && currentTime <= endTime) return true;
        }
        return false;
    }

    /* ============================================================
       FETCH BUSINESS INFO
       ============================================================ */
    async function fetchBusinessInfo() {
        const client = window.getSupabaseClient?.();
        if (!client) { showFallbackData(); return; }

        try {
            const [bizRes, contactRes] = await Promise.all([
                client.from('business_info').select('*').eq('id', 1).single(),
                client.from('contact_info').select('id, latitude, longitude, hours, description, shop_photo, created_at').eq('id', 1).single(),
            ]);

            if (bizRes.error) throw bizRes.error;
            if (contactRes.error) console.warn('⚠️ contact_info:', contactRes.error.message);

            const combined = { ...(bizRes.data || {}), ...(contactRes.data || {}) };
            renderContactInfo(combined);
        } catch (err) {
            console.error('❌ Error fetching data:', err.message);
            showFallbackData();
        }
    }

    /* ============================================================
       RENDER
       ============================================================ */
    function renderContactInfo(info) {
        const els = getEls();
        if (!els.content) return;

        if (els.loading) els.loading.style.display = 'none';
        els.content.style.display = 'block';

        const shopName = info.shop_name || 'Sucess Technology';
        if (els.heroShopName)    els.heroShopName.textContent = shopName;
        if (els.contactShopName) els.contactShopName.textContent = shopName;

        const description = info.description ||
            t('default_description', 'Your trusted partner for premium technology products and exceptional service.');
        if (els.heroDescription)    els.heroDescription.textContent = description;
        if (els.contactDescription) els.contactDescription.textContent = description;

        if (info.description?.trim() &&
            info.description !== 'Your trusted partner for premium technology products and exceptional service.') {
            els.descriptionCard?.classList.remove('hidden');
        }

        const address = info.address || t('default_address', 'Douala, Cameroon');
        if (els.contactAddress)    els.contactAddress.textContent = address;
        if (els.heroLocationText)  els.heroLocationText.textContent = address;
        if (els.mapAddress)        els.mapAddress.textContent = address;

        // Phone
        const phone = info.phone || t('default_phone', ' ');
        const phoneClean = phone.replace(/\s/g, '');
        const phoneDigits = phone.replace(/\D/g, '');

        if (els.contactPhoneLink) {
            els.contactPhoneLink.textContent = phone;
            els.contactPhoneLink.href = `tel:${phoneClean}`;
        }
        if (els.callAction)   els.callAction.href   = `tel:${phoneClean}`;
        if (els.ctaCallBtn)   els.ctaCallBtn.href   = `tel:${phoneClean}`;
        if (els.whatsappBtn)  els.whatsappBtn.href  = phoneDigits ? `https://wa.me/${phoneDigits}` : '#';

        // Email
        const email = info.email || t('default_email', 'info@sucesstechnology.com');
        if (els.contactEmailLink) {
            els.contactEmailLink.textContent = email;
            els.contactEmailLink.href = `mailto:${email}`;
        }
        if (els.emailBtn) els.emailBtn.href = `mailto:${email}`;

        // Hours
        const hoursText = info.hours || t('default_hours', 'Mon - Fri: 7:00 AM - 8:00 PM\nSun: Closed');
        const hoursDisplay = hoursText.replace(/\\n/g, '\n');
        if (els.contactHours)  els.contactHours.textContent  = hoursDisplay;
        if (els.heroHoursText) els.heroHoursText.textContent = hoursDisplay;

        // Open / Closed badge
        const isOpen = checkIfOpen(hoursText);
        if (els.openBadge) {
            els.openBadge.textContent = isOpen ? t('open_now', '🟢 Open Now') : t('closed', '🔴 Closed');
            els.openBadge.className = `card-badge ${isOpen ? 'open' : 'closed'}`;
        }

        // Coordinates
        let lat = info.latitude || '4.051056';
        let lng = info.longitude || '9.767869';
        if (typeof lat === 'string') lat = parseFloat(lat);
        if (typeof lng === 'string') lng = parseFloat(lng);

        if (els.mapCoords) {
            els.mapCoords.textContent = `📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }

        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        if (els.mapDirectionsBtn)  els.mapDirectionsBtn.href  = mapsUrl;
        if (els.mapLinkBtn)        els.mapLinkBtn.href        = mapsUrl;
        if (els.directionsAction)  els.directionsAction.href  = mapsUrl;
        if (els.ctaDirectionsBtn)  els.ctaDirectionsBtn.href  = mapsUrl;

        // Shop photo
        if (info.shop_photo?.trim()) {
            if (els.heroShopImage) {
                els.heroShopImage.src = info.shop_photo;
                els.heroShopImage.style.display = 'block';
            }
            if (els.shopPhotoPlaceholder) els.shopPhotoPlaceholder.style.display = 'none';
        } else {
            if (els.heroShopImage) els.heroShopImage.style.display = 'none';
            if (els.shopPhotoPlaceholder) els.shopPhotoPlaceholder.style.display = 'flex';
        }

        renderSocialLinks(info);
        document.title = `${t('contact_title', 'Contact')} & ${t('locate_us', 'Locate Us')} · ${shopName}`;
    }

    function renderSocialLinks(info) {
        const els = getEls();
        if (!els.socialLinks) return;

        const config = [
            { key: 'facebook',  icon: 'fa-facebook',  label: 'Facebook' },
            { key: 'instagram', icon: 'fa-instagram', label: 'Instagram' },
            { key: 'tiktok',    icon: 'fa-tiktok',    label: 'TikTok' },
            { key: 'twitter',   icon: 'fa-twitter',   label: 'Twitter' },
            { key: 'youtube',   icon: 'fa-youtube',   label: 'YouTube' },
            { key: 'linkedin',  icon: 'fa-linkedin',  label: 'LinkedIn' },
        ];
        const items = config.filter(s => info[s.key]?.trim() && info[s.key] !== '#');

        if (!items.length) {
            els.socialLinks.innerHTML =
                `<span style="color:#94A3B8;font-size:14px;" data-translate="no_social">No social links available</span>`;
            return;
        }
        els.socialLinks.innerHTML = items.map(s =>
            `<a href="${s.url ?? info[s.key]}" target="_blank" rel="noopener noreferrer" title="${s.label}">
                <i class="fab ${s.icon}"></i>
            </a>`).join('');
    }

    function showFallbackData() {
        renderContactInfo({
            shop_name: 'Sucess Technology',
            email: 'info@sucesstechnology.com',
            phone: '+237 6XX XXX XXX',
            address: 'Douala, Cameroon',
            description: t('default_description', 'Your trusted partner for premium technology products and exceptional service.'),
            hours: 'Mon - Fri: 7:00 AM - 8:00 PM\nSun: Closed',
            latitude: '4.051056',
            longitude: '9.767869',
        });
    }

    /* ============================================================
       SHARE
       ============================================================ */
    function shareLocation() {
        const els = getEls();
        const address = els.contactAddress?.textContent || t('our_store', 'Our Store');
        const mapsUrl = els.mapDirectionsBtn?.href || window.location.href;

        if (navigator.share) {
            navigator.share({
                title: t('visit_our_store', 'Visit Our Store'),
                text: `${t('find_us_at', 'Find us at')}: ${address}`,
                url: mapsUrl
            }).catch(() => {
                navigator.clipboard?.writeText(mapsUrl);
                showToast('📍 ' + t('location_copied', 'Location link copied!'));
            });
        } else {
            navigator.clipboard?.writeText(mapsUrl);
            showToast('📍 ' + t('location_copied', 'Location link copied!'));
        }
    }

    /* ============================================================
       BIND INTERACTIONS
       ============================================================ */
    function bindInteractions() {
        // Nothing to bind on this page — all links use href.
        // shareLocation is called via inline onclick and rebound below.
        window.shareLocation = shareLocation;
    }

    /* ============================================================
       CLEANUP / INIT
       ============================================================ */
    function cleanup() {
        // Nothing to tear down — no timers, no observers, no patches.
    }

    function init() {
        const els = getEls();
        if (!els.page) return;   // not on the contact page
        cleanup();

        console.log('📄 Contact page: init');

        bindInteractions();
        fetchBusinessInfo();

        console.log('✅ Contact page ready');
    }

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

    console.log('✅ Contact page script loaded');
})();
(function () {
    'use strict';

    /* ============================================================
       ELEMENT LOOKUP — fresh each init
       ============================================================ */
    function getEls() {
        return {
            page:                 document.querySelector('main'),
            loading:              document.getElementById('aboutLoading'),
            content:              document.getElementById('aboutContent'),
            heroShopName:         document.getElementById('heroShopName'),
            aboutShopName:        document.getElementById('aboutShopName'),
            heroDescription:      document.getElementById('heroDescription'),
            aboutDescription:     document.getElementById('aboutDescription'),
            contactGrid:          document.getElementById('contactInfoGrid'),
            socialLinks:          document.getElementById('socialLinks'),
            statYears:            document.getElementById('statYears'),
            statProducts:         document.getElementById('statProducts'),
            statCustomers:        document.getElementById('statCustomers'),
            heroLocationText:     document.getElementById('heroLocationText'),
            heroHoursText:        document.getElementById('heroHoursText'),
            heroShopImage:        document.getElementById('heroShopImage'),
            shopPhotoPlaceholder: document.getElementById('shopPhotoPlaceholder'),
            heroImageContainer:   document.getElementById('heroImageContainer'),
        };
    }

    /* ============================================================
       HELPERS
       ============================================================ */
    function escapeHtml(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getSupabase() { return window.getSupabaseClient?.() || null; }

    /* ============================================================
       FETCH
       ============================================================ */
    async function fetchBusinessInfo() {
        const client = getSupabase();
        if (!client) { showFallbackData(); return; }

        try {
            const [bizRes, contactRes] = await Promise.all([
                client.from('business_info').select('*').eq('id', 1).single(),
                client.from('contact_info')
                    .select('id, latitude, longitude, hours, description, shop_photo, created_at')
                    .eq('id', 1).single(),
            ]);

            if (bizRes.error) throw bizRes.error;
            if (contactRes.error) console.warn('⚠️ contact_info:', contactRes.error.message);

            const combined = { ...(bizRes.data || {}), ...(contactRes.data || {}) };
            renderBusinessInfo(combined);
        } catch (err) {
            console.error('❌ Error fetching data:', err.message);
            showFallbackData();
        }
    }

    /* ============================================================
       RENDER
       ============================================================ */
    function renderBusinessInfo(info) {
        const els = getEls();
        if (!els.content) return;

        if (els.loading) els.loading.style.display = 'none';
        els.content.style.display = 'block';

        // Shop name
        const shopName = info.shop_name || 'Sucess Technology';
        if (els.heroShopName)  els.heroShopName.textContent  = shopName;
        if (els.aboutShopName) els.aboutShopName.textContent = shopName;

        // Description
        const description = info.description ||
            'Your trusted partner for premium technology products and exceptional service.';
        if (els.heroDescription)  els.heroDescription.textContent  = description;
        if (els.aboutDescription) els.aboutDescription.textContent = description;

        // Location
        if (info.latitude && info.longitude) {
            const lat = parseFloat(info.latitude);
            const lng = parseFloat(info.longitude);
            if (!isNaN(lat) && !isNaN(lng) && els.heroLocationText) {
                els.heroLocationText.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                const link = document.getElementById('heroLocation');
                if (link) {
                    link.href = `https://maps.google.com/?q=${lat},${lng}`;
                    link.target = '_blank';
                    link.style.cursor = 'pointer';
                    link.style.textDecoration = 'none';
                }
            }
        } else if (info.address && els.heroLocationText) {
            els.heroLocationText.textContent = info.address;
        }

        // Hours
        if (info.hours && els.heroHoursText) {
            els.heroHoursText.textContent = info.hours.replace(/\\n/g, ' • ');
        }

        // Shop photo
        if (info.shop_photo?.trim()) {
            if (els.heroShopImage) {
                els.heroShopImage.src = info.shop_photo;
                els.heroShopImage.style.display = 'block';
            }
            if (els.shopPhotoPlaceholder) els.shopPhotoPlaceholder.style.display = 'none';

            const aboutImage = document.querySelector('.about-image');
            if (aboutImage) {
                // Rebuild only if the src differs (idempotent)
                const existing = aboutImage.querySelector('img');
                if (!existing || existing.src !== info.shop_photo) {
                    aboutImage.innerHTML = '';
                    const img = document.createElement('img');
                    img.src = info.shop_photo;
                    img.alt = 'Shop Photo';
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                    aboutImage.appendChild(img);
                }
            }
        } else {
            if (els.heroShopImage) els.heroShopImage.style.display = 'none';
            if (els.shopPhotoPlaceholder) els.shopPhotoPlaceholder.style.display = 'flex';
        }

        renderContactInfo(info);
        renderSocialLinks(info);
        renderStats(info);

        document.title = `About ${shopName} · Sucess Technology`;
    }

    function renderContactInfo(info) {
        const els = getEls();
        if (!els.contactGrid) return;

        const items = [];
        if (info.email) {
            items.push({ icon: 'fa-envelope', label: 'Email', value: info.email, href: `mailto:${info.email}` });
        }
        if (info.phone) {
            const clean = String(info.phone).replace(/\s/g, '');
            items.push({ icon: 'fa-phone', label: 'Phone', value: info.phone, href: `tel:${clean}` });
        }
        if (info.address) {
            items.push({
                icon: 'fa-map-marker-alt', label: 'Address', value: info.address,
                href: `https://maps.google.com/?q=${encodeURIComponent(info.address)}`
            });
        }
        if (info.hours) {
            items.push({
                icon: 'fa-clock', label: 'Business Hours',
                value: info.hours.replace(/\\n/g, ' • '), href: '#'
            });
        }

        if (!items.length) {
            els.contactGrid.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:20px;color:#94A3B8;" data-translate="no_contact">
                    No contact information available
                </div>`;
            return;
        }

        els.contactGrid.innerHTML = items.map(item => {
            const target = (item.href.startsWith('mailto:') ||
                            item.href.startsWith('tel:')    ||
                            item.href === '#') ? '_self' : '_blank';
            return `
                <a href="${escapeHtml(item.href)}" target="${target}" class="contact-info-item">
                    <div class="ci-icon"><i class="fas ${item.icon}"></i></div>
                    <div class="ci-text">
                        <span class="ci-label" data-translate="contact_${item.label.toLowerCase().replace(' ', '_')}">${escapeHtml(item.label)}</span>
                        <span class="ci-value">${escapeHtml(item.value)}</span>
                    </div>
                </a>`;
        }).join('');
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

        // Skip '#' and blank — the old code opened a blank tab for '#'
        const items = config
            .map(s => ({ ...s, url: info[s.key] }))
            .filter(s => s.url && s.url.trim() && s.url !== '#');

        if (!items.length) {
            els.socialLinks.innerHTML = `
                <span style="color:#94A3B8;font-size:14px;" data-translate="no_social">No social links available</span>`;
            return;
        }

        els.socialLinks.innerHTML = items.map(s => `
            <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" title="${s.label}">
                <i class="fab ${s.icon}"></i>
            </a>`).join('');
    }

    function renderStats(info) {
        const els = getEls();
        if (!info.stats) return;
        try {
            const stats = JSON.parse(info.stats);
            if (stats.years     && els.statYears)     els.statYears.textContent     = stats.years;
            if (stats.products  && els.statProducts)  els.statProducts.textContent  = stats.products;
            if (stats.customers && els.statCustomers) els.statCustomers.textContent = stats.customers;
        } catch (_) { /* keep defaults */ }
    }

    function showFallbackData() {
        renderBusinessInfo({
            shop_name: 'Sucess Technology',
            email: 'info@sucesstechnology.com',
            phone: '+237 6XX XXX XXX',
            address: 'Douala, Cameroon',
            description: "Your trusted partner for premium technology products and exceptional service. We're committed to bringing you the best in tech innovation.",
            hours: 'Mon - Fri: 7:00 AM - 8:00 PM\nSun: Closed',
            latitude: '4.051056',
            longitude: '9.767869'
        });
    }

    /* ============================================================
       SMOOTH SCROLL (idempotent via .onclick)
       ============================================================ */
    function bindAnchorScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.onclick = function (e) {
                const href = this.getAttribute('href');
                if (!href || href === '#') return;   // let the default do nothing
                let target = null;
                try { target = document.querySelector(href); } catch (_) { return; }
                if (!target) return;
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };
        });
    }

    /* ============================================================
       CLEANUP / INIT
       ============================================================ */
    function cleanup() {
        // Nothing to tear down — no timers, no observers.
        // Kept for symmetry with other pages.
    }

    async function init() {
        const els = getEls();
        // Bail if we're not on the About page. `aboutContent` is a page-unique id.
        if (!els.content && !els.heroShopName) return;
        cleanup();

        console.log('📄 About Us page: init');

        bindAnchorScroll();
        await fetchBusinessInfo();

        if (typeof translateUI === 'function') translateUI();

        console.log('📄 About Us page ready');
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

    console.log('✅ About Us script loaded');
})();
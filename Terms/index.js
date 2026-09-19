(function () {
    'use strict';

    /* ============================================================
       MODULE STATE
       ============================================================ */
    let sectionObserver = null;
    let _fallbackTimer   = null;

    /* ============================================================
       ELEMENT LOOKUP — fresh each init
       ============================================================ */
    function getEls() {
        return {
            root:          document.querySelector('.terms-page')          // ← page root
                        || document.getElementById('termsPage')
                        || document.getElementById('companyName'),         // fallback marker
            acceptBtn:     document.getElementById('acceptBtn'),
            declineBtn:    document.getElementById('declineBtn'),
            companyName:   document.getElementById('companyName'),
            companyTagline: document.getElementById('companyTagline'),
            effectiveDate: document.getElementById('effectiveDate'),
            lastUpdated:   document.getElementById('lastUpdatedDate'),
            contactEmail:  document.getElementById('contactEmail'),
            contactPhone:  document.getElementById('contactPhone'),
            contactAddress: document.getElementById('contactAddress'),
            contactHours:  document.getElementById('contactHours'),
            governingCountry:    document.getElementById('governingCountry'),
            jurisdictionCountry: document.getElementById('jurisdictionCountry'),
            lawCountry:          document.getElementById('lawCountry'),
            courtCountry:        document.getElementById('courtCountry'),
            tocItems:      document.querySelectorAll('.toc-item'),
            sections:      document.querySelectorAll('.term-section'),
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
       TOAST
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

    /* ============================================================
       BUSINESS INFO
       ============================================================ */
    async function fetchBusinessInfo() {
        try {
            const supabase = window.getSupabaseClient?.();
            if (!supabase || typeof supabase.from !== 'function') {
                showFallbackData();
                return;
            }

            const [bizRes, contactRes] = await Promise.all([
                supabase.from('business_info').select('*').eq('id', 1).single(),
                supabase.from('contact_info').select('*').eq('id', 1).single(),
            ]);

            if (bizRes.error)     console.warn('⚠️ Business info fetch error:', bizRes.error.message);
            if (contactRes.error) console.warn('⚠️ Contact info fetch error:', contactRes.error.message);

            const combined = { ...(bizRes.data || {}), ...(contactRes.data || {}) };

            if (combined && Object.keys(combined).length > 0) {
                renderBusinessInfo(combined);
            } else {
                showFallbackData();
            }
        } catch (err) {
            console.error('❌ Error fetching business info:', err);
            showFallbackData();
        }
    }

    function renderBusinessInfo(data) {
        const els = getEls();

        const companyName = data.name || data.company_name || 'Sucess Technology';
        if (els.companyName) {
            els.companyName.textContent = `${t('terms_and', 'Terms &')} Conditions · ${companyName}`;
        }
        document.querySelectorAll('#businessName1, #businessName7, #businessName9').forEach(el => {
            el.textContent = companyName;
        });

        if (data.description && els.companyTagline) {
            els.companyTagline.textContent = data.description;
        }

        if ((data.established_date || data.created_at) && els.effectiveDate) {
            const d = new Date(data.established_date || data.created_at);
            if (!isNaN(d)) {
                els.effectiveDate.textContent =
                    `${t('effective', 'Effective')} ${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
            }
        }

        if (data.updated_at && els.lastUpdated) {
            const d = new Date(data.updated_at);
            if (!isNaN(d)) {
                els.lastUpdated.textContent = d.toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric'
                });
            }
        }

        if (data.email && els.contactEmail)   els.contactEmail.textContent = data.email;
        if ((data.phone || data.phone_number) && els.contactPhone)
            els.contactPhone.textContent = data.phone || data.phone_number;

        const addr = [data.address, data.city, data.country].filter(Boolean);
        if (addr.length && els.contactAddress) els.contactAddress.textContent = addr.join(', ');

        if ((data.hours || data.business_hours) && els.contactHours)
            els.contactHours.textContent = data.hours || data.business_hours;

        if (data.country) {
            if (els.governingCountry)    els.governingCountry.textContent    = `the ${data.country}`;
            if (els.jurisdictionCountry) els.jurisdictionCountry.textContent = data.country;
            if (els.lawCountry)          els.lawCountry.textContent          = data.country;
            if (els.courtCountry)        els.courtCountry.textContent        = data.country;
        }

        try { sessionStorage.setItem('st_business_info', JSON.stringify(data)); } catch (_) {}
    }

    function showFallbackData() {
        const els = getEls();
        if (els.companyName) {
            els.companyName.textContent = 'Terms & Conditions · Sucess Technology';
        }
        document.querySelectorAll('#businessName1, #businessName7, #businessName9').forEach(el => {
            el.textContent = 'Sucess Technology';
        });
    }

    /* ============================================================
       TOC SMOOTH SCROLL + BUTTONS
       ============================================================ */
    function bindTOC() {
        document.querySelectorAll('.toc-item').forEach(link => {
            link.onclick = function (e) {                     // assignment, not addEventListener
                e.preventDefault();
                const id = this.getAttribute('href')?.substring(1);
                const target = id && document.getElementById(id);
                if (!target) return;
                const headerOffset = 100;
                const top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
                window.scrollTo({ top, behavior: 'smooth' });
            };
        });
    }

    function bindAcceptDecline() {
        const { acceptBtn, declineBtn } = getEls();
        if (acceptBtn) {
            acceptBtn.onclick = function () {                 // assignment
                showToast('✅ ' + t('thank_you_accept', 'Thank you for accepting our Terms & Conditions!'));
                this.innerHTML = '<i class="fas fa-check"></i> ' + t('accepted', 'Accepted');
                this.style.background = '#10B981';
                this.disabled = true;
                if (declineBtn) { declineBtn.style.opacity = '0.5'; declineBtn.disabled = true; }
                localStorage.setItem('st_terms_accepted', 'true');
                localStorage.setItem('st_terms_accepted_date', new Date().toISOString());
            };
        }
        if (declineBtn) {
            declineBtn.onclick = function () {                 // assignment
                showToast('⚠️ ' + t('must_accept', 'You must accept the Terms & Conditions to use our platform.'), 'error');
            };
        }
    }

    function applyAcceptedState() {
        if (localStorage.getItem('st_terms_accepted') !== 'true') return;
        const { acceptBtn, declineBtn } = getEls();
        if (!acceptBtn) return;
        acceptBtn.innerHTML = '<i class="fas fa-check"></i> ' + t('already_accepted', 'Already Accepted');
        acceptBtn.style.background = '#10B981';
        acceptBtn.disabled = true;
        if (declineBtn) { declineBtn.style.opacity = '0.5'; declineBtn.disabled = true; }
    }

    /* ============================================================
       SECTION ANIMATIONS
       ============================================================ */
    function animateSections() {
        const sections = document.querySelectorAll('.term-section');

        // Set initial hidden state
        sections.forEach((section, index) => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(20px)';
            section.style.transition = `all .5s ease ${index * 0.05}s`;
        });

        if (sectionObserver) sectionObserver.disconnect();

        if (!('IntersectionObserver' in window)) {
            // Very old browsers: just reveal
            sections.forEach(s => {
                s.style.opacity = '1';
                s.style.transform = 'translateY(0)';
            });
            return;
        }

        sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    sectionObserver.unobserve(entry.target);   // one-shot per section
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        sections.forEach(s => sectionObserver.observe(s));

        // Fallback: reveal everything after 200ms in case IO never fires (hidden tabs etc.)
        if (_fallbackTimer) clearTimeout(_fallbackTimer);
        _fallbackTimer = setTimeout(() => {
            sections.forEach(s => {
                s.style.opacity = '1';
                s.style.transform = 'translateY(0)';
            });
        }, 200);
    }

    /* ============================================================
       INIT / CLEANUP
       ============================================================ */
    function cleanup() {
        if (sectionObserver) { sectionObserver.disconnect(); sectionObserver = null; }
        if (_fallbackTimer)  { clearTimeout(_fallbackTimer); _fallbackTimer = null; }
    }

    async function init() {
        // 1. Bail if we're not on the terms page
        const marker = document.getElementById('companyName')
                    || document.getElementById('acceptBtn');
        if (!marker) return;

        // 2. Tear down previous instance
        cleanup();

        console.log('📄 Terms & Conditions: init');

        // 3. Async data
        await fetchBusinessInfo();

        // 4. Bind interactions (assignment = idempotent)
        bindTOC();
        bindAcceptDecline();
        applyAcceptedState();

        // 5. Animations
        animateSections();

        if (typeof translateUI === 'function') translateUI();

        console.log('✅ Terms & Conditions ready');
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

    console.log('✅ Terms page script loaded');
})();
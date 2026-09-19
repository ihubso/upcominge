(function () {
    'use strict';

    /* ============================================================
       MODULE STATE
       ============================================================ */
    let cardObserver  = null;
    let _revealTimer  = null;

    /* ============================================================
       PAGE MARKER
       ============================================================ */
    function getPageRoot() {
        return document.querySelector('.return-policy-page')
            || document.getElementById('returnPolicyPage')
            || document.querySelector('.policy-card');   // last-resort marker
    }

    /* ============================================================
       SMOOTH SCROLL FOR ANCHOR LINKS
       ============================================================ */
    function bindAnchorScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.onclick = function (e) {
                const href = this.getAttribute('href');
                if (!href || href === '#') return;          // leave default
                const target = document.querySelector(href);
                if (!target) return;
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };
        });
    }

    /* ============================================================
       SCROLL-REVEAL ANIMATIONS
       ============================================================ */
    function animateCards() {
        const cards = document.querySelectorAll(
            '.policy-card, .exclusions-section, .process-section, ' +
            '.notes-section, .contact-section, .guarantee-banner'
        );
        if (!cards.length) return;

        // Set initial hidden state
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = `all .5s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s`;
        });

        // Disconnect previous observer
        if (cardObserver) { cardObserver.disconnect(); cardObserver = null; }

        if (!('IntersectionObserver' in window)) {
            // Very old browsers — just reveal
            cards.forEach(c => {
                c.style.opacity = '1';
                c.style.transform = 'translateY(0)';
            });
            return;
        }

        cardObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    cardObserver.unobserve(entry.target);   // one-shot per card
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        cards.forEach(c => cardObserver.observe(c));

        // Fallback — reveal everything shortly after, in case IO never fires
        // (hidden tab, IO bug, or user reloads mid-page).
        if (_revealTimer) clearTimeout(_revealTimer);
        _revealTimer = setTimeout(() => {
            cards.forEach(c => {
                c.style.opacity = '1';
                c.style.transform = 'translateY(0)';
            });
        }, 200);
    }

    /* ============================================================
       CLEANUP / INIT
       ============================================================ */
    function cleanup() {
        if (cardObserver) { cardObserver.disconnect(); cardObserver = null; }
        if (_revealTimer) { clearTimeout(_revealTimer); _revealTimer = null; }
    }

    async function init() {
        const root = getPageRoot();
        if (!root) return;      // not the return-policy page

        cleanup();
        console.log('📄 Return Policy page: init');

        bindAnchorScroll();
        animateCards();

        console.log('✅ Return Policy page ready');
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

    console.log('✅ Return Policy script loaded');
})();
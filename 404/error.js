(function () {
    'use strict';

    /* ============================================================
       ELEMENT LOOKUP
       ============================================================ */
    function getEls() {
        return {
            root:         document.querySelector('.error-container'),
            searchInput:  document.getElementById('errorSearchInput'),
        };
    }

    /* ============================================================
       SEARCH
       ============================================================ */
    function handleSearch() {
        const els = getEls();
        if (!els.searchInput) return;

        const query = els.searchInput.value.trim();
        if (!query) {
            // Empty input: focus + brief red ring
            els.searchInput.focus();
            els.searchInput.style.borderColor = '#EF4444';
            setTimeout(() => { els.searchInput.style.borderColor = ''; }, 1000);
            return;
        }
        window.navigateWithUserInfo?.(`/product/?search=${encodeURIComponent(query)}`);
    }

    /* ============================================================
       ANALYTICS
       ============================================================ */
    function track404() {
        if (typeof gtag === 'undefined') return;
        try {
            gtag('event', '404_error', { page_path: location.pathname });
        } catch (_) {}
    }

    /* ============================================================
       BIND
       ============================================================ */
    function bindInteractions() {
        // expose for inline onclick on the button
        window.handleSearch = handleSearch;

        const els = getEls();
        if (els.searchInput) {
            els.searchInput.onkeypress = function (e) {
                if (e.key === 'Enter') handleSearch();
            };
        }
    }

    /* ============================================================
       CLEANUP / INIT
       ============================================================ */
    function cleanup() {
        // Nothing to tear down — no timers, no observers.
    }

    function init() {
        const els = getEls();
        if (!els.root) return;   // not the 404 page
        cleanup();

        console.log('📄 404 page: init');

        bindInteractions();
        track404();

        console.log('📄 404 page ready');
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

    console.log('✅ 404 page script loaded');
})();
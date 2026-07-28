// ============================================================
// HEADER LOADER - Single entry point
// Loads all modules in the correct order
// ============================================================

(function() {
    const scripts = [
        '/js/header-core.js',
        '/js/header-database.js',
        '/js/header-auth.js',
        '/js/header-search.js',
        '/js/header-dropdowns.js',
        '/js/header-init.js'
    ];
    
    let loaded = 0;
    
    function loadNext() {
        if (loaded >= scripts.length) {
            console.log('✅ All header modules loaded');
            return;
        }
        
        const script = document.createElement('script');
        script.src = scripts[loaded];
        script.async = false; // Load in order
        script.onload = function() {
            loaded++;
            loadNext();
        };
        script.onerror = function() {
            console.warn('⚠️ Failed to load:', scripts[loaded]);
            loaded++;
            loadNext(); // Continue loading
        };
        document.head.appendChild(script);
    }
    
    loadNext();
})();
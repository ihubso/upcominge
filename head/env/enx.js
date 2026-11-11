const SUPABASE_CONFIG = {
    url: 'https://bulprhgwuwatzobiojwz.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bHByaGd3dXdhdHpvYmlvand6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDczNDksImV4cCI6MjA5MjA4MzM0OX0.2fcHrGX7iXw5G9nGRNkBy70W1Ex_om1C0v3qbryPmvw'
};
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
let supabaseClient = null;
let supabaseInitialized = false;

function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        supabaseClient = supabase.createClient(
            SUPABASE_CONFIG.url, 
            SUPABASE_CONFIG.anonKey
        );
        supabaseInitialized = true;
        console.log('✅ Supabase client initialized');
        return supabaseClient;
    }
    
       else {
        console.warn('⚠️ Supabase SDK not loaded. Please ensure the script is included in your HTML.');
          loadSupabaseSDK();
    }
    return null;
}
    window.getSupabaseClient = getSupabaseClient;

// head/price-formatter.js
(function () {
    'use strict';

    function formatCFA(amount, opts = {}) {
        const showCurrency = opts.showCurrency !== false;
        const withDecimals = opts.withDecimals === true;

        const n = Number(amount);
        if (!Number.isFinite(n)) return showCurrency ? '0 CFA' : '0';

        // Round to whole CFA (no decimals by default)
        const value = withDecimals ? n : Math.round(n);

      
        const formatted = value.toLocaleString('fr-FR', {
            minimumFractionDigits: withDecimals ? 2 : 0,
            maximumFractionDigits: withDecimals ? 2 : 0,
        });

        return showCurrency ? `${formatted} CFA` : formatted;
    }

    // Expose globally
    window.formatCFA = formatCFA;

    // Short alias
    window.fcfa = (amount) => formatCFA(amount);
})();

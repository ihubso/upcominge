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



    (function() {
  // Check if we're on GitHub Pages or production
  const isProduction = window.location.hostname.includes('github.io') || 
                       !window.location.hostname.includes('localhost');
  
  if (isProduction) {
    // Disable all console methods
    const noop = function() {};
    console.log = noop;
    console.error = noop;
    console.warn = noop;
    console.info = noop;
    console.debug = noop;
    console.trace = noop;
  }
})();
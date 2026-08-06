function updateUrlWithUserInfo() {
    try {
        // Get current user info
        const user = window.STHeader?.AppState?.user || null;
        const isLoggedIn = window.STHeader?.AppState?.isLoggedIn || false;
        
        if (!isLoggedIn || !user) {
            console.log('ℹ️ No user logged in, skipping URL update');
            return;
        }
        
        // Get current URL and its parameters
        const currentUrl = new URL(window.location.href);
        const params = new URLSearchParams(currentUrl.search);
        
        // Add user information as parameters (only if not already present)
        if (user.id && !params.has('user_id')) {
            params.set('user_id', user.id);
        }
        if (user.email && !params.has('user_email')) {
            params.set('user_email', encodeURIComponent(user.email));
        }
        if (user.name && !params.has('user_name')) {
            params.set('user_name', encodeURIComponent(user.name));
        }
        if (user.phone && !params.has('user_phone')) {
            params.set('user_phone', encodeURIComponent(user.phone));
        }
        if (user.address && !params.has('user_address')) {
            params.set('user_address', encodeURIComponent(user.address));
        }
        // Add session info
        if (!params.has('session')) {
            params.set('session', Date.now().toString());
        }
        
        // Add login status
        if (!params.has('logged_in')) {
            params.set('logged_in', 'true');
        }
        
        // Update URL without reloading the page
        const newUrl = `${currentUrl.pathname}?${params.toString()}${currentUrl.hash}`;
        
        // Only update if URL has changed
        if (window.location.href !== newUrl) {
            window.history.replaceState({}, '', newUrl);
            console.log('✅ URL updated with user info:', newUrl);
        }
        
    } catch (err) {
        console.warn('⚠️ Failed to update URL with user info:', err.message);
    }
}


function clearUserInfoFromUrl() {
    try {
        const currentUrl = new URL(window.location.href);
        const params = new URLSearchParams(currentUrl.search);
        
        // Remove user-related parameters
        params.delete('user_id');
        params.delete('user_email');
        params.delete('user_name');
        params.delete('user_phone');
        params.delete('user_address');
        params.delete('session');
        params.delete('logged_in');
        
        // Build new URL
        const queryString = params.toString();
        const newUrl = `${currentUrl.pathname}${queryString ? '?' + queryString : ''}${currentUrl.hash}`;
        window.history.replaceState({}, '', newUrl);
        console.log('✅ User info cleared from URL');
        
    } catch (err) {
        console.warn('⚠️ Failed to clear user info from URL:', err.message);
    }
}

/**
 * Gets user information from URL parameters
 */
function getUserInfoFromUrl() {
    try {
        const params = new URLSearchParams(window.location.search);
        const userInfo = {};
        
        if (params.has('user_id')) {
            userInfo.id = params.get('user_id');
        }
        if (params.has('user_email')) {
            userInfo.email = decodeURIComponent(params.get('user_email'));
        }
        if (params.has('user_name')) {
            userInfo.name = decodeURIComponent(params.get('user_name'));
        }
        if (params.has('session')) {
            userInfo.session = params.get('session');
        }
        if (params.has('logged_in')) {
            userInfo.loggedIn = params.get('logged_in') === 'true';
        }
        
        return Object.keys(userInfo).length > 0 ? userInfo : null;
    } catch (err) {
        console.warn('⚠️ Failed to get user info from URL:', err.message);
        return null;
    }
}
window.updateUrlWithUserInfo = updateUrlWithUserInfo;
window.clearUserInfoFromUrl = clearUserInfoFromUrl;
window.getUserInfoFromUrl = getUserInfoFromUrl;

async function getCurrentUser() {
    // First check if we have a user in AppState
    if (!AppState.isLoggedIn || !AppState.user?.id) {
        console.warn('⚠️ getCurrentUser: No user logged in');
        return null;
    }

    const client = getSupabaseClient();
    if (!client) {
        console.warn('⚠️ getCurrentUser: Supabase client not available');
        return null;
    }

    const customerId = AppState.user.id;

    try {
        // Fetch full user data from database
        const { data, error } = await client
            .from('customer_accounts')
            .select(`
                id,
                email,
                name,
                phone,
                address,
                last_login,
                created_at,
                updated_at,
                status,
                bio
            `)
            .eq('id', customerId)
            .maybeSingle();

        if (error) {
            console.error('❌ getCurrentUser: Error fetching user data:', error.message);
            return null;
        }

        if (!data) {
            console.warn('⚠️ getCurrentUser: User not found in database');
            return null;
        }

        // Merge with existing AppState user data (preserve any additional fields)
        const fullUser = {
            ...AppState.user,
            ...data
        };

        // Update AppState with fresh data
        AppState.user = fullUser;

        // Update stored session with fresh data
        const storedData = localStorage.getItem('st_customer') || sessionStorage.getItem('st_customer');
        if (storedData) {
            try {
                const parsed = JSON.parse(storedData);
                const updated = { ...parsed, ...data };
                const storage = localStorage.getItem('st_customer') ? 'localStorage' : 'sessionStorage';
                if (storage === 'localStorage') {
                    localStorage.setItem('st_customer', JSON.stringify(updated));
                } else {
                    sessionStorage.setItem('st_customer', JSON.stringify(updated));
                }
            } catch (err) {
                // Ignore storage update errors
            }
        }

        console.log('✅ getCurrentUser: User data fetched successfully');
        return fullUser;

    } catch (err) {
        console.error('❌ getCurrentUser: Unexpected error:', err.message);
        return null;
    }
}



async function signUpCustomer(email, password, name, phone = '', address = '', country = '') {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available');
    
    // Validate inputs
    if (!email) throw new Error('Email is required');
    if (!password) throw new Error('Password is required');
    if (!name) throw new Error('Name is required');
    
    // Check if email already exists
    try {
        const { data: existing, error: checkError } = await client
            .from('customer_accounts')
            .select('id, email')
            .eq('email', email)
            .maybeSingle();
        
        if (checkError) throw new Error(checkError.message);
        if (existing) throw new Error('Email already registered. Please login.');
    } catch (err) {
        if (err.message.includes('already registered')) throw err;
        console.warn('⚠️ Email check warning:', err.message);
    }
    
    // Generate UUID for id
    const id = crypto.randomUUID ? crypto.randomUUID() : 
        'cust_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    try {
        const { data, error } = await client
            .rpc('create_customer_account', {
                p_id: id,
                p_name: name,
                p_email: email,
                p_phone: phone || '',
                p_address: address || '',
                p_country: country || '',
                p_password: password,
                p_st_terms_accepted: 'true' ,
                p_st_terms_accepted_date: new Date().toISOString()
            });
        
        if (error) {
            console.error('❌ Signup error:', error);
            throw new Error(error.message);
        }
        
        console.log('✅ Account created successfully for:', email);
                        localStorage.setItem('st_terms_accepted', 'true');
                localStorage.setItem('st_terms_accepted_date', new Date().toISOString());
        
        return { 
            id: id, 
            email, 
            name, 
            phone: phone || '', 
            address: address || '',
            country: country || ''
        };
    } catch (err) {
        console.error('❌ RPC error:', err);
        throw new Error('Failed to create account. Please try again.');
    }
}

async function loginCustomer(email, password) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available');
    
    // Get customer by email
    const { data: customer, error } = await client
        .from('customer_accounts')
         .select('id, name, email, phone, address, country, bio, password_hash') 
        .eq('email', email)
        .maybeSingle();
    
    if (error) throw new Error(error.message);
    if (!customer) throw new Error('Invalid email or password');
    
    // Verify password using database function
    const { data: verified, error: verifyError } = await client
        .rpc('verify_customer_password', {
            p_email: email,
            p_password: password
        });
    
    if (verifyError) throw new Error(verifyError.message);
    if (!verified) throw new Error('Invalid email or password');
    
    // Update last_login
    await client
        .from('customer_accounts')
        .update({ last_login: new Date().toISOString() })
        .eq('id', customer.id);
    
    // Return customer data (without password_hash)
    return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        country: customer.country || ''  // ✅ Added country
    };

}

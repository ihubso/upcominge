
async function fetchCartFromDB(customerId) {
    if (!customerId) return console.warn("⚠️ fetchCartFromDB: No customer_id provided"), [];
    const client = getSupabaseClient();
    if (!client) return [];
    try {
        // ✅ SECURE: Fetch cart via RPC
        const { data, error } = await client.rpc("get_user_cart", {
            p_customer_id: customerId,
            p_session_id: null
        });
        if (error) throw error;
        
        return (data || []).map(item => ({
            id: item.id,
            product_id: item.product_id,
            name: item.name || "Unknown Product",
            price: item.price || 0,
            qty: item.qty || 1,
            image: item.image || "https://placehold.co/600x400",
            variants: item.variants || {},
            isDeal: item.is_deal || false,
            originalPrice: item.original_price || null,
            discount: item.discount || null,
            brand: item.brand || ""
        }));
    } catch (err) {
        return console.error("❌ Error fetching cart:", err.message), [];
    }
}

async function saveCartToDB(customerId, cart) {
    if (!customerId) return void console.warn("⚠️ saveCartToDB: No customer_id provided - skipping DB sync");
    const client = getSupabaseClient();
    if (client) {
        try {
            const cartItemsPayload = cart.map(item => ({
                product_id: item.product_id || item.id || "",
                name: item.name || "Unknown Product",
                price: item.price || 0,
                qty: item.qty || 1,
                image: item.image || "https://placehold.co/600x400",
                variants: item.variants || {},
                is_deal: item.isDeal || false,
                original_price: item.originalPrice || null,
                discount: item.discount || null,
                brand: item.brand || ""
            }));
            
            // ✅ SECURE: Sync cart via RPC
            await client.rpc("sync_user_cart", {
                p_customer_id: customerId,
                p_session_id: null,
                p_cart_items: cartItemsPayload
            });
        } catch (err) {
            console.error("❌ Error saving cart:", err.message);
        }
    }
}


// ✅ SECURE: Fetch wishlist via RPC
async function fetchWishlistFromDB(customerId) {
    if (!customerId) {
        console.warn("⚠️ fetchWishlistFromDB: No customer_id provided");
        return [];
    }
    const client = getSupabaseClient();
    if (!client) return [];
    
    try {
        const { data, error } = await client.rpc("get_user_wishlist", {
            p_customer_id: customerId,
            p_session_id: null
        });
        
        if (error) throw error;
        return (data || []).map(row => row.product_id);
    } catch (err) {
        console.error("❌ Error fetching wishlist:", err.message);
        return [];
    }
}

// ✅ SECURE: Save wishlist via RPC
async function saveWishlistToDB(customerId, wishlistArray) {
    if (!customerId) {
        console.warn("⚠️ saveWishlistToDB: No customer_id provided - skipping DB sync");
        return;
    }
    const client = getSupabaseClient();
    if (client) {
        try {
            await client.rpc("sync_user_wishlist", {
                p_customer_id: customerId,
                p_session_id: null,
                p_product_ids: wishlistArray
            });
        } catch (err) {
            console.error("❌ Error saving wishlist:", err.message);
        }
    }
}

async function fetchSearchAnalyticsFromDB() {
    const client = getSupabaseClient();
    if (!client) {
        console.warn('⚠️ Supabase not available for search analytics');
        return {};
    }

    try {
        const { data, error } = await client
            .from('search_analytics')
            .select('*');

        if (error) {
            console.error('❌ Error fetching search analytics:', error.message);
            return {};
        }

        const analytics = {};
        (data || []).forEach(row => {
            analytics[row.query] = {
                query: row.query,
                count: row.count,
                lastSearched: row.last_searched
            };
        });
        return analytics;
    } catch (err) {
        console.error('❌ Error fetching search analytics:', err.message);
        return {};
    }
}

async function saveSearchAnalyticsToDB(query) {
    if (!query || !query.trim()) return;

    const client = getSupabaseClient();
    if (!client) {
        console.warn('⚠️ Supabase not available for search analytics');
        return;
    }

    const normalizedQuery = query.trim();

    try {
        const { data, error } = await client
            .from('search_analytics')
            .select('count')
            .eq('query', normalizedQuery)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('❌ Error reading search analytics row:', error.message);
            return;
        }

        const now = new Date().toISOString();

        if (data && typeof data.count === 'number') {
            const { error: updateError } = await client
                .from('search_analytics')
                .update({
                    count: data.count + 1,
                    last_searched: now
                })
                .eq('query', normalizedQuery);

            if (updateError) {
                console.error('❌ Error updating search analytics:', updateError.message);
            }
        } else {
            const { error: insertError } = await client
                .from('search_analytics')
                .insert([{ query: normalizedQuery, count: 1, last_searched: now }]);

            if (insertError) {
                console.error('❌ Error inserting search analytics:', insertError.message);
            }
        }
    } catch (err) {
        console.error('❌ Error saving search analytics:', err.message);
    }
}

// Expose search analytics helper to global window object
if (typeof window !== 'undefined') {
    window.saveSearchAnalyticsToDB = saveSearchAnalyticsToDB;
}

async function fetchCategoriesAndBrands() {
    const client = getSupabaseClient();
    if (!client) {
        console.warn('⚠️ Supabase not available for categories/brands');
        return { categories: [], brands: [] };
    }

    try {
    
        const { data, error } = await client.rpc('get_all_products');

        if (error) throw error;

        // Extract unique categories with a sample product image
        const categoryMap = new Map();
        const brandMap = new Map();
        
        (data || []).forEach(product => {
            // Categories
            if (product.category && !categoryMap.has(product.category)) {
                categoryMap.set(product.category, {
                    name: product.category,
                    image: product.image || 'https://placehold.co/100x100/6C3CE1/FFFFFF?text=Category',
                    productId: product.id,
                    count: 1
                });
            } else if (product.category) {
                const existing = categoryMap.get(product.category);
                if (existing) existing.count++;
            }
            
            // Brands
            if (product.brand && !brandMap.has(product.brand)) {
                brandMap.set(product.brand, {
                    name: product.brand,
                    image: product.image || 'https://placehold.co/100x100/6C3CE1/FFFFFF?text=Brand',
                    productId: product.id,
                    count: 1
                });
            } else if (product.brand) {
                const existing = brandMap.get(product.brand);
                if (existing) existing.count++;
            }
        });

        // Convert to arrays and sort by count (most popular first)
        const categories = Array.from(categoryMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 12); // Limit to 12 categories

        const brands = Array.from(brandMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 12); // Limit to 12 brands

        console.log(`✅ Loaded ${categories.length} categories and ${brands.length} brands via RPC`);
        return { categories, brands };

    } catch (err) {
        console.error('❌ Error fetching categories/brands:', err.message);
        return { categories: [], brands: [] };
    }
}

async function fetchCartFromDB(customerId) {
    if (!customerId) {
        console.warn('⚠️ fetchCartFromDB: No customer_id provided');
        return [];
    }
    
    const client = getSupabaseClient();
    if (!client) return [];
    
    try {
        const { data, error } = await client
            .from('cart')
            .select('*')
            .eq('customer_id', customerId);
        
        if (error) throw error;
        
        return (data || []).map(item => ({
            product_id: item.product_id,
            id: item.product_id,
            name: item.name || 'Unknown Product',
            price: item.price || 0,
            qty: item.qty || 1,
            image: item.image || 'https://placehold.co/600x400',
            variants: item.variants || {},
            isDeal: item.is_deal || false,
            originalPrice: item.original_price || null,
            discount: item.discount || null
        }));
    } catch (err) {
        console.error('❌ Error fetching cart:', err.message);
        return [];
    }
}

    async function saveCartToDB(identifier, cart, hasCustomerId = false) {
        const client = getSupabaseClient();
        if (!client) return;
        
        try {
            // Delete ONLY the rows for this specific identifier
            if (hasCustomerId) {
                await client.from('cart').delete().eq('customer_id', identifier);
            } else {
                await client.from('cart').delete().eq('session_id', identifier);
            }
            
            if (cart.length === 0) {
                console.log('✅ Cart cleared from DB (empty cart)');
                return;
            }
            
            // Insert new cart items
            const rows = cart.map(item => {
                const row = {
                    product_id: item.product_id || item.id || '',
                    name: item.name || 'Unknown Product',
                    price: item.price || 0,
                    qty: item.qty || 1,
                    image: item.image || 'https://placehold.co/600x400',
                    variants: item.variants || {},
                    is_deal: item.isDeal || false,
                    original_price: item.originalPrice || null,
                    discount: item.discount || null,
                    brand: item.brand || ''
                };
                
                if (hasCustomerId) {
                    row.customer_id = identifier;
                    row.session_id = null;
                } else {
                    row.session_id = identifier;
                    row.customer_id = null;
                }
                
                return row;
            });
            
            const validRows = rows.filter(row => row.product_id);
            if (validRows.length > 0) {
                const { error } = await client.from('cart').insert(validRows);
                if (error) {
                    console.error('❌ Error saving cart:', error.message);
                } else {
                    console.log(`✅ Cart saved to DB: ${validRows.length} items (${hasCustomerId ? 'customer_id' : 'session_id'})`);
                }
            }
        } catch (err) {
            console.error('❌ Error saving cart:', err.message);
        }
    }


async function fetchWishlistFromDB(customerId) {
    if (!customerId) {
        console.warn('⚠️ fetchWishlistFromDB: No customer_id provided');
        return [];
    }
    
    const client = getSupabaseClient();
    if (!client) return [];
    
    try {
        const { data, error } = await client
            .from('wishlist')
            .select('product_id')
            .eq('customer_id', customerId);
        
        if (error) throw error;
        return (data || []).map(row => row.product_id);
    } catch (err) {
        console.error('❌ Error fetching wishlist:', err.message);
        return [];
    }
}

async function saveWishlistToDB(customerId, wishlist) {
    if (!customerId) {
        console.warn('⚠️ saveWishlistToDB: No customer_id provided - skipping DB sync');
        return;
    }
    
    const client = getSupabaseClient();
    if (!client) return;
    
    try {
        await client.from('wishlist').delete().eq('customer_id', customerId);
        
        if (wishlist.length > 0) {
            const rows = wishlist.map(pid => ({ customer_id: customerId, product_id: pid }));
            const { error } = await client.from('wishlist').insert(rows);
            if (error) console.error('❌ Error saving wishlist:', error.message);
        }
    } catch (err) {
        console.error('❌ Error saving wishlist:', err.message);
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
        const { data, error } = await client
            .from('products')
            .select('category, brand, image, id, name')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Extract unique categories with a sample product image
        const categoryMap = new Map();
        const brandMap = new Map();
        
        data.forEach(product => {
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

        console.log(`✅ Loaded ${categories.length} categories and ${brands.length} brands`);
        return { categories, brands };

    } catch (err) {
        console.error('❌ Error fetching categories/brands:', err.message);
        return { categories: [], brands: [] };
    }
}
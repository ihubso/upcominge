
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

async function saveCartToDB(customerId, cart) {
    if (!customerId) {
        console.warn('⚠️ saveCartToDB: No customer_id provided - skipping DB sync');
        return;
    }
    
    const client = getSupabaseClient();
    if (!client) return;
    
    try {
        await client.from('cart').delete().eq('customer_id', customerId);
        
        if (cart.length > 0) {
            const rows = cart.map(item => ({
                customer_id: customerId,
                product_id: item.product_id || item.id || '',
                name: item.name || 'Unknown Product',
                price: item.price || 0,
                qty: item.qty || 1,
                image: item.image || 'https://placehold.co/600x400',
                variants: item.variants || {},
                is_deal: item.isDeal || false,
                original_price: item.originalPrice || null,
                discount: item.discount || null
            }));
            
            const validRows = rows.filter(row => row.product_id);
            if (validRows.length > 0) {
                const { error } = await client.from('cart').insert(validRows);
                if (error) console.error('❌ Error saving cart:', error.message);
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
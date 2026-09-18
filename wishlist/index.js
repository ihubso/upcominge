

        let wishlistItems = [];
        let wishlistIds = [];



        function renderSkeletonLoader() {
            const grid = document.getElementById('stWishlistGrid');
            if (!grid) return;

            const skeletonCards = Array(8).fill(0).map(() => `
                <div class="st-skeleton-card">
                    <div class="st-skeleton-image">
                        <div class="st-shimmer"></div>
                    </div>
                    <div class="st-skeleton-body">
                        <div class="st-skeleton-text st-skeleton-name"></div>
                        <div class="st-skeleton-text st-skeleton-brand"></div>
                        <div class="st-skeleton-text st-skeleton-price"></div>
                        <div class="st-skeleton-rating">
                            <div class="st-skeleton-text st-skeleton-stars"></div>
                            <div class="st-skeleton-text st-skeleton-reviews"></div>
                        </div>
                        <div class="st-skeleton-actions">
                            <div class="st-skeleton-btn-cart"></div>
                            <div class="st-skeleton-btn-view"></div>
                        </div>
                    </div>
                </div>
            `).join('');

            grid.innerHTML = `
                <div class="st-skeleton-grid">
                    ${skeletonCards}
                </div>
            `;
        }

        // ============================================================
        // 4. PRODUCT DATA
        // ============================================================

        let productCache = {};

        async function fetchProductDetails(productId) {
            if (productCache[productId]) return productCache[productId];
            
            try {
                const client = getSupabaseClient();
                if (client) {
                    const { data, error } = await client
                        .from('products')
                        .select('*')
                        .eq('id', productId)
                        .single();
                    
                    if (!error && data) {
                        productCache[productId] = data;
                        return data;
                    }
                }
            } catch (err) {
                console.warn('⚠️ Failed to fetch product:', err.message);
            }
            
            try {
                const allProducts = JSON.parse(localStorage.getItem('st_products') || '[]');
                const product = allProducts.find(p => p.id === productId || p.id === productId);
                if (product) {
                    productCache[productId] = product;
                    return product;
                }
            } catch (e) {}
            
            return {
                id: productId,
                name: 'Product ' + productId,
                price: 0,
                image: 'https://placehold.co/600x400',
                brand: 'Unknown Brand',
                description: 'Product details not available'
            };
        }

        // ============================================================
        // 5. RENDER WISHLIST
        // ============================================================

        async function renderWishlist() {
            const grid = document.getElementById('stWishlistGrid');
            const countEl = document.getElementById('stWishlistPageCount');

            // Show skeleton while loading
            renderSkeletonLoader();

            if (!wishlistIds || wishlistIds.length === 0) {
                grid.innerHTML = `
                    <div class="st-empty-wishlist">
                        <div class="st-empty-icon"><i class="fas fa-heart"></i></div>
                        <h2 data-translate="empty_wishlist_title">Your wishlist is empty</h2>
                        <p data-translate="empty_wishlist_sub">Save your favorite items and come back to them anytime.</p>
                        <a href="/product/" class="st-btn-shop" data-translate="start_exploring">
                            <i class="fas fa-store"></i> Start Exploring
                        </a>
                    </div>
                `;
                countEl.textContent = '0 items';
                return;
            }

            countEl.textContent = wishlistIds.length + ' item' + (wishlistIds.length > 1 ? 's' : '');

            try {
                const productPromises = wishlistIds.map(id => fetchProductDetails(id));
                const products = await Promise.all(productPromises);
                wishlistItems = products.filter(p => p !== null);

                if (wishlistItems.length === 0) {
                    grid.innerHTML = `
                        <div class="st-empty-wishlist">
                            <div class="st-empty-icon"><i class="fas fa-heart"></i></div>
                            <h2 data-translate="empty_wishlist_title">Your wishlist is empty</h2>
                            <p data-translate="empty_wishlist_sub">Save your favorite items and come back to them anytime.</p>
                            <a href="/product/" class="st-btn-shop" data-translate="start_exploring">
                                <i class="fas fa-store"></i> Start Exploring
                            </a>
                        </div>
                    `;
                    return;
                }

                grid.innerHTML = wishlistItems.map((product, index) => {
                    const isDeal = product.isDeal || false;
                    const isNew = product.isNew || false;
                    const isHot = product.isHot || false;
                    const discount = product.discount || 0;
                    const originalPrice = product.originalPrice || product.price || 0;
                    const currentPrice = product.price || 0;
                    const rating = product.rating || 0;
                    const reviewCount = product.reviewCount || 0;

                    let badge = '';
                    if (isDeal) badge = `<span class="st-card-badge st-deal" data-translate="badge_deal">🔥 Deal</span>`;
                    else if (isNew) badge = `<span class="st-card-badge st-new" data-translate="badge_new">✨ New</span>`;
                    else if (isHot) badge = `<span class="st-card-badge st-hot" data-translate="badge_hot">⚡ Hot</span>`;

                    const starsHtml = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));

                    return `
                        <div class="st-wishlist-card" data-index="${index}">
                            <div class="st-card-image">
                                <img src="${product.image || product.images?.[0] || 'https://placehold.co/600x400'}" 
                                     alt="${product.name || 'Product'}" 
                                     onerror="this.src='https://placehold.co/600x400'">
                                ${badge}
                                <button class="st-card-remove" onclick="removeFromWishlist('${product.id}')" title="Remove from wishlist" data-translate="remove">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <div class="st-card-body">
                                <a href="/item/?id=${product.id}" class="st-card-name">
                                    ${product.name || 'Unknown Product'}
                                </a>
                                ${product.brand ? `<div class="st-card-brand">${product.brand}</div>` : ''}
                                <div class="st-card-price">
                                    FCFA${currentPrice.toFixed(2)}
                                    ${discount > 0 && originalPrice > currentPrice ? `
                                        <span class="st-original-price">FCFA${originalPrice.toFixed(2)}</span>
                                    ` : ''}
                                </div>
                                ${rating > 0 ? `
                                    <div class="st-card-rating">
                                        <span class="st-stars">${starsHtml}</span>
                                        <span>(${reviewCount || 0})</span>
                                    </div>
                                ` : ''}
                                <div class="st-card-actions">
                                    <a href="/item/?id=${product.id}" class="st-btn-view" data-translate="view_details">
                                        <i class="fas fa-eye"></i>
                                    </a>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

            } catch (err) {
                console.error('❌ Error rendering wishlist:', err);
                grid.innerHTML = `
                    <div class="st-empty-wishlist">
                        <div class="st-empty-icon"><i class="fas fa-exclamation-circle"></i></div>
                        <h2 data-translate="error_title">Something went wrong</h2>
                        <p data-translate="error_sub">We couldn't load your wishlist. Please try again later.</p>
                        <button class="st-btn-shop" onclick="location.reload()" data-translate="retry">
                            <i class="fas fa-sync"></i> Retry
                        </button>
                    </div>
                `;
            }
        }

        // ============================================================
        // 6. WISHLIST OPERATIONS
        // ============================================================

        async function removeFromWishlist(productId) {
            const index = wishlistIds.indexOf(productId);
            if (index === -1) return;
            
            wishlistIds.splice(index, 1);
            wishlistItems = wishlistItems.filter(item => item.id !== productId);
            
            localStorage.setItem('st_wishlist', JSON.stringify(wishlistIds));
            
            const sessionId = localStorage.getItem('st_session_id') || 'session_' + Date.now();
            const client = getSupabaseClient();
            if (client) {
                await saveWishlistToDB(sessionId, wishlistIds);
            }
            
            if (window.STHeader && window.STHeader.updateCounts) {
                window.STHeader.AppState.wishlist = wishlistIds;
                window.STHeader.updateCounts();
            }
            
            await renderWishlist();
            showNotification('❤️ Removed from wishlist', 'info');
        }

        async function clearWishlist() {
            if (wishlistIds.length === 0) return;
            
            if (!confirm('Are you sure you want to clear your entire wishlist?')) return;
            
            wishlistIds = [];
            wishlistItems = [];
            
            localStorage.setItem('st_wishlist', JSON.stringify(wishlistIds));
            
            const sessionId = localStorage.getItem('st_session_id') || 'session_' + Date.now();
            const client = getSupabaseClient();
            if (client) {
                await saveWishlistToDB(sessionId, wishlistIds);
            }
            
            if (window.STHeader && window.STHeader.updateCounts) {
                window.STHeader.AppState.wishlist = wishlistIds;
                window.STHeader.updateCounts();
            }
            
            await renderWishlist();
            showNotification('🗑️ Wishlist cleared', 'info');
        }


        // ============================================================
        // 8. SUPABASE SYNC FUNCTIONS
        // ============================================================

        async function fetchWishlistFromDB(identifier, hasCustomerId = false) {
            const client = getSupabaseClient();
            if (!client) return [];
            const customerId = hasCustomerId ? identifier : null;
            const sessionId = hasCustomerId ? null : identifier;
            
            try {
                const query = client.from('wishlist').select('product_id');
                if (customerId) {
                    query.eq('customer_id', customerId);
                } else {
                    query.eq('session_id', sessionId);
                }
                const { data, error } = await query;
                
                if (error) throw error;
                return (data || []).map(row => row.product_id);
            } catch (err) {
                console.error('❌ Error fetching wishlist:', err.message);
                return [];
            }
        }

        async function saveWishlistToDB(identifier, wishlist, hasCustomerId = false) {
            const client = getSupabaseClient();
            if (!client) return;
            const customerId = hasCustomerId ? identifier : null;
            const sessionId = hasCustomerId ? null : identifier;
            
            try {
                if (customerId) {
                    await client.from('wishlist').delete().eq('customer_id', customerId);
                } else {
                    await client.from('wishlist').delete().eq('session_id', sessionId);
                }
                
                if (wishlist.length > 0) {
                    const rows = wishlist.map(pid => ({
                        ...(customerId ? { customer_id: customerId } : { session_id: sessionId }),
                        product_id: pid
                    }));
                    const { error } = await client.from('wishlist').insert(rows);
                    if (error) console.error('❌ Error saving wishlist:', error.message);
                }
            } catch (err) {
                console.error('❌ Error:', err.message);
            }
        }


        // ============================================================
        // 9. LOAD WISHLIST DATA
        // ============================================================

        async function loadWishlistData() {
            try {
                const sessionId = localStorage.getItem('st_session_id') || 'session_' + Date.now();
                
                const dbWishlist = await fetchWishlistFromDB(sessionId);
                if (dbWishlist && dbWishlist.length > 0) {
                    wishlistIds = dbWishlist;
                    localStorage.setItem('st_wishlist', JSON.stringify(dbWishlist));
                } else {
                    const localWishlist = JSON.parse(localStorage.getItem('st_wishlist') || '[]');
                    wishlistIds = localWishlist;
                }
                
                if (window.STHeader) {
                    window.STHeader.AppState.wishlist = wishlistIds;
                    if (window.STHeader.updateCounts) {
                        window.STHeader.updateCounts();
                    }
                }
                
                await renderWishlist();
            } catch (err) {
                console.warn('⚠️ Failed to load wishlist:', err.message);
                try {
                    wishlistIds = JSON.parse(localStorage.getItem('st_wishlist') || '[]');
                    await renderWishlist();
                } catch (e) {
                    wishlistIds = [];
                    await renderWishlist();
                }
            }
        }

        // ============================================================
        // 10. NOTIFICATION
        // ============================================================

        function showNotification(message, type = 'success') {
            const existing = document.querySelector('.st-notification');
            if (existing) existing.remove();
            
            const notif = document.createElement('div');
            notif.className = `st-notification ${type}`;
            notif.textContent = message;
            document.body.appendChild(notif);
            
            setTimeout(() => {
                notif.style.opacity = '0';
                notif.style.transform = 'translateX(-50%) translateY(-20px)';
                notif.style.transition = 'all 0.3s ease';
                setTimeout(() => notif.remove(), 300);
            }, 3000);
        }

        // ============================================================
        // 11. INJECT HEADER
        // ============================================================


        // ============================================================
        // 12. INITIALIZATION
        // ============================================================

        document.addEventListener('DOMContentLoaded', () => {
         
            loadWishlistData();
            
            document.getElementById('stClearWishlistBtn').addEventListener('click', clearWishlist);
            
            window.removeFromWishlist = removeFromWishlist;
            window.clearWishlist = clearWishlist;
            window.renderWishlist = renderWishlist;
            window.showNotification = showNotification;
            window.fetchProductDetails = fetchProductDetails;
            window.getSupabaseClient = getSupabaseClient;
            window.fetchWishlistFromDB = fetchWishlistFromDB;
            window.saveWishlistToDB = saveWishlistToDB;
          
           
        });

        console.log('✅ Wishlist Page Loaded');

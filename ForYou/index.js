

    // Helper translation function for dynamic content
    function t(key, fallback) {
        if (window.Translations && window.Translations.translate) {
            const result = window.Translations.translate(key);
            if (result && result !== key) return result;
        }
        return fallback || key;
    }

    let wishlist = [];
    let allProducts = [];
    let categories = [];
    let foryouProducts = [];
    let currentCategory = null; // null = all

    const categoryList = document.getElementById('categoryList');
    const categorySkeleton = document.getElementById('categorySkeleton');
    const recommendedGrid = document.getElementById('recommendedGrid');
    const recommendedSkeleton = document.getElementById('recommendedSkeleton');
    const foryouGrid = document.getElementById('foryouGrid');
    const foryouSkeleton = document.getElementById('foryouSkeleton');
    const categorySub = document.getElementById('categorySub');
    const productSectionTitle = document.getElementById('productSectionTitle');
    const viewallforsection = document.getElementById('viewallforsection');
    const categoryBadge = document.getElementById('categoryBadge');

    function showToast(message, type = 'success') {
      const existing = document.querySelector('.toast-msg');
      if (existing) existing.remove();
      const toast = document.createElement('div');
      toast.className = `toast-msg ${type}`;
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    function getCategoryIcon(category) {
      const icons = {
        'smartphone': 'fa-mobile-alt', 'phone': 'fa-mobile-alt', 'laptop': 'fa-laptop',
        'tablet': 'fa-tablet', 'audio': 'fa-headphones', 'accessories': 'fa-plug',
        'wearable': 'fa-clock', 'gaming': 'fa-gamepad', 'tv': 'fa-tv',
        'camera': 'fa-camera', 'printer': 'fa-print', 'storage': 'fa-hdd',
        'network': 'fa-wifi', 'power': 'fa-bolt', 'monitor': 'fa-desktop',
        'furniture': 'fa-couch', 'clothing': 'fa-tshirt', 'beauty': 'fa-spa',
        'jewelry': 'fa-gem', 'toys': 'fa-rocket', 'shoes': 'fa-shoe-prints',
        'health': 'fa-heartbeat', 'pet': 'fa-paw', 'home': 'fa-home',
        'kitchen': 'fa-utensils', 'office': 'fa-briefcase'
      };
      return icons[category?.toLowerCase()] || 'fa-folder';
    }

    function loadWishlist() {
      try { wishlist = JSON.parse(localStorage.getItem('st_wishlist') || '[]'); } catch (e) { wishlist = []; }
    }

    async function fetchAllData() {
      const client = getSupabaseClient();
      if (!client) return;
      try {
        const { data: products, error } = await client
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        allProducts = products || [];

        const catMap = new Map();
        allProducts.forEach(p => {
          if (p.category) {
            const key = p.category.toLowerCase();
            if (!catMap.has(key)) catMap.set(key, { name: p.category, count: 1 });
            else catMap.get(key).count++;
          }
        });
        categories = Array.from(catMap.values()).sort((a,b) => b.count - a.count).slice(0, 20);

        foryouProducts = allProducts.filter(p => p.isHot || p.isNew || (p.rating || 0) >= 4).slice(0, 6);
        if (foryouProducts.length < 6) {
          const random = allProducts.filter(p => !foryouProducts.includes(p)).sort(() => Math.random() - 0.5).slice(0, 6 - foryouProducts.length);
          foryouProducts = [...foryouProducts, ...random];
        }

        hideSkeletons();
        renderCategories(categories);
        renderForYou(foryouProducts);
        filterProducts(null);
      } catch (err) {
        console.error('❌ Fetch error:', err);
        showToast(t('load_error', 'Failed to load data'), 'error');
        hideSkeletons();
      }
    }

    function hideSkeletons() {
      if (categorySkeleton) categorySkeleton.style.display = 'none';
      if (recommendedSkeleton) recommendedSkeleton.style.display = 'none';
      if (foryouSkeleton) foryouSkeleton.style.display = 'none';
    }

    function renderCategories(cats) {
      if (!cats || cats.length === 0) {
        categoryList.innerHTML = `<div style="padding:12px;color:#94A3B8;" data-translate="no_categories">No categories</div>`;
        categoryBadge.textContent = '0';
        return;
      }
      categoryBadge.textContent = cats.length;
      const html = `
        <div class="category-chip-side ${!currentCategory ? 'active' : ''}" data-cat="all" onclick="selectCategory(null)">
          <div class="chip-icon"><i class="fas fa-th"></i></div>
          <span class="chip-label" data-translate="all">All</span>
          <span class="chip-count">${allProducts.length}</span>
        </div>
        ${cats.map(cat => `
          <div class="category-chip-side ${currentCategory === cat.name ? 'active' : ''}" data-cat="${cat.name}" onclick="selectCategory('${cat.name}')">
            <div class="chip-icon"><i class="fas ${getCategoryIcon(cat.name)}"></i></div>
            <span class="chip-label">${cat.name}</span>
            <span class="chip-count">${cat.count}</span>
          </div>
        `).join('')}
      `;
      categoryList.innerHTML = html;
    }

    window.selectCategory = function(categoryName) {
      currentCategory = categoryName;
      document.querySelectorAll('.category-chip-side').forEach(el => {
        const cat = el.dataset.cat;
        el.classList.toggle('active', (cat === 'all' && !categoryName) || cat === categoryName);
      });
      filterProducts(categoryName);
      closereccomedsection();
    };

    function filterProducts(categoryName) {
      let filtered = allProducts;
      let title = t('recommended', 'Recommended');
      let subText = t('all', 'All');
      if (categoryName) {
        filtered = allProducts.filter(p => p.category && p.category.toLowerCase() === categoryName.toLowerCase());
        title = categoryName;
        subText = categoryName;
      } else {
        filtered = allProducts.filter(p => p.isDeal || (p.rating || 0) >= 4.5 || p.discount > 0);
        if (filtered.length === 0) filtered = allProducts.slice(0, 8);
        title = t('recommended', 'Recommended');
        subText = t('all', 'All');
      }
      categorySub.innerHTML = `${t('showing_in', 'Showing products in')} <strong>${subText}</strong> (${filtered.length} ${t('items', 'items')})`;
      productSectionTitle.textContent = title;
      viewallforsection.href = `/category/?category=${categoryName || ''}`;
      renderRecommended(filtered);
    }

    function renderRecommended(products) {
      const grid = recommendedGrid;
      if (!products || products.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:#94A3B8;" data-translate="no_products">No products in this category</div>`;
        return;
      }
      grid.innerHTML = products.map(p => {
        const image = p.image || 'https://placehold.co/300x300/6C3CE1/FFFFFF?text=Product';
        const isWished = wishlist.includes(p.id);
        const rating = p.rating || 0;
        const sold = p.sold || Math.floor(Math.random() * 500) + 50;
        const isDeal = p.isDeal || p.discount > 0;
        return `
        <div class="recommended-card" onclick="window.navigateWithUserInfo('/item/?product=${p.id}')">
            <div class="card-image">
              <img src="${image}" alt="${p.name}" loading="lazy" onerror="this.src='https://placehold.co/300x300/6C3CE1/FFFFFF?text=Product'">
              ${isDeal ? `<span class="card-badge" data-translate="deal">🔥 Deal</span>` : ''}
              <span class="card-sold" data-translate="sold">${sold} sold</span>
              ${rating > 0 ? `<span class="card-rating-float"><i class="fas fa-star" style="color:#F59E0B;"></i> ${rating.toFixed(1)}</span>` : ''}
            </div>
            <div class="card-body">
              <div class="card-name">${p.name || 'Unknown Product'}</div>
              <div class="card-meta">${p.brand ? `<span>${p.brand}</span>` : ''}${p.brand ? `<span class="dot"></span>` : ''}<span>${sold} ${t('sold', 'sold')}</span></div>
              <div class="card-price">FCFA ${(p.price || 0).toFixed(2)}${isDeal && p.originalPrice ? `<span class="original">FCFA ${(p.originalPrice || 0).toFixed(2)}</span>` : ''}</div>
              <div class="card-actions">
                <button class="btn-wish ${isWished ? 'active' : ''}" onclick="event.stopPropagation(); toggleWishlist('${p.id}')"><i class="fas fa-heart"></i></button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
function closereccomedsection() {
      const recommendedSection = document.getElementById('foryouGrid');
      if (recommendedSection) {
        recommendedSection.style.display = 'none';
      }
    }
  

    function renderForYou(products) {
      const grid = foryouGrid;
      if (!products || products.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;color:#94A3B8;" data-translate="no_recommendations">No recommendations</div>`;
        return;
      }

      grid.innerHTML = products.map(p => {
        const image = p.image || 'https://placehold.co/80x80/6C3CE1/FFFFFF?text=Product';
        const isWished = wishlist.includes(p.id);
        const rating = p.rating || 0;
        const sold = p.sold || Math.floor(Math.random() * 500) + 50;
        const isDeal = p.isDeal || p.discount > 0;
        let tag = '';
        if (p.isHot) tag = t('hot', 'Hot');
        else if (p.isNew) tag = t('new', 'New');
        else if (isDeal) tag = t('deal', 'Deal');
        return `
        <div class="foryou-card" onclick="window.navigateWithUserInfo('/item/?product=${p.id}')">
            <div class="foryou-image"><img src="${image}" alt="${p.name}" loading="lazy" onerror="this.src='https://placehold.co/80x80/6C3CE1/FFFFFF?text=Product'"></div>
            <div class="foryou-info">
              <div class="foryou-name">${p.name || 'Unknown'}</div>
              <div class="foryou-meta">${p.brand ? `<span>${p.brand}</span>` : ''}${tag ? `<span class="tag">${tag}</span>` : ''}</div>
              <div class="foryou-price">FCFA ${(p.price || 0).toFixed(2)}${isDeal && p.originalPrice ? `<span class="original">FCFA ${(p.originalPrice || 0).toFixed(2)}</span>` : ''}</div>
              <div class="foryou-stats">${rating > 0 ? `<span class="rating"><i class="fas fa-star" style="color:#F59E0B;"></i> ${rating.toFixed(1)}</span>` : ''}<span>${sold} ${t('sold', 'sold')}</span></div>
            </div>
            <div class="foryou-actions">
              <button class="btn-wish-small ${isWished ? 'active' : ''}" onclick="event.stopPropagation(); toggleWishlist('${p.id}')"><i class="fas fa-heart"></i></button>
            </div>
          </div>
        `;
      }).join('');
      

    }


    async function toggleWishlist(productId) {
      try {
        const index = wishlist.indexOf(productId);
        if (index !== -1) { wishlist.splice(index, 1); showToast('❤️ ' + t('removed_wishlist', 'Removed from wishlist'), 'info'); } else { wishlist.push(productId); showToast('❤️ ' + t('added_wishlist', 'Added to wishlist!')); }
        localStorage.setItem('st_wishlist', JSON.stringify(wishlist));
        if (window.STHeader) { window.STHeader.AppState.wishlist = wishlist; if (window.STHeader.updateCounts) window.STHeader.updateCounts(); }
        filterProducts(currentCategory);
        renderForYou(foryouProducts);
        renderCategories(categories);
      } catch (err) { console.error(err); showToast('❌ ' + t('failed', 'Failed'), 'error'); }
    }

    window.toggleWishlist = toggleWishlist;

document.getElementById('categoryList').addEventListener('click', function(e) {
    // Find if the click was on a category chip or its child
    const chip = e.target.closest('.category-chip-side');
    if (!chip) return;
    
    // Get the category from data attribute
    const category = chip.dataset.cat || null;
    
    // Only trigger scroll if it's a category chip (not skeleton)
    if (chip.classList.contains('skeleton-chip-side')) return;
    
    const targetGrid = document.querySelector('#recommendedGrid');
    if (!targetGrid) return;

    const offset = 100;
    const targetPosition = targetGrid.getBoundingClientRect().top + window.pageYOffset - offset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const duration = 400;
    let start = null;

    function animation(currentTime) {
        if (start === null) start = currentTime;
        const timeElapsed = currentTime - start;
        const run = ease(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) requestAnimationFrame(animation);
    }

    function ease(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t * t + b;
        t -= 2;
        return c / 2 * (t * t * t + 2) + b;
    }

    // Add visual blink
    chip.style.transition = 'transform 0.1s, background 0.1s';
    chip.style.transform = 'scale(0.95)';
    chip.style.background = 'rgba(108, 60, 225, 0.2)';
    setTimeout(() => {
        chip.style.transform = 'scale(1)';
        chip.style.background = '';
    }, 150);

    requestAnimationFrame(animation);
});
    document.addEventListener('DOMContentLoaded', function() {
      loadWishlist();
      fetchAllData();
      console.log('📄 Categories page with sticky sidebar & 8/2 cols ready');
    });

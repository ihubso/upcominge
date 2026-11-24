import { next } from '@vercel/functions';

export const config = {
  runtime: 'nodejs',
  // Added /category/ to the matcher
  matcher: ['/item', '/item/:path*', '/category', '/category/:path*'],
};

const SUPABASE_URL = 'https://bulprhgwuwatzobiojwz.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bHByaGd3dXdhdHpvYmlvand6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDczNDksImV4cCI6MjA5MjA4MzM0OX0.2fcHrGX7iXw5G9nGRNkBy70W1Ex_om1C0v3qbryPmvw';

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]!);
}

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';
  const isBot = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit/i.test(userAgent);

  // ==========================================
  // 1. HANDLE PRODUCT PAGES (/item/)
  // ==========================================
  if (url.pathname.startsWith('/item') && isBot) {
    const productId = url.searchParams.get('product');
    if (!productId) return next();

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_product_details_and_increment_views`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_product_id: productId }),
        cache: 'no-store',
      });

      if (!response.ok) return next();
      const data = await response.json();
      const product = Array.isArray(data) ? data[0] : data;
      if (!product) return next();

      const rawName = String(product.name || 'Product');
      const rawDescription = [product.description, product.specs].filter(Boolean).join(' ');
      const rawBrand = String(product.brand || 'Success Technology');
      const rawImage = String(product.image || 'https://www.suctech.store/images/logo.png');
      const price = Number(product.price) || 0;
      const stock = Number(product.stock) || 0;
      const canonicalUrl = `https://www.suctech.store/item/?product=${encodeURIComponent(productId)}`;

      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: rawName,
        description: rawDescription,
        image: [rawImage],
        sku: productId,
        brand: { '@type': 'Brand', name: rawBrand },
        offers: {
          '@type': 'Offer',
          url: canonicalUrl,
          priceCurrency: 'XOF',
          price: price.toFixed(2),
          availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
        },
      };

      const safeJsonLd = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(rawName)} | Success Technology</title>
<meta name="description" content="${escapeHtml(rawDescription)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${escapeHtml(canonicalUrl)}">
<meta property="og:type" content="product">
<meta property="og:title" content="${escapeHtml(rawName)}">
<meta property="og:description" content="${escapeHtml(rawDescription)}">
<meta property="og:image" content="${escapeHtml(rawImage)}">
<meta property="og:url" content="${escapeHtml(canonicalUrl)}">
<script type="application/ld+json">${safeJsonLd}</script>
</head>
<body>
<h1>${escapeHtml(rawName)}</h1>
<img src="${escapeHtml(rawImage)}" alt="${escapeHtml(rawName)}" style="max-width:100%">
<h2>${price.toLocaleString('fr-FR')} FCFA</h2>
<p>Marque : ${escapeHtml(rawBrand)}</p>
<p>Stock : ${stock > 0 ? 'En stock' : 'Rupture de stock'}</p>
<p>${escapeHtml(rawDescription)}</p>
</body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, max-age=0', 'X-SEO-Middleware': 'SUCCESS' },
      });
    } catch (error) {
      console.error('[SEO Product Middleware Error]', error);
      return next();
    }
  }

  // ==========================================
  // 2. HANDLE CATEGORY PAGES (/category/)
  // ==========================================
  if (url.pathname.startsWith('/category') && isBot) {
    const categorySlug = url.searchParams.get('category') || 'all';

    try {
      // Fetch products for this category from Supabase
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_category_products`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_category: categorySlug, p_limit: 50, p_offset: 0 }),
        cache: 'no-store',
      });

      let products = [];
      if (response.ok) {
        const data = await response.json();
        products = Array.isArray(data) ? data : [];
      }

      // Format category name for display
      const displayCategory = categorySlug === 'all' 
        ? 'Tous les produits' 
        : categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      const title = `${displayCategory} | Success Technology`;
      const description = `Découvrez notre sélection de produits ${displayCategory} chez Success Technology à Abidjan. Livraison rapide.`;
      const canonicalUrl = categorySlug === 'all' 
        ? 'https://www.suctech.store/category/' 
        : `https://www.suctech.store/category/?category=${encodeURIComponent(categorySlug)}`;

      // Build crawlable HTML links for Googlebot
      let productLinksHtml = '<ul>';
      if (products.length > 0) {
        products.forEach((p: any) => {
          const pName = p.name || 'Produit';
          const pPrice = Number(p.price) || 0;
          productLinksHtml += `<li><a href="https://www.suctech.store/item/?product=${p.id}">${escapeHtml(pName)}</a> - ${pPrice.toLocaleString('fr-FR')} FCFA</li>`;
        });
      } else {
        productLinksHtml += '<li>Aucun produit disponible dans cette catégorie pour le moment.</li>';
      }
      productLinksHtml += '</ul>';

      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${escapeHtml(canonicalUrl)}">
</head>
<body>
<h1>${escapeHtml(displayCategory)}</h1>
<p>${escapeHtml(description)}</p>
<h2>Produits dans cette catégorie</h2>
${productLinksHtml}
</body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, max-age=0', 'X-SEO-Middleware': 'SUCCESS' },
      });

    } catch (error) {
      console.error('[SEO Category Middleware Error]', error);
      return next();
    }
  }

  // ==========================================
  // 3. HANDLE HUMANS (Bypass Middleware)
  // ==========================================
  return next();
}
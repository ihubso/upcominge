export const config = {
  matcher: '/item/:path*',
};

const SUPABASE_URL = 'https://bulprhgwuwatzobiojwz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bHByaGd3dXdhdHpvYmlvand6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDczNDksImV4cCI6MjA5MjA4MzM0OX0.2fcHrGX7iXw5G9nGRNkBy70W1Ex_om1C0v3qbryPmvw';


export async function middleware(request: Request) {
  const url = new URL(request.url);
  const productId = url.searchParams.get('product');
  const userAgent = request.headers.get('user-agent') || '';

  const isBot = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit/i.test(userAgent);

  if (productId && isBot) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_product_details_and_increment_views`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_product_id: productId }),
      });

      const data = await res.json();
      const product = data?.[0];

      if (product) {
        const name = product.name || 'Product';
        const price = Number(product.price) || 0;
        const brand = product.brand || 'Success Technology';
        const image = product.image || 'https://www.suctech.store/images/logo.png';
        const canonicalUrl = `https://www.suctech.store/item/?product=${productId}`;
        const stock = Number(product.stock) || 0;
        const description = product.description && product.specs ? `${product.description}\n\n${product.specs}` : product.description || '';

        const jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name,
          description,
          image: [image],
          sku: productId,
          brand: { '@type': 'Brand', name: brand },
          offers: {
            '@type': 'Offer',
            url: canonicalUrl,
            priceCurrency: 'XOF',
            price: price.toFixed(2),
            availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            itemCondition: 'https://schema.org/NewCondition',
          },
        };

        const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>${name} | Success Technology</title>
  <meta name="description" content="${description.replace(/"/g, '&quot;')}" />
  <link rel="canonical" href="${canonicalUrl}" />
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <h1>${name}</h1>
  <img src="${image}" alt="${name}" />
  <p>${price.toLocaleString('fr-FR')} CFA</p>
  <p>${brand}</p>
  <p>${stock > 0 ? 'En Stock' : 'Rupture de stock'}</p>
  <div>${description}</div>
  <a href="${canonicalUrl}">Voir la page complète</a>
</body>
</html>`;

        return new Response(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
    } catch (err) {
      console.error('Middleware Error:', err);
    }
  }

  // Humans get the normal page (bypass Middleware)
  return new Response(null, { headers: { 'x-middleware-next': '1' } });
}
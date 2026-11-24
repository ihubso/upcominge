export const config = {
  matcher: '/item/', // Matches /item/ with any query parameters
};

const SUPABASE_URL = 'https://bulprhgwuwatzobiojwz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bHByaGd3dXdhdHpvYmlvand6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDczNDksImV4cCI6MjA5MjA4MzM0OX0.2fcHrGX7iXw5G9nGRNkBy70W1Ex_om1C0v3qbryPmvw';

export async function middleware(request: Request) {
  const url = new URL(request.url);
  const productId = url.searchParams.get('product');
  const userAgent = request.headers.get('user-agent') || '';

  // Check for Googlebot
  const isBot = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit/i.test(userAgent);

  if (productId && isBot) {
    try {
      // Fetch from Supabase
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_product_details_and_increment_views`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_product_id: productId })
      });

      const data = await res.json();
      const product = data && data.length > 0 ? data[0] : null;

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
          name: name,
          description: description,
          image: [image],
          sku: productId,
          brand: { '@type': 'Brand', name: brand },
          offers: {
            '@type': 'Offer',
            url: canonicalUrl,
            priceCurrency: 'XOF',
            price: price.toFixed(2),
            availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            itemCondition: 'https://schema.org/NewCondition'
          }
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
<body style="font-family: sans-serif; padding: 20px;">
    <h1>${name}</h1>
    <img src="${image}" alt="${name}" style="max-width: 100%;" />
    <h2>${price.toLocaleString('fr-FR')} CFA</h2>
    <p>Marque: ${brand}</p>
    <p>Stock: ${stock > 0 ? 'En Stock' : 'Rupture'}</p>
    <p>${description}</p>
</body>
</html>`;

        return new Response(html, {
          status: 200,
          headers: { 
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store, max-age=0' // CRITICAL: Stop Vercel from caching the bot page
          },
        });
      }
    } catch (err) {
      console.error('Middleware Error:', err);
    }
  }

  // Humans: Tell Vercel to continue to the static file
  return new Response(null, { headers: { 'x-middleware-next': '1' } });
}
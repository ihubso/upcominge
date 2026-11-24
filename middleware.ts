import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: '/item/:path*',
};

// Your Supabase credentials
const SUPABASE_URL = 'https://bulprhgwuwatzobiojwz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bHByaGd3dXdhdHpvYmlvand6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDczNDksImV4cCI6MjA5MjA4MzM0OX0.2fcHrGX7iXw5G9nGRNkBy70W1Ex_om1C0v3qbryPmvw';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const productId = url.searchParams.get('product');
  const userAgent = request.headers.get('user-agent') || '';

  // 1. Is it a bot?
  const isBot = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit/i.test(userAgent);

  // 2. If bot + product ID, serve the SEO page
  if (productId && isBot) {
    try {
      // Fetch from your exact RPC
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
      
      // RPC returns an array, we want the first item
      const product = data && data.length > 0 ? data[0] : null;

      if (!product) {
        return NextResponse.next(); // Let it 404 naturally
      }

      // 3. Format the data for SEO
      const name = product.name || 'Product';
      const price = Number(product.price) || 0;
      const brand = product.brand || 'Success Technology';
      const image = product.image || 'https://www.suctech.store/images/logo.png';
      const canonicalUrl = `https://www.suctech.store/item/?product=${productId}`;
      
      // Handle CFA to XOF conversion for Schema.org
      const currency = 'XOF'; 
      const stock = Number(product.stock) || 0;
      const description = product.description && product.specs ? `${product.description}\n\n${product.specs}` : product.description || '';

      // 4. Build the JSON-LD Structured Data
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
          priceCurrency: currency,
          price: price.toFixed(2),
          availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition'
        }
      };

      // 5. Build the HTML for the bot
      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name} | Success Technology</title>
    <meta name="description" content="${description.replace(/"/g, '&quot;')}" />
    <link rel="canonical" href="${canonicalUrl}" />
    
    <script type="application/ld+json">
      ${JSON.stringify(jsonLd)}
    </script>
</head>
<body style="font-family: sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
    <h1>${name}</h1>
    <img src="${image}" alt="${name}" style="max-width: 100%; height: auto;" />
    <h2 style="color: #e60012;">${price.toLocaleString('fr-FR')} CFA</h2>
    <p><strong>Marque :</strong> ${brand}</p>
    <p><strong>Disponibilité :</strong> ${stock > 0 ? 'En Stock' : 'Rupture de stock'}</p>
    <div>
        <h3>Description</h3>
        <p style="white-space: pre-wrap;">${description}</p>
    </div>
    <hr />
    <p><a href="${canonicalUrl}">Cliquez ici pour voir la page complète</a></p>
</body>
</html>`;

      // 6. Return the HTML to Googlebot
      return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });

    } catch (err) {
      console.error('Middleware Error:', err);
      return NextResponse.next();
    }
  }

  // 7. Humans get the normal page
  return NextResponse.next();
}

import { next } from '@vercel/functions';

export const config = {
  runtime: 'nodejs',
  matcher: ['/item', '/item/:path*'],
};

const SUPABASE_URL =
  'https://bulprhgwuwatzobiojwz.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || '';

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
  const productId = url.searchParams.get('product');
  const userAgent = request.headers.get('user-agent') || '';

  const isBot =
    /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit/i
      .test(userAgent);

  if (!productId || !isBot) {
    return next();
  }

  if (!SUPABASE_ANON_KEY) {
    console.error('[SEO] Missing SUPABASE_ANON_KEY');
    return next();
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_product_details_and_increment_views`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_product_id: productId,
        }),
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      console.error(
        '[SEO] Supabase error:',
        response.status,
        await response.text()
      );
      return next();
    }

    const data = await response.json();

    const product = Array.isArray(data) ? data[0] : data;

    if (!product) {
      console.log('[SEO] Product not found:', productId);
      return next();
    }

    const rawName = String(product.name || 'Product');
    const rawDescription = [
      product.description,
      product.specs,
    ].filter(Boolean).join(' ');

    const rawBrand = String(
      product.brand || 'Success Technology'
    );

    const rawImage = String(
      product.image ||
      'https://www.suctech.store/images/logo.png'
    );

    const price = Number(product.price) || 0;
    const stock = Number(product.stock) || 0;

    const canonicalUrl =
      `https://www.suctech.store/item/?product=${encodeURIComponent(productId)}`;

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: rawName,
      description: rawDescription,
      image: [rawImage],
      sku: productId,
      brand: {
        '@type': 'Brand',
        name: rawBrand,
      },
      offers: {
        '@type': 'Offer',
        url: canonicalUrl,
        priceCurrency: 'XOF',
        price: price.toFixed(2),
        availability: stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
      },
    };

    const safeJsonLd = JSON.stringify(jsonLd)
      .replace(/</g, '\\u003c');

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

<img
  src="${escapeHtml(rawImage)}"
  alt="${escapeHtml(rawName)}"
  style="max-width:100%"
>

<h2>${price.toLocaleString('fr-FR')} FCFA</h2>

<p>Marque : ${escapeHtml(rawBrand)}</p>

<p>Stock : ${stock > 0 ? 'En stock' : 'Rupture de stock'}</p>

<p>${escapeHtml(rawDescription)}</p>

</body>
</html>`;

    console.log('[SEO] Product HTML generated:', productId);

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
        'X-SEO-Middleware': 'SUCCESS',
      },
    });

  } catch (error) {
    console.error('[SEO Middleware Error]', error);
    return next();
  }
}

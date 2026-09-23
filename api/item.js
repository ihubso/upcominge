// api/item.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { product } = req.query;

  if (!product) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Product ID Required · Sucess Technology</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background: #090d16; color: #f8fafc;
              display: flex; align-items: center; justify-content: center;
              min-height: 100vh; padding: 20px;
            }
            .card {
              background: rgba(30, 41, 59, 0.7);
              backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
              border: 1px solid rgba(255, 255, 255, 0.08);
              padding: 40px 30px; border-radius: 24px; text-align: center;
              max-width: 440px; width: 100%;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            }
            h1 { font-size: 22px; margin-bottom: 12px; color: #fff; font-weight: 700; }
            p { color: #94a3b8; font-size: 15px; line-height: 1.5; }
            code { background: rgba(15, 23, 42, 0.6); padding: 4px 8px; border-radius: 6px; color: #f43f5e; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>❌ Product ID Required</h1>
            <p>Please provide a product ID in the link, e.g., <code>?product=YOUR_ID</code></p>
          </div>
        </body>
      </html>
    `);
  }

  try {

    const { data: productRows, error } = await supabase
      .rpc('get_product_by_id', { p_id: product });

    if (error || !productRows || productRows.length === 0) {
      console.error('Product fetch error:', error);
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Product Not Found · Sucess Technology</title>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background: #090d16; color: #f8fafc;
                display: flex; align-items: center; justify-content: center;
                min-height: 100vh; padding: 20px;
              }
              .card {
                background: rgba(30, 41, 59, 0.7);
                backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
                border: 1px solid rgba(255, 255, 255, 0.08);
                padding: 40px 30px; border-radius: 24px; text-align: center;
                max-width: 440px; width: 100%;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
              }
              h1 { font-size: 22px; margin-bottom: 12px; color: #fff; font-weight: 700; }
              p { color: #94a3b8; font-size: 15px; margin-bottom: 24px; line-height: 1.5; }
              a { display: inline-block; background: #e60012; color: #fff; padding: 12px 24px; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 14px; transition: background 0.2s; }
              a:hover { background: #cc0010; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>🔍 Product Not Found</h1>
              <p>We couldn't find the product you're looking for or it may have been removed.</p>
              <a href="/">← Back to Store</a>
            </div>
          </body>
        </html>
      `);
    }

    const productData = productRows[0];

    // ✅ SECURE: Fetch active deals via RPC, then find this product's deal
    let dealDiscount = 0;
    try {
      const { data: deals } = await supabase.rpc('get_active_deals');
      const match = (deals || []).find(d => d.id === product);
      if (match) dealDiscount = Number(match.deal_discount) || 0;
    } catch (e) {
      // No deal found — non-fatal
    }

    // ---------- PRICE CALCULATION ----------
    const price = parseFloat(productData.price) || 0;
    const hasDeal = dealDiscount > 0;
    const discountedPrice = hasDeal ? price * (1 - dealDiscount / 100) : price;

    const currency = productData.currency || 'FCFA';
    const stock = Number(productData.stock) || 0;
    const stockStatus = stock > 0 ? 'In Stock' : 'Out of Stock';

    // Format price nicely
    const formatPrice = (n) =>
      `${currency} ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const priceText        = formatPrice(price);
    const discountedText   = formatPrice(discountedPrice);
    const displayPriceText = hasDeal
      ? `${discountedText} (was ${priceText}, -${dealDiscount}%)`
      : priceText;

    const escapeHtml = (str) => {
      if (str === null || str === undefined || str === '') return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };

    const productName        = escapeHtml(productData.name || 'Product');
    const productBrand       = escapeHtml(productData.brand || '');
    const productCategory    = escapeHtml(productData.category || '');
    const imageUrl           = productData.image || 'https://placehold.co/600x400/0f172a/ffffff?text=No+Image';

    // ✅ PRICE FIRST so social platforms never truncate it away
    const shortDescription   = `${displayPriceText} • ${stockStatus}${productBrand ? ' • ' + productBrand : ''}`;
    const fullDescription    = `${displayPriceText}. ${escapeHtml(productData.description || '').slice(0, 160)}`;

    // For OG description: price-first, brand second, then trimmed original description
    const productDescription = escapeHtml(shortDescription);

    // Build absolute URL
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host     = req.headers.host || 'upcominge.vercel.app';
    const baseUrl  = `${protocol}://${host}`;
    const canonicalUrl = `${baseUrl}/api/item?product=${encodeURIComponent(product)}`;
    const redirectUrl  = `/item/?product=${encodeURIComponent(product)}`;

    // ============================================
    // BOT / CRAWLER
    // ============================================
    const userAgent = req.headers['user-agent'] || '';
    const isBot = /facebook|twitter|whatsapp|telegram|linkedin|slack|discord|pinterest|reddit|instagram|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|facebot|twitterbot/i.test(userAgent);

    if (isBot) {
      const botHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${productName} · ${discountedText} · Sucess Technology</title>

    <!-- ===== OPEN GRAPH ===== -->
    <meta property="og:type" content="product" />
    <meta property="og:title" content="${productName} — ${discountedText}" />
    <meta property="og:description" content="${productDescription}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:alt" content="${productName}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:site_name" content="Sucess Technology" />
    <meta property="og:price:amount" content="${discountedPrice.toFixed(2)}" />
    <meta property="og:price:currency" content="${currency}" />
    ${hasDeal ? `<meta property="og:availability" content="limited_availability" />` : `<meta property="og:availability" content="${stock > 0 ? 'in stock' : 'out of stock'}" />`}
    <meta property="product:brand" content="${productBrand || 'Sucess Technology'}" />
    <meta property="product:category" content="${productCategory || 'Electronics'}" />
    <meta property="product:price:amount" content="${discountedPrice.toFixed(2)}" />
    <meta property="product:price:currency" content="${currency}" />

    <!-- ===== TWITTER CARD ===== -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${productName} — ${discountedText}" />
    <meta name="twitter:description" content="${productDescription}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <meta name="twitter:site" content="@SucessTech" />
    <meta name="twitter:label1" content="Price" />
    <meta name="twitter:data1" content="${discountedText}" />
    ${hasDeal ? `<meta name="twitter:label2" content="Discount" /><meta name="twitter:data2" content="-${dealDiscount}%" />` : ''}

    <!-- ===== STANDARD ===== -->
    <meta name="description" content="${productDescription}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${canonicalUrl}" />
    <link rel="icon" type="image/png" href="/favicon.png" />

    <meta http-equiv="refresh" content="0; url=${redirectUrl}" />

    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        background: #090d16; color: #f8fafc;
        display: flex; align-items: center; justify-content: center;
        min-height: 100vh; padding: 24px;
      }
      .preview-card {
        background: rgba(30, 41, 59, 0.7);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        padding: 24px;
        border-radius: 20px;
        max-width: 480px;
        width: 100%;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        display: flex; gap: 16px; align-items: center;
      }
      .preview-card img {
        width: 100px; height: 100px; border-radius: 14px;
        object-fit: cover; background: #1e293b; flex-shrink: 0;
      }
      .preview-info { flex: 1; min-width: 0; }
      .preview-name {
        font-size: 16px; font-weight: 700; color: #fff;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        overflow: hidden; line-height: 1.3; margin-bottom: 6px;
      }
      .preview-brand { font-size: 12px; color: #94a3b8; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
      .preview-price-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .preview-price { font-size: 22px; font-weight: 800; color: #10b981; }
      .preview-old-price { font-size: 14px; color: #64748b; text-decoration: line-through; }
      .preview-badge {
        background: #ef4444; color: #fff; font-size: 11px; font-weight: 700;
        padding: 3px 8px; border-radius: 20px; text-transform: uppercase;
      }
      .preview-stock { font-size: 12px; color: #94a3b8; margin-top: 6px; }
      .redirecting { text-align: center; color: #64748b; font-size: 13px; margin-top: 16px; }
    </style>
</head>
<body>
    <div>
      <div class="preview-card">
        <img src="${imageUrl}" alt="${productName}" onerror="this.src='https://placehold.co/100x100/0f172a/ffffff?text=No+Image'">
        <div class="preview-info">
          <div class="preview-name">${productName}</div>
          ${productBrand ? `<div class="preview-brand">${productBrand}</div>` : ''}
          <div class="preview-price-row">
            <span class="preview-price">${discountedText}</span>
            ${hasDeal ? `<span class="preview-old-price">${priceText}</span><span class="preview-badge">-${dealDiscount}%</span>` : ''}
          </div>
          <div class="preview-stock">${stockStatus}</div>
        </div>
      </div>
      <p class="redirecting">Redirecting to product page...</p>
    </div>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
      return res.status(200).send(botHtml);
    }

    // ============================================
    // HUMAN → redirect
    // ============================================
    res.setHeader('Location', redirectUrl);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(302).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${productName} — ${discountedText} · Sucess Technology</title>
          <meta http-equiv="refresh" content="0; url=${redirectUrl}">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background: #090d16; color: #f8fafc;
              display: flex; align-items: center; justify-content: center;
              min-height: 100vh; padding: 24px;
            }
            .card {
              background: rgba(30, 41, 59, 0.7);
              backdrop-filter: blur(16px);
              -webkit-backdrop-filter: blur(16px);
              border: 1px solid rgba(255, 255, 255, 0.08);
              padding: 24px;
              border-radius: 20px;
              max-width: 480px;
              width: 100%;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            }
            .card-inner { display: flex; gap: 16px; align-items: center; }
            .card img {
              width: 100px; height: 100px; border-radius: 14px;
              object-fit: cover; background: #1e293b; flex-shrink: 0;
            }
            .info { flex: 1; min-width: 0; }
            .name {
              font-size: 16px; font-weight: 700; color: #fff;
              display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
              overflow: hidden; line-height: 1.3; margin-bottom: 6px;
            }
            .brand { font-size: 12px; color: #94a3b8; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
            .price-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
            .price { font-size: 22px; font-weight: 800; color: #10b981; }
            .old-price { font-size: 14px; color: #64748b; text-decoration: line-through; }
            .badge {
              background: #ef4444; color: #fff; font-size: 11px; font-weight: 700;
              padding: 3px 8px; border-radius: 20px; text-transform: uppercase;
            }
            .stock { font-size: 12px; color: #94a3b8; margin-top: 6px; }
            .spinner-wrap {
              margin-top: 20px;
              display: flex; flex-direction: column; align-items: center; gap: 10px;
              padding-top: 20px;
              border-top: 1px solid rgba(148, 163, 184, 0.15);
            }
            .spinner {
              width: 32px; height: 32px;
              border: 3px solid rgba(255,255,255,0.1);
              border-top: 3px solid #e60012;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            .redirect-text { color: #94a3b8; font-size: 13px; }
            .redirect-text a { color: #e60012; text-decoration: none; font-weight: 600; }
            .redirect-text a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="card-inner">
              <img src="${imageUrl}" alt="${productName}" onerror="this.src='https://placehold.co/100x100/0f172a/ffffff?text=No+Image'">
              <div class="info">
                <div class="name">${productName}</div>
                ${productBrand ? `<div class="brand">${productBrand}</div>` : ''}
                <div class="price-row">
                  <span class="price">${discountedText}</span>
                  ${hasDeal ? `<span class="old-price">${priceText}</span><span class="badge">-${dealDiscount}%</span>` : ''}
                </div>
                <div class="stock">${stockStatus}</div>
              </div>
            </div>
            <div class="spinner-wrap">
              <div class="spinner"></div>
              <div class="redirect-text">Redirecting… <a href="${redirectUrl}">Click here if not redirected</a></div>
            </div>
          </div>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error · Sucess Technology</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background: #090d16; color: #f8fafc;
              display: flex; align-items: center; justify-content: center;
              min-height: 100vh; padding: 20px;
            }
            .card {
              background: rgba(30, 41, 59, 0.7);
              backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
              border: 1px solid rgba(255, 255, 255, 0.08);
              padding: 40px 30px; border-radius: 24px; text-align: center;
              max-width: 440px; width: 100%;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            }
            h1 { font-size: 22px; margin-bottom: 12px; color: #fff; font-weight: 700; }
            p { color: #94a3b8; font-size: 15px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>⚠️ Something went wrong</h1>
            <p>Please try again later or contact support if the issue persists.</p>
          </div>
        </body>
      </html>
    `);
  }
};
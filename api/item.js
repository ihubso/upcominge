// api/item.js
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Get product ID from query params
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
              background: #090d16;
              color: #f8fafc;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
            }
            .card {
              background: rgba(30, 41, 59, 0.7);
              backdrop-filter: blur(16px);
              -webkit-backdrop-filter: blur(16px);
              border: 1px solid rgba(255, 255, 255, 0.08);
              padding: 40px 30px;
              border-radius: 24px;
              text-align: center;
              max-width: 440px;
              width: 100%;
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
    // Fetch product from Supabase
    const { data: productData, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', product)
      .single();

    if (error || !productData) {
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
                background: #090d16;
                color: #f8fafc;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 20px;
              }
              .card {
                background: rgba(30, 41, 59, 0.7);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border: 1px solid rgba(255, 255, 255, 0.08);
                padding: 40px 30px;
                border-radius: 24px;
                text-align: center;
                max-width: 440px;
                width: 100%;
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

    // Check for deal
    let dealDiscount = 0;
    try {
      const { data: deal } = await supabase
        .from('deals')
        .select('discount')
        .eq('product_id', product)
        .single();
      if (deal) dealDiscount = deal.discount;
    } catch (e) {
      // No deal found
    }

    // Prepare product data
    const price = parseFloat(productData.price) || 0;
    const discountedPrice = dealDiscount > 0 ? price * (1 - dealDiscount / 100) : price;
    const imageUrl = productData.image || 'https://placehold.co/600x400/0f172a/ffffff?text=No+Image';
    const currency = productData.currency || 'FCFA';
    const stockStatus = productData.stock > 0 ? 'In Stock' : 'Out of Stock';

    // Escape HTML
    const escapeHtml = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };

    const productName = escapeHtml(productData.name || 'Product');
    const productDescription = escapeHtml(productData.description || `${currency} ${price.toFixed(2)} • ${stockStatus}`);
    const productBrand = escapeHtml(productData.brand || '');
    const productCategory = escapeHtml(productData.category || '');

    // ============================================
    // DETECT IF SOCIAL MEDIA BOT / CRAWLER
    // ============================================
    const userAgent = req.headers['user-agent'] || '';
    const isBot = /facebook|twitter|whatsapp|telegram|linkedin|slack|discord|pinterest|reddit|instagram|googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|facebot|twitterbot/i.test(userAgent);

    // ============================================
    // IF BOT: Return rich HTML with OG tags
    // ============================================
    if (isBot) {
      const botHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${productName} · Sucess Technology</title>
    
    <!-- ===== OPEN GRAPH META TAGS ===== -->
    <meta property="og:type" content="product" />
    <meta property="og:title" content="${productName}" />
    <meta property="og:description" content="${productDescription}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="https://upcominge.vercel.app/item?product=${product}" />
    <meta property="og:site_name" content="Sucess Technology" />
    <meta property="og:price:amount" content="${discountedPrice.toFixed(2)}" />
    <meta property="og:price:currency" content="${currency}" />
    ${dealDiscount > 0 ? `<meta property="og:availability" content="limited_availability" />` : ''}
    <meta property="product:brand" content="${productBrand || 'Sucess Technology'}" />
    <meta property="product:category" content="${productCategory || 'Electronics'}" />
    
    <!-- ===== TWITTER CARD ===== -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${productName}" />
    <meta name="twitter:description" content="${productDescription}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <meta name="twitter:site" content="@SucessTech" />
    
    <!-- ===== STANDARD META ===== -->
    <meta name="description" content="${productDescription}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://upcominge.vercel.app/item?product=${product}" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    
    <!-- Redirect to full page after 0.1s (for social preview) -->
    <meta http-equiv="refresh" content="0; url=/item/?product=${product}" />
</head>
<body>
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#090d16;color:#fff;font-family:sans-serif;padding:20px;">
        <div style="text-align:center;">
            <p style="font-size:18px;font-weight:600;margin-bottom:8px;">${productName}</p>
            <p style="color:#94a3b8;font-size:14px;">Redirecting to product page...</p>
        </div>
    </div>
</body>
</html>`;
      
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).send(botHtml);
    }

    // ============================================
    // IF HUMAN: Redirect to the full product page
    // ============================================
    // Redirect to the main product page
    const redirectUrl = `/item/?product=${product}`;
    
    // Use 302 redirect (temporary) so search engines still index the item page
    res.setHeader('Location', redirectUrl);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(302).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Redirecting to ${productName}...</title>
          <meta http-equiv="refresh" content="0; url=${redirectUrl}">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background: #090d16;
              color: #f8fafc;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              flex-direction: column;
              gap: 12px;
              padding: 20px;
            }
            .spinner {
              width: 48px;
              height: 48px;
              border: 4px solid rgba(255,255,255,0.1);
              border-top: 4px solid #e60012;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            p { color: #94a3b8; font-size: 15px; }
            a { color: #e60012; text-decoration: none; font-weight: 600; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <p>Redirecting to <strong>${productName}</strong>...</p>
          <p style="font-size:13px;">If you are not redirected, <a href="${redirectUrl}">click here</a>.</p>
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
              background: #090d16;
              color: #f8fafc;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
            }
            .card {
              background: rgba(30, 41, 59, 0.7);
              backdrop-filter: blur(16px);
              -webkit-backdrop-filter: blur(16px);
              border: 1px solid rgba(255, 255, 255, 0.08);
              padding: 40px 30px;
              border-radius: 24px;
              text-align: center;
              max-width: 440px;
              width: 100%;
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
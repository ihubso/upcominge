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

    // Generate HTML with OG tags and responsive modern layout
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
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
    
    <style>
        :root {
            --primary: #e60012;
            --primary-hover: #cc0010;
            --bg-gradient: linear-gradient(135deg, #090d16 0%, #111827 100%);
            --card-bg: rgba(255, 255, 255, 0.98);
            --text-main: #0f172a;
            --text-muted: #64748b;
            --border-color: #f1f5f9;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: var(--bg-gradient);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
        }

        .container {
            max-width: 1100px;
            width: 100%;
            background: var(--card-bg);
            border-radius: 32px;
            overflow: hidden;
            box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
            animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .product-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            min-height: 600px;
        }

        /* Image Section */
        .product-image-section {
            background: radial-gradient(circle at center, #ffffff 0%, #f8fafc 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            position: relative;
            overflow: hidden;
            border-right: 1px solid var(--border-color);
        }

        .product-image-section img {
            max-width: 100%;
            max-height: 450px;
            width: 100%;
            object-fit: contain;
            border-radius: 16px;
            transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            z-index: 1;
        }

        .product-image-section img:hover {
            transform: scale(1.04);
        }

        .deal-badge {
            position: absolute;
            top: 24px;
            left: 24px;
            background: linear-gradient(135deg, #e60012, #ff1744);
            color: white;
            padding: 8px 18px;
            border-radius: 30px;
            font-weight: 700;
            font-size: 13px;
            letter-spacing: 0.5px;
            box-shadow: 0 8px 20px rgba(230, 0, 18, 0.3);
            z-index: 2;
        }

        /* Info Section */
        .product-info-section {
            padding: 48px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
        }

        .info-top {
            display: flex;
            flex-direction: column;
        }

        .breadcrumb {
            font-size: 11px;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 10px;
            font-weight: 600;
        }

        .breadcrumb span {
            color: var(--text-main);
        }

        .brand {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: var(--primary);
            margin-bottom: 8px;
            display: inline-block;
            padding: 4px 12px;
            background: rgba(230, 0, 18, 0.06);
            border-radius: 20px;
            width: fit-content;
        }

        .name {
            font-size: 32px;
            font-weight: 800;
            color: var(--text-main);
            margin-bottom: 12px;
            line-height: 1.15;
            letter-spacing: -0.5px;
        }

        .rating-section {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
        }

        .stars {
            color: #f59e0b;
            font-size: 15px;
            letter-spacing: 1px;
        }

        .rating-text {
            font-size: 13px;
            color: var(--text-muted);
            font-weight: 500;
        }

        .price-section {
            margin-bottom: 16px;
            display: flex;
            align-items: baseline;
            gap: 12px;
        }

        .price {
            font-size: 36px;
            font-weight: 800;
            color: var(--primary);
            letter-spacing: -0.5px;
        }

        .price .original {
            font-size: 20px;
            color: var(--text-muted);
            text-decoration: line-through;
            font-weight: 400;
        }

        .stock {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 20px;
            background: ${productData.stock > 0 ? '#dcfce7' : '#fee2e2'};
            color: ${productData.stock > 0 ? '#166534' : '#991b1b'};
            width: fit-content;
        }

        .description {
            color: #475569;
            line-height: 1.6;
            margin-bottom: 24px;
            font-size: 15px;
        }

        /* Action Buttons */
        .action-buttons {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
        }

        .btn-primary, .btn-secondary {
            flex: 1;
            padding: 14px 24px;
            border-radius: 14px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: center;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .btn-primary {
            background: linear-gradient(135deg, #e60012, #ff1744);
            color: white;
            border: none;
            box-shadow: 0 6px 20px rgba(230, 0, 18, 0.25);
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(230, 0, 18, 0.35);
        }

        .btn-secondary {
            background: #f1f5f9;
            color: var(--text-main);
            border: 1px solid #e2e8f0;
        }

        .btn-secondary:hover {
            background: #e2e8f0;
            transform: translateY(-2px);
        }

        /* Specs Grid */
        .specs-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px 20px;
            padding-top: 20px;
            border-top: 1px solid var(--border-color);
        }

        .spec-item .label {
            color: var(--text-muted);
            font-weight: 500;
            display: block;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
        }

        .spec-item .value {
            color: var(--text-main);
            font-weight: 600;
            font-size: 14px;
        }

        /* Footer Link */
        .footer-link {
            text-align: center;
            padding: 16px;
            background: #f8fafc;
            border-top: 1px solid var(--border-color);
            font-size: 13px;
            color: var(--text-muted);
        }

        .footer-link a {
            color: var(--primary);
            text-decoration: none;
            font-weight: 700;
            transition: color 0.2s;
        }

        .footer-link a:hover {
            text-decoration: underline;
        }

        /* Responsive Design */
        @media (max-width: 900px) {
            .product-grid {
                grid-template-columns: 1fr;
            }
            .product-image-section {
                min-height: 320px;
                padding: 30px;
                border-right: none;
                border-bottom: 1px solid var(--border-color);
            }
            .product-image-section img {
                max-height: 300px;
            }
            .product-info-section {
                padding: 32px 24px;
            }
            .name {
                font-size: 26px;
            }
            .price {
                font-size: 30px;
            }
        }

        @media (max-width: 480px) {
            body {
                padding: 0;
            }
            .container {
                border-radius: 0;
                min-height: 100vh;
                box-shadow: none;
            }
            .product-info-section {
                padding: 24px 16px;
            }
            .action-buttons {
                flex-direction: column;
            }
            .specs-grid {
                grid-template-columns: 1fr;
                gap: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="product-grid">
            <div class="product-image-section">
                <img src="${imageUrl}" alt="${productName}" 
                     onerror="this.src='https://placehold.co/600x400/0f172a/ffffff?text=No+Image'" />
                ${dealDiscount > 0 ? `<div class="deal-badge">🔥 -${dealDiscount}% OFF</div>` : ''}
            </div>
            
            <div class="product-info-section">
                <div class="info-top">
                    <div class="breadcrumb">🏠 / <span>${productCategory || 'Products'}</span></div>
                    ${productBrand ? `<div class="brand">${productBrand}</div>` : ''}
                    <h1 class="name">${productName}</h1>
                    
                    <div class="rating-section">
                        <span class="stars">★★★★★</span>
                        <span class="rating-text">4.8 (124 reviews)</span>
                    </div>
                    
                    <div class="price-section">
                        <span class="price">
                            ${currency} ${discountedPrice.toFixed(2)}
                            ${dealDiscount > 0 ? `<span class="original">${currency} ${price.toFixed(2)}</span>` : ''}
                        </span>
                    </div>
                    
                    <div class="stock">${productData.stock > 0 ? '✅ ' + productData.stock + ' available' : '❌ Out of Stock'}</div>
                    
                    ${productData.description ? `<p class="description">${productDescription}</p>` : ''}
                    
                    <div class="action-buttons">
                        <a href="/item/?product=${product}" class="btn-primary">🛒 Add to Cart</a>
                        <a href="/item/?product=${product}" class="btn-secondary">❤️ Wishlist</a>
                    </div>
                    
                    <div class="specs-grid">
                        ${productCategory ? `
                            <div class="spec-item">
                                <span class="label">Category</span>
                                <span class="value">${productCategory}</span>
                            </div>
                        ` : ''}
                        ${productBrand ? `
                            <div class="spec-item">
                                <span class="label">Brand</span>
                                <span class="value">${productBrand}</span>
                            </div>
                        ` : ''}
                        ${productData.cpu ? `
                            <div class="spec-item">
                                <span class="label">Processor</span>
                                <span class="value">${escapeHtml(productData.cpu)}</span>
                            </div>
                        ` : ''}
                        ${productData.os ? `
                            <div class="spec-item">
                                <span class="label">OS</span>
                                <span class="value">${escapeHtml(productData.os)}</span>
                            </div>
                        ` : ''}
                        ${productData.deliveryEstimate ? `
                            <div class="spec-item">
                                <span class="label">Delivery</span>
                                <span class="value">${escapeHtml(productData.deliveryEstimate)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer-link">
            👉 <a href="/item/?product=${product}">View full interactive product experience</a>
        </div>
    </div>
</body>
</html>`;

    // Send response
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(html);

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
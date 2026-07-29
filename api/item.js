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
      <html>
        <head><title>Product ID Required</title></head>
        <body style="font-family:sans-serif;padding:40px;text-align:center;">
          <h1>❌ Product ID Required</h1>
          <p>Please provide a product ID: <code>?product=YOUR_ID</code></p>
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
        <html>
          <head><title>Product Not Found</title></head>
          <body style="font-family:sans-serif;padding:40px;text-align:center;">
            <h1>🔍 Product Not Found</h1>
            <p>We couldn't find the product you're looking for.</p>
            <a href="/" style="color:#e60012;text-decoration:none;font-weight:bold;">← Back to Store</a>
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

    // Generate HTML with OG tags
    const html = `<!DOCTYPE html>
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
    
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #f8fafc 0%, #eef2f6 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
        }
        .container {
            max-width: 1200px;
            width: 100%;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 40px;
            overflow: hidden;
            box-shadow: 0 40px 100px rgba(0,0,0,0.08), 0 20px 40px rgba(0,0,0,0.04);
            border: 1px solid rgba(255,255,255,0.5);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .container:hover {
            transform: translateY(-4px);
            box-shadow: 0 50px 120px rgba(0,0,0,0.12), 0 20px 40px rgba(0,0,0,0.04);
        }
        .product-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
        }
        .product-image-section {
            background: linear-gradient(145deg, #ffffff, #f1f5f9);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 48px;
            min-height: 500px;
            position: relative;
            overflow: hidden;
        }
        .product-image-section::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle at 70% 30%, rgba(230, 0, 18, 0.03), transparent 70%);
            pointer-events: none;
        }
        .product-image-section img {
            max-width: 100%;
            max-height: 420px;
            object-fit: contain;
            border-radius: 20px;
            filter: drop-shadow(0 20px 40px rgba(0,0,0,0.06));
            transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
            z-index: 1;
        }
        .product-image-section img:hover {
            transform: scale(1.02);
        }
        .deal-badge {
            position: absolute;
            top: 24px;
            left: 24px;
            background: linear-gradient(135deg, #e60012, #ff1744);
            color: white;
            padding: 10px 24px;
            border-radius: 50px;
            font-weight: 800;
            font-size: 15px;
            letter-spacing: 0.5px;
            box-shadow: 0 8px 24px rgba(230, 0, 18, 0.3);
            z-index: 2;
            animation: pulse-badge 2s ease-in-out infinite;
        }
        @keyframes pulse-badge {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.03); }
        }
        .product-info-section {
            padding: 56px 48px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            background: white;
        }
        .breadcrumb {
            font-size: 12px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 12px;
            font-weight: 600;
        }
        .breadcrumb span {
            color: #0f172a;
        }
        .brand {
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #e60012;
            margin-bottom: 8px;
            display: inline-block;
            padding: 4px 16px;
            background: rgba(230, 0, 18, 0.06);
            border-radius: 30px;
            width: fit-content;
        }
        .name {
            font-size: 34px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 16px;
            line-height: 1.2;
            letter-spacing: -0.5px;
        }
        .rating-section {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
        }
        .stars {
            color: #f59e0b;
            font-size: 18px;
            letter-spacing: 2px;
        }
        .rating-text {
            font-size: 14px;
            color: #64748b;
        }
        .price-section {
            margin-bottom: 20px;
        }
        .price {
            font-size: 40px;
            font-weight: 800;
            color: #e60012;
            letter-spacing: -0.5px;
        }
        .price .original {
            font-size: 24px;
            color: #94a3b8;
            text-decoration: line-through;
            font-weight: 400;
            margin-left: 16px;
        }
        .stock {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 20px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 20px;
            background: ${productData.stock > 0 ? '#dcfce7' : '#fee2e2'};
            color: ${productData.stock > 0 ? '#166534' : '#991b1b'};
            width: fit-content;
        }
        .description {
            color: #475569;
            line-height: 1.8;
            margin-bottom: 24px;
            font-size: 16px;
            font-weight: 400;
        }
        .action-buttons {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
            flex-wrap: wrap;
        }
        .btn-primary {
            background: linear-gradient(135deg, #e60012, #ff1744);
            color: white;
            border: none;
            padding: 16px 36px;
            border-radius: 50px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 8px 24px rgba(230, 0, 18, 0.25);
            flex: 1;
            min-width: 160px;
            text-align: center;
            text-decoration: none;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 32px rgba(230, 0, 18, 0.35);
        }
        .btn-primary:active {
            transform: translateY(0);
        }
        .btn-secondary {
            background: #f1f5f9;
            color: #0f172a;
            border: none;
            padding: 16px 36px;
            border-radius: 50px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            flex: 1;
            min-width: 140px;
            text-align: center;
            text-decoration: none;
        }
        .btn-secondary:hover {
            background: #e2e8f0;
            transform: translateY(-2px);
        }
        .specs-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px 24px;
            margin-top: 8px;
            padding-top: 20px;
            border-top: 2px solid #f1f5f9;
        }
        .spec-item {
            font-size: 14px;
        }
        .spec-item .label {
            color: #94a3b8;
            font-weight: 500;
            display: block;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 2px;
        }
        .spec-item .value {
            color: #0f172a;
            font-weight: 600;
            font-size: 15px;
        }
        .delivery-info {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 16px;
            padding: 12px 16px;
            background: #f8fafc;
            border-radius: 16px;
            font-size: 14px;
            color: #475569;
        }
        .delivery-info strong {
            color: #0f172a;
        }
        .footer-link {
            text-align: center;
            padding: 18px;
            background: #f8fafc;
            border-top: 1px solid #eef2f6;
            font-size: 14px;
            color: #64748b;
        }
        .footer-link a {
            color: #e60012;
            text-decoration: none;
            font-weight: 700;
            transition: color 0.2s;
        }
        .footer-link a:hover {
            color: #b3000e;
            text-decoration: underline;
        }
        
        @media (max-width: 968px) {
            .product-grid {
                grid-template-columns: 1fr;
            }
            .product-image-section {
                min-height: 320px;
                padding: 32px;
            }
            .product-image-section img {
                max-height: 320px;
            }
            .product-info-section {
                padding: 36px 32px;
            }
            .name {
                font-size: 28px;
            }
            .price {
                font-size: 32px;
            }
            .specs-grid {
                grid-template-columns: 1fr 1fr;
            }
            body {
                padding: 16px;
            }
        }
        @media (max-width: 600px) {
            .container {
                border-radius: 24px;
            }
            .product-image-section {
                min-height: 240px;
                padding: 20px;
            }
            .product-image-section img {
                max-height: 240px;
            }
            .product-info-section {
                padding: 24px 20px;
            }
            .name {
                font-size: 22px;
            }
            .price {
                font-size: 28px;
            }
            .price .original {
                font-size: 18px;
            }
            .specs-grid {
                grid-template-columns: 1fr;
                gap: 8px;
            }
            .action-buttons {
                flex-direction: column;
            }
            .btn-primary, .btn-secondary {
                width: 100%;
                text-align: center;
            }
            .deal-badge {
                top: 16px;
                left: 16px;
                font-size: 13px;
                padding: 6px 16px;
            }
            body {
                padding: 12px;
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
                    <a href="#" class="btn-primary">🛒 Add to Cart</a>
                    <a href="#" class="btn-secondary">❤️ Wishlist</a>
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
                
                ${productData.deliveryEstimate ? `
                    <div class="delivery-info">
                        🚚 <strong>Free delivery</strong> · Est. ${escapeHtml(productData.deliveryEstimate)}
                    </div>
                ` : ''}
            </div>
        </div>
        
        <div class="footer-link">
            👉 <a href="/item/?product=${product}">View full product page</a> with cart & reviews
          
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
      <html>
        <head><title>Error</title></head>
        <body style="font-family:sans-serif;padding:40px;text-align:center;">
          <h1>⚠️ Something went wrong</h1>
          <p>Please try again later.</p>
        </body>
      </html>
    `);
  }
};

// api/item.js
const { createClient } = require('@supabase/supabase-js');

// Log environment variables (will show in Vercel logs)
console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY exists:', !!process.env.SUPABASE_ANON_KEY);

// Supabase configuration with fallback for testing
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';

// Only create client if we have valid credentials
let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase client created successfully');
} catch (err) {
  console.error('❌ Failed to create Supabase client:', err.message);
}

module.exports = async (req, res) => {
  console.log('🚀 Function called with query:', req.query);
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Get product ID from query params
  const { product } = req.query;
  
  if (!product) {
    console.log('❌ No product ID provided');
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Product ID Required</title></head>
        <body style="font-family:sans-serif;padding:40px;text-align:center;">
          <h1>❌ Product ID Required</h1>
          <p>Please provide a product ID: <code>?product=YOUR_ID</code></p>
          <p>Example: <code>/?product=1780000000511-id511</code></p>
        </body>
      </html>
    `);
  }

  try {
    // Check if Supabase client exists
    if (!supabase) {
      throw new Error('Supabase client not initialized. Check your environment variables.');
    }

    console.log('🔍 Fetching product:', product);
    
    // Fetch product from Supabase
    const { data: productData, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', product)
      .single();

    if (error) {
      console.error('❌ Supabase error:', error.message);
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Product Not Found</title></head>
          <body style="font-family:sans-serif;padding:40px;text-align:center;">
            <h1>🔍 Product Not Found</h1>
            <p>Error: ${error.message}</p>
            <p>Product ID: ${product}</p>
            <a href="/" style="color:#e60012;text-decoration:none;font-weight:bold;">← Back to Store</a>
          </body>
        </html>
      `);
    }

    if (!productData) {
      console.log('❌ No product found for ID:', product);
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Product Not Found</title></head>
          <body style="font-family:sans-serif;padding:40px;text-align:center;">
            <h1>🔍 Product Not Found</h1>
            <p>No product found with ID: ${product}</p>
            <a href="/" style="color:#e60012;text-decoration:none;font-weight:bold;">← Back to Store</a>
          </body>
        </html>
      `);
    }

    console.log('✅ Product found:', productData.name);

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
      // No deal found - this is fine
      console.log('ℹ️ No deal found for product');
    }

    // Prepare product data
    const price = productData.price || 0;
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
    <meta property="og:url" content="https://upcominge.vercel.app/api/item?product=${product}" />
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
    <link rel="canonical" href="https://upcominge.vercel.app/api/item?product=${product}" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1000px;
            width: 100%;
            background: white;
            border-radius: 32px;
            overflow: hidden;
            box-shadow: 0 25px 80px rgba(0,0,0,0.12);
        }
        .product-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
        }
        .product-image-section {
            background: #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            min-height: 450px;
            position: relative;
        }
        .product-image-section img {
            max-width: 100%;
            max-height: 420px;
            object-fit: contain;
            border-radius: 16px;
        }
        .deal-badge {
            position: absolute;
            top: 20px;
            left: 20px;
            background: #e60012;
            color: white;
            padding: 8px 20px;
            border-radius: 30px;
            font-weight: 800;
            font-size: 16px;
            box-shadow: 0 4px 12px rgba(230, 0, 18, 0.35);
        }
        .product-info-section {
            padding: 48px 40px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .brand {
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #e60012;
            margin-bottom: 8px;
        }
        .name {
            font-size: 30px;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 12px;
            line-height: 1.2;
        }
        .price-section {
            margin-bottom: 16px;
        }
        .price {
            font-size: 34px;
            font-weight: 700;
            color: #e60012;
        }
        .price .original {
            font-size: 22px;
            color: #94a3b8;
            text-decoration: line-through;
            font-weight: 400;
            margin-left: 14px;
        }
        .stock {
            display: inline-block;
            padding: 6px 18px;
            border-radius: 30px;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 16px;
            background: ${productData.stock > 0 ? '#dcfce7' : '#fee2e2'};
            color: ${productData.stock > 0 ? '#166534' : '#991b1b'};
        }
        .description {
            color: #475569;
            line-height: 1.7;
            margin-bottom: 20px;
            font-size: 15px;
        }
        .specs-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 20px;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
        }
        .spec-item {
            font-size: 14px;
        }
        .spec-item .label {
            color: #94a3b8;
            font-weight: 500;
            display: block;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .spec-item .value {
            color: #0f172a;
            font-weight: 600;
        }
        .redirect-banner {
            text-align: center;
            padding: 16px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            font-size: 14px;
            color: #475569;
        }
        .redirect-banner a {
            color: #e60012;
            text-decoration: none;
            font-weight: 700;
        }
        .redirect-banner a:hover {
            text-decoration: underline;
        }
        
        @media (max-width: 768px) {
            .product-grid {
                grid-template-columns: 1fr;
            }
            .product-image-section {
                min-height: 280px;
                padding: 24px;
            }
            .product-image-section img {
                max-height: 280px;
            }
            .product-info-section {
                padding: 28px 24px;
            }
            .name {
                font-size: 24px;
            }
            .price {
                font-size: 28px;
            }
            .specs-grid {
                grid-template-columns: 1fr;
            }
            .deal-badge {
                font-size: 13px;
                padding: 6px 16px;
            }
        }
        @media (max-width: 480px) {
            .product-image-section {
                min-height: 200px;
                padding: 16px;
            }
            .product-image-section img {
                max-height: 200px;
            }
            .product-info-section {
                padding: 20px 16px;
            }
            .name {
                font-size: 20px;
            }
            .price {
                font-size: 24px;
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
                ${productBrand ? `<div class="brand">${productBrand}</div>` : ''}
                <h1 class="name">${productName}</h1>
                
                <div class="price-section">
                    <span class="price">
                        ${currency} ${discountedPrice.toFixed(2)}
                        ${dealDiscount > 0 ? `<span class="original">${currency} ${price.toFixed(2)}</span>` : ''}
                    </span>
                </div>
                
                <div class="stock">${productData.stock > 0 ? '✅ ' + productData.stock + ' available' : '❌ Out of Stock'}</div>
                
                ${productData.description ? `<p class="description">${productDescription}</p>` : ''}
                
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
                </div>
            </div>
        </div>
        
        <div class="redirect-banner">
            👉 <a href="/item.html?product=${product}">View full product page</a> with cart & reviews
        </div>
    </div>
</body>
</html>`;

    // Send response
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(html);

  } catch (error) {
    console.error('❌ Server error:', error.message);
    console.error('Stack trace:', error.stack);
    
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Error</title></head>
        <body style="font-family:sans-serif;padding:40px;text-align:center;">
          <h1>⚠️ Something went wrong</h1>
          <p style="color:#666;">Error: ${error.message}</p>
          <p style="font-size:14px;color:#999;margin-top:20px;">
            Check Vercel logs for more details.
          </p>
          <a href="/" style="color:#e60012;text-decoration:none;font-weight:bold;">← Back to Store</a>
        </body>
      </html>
    `);
  }
};

<?php
// item.php
$productId = $_GET['product'] ?? '';

if (!$productId) {
    die('Product ID required');
}

// Your Supabase credentials
$supabaseUrl = 'https://YOUR_PROJECT.supabase.co';
$supabaseKey = 'YOUR_ANON_KEY';

// Fetch product
$url = "$supabaseUrl/rest/v1/products?id=eq.$productId&select=*";
$opts = [
    'http' => [
        'method' => 'GET',
        'header' => "apikey: $supabaseKey\r\nAuthorization: Bearer $supabaseKey"
    ]
];
$context = stream_context_create($opts);
$response = file_get_contents($url);
$products = json_decode($response, true);
$product = $products[0] ?? null;

if (!$product) {
    die('Product not found');
}

// Get product details
$name = htmlspecialchars($product['name'] ?? '');
$price = $product['price'] ?? 0;
$currency = $product['currency'] ?? 'FCFA';
$image = $product['image'] ?? 'https://placehold.co/600x400';
$description = htmlspecialchars($product['description'] ?? '');
$brand = htmlspecialchars($product['brand'] ?? '');
$stock = $product['stock'] ?? 0;
$category = htmlspecialchars($product['category'] ?? '');

// Check for deal
$dealDiscount = 0;
$dealUrl = "$supabaseUrl/rest/v1/deals?product_id=eq.$productId&select=discount";
$dealResponse = file_get_contents($dealUrl, false, stream_context_create($opts));
$deals = json_decode($dealResponse, true);
if (!empty($deals)) {
    $dealDiscount = $deals[0]['discount'] ?? 0;
}

$finalPrice = $dealDiscount > 0 ? $price * (1 - $dealDiscount / 100) : $price;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><?php echo $name; ?> · Sucess Technology</title>
    
    <!-- Open Graph Tags -->
    <meta property="og:type" content="product" />
    <meta property="og:title" content="<?php echo $name; ?>" />
    <meta property="og:description" content="<?php echo $description ?: "$currency $price • " . ($stock > 0 ? 'In Stock' : 'Out of Stock'); ?>" />
    <meta property="og:image" content="<?php echo $image; ?>" />
    <meta property="og:url" content="https://upcominge.vercel.app/item.php?product=<?php echo $productId; ?>" />
    <meta property="og:site_name" content="Sucess Technology" />
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="<?php echo $name; ?>" />
    <meta name="twitter:description" content="<?php echo $description ?: "$currency $price"; ?>" />
    <meta name="twitter:image" content="<?php echo $image; ?>" />
    
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            background: #f8fafc;
        }
        .product {
            background: white;
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.08);
            text-align: center;
        }
        .product img {
            max-width: 100%;
            max-height: 400px;
            object-fit: contain;
            border-radius: 16px;
        }
        .product h1 {
            font-size: 32px;
            margin: 20px 0 10px;
            color: #0f172a;
        }
        .product .brand {
            color: #e60012;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-size: 14px;
        }
        .product .price {
            font-size: 36px;
            font-weight: 700;
            color: #e60012;
            margin: 12px 0;
        }
        .product .stock {
            display: inline-block;
            padding: 6px 20px;
            border-radius: 30px;
            font-weight: 600;
            font-size: 14px;
            background: <?php echo $stock > 0 ? '#dcfce7' : '#fee2e2'; ?>;
            color: <?php echo $stock > 0 ? '#166534' : '#991b1b'; ?>;
            margin: 10px 0;
        }
        .product .description {
            color: #475569;
            line-height: 1.6;
            margin: 16px 0;
        }
        .product .specs {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: left;
        }
        .product .specs .label {
            color: #94a3b8;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .product .specs .value {
            color: #0f172a;
            font-weight: 600;
        }
        .redirect {
            margin-top: 20px;
            padding: 16px;
            background: #f1f5f9;
            border-radius: 12px;
            font-size: 14px;
            color: #475569;
        }
        .redirect a {
            color: #e60012;
            font-weight: 700;
            text-decoration: none;
        }
        .redirect a:hover {
            text-decoration: underline;
        }
        @media (max-width: 640px) {
            .product { padding: 20px; }
            .product h1 { font-size: 24px; }
            .product .price { font-size: 28px; }
            .product .specs { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="product">
        <?php if ($brand): ?>
            <div class="brand"><?php echo $brand; ?></div>
        <?php endif; ?>
        
        <img src="<?php echo $image; ?>" alt="<?php echo $name; ?>" 
             onerror="this.src='https://placehold.co/600x400?text=No+Image'" />
        
        <h1><?php echo $name; ?></h1>
        
        <div class="price">
            <?php echo $currency; ?> <?php echo number_format($finalPrice, 2); ?>
            <?php if ($dealDiscount > 0): ?>
                <span style="font-size:20px;color:#94a3b8;text-decoration:line-through;font-weight:400;margin-left:12px;">
                    <?php echo $currency; ?> <?php echo number_format($price, 2); ?>
                </span>
                <span style="display:inline-block;background:#e60012;color:white;padding:2px 12px;border-radius:20px;font-size:14px;margin-left:8px;">
                    -<?php echo $dealDiscount; ?>%
                </span>
            <?php endif; ?>
        </div>
        
        <div class="stock">
            <?php echo $stock > 0 ? '✅ ' . $stock . ' available' : '❌ Out of Stock'; ?>
        </div>
        
        <?php if ($description): ?>
            <p class="description"><?php echo $description; ?></p>
        <?php endif; ?>
        
        <div class="specs">
            <?php if ($category): ?>
                <div>
                    <div class="label">Category</div>
                    <div class="value"><?php echo $category; ?></div>
                </div>
            <?php endif; ?>
            <?php if ($brand): ?>
                <div>
                    <div class="label">Brand</div>
                    <div class="value"><?php echo $brand; ?></div>
                </div>
            <?php endif; ?>
            <?php if (!empty($product['cpu'])): ?>
                <div>
                    <div class="label">Processor</div>
                    <div class="value"><?php echo htmlspecialchars($product['cpu']); ?></div>
                </div>
            <?php endif; ?>
            <?php if (!empty($product['os'])): ?>
                <div>
                    <div class="label">OS</div>
                    <div class="value"><?php echo htmlspecialchars($product['os']); ?></div>
                </div>
            <?php endif; ?>
        </div>
        
        <div class="redirect">
            👉 <a href="//item/?product=<?php echo $productId; ?>">View full product page</a> with cart & reviews
        </div>
    </div>
</body>
</html>
<?php
?>
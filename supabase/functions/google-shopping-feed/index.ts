import { createClient } from "npm:@supabase/supabase-js@2";
// ======================================================
// SUCCESS TECHNOLOGY — GOOGLE MERCHANT CENTER PRODUCT FEED
// Supabase Edge Function: google-shopping-feed
// ======================================================
const STORE_URL = "https://www.suctech.store";
const PRODUCT_PATH = "/item/?product=";
const CURRENCY = "XOF";
const COUNTRY = "CI";
// Change this to your actual standard shipping price in XOF.
// Do not submit a price that does not match your store.
const SHIPPING_PRICE = "1500.00";
// Supabase pagination size. Smaller pages avoid API row limits.
const PAGE_SIZE = 500;
// ======================================================
// HELPERS
// ======================================================
function escapeXml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function cleanText(value) {
  return String(value ?? "").replace(/\u0000/g, "").replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
}
function validHttpUrl(value) {
  const input = cleanText(value);
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "";
    }
    return url.href;
  } catch  {
    return "";
  }
}
function xmlText(value) {
  return escapeXml(cleanText(value));
}
function validPrice(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }
  return number;
}
function validStock(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}
function productUrl(id) {
  return `${STORE_URL}${PRODUCT_PATH}${encodeURIComponent(String(id))}`;
}
function getAdditionalImages(images, mainImage) {
  if (!Array.isArray(images)) {
    return [];
  }
  const mainUrl = validHttpUrl(mainImage);
  const seen = new Set();
  if (mainUrl) {
    seen.add(mainUrl);
  }
  const result = [];
  for (const value of images){
    const url = validHttpUrl(value);
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);
    result.push(url);
    // Google supports a limited number of additional images.
    if (result.length >= 10) {
      break;
    }
  }
  return result;
}
function xmlError(message, status) {
  return new Response(JSON.stringify({
    error: message,
    status
  }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
// ======================================================
// EDGE FUNCTION
// ======================================================
Deno.serve(async (req)=>{
  // Support CORS preflight requests.
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, apikey, content-type"
      }
    });
  }
  if (req.method !== "GET") {
    return xmlError("Method not allowed. Use GET.", 405);
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration. Set SUPABASE_URL and " + "SUPABASE_SERVICE_ROLE_KEY in Edge Function secrets.");
    }
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    // Fetch every page instead of relying on one large query.
    const products = [];
    let offset = 0;
    while(true){
      const { data, error } = await supabase.from("products").select("id, name, description, price, stock, image, images, brand, category").order("id", {
        ascending: true
      }).range(offset, offset + PAGE_SIZE - 1);
      if (error) {
        console.error("Product query failed:", error.message);
        throw new Error(`Could not read products from Supabase: ${error.message}`);
      }
      const batch = data ?? [];
      products.push(...batch);
      if (batch.length < PAGE_SIZE) {
        break;
      }
      offset += PAGE_SIZE;
      // Prevent an unexpectedly large table from exhausting function memory.
      if (products.length >= 50000) {
        console.warn("Feed reached the 50,000-product safety limit.");
        break;
      }
    }
    const items = [];
    let skipped = 0;
    for (const p of products){
      const id = cleanText(p.id);
      const title = cleanText(p.name);
      const description = cleanText(p.description);
      const priceNumber = validPrice(p.price);
      const stock = validStock(p.stock);
      const imageLink = validHttpUrl(p.image);
      if (!id || !title || priceNumber === null || !imageLink) {
        skipped++;
        continue;
      }
      const availability = stock > 0 ? "in_stock" : "out_of_stock";
      const price = `${priceNumber.toFixed(2)} ${CURRENCY}`;
      const link = productUrl(id);
      const brand = cleanText(p.brand);
      const category = cleanText(p.category);
      const additionalImages = getAdditionalImages(p.images, imageLink);
      const additionalImagesXml = additionalImages.map((url)=>`      <g:additional_image_link>${xmlText(url)}</g:additional_image_link>`).join("\n");
      const descriptionXml = description ? `      <g:description>${xmlText(description)}</g:description>\n` : "";
      const brandXml = brand ? `      <g:brand>${xmlText(brand)}</g:brand>\n` : "";
      const storeCode = "7292687853439677322";
      const categoryXml = category ? `      <g:product_type>${xmlText(category)}</g:product_type>\n` : "";
      items.push(`    <item>
      <g:id>${xmlText(id)}</g:id>
      <g:title>${xmlText(title)}</g:title>
${descriptionXml}      <g:link>${xmlText(link)}</g:link>
      <g:image_link>${xmlText(imageLink)}</g:image_link>
${additionalImagesXml ? additionalImagesXml + "\n" : ""}      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${price}</g:price>
      <g:store_code>${storeCode}</g:store_code>
      <g:quantity>${stock}</g:quantity>
${brandXml}${categoryXml}      <g:shipping>
        <g:country>${COUNTRY}</g:country>
        <g:service>Standard</g:service>
        <g:price>${SHIPPING_PRICE} ${CURRENCY}</g:price>
      </g:shipping>
    </item>`);
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Success Technology</title>
    <link>${xmlText(STORE_URL)}</link>
    <description>Product feed for Success Technology.</description>
${items.join("\n")}
  </channel>
</rss>`;
    console.log(JSON.stringify({
      productsFetched: products.length,
      productsIncluded: items.length,
      productsSkipped: skipped
    }));
    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300",
        "X-Products-Fetched": String(products.length),
        "X-Products-Included": String(items.length),
        "X-Products-Skipped": String(skipped)
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Google Shopping feed error:", message);
    return xmlError(message, 500);
  }
});

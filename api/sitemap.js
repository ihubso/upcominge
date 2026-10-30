
import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://www.suctech.store';

const ROUTES = {
  product: '/item/',
  category: '/category/',
};

const PAGE_SIZE = 1000;
const MAX_PRODUCTS = 50000;

const STATIC_PAGES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/AboutUs/', changefreq: 'monthly', priority: '0.5' },
  { path: '/contactus/', changefreq: 'monthly', priority: '0.5' },
];

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function validDate(value) {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString();
}

function productUrl(id) {
  return `${SITE_URL}${ROUTES.product}?product=${encodeURIComponent(id)}`;
}

function categoryUrl(category) {
  return `${SITE_URL}${ROUTES.category}?category=${encodeURIComponent(
    category.trim().toLowerCase()
  )}`;
}

function addUrl(urls, url, lastmod, changefreq, priority) {
  if (!url || urls.has(url)) return;

  urls.set(url, {
    lastmod,
    changefreq,
    priority,
  });
}

// --------------------------------------------------
// FETCH ALL PRODUCTS WITH PAGINATION
// --------------------------------------------------

async function fetchAllProducts(supabase) {
  const allProducts = [];

  for (let from = 0; from < MAX_PRODUCTS; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('products')
      .select('id, category, stock, created_at, updated_at')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(
        `Supabase products query failed: ${error.message}`
      );
    }

    if (!data || data.length === 0) break;

    allProducts.push(...data);

    if (data.length < PAGE_SIZE) break;
  }

  if (allProducts.length >= MAX_PRODUCTS) {
    throw new Error(
      `Product limit reached (${MAX_PRODUCTS}). Use a sitemap index and multiple sitemap files.`
    );
  }

  return allProducts;
}

// --------------------------------------------------
// SITEMAP HANDLER
// --------------------------------------------------

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');

    return res.status(405).send('Method Not Allowed');
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[sitemap] Missing Supabase environment variables');

    return res.status(500).send('Sitemap configuration error');
  }

  try {
    const supabase = createClient(
      supabaseUrl,
      supabaseKey
    );

    const products = await fetchAllProducts(supabase);

    // Map prevents duplicate URLs.
    const urls = new Map();

    // --------------------------------------------------
    // STATIC PAGES
    // --------------------------------------------------

    // Do not use the current generation time as lastmod.
    // Add a real modification date here only if you maintain one.
    for (const page of STATIC_PAGES) {
      addUrl(
        urls,
        `${SITE_URL}${page.path}`,
        null,
        page.changefreq,
        page.priority
      );
    }

    // --------------------------------------------------
    // CATEGORY PAGES
    // --------------------------------------------------

    const categories = new Map();

    for (const product of products) {
      const category = String(product.category || '').trim();

      if (!category) continue;

      const key = category.toLowerCase();

      const productDate = validDate(
        product.updated_at || product.created_at
      );

      const existing = categories.get(key);

      if (!existing) {
        categories.set(key, {
          name: category,
          lastmod: productDate,
        });
      } else if (
        productDate &&
        (!existing.lastmod ||
          new Date(productDate) > new Date(existing.lastmod))
      ) {
        existing.lastmod = productDate;
      }
    }

    for (const category of categories.values()) {
      addUrl(
        urls,
        categoryUrl(category.name),
        category.lastmod,
        'weekly',
        '0.8'
      );
    }

    // --------------------------------------------------
    // PRODUCT PAGES
    // --------------------------------------------------

    let includedProducts = 0;

    for (const product of products) {
      if (
        product.id === null ||
        product.id === undefined ||
        String(product.id).trim() === ''
      ) {
        continue;
      }

      const id = String(product.id).trim();

      const lastmod = validDate(
        product.updated_at || product.created_at
      );

      const inStock = Number(product.stock ?? 0) > 0;

      addUrl(
        urls,
        productUrl(id),
        lastmod,
        inStock ? 'daily' : 'weekly',
        inStock ? '0.7' : '0.4'
      );

      includedProducts++;
    }

    // --------------------------------------------------
    // BUILD XML
    // --------------------------------------------------

    const xmlLines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ];

    for (const [url, info] of urls.entries()) {
      xmlLines.push('  <url>');
      xmlLines.push(`    <loc>${escapeXml(url)}</loc>`);

      if (info.lastmod) {
        xmlLines.push(`    <lastmod>${info.lastmod}</lastmod>`);
      }

      if (info.changefreq) {
        xmlLines.push(`    <changefreq>${info.changefreq}</changefreq>`);
      }

      if (info.priority) {
        xmlLines.push(`    <priority>${info.priority}</priority>`);
      }

      xmlLines.push('  </url>');
    }

    xmlLines.push('</urlset>');

    const xml = xmlLines.join('\n');

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    res.setHeader(
      'Content-Type',
      'application/xml; charset=utf-8'
    );

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=86400'
    );

    res.setHeader(
      'X-Robots-Tag',
      'noindex'
    );

    res.setHeader(
      'X-Sitemap-Product-Count',
      String(includedProducts)
    );

    res.setHeader(
      'X-Sitemap-URL-Count',
      String(urls.size)
    );

    if (req.method === 'HEAD') {
      return res.status(200).end();
    }

    return res.status(200).send(xml);

  } catch (error) {
    console.error('[sitemap] Generation failed:', error);

    return res.status(500).send(
      'Unable to generate sitemap'
    );
  }
}

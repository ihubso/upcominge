// api/sitemap.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ✅ Your live domain (no trailing slash)
const SITE_URL = 'https://www.suctech.store';

// Adjust these if your routes differ
const ROUTES = {
  product:  '/product',
  category: '/category',
};

function toISO(value) {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default async function handler(req, res) {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('id, category, stock, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Derive unique categories from products
    const categorySet = new Set();
    products.forEach(p => {
      if (p.category && p.category.trim()) categorySet.add(p.category.trim());
    });
    const categories = [...categorySet];

    const now = new Date().toISOString();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // 1) Static pages
    const staticPages = [
      { path: '/',        changefreq: 'daily',   priority: '1.0' },
      { path: '/shop',    changefreq: 'daily',   priority: '0.9' },
      { path: '/about',   changefreq: 'monthly', priority: '0.5' },
      { path: '/contact', changefreq: 'monthly', priority: '0.5' },
    ];

    for (const page of staticPages) {
      xml += `  <url>\n`;
      xml += `    <loc>${esc(SITE_URL + page.path)}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // 2) Category pages
    for (const cat of categories) {
      xml += `  <url>\n`;
      xml += `    <loc>${esc(`${SITE_URL}${ROUTES.category}/${encodeURIComponent(cat)}`)}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

    // 3) Product pages
    for (const p of products) {
      const lastmod = toISO(p.updated_at || p.created_at);
      const inStock = Number(p.stock ?? 0) > 0;

      xml += `  <url>\n`;
      xml += `    <loc>${esc(`${SITE_URL}${ROUTES.product}/${encodeURIComponent(p.id)}`)}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>${inStock ? 'daily' : 'weekly'}</changefreq>\n`;
      xml += `    <priority>${inStock ? '0.7' : '0.4'}</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(xml);

  } catch (err) {
    console.error('[sitemap] error:', err);
    res.status(500).send('Error generating sitemap');
  }
}
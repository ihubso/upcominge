// api/sitemap.js
import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://www.suctech.store';

const ROUTES = {
  product:  '/item',
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
  // ---- DEBUG: verify env vars exist ----
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    res.status(500).json({
      debug: 'MISSING ENV VARS',
      hasUrl: !!process.env.SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_ANON_KEY,
    });
    return;
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const { data: products, error } = await supabase
      .from('products')
      .select('id, category, stock, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      // ---- DEBUG: expose Supabase error ----
      res.status(500).json({
        debug: 'SUPABASE ERROR',
        message: error.message,
        code:    error.code,
        hint:    error.hint,
        details: error.details,
        url:     process.env.SUPABASE_URL,
      });
      return;
    }

    const categorySet = new Set();
    products.forEach(p => {
      if (p.category && p.category.trim()) categorySet.add(p.category.trim());
    });
    const categories = [...categorySet];

    const now = new Date().toISOString();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    const staticPages = [
      { path: '/',        changefreq: 'daily',   priority: '1.0' },
      { path: '/product/',    changefreq: 'daily',   priority: '0.9' },
      { path: '/AboutUs/',   changefreq: 'monthly', priority: '0.5' },
      { path: '/contactus/', changefreq: 'monthly', priority: '0.5' },
    ];

    for (const page of staticPages) {
      xml += `  <url>\n`;
      xml += `    <loc>${esc(SITE_URL + page.path)}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    for (const cat of categories) {
      xml += `  <url>\n`;
      xml += `    <loc>${esc(`${SITE_URL}${ROUTES.category}/?category=${encodeURIComponent(cat)}`)}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

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
    res.status(500).json({
      debug: 'UNEXPECTED ERROR',
      message: err?.message || String(err),
      stack:   err?.stack,
    });
  }
}
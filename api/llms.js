// api/llms.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const SITE_URL = 'https://www.suctech.store';

export default async function handler(req, res) {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, price, category, brand, stock, description')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    let txt = `# SucTech Store\n\n`;
    txt += `> SucTech is an online store selling phones and electronics. `;
    txt += `All products ship with a delivery estimate shown on each product page.\n\n`;

    txt += `## Products\n\n`;
    for (const p of products) {
      const inStock = Number(p.stock ?? 0) > 0 ? 'in stock' : 'out of stock';
      txt += `- [${p.name}](${SITE_URL}/product/${encodeURIComponent(p.id)}): `;
      txt += `${p.brand || ''} ${p.category || ''} — $${p.price} — ${inStock}\n`;
    }

    txt += `\n## Pages\n\n`;
    txt += `- [Home](${SITE_URL}/)\n`;
    txt += `- [Shop](${SITE_URL}/shop)\n`;
    txt += `- [About](${SITE_URL}/about)\n`;
    txt += `- [Contact](${SITE_URL}/contact)\n`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(txt);

  } catch (err) {
    console.error('[llms] error:', err);
    res.status(500).send('Error generating llms.txt');
  }
}
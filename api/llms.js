// api/llms.js
import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://www.suctech.store';

export default async function handler(req, res) {
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
      .select(`
        id, name, price, brand, stock, description,
        categories:category_id ( slug, name )
      `)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      res.status(500).json({
        debug: 'SUPABASE ERROR',
        message: error.message,
        code:    error.code,
        hint:    error.hint,
        details: error.details,
      });
      return;
    }

    let txt = `# SUCCESS Technology\n\n`;
    txt += `> Vente d'appareils électroniques : Ordinateur Portable, Ecran PC, Imprimante, Batterie, Souris, Clavier, Clé USB, Chargeur, Encre & Divers.\n`;
    txt += `> Localisation : Angré Djibi Terminus 82, face à Snedai, Abidjan, Côte d'Ivoire\n`;
    txt += `> Contact : +2250172934545 · austinlebechi02@gmail.com\n\n`;

    txt += `## Products\n\n`;

    for (const p of products) {
      const inStock = Number(p.stock ?? 0) > 0 ? 'in stock' : 'out of stock';
      const catSlug = p.categories?.slug || '';
      const catName = p.categories?.name || '';

      // ✅ Fixed product URL: uses ?product= query param
      txt += `- [${p.name}](${SITE_URL}/item/?product=${encodeURIComponent(p.id)}): `;
      txt += `${p.brand || ''}${p.brand && catName ? ' ' : ''}${catName} — cfa${p.price} — ${inStock}\n`;

      // ✅ Add category URL as a separate line so AI knows the correct slug
      if (catSlug) {
        txt += `  Category: [${catName}](${SITE_URL}/category/?category=${catSlug})\n`;
      }
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(txt);

  } catch (err) {
    res.status(500).json({
      debug: 'UNEXPECTED ERROR',
      message: err?.message || String(err),
      stack:   err?.stack,
    });
  }
}
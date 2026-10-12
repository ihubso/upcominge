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
      .select('id, name, price, category, brand, stock, description')
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
txt += `> Vente d'appareils électroniques : Ordinateur Portable, Ecran PC, Imprimante, Batterie, Souris, Clavier, Clé USB, Chargeur, Encre & Divers.\n\n`;
txt += `## Products\n\n`;
    for (const p of products) {
      const inStock = Number(p.stock ?? 0) > 0 ? 'in stock' : 'out of stock';
      txt += `- [${p.name}](${SITE_URL}/item/${encodeURIComponent(p.id)}): `;
      txt += `${p.brand || ''} ${p.category || ''} — FCFA${p.price} — ${inStock}\n`;
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(txt);

  } catch (err) {
    res.status(500).json({
      debug: 'UNEXPECTED ERROR',
      message: err?.message || String(err),
      stack:   err?.stack,
    });
  }
}
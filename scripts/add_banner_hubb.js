const { Client } = require('pg');
require('dotenv').config();

(async () => {
  const c = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '6543', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'postgres',
    ssl: { rejectUnauthorized: false }
  });
  await c.connect();
  const exists = await c.query("SELECT id FROM public.banners WHERE cta_link LIKE '%instagram.com/hubboficial%'");
  if (exists.rows.length === 0) {
    await c.query(
      `INSERT INTO public.banners (title, description, badge_text, cta_text, cta_link, image_url, theme, active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, 0)`,
      [
        'HÜBB Mercados Autônomos 24h',
        'Siga @hubboficial no Instagram',
        'Anúncio',
        'Ver Instagram',
        'https://www.instagram.com/hubboficial/',
        'https://trampou.jw.tec.br/banner-hubb.jpg',
        'amber-deal'
      ]
    );
    console.log('✅ Banner HUBB inserido.');
  } else {
    console.log('ℹ️ Banner HUBB já existe.');
  }
  const r = await c.query('SELECT title, image_url, cta_link, active, sort_order FROM public.banners ORDER BY sort_order');
  console.table(r.rows);
  await c.end();
})();


const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function seedDemoAds() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('✅ Connected to PG');

  // Deleta demonstrações anteriores para não duplicar
  await client.query(`DELETE FROM public.banners WHERE advertiser_name IN ('Carajás Caçambas & Locações', 'Parauapebas Ferramentas', 'Carajás Tintas & Materiais', 'Comercial Parauapebas Materiais');`);

  const insertSql = `
    INSERT INTO public.banners (
      title, description, badge_text, cta_text, cta_link, image_url, theme,
      active, sort_order, display_seconds, advertiser_name, advertiser_phone,
      placement, target_scope, target_state, target_city, target_audience,
      status, views_count, clicks_count, amount_paid, starts_at
    ) VALUES 
    (
      'Disk Caçambas & Entulho Carajás',
      'Locação de caçambas estacionárias 24h para obras e reformas em toda Parauapebas. Descarte legalizado.',
      'Patrocinado',
      'Pedir Caçamba',
      'https://wa.me/5594991234567?text=Ola%20vi%20no%20Trampou%20e%20gostaria%20de%20alugar%20uma%20cacamba',
      'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=700&q=80',
      'purple-viral',
      true, 1, 5, 'Carajás Caçambas & Locações', '(94) 99123-4567',
      'home_feed', 'city', 'PA', 'Parauapebas', 'all',
      'active', 120, 14, 120.00, now()
    ),
    (
      'Mundo das Ferramentas & Andaimes',
      'Locação de betoneiras, marteletes, compactadores e andaimes com entrega expressa na sua obra.',
      'Patrocinado',
      'Ver Catálogo',
      'https://wa.me/5594981112233?text=Ola%20vi%20no%20Trampou%20e%20gostaria%20do%20catalogo%20de%20locacao',
      'https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&w=400&q=80',
      'blue-corporate',
      true, 1, 5, 'Parauapebas Ferramentas', '(94) 98111-2233',
      'search_sponsored', 'city', 'PA', 'Parauapebas', 'all',
      'active', 85, 9, 89.90, now()
    ),
    (
      'Carajás Tintas & Iluminação LED',
      'Parceiro Oficial de Reformas: Ganhe 10% de desconto em tintas e materiais elétricos com seu orçamento Trampou.',
      'Empresa Parceira',
      'Resgatar 10% OFF',
      'https://wa.me/5594982223344?text=Ola%20vi%20no%20Trampou%20e%20quero%20o%20cupom%20de%2010%25',
      'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=800&q=80',
      'amber-deal',
      true, 1, 5, 'Carajás Tintas & Materiais', '(94) 98222-3344',
      'profile_footer', 'city', 'PA', 'Parauapebas', 'all',
      'active', 42, 6, 49.90, now()
    ),
    (
      'Comercial Construção & Elétrica 24h',
      'Cimento, fios, disjuntores, pisos e acabamentos com entrega rápida em toda a cidade.',
      'Super Parceiro',
      'Fazer Cotação',
      'https://wa.me/5594993334455?text=Ola%20vi%20no%20Trampou%20e%20preciso%20de%20uma%20cotacao',
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
      'amber-deal',
      true, 3, 5, 'Comercial Parauapebas Materiais', '(94) 99333-4455',
      'home_carousel', 'city', 'PA', 'Parauapebas', 'all',
      'active', 210, 18, 250.00, now()
    );
  `;

  await client.query(insertSql);
  console.log('✅ Model ads inserted successfully!');

  const check = await client.query(`SELECT placement, title, advertiser_name FROM public.banners;`);
  console.table(check.rows);

  await client.end();
}

seedDemoAds().catch(console.error);


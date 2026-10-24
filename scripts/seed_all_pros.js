require('dotenv').config();
const { Client } = require('pg');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALL_PROS = [
  {
    email: 'carlos@goparauapebas.com',
    password: 'senha123456',
    name: 'Carlos Eduardo',
    role: 'professional',
    phone: '(94) 99123-4567',
    avatar: 'carlos_avatar.png',
    categorySlug: 'eletricista',
    specialty: 'Eletricista residencial e predial',
    neighborhood: 'Cidade Nova',
    bio: 'Serviços residenciais e comerciais. Instalações, iluminação, quadros elétricos e chuveiros.',
    rating: 4.9,
    ratingCount: 28,
    yearsExp: 8,
    skills: ['Quadro de Distribuição', 'Instalação de Tomadas', 'Iluminação LED', 'Chuveiro Elétrico', 'Padrão Equatorial'],
    servedNeighborhoods: ['Cidade Nova', 'Rio Verde', 'União', 'Nova Carajás', 'Beira Rio', 'Da Paz']
  },
  {
    email: 'valdaci@goparauapebas.com',
    password: 'senha123456',
    name: 'Valdaci Reboque & Mecânica',
    role: 'professional',
    phone: '(94) 98122-3344',
    avatar: 'valdaci_avatar.png',
    categorySlug: 'mecanico',
    specialty: 'Auto socorro, reboque e mecânica de emergência',
    neighborhood: 'Rio Verde',
    bio: 'Socorro automotivo 24h em Parauapebas e rodovias PA-275 e PA-160. Guincho plataforma e socorro rápido.',
    rating: 4.95,
    ratingCount: 42,
    yearsExp: 12,
    skills: ['Reboque Plataforma', 'Troca de Pneu', 'Carga de Bateria', 'Mecânica Rápida', 'Socorro 24h'],
    servedNeighborhoods: ['Rio Verde', 'Cidade Nova', 'Carajás', 'Zona Urbana', 'Rodovias PA-275 e PA-160']
  },
  {
    email: 'beto@goparauapebas.com',
    password: 'senha123456',
    name: 'Beto Mecânico',
    role: 'professional',
    phone: '(94) 99234-5678',
    avatar: 'mecanico_avatar.png',
    categorySlug: 'mecanico',
    specialty: 'Mecânica geral e injeção eletrônica',
    neighborhood: 'Cidade Nova',
    bio: 'Diagnóstico computadorizado, suspensão, freios, troca de óleo e manutenção preventiva.',
    rating: 4.85,
    ratingCount: 19,
    yearsExp: 10,
    skills: ['Injeção Eletrônica', 'Freios e ABS', 'Suspensão', 'Embreagem', 'Troca de Óleo'],
    servedNeighborhoods: ['Cidade Nova', 'União', 'Beira Rio', 'Nova Vida']
  },
  {
    email: 'anapaula@goparauapebas.com',
    password: 'senha123456',
    name: 'Ana Paula Faxinas',
    role: 'professional',
    phone: '(94) 99199-8877',
    avatar: 'diarista_avatar.png',
    categorySlug: 'diarista',
    specialty: 'Diarista residencial e pós-obra',
    neighborhood: 'Nova Carajás',
    bio: 'Limpeza pesada, residencial, comercial e higienização detalhada com máxima confiança e referências.',
    rating: 5.0,
    ratingCount: 35,
    yearsExp: 6,
    skills: ['Faxina Residencial', 'Limpeza Pós-Obra', 'Passadoria de Roupas', 'Organização de Ambientes'],
    servedNeighborhoods: ['Nova Carajás', 'Cidade Nova', 'Carajás', 'Beira Rio']
  },
  {
    email: 'marcos@goparauapebas.com',
    password: 'senha123456',
    name: 'Marcos Vinícius Climatização',
    role: 'professional',
    phone: '(94) 99311-4455',
    avatar: 'ar_avatar.png',
    categorySlug: 'ar-condicionado',
    specialty: 'Instalação e higienização de Ar-Condicionado',
    neighborhood: 'União',
    bio: 'Higienização química bactericida, instalação padrão, recarga de gás R410A e manutenção preventiva.',
    rating: 4.9,
    ratingCount: 22,
    yearsExp: 7,
    skills: ['Higienização Bactericida', 'Instalação Split', 'Recarga de Gás', 'Reparo de Placa Inverter'],
    servedNeighborhoods: ['União', 'Cidade Nova', 'Rio Verde', 'Nova Carajás']
  },
  {
    email: 'roberto@goparauapebas.com',
    password: 'senha123456',
    name: 'Roberto Silva Mestre de Obras',
    role: 'professional',
    phone: '(94) 99422-5566',
    avatar: 'pedreiro_avatar.png',
    categorySlug: 'pedreiro',
    specialty: 'Pedreiro, reformas e acabamentos',
    neighborhood: 'Beira Rio',
    bio: 'Alvenaria, assentamento de porcelanato, contrapiso, reboco e reformas completas.',
    rating: 4.8,
    ratingCount: 16,
    yearsExp: 15,
    skills: ['Assentamento Porcelanato', 'Reboco e Alvenaria', 'Telhado', 'Hidráulica Básica'],
    servedNeighborhoods: ['Beira Rio', 'Cidade Nova', 'Rio Verde', 'Da Paz']
  }
];

async function seedAll() {
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await pgClient.connect();

  console.log('Fetching categories...');
  const catRes = await pgClient.query('SELECT id, slug FROM categories');
  const catMap = {};
  catRes.rows.forEach(c => { catMap[c.slug] = c.id; });

  for (const pro of ALL_PROS) {
    try {
      console.log(`Processing ${pro.email}...`);
      // 1. Check if auth user exists
      const existingRes = await pgClient.query('SELECT id FROM auth.users WHERE email = $1', [pro.email]);
      let userId;
      if (existingRes.rows.length > 0) {
        userId = existingRes.rows[0].id;
        console.log(`User ${pro.email} already exists: ${userId}`);
      } else {
        // Create user via Admin API
        const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`
          },
          body: JSON.stringify({
            email: pro.email,
            password: pro.password,
            email_confirm: true,
            user_metadata: {
              full_name: pro.name,
              role: pro.role,
              phone_whatsapp: pro.phone,
              avatar_url: pro.avatar
            }
          })
        });
        const created = await createRes.json();
        userId = created.id;
        console.log(`Created auth user ${pro.email}: ${userId}`);
      }

      // 2. Update profiles table with verified status, rating, neighborhood, bio
      await pgClient.query(`
        UPDATE profiles
        SET full_name = $1,
            phone_whatsapp = $2,
            avatar_url = $3,
            neighborhood = $4,
            bio = $5,
            is_verified = true,
            rating_average = $6,
            rating_count = $7,
            updated_at = NOW()
        WHERE id = $8;
      `, [pro.name, pro.phone, pro.avatar, pro.neighborhood, pro.bio, pro.rating, pro.ratingCount, userId]);

      // 3. Upsert professional_profiles
      const catId = catMap[pro.categorySlug] || null;
      await pgClient.query(`
        INSERT INTO professional_profiles (
          id, profile_id, category_id, skills, years_experience, 
          price_estimate_type, min_price, served_neighborhoods, 
          service_modality, available_now, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, 
          'hourly', 100.00, $5, 
          'both', true, NOW(), NOW()
        )
        ON CONFLICT (profile_id) DO UPDATE
        SET category_id = EXCLUDED.category_id,
            skills = EXCLUDED.skills,
            years_experience = EXCLUDED.years_experience,
            served_neighborhoods = EXCLUDED.served_neighborhoods,
            available_now = true,
            updated_at = NOW();
      `, [userId, catId, pro.skills, pro.yearsExp, pro.servedNeighborhoods]);

      console.log(`✅ ${pro.name} synced to database.`);
    } catch (err) {
      console.error(`Error with ${pro.email}:`, err);
    }
  }

  await pgClient.end();
  console.log('All professionals seeded into Supabase!');
}

seedAll();

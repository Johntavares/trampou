const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function applyMigration() {
  const clientConfig = process.env.DB_HOST ? {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '6543', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'postgres',
    ssl: { rejectUnauthorized: false }
  } : {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  };

  console.log('🔌 Conectando ao PostgreSQL do Supabase...');
  const client = new Client(clientConfig);

  try {
    await client.connect();
    console.log('✅ Conexão estabelecida com sucesso!');

    const migrationPath = path.join(__dirname, '../supabase/migrations/009_simplify_city_location_and_pro_sync.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📜 Executando migração: 009_simplify_city_location_and_pro_sync.sql...');
    await client.query(sql);
    console.log('✅ Migração 009 aplicada com sucesso!');

    const prosCheck = await client.query(`
      SELECT p.id, p.full_name, p.role, p.city, p.state, p.neighborhood, pp.skills, pp.service_cities
      FROM public.profiles p
      LEFT JOIN public.professional_profiles pp ON pp.profile_id = p.id
      ORDER BY p.created_at DESC;
    `);
    console.log('📋 Perfis atualizados:');
    console.table(prosCheck.rows);
  } catch (err) {
    console.error('❌ Erro aplicando migração 009:', err);
  } finally {
    await client.end();
  }
}

applyMigration();


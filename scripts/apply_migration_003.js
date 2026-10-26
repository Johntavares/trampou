const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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

    const migrationPath = path.join(__dirname, '../supabase/migrations/003_admin_banners_monetization.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📜 Executando migração: 003_admin_banners_monetization.sql...');
    await client.query(sql);
    console.log('✅ Migração 003_admin_banners_monetization.sql aplicada com sucesso!');

    const bannerCount = await client.query('SELECT count(*) FROM public.banners;');
    console.log('📢 Total de banners cadastrados:', bannerCount.rows[0].count);

  } catch (err) {
    console.error('❌ Erro aplicando migração 003:', err.message);
  } finally {
    await client.end();
  }
}

applyMigration();

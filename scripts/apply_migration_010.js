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

    const migrationPath = path.join(__dirname, '../supabase/migrations/010_sync_portfolio_items_and_services.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📜 Executando migração: 010_sync_portfolio_items_and_services.sql...');
    await client.query(sql);
    console.log('✅ Migração 010 aplicada com sucesso!');

    const portfolioCheck = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'portfolio_items'
      ORDER BY ordinal_position;
    `);
    console.log('📋 Estrutura de public.portfolio_items:');
    console.table(portfolioCheck.rows);
  } catch (err) {
    console.error('❌ Erro aplicando migração 010:', err);
  } finally {
    await client.end();
  }
}

applyMigration();


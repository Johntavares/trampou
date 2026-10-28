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

    const migrationPath = path.join(__dirname, '../supabase/migrations/005_app_feedbacks_suggestions.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📜 Executando migração: 005_app_feedbacks_suggestions.sql...');
    await client.query(sql);
    console.log('✅ Migração 005_app_feedbacks_suggestions.sql aplicada com sucesso!');

    const tableCheck = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'app_feedbacks';
    `);
    console.log('📋 Colunas na tabela app_feedbacks:');
    console.table(tableCheck.rows);

  } catch (err) {
    console.error('❌ Erro aplicando migração:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();

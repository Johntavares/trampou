const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function deployDatabase() {
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
    console.log('✅ Conexão bem-sucedida!');

    // Inicia transação
    await client.query('BEGIN;');

    // 1. Schema
    const schemaSql = fs.readFileSync(path.join(__dirname, '../database/database_schema.sql'), 'utf8');
    console.log('📜 Executando database_schema.sql...');
    await client.query(schemaSql);

    // 2. Security (RLS)
    const securitySql = fs.readFileSync(path.join(__dirname, '../database/database_security.sql'), 'utf8');
    console.log('🔒 Executando database_security.sql...');
    await client.query(securitySql);

    // 3. Seed
    const seedSql = fs.readFileSync(path.join(__dirname, '../database/database_seed.sql'), 'utf8');
    console.log('🌱 Executando database_seed.sql...');
    await client.query(seedSql);

    await client.query('COMMIT;');
    console.log('🎉 Migração remota concluída e confirmada com sucesso!');

    // Verificação de tabelas
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('\n📋 Tabelas ativas no banco:');
    res.rows.forEach(r => console.log(`   ✔ ${r.table_name}`));

  } catch (error) {
    await client.query('ROLLBACK;');
    console.error('❌ Erro durante o deploy (transação revertida):', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

deployDatabase();

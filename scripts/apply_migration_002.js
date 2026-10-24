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

    const migrationPath = path.join(__dirname, '../supabase/migrations/002_chat_attendances.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📜 Executando migração: 002_chat_attendances.sql...');
    await client.query(sql);
    console.log('✅ Migração 002_chat_attendances.sql aplicada com sucesso!');

    // Verificar se a tabela foi criada e a coluna adicionada em reviews
    const tableCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'service_attendances'
      ORDER BY ordinal_position;
    `);
    console.log('📋 Colunas de service_attendances:');
    console.table(tableCheck.rows);

    const reviewCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'attendance_id';
    `);
    console.log('📋 Coluna attendance_id em reviews:', reviewCheck.rows);

  } catch (err) {
    console.error('❌ Erro aplicando migração:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();

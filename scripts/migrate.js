const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
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

    // 1. Executar 001_initial_schema.sql
    const schemaPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('📜 Executando migração: 001_initial_schema.sql...');
    await client.query(schemaSql);
    console.log('✅ Schema e políticas RLS criados com sucesso!');

    // 2. Executar seed.sql
    const seedPath = path.join(__dirname, '../supabase/seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    console.log('🌱 Populando dados iniciais: seed.sql...');
    await client.query(seedSql);
    console.log('✅ Categorias de Parauapebas inseridas com sucesso!');

    // 3. Checar contagem de tabelas e categorias
    const catResult = await client.query('SELECT count(*) FROM public.categories;');
    console.log(`📊 Total de categorias cadastradas: ${catResult.rows[0].count}`);

    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('📋 Tabelas criadas no banco public:');
    tablesResult.rows.forEach(r => console.log(`   - ${r.table_name}`));

    console.log('\n🎉 Banco de dados do GO Parauapebas 100% configurado e operacional!');
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();

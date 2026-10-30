const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Uso: node scripts/apply_migration.js 012_realtime_banners.sql
(async () => {
  const file = process.argv[2];
  if (!file) {
    console.error('Informe o arquivo da migração. Ex: node scripts/apply_migration.js 012_realtime_banners.sql');
    process.exit(1);
  }
  const c = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '6543', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'postgres',
    ssl: { rejectUnauthorized: false }
  });
  await c.connect();
  const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations', file), 'utf8');
  await c.query(sql);
  console.log(`✅ Migração ${file} aplicada.`);
  const r = await c.query("SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename");
  console.log('Tabelas com Realtime:', r.rows.map(x => x.tablename).join(', '));
  await c.end();
})();


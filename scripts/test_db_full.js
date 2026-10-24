const { Client } = require('pg');
require('dotenv').config();

async function inspectPro() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('--- PROFESSIONAL_PROFILES COLUMNS ---');
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'professional_profiles'
      ORDER BY ordinal_position;
    `);
    console.table(cols.rows);

    console.log('--- CATEGORIES ---');
    const cats = await client.query(`SELECT id, name, slug FROM categories ORDER BY name`);
    console.table(cats.rows);

    console.log('--- PROFILES role ENUM ---');
    const enumRes = await client.query(`
      SELECT e.enumlabel
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname = 'user_role' OR t.typname = 'role';
    `);
    console.table(enumRes.rows);

  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

inspectPro();

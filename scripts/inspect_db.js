const { Client } = require('pg');
require('dotenv').config();

async function inspect() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const cols = await client.query(`
    SELECT table_name, column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name IN ('profiles', 'reviews', 'service_requests') 
    ORDER BY table_name, ordinal_position;
  `);
  console.log('--- COLUMNS ---');
  console.table(cols.rows);

  const constrs = await client.query(`
    SELECT tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name IN ('profiles', 'reviews', 'service_requests')
    ORDER BY tc.table_name, tc.constraint_name;
  `);
  console.log('--- CONSTRAINTS ---');
  console.table(constrs.rows);

  await client.end();
}

inspect().catch(console.error);

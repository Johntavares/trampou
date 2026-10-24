const { Client } = require('pg');
require('dotenv').config();

async function checkCols() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles'
      ORDER BY ordinal_position;
    `);
    console.table(cols.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

checkCols();

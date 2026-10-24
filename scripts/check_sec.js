const { Client } = require('pg');
require('dotenv').config();

async function checkSecurity() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT p.proname, p.prosecdef, pg_get_functiondef(p.oid) as def
      FROM pg_proc p
      WHERE p.proname = 'handle_new_user';
    `);
    console.log(res.rows[0]);
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

checkSecurity();

const { Client } = require('pg');
require('dotenv').config();

async function checkOwner() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT p.proname, r.rolname as owner
      FROM pg_proc p
      JOIN pg_roles r ON p.proowner = r.oid
      WHERE p.proname = 'handle_new_user';
    `);
    console.log('Function owner:', res.rows[0]);

    const tabRes = await client.query(`
      SELECT c.relname, r.rolname as owner
      FROM pg_class c
      JOIN pg_roles r ON c.relowner = r.oid
      WHERE c.relname = 'profiles';
    `);
    console.log('Table owner:', tabRes.rows[0]);
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

checkOwner();

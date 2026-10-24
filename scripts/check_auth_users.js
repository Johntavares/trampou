const { Client } = require('pg');
require('dotenv').config();

async function checkAuthUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT id, email, created_at, raw_user_meta_data
      FROM auth.users;
    `);
    console.log('--- AUTH USERS ---');
    console.table(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

checkAuthUsers();

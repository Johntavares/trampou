const { Client } = require('pg');
require('dotenv').config();

async function checkFunc() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT routine_name, routine_definition
      FROM information_schema.routines
      WHERE routine_name = 'handle_new_user';
    `);
    console.log(res.rows[0]);
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

checkFunc();

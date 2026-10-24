const { Client } = require('pg');
require('dotenv').config();

async function showProfiles() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const profs = await client.query(`SELECT id, full_name, role, phone_whatsapp, avatar_url, city, state FROM profiles`);
    console.table(profs.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

showProfiles();

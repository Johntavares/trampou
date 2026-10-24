const { Client } = require('pg');
require('dotenv').config();

async function testInsert() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Check if user_role type accepts 'client'
    const testUuid = '00000000-0000-0000-0000-000000000001';
    
    console.log('Testing INSERT into public.profiles with dummy uuid...');
    try {
      await client.query(`
        INSERT INTO public.profiles (id, full_name, role, avatar_url, phone_whatsapp)
        VALUES ($1, $2, $3::user_role, $4, $5);
      `, [testUuid, 'Teste', 'client', null, null]);
      console.log('Insert succeeded!');
      await client.query(`DELETE FROM public.profiles WHERE id = $1`, [testUuid]);
    } catch (err) {
      console.log('Direct insert error:', err.message, err.detail, err.hint);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

testInsert();

const { Client } = require('pg');
require('dotenv').config();

async function checkRLS() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const policies = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);
    console.log('--- POLICIES ---');
    console.table(policies.rows);

    const rlsStatus = await client.query(`
      SELECT relname, relrowsecurity, relforcerowsecurity
      FROM pg_class
      WHERE relnamespace = 'public'::regnamespace
        AND relkind = 'r'
      ORDER BY relname;
    `);
    console.log('--- RLS ENABLED STATUS ---');
    console.table(rlsStatus.rows);

  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

checkRLS();

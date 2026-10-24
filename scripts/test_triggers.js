const { Client } = require('pg');
require('dotenv').config();

async function checkTriggers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const triggers = await client.query(`
      SELECT event_object_schema, event_object_table, trigger_name, action_statement, action_orientation, action_timing
      FROM information_schema.triggers
      ORDER BY event_object_table, trigger_name;
    `);
    console.log('--- TRIGGERS ---');
    console.table(triggers.rows);

    const procs = await client.query(`
      SELECT routine_name, routine_definition
      FROM information_schema.routines
      WHERE routine_schema = 'public';
    `);
    console.log('--- FUNCTIONS ---');
    console.table(procs.rows.map(r => ({ name: r.routine_name })));

  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

checkTriggers();

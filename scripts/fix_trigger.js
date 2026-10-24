const { Client } = require('pg');
require('dotenv').config();

async function fixTrigger() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Fixing handle_new_user function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
          INSERT INTO public.profiles (id, full_name, role, avatar_url, phone_whatsapp)
          VALUES (
              NEW.id,
              COALESCE(NEW.raw_user_meta_data->>'full_name', 'Novo Usuário'),
              COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'client'::public.user_role),
              NEW.raw_user_meta_data->>'avatar_url',
              NEW.raw_user_meta_data->>'phone_whatsapp'
          );
          RETURN NEW;
      END;
      $$;
    `);
    console.log('Function public.handle_new_user updated successfully with SET search_path = public.');
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

fixTrigger();

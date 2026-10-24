require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function seedTestUsers() {
  console.log('Seeding initial test users into Supabase...');

  const usersToCreate = [
    {
      email: 'carlos@goparauapebas.com',
      password: 'senha123456',
      email_confirm: true,
      user_metadata: {
        full_name: 'Carlos Eduardo',
        role: 'professional',
        phone_whatsapp: '(94) 99123-4567',
        avatar_url: 'carlos_avatar.png'
      }
    },
    {
      email: 'cliente@goparauapebas.com',
      password: 'senha123456',
      email_confirm: true,
      user_metadata: {
        full_name: 'John Tavares (Cliente)',
        role: 'client',
        phone_whatsapp: '(94) 98111-2233',
        avatar_url: ''
      }
    },
    {
      email: 'beto@goparauapebas.com',
      password: 'senha123456',
      email_confirm: true,
      user_metadata: {
        full_name: 'Beto Mecânico',
        role: 'professional',
        phone_whatsapp: '(94) 99234-5678',
        avatar_url: 'mecanico_avatar.png'
      }
    }
  ];

  for (const u of usersToCreate) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`
        },
        body: JSON.stringify(u)
      });

      const data = await res.json();
      if (res.ok) {
        console.log(`✅ Created user ${u.email}:`, data.id);
      } else {
        console.log(`⚠️ User ${u.email}:`, data.message || data);
      }
    } catch (e) {
      console.error(`Error creating ${u.email}:`, e);
    }
  }
}

seedTestUsers();

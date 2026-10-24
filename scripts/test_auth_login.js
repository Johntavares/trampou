require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testLogin(email, password) {
  console.log(`Testing login for ${email}...`);
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY
    },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (res.ok) {
    console.log(`✅ Login SUCCESS for ${email}! User ID: ${data.user.id}, Role: ${data.user.user_metadata?.role}`);
    
    // Now fetch profile
    const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${data.user.id}&select=*`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${data.access_token}`
      }
    });
    const profile = await profRes.json();
    console.log('Profile data from Supabase:', profile);
  } else {
    console.log(`❌ Login FAILED for ${email}:`, data.error_description || data.message || data);
  }
}

async function run() {
  await testLogin('carlos@goparauapebas.com', 'senha123456');
  await testLogin('cliente@goparauapebas.com', 'senha123456');
  await testLogin('carlos@goparauapebas.com', 'senha_errada');
}

run();

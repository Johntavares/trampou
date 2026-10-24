require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testFrontendAuthLogic(identifier, password) {
  let supabaseSuccess = false;
  let authUser = null;
  let authSessionToken = null;
  let profileData = null;

  if (identifier.includes('@')) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ email: identifier.trim().toLowerCase(), password })
      });

      if (res.ok) {
        const data = await res.json();
        supabaseSuccess = true;
        authUser = data.user;
        authSessionToken = data.access_token;

        const pRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${authUser.id}&select=*`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${authSessionToken}`
          }
        });
        if (pRes.ok) {
          const pData = await pRes.json();
          if (Array.isArray(pData) && pData.length > 0) profileData = pData[0];
        }
      }
    } catch (e) {
      console.warn('Network error:', e.message);
    }
  }

  // Local fallback
  const localUsers = [];
  const matchedLocal = localUsers.find(u => 
    (u.email.toLowerCase() === identifier.toLowerCase().trim() || u.phone === identifier.trim()) && 
    u.password === password
  );

  if (supabaseSuccess || matchedLocal) {
    const role = (profileData && profileData.role) || (authUser.user_metadata && authUser.user_metadata.role) || 'client';
    const fullName = (profileData && profileData.full_name) || (authUser.user_metadata && authUser.user_metadata.full_name);
    return {
      success: true,
      user: {
        id: authUser.id,
        name: fullName,
        role: role,
        phone: profileData?.phone_whatsapp
      }
    };
  } else {
    return {
      success: false,
      error: 'E-mail/telefone ou senha incorretos. Por favor, verifique seus dados ou crie uma conta.'
    };
  }
}

async function run() {
  console.log('1. Teste Carlos (Profissional) com credenciais reais:');
  const res1 = await testFrontendAuthLogic('carlos@goparauapebas.com', 'senha123456');
  console.log('Resultado 1:', res1);

  console.log('\n2. Teste Cliente com credenciais reais:');
  const res2 = await testFrontendAuthLogic('cliente@goparauapebas.com', 'senha123456');
  console.log('Resultado 2:', res2);

  console.log('\n3. Teste com senha incorreta (deve falhar):');
  const res3 = await testFrontendAuthLogic('carlos@goparauapebas.com', 'senhaerrada123');
  console.log('Resultado 3:', res3);

  console.log('\n4. Teste com e-mail inexistente (deve falhar):');
  const res4 = await testFrontendAuthLogic('desconhecido@exemplo.com', '123456');
  console.log('Resultado 4:', res4);
}

run();

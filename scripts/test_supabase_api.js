require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testSupabase() {
  console.log('Testing Supabase REST endpoint:');
  console.log('URL:', SUPABASE_URL);

  try {
    // 1. Test Categories fetch
    const catRes = await fetch(`${SUPABASE_URL}/rest/v1/categories?select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    console.log('Categories status:', catRes.status);
    if (catRes.ok) {
      const cats = await catRes.json();
      console.log('Categories count:', cats.length, cats.slice(0, 3));
    } else {
      console.log('Categories error:', await catRes.text());
    }

    // 2. Test Profiles fetch
    const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    console.log('Profiles status:', profRes.status);
    if (profRes.ok) {
      const profs = await profRes.json();
      console.log('Profiles count:', profs.length);
    } else {
      console.log('Profiles error:', await profRes.text());
    }

  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testSupabase();

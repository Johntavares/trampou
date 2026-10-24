require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testCatQuery() {
  const urlWithDisplayOrder = `${SUPABASE_URL}/rest/v1/categories?select=id,name,slug,icon_name&active=eq.true&order=display_order.asc`;
  const res1 = await fetch(urlWithDisplayOrder, {
    headers: { 'apikey': SUPABASE_ANON_KEY }
  });
  console.log('With display_order status:', res1.status, await res1.text());

  const urlWithName = `${SUPABASE_URL}/rest/v1/categories?select=id,name,slug,icon_name&active=eq.true&order=name.asc`;
  const res2 = await fetch(urlWithName, {
    headers: { 'apikey': SUPABASE_ANON_KEY }
  });
  console.log('With name.asc status:', res2.status, (await res2.json()).length, 'categories returned!');
}

testCatQuery();

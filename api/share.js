const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://txcmnqisfwekmhihdutt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Y21ucWlzZndla21oaWhkdXR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjMyNDc4MywiZXhwIjoyMTA3OTAwNzgzfQ.GkTfFTH7PX-5I0qTFFu1w-bwmHZgyjE5rkudXXufe-0';
const BASE_APP_URL = 'https://trampou.jw.tec.br';
const DEFAULT_BANNER = `${BASE_APP_URL}/banner-share-og.jpg`;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');

  const proId = (req.query && (req.query.id || req.query.pro || req.query.u)) || '';

  // Se não foi informado ID, compartilha o app oficial geral
  if (!proId) {
    return res.status(200).send(renderHtml({
      title: 'Trampou — Serviços e Profissionais em Parauapebas',
      description: 'Encontre eletricistas, encanadores, diaristas e profissionais de confiança em Parauapebas/PA. Toque para conhecer!',
      image: DEFAULT_BANNER,
      redirectUrl: `${BASE_APP_URL}/`
    }));
  }

  try {
    let proName = 'Profissional';
    let proCategory = 'Serviços';
    let proAvatar = DEFAULT_BANNER;
    let proCity = 'Parauapebas, PA';
    let proRating = '5.0';

    // 1. Consulta no Supabase
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

      // Busca na tabela profiles pelo ID (uuid)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, role, avatar_url, city, state, professional_profiles(category, specialty, rating, bio)')
        .eq('id', proId)
        .single();

      if (profile) {
        proName = profile.full_name || proName;
        const details = Array.isArray(profile.professional_profiles) 
          ? (profile.professional_profiles[0] || {}) 
          : (profile.professional_profiles || {});
        proCategory = details.specialty || details.category || proCategory;
        if (details.rating) proRating = Number(details.rating).toFixed(1);
        if (profile.city) proCity = `${profile.city}, ${profile.state || 'PA'}`;
        if (profile.avatar_url && profile.avatar_url.startsWith('http')) {
          proAvatar = profile.avatar_url;
        }
      }
    } catch (dbErr) {
      console.warn('Aviso ao consultar perfil no banco para share:', dbErr.message);
    }

    const shareTitle = `${proName} • ${proCategory} no Trampou`;
    const shareDesc = `⭐ ${proRating} • Conheça meu perfil profissional no Trampou com fotos de serviços e avaliações em ${proCity}. Toque para ver!`;
    const redirectUrl = `${BASE_APP_URL}/#pro/${encodeURIComponent(proId)}`;

    return res.status(200).send(renderHtml({
      title: shareTitle,
      description: shareDesc,
      image: proAvatar,
      redirectUrl: redirectUrl
    }));

  } catch (err) {
    console.error('Erro em api/share:', err);
    return res.status(200).send(renderHtml({
      title: 'Trampou — Profissionais Perto de Você',
      description: 'Encontre profissionais de confiança em Parauapebas/PA.',
      image: DEFAULT_BANNER,
      redirectUrl: `${BASE_APP_URL}/`
    }));
  }
};

function renderHtml({ title, description, image, redirectUrl }) {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const safeRedirect = escapeHtml(redirectUrl);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">

  <!-- Open Graph / WhatsApp / Facebook Preview -->
  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="Trampou">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:image" content="${safeImage}">
  <meta property="og:image:secure_url" content="${safeImage}">
  <meta property="og:image:width" content="600">
  <meta property="og:image:height" content="600">
  <meta property="og:url" content="${safeRedirect}">

  <!-- Twitter Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeImage}">

  <!-- Redirecionamento Automático para o App -->
  <meta http-equiv="refresh" content="0;url=${safeRedirect}">
  <script>
    window.location.replace("${safeRedirect}");
  </script>
</head>
<body style="margin: 0; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0F172A; color: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; text-align: center;">
  <div style="max-width: 400px; padding: 24px; background: #1E293B; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
    <img src="${safeImage}" alt="${safeTitle}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; margin-bottom: 16px; border: 3px solid #7C3AED;">
    <h2 style="font-size: 18px; margin: 0 0 8px 0; color: #FFFFFF;">${safeTitle}</h2>
    <p style="font-size: 13px; color: #94A3B8; margin: 0 0 20px 0; line-height: 1.4;">${safeDesc}</p>
    <a href="${safeRedirect}" style="display: inline-block; background: linear-gradient(135deg, #7C3AED, #4F46E5); color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 10px;">
      Abrir Perfil no Trampou
    </a>
  </div>
</body>
</html>`;
}


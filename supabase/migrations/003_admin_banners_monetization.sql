-- =========================================================
-- MIGRAÇÃO 003: TABELAS DE BANNERS E MONETIZAÇÃO DO TRAMPOU
-- =========================================================

-- 1. TABELA DE BANNERS DE ANÚNCIOS
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  badge_text TEXT DEFAULT 'Destaque',
  cta_text TEXT DEFAULT 'Saiba Mais',
  cta_link TEXT DEFAULT 'https://trampou.jw.tec.br/',
  image_url TEXT,
  theme TEXT DEFAULT 'purple-viral', -- 'purple-viral', 'emerald-pro', 'amber-deal', 'dark-gold'
  active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilita RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Política de leitura: Qualquer pessoa pode ver banners ativos no app
CREATE POLICY "Leitura pública de banners ativos"
  ON public.banners FOR SELECT
  USING (true);

-- Política de edição (para o painel administrativo gerenciar)
CREATE POLICY "Gerenciamento de banners para admin"
  ON public.banners FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. TABELA DE ASSINATURAS E MONETIZAÇÃO DE PROFISSIONAIS (PLANOS PRO)
CREATE TABLE IF NOT EXISTS public.pro_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES public.professional_profiles(id) ON DELETE SET NULL,
  pro_name TEXT,
  specialty TEXT,
  plan_name TEXT NOT NULL DEFAULT 'Plano Destaque PRO',
  amount_cents INT NOT NULL DEFAULT 4990, -- R$ 49,90
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'expired', 'pending', 'cancelled'
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + interval '30 days'),
  payment_method TEXT DEFAULT 'PIX',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilita RLS
ALTER TABLE public.pro_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de assinaturas pro"
  ON public.pro_subscriptions FOR SELECT
  USING (true);

CREATE POLICY "Gerenciamento de assinaturas pro"
  ON public.pro_subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. INSERÇÃO DO BANNER PADRÃO INICIAL (Divulgue Parauapebas)
INSERT INTO public.banners (title, description, badge_text, cta_text, cta_link, theme, active, sort_order)
VALUES (
  'Indique o Trampou para amigos e vizinhos!',
  'Ajude a valorizar os profissionais autônomos da nossa cidade. Compartilhe no WhatsApp!',
  'Divulgue Parauapebas',
  'Compartilhar App',
  'https://trampou.jw.tec.br/',
  'purple-viral',
  true,
  1
) ON CONFLICT DO NOTHING;

-- ==============================================================================
-- MIGRAÇÃO 015: Trampou Ads — Sistema de Publicidade Geo-Segmentada & Placements
-- - Suporte a múltiplos locais (Home Carousel, Home Feed, Busca, Perfil)
-- - Segmentação geográfica (Nacional, Estado, Cidade)
-- - Segmentação por público (Todos, Clientes, Profissionais)
-- - Fila de moderação e status (draft, pending_payment, pending_review, active, paused, rejected, expired)
-- - Contadores atômicos de visualizações (views_count) e cliques (clicks_count)
-- - Controle de datas (starts_at, expires_at) e valor pago (amount_paid)
-- ==============================================================================

-- 1. ADICIONA NOVAS COLUNAS NA TABELA BANNERS
ALTER TABLE public.banners
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS advertiser_name TEXT,
ADD COLUMN IF NOT EXISTS advertiser_phone TEXT,
ADD COLUMN IF NOT EXISTS placement TEXT NOT NULL DEFAULT 'home_carousel',
ADD COLUMN IF NOT EXISTS target_scope TEXT NOT NULL DEFAULT 'all',
ADD COLUMN IF NOT EXISTS target_state TEXT NOT NULL DEFAULT 'all',
ADD COLUMN IF NOT EXISTS target_city TEXT NOT NULL DEFAULT 'all',
ADD COLUMN IF NOT EXISTS target_audience TEXT NOT NULL DEFAULT 'all',
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS views_count BIGINT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS clicks_count BIGINT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 2. RESTRIÇÕES DE VALORES (CONSTRAINTS)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'banners_placement_check'
    ) THEN
        ALTER TABLE public.banners
        ADD CONSTRAINT banners_placement_check 
        CHECK (placement IN ('home_carousel', 'home_feed', 'search_sponsored', 'profile_footer'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'banners_target_scope_check'
    ) THEN
        ALTER TABLE public.banners
        ADD CONSTRAINT banners_target_scope_check 
        CHECK (target_scope IN ('all', 'national', 'state', 'city'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'banners_target_audience_check'
    ) THEN
        ALTER TABLE public.banners
        ADD CONSTRAINT banners_target_audience_check 
        CHECK (target_audience IN ('all', 'clients', 'professionals'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'banners_status_check'
    ) THEN
        ALTER TABLE public.banners
        ADD CONSTRAINT banners_status_check 
        CHECK (status IN ('draft', 'pending_payment', 'pending_review', 'active', 'paused', 'rejected', 'expired'));
    END IF;
END $$;

-- 3. ÍNDICES DE PERFORMANCE PARA CONSULTAS EM TEMPO REAL
CREATE INDEX IF NOT EXISTS idx_banners_placement_geo 
ON public.banners (active, status, placement, target_scope, target_state, target_city);

CREATE INDEX IF NOT EXISTS idx_banners_views_rotation 
ON public.banners (active, status, views_count);

CREATE INDEX IF NOT EXISTS idx_banners_user_id 
ON public.banners (user_id);

-- 4. FUNÇÃO RPC PARA INCREMENTO ATÔMICO DE VISUALIZAÇÕES (BATCH)
CREATE OR REPLACE FUNCTION public.increment_banner_views(p_banner_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_banner_ids IS NOT NULL AND array_length(p_banner_ids, 1) > 0 THEN
    UPDATE public.banners
    SET views_count = views_count + 1
    WHERE id = ANY(p_banner_ids);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_banner_views(UUID[]) TO anon, authenticated, service_role;

-- 5. FUNÇÃO RPC PARA INCREMENTO ATÔMICO DE CLIQUES
CREATE OR REPLACE FUNCTION public.increment_banner_click(p_banner_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.banners
  SET clicks_count = clicks_count + 1
  WHERE id = p_banner_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_banner_click(UUID) TO anon, authenticated, service_role;

-- 6. POLÍTICAS DE ACESSO (RLS)
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura pública de banners ativos" ON public.banners;
CREATE POLICY "Leitura pública de banners ativos"
  ON public.banners FOR SELECT
  USING (
    active = TRUE 
    AND status = 'active'
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (expires_at IS NULL OR expires_at > NOW())
  );

DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios anúncios" ON public.banners;
CREATE POLICY "Usuários podem gerenciar seus próprios anúncios"
  ON public.banners FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Gerenciamento de banners para admin" ON public.banners;
CREATE POLICY "Gerenciamento de banners para admin"
  ON public.banners FOR ALL
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- MIGRAÇÃO 010: SINCRONIZAÇÃO DE PORTFÓLIO DE FOTOS DE SERVIÇOS (TEMPO REAL)
-- ==============================================================================

-- 1. Garantir colunas extras em public.portfolio_items para categoria, local e curtidas
ALTER TABLE public.portfolio_items
ADD COLUMN IF NOT EXISTS service_category VARCHAR(120),
ADD COLUMN IF NOT EXISTS city_label VARCHAR(120),
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0 NOT NULL;

CREATE INDEX IF NOT EXISTS idx_portfolio_items_pro_id ON public.portfolio_items(professional_id, created_at DESC);

-- 2. Garantir leitura pública de todos os trabalhos do portfólio
DROP POLICY IF EXISTS "Portfólio visível publicamente" ON public.portfolio_items;
CREATE POLICY "Portfólio visível publicamente"
    ON public.portfolio_items FOR SELECT
    USING (true);

-- 3. RPC SECURITY DEFINER para publicar foto de serviço no portfólio do profissional
CREATE OR REPLACE FUNCTION public.add_portfolio_item(
    p_professional_id UUID,
    p_title TEXT,
    p_description TEXT DEFAULT '',
    p_image_url TEXT DEFAULT '',
    p_service_category TEXT DEFAULT 'Serviço Profissional',
    p_city_label TEXT DEFAULT 'Parauapebas, PA'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_id UUID;
BEGIN
    IF p_professional_id IS NULL OR COALESCE(TRIM(p_image_url), '') = '' THEN
        RAISE EXCEPTION 'ID do profissional e imagem são obrigatórios';
    END IF;

    INSERT INTO public.portfolio_items (
        professional_id,
        title,
        description,
        image_url,
        service_category,
        city_label,
        likes_count
    ) VALUES (
        p_professional_id,
        COALESCE(NULLIF(TRIM(p_title), ''), 'Serviço Realizado'),
        COALESCE(NULLIF(TRIM(p_description), ''), 'Serviço executado com qualidade e garantia.'),
        p_image_url,
        COALESCE(NULLIF(TRIM(p_service_category), ''), 'Serviço Profissional'),
        COALESCE(NULLIF(TRIM(p_city_label), ''), 'Parauapebas, PA'),
        0
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_portfolio_item TO anon, authenticated;

-- 4. RPC SECURITY DEFINER para excluir foto de serviço do portfólio
CREATE OR REPLACE FUNCTION public.delete_portfolio_item(
    p_item_id UUID,
    p_professional_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.portfolio_items
    WHERE id = p_item_id
      AND (professional_id = p_professional_id OR p_professional_id IS NULL);
    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_portfolio_item TO anon, authenticated;

-- 5. RPC SECURITY DEFINER para curtir/descurtir foto de serviço
CREATE OR REPLACE FUNCTION public.like_portfolio_item(
    p_item_id UUID,
    p_delta INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_likes INTEGER;
BEGIN
    UPDATE public.portfolio_items
    SET likes_count = GREATEST(0, COALESCE(likes_count, 0) + COALESCE(p_delta, 1))
    WHERE id = p_item_id
    RETURNING likes_count INTO v_likes;

    RETURN COALESCE(v_likes, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.like_portfolio_item TO anon, authenticated;

-- 6. Habilitar Realtime (WebSocket) para public.portfolio_items
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.portfolio_items;
EXCEPTION WHEN duplicate_object OR undefined_object THEN
    NULL;
END $$;


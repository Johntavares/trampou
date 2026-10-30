-- ==============================================================================
-- MIGRAÇÃO 011: Correção da Verificação de Profissionais pelo Painel Admin
-- Garante que o toggle de "Selo Verificado" no Admin salve em professional_profiles
-- e sincronize automaticamente com profiles.is_verified em tempo real
-- ==============================================================================

-- 1. Garantir que a coluna 'verified' exista em public.professional_profiles
ALTER TABLE public.professional_profiles
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false NOT NULL;

-- 2. Sincronizar status existentes entre profiles.is_verified e professional_profiles.verified
UPDATE public.professional_profiles pp
SET verified = true
FROM public.profiles p
WHERE pp.profile_id = p.id
  AND p.is_verified = true
  AND pp.verified = false;

UPDATE public.profiles p
SET is_verified = pp.verified
FROM public.professional_profiles pp
WHERE pp.profile_id = p.id
  AND p.is_verified IS DISTINCT FROM pp.verified;

-- 3. Liberar política de UPDATE em public.professional_profiles para o Painel Admin
DROP POLICY IF EXISTS "Admin pode atualizar verificacao e dados de profissionais" ON public.professional_profiles;
CREATE POLICY "Admin pode atualizar verificacao e dados de profissionais"
    ON public.professional_profiles FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- 4. Trigger SECURITY DEFINER para manter public.profiles.is_verified sempre sincronizado
--    quando public.professional_profiles.verified for alterado (via PATCH ou RPC)
CREATE OR REPLACE FUNCTION public.sync_professional_verified_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.verified IS DISTINCT FROM NEW.verified) THEN
        UPDATE public.profiles
        SET is_verified = COALESCE(NEW.verified, false),
            updated_at = NOW()
        WHERE id = NEW.profile_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_pro_verified_to_profile ON public.professional_profiles;
CREATE TRIGGER trg_sync_pro_verified_to_profile
    AFTER INSERT OR UPDATE OF verified ON public.professional_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_professional_verified_to_profile();

-- 5. Função RPC SECURITY DEFINER dedicada para o Admin alternar/definir o status de verificado
CREATE OR REPLACE FUNCTION public.admin_set_professional_verified(
    p_pro_id UUID,
    p_verified BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    -- Atualiza pelo id de professional_profiles ou pelo profile_id
    UPDATE public.professional_profiles
    SET verified = p_verified,
        updated_at = NOW()
    WHERE id = p_pro_id OR profile_id = p_pro_id
    RETURNING profile_id INTO v_profile_id;

    IF v_profile_id IS NOT NULL THEN
        UPDATE public.profiles
        SET is_verified = p_verified,
            updated_at = NOW()
        WHERE id = v_profile_id;
        RETURN p_verified;
    END IF;

    -- Caso tenha sido passado diretamente o id de public.profiles e ainda não exista linha em professional_profiles
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_pro_id) THEN
        UPDATE public.profiles
        SET is_verified = p_verified,
            updated_at = NOW()
        WHERE id = p_pro_id;

        INSERT INTO public.professional_profiles (profile_id, verified)
        VALUES (p_pro_id, p_verified)
        ON CONFLICT (profile_id) DO UPDATE
        SET verified = EXCLUDED.verified,
            updated_at = NOW();

        RETURN p_verified;
    END IF;

    RAISE EXCEPTION 'Profissional não encontrado para o ID informado: %', p_pro_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_professional_verified(UUID, BOOLEAN) TO anon, authenticated;

-- 6. Habilitar Realtime na tabela professional_profiles para refletir o selo imediatamente no app
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = 'professional_profiles'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.professional_profiles;
        END IF;
    END IF;
END $$;


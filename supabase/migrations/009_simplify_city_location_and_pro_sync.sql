-- ==============================================================================
-- MIGRAÇÃO 009: Simplificação de Localização por Cidade/UF + CEP
-- e Sincronização Completa de Cadastro/Edição de Profissionais e Clientes
-- ==============================================================================

-- 1. Adicionar coluna opcional 'cep' em public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cep VARCHAR(12);

-- 2. Atualizar trigger 'handle_new_user' para gravar city, state, cep, bio
--    e popular automaticamente 'professional_profiles' (skills, service_cities)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_city VARCHAR(80);
    v_state VARCHAR(2);
    v_role public.user_role;
    v_skills TEXT[];
BEGIN
    v_city := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'city'), ''), 'Parauapebas');
    v_state := UPPER(COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'state'), ''), 'PA'));
    v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'client'::public.user_role);

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        avatar_url,
        phone_whatsapp,
        city,
        state,
        cep,
        neighborhood,
        bio,
        latitude,
        longitude
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'Novo Usuário'),
        v_role,
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'phone_whatsapp',
        v_city,
        v_state,
        NULLIF(TRIM(NEW.raw_user_meta_data->>'cep'), ''),
        v_city || ', ' || v_state,
        NULLIF(TRIM(NEW.raw_user_meta_data->>'bio'), ''),
        CASE
            WHEN (NEW.raw_user_meta_data->>'latitude') IS NOT NULL AND (NEW.raw_user_meta_data->>'latitude') ~ '^-?[0-9]+(\.[0-9]+)?$'
            THEN (NEW.raw_user_meta_data->>'latitude')::numeric
            ELSE NULL
        END,
        CASE
            WHEN (NEW.raw_user_meta_data->>'longitude') IS NOT NULL AND (NEW.raw_user_meta_data->>'longitude') ~ '^-?[0-9]+(\.[0-9]+)?$'
            THEN (NEW.raw_user_meta_data->>'longitude')::numeric
            ELSE NULL
        END
    )
    ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.profiles.avatar_url),
        phone_whatsapp = COALESCE(NULLIF(EXCLUDED.phone_whatsapp, ''), public.profiles.phone_whatsapp),
        city = COALESCE(NULLIF(EXCLUDED.city, ''), public.profiles.city),
        state = COALESCE(NULLIF(EXCLUDED.state, ''), public.profiles.state),
        cep = COALESCE(NULLIF(EXCLUDED.cep, ''), public.profiles.cep),
        neighborhood = COALESCE(NULLIF(EXCLUDED.city, ''), public.profiles.city) || ', ' || COALESCE(NULLIF(EXCLUDED.state, ''), public.profiles.state),
        bio = COALESCE(NULLIF(EXCLUDED.bio, ''), public.profiles.bio),
        latitude = COALESCE(EXCLUDED.latitude, public.profiles.latitude),
        longitude = COALESCE(EXCLUDED.longitude, public.profiles.longitude),
        updated_at = NOW();

    -- Se o usuário for profissional, cria/atualiza os detalhes em professional_profiles
    IF v_role = 'professional' THEN
        IF jsonb_typeof(NEW.raw_user_meta_data->'skills') = 'array' THEN
            SELECT COALESCE(array_agg(elem), ARRAY[]::TEXT[])
            INTO v_skills
            FROM jsonb_array_elements_text(NEW.raw_user_meta_data->'skills') AS elem;
        ELSIF NULLIF(TRIM(NEW.raw_user_meta_data->>'category'), '') IS NOT NULL THEN
            v_skills := ARRAY[TRIM(NEW.raw_user_meta_data->>'category')];
        ELSE
            v_skills := ARRAY[]::TEXT[];
        END IF;

        INSERT INTO public.professional_profiles (
            profile_id,
            skills,
            service_cities,
            served_neighborhoods,
            available_now
        )
        VALUES (
            NEW.id,
            v_skills,
            ARRAY[v_city],
            ARRAY['Toda a cidade'],
            true
        )
        ON CONFLICT (profile_id) DO UPDATE SET
            skills = CASE WHEN array_length(EXCLUDED.skills, 1) > 0 THEN EXCLUDED.skills ELSE public.professional_profiles.skills END,
            service_cities = ARRAY[v_city],
            served_neighborhoods = ARRAY['Toda a cidade'],
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Função RPC (SECURITY DEFINER) para criar/atualizar vitrine profissional
--    (suporta tanto novos profissionais quanto clientes já logados que migram para profissional)
CREATE OR REPLACE FUNCTION public.upsert_professional_profile_data(
    p_user_id UUID DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_full_name TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_city TEXT DEFAULT 'Parauapebas',
    p_state TEXT DEFAULT 'PA',
    p_cep TEXT DEFAULT NULL,
    p_bio TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL,
    p_lat NUMERIC DEFAULT NULL,
    p_lng NUMERIC DEFAULT NULL,
    p_skills TEXT[] DEFAULT ARRAY[]::TEXT[],
    p_available_now BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_id UUID;
    v_city VARCHAR(80);
    v_state VARCHAR(2);
BEGIN
    v_city := COALESCE(NULLIF(TRIM(p_city), ''), 'Parauapebas');
    v_state := UPPER(COALESCE(NULLIF(TRIM(p_state), ''), 'PA'));

    -- Localiza o ID do perfil pelo UUID ou pelo e-mail
    IF p_user_id IS NOT NULL THEN
        SELECT id INTO v_target_id FROM public.profiles WHERE id = p_user_id;
    END IF;

    IF v_target_id IS NULL AND NULLIF(TRIM(p_email), '') IS NOT NULL THEN
        SELECT id INTO v_target_id FROM public.profiles WHERE LOWER(email) = LOWER(TRIM(p_email)) LIMIT 1;
    END IF;

    IF v_target_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Atualiza public.profiles
    UPDATE public.profiles
    SET full_name = COALESCE(NULLIF(TRIM(p_full_name), ''), full_name),
        role = 'professional',
        phone_whatsapp = COALESCE(NULLIF(TRIM(p_phone), ''), phone_whatsapp),
        city = v_city,
        state = v_state,
        cep = COALESCE(NULLIF(TRIM(p_cep), ''), cep),
        neighborhood = v_city || ', ' || v_state,
        bio = COALESCE(NULLIF(TRIM(p_bio), ''), bio),
        avatar_url = COALESCE(NULLIF(TRIM(p_avatar_url), ''), avatar_url),
        latitude = COALESCE(p_lat, latitude),
        longitude = COALESCE(p_lng, longitude),
        updated_at = NOW()
    WHERE id = v_target_id;

    -- Upsert em public.professional_profiles
    INSERT INTO public.professional_profiles (
        profile_id,
        skills,
        service_cities,
        served_neighborhoods,
        available_now
    )
    VALUES (
        v_target_id,
        COALESCE(p_skills, ARRAY[]::TEXT[]),
        ARRAY[v_city],
        ARRAY['Toda a cidade'],
        COALESCE(p_available_now, true)
    )
    ON CONFLICT (profile_id) DO UPDATE SET
        skills = CASE WHEN array_length(EXCLUDED.skills, 1) > 0 THEN EXCLUDED.skills ELSE public.professional_profiles.skills END,
        service_cities = ARRAY[v_city],
        served_neighborhoods = ARRAY['Toda a cidade'],
        available_now = COALESCE(p_available_now, public.professional_profiles.available_now),
        updated_at = NOW();

    RETURN v_target_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_professional_profile_data TO anon, authenticated;

-- 4. Função RPC (SECURITY DEFINER) para atualizar dados e cidade do cliente/usuário
CREATE OR REPLACE FUNCTION public.update_user_profile_location(
    p_user_id UUID DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_full_name TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_city TEXT DEFAULT 'Parauapebas',
    p_state TEXT DEFAULT 'PA',
    p_cep TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_id UUID;
    v_city VARCHAR(80);
    v_state VARCHAR(2);
BEGIN
    v_city := COALESCE(NULLIF(TRIM(p_city), ''), 'Parauapebas');
    v_state := UPPER(COALESCE(NULLIF(TRIM(p_state), ''), 'PA'));

    IF p_user_id IS NOT NULL THEN
        SELECT id INTO v_target_id FROM public.profiles WHERE id = p_user_id;
    END IF;

    IF v_target_id IS NULL AND NULLIF(TRIM(p_email), '') IS NOT NULL THEN
        SELECT id INTO v_target_id FROM public.profiles WHERE LOWER(email) = LOWER(TRIM(p_email)) LIMIT 1;
    END IF;

    IF v_target_id IS NULL THEN
        RETURN NULL;
    END IF;

    UPDATE public.profiles
    SET full_name = COALESCE(NULLIF(TRIM(p_full_name), ''), full_name),
        phone_whatsapp = COALESCE(NULLIF(TRIM(p_phone), ''), phone_whatsapp),
        city = v_city,
        state = v_state,
        cep = COALESCE(NULLIF(TRIM(p_cep), ''), cep),
        neighborhood = v_city || ', ' || v_state,
        updated_at = NOW()
    WHERE id = v_target_id;

    UPDATE public.professional_profiles
    SET service_cities = ARRAY[v_city],
        served_neighborhoods = ARRAY['Toda a cidade'],
        updated_at = NOW()
    WHERE profile_id = v_target_id;

    RETURN v_target_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_profile_location TO anon, authenticated;

-- 5. Corrigir os perfis existentes para usar "Cidade, UF" (sem filtro de bairro) e sincronizar profissionais reais
UPDATE public.profiles
SET neighborhood = COALESCE(NULLIF(TRIM(city), ''), 'Parauapebas') || ', ' || UPPER(COALESCE(NULLIF(TRIM(state), ''), 'PA'));

-- Atualizar CM Transportes (Belém, PA) com sua categoria de Fretes e cidade Belém
UPDATE public.professional_profiles
SET skills = CASE WHEN array_length(skills, 1) IS NULL OR array_length(skills, 1) = 0 THEN ARRAY['Fretes', 'Fretes e Carretos', 'Mudanças e Transportes'] ELSE skills END,
    service_cities = ARRAY['Belém'],
    served_neighborhoods = ARRAY['Toda a cidade']
WHERE profile_id = '70d2a6c6-5b5f-45ff-abae-22dd07f67d3c';

-- Atualizar titi Refrigerao (Parauapebas, PA) para role = 'professional' com categoria Ar-Condicionado
UPDATE public.profiles
SET role = 'professional',
    bio = COALESCE(bio, 'Atendimento especializado em refrigeração, instalação e manutenção de ar-condicionado em toda a cidade de Parauapebas.')
WHERE id = '25583fe9-ba95-4b60-8633-5ae7071c21cd';

INSERT INTO public.professional_profiles (profile_id, skills, service_cities, served_neighborhoods, available_now)
VALUES (
    '25583fe9-ba95-4b60-8633-5ae7071c21cd',
    ARRAY['Ar-Condicionado', 'Técnico em Refrigeração & Split', 'Manutenção Preventiva'],
    ARRAY['Parauapebas'],
    ARRAY['Toda a cidade'],
    true
)
ON CONFLICT (profile_id) DO UPDATE SET
    skills = CASE WHEN array_length(public.professional_profiles.skills, 1) IS NULL OR array_length(public.professional_profiles.skills, 1) = 0 THEN EXCLUDED.skills ELSE public.professional_profiles.skills END,
    service_cities = ARRAY['Parauapebas'],
    served_neighborhoods = ARRAY['Toda a cidade'];

-- 6. Habilitar Realtime (WebSocket) para profiles e professional_profiles
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object OR undefined_object THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.professional_profiles;
EXCEPTION WHEN duplicate_object OR undefined_object THEN
    NULL;
END $$;



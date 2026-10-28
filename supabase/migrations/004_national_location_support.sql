-- =========================================================
-- MIGRAÇÃO 004: SUPORTE A EXPANSÃO NACIONAL, COORDENADAS GPS E CIDADES
-- =========================================================

-- 1. ADICIONA COORDENADAS GPS E SUPORTE GEOGRÁFICO EM PROFILES
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);

-- 2. CIDADES ADICIONAIS ATENDIDAS PELO PROFISSIONAL
ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS service_cities TEXT[] DEFAULT '{}';

-- 3. ÍNDICES DE PERFORMANCE PARA FILTRAGEM NACIONAL
CREATE INDEX IF NOT EXISTS idx_profiles_city_state ON public.profiles(city, state);
CREATE INDEX IF NOT EXISTS idx_profiles_role_city ON public.profiles(role, city);

-- 4. ATUALIZA A TRIGGER handle_new_user() PARA PERSISTIR CIDADE, ESTADO E GPS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        full_name, 
        role, 
        avatar_url, 
        phone_whatsapp,
        city,
        state,
        neighborhood,
        latitude,
        longitude
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Novo Usuário'),
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'client'::public.user_role),
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'phone_whatsapp',
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'city'), ''), 'Parauapebas'),
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'state'), ''), 'PA'),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'neighborhood'), ''),
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
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        phone_whatsapp = COALESCE(EXCLUDED.phone_whatsapp, public.profiles.phone_whatsapp),
        city = COALESCE(EXCLUDED.city, public.profiles.city),
        state = COALESCE(EXCLUDED.state, public.profiles.state),
        neighborhood = COALESCE(EXCLUDED.neighborhood, public.profiles.neighborhood),
        latitude = COALESCE(EXCLUDED.latitude, public.profiles.latitude),
        longitude = COALESCE(EXCLUDED.longitude, public.profiles.longitude),
        updated_at = NOW();

    RETURN NEW;
END;
$$;

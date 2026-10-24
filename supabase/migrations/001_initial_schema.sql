-- ==============================================================================
-- PROJETO: GO Parauapebas (Marketplace de Profissionais Autônomos)
-- SCRIPT: 001_initial_schema.sql
-- DESCRIÇÃO: Criação das tabelas base, enums, triggers, índices e políticas RLS
-- ==============================================================================

-- Habilita extensão para geração de UUID se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. ENUMS E TIPOS
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('client', 'professional', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE request_status AS ENUM ('pending', 'quoted', 'accepted', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 2. TABELA: CATEGORIAS DE SERVIÇOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    icon_name VARCHAR(50),
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 3. TABELA: PERFIS DE USUÁRIOS (Vinculado ao auth.users do Supabase)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    role user_role DEFAULT 'client' NOT NULL,
    phone_whatsapp VARCHAR(20),
    avatar_url TEXT,
    neighborhood VARCHAR(100), -- Bairros de Parauapebas (ex: Cidade Nova, Rio Verde, União)
    city VARCHAR(80) DEFAULT 'Parauapebas' NOT NULL,
    state VARCHAR(2) DEFAULT 'PA' NOT NULL,
    bio TEXT,
    is_verified BOOLEAN DEFAULT false NOT NULL,
    rating_average NUMERIC(3, 2) DEFAULT 0.00 NOT NULL,
    rating_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 4. TABELA: DETALHES DO PROFISSIONAL AUTÔNOMO
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.professional_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    skills TEXT[] DEFAULT '{}',
    years_experience INTEGER DEFAULT 0,
    price_estimate_type VARCHAR(50) DEFAULT 'a_combinar', -- 'por_hora', 'diaria', 'por_servico', 'a_combinar'
    min_price NUMERIC(10, 2),
    served_neighborhoods TEXT[] DEFAULT '{}', -- Lista de bairros atendidos em Parauapebas
    service_modality VARCHAR(30) DEFAULT 'presencial', -- 'presencial', 'remoto', 'ambos'
    available_now BOOLEAN DEFAULT true NOT NULL,
    document_cpf_cnpj VARCHAR(20),
    pix_key VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 5. TABELA: PORTFÓLIO / SERVIÇOS DO PROFISSIONAL
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portfolio_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 6. TABELA: PEDIDOS DE ORÇAMENTO / SOLICITAÇÕES DE SERVIÇO
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Nulo caso seja orçamento aberto por categoria
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    neighborhood VARCHAR(100) NOT NULL, -- Bairro onde o serviço será executado em Parauapebas
    reference_address TEXT,
    status request_status DEFAULT 'pending' NOT NULL,
    budget_limit NUMERIC(10, 2),
    preferred_date DATE,
    photos TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 7. TABELA: AVALIAÇÕES E REPUTAÇÃO
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_client_request_review UNIQUE (client_id, service_request_id)
);

-- ------------------------------------------------------------------------------
-- 8. ÍNDICES DE PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_neighborhood ON public.profiles(neighborhood);
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON public.profiles(rating_average DESC);
CREATE INDEX IF NOT EXISTS idx_professional_category ON public.professional_profiles(category_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_client ON public.service_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_professional ON public.service_requests(professional_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_reviews_professional ON public.reviews(professional_id);

-- ------------------------------------------------------------------------------
-- 9. TRIGGERS AUTOMÁTICOS
-- ------------------------------------------------------------------------------

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_profiles_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER on_professional_profiles_updated
    BEFORE UPDATE ON public.professional_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER on_service_requests_updated
    BEFORE UPDATE ON public.service_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para criar perfil automaticamente quando um usuário se cadastrar no auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role, avatar_url, phone_whatsapp)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Novo Usuário'),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client'::user_role),
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'phone_whatsapp'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para recalcular a nota média do profissional após nova avaliação
CREATE OR REPLACE FUNCTION public.handle_review_rating_recalc()
RETURNS TRIGGER AS $$
DECLARE
    avg_score NUMERIC(3, 2);
    total_reviews INTEGER;
BEGIN
    SELECT COALESCE(AVG(rating), 0), COUNT(id)
    INTO avg_score, total_reviews
    FROM public.reviews
    WHERE professional_id = NEW.professional_id;

    UPDATE public.profiles
    SET rating_average = avg_score,
        rating_count = total_reviews
    WHERE id = NEW.professional_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_review_added
    AFTER INSERT OR UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.handle_review_rating_recalc();

-- ------------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Categorias são visíveis publicamente
CREATE POLICY "Categorias visíveis por qualquer usuário"
    ON public.categories FOR SELECT
    USING (true);

-- Perfis são visíveis para qualquer pessoa logada ou visitante (marketplace público)
CREATE POLICY "Perfis visíveis publicamente"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Usuário pode editar apenas o próprio perfil"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Detalhes profissionais
CREATE POLICY "Detalhes profissionais visíveis publicamente"
    ON public.professional_profiles FOR SELECT
    USING (true);

CREATE POLICY "Profissional gerencia seus detalhes"
    ON public.professional_profiles FOR ALL
    USING (auth.uid() = profile_id);

-- Portfólio
CREATE POLICY "Portfólio visível publicamente"
    ON public.portfolio_items FOR SELECT
    USING (true);

CREATE POLICY "Profissional gerencia seus itens de portfólio"
    ON public.portfolio_items FOR ALL
    USING (auth.uid() = professional_id);

-- Solicitações de Serviço
CREATE POLICY "Cliente vê e gerencia suas próprias solicitações"
    ON public.service_requests FOR ALL
    USING (auth.uid() = client_id);

CREATE POLICY "Profissionais podem ver solicitações direcionadas a eles ou abertas"
    ON public.service_requests FOR SELECT
    USING (professional_id IS NULL OR auth.uid() = professional_id);

-- Avaliações
CREATE POLICY "Avaliações visíveis publicamente"
    ON public.reviews FOR SELECT
    USING (true);

CREATE POLICY "Clientes autenticados podem criar avaliações"
    ON public.reviews FOR INSERT
    WITH CHECK (auth.uid() = client_id);

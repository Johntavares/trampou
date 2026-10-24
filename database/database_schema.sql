-- ==============================================================================
-- PROJETO: GO Parauapebas (Marketplace de Profissionais Autônomos)
-- ARQUIVO: database_schema.sql
-- DESCRIÇÃO: Criação de tipos, tabelas, chaves estrangeiras, restrições e índices.
-- ==============================================================================

-- Habilita extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. ENUMS E TIPOS CUSTOMIZADOS
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM ('client', 'professional', 'moderator', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE professional_status AS ENUM ('pending_approval', 'active', 'suspended', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE service_request_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE quote_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE report_status AS ENUM ('pending', 'under_review', 'resolved', 'dismissed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 2. TABELA: USER_ROLES (Controle de Papéis Administrativos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role_type NOT NULL DEFAULT 'client',
    granted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_role UNIQUE (user_id, role)
);

-- ------------------------------------------------------------------------------
-- 3. TABELA: PROFILES (Perfis Gerais de Usuários vinculados ao auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255),
    phone_whatsapp VARCHAR(20),
    avatar_url TEXT,
    city VARCHAR(100) DEFAULT 'Parauapebas' NOT NULL,
    neighborhood VARCHAR(100),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 4. TABELA: CATEGORIES (Categorias de Serviços)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    icon_name VARCHAR(60),
    active BOOLEAN DEFAULT true NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 5. TABELA: PROFESSIONAL_PROFILES (Perfil de Autônomo)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.professional_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    bio TEXT,
    city VARCHAR(100) DEFAULT 'Parauapebas' NOT NULL,
    neighborhood VARCHAR(100),
    served_neighborhoods TEXT[] DEFAULT '{}',
    years_experience INTEGER DEFAULT 0 CHECK (years_experience >= 0),
    document_cpf_cnpj VARCHAR(25),
    status professional_status DEFAULT 'active' NOT NULL,
    rating_average NUMERIC(3, 2) DEFAULT 0.00 NOT NULL CHECK (rating_average >= 0 AND rating_average <= 5),
    rating_count INTEGER DEFAULT 0 NOT NULL CHECK (rating_count >= 0),
    completed_services_count INTEGER DEFAULT 0 NOT NULL CHECK (completed_services_count >= 0),
    available_now BOOLEAN DEFAULT true NOT NULL,
    pix_key VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 6. TABELA: PROFESSIONAL_SERVICES (Serviços Oferecidos pelos Profissionais)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.professional_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    base_price NUMERIC(10, 2) CHECK (base_price >= 0),
    price_unit VARCHAR(40) DEFAULT 'a_combinar', -- 'por_hora', 'por_servico', 'diaria', 'a_combinar'
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 7. TABELA: PORTFOLIO_ITEMS (Galeria de Trabalhos Realizados)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    service_id UUID REFERENCES public.professional_services(id) ON DELETE SET NULL,
    display_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 8. TABELA: SERVICE_REQUESTS (Solicitações de Serviço e Orçamentos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    professional_id UUID REFERENCES public.professional_profiles(id) ON DELETE SET NULL, -- Se nulo, solicitação aberta
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    city VARCHAR(100) DEFAULT 'Parauapebas' NOT NULL,
    neighborhood VARCHAR(100) NOT NULL,
    address_reference TEXT,
    proposed_budget NUMERIC(10, 2) CHECK (proposed_budget >= 0),
    preferred_date DATE,
    status service_request_status DEFAULT 'pending' NOT NULL,
    photos TEXT[] DEFAULT '{}',
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 9. TABELA: SERVICE_QUOTES (Negociação de Orçamentos Multi-Profissional)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    notes TEXT,
    estimated_duration VARCHAR(80),
    status quote_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_request_professional_quote UNIQUE (request_id, professional_id)
);

-- ------------------------------------------------------------------------------
-- 10. TABELA: CONVERSATIONS (Chat Interno)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    last_message_text TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_participants_per_request UNIQUE (service_request_id, client_id, professional_id)
);

-- ------------------------------------------------------------------------------
-- 11. TABELA: MESSAGES (Mensagens do Chat)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 12. TABELA: MESSAGE_ATTACHMENTS (Imagens e Arquivos do Chat)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_type VARCHAR(60) NOT NULL,
    file_size_bytes BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 13. TABELA: CONVERSATION_READS (Controle de Leitura de Mensagens)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversation_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_read_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_conversation_user_read UNIQUE (conversation_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 14. TABELA: REVIEWS (Avaliações dos Serviços)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE RESTRICT UNIQUE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE RESTRICT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_client_service_review UNIQUE (client_id, service_request_id)
);

-- ------------------------------------------------------------------------------
-- 15. TABELA: FAVORITES (Profissionais Favoritos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_client_favorite_professional UNIQUE (client_id, professional_id)
);

-- ------------------------------------------------------------------------------
-- 16. TABELA: REPORTS (Denúncias e Moderação)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    reported_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reported_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    reported_service_request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL,
    reason VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    status report_status DEFAULT 'pending' NOT NULL,
    resolution_notes TEXT,
    resolved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 17. ÍNDICES DE PERFORMANCE E PESQUISA
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_city_neighborhood ON public.profiles(city, neighborhood);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_city ON public.professional_profiles(city, neighborhood);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_status ON public.professional_profiles(status);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_rating ON public.professional_profiles(rating_average DESC);
CREATE INDEX IF NOT EXISTS idx_professional_services_category ON public.professional_services(category_id);
CREATE INDEX IF NOT EXISTS idx_professional_services_professional ON public.professional_services(professional_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_client ON public.service_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_professional ON public.service_requests(professional_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_quotes_request ON public.service_quotes(request_id);
CREATE INDEX IF NOT EXISTS idx_service_quotes_professional ON public.service_quotes(professional_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON public.conversations(client_id, professional_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_date ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_reviews_professional ON public.reviews(professional_id);
CREATE INDEX IF NOT EXISTS idx_favorites_client ON public.favorites(client_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

-- ------------------------------------------------------------------------------
-- 18. TRIGGERS E FUNÇÕES AUXILIARES
-- ------------------------------------------------------------------------------

-- Função genérica para atualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at em tabelas principais
CREATE OR REPLACE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER tr_professional_profiles_updated_at BEFORE UPDATE ON public.professional_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER tr_professional_services_updated_at BEFORE UPDATE ON public.professional_services FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER tr_service_requests_updated_at BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER tr_service_quotes_updated_at BEFORE UPDATE ON public.service_quotes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER tr_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER tr_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para manter atualizado o last_message da conversa
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET last_message_text = LEFT(NEW.content, 120),
        last_message_at = NEW.created_at,
        updated_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_after_message_insert
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- Trigger para recalcular a nota média e quantidade de avaliações do profissional
CREATE OR REPLACE FUNCTION public.handle_recalculate_professional_rating()
RETURNS TRIGGER AS $$
DECLARE
    v_avg NUMERIC(3, 2);
    v_count INTEGER;
BEGIN
    SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0.00), COUNT(id)
    INTO v_avg, v_count
    FROM public.reviews
    WHERE professional_id = NEW.professional_id;

    UPDATE public.professional_profiles
    SET rating_average = v_avg,
        rating_count = v_count
    WHERE id = NEW.professional_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_after_review_change
AFTER INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.handle_recalculate_professional_rating();

-- Trigger para incrementar contagem de serviços concluídos quando request passa para 'completed'
CREATE OR REPLACE FUNCTION public.handle_service_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = timezone('utc'::text, now());
        IF NEW.professional_id IS NOT NULL THEN
            UPDATE public.professional_profiles
            SET completed_services_count = completed_services_count + 1
            WHERE id = NEW.professional_id;
        END IF;
    ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        NEW.cancelled_at = timezone('utc'::text, now());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_service_request_status_change
BEFORE UPDATE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.handle_service_completion();

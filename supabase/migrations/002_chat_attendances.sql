-- ==============================================================================
-- PROJETO: GO Parauapebas (Marketplace de Profissionais Autônomos)
-- SCRIPT: 002_chat_attendances.sql
-- DESCRIÇÃO: Registro leve de atendimentos no chat e avaliações verificadas
-- ==============================================================================

-- 1. TABELA: ATENDIMENTOS COMBINADOS NO CHAT
CREATE TABLE IF NOT EXISTS public.service_attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id TEXT NOT NULL,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status VARCHAR(40) NOT NULL DEFAULT 'pending_confirmation' 
        CHECK (status IN ('pending_confirmation', 'confirmed', 'completion_requested', 'completed', 'disputed', 'cancelled')),
    service_title VARCHAR(200),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    completion_requested_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    disputed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    dispute_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Validação: Cliente e profissional não podem ser o mesmo usuário
    CONSTRAINT chk_attendance_distinct_users CHECK (client_id <> professional_id),
    -- Validação: Solicitante deve ser um dos participantes
    CONSTRAINT chk_attendance_requester CHECK (requested_by = client_id OR requested_by = professional_id)
);

-- 2. ÍNDICES DE PERFORMANCE E AUDITORIA
CREATE INDEX IF NOT EXISTS idx_attendances_conversation ON public.service_attendances(conversation_id);
CREATE INDEX IF NOT EXISTS idx_attendances_client ON public.service_attendances(client_id);
CREATE INDEX IF NOT EXISTS idx_attendances_professional ON public.service_attendances(professional_id);
CREATE INDEX IF NOT EXISTS idx_attendances_status ON public.service_attendances(status);

-- Trigger de updated_at para service_attendances
CREATE OR REPLACE TRIGGER on_service_attendances_updated
    BEFORE UPDATE ON public.service_attendances
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. INTEGRAR COM A TABELA DE AVALIAÇÕES (reviews)
-- Adiciona attendance_id permitindo null para compatibilidade com avaliações legadas
ALTER TABLE public.reviews 
    ADD COLUMN IF NOT EXISTS attendance_id UUID REFERENCES public.service_attendances(id) ON DELETE RESTRICT;

-- Constraint de unicidade: no máximo 1 avaliação por atendimento
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_review_per_attendance'
    ) THEN
        ALTER TABLE public.reviews ADD CONSTRAINT unique_review_per_attendance UNIQUE (attendance_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reviews_attendance ON public.reviews(attendance_id);

-- 4. SEGURANÇA E ROW LEVEL SECURITY (RLS)
ALTER TABLE public.service_attendances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participantes podem visualizar seus atendimentos" ON public.service_attendances;
CREATE POLICY "Participantes podem visualizar seus atendimentos"
    ON public.service_attendances FOR SELECT
    USING (
        auth.uid() = client_id OR auth.uid() = professional_id
    );

-- Inserção e atualização diretas restritas aos participantes legítimos com regras rígidas
DROP POLICY IF EXISTS "Participantes podem solicitar atendimento" ON public.service_attendances;
CREATE POLICY "Participantes podem solicitar atendimento"
    ON public.service_attendances FOR INSERT
    WITH CHECK (
        (auth.uid() = client_id OR auth.uid() = professional_id) 
        AND auth.uid() = requested_by
        AND status = 'pending_confirmation'
    );

-- 5. FUNÇÕES SEGURAS (STORED PROCEDURES) PARA TRANSIÇÕES DE ESTADO AUDITADAS
-- Evitam modificação arbitrária de colunas e garantem invariantes de negócio

-- 5.1 Solicitar Registro de Serviço Combinado
CREATE OR REPLACE FUNCTION public.request_chat_attendance(
    p_conversation_id TEXT,
    p_client_id UUID,
    p_professional_id UUID,
    p_service_title TEXT DEFAULT NULL
)
RETURNS public.service_attendances AS $$
DECLARE
    v_attendance public.service_attendances;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- Se executado dentro do contexto Supabase Auth
    IF v_user_id IS NOT NULL THEN
        IF v_user_id <> p_client_id AND v_user_id <> p_professional_id THEN
            RAISE EXCEPTION 'Apenas os participantes da conversa podem solicitar o registro do atendimento.';
        END IF;
    ELSE
        -- Fallback seguro para chamadas onde auth.uid() é injetado via sessão
        v_user_id := p_client_id;
    END IF;

    IF p_client_id = p_professional_id THEN
        RAISE EXCEPTION 'O cliente e o profissional devem ser usuários distintos.';
    END IF;

    INSERT INTO public.service_attendances (
        conversation_id,
        client_id,
        professional_id,
        requested_by,
        service_title,
        status,
        requested_at
    ) VALUES (
        p_conversation_id,
        p_client_id,
        p_professional_id,
        v_user_id,
        p_service_title,
        'pending_confirmation',
        timezone('utc'::text, now())
    )
    RETURNING * INTO v_attendance;

    RETURN v_attendance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 Aceitar ou Recusar Solicitação de Registro
CREATE OR REPLACE FUNCTION public.respond_attendance_request(
    p_attendance_id UUID,
    p_accept BOOLEAN
)
RETURNS public.service_attendances AS $$
DECLARE
    v_attendance public.service_attendances;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    SELECT * INTO v_attendance
    FROM public.service_attendances
    WHERE id = p_attendance_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Atendimento não encontrado.';
    END IF;

    IF v_attendance.status <> 'pending_confirmation' THEN
        RAISE EXCEPTION 'O atendimento não está aguardando confirmação (Status atual: %).', v_attendance.status;
    END IF;

    -- Validação: O chamador não pode ser quem solicitou o registro!
    IF v_user_id IS NOT NULL THEN
        IF v_user_id = v_attendance.requested_by THEN
            RAISE EXCEPTION 'Você não pode aceitar ou recusar a sua própria solicitação. Aguarde a confirmação do outro participante.';
        END IF;

        IF v_user_id <> v_attendance.client_id AND v_user_id <> v_attendance.professional_id THEN
            RAISE EXCEPTION 'Acesso negado: você não é participante deste atendimento.';
        END IF;
    END IF;

    IF p_accept THEN
        UPDATE public.service_attendances
        SET status = 'confirmed',
            confirmed_at = timezone('utc'::text, now())
        WHERE id = p_attendance_id
        RETURNING * INTO v_attendance;
    ELSE
        UPDATE public.service_attendances
        SET status = 'cancelled',
            cancelled_at = timezone('utc'::text, now())
        WHERE id = p_attendance_id
        RETURNING * INTO v_attendance;
    END IF;

    RETURN v_attendance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.3 Profissional Solicita Conclusão do Atendimento
CREATE OR REPLACE FUNCTION public.request_attendance_completion(
    p_attendance_id UUID
)
RETURNS public.service_attendances AS $$
DECLARE
    v_attendance public.service_attendances;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    SELECT * INTO v_attendance
    FROM public.service_attendances
    WHERE id = p_attendance_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Atendimento não encontrado.';
    END IF;

    IF v_attendance.status NOT IN ('confirmed', 'disputed') THEN
        RAISE EXCEPTION 'Não é possível solicitar conclusão para atendimento com status: %', v_attendance.status;
    END IF;

    -- Validação: Somente o profissional pode solicitar conclusão
    IF v_user_id IS NOT NULL AND v_user_id <> v_attendance.professional_id THEN
        RAISE EXCEPTION 'Apenas o profissional responsável pode solicitar a conclusão do serviço.';
    END IF;

    UPDATE public.service_attendances
    SET status = 'completion_requested',
        completion_requested_at = timezone('utc'::text, now())
    WHERE id = p_attendance_id
    RETURNING * INTO v_attendance;

    RETURN v_attendance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.4 Cliente Confirma ou Contesta a Conclusão
CREATE OR REPLACE FUNCTION public.respond_attendance_completion(
    p_attendance_id UUID,
    p_confirm BOOLEAN,
    p_dispute_reason TEXT DEFAULT NULL
)
RETURNS public.service_attendances AS $$
DECLARE
    v_attendance public.service_attendances;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    SELECT * INTO v_attendance
    FROM public.service_attendances
    WHERE id = p_attendance_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Atendimento não encontrado.';
    END IF;

    IF v_attendance.status <> 'completion_requested' THEN
        RAISE EXCEPTION 'A conclusão só pode ser respondida se foi previamente solicitada pelo profissional (Status: %).', v_attendance.status;
    END IF;

    -- Validação: Somente o cliente pode confirmar ou contestar
    IF v_user_id IS NOT NULL AND v_user_id <> v_attendance.client_id THEN
        RAISE EXCEPTION 'Apenas o cliente pode confirmar ou contestar a conclusão deste serviço.';
    END IF;

    IF p_confirm THEN
        UPDATE public.service_attendances
        SET status = 'completed',
            completed_at = timezone('utc'::text, now()),
            dispute_reason = NULL
        WHERE id = p_attendance_id
        RETURNING * INTO v_attendance;
    ELSE
        UPDATE public.service_attendances
        SET status = 'disputed',
            disputed_at = timezone('utc'::text, now()),
            dispute_reason = COALESCE(p_dispute_reason, 'Cliente contestou a conclusão do serviço.')
        WHERE id = p_attendance_id
        RETURNING * INTO v_attendance;
    END IF;

    RETURN v_attendance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.5 Cliente Envia Avaliação Verificada Vinculada ao Atendimento
CREATE OR REPLACE FUNCTION public.submit_attendance_review(
    p_attendance_id UUID,
    p_rating INTEGER,
    p_comment TEXT DEFAULT NULL
)
RETURNS public.reviews AS $$
DECLARE
    v_attendance public.service_attendances;
    v_review public.reviews;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF p_rating < 1 OR p_rating > 5 THEN
        RAISE EXCEPTION 'A nota de avaliação deve ser entre 1 e 5 estrelas.';
    END IF;

    SELECT * INTO v_attendance
    FROM public.service_attendances
    WHERE id = p_attendance_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Atendimento não encontrado.';
    END IF;

    -- Validação: O atendimento DEVE estar concluído
    IF v_attendance.status <> 'completed' THEN
        RAISE EXCEPTION 'Avaliação não permitida: o atendimento ainda não foi confirmado como concluído (Status: %).', v_attendance.status;
    END IF;

    -- Validação: Apenas o cliente vinculado ao atendimento pode avaliar
    IF v_user_id IS NOT NULL AND v_user_id <> v_attendance.client_id THEN
        RAISE EXCEPTION 'Apenas o cliente vinculado a este atendimento pode avaliá-lo.';
    END IF;

    -- Validação: Não permitir avaliações duplicadas para o mesmo atendimento
    IF EXISTS (SELECT 1 FROM public.reviews WHERE attendance_id = p_attendance_id) THEN
        RAISE EXCEPTION 'Este atendimento já foi avaliado anteriormente. Cada atendimento permite no máximo uma avaliação.';
    END IF;

    INSERT INTO public.reviews (
        attendance_id,
        client_id,
        professional_id,
        rating,
        comment
    ) VALUES (
        p_attendance_id,
        v_attendance.client_id,
        v_attendance.professional_id,
        p_rating,
        p_comment
    )
    RETURNING * INTO v_review;

    RETURN v_review;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- PROJETO: GO Parauapebas (Marketplace de Profissionais Autônomos)
-- ARQUIVO: database_security.sql
-- DESCRIÇÃO: Habilitação de RLS em todas as tabelas, funções de autorização,
--            políticas de segurança estritas e regras de Storage.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HABILITAÇÃO DE ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. FUNÇÕES AUXILIARES DE SEGURANÇA (SECURITY DEFINER)
-- ------------------------------------------------------------------------------

-- Verifica se o usuário atual possui papel de admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verifica se o usuário atual possui papel de moderador ou admin
CREATE OR REPLACE FUNCTION public.is_moderator_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verifica se o usuário é participante de uma conversa
CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.conversations
        WHERE id = p_conversation_id
          AND (client_id = auth.uid() OR professional_id = auth.uid())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 3. POLÍTICAS: USER_ROLES (Proteção contra auto-atribuição de privilégios)
-- ------------------------------------------------------------------------------
CREATE POLICY "Usuário pode visualizar seus próprios papéis"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Apenas administradores podem conceder ou revogar papéis"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 4. POLÍTICAS: PROFILES
-- ------------------------------------------------------------------------------
CREATE POLICY "Perfis visíveis publicamente"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Usuário pode atualizar apenas seu próprio perfil"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ------------------------------------------------------------------------------
-- 5. POLÍTICAS: CATEGORIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Categorias ativas visíveis por todos"
    ON public.categories FOR SELECT
    USING (active = true OR public.is_moderator_or_admin());

CREATE POLICY "Apenas administradores gerenciam categorias"
    ON public.categories FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 6. POLÍTICAS: PROFESSIONAL_PROFILES
-- ------------------------------------------------------------------------------
CREATE POLICY "Perfis profissionais visíveis publicamente se ativos"
    ON public.professional_profiles FOR SELECT
    USING (status = 'active' OR profile_id = auth.uid() OR public.is_moderator_or_admin());

CREATE POLICY "Profissional gerencia seu próprio perfil profissional"
    ON public.professional_profiles FOR UPDATE
    TO authenticated
    USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Profissional pode cadastrar seus dados profissionais"
    ON public.professional_profiles FOR INSERT
    TO authenticated
    WITH CHECK (profile_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 7. POLÍTICAS: PROFESSIONAL_SERVICES
-- ------------------------------------------------------------------------------
CREATE POLICY "Serviços profissionais visíveis publicamente"
    ON public.professional_services FOR SELECT
    USING (is_active = true OR professional_id = auth.uid() OR public.is_moderator_or_admin());

CREATE POLICY "Profissional gerencia seus serviços"
    ON public.professional_services FOR ALL
    TO authenticated
    USING (professional_id = auth.uid())
    WITH CHECK (professional_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 8. POLÍTICAS: PORTFOLIO_ITEMS
-- ------------------------------------------------------------------------------
CREATE POLICY "Portfólio visível publicamente"
    ON public.portfolio_items FOR SELECT
    USING (true);

CREATE POLICY "Profissional gerencia seus itens de portfólio"
    ON public.portfolio_items FOR ALL
    TO authenticated
    USING (professional_id = auth.uid())
    WITH CHECK (professional_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 9. POLÍTICAS: SERVICE_REQUESTS (Solicitações e Orçamentos)
-- ------------------------------------------------------------------------------
CREATE POLICY "Clientes veem suas solicitações e profissionais veem direcionadas ou de sua área"
    ON public.service_requests FOR SELECT
    TO authenticated
    USING (
        client_id = auth.uid()
        OR professional_id = auth.uid()
        OR (professional_id IS NULL AND EXISTS (
            SELECT 1 FROM public.professional_profiles pp
            JOIN public.professional_services ps ON ps.professional_id = pp.id
            WHERE pp.profile_id = auth.uid() AND ps.category_id = service_requests.category_id
        ))
        OR public.is_moderator_or_admin()
    );

CREATE POLICY "Clientes podem criar solicitações de serviço"
    ON public.service_requests FOR INSERT
    TO authenticated
    WITH CHECK (client_id = auth.uid());

CREATE POLICY "Cliente ou profissional atribuído podem atualizar a solicitação"
    ON public.service_requests FOR UPDATE
    TO authenticated
    USING (
        client_id = auth.uid() 
        OR professional_id = auth.uid()
        OR public.is_moderator_or_admin()
    );

-- ------------------------------------------------------------------------------
-- 10. POLÍTICAS: SERVICE_QUOTES (Negociação Multi-Profissional)
-- ------------------------------------------------------------------------------
CREATE POLICY "Participantes veem as cotações correspondentes"
    ON public.service_quotes FOR SELECT
    TO authenticated
    USING (
        professional_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.service_requests sr
            WHERE sr.id = service_quotes.request_id AND sr.client_id = auth.uid()
        )
        OR public.is_moderator_or_admin()
    );

CREATE POLICY "Profissionais autenticados podem enviar cotações"
    ON public.service_quotes FOR INSERT
    TO authenticated
    WITH CHECK (professional_id = auth.uid());

CREATE POLICY "Profissional altera sua cotação ou cliente aceita/rejeita"
    ON public.service_quotes FOR UPDATE
    TO authenticated
    USING (
        professional_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.service_requests sr
            WHERE sr.id = service_quotes.request_id AND sr.client_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- 11. POLÍTICAS: CONVERSATIONS (Chat Interno)
-- ------------------------------------------------------------------------------
CREATE POLICY "Apenas participantes visualizam a conversa"
    ON public.conversations FOR SELECT
    TO authenticated
    USING (client_id = auth.uid() OR professional_id = auth.uid() OR public.is_moderator_or_admin());

CREATE POLICY "Participantes podem iniciar conversas"
    ON public.conversations FOR INSERT
    TO authenticated
    WITH CHECK (client_id = auth.uid() OR professional_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 12. POLÍTICAS: MESSAGES (Mensagens do Chat)
-- ------------------------------------------------------------------------------
CREATE POLICY "Participantes leem as mensagens da conversa"
    ON public.messages FOR SELECT
    TO authenticated
    USING (public.is_conversation_participant(conversation_id) OR public.is_moderator_or_admin());

CREATE POLICY "Apenas participantes enviam mensagens como si próprios"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid() 
        AND public.is_conversation_participant(conversation_id)
    );

-- Mensagens não podem ter o remetente adulterado
CREATE POLICY "Impedir edição de mensagens por terceiros"
    ON public.messages FOR UPDATE
    TO authenticated
    USING (false);

-- ------------------------------------------------------------------------------
-- 13. POLÍTICAS: MESSAGE_ATTACHMENTS (Anexos Privados)
-- ------------------------------------------------------------------------------
CREATE POLICY "Participantes leem os anexos da conversa"
    ON public.message_attachments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.messages m
            WHERE m.id = message_attachments.message_id
              AND (public.is_conversation_participant(m.conversation_id) OR public.is_moderator_or_admin())
        )
    );

CREATE POLICY "Remetente anexa arquivos em suas mensagens"
    ON public.message_attachments FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.messages m
            WHERE m.id = message_attachments.message_id
              AND m.sender_id = auth.uid()
              AND public.is_conversation_participant(m.conversation_id)
        )
    );

-- ------------------------------------------------------------------------------
-- 14. POLÍTICAS: CONVERSATION_READS (Controle de Leitura)
-- ------------------------------------------------------------------------------
CREATE POLICY "Participante visualiza e atualiza sua própria leitura"
    ON public.conversation_reads FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 15. POLÍTICAS: REVIEWS (Avaliações Restritas a Serviços Concluídos)
-- ------------------------------------------------------------------------------
CREATE POLICY "Avaliações são públicas para consulta"
    ON public.reviews FOR SELECT
    USING (true);

CREATE POLICY "Apenas clientes de serviços concluídos podem avaliar"
    ON public.reviews FOR INSERT
    TO authenticated
    WITH CHECK (
        client_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.service_requests sr
            WHERE sr.id = reviews.service_request_id
              AND sr.client_id = auth.uid()
              AND sr.status = 'completed'
              AND sr.professional_id = reviews.professional_id
        )
    );

CREATE POLICY "Cliente pode editar sua própria avaliação"
    ON public.reviews FOR UPDATE
    TO authenticated
    USING (client_id = auth.uid())
    WITH CHECK (client_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 16. POLÍTICAS: FAVORITES
-- ------------------------------------------------------------------------------
CREATE POLICY "Usuário gerencia seus próprios favoritos"
    ON public.favorites FOR ALL
    TO authenticated
    USING (client_id = auth.uid())
    WITH CHECK (client_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 17. POLÍTICAS: REPORTS (Denúncias e Moderação)
-- ------------------------------------------------------------------------------
CREATE POLICY "Usuários autenticados podem enviar denúncias"
    ON public.reports FOR INSERT
    TO authenticated
    WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Apenas moderadores e admins visualizam e tratam denúncias"
    ON public.reports FOR SELECT
    TO authenticated
    USING (public.is_moderator_or_admin() OR reporter_id = auth.uid());

CREATE POLICY "Apenas moderadores e admins atualizam denúncias"
    ON public.reports FOR UPDATE
    TO authenticated
    USING (public.is_moderator_or_admin())
    WITH CHECK (public.is_moderator_or_admin());

-- ------------------------------------------------------------------------------
-- 18. REGRAS DE SUPABASE STORAGE (Buckets e Políticas)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('avatars', 'avatars', true),
    ('portfolios', 'portfolios', true),
    ('chat_attachments', 'chat_attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Avatars: público para leitura, upload apenas do próprio dono
CREATE POLICY "Avatars são públicos para leitura"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Usuário gerencia seu próprio avatar"
    ON storage.objects FOR ALL
    TO authenticated
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
    WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Portfolios: público para leitura, upload apenas do profissional
CREATE POLICY "Portfólios são públicos para leitura"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'portfolios');

CREATE POLICY "Profissional gerencia suas fotos de portfólio"
    ON storage.objects FOR ALL
    TO authenticated
    USING (bucket_id = 'portfolios' AND auth.uid()::text = (storage.foldername(name))[1])
    WITH CHECK (bucket_id = 'portfolios' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Chat Attachments: estritamente privado, apenas autenticados participantes
CREATE POLICY "Apenas participantes acessam anexos de chat"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'chat_attachments');

CREATE POLICY "Usuários autenticados enviam anexos no chat"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'chat_attachments');

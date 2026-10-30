-- ==============================================================================
-- MIGRAÇÃO 014: Canal de Comunicação & Notificações Push
-- Permite que administradores enviem notificações e comunicados push segmentados para o app
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.push_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    target_audience TEXT NOT NULL DEFAULT 'all', -- 'all', 'clients', 'professionals'
    target_city TEXT DEFAULT 'all',
    category TEXT NOT NULL DEFAULT 'geral', -- 'geral', 'novidade', 'promocao', 'urgente', 'dica'
    action_type TEXT DEFAULT 'app', -- 'app', 'chat', 'sos', 'vitrine', 'url'
    action_url TEXT,
    sent_by TEXT DEFAULT 'Admin Trampou',
    status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'draft', 'scheduled'
    sent_count INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices de busca rápida
CREATE INDEX IF NOT EXISTS idx_push_notifications_created_at ON public.push_notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_notifications_audience ON public.push_notifications (target_audience);
CREATE INDEX IF NOT EXISTS idx_push_notifications_status ON public.push_notifications (status);

-- Habilitar RLS
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_notifications_public_read" ON public.push_notifications;
CREATE POLICY "push_notifications_public_read"
    ON public.push_notifications FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "push_notifications_admin_all" ON public.push_notifications;
CREATE POLICY "push_notifications_admin_all"
    ON public.push_notifications FOR ALL
    USING (true)
    WITH CHECK (true);

-- Permissões para anon, authenticated e service_role
GRANT ALL ON public.push_notifications TO anon, authenticated, service_role;

-- Habilitar Realtime para entrega instantânea no app do usuário
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = 'push_notifications'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.push_notifications;
        END IF;
    END IF;
END $$;

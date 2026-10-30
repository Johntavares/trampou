-- ==============================================================================
-- MIGRAÇÃO 012: Realtime para banners
-- Faz o app (PWA) receber na hora qualquer banner criado/editado/pausado no Admin
-- ==============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = 'banners'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.banners;
        END IF;
    END IF;
END $$;


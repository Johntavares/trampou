-- ==============================================================================
-- MIGRAÇÃO 013: Gestão completa de banners pelo Painel Admin
-- - Upload de imagem (Supabase Storage: bucket público 'banners')
-- - Tempo de exibição por banner (display_seconds)
-- - Coluna updated_at para controle de alterações
-- ==============================================================================

-- 1. Novas colunas em public.banners
ALTER TABLE public.banners
ADD COLUMN IF NOT EXISTS display_seconds INT NOT NULL DEFAULT 5;

ALTER TABLE public.banners
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'banners_display_seconds_range'
    ) THEN
        ALTER TABLE public.banners
        ADD CONSTRAINT banners_display_seconds_range CHECK (display_seconds BETWEEN 2 AND 60);
    END IF;
END $$;

-- 2. Bucket público para as imagens dos banners (até 5 MB, apenas imagens)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('banners', 'banners', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Políticas do bucket 'banners' (leitura pública + gestão pelo Painel Admin)
DROP POLICY IF EXISTS "banners_public_read" ON storage.objects;
CREATE POLICY "banners_public_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'banners');

DROP POLICY IF EXISTS "banners_admin_insert" ON storage.objects;
CREATE POLICY "banners_admin_insert"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'banners');

DROP POLICY IF EXISTS "banners_admin_update" ON storage.objects;
CREATE POLICY "banners_admin_update"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'banners')
    WITH CHECK (bucket_id = 'banners');

DROP POLICY IF EXISTS "banners_admin_delete" ON storage.objects;
CREATE POLICY "banners_admin_delete"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'banners');


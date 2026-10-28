-- Migration 005: Sistema de Sugestões e Feedbacks dos Usuários
-- Permite que usuários (clientes e prestadores) enviem sugestões, elogios, relatos de bugs ou melhorias.

CREATE TABLE IF NOT EXISTS public.app_feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    user_email TEXT,
    user_phone TEXT,
    feedback_type TEXT NOT NULL DEFAULT 'sugestao', -- 'sugestao', 'elogio', 'problema', 'outro'
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    message TEXT NOT NULL,
    city TEXT DEFAULT 'Parauapebas',
    state TEXT DEFAULT 'PA',
    status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'em_analise', 'implementado', 'arquivado'
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON public.app_feedbacks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON public.app_feedbacks (status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_type ON public.app_feedbacks (feedback_type);

-- Habilitar RLS
ALTER TABLE public.app_feedbacks ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir envio de feedbacks por qualquer usuario" ON public.app_feedbacks;
DROP POLICY IF EXISTS "Permitir leitura de feedbacks para administradores" ON public.app_feedbacks;
DROP POLICY IF EXISTS "Permitir atualizacao de feedbacks para administradores" ON public.app_feedbacks;
DROP POLICY IF EXISTS "Permitir exclusao de feedbacks para administradores" ON public.app_feedbacks;

-- Política de inserção: qualquer pessoa (autenticada ou anônima) pode enviar feedback
CREATE POLICY "Permitir envio de feedbacks por qualquer usuario"
ON public.app_feedbacks FOR INSERT
WITH CHECK (true);

-- Política de leitura: permitir leitura para exibição no painel administrativo
CREATE POLICY "Permitir leitura de feedbacks para administradores"
ON public.app_feedbacks FOR SELECT
USING (true);

-- Política de atualização: permitir atualização de status e notas
CREATE POLICY "Permitir atualizacao de feedbacks para administradores"
ON public.app_feedbacks FOR UPDATE
USING (true)
WITH CHECK (true);

-- Política de exclusão
CREATE POLICY "Permitir exclusao de feedbacks para administradores"
ON public.app_feedbacks FOR DELETE
USING (true);

-- ==============================================================================
-- Migração 016: Sistema de Mensagens Nativas In-App (Chat Real Cliente <-> Profissional)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'client', -- 'client' | 'professional' | 'system'
  recipient_id TEXT NOT NULL,
  recipient_name TEXT,
  pro_id TEXT,
  service_title TEXT,
  message_text TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de alta performance para busca de conversas e mensagens não lidas
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON public.chat_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient ON public.chat_messages(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id);

-- Ativar RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS permissivas para o anon e authenticated (permitindo troca de mensagens pelo REST)
DROP POLICY IF EXISTS "Permitir leitura de mensagens pelos participantes" ON public.chat_messages;
CREATE POLICY "Permitir leitura de mensagens pelos participantes"
  ON public.chat_messages
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Permitir envio de mensagens" ON public.chat_messages;
CREATE POLICY "Permitir envio de mensagens"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização de status lido" ON public.chat_messages;
CREATE POLICY "Permitir atualização de status lido"
  ON public.chat_messages
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Notificar PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';

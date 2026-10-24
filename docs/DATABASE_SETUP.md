# 🗄️ Guia de Configuração do Banco de Dados - GO Parauapebas

O banco de dados do **GO Parauapebas** foi projetado no **Supabase (PostgreSQL)** com foco em alta escalabilidade, segurança com Row Level Security (RLS) e suporte a localização (bairros de Parauapebas).

---

## 📋 Passo a Passo para Ativação do Banco no Supabase

### 1. Criar Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) e faça login.
2. Clique em **"New Project"**.
3. Defina:
   - **Name**: `go-parauapebas`
   - **Database Password**: crie uma senha segura (guarde-a).
   - **Region**: `São Paulo (sa-east-1)` para menor latência no Brasil.
4. Clique em **"Create new project"** e aguarde cerca de 1 a 2 minutos para provisionar.

---

### 2. Executar a Migração de Tabelas (Schema)
1. No painel do seu projeto no Supabase, clique no menu lateral **SQL Editor** (ícone `>_`).
2. Clique em **"New query"**.
3. Abra o arquivo [`supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql), copie todo o seu conteúdo e cole no SQL Editor.
4. Clique no botão **"Run"** (ou aperte `Ctrl + Enter`).
5. Você verá a mensagem `Success. No rows returned`. Todas as tabelas, triggers, enums e políticas RLS foram criadas.

---

### 3. Popular Categorias Iniciais (Seed)
1. No **SQL Editor**, abra uma nova consulta (**New query**).
2. Abra o arquivo [`supabase/seed.sql`](../supabase/seed.sql), copie o conteúdo e cole no editor.
3. Clique em **"Run"**.
4. Serão cadastradas automaticamente 12 categorias populares em Parauapebas (Ar-Condicionado, Eletricista, Encanador, Pedreiro, Mecânica, Faxina, etc.).

---

### 4. Configurar as Chaves no Projeto
1. No painel do Supabase, vá em **Project Settings** > **API**.
2. Copie:
   - **Project URL**
   - **Project API Keys** -> `anon` / `public`
3. No projeto local, duplique o arquivo `.env.example` e renomeie para `.env`:
   ```bash
   cp .env.example .env
   ```
4. Cole suas credenciais no `.env`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

## 🏗️ Estrutura das Tabelas Criadas

| Tabela | Descrição |
|---|---|
| `categories` | Categorias e serviços prestados com ícones e status ativo. |
| `profiles` | Perfil de usuários (clientes e profissionais), integrado com o `auth.users`, foto, WhatsApp e bairro. |
| `professional_profiles` | Dados específicos do autônomo (habilidades, bairros atendidos em Parauapebas, modalidade, preços, chave PIX). |
| `portfolio_items` | Galeria de fotos de trabalhos já realizados pelos profissionais. |
| `service_requests` | Solicitações de orçamento dos clientes (direcionadas ou abertas por categoria e bairro). |
| `reviews` | Avaliações de 1 a 5 estrelas com comentário, recalculando automaticamente a reputação do autônomo. |

---

## 🔒 Segurança (RLS - Row Level Security)
- **Visitantes**: Podem visualizar perfis públicos de profissionais, portfólios, categorias e avaliações.
- **Clientes Autenticados**: Podem cadastrar solicitações de serviços e enviar avaliações.
- **Profissionais Autenticados**: Podem gerenciar seu próprio perfil, fotos de trabalhos e visualizar solicitações da sua categoria.

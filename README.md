# ⚡ Trampou - Marketplace de Profissionais Autônomos em Parauapebas

O **Trampou** é uma plataforma e Progressive Web App (PWA) de alta performance criada para conectar clientes a profissionais autônomos e prestadores de serviços qualificados na cidade de Parauapebas - PA.

---

## 📱 Recursos e Destaques
- **PWA (Progressive Web App)**: Instalável no Android, iOS, Windows e Mac direto pelo navegador, com suporte offline via Service Worker (`web/sw.js`).
- **Vitrine e Busca Inteligente**: Busca em tempo real por nome, especialidade e bairros de Parauapebas.
- **Botão SOS Emergencial**: Encontre eletricistas, encanadores, chaveiros e mecânicos 24 horas em segundos.
- **Atendimento e Orçamentos**: Solicitação rápida de orçamentos e agendamentos com redirecionamento direto para WhatsApp ou chat integrado.
- **Recursos Premium**: Módulo Antes & Depois para valorização do portfólio dos profissionais cadastrados.
- **Banner Viral de Compartilhamento**: Campanha integrada com compartilhamento nativo e via WhatsApp.
- **Backend Supabase / PostgreSQL**: Autenticação segura, Row Level Security (RLS), triggers automáticos e auditoria.

---

## 🚀 Como Executar Localmente

### 1. Clonar o repositório
```bash
git clone https://github.com/Johntavares/trampou.git
cd trampou
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto baseado em `.env.example`:
```env
PORT=3000
DATABASE_URL=seu_postgres_connection_string
SUPABASE_URL=sua_supabase_url
SUPABASE_ANON_KEY=sua_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_supabase_service_role_key
```

### 4. Iniciar o servidor de desenvolvimento
```bash
node server.js
```
Acesse em seu navegador: `http://localhost:3000`.

---

## 🗄️ Banco de Dados (Supabase / PostgreSQL)
- **Schema e Tabelas**: [`supabase/migrations/001_initial_schema.sql`](file:///supabase/migrations/001_initial_schema.sql)
- **Atendimentos e Chat**: [`supabase/migrations/002_chat_attendances.sql`](file:///supabase/migrations/002_chat_attendances.sql)
- **Categorias Oficiais de Parauapebas**: [`supabase/seed.sql`](file:///supabase/seed.sql)
- **Documentação do Setup**: [`docs/DATABASE_SETUP.md`](file:///docs/DATABASE_SETUP.md)

---

Desenvolvido para conectar quem precisa com quem sabe fazer em Parauapebas! 🚀

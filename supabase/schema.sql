-- Agente de rotina — esquema do banco.
-- Rode este arquivo no editor SQL do Supabase (Database > SQL Editor).

create extension if not exists pgcrypto;

-- Compromissos: tarefas criadas à mão e reuniões vindas do Calendar ou do Gmail.
create table if not exists compromissos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  titulo text not null,
  inicio timestamptz not null,
  fim timestamptz,
  local text,
  observacoes text,
  origem text not null default 'manual' check (origem in ('manual', 'calendar', 'gmail')),
  google_event_id text,
  gmail_message_id text,
  revisado boolean not null default false,
  cancelado boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index if not exists compromissos_google_event_idx
  on compromissos (usuario_id, google_event_id)
  where google_event_id is not null;

create unique index if not exists compromissos_gmail_message_idx
  on compromissos (usuario_id, gmail_message_id)
  where gmail_message_id is not null;

create index if not exists compromissos_inicio_idx on compromissos (usuario_id, inicio);

-- Lembretes: uma linha por envio agendado.
create table if not exists lembretes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  compromisso_id uuid not null references compromissos (id) on delete cascade,
  minutos_antes integer not null check (minutos_antes >= 0),
  canal text not null check (canal in ('email', 'whatsapp')),
  enviar_em timestamptz not null,
  status text not null default 'pendente' check (status in ('pendente', 'enviado', 'falhou', 'perdido', 'cancelado')),
  tentativas integer not null default 0,
  erro text,
  enviado_em timestamptz,
  criado_em timestamptz not null default now()
);

create index if not exists lembretes_fila_idx on lembretes (status, enviar_em);
create unique index if not exists lembretes_unicos_idx
  on lembretes (compromisso_id, canal, minutos_antes);

-- Configurações: uma linha por usuário.
create table if not exists configuracoes (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  whatsapp_telefone text,
  whatsapp_apikey text,
  email_destino text,
  lembrete_padrao_minutos integer,
  resumo_diario boolean not null default false,
  resumo_hora text not null default '07:00',
  ultima_sync_calendar timestamptz,
  ultima_sync_gmail timestamptz,
  erro_google text,
  atualizado_em timestamptz not null default now()
);

-- Tokens do Google. Nunca são lidos pelo navegador: só a service role enxerga.
create table if not exists google_tokens (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  escopos text,
  atualizado_em timestamptz not null default now()
);

-- Quem pode entrar além do admin (EMAIL_ADMIN). Só a service role enxerga.
create table if not exists usuarios_permitidos (
  email text primary key check (email = lower(email)),
  adicionado_em timestamptz not null default now()
);

alter table usuarios_permitidos enable row level security;
alter table compromissos enable row level security;
alter table lembretes enable row level security;
alter table configuracoes enable row level security;
alter table google_tokens enable row level security;

-- Cada pessoa só enxerga as próprias linhas. google_tokens fica sem policy de
-- propósito: nenhuma chave pública alcança a tabela, só a service role no servidor.
drop policy if exists compromissos_proprios on compromissos;
create policy compromissos_proprios on compromissos
  for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists lembretes_proprios on lembretes;
create policy lembretes_proprios on lembretes
  for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists configuracoes_proprias on configuracoes;
create policy configuracoes_proprias on configuracoes
  for all using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

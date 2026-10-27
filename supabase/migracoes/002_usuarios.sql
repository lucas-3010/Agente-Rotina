-- Vários usuários: lista de quem pode entrar além do admin.
-- Rode no SQL Editor do Supabase se você já tinha rodado o schema.sql antes.

create table if not exists usuarios_permitidos (
  email text primary key check (email = lower(email)),
  adicionado_em timestamptz not null default now()
);

-- Sem policy de propósito: só a service role, no servidor, lê e escreve a lista.
alter table usuarios_permitidos enable row level security;

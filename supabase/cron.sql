-- Agendador. Rode depois de publicar o site na Vercel.
-- Troque SEU_SITE pela URL do site e SEU_SEGREDO pelo valor de CRON_SECRET.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Dispara os lembretes vencidos, a cada minuto.
select cron.schedule(
  'lembretes',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://SEU_SITE/api/cron/lembretes',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SEU_SEGREDO"}'::jsonb
  );
  $$
);

-- Sincroniza o Google Calendar, a cada 5 minutos.
select cron.schedule(
  'sync-calendar',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://SEU_SITE/api/cron/sync-calendar',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SEU_SEGREDO"}'::jsonb
  );
  $$
);

-- Varre o Gmail atrás de convites, a cada 30 minutos.
select cron.schedule(
  'sync-gmail',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://SEU_SITE/api/cron/sync-gmail',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SEU_SEGREDO"}'::jsonb
  );
  $$
);

-- Resumo do dia, 7h em São Paulo (10:00 UTC).
select cron.schedule(
  'resumo-diario',
  '0 10 * * *',
  $$
  select net.http_post(
    url := 'https://SEU_SITE/api/cron/resumo-diario',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SEU_SEGREDO"}'::jsonb
  );
  $$
);

-- Para remover depois: select cron.unschedule('lembretes');

-- Os lembretes passam a ser dados pelo Google Agenda (notificação e email).
-- Sai o WhatsApp, o email pelo Resend e o resumo do dia.

delete from lembretes where canal = 'whatsapp';

alter table lembretes drop constraint if exists lembretes_canal_check;
alter table lembretes add constraint lembretes_canal_check
  check (canal in ('email', 'notificacao'));

alter table configuracoes
  drop column if exists whatsapp_telefone,
  drop column if exists whatsapp_apikey,
  drop column if exists email_destino,
  drop column if exists resumo_diario,
  drop column if exists resumo_hora;

# Agente de rotina

Agente pessoal que lê a agenda do Google, encontra convites de reunião no Gmail e envia lembretes por email e WhatsApp. Tem um site para cadastrar tarefas com nome, hora, local e quando lembrar.

- **Como colocar no ar**: [`docs/instalacao.md`](docs/instalacao.md)
- **Especificação**: [`docs/especificacao.md`](docs/especificacao.md)

## Como funciona

O site roda na Vercel. O Supabase guarda os dados e, pelo Cron, chama as rotas do site no horário certo, então nada depende de um computador ligado.

| A cada | Rota | O que faz |
| --- | --- | --- |
| 1 min | `/api/cron/lembretes` | Envia os lembretes vencidos |
| 5 min | `/api/cron/sync-calendar` | Traz as reuniões do Google Calendar |
| 30 min | `/api/cron/sync-gmail` | Procura convites no Gmail e os põe na agenda |
| 1 dia, 7h | `/api/cron/resumo-diario` | Manda o resumo do dia, se estiver ligado |

As telas são **Hoje**, **Semana**, **Nova tarefa**, **Novas reuniões** e **Ajustes**.

## Decisões que valem saber

- **Uma pessoa só.** `EMAIL_PERMITIDO` é o único email que entra. As tabelas têm RLS, e as rotas do agendador exigem `CRON_SECRET`.
- **Fuso fixo.** Tudo é calculado em `America/Sao_Paulo`, não no fuso do navegador.
- **Lembrete atrasado não vira enxurrada.** Se o agendador ficar parado, só o que venceu há menos de 15 minutos é enviado; o resto é marcado como perdido.
- **O Gmail não manda na agenda sozinho quando há dúvida.** Convite com `.ics` é lido direto do arquivo. Sem `.ics`, o Claude lê o texto, e se a data foi deduzida o item só aparece para você confirmar.
- **Dá para desfazer.** Todo evento criado a partir de um email leva a etiqueta `[Agente]` e tem um botão que o remove da agenda.
- **Nenhum segredo no repositório.** Tudo em variáveis de ambiente; veja [`.env.exemplo`](.env.exemplo).

## Stack

Next.js 15 com TypeScript e Tailwind, Supabase (Postgres, Auth com Google, Cron), Resend, CallMeBot e Claude Haiku.

## Desenvolvimento

```bash
npm install
cp .env.exemplo .env.local
npm run dev
npm test
```

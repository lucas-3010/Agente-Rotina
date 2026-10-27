# Agente de rotina

Agente pessoal que lê a agenda do Google, encontra convites de reunião no Gmail e põe tudo no Google Agenda com os lembretes que você escolher. Quem avisa é o próprio Google: notificação no celular e email. Tem um site para cadastrar tarefas com nome, hora, local e quando lembrar.

- **Como colocar no ar**: [`docs/instalacao.md`](docs/instalacao.md)
- **Especificação**: [`docs/especificacao.md`](docs/especificacao.md)

## Como funciona

O site roda na Vercel. O Supabase guarda os dados e, pelo Cron, chama as rotas do site no horário certo, então nada depende de um computador ligado.

| A cada | Rota | O que faz |
| --- | --- | --- |
| 5 min | `/api/cron/sync-calendar` | Traz as reuniões e os lembretes do Google Calendar |
| 30 min | `/api/cron/sync-gmail` | Procura convites no Gmail e os põe na agenda |

As telas são **Hoje**, **Semana**, **Nova tarefa**, **Novas reuniões** e **Ajustes**, mais **Convites**, que só o admin vê. Como convidar alguém está em [`docs/instalacao.md`](docs/instalacao.md#convidando-outras-pessoas).

## Decisões que valem saber

- **Cada um vê só o que é seu.** Entram o admin (`EMAIL_ADMIN`) e os emails da tabela `usuarios_permitidos`, ou qualquer conta com `ACESSO_ABERTO=true`. Todas as tabelas têm RLS, e as rotas do agendador exigem `CRON_SECRET`.
- **Fuso fixo.** Tudo é calculado em `America/Sao_Paulo`, não no fuso do navegador.
- **O Google Agenda é a fonte da verdade.** Cada tarefa vira um evento com lembretes (no máximo 5, até 4 semanas antes). Em reunião de outra pessoa o site muda só os seus lembretes. O banco guarda uma cópia, só para mostrar.
- **O Gmail não manda na agenda sozinho quando há dúvida.** Convite com `.ics` é lido direto do arquivo. Sem `.ics`, o Claude lê o texto, e se a data foi deduzida o item só aparece para você confirmar.
- **Dá para desfazer.** Todo evento criado a partir de um email leva a etiqueta `[Agente]` e tem um botão que o remove da agenda.
- **Nenhum segredo no repositório.** Tudo em variáveis de ambiente; veja [`.env.exemplo`](.env.exemplo).

## Stack

Next.js 15 com TypeScript e Tailwind, Supabase (Postgres, Auth com Google, Cron), Google Calendar API e Claude Haiku.

## Desenvolvimento

```bash
npm install
cp .env.exemplo .env.local
npm run dev
npm test
```

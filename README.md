# Agente de rotina

Agente pessoal que lê a agenda do Google, encontra convites de reunião no Gmail e envia lembretes por email e WhatsApp. Tem um site para cadastrar tarefas com nome, hora, local e quando lembrar.

Estado: especificação aprovada pendente. Nada foi construído ainda.

- Especificação: [`docs/especificacao.md`](docs/especificacao.md)
- Documento vivo: https://claude.ai/artifact/7oEvhyzw6FDwE4eBqDvPcA

## Stack planejada

| Parte | Escolha |
| --- | --- |
| Site | Next.js, TypeScript, Tailwind, na Vercel |
| Banco e agendador | Supabase (Postgres, Auth com Google, Cron) |
| Email | Resend |
| WhatsApp | CallMeBot |
| Leitura de convites sem `.ics` | Claude Haiku |

Nenhuma chave ou segredo entra neste repositório. Tudo fica nas variáveis de ambiente da Vercel e do Supabase.

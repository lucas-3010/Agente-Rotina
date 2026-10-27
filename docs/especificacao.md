# Agente de rotina — especificação

Documento vivo: https://claude.ai/artifact/7oEvhyzw6FDwE4eBqDvPcA

## Objetivo e decisões

Um site pessoal que junta as reuniões do Google Calendar e as tarefas cadastradas à mão, e põe tudo no Google Agenda com os lembretes escolhidos. Quem avisa é o próprio Google Agenda: notificação no celular e email.

| Tema | Decisão |
| --- | --- |
| Usuários | O Lucas (admin) e até 99 convidados, cada um vendo só o que é seu |
| Lembretes | Do próprio Google Agenda: notificação e email, escolhidos por tarefa (até 5) |
| Fonte principal | Google Calendar |
| Gmail | Procura convites que não estão na agenda e os adiciona ao Calendar |
| Antecedência | Escolhida no site, para cada tarefa ou reunião |
| Interface | Site simples e bem acabado, em português, funciona no celular |
| Hospedagem | Vercel (site) e Supabase (banco e agendador) |
| Conexão com o Google | Login com Google no próprio site (sincroniza sozinho, 24h) |
| Fuso horário | America/Sao_Paulo |

## Arquitetura

Um único site Next.js na Vercel faz tudo. O Supabase guarda os dados e, pelo Cron, chama as rotas do site no horário certo, então nada depende do computador do Lucas ligado.

```
Google Calendar  <-->  +---------------------+  <-->  Claude Haiku (lê convites sem .ics)
Gmail (leitura)   -->  |   Site na Vercel    |
Você (celular/PC) -->  |  telas + rotas      |   (os avisos saem do Google Agenda)
                       +---------------------+
                              ^        |
                     aciona   |        | lê e grava
                              +--------v------+
                              |   Supabase    |
                              | banco + cron  |
                              +---------------+
```

Tecnologias: Next.js com TypeScript e Tailwind, Supabase (Postgres, Auth com Google, Cron), Google Calendar API e Claude Haiku só para entender convites escritos em texto. Custo esperado: zero nos planos gratuitos, mais alguns centavos por mês de Claude.

## Telas do site

Cinco telas, todas em português, com tema claro e escuro e pensadas primeiro para o celular.

1. **Hoje**: linha do tempo do dia com reuniões e tarefas. Cada item mostra horário, local e os lembretes agendados (por exemplo, "Notificação 30 min antes"). No topo fica o próximo compromisso em destaque.
2. **Semana**: os próximos 7 dias agrupados por dia, com filtro entre tarefas e reuniões.
3. **Nova tarefa** (botão fixo +): nome, data e hora, local (texto livre com link para o Google Maps), observações e até 5 lembretes, cada um por notificação ou email. Os atalhos são 10 min, 30 min, 1 h e 1 dia antes, e também dá para escolher um tempo personalizado. Editar e excluir usam o mesmo formulário, e mudam o evento no Google Agenda junto. Em reunião de outra pessoa, só os lembretes podem ser mudados.
4. **Novas reuniões**: uma caixa de entrada com as reuniões recém-chegadas do Calendar, ou adicionadas a partir do Gmail, que ainda não têm lembrete. Você escolhe quando ser lembrado ou marca "manter o padrão da agenda". As que vieram do Gmail mostram o email de origem e têm um botão para desfazer, que remove o evento da agenda.
5. **Configurações**: um lembrete padrão opcional para reuniões (desligado por padrão) e o status da última sincronização com o Google.

## Dados e fluxos

Tudo vira um **compromisso** com zero ou mais **lembretes**. Os lembretes de verdade ficam no evento do Google Agenda; o banco guarda uma cópia só para o site mostrar.

| Tabela | Campos principais |
| --- | --- |
| `compromissos` | título, início, fim, local, observações, origem (manual, calendar, gmail), id do evento no Google, email de origem, status da revisão |
| `lembretes` | compromisso, minutos antes, canal (notificacao ou email), horário calculado |
| `configuracoes` | lembrete padrão, última sincronização |
| `google_tokens` | token de atualização do Google, criptografado, acessível só pelo servidor |

**Lembretes.** Ao salvar uma tarefa, o site cria ou atualiza o evento no Google Agenda com os lembretes escolhidos (`popup` para notificação, `email` para email). Em reuniões de outras pessoas, o site muda só os lembretes da sua cópia do evento. Não há disparo próprio: o Google avisa.

**Sincronização do Calendar (a cada 5 minutos).** Busca os eventos dos próximos 30 dias. Evento novo entra na caixa "Novas reuniões" (ou já recebe o lembrete padrão, se houver). Mudanças de horário e de lembretes feitas direto no app da Agenda são copiadas para o site. Evento cancelado some do site.

**Varredura do Gmail (a cada 30 minutos).** Procura emails recentes que parecem convite: anexo `.ics`, links do Meet, Zoom ou Teams, ou palavras como "reunião" e "call".

1. Com `.ics`, os dados são lidos direto do arquivo.
2. Sem `.ics`, o Claude (modelo Haiku) extrai título, data, hora e local. Se não tiver certeza da data, o item fica para confirmação no site em vez de ir para a agenda.
3. Se já existe um evento parecido no Calendar (mesmo horário e título semelhante), nada é criado.
4. Caso contrário, o evento é criado no Calendar com a etiqueta "[Agente]" e aparece em "Novas reuniões" com o botão de desfazer.

**Mensagens.** São as do próprio Google Agenda. Não há resumo do dia nem WhatsApp nesta versão.

## Erros, segurança e testes

- **Acesso**: entram o admin e os convidados da aba Convites. Todas as tabelas têm RLS ligado, e as rotas do agendador exigem um segredo.
- **Permissões do Google**: o site pede o Calendar (ler e criar eventos) e o Gmail somente leitura. Ele nunca envia email pela conta nem apaga evento de outra pessoa; só apaga os eventos que ele mesmo criou (tarefa excluída ou botão de desfazer).
- **Segredos**: chaves do Supabase, Claude e Google ficam nas variáveis de ambiente da Vercel e do Supabase, nunca no código nem no GitHub.
- **Se o Google desconectar**: o site mostra um aviso pedindo para entrar de novo. Os lembretes já salvos continuam no Google Agenda e chegam normalmente.
- **Limites do Google**: até 5 lembretes por evento, até 4 semanas antes. O site avisa em vez de cortar calado.
- **Testes**: testes automáticos para o cálculo de horários (incluindo fuso), a leitura de `.ics`, a detecção de duplicados e a conversão de lembretes para o formato do Google. Depois, um teste real: criar uma tarefa para daqui 5 minutos e confirmar que a notificação chega no celular.

## Fora desta primeira versão

Tarefas recorrentes (toda segunda, todo dia), aplicativo nativo de celular, WhatsApp e resumo do dia.

## Pendências com o Lucas

- [ ] Aprovar esta especificação
- [x] Criar o repositório privado no GitHub
- [x] Criar o projeto no Supabase
- [ ] Criar o projeto no Google Cloud para o login com Google

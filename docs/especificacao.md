# Agente de rotina — especificação

Documento vivo: https://claude.ai/artifact/7oEvhyzw6FDwE4eBqDvPcA

## Objetivo e decisões

Um site pessoal que junta as reuniões do Google Calendar e as tarefas cadastradas à mão, e lembra de cada uma por email e WhatsApp, no horário escolhido.

| Tema | Decisão |
| --- | --- |
| Usuários | Só o Lucas (login com a conta Google; qualquer outra conta é recusada) |
| Lembretes | Email e WhatsApp, escolhidos por tarefa |
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
Gmail (leitura)   -->  |   Site na Vercel    |   -->  Resend (email)
Você (celular/PC) -->  |  telas + rotas      |   -->  CallMeBot (WhatsApp)
                       +---------------------+
                              ^        |
                     aciona   |        | lê e grava
                              +--------v------+
                              |   Supabase    |
                              | banco + cron  |
                              +---------------+
```

Tecnologias: Next.js com TypeScript e Tailwind, Supabase (Postgres, Auth com Google, Cron), Resend para email, CallMeBot para WhatsApp e Claude Haiku só para entender convites escritos em texto. Custo esperado: zero nos planos gratuitos, mais alguns centavos por mês de Claude.

## Telas do site

Cinco telas, todas em português, com tema claro e escuro e pensadas primeiro para o celular.

1. **Hoje**: linha do tempo do dia com reuniões e tarefas. Cada item mostra horário, local e os lembretes agendados (por exemplo, "WhatsApp 30 min antes"). No topo fica o próximo compromisso em destaque.
2. **Semana**: os próximos 7 dias agrupados por dia, com filtro entre tarefas e reuniões.
3. **Nova tarefa** (botão fixo +): nome, data e hora, local (texto livre com link para o Google Maps), observações, canais (email, WhatsApp ou os dois) e um ou mais lembretes. Os atalhos são 10 min, 30 min, 1 h e 1 dia antes, e também dá para escolher um tempo personalizado. Editar e excluir usam o mesmo formulário.
4. **Novas reuniões**: uma caixa de entrada com as reuniões recém-chegadas do Calendar, ou adicionadas a partir do Gmail, que ainda não têm lembrete. Você escolhe quando ser lembrado ou marca "sem lembrete". As que vieram do Gmail mostram o email de origem e têm um botão para desfazer, que remove o evento da agenda.
5. **Configurações**: número do WhatsApp e chave do CallMeBot, email de destino, um botão para enviar lembrete de teste nos dois canais, um lembrete padrão opcional para reuniões (desligado por padrão) e o status da última sincronização com o Google.

## Dados e fluxos

Tudo vira um **compromisso** com zero ou mais **lembretes**. Cada lembrete é uma linha com horário de envio e canal, e o agendador só precisa olhar o que já venceu.

| Tabela | Campos principais |
| --- | --- |
| `compromissos` | título, início, fim, local, observações, origem (manual, calendar, gmail), id do evento no Google, email de origem, status da revisão |
| `lembretes` | compromisso, minutos antes, canal (email ou whatsapp), enviar_em, status (pendente, enviado, falhou), tentativas, erro |
| `configuracoes` | telefone do WhatsApp, chave do CallMeBot, email de destino, lembrete padrão, última sincronização |
| `google_tokens` | token de atualização do Google, criptografado, acessível só pelo servidor |

**Disparo de lembretes (a cada minuto).** O Supabase Cron chama uma rota protegida do site. Ela pega os lembretes pendentes com `enviar_em` já vencido, envia e marca como enviado. Uma falha é tentada até 3 vezes, e depois disso o lembrete aparece com aviso no site.

**Sincronização do Calendar (a cada 5 minutos).** Busca os eventos dos próximos 30 dias. Evento novo entra na caixa "Novas reuniões". Se mudar de horário, os lembretes são recalculados. Se for cancelado, os lembretes são cancelados.

**Varredura do Gmail (a cada 30 minutos).** Procura emails recentes que parecem convite: anexo `.ics`, links do Meet, Zoom ou Teams, ou palavras como "reunião" e "call".

1. Com `.ics`, os dados são lidos direto do arquivo.
2. Sem `.ics`, o Claude (modelo Haiku) extrai título, data, hora e local. Se não tiver certeza da data, o item fica para confirmação no site em vez de ir para a agenda.
3. Se já existe um evento parecido no Calendar (mesmo horário e título semelhante), nada é criado.
4. Caso contrário, o evento é criado no Calendar com a etiqueta "[Agente]" e aparece em "Novas reuniões" com o botão de desfazer.

**Mensagens.** Email pelo Resend, com assunto "Lembrete: <título> às 15:00" e corpo com local e link. WhatsApp pelo CallMeBot, com uma mensagem curta: "⏰ Reunião com X às 15:00 (em 30 min). Local: ...". Além disso, um resumo do dia às 7h por email e WhatsApp, que dá para desligar nas configurações.

## Erros, segurança e testes

- **Acesso**: só o email Google do Lucas entra. Todas as tabelas têm RLS ligado, e as rotas do agendador exigem um segredo.
- **Permissões do Google**: o site pede o Calendar (ler e criar eventos) e o Gmail somente leitura. Ele nunca envia email pela conta nem apaga nada, exceto o evento que ele mesmo criou, quando o botão de desfazer é usado.
- **Segredos**: chaves do Resend, CallMeBot, Claude e Google ficam nas variáveis de ambiente da Vercel e do Supabase, nunca no código nem no GitHub.
- **Se o Google desconectar**: o site mostra um aviso e manda um email pedindo para entrar de novo. As tarefas manuais continuam sendo lembradas.
- **Lembrete atrasado**: se o agendador ficar parado, lembretes vencidos há menos de 15 min ainda são enviados. Os mais antigos são marcados como perdidos, para não chegar uma enxurrada de mensagens velhas.
- **Testes**: testes automáticos para o cálculo de horários (incluindo fuso), a leitura de `.ics`, a detecção de duplicados e o disparo. Depois, um teste ponta a ponta no navegador: criar uma tarefa para daqui 2 minutos e confirmar que o email e o WhatsApp chegam.

## Fora desta primeira versão

Tarefas recorrentes (toda segunda, todo dia), outras pessoas usando o site, aplicativo nativo de celular e responder ao lembrete pelo WhatsApp (por exemplo, "adiar 10 min").

## Pendências com o Lucas

- [ ] Aprovar esta especificação
- [x] Criar o repositório privado no GitHub
- [ ] Confirmar o CallMeBot para o WhatsApp e ativá-lo no número
- [ ] Criar as contas gratuitas no Resend e no Supabase
- [ ] Criar o projeto no Google Cloud para o login com Google
- [ ] Dizer se quer o resumo do dia às 7h ligado por padrão

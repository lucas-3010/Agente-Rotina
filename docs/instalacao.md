# Como colocar o agente no ar

São cinco contas, todas gratuitas. Siga na ordem e guarde cada valor num bloco de notas: todos só entram na Vercel, no último passo.

> **Nunca cole uma chave secreta em chat, email ou print.** As marcadas como "secreta" abaixo dão acesso total ao banco ou às suas contas. Se precisar de ajuda, mande o nome da tela em que está, não o valor.

## 1. Supabase (banco)

1. Entre em [supabase.com](https://supabase.com) e crie um projeto. Região: **South America (São Paulo)**.
2. Guarde a senha do banco que ele pede.
3. Abra **SQL Editor**, cole o conteúdo de [`supabase/schema.sql`](../supabase/schema.sql) e rode.
4. Copie a URL do projeto: botão **Connect** no topo, ou **Project Settings > Data API**. É algo como `https://xxxx.supabase.co` → `NEXT_PUBLIC_SUPABASE_URL`.
5. Em **Project Settings > API Keys**, copie as duas chaves:
   - **Publishable key** (começa com `sb_publishable_`) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Secret key** (começa com `sb_secret_`; clique no olho para revelar) → `SUPABASE_SERVICE_ROLE_KEY`. **Secreta.**

   Se o seu projeto mostrar uma aba **Legacy API Keys** com `anon` e `service_role`, elas também funcionam no lugar das duas acima. Use as duas novas ou as duas antigas, sem misturar.

## 2. Google Cloud (login e acesso à agenda)

1. Em [console.cloud.google.com](https://console.cloud.google.com), crie um projeto chamado `agente-rotina`.
2. **APIs e serviços > Biblioteca**: ative a **Google Calendar API** e a **Gmail API**.
3. **Tela de permissão OAuth**: tipo **Externo**, nome "Agente de rotina", seu email nos campos de contato. Em **Usuários de teste**, adicione seu próprio email.
4. Em **Escopos**, adicione:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/gmail.readonly`
5. **Credenciais > Criar credenciais > ID do cliente OAuth**, tipo **Aplicativo da Web**.
   - Em **URIs de redirecionamento autorizados**, cole a URL que o Supabase mostra em **Authentication > Providers > Google** (algo como `https://xxxx.supabase.co/auth/v1/callback`).
6. Copie o **ID do cliente** → `GOOGLE_CLIENT_ID` e a **Chave secreta** → `GOOGLE_CLIENT_SECRET`.
7. Volte ao Supabase, em **Authentication > Providers > Google**: ligue, cole os dois valores e salve.

## 3. Resend (email)

1. Crie a conta em [resend.com](https://resend.com) e vá em **API Keys > Create**.
2. Copie a chave → `RESEND_API_KEY`.
3. Sem domínio próprio, deixe `EMAIL_REMETENTE` como `Agente de rotina <onboarding@resend.dev>`. Funciona, mas só envia para o email da sua conta Resend.

## 4. CallMeBot (WhatsApp)

1. Adicione **+34 621 331 709** aos seus contatos.
2. Mande para esse número, pelo WhatsApp: `I allow callmebot to send me messages`
3. Em alguns minutos chega a resposta com a sua **apikey**.
4. Essa chave e o seu número você digita depois, dentro do site, em **Ajustes**. Não vai nas variáveis de ambiente.

## 5. Anthropic (ler convites sem anexo)

1. Em [console.anthropic.com](https://console.anthropic.com), crie uma chave em **API Keys** → `ANTHROPIC_API_KEY`.
2. Isso é opcional. Sem a chave, o agente ainda lê convites com arquivo `.ics`, que é o caso da maioria.

## 6. Vercel (publicar o site)

1. Em [vercel.com](https://vercel.com), **Add New > Project** e escolha este repositório.
2. Antes de publicar, adicione as variáveis de ambiente abaixo.
3. Depois que publicar, copie a URL do site.
4. Abra o `supabase/cron.sql`, troque `SEU_SITE` pela URL e `SEU_SEGREDO` pelo valor de `CRON_SECRET`, e rode no SQL Editor do Supabase.

## Variáveis de ambiente

Na Vercel, em **Settings > Environment Variables**:

| Nome | De onde vem |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase, passo 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase, passo 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase, passo 1 (secreta) |
| `GOOGLE_CLIENT_ID` | Google Cloud, passo 2 |
| `GOOGLE_CLIENT_SECRET` | Google Cloud, passo 2 (secreta) |
| `RESEND_API_KEY` | Resend, passo 3 |
| `EMAIL_REMETENTE` | `Agente de rotina <onboarding@resend.dev>` |
| `EMAIL_ADMIN` | Seu email do Google. Ele sempre entra no site. |
| `ACESSO_ABERTO` | `false`: só você e os convidados entram. `true`: qualquer conta Google. |
| `CRON_SECRET` | Invente uma senha longa, ou gere com `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | Anthropic, passo 5 (opcional) |

## Conferindo se funcionou

1. Abra o site e entre com o Google. Contas que não são a sua nem de convidados são recusadas.
2. Vá em **Ajustes**, preencha o WhatsApp e clique em **Enviar lembrete de teste**. Devem chegar um email e uma mensagem.
3. Crie uma tarefa para daqui 3 minutos, com lembrete "na hora". Espere e veja se chega.
4. Em até 5 minutos suas reuniões da agenda aparecem em **Novas reuniões**.

## Rodando na sua máquina

```bash
npm install
cp .env.exemplo .env.local   # preencha os valores
npm run dev
```

Os testes rodam com `npm test`.

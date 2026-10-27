import { BotaoEntrar } from "./botao-entrar";

const MENSAGENS: Record<string, string> = {
  conta: "Essa conta Google não tem acesso a este site.",
  troca: "Não consegui concluir a entrada. Tente de novo.",
  "sem-codigo": "O Google não devolveu o código de acesso.",
};

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; de?: string }>;
}) {
  const { erro, de } = await searchParams;
  const mensagem = erro ? MENSAGENS[erro] ?? "Algo deu errado." : null;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Agente de rotina
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Seus compromissos em um lugar só, com lembretes do Google Agenda no celular e no email.
        </p>

        {mensagem && (
          <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {mensagem}
          </p>
        )}

        <BotaoEntrar de={de} />

        <p className="mt-6 text-xs text-slate-500">
          O site lê sua agenda e procura convites no Gmail. Ele nunca envia email pela sua conta.
        </p>
      </div>
    </main>
  );
}

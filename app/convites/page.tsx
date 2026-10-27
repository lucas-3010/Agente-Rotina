import { notFound } from "next/navigation";
import { desconvidar } from "./acoes";
import { FormConvite } from "@/components/form-convite";
import { Moldura, Vazio } from "@/components/moldura";
import { ehAdmin } from "@/lib/acesso";
import { contarNovas } from "@/lib/consultas";
import { LIMITE_CONVIDADOS, listarConvites } from "@/lib/convites";
import { usuarioAtual } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

export default async function Convites() {
  const usuario = await usuarioAtual();
  if (!usuario || !ehAdmin(usuario.email)) notFound();

  const [convites, pendentes] = await Promise.all([listarConvites(), contarNovas()]);

  return (
    <Moldura
      titulo="Convites"
      subtitulo={`${convites.length} de ${LIMITE_CONVIDADOS} convidados`}
      pendentes={pendentes}
    >
      <FormConvite />

      <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        Depois de convidar aqui, adicione o mesmo email no Google Cloud, em{" "}
        <a
          href="https://console.cloud.google.com/auth/audience"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Público &gt; Usuários de teste
        </a>
        . Sem isso, o Google bloqueia o login da pessoa.
      </p>

      <div className="mt-8">
        {convites.length === 0 ? (
          <Vazio>Ninguém convidado ainda. Por enquanto só você entra.</Vazio>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {convites.map((c) => {
              const remover = async () => {
                "use server";
                await desconvidar(c.email);
              };

              return (
                <li key={c.email} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-900 dark:text-slate-100">{c.email}</p>
                    <p className="text-xs text-slate-500">
                      {c.ja_entrou ? "já entrou no site" : "ainda não entrou"}
                    </p>
                  </div>
                  <form action={remover}>
                    <button
                      type="submit"
                      className="rounded-lg px-3 py-1.5 text-sm text-red-700 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      Remover
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Remover tira o acesso na hora, para de ler a agenda e o Gmail da pessoa e cancela os
        lembretes dela. Os dados ficam guardados caso você convide de novo.
      </p>
    </Moldura>
  );
}

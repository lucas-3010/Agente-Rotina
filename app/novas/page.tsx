import { desfazerDoGmail, manterPadrao, revisarReuniao } from "@/app/acoes";
import { Moldura, Vazio } from "@/components/moldura";
import { SeletorLembretes } from "@/components/seletor-lembretes";
import { contarNovas, reunioesNovas } from "@/lib/consultas";
import { dataPorExtenso, horas } from "@/lib/tempo";

export const dynamic = "force-dynamic";

export default async function Novas() {
  const [reunioes, pendentes] = await Promise.all([reunioesNovas(), contarNovas()]);

  return (
    <Moldura
      titulo="Novas reuniões"
      subtitulo="Chegaram sozinhas. Escolha os lembretes ou mantenha os da agenda"
      pendentes={pendentes}
    >
      {reunioes.length === 0 ? (
        <Vazio>Nada novo por aqui. Tudo que chegou já foi revisado.</Vazio>
      ) : (
        <ul className="space-y-4">
          {reunioes.map((reuniao) => {
            const salvar = async (form: FormData) => {
              "use server";
              await revisarReuniao(reuniao.id, form);
            };

            const desfazer = async () => {
              "use server";
              await desfazerDoGmail(reuniao.id);
            };

            const padrao = async () => {
              "use server";
              await manterPadrao(reuniao.id);
            };

            return (
              <li
                key={reuniao.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium text-slate-900 dark:text-slate-100">
                    {reuniao.titulo}
                  </h3>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {reuniao.origem === "gmail" ? "do Gmail" : "da agenda"}
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {dataPorExtenso(reuniao.inicio)} às {horas(reuniao.inicio)}
                  {reuniao.local && ` — ${reuniao.local}`}
                </p>

                {reuniao.observacoes && (
                  <p className="mt-2 text-sm text-slate-500">{reuniao.observacoes}</p>
                )}

                <form action={salvar} className="mt-4 space-y-3">
                  <SeletorLembretes />
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
                  >
                    Salvar lembretes
                  </button>
                </form>

                <div className="mt-2 flex gap-2">
                  <form action={padrao} className="flex-1">
                    <button
                      type="submit"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400"
                    >
                      Manter o padrão da agenda
                    </button>
                  </form>

                  {reuniao.origem === "gmail" && (
                    <form action={desfazer} className="flex-1">
                      <button
                        type="submit"
                        className="w-full rounded-xl border border-red-200 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:text-red-400"
                      >
                        Desfazer
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Moldura>
  );
}

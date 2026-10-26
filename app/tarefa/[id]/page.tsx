import { notFound, redirect } from "next/navigation";
import { atualizarCompromisso, criarCompromisso, excluirCompromisso } from "@/app/acoes";
import { Moldura } from "@/components/moldura";
import { SeletorLembretes } from "@/components/seletor-lembretes";
import { supabaseDoUsuario } from "@/lib/supabase/servidor";
import { instanteParaHoraLocal } from "@/lib/tempo";
import type { CompromissoComLembretes } from "@/lib/tipos";

export const dynamic = "force-dynamic";

export default async function Tarefa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const nova = id === "nova";

  let compromisso: CompromissoComLembretes | null = null;

  if (!nova) {
    const supabase = await supabaseDoUsuario();
    const { data } = await supabase
      .from("compromissos")
      .select("*, lembretes(*)")
      .eq("id", id)
      .maybeSingle();

    if (!data) notFound();
    compromisso = data as CompromissoComLembretes;
  }

  async function salvar(form: FormData) {
    "use server";
    if (nova) {
      await criarCompromisso(form);
    } else {
      await atualizarCompromisso(id, form);
    }
    redirect("/");
  }

  async function excluir() {
    "use server";
    await excluirCompromisso(id);
    redirect("/");
  }

  const pendentes =
    compromisso?.lembretes
      .filter((l) => l.status === "pendente")
      .map((l) => ({ minutos_antes: l.minutos_antes, canal: l.canal })) ?? [];

  return (
    <Moldura titulo={nova ? "Nova tarefa" : "Editar"}>
      <form action={salvar} className="space-y-6">
        <Campo rotulo="Nome">
          <input
            name="titulo"
            required
            defaultValue={compromisso?.titulo ?? ""}
            placeholder="Reunião com o time"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
          />
        </Campo>

        <Campo rotulo="Data e hora">
          <input
            type="datetime-local"
            name="inicio"
            required
            defaultValue={compromisso ? instanteParaHoraLocal(compromisso.inicio) : ""}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
          />
        </Campo>

        <Campo rotulo="Local" opcional>
          <input
            name="local"
            defaultValue={compromisso?.local ?? ""}
            placeholder="Av. Paulista 1000, ou link do Meet"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
          />
        </Campo>

        <Campo rotulo="Observações" opcional>
          <textarea
            name="observacoes"
            rows={3}
            defaultValue={compromisso?.observacoes ?? ""}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
          />
        </Campo>

        <Campo rotulo="Quando lembrar">
          <SeletorLembretes iniciais={pendentes} />
        </Campo>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900"
          >
            Salvar
          </button>
        </div>
      </form>

      {!nova && (
        <form action={excluir} className="mt-4">
          <button
            type="submit"
            className="w-full rounded-xl border border-red-200 px-4 py-3 text-sm text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            Excluir
          </button>
        </form>
      )}
    </Moldura>
  );
}

function Campo({
  rotulo,
  opcional = false,
  children,
}: {
  rotulo: string;
  opcional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {rotulo}
        {opcional && <span className="ml-1 font-normal text-slate-400">opcional</span>}
      </span>
      {children}
    </label>
  );
}

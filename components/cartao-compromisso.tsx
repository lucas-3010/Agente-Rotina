import Link from "next/link";
import { antecedenciaPorExtenso, faltam, horas } from "@/lib/tempo";
import type { CompromissoComLembretes } from "@/lib/tipos";

const ROTULO_CANAL: Record<string, string> = { email: "Email", notificacao: "Notificação" };

export function CartaoCompromisso({
  compromisso,
  destaque = false,
}: {
  compromisso: CompromissoComLembretes;
  destaque?: boolean;
}) {
  const pendentes = compromisso.lembretes.filter((l) => l.status === "pendente");

  return (
    <Link
      href={`/tarefa/${compromisso.id}`}
      className={`block rounded-2xl border p-4 transition hover:border-slate-300 dark:hover:border-slate-700 ${
        destaque
          ? "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-sm tabular-nums text-slate-500 dark:text-slate-400">
          {horas(compromisso.inicio)}
        </span>
        <span className="text-xs text-slate-400">{faltam(compromisso.inicio)}</span>
      </div>

      <h3 className="mt-1 font-medium text-slate-900 dark:text-slate-100">{compromisso.titulo}</h3>

      {compromisso.local && (
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{compromisso.local}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {compromisso.origem !== "manual" && (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {compromisso.origem === "gmail" ? "do Gmail" : "da agenda"}
          </span>
        )}
        {pendentes.map((l) => (
          <span
            key={l.id}
            className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          >
            {ROTULO_CANAL[l.canal]} {antecedenciaPorExtenso(l.minutos_antes)}
          </span>
        ))}
        {pendentes.length === 0 && (
          <span className="rounded-md px-2 py-0.5 text-xs text-slate-400">
            {compromisso.origem === "manual" ? "sem lembrete" : "lembrete padrão da agenda"}
          </span>
        )}
      </div>
    </Link>
  );
}

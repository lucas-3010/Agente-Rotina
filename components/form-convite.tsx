"use client";

import { useActionState } from "react";
import { convidar, type EstadoConvite } from "@/app/convites/acoes";

const INICIAL: EstadoConvite = { erro: null, ok: null };

export function FormConvite() {
  const [estado, acao, enviando] = useActionState(convidar, INICIAL);

  return (
    <form action={acao} className="space-y-2">
      <div className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="amigo@gmail.com"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
        />
        <button
          type="submit"
          disabled={enviando}
          className="rounded-xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          {enviando ? "…" : "Convidar"}
        </button>
      </div>
      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      {estado.ok && <p className="text-sm text-green-700 dark:text-green-400">{estado.ok}</p>}
    </form>
  );
}

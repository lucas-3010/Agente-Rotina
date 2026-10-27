"use client";

import { useState } from "react";
import { MAX_LEMBRETES } from "@/lib/google/limites";
import { antecedenciaPorExtenso } from "@/lib/tempo";
import type { Canal } from "@/lib/tipos";

const ATALHOS = [10, 30, 60, 1440];

export interface LembreteEscolhido {
  minutos_antes: number;
  canal: Canal;
}

/**
 * Escolha de quando lembrar. Os valores saem no FormData como pares
 * lembrete_minutos / lembrete_canal, lidos juntos pelas server actions.
 */
export function SeletorLembretes({ iniciais = [] }: { iniciais?: LembreteEscolhido[] }) {
  const [lembretes, setLembretes] = useState<LembreteEscolhido[]>(iniciais);
  const [minutosCustom, setMinutosCustom] = useState("");
  const [canal, setCanal] = useState<Canal>("notificacao");

  function adicionar(minutos: number) {
    if (!Number.isFinite(minutos) || minutos < 0) return;
    const jaTem = lembretes.some((l) => l.minutos_antes === minutos && l.canal === canal);
    if (jaTem || lembretes.length >= MAX_LEMBRETES) return;
    setLembretes([...lembretes, { minutos_antes: minutos, canal }].sort((a, b) => b.minutos_antes - a.minutos_antes));
  }

  function remover(indice: number) {
    setLembretes(lembretes.filter((_, i) => i !== indice));
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["notificacao", "email"] as Canal[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCanal(c)}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              canal === c
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {c === "notificacao" ? "Notificação" : "Email"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {ATALHOS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => adicionar(m)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:text-slate-300"
          >
            {antecedenciaPorExtenso(m)}
          </button>
        ))}
        <span className="flex items-center gap-1.5">
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={minutosCustom}
            onChange={(e) => setMinutosCustom(e.target.value)}
            placeholder="min"
            className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={() => {
              adicionar(Number(minutosCustom));
              setMinutosCustom("");
            }}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300"
          >
            Adicionar
          </button>
        </span>
      </div>

      <p className="text-xs text-slate-500">
        Quem avisa é o Google Agenda: a notificação chega pelo app da Agenda no celular. Até{" "}
        {MAX_LEMBRETES} lembretes.
      </p>

      {lembretes.length === 0 ? (
        <p className="text-sm text-slate-500">Sem lembrete. Escolha acima se quiser ser avisado.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {lembretes.map((l, i) => (
            <li
              key={`${l.canal}-${l.minutos_antes}`}
              className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-800"
            >
              <span>
                {l.canal === "notificacao" ? "Notificação" : "Email"} {antecedenciaPorExtenso(l.minutos_antes)}
              </span>
              <button
                type="button"
                onClick={() => remover(i)}
                aria-label="Remover lembrete"
                className="text-slate-400 hover:text-red-600"
              >
                ×
              </button>
              <input type="hidden" name="lembrete_minutos" value={l.minutos_antes} />
              <input type="hidden" name="lembrete_canal" value={l.canal} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

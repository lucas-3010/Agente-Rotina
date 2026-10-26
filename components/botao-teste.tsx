"use client";

import { useState } from "react";

export function BotaoTeste() {
  const [estado, setEstado] = useState<"parado" | "enviando">("parado");
  const [resultado, setResultado] = useState<Record<string, string> | null>(null);

  async function enviar() {
    setEstado("enviando");
    setResultado(null);
    try {
      const resposta = await fetch("/api/teste-envio", { method: "POST" });
      setResultado(await resposta.json());
    } catch (e) {
      setResultado({ erro: e instanceof Error ? e.message : String(e) });
    } finally {
      setEstado("parado");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={enviar}
        disabled={estado === "enviando"}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 transition hover:border-slate-400 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
      >
        {estado === "enviando" ? "Enviando…" : "Enviar lembrete de teste"}
      </button>

      {resultado && (
        <ul className="mt-3 space-y-1 text-sm">
          {Object.entries(resultado).map(([canal, valor]) => (
            <li key={canal} className={valor === "ok" ? "text-green-700" : "text-red-600"}>
              <strong className="capitalize">{canal}</strong>: {valor === "ok" ? "chegou" : valor}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

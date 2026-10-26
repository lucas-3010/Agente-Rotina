"use client";

import { useState } from "react";
import { supabaseDoNavegador } from "@/lib/supabase/navegador";

const ESCOPOS = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/gmail.readonly",
].join(" ");

export function BotaoEntrar({ de }: { de?: string }) {
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    setCarregando(true);
    const supabase = supabaseDoNavegador();
    const destino = new URL("/auth/callback", window.location.origin);
    if (de) destino.searchParams.set("de", de);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: destino.toString(),
        scopes: ESCOPOS,
        // Sem isto o Google não devolve o refresh token na segunda entrada.
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });

    if (error) setCarregando(false);
  }

  return (
    <button
      onClick={entrar}
      disabled={carregando}
      className="mt-8 w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
    >
      {carregando ? "Abrindo o Google…" : "Entrar com Google"}
    </button>
  );
}

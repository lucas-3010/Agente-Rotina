import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;

/** Cliente ligado à sessão de quem está navegando. Respeita o RLS. */
export async function supabaseDoUsuario() {
  const jar = await cookies();
  return createServerClient(url(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // Em Server Components não dá para escrever cookie; o middleware cuida disso.
        }
      },
    },
  });
}

/**
 * Cliente com service role, para o agendador e para a tabela de tokens.
 * Nunca deve ser importado por código que roda no navegador.
 */
export function supabaseAdmin() {
  return createClient(url(), process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Devolve o usuário da sessão, ou null. */
export async function usuarioAtual() {
  const supabase = await supabaseDoUsuario();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

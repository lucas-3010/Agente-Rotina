import { supabaseDoUsuario, usuarioAtual } from "@/lib/supabase/servidor";
import { fimDoDia, inicioDoDia } from "@/lib/tempo";
import type { CompromissoComLembretes, Configuracoes } from "@/lib/tipos";

/** Compromissos entre dois instantes, com os lembretes de cada um. */
export async function compromissosEntre(
  de: Date,
  ate: Date,
): Promise<CompromissoComLembretes[]> {
  const supabase = await supabaseDoUsuario();
  const { data } = await supabase
    .from("compromissos")
    .select("*, lembretes(*)")
    .eq("cancelado", false)
    .gte("inicio", de.toISOString())
    .lt("inicio", ate.toISOString())
    .order("inicio", { ascending: true });

  return (data ?? []) as CompromissoComLembretes[];
}

export async function compromissosDeHoje(): Promise<CompromissoComLembretes[]> {
  return compromissosEntre(inicioDoDia(), fimDoDia());
}

export async function compromissosDaSemana(): Promise<CompromissoComLembretes[]> {
  const de = inicioDoDia();
  const ate = new Date(de.getTime() + 7 * 24 * 60 * 60_000);
  return compromissosEntre(de, ate);
}

/** A caixa "Novas reuniões": o que chegou sozinho e ainda não foi revisado. */
export async function reunioesNovas(): Promise<CompromissoComLembretes[]> {
  const supabase = await supabaseDoUsuario();
  const { data } = await supabase
    .from("compromissos")
    .select("*, lembretes(*)")
    .eq("revisado", false)
    .eq("cancelado", false)
    .neq("origem", "manual")
    .gte("inicio", new Date().toISOString())
    .order("inicio", { ascending: true });

  return (data ?? []) as CompromissoComLembretes[];
}

export async function contarNovas(): Promise<number> {
  const supabase = await supabaseDoUsuario();
  const { count } = await supabase
    .from("compromissos")
    .select("id", { count: "exact", head: true })
    .eq("revisado", false)
    .eq("cancelado", false)
    .neq("origem", "manual")
    .gte("inicio", new Date().toISOString());

  return count ?? 0;
}

export async function configuracoes(): Promise<Configuracoes | null> {
  const usuario = await usuarioAtual();
  if (!usuario) return null;

  const supabase = await supabaseDoUsuario();
  const { data } = await supabase
    .from("configuracoes")
    .select("*")
    .eq("usuario_id", usuario.id)
    .maybeSingle();

  return (data as Configuracoes) ?? null;
}

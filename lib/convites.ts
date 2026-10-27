import { ehAdmin } from "@/lib/acesso";
import { supabaseAdmin } from "@/lib/supabase/servidor";

/**
 * Sem a verificação do Google, o app aceita até 100 usuários de teste,
 * e o admin ocupa uma dessas vagas.
 */
export const LIMITE_CONVIDADOS = 99;

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface Convite {
  email: string;
  adicionado_em: string;
  ja_entrou: boolean;
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validarConvite(email: string, existentes: string[]): string | null {
  const alvo = normalizarEmail(email);
  if (!FORMATO_EMAIL.test(alvo)) return "Esse email não parece válido.";
  if (ehAdmin(alvo)) return "Esse é o seu email: você já entra sempre.";
  if (existentes.includes(alvo)) return "Esse email já está convidado.";
  if (existentes.length >= LIMITE_CONVIDADOS) {
    return `O limite é de ${LIMITE_CONVIDADOS} convidados enquanto o app não passa pela verificação do Google.`;
  }
  return null;
}

async function idsPorEmail(): Promise<Map<string, string>> {
  const { data } = await supabaseAdmin().auth.admin.listUsers({ page: 1, perPage: 1000 });
  return new Map(
    (data?.users ?? [])
      .filter((u) => u.email)
      .map((u) => [normalizarEmail(u.email!), u.id]),
  );
}

export async function listarConvites(): Promise<Convite[]> {
  const [{ data }, ids] = await Promise.all([
    supabaseAdmin()
      .from("usuarios_permitidos")
      .select("email, adicionado_em")
      .order("adicionado_em", { ascending: false }),
    idsPorEmail(),
  ]);

  return (data ?? []).map((c) => ({ ...c, ja_entrou: ids.has(c.email) }));
}

export async function adicionarConvite(email: string): Promise<void> {
  const atuais = (await listarConvites()).map((c) => c.email);
  const erro = validarConvite(email, atuais);
  if (erro) throw new Error(erro);

  const { error } = await supabaseAdmin()
    .from("usuarios_permitidos")
    .insert({ email: normalizarEmail(email) });
  if (error) throw new Error(`Não consegui convidar: ${error.message}`);
}

/**
 * Tira o acesso: a pessoa não entra mais, o agendador para de ler a agenda
 * e o Gmail dela, e os lembretes pendentes são cancelados. Os dados ficam,
 * caso ela seja convidada de novo.
 */
export async function removerConvite(email: string): Promise<void> {
  const alvo = normalizarEmail(email);
  const admin = supabaseAdmin();

  const { error } = await admin.from("usuarios_permitidos").delete().eq("email", alvo);
  if (error) throw new Error(`Não consegui remover: ${error.message}`);

  const usuarioId = (await idsPorEmail()).get(alvo);
  if (!usuarioId) return;

  await admin.from("google_tokens").delete().eq("usuario_id", usuarioId);
  await admin
    .from("lembretes")
    .update({ status: "cancelado" })
    .eq("usuario_id", usuarioId)
    .eq("status", "pendente");
}

import { supabaseAdmin } from "@/lib/supabase/servidor";

function normalizar(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/** O dono do site. EMAIL_PERMITIDO é o nome antigo, aceito para não quebrar instalações. */
export function emailAdmin(): string {
  return normalizar(process.env.EMAIL_ADMIN ?? process.env.EMAIL_PERMITIDO);
}

export function ehAdmin(email: string | null | undefined): boolean {
  const admin = emailAdmin();
  return !!admin && normalizar(email) === admin;
}

/** Com ACESSO_ABERTO=true, qualquer conta Google entra. */
export function acessoAberto(): boolean {
  return process.env.ACESSO_ABERTO === "true";
}

/**
 * Quem pode entrar: o admin, qualquer um com o acesso aberto, ou quem está
 * na lista de convidados. A lista só é lida com a service role.
 */
export async function podeEntrar(email: string | null | undefined): Promise<boolean> {
  const alvo = normalizar(email);
  if (!alvo) return false;
  if (ehAdmin(alvo) || acessoAberto()) return true;

  const { data } = await supabaseAdmin()
    .from("usuarios_permitidos")
    .select("email")
    .eq("email", alvo)
    .maybeSingle();

  return !!data;
}

"use server";

import { revalidatePath } from "next/cache";
import { ehAdmin } from "@/lib/acesso";
import { adicionarConvite, removerConvite } from "@/lib/convites";
import { usuarioAtual } from "@/lib/supabase/servidor";

async function exigirAdmin() {
  const usuario = await usuarioAtual();
  if (!usuario || !ehAdmin(usuario.email)) throw new Error("Só o dono do site gerencia convites.");
}

export interface EstadoConvite {
  erro: string | null;
  ok: string | null;
}

export async function convidar(_anterior: EstadoConvite, form: FormData): Promise<EstadoConvite> {
  await exigirAdmin();
  const email = String(form.get("email") ?? "");

  try {
    await adicionarConvite(email);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : String(e), ok: null };
  }

  revalidatePath("/convites");
  return { erro: null, ok: `${email.trim().toLowerCase()} foi convidado.` };
}

export async function desconvidar(email: string) {
  await exigirAdmin();
  await removerConvite(email);
  revalidatePath("/convites");
}

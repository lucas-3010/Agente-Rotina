import type { SupabaseClient } from "@supabase/supabase-js";
import { momentoDoLembrete } from "./tempo";
import type { Canal } from "./tipos";

/** Lembrete vencido há mais que isso não é enviado: vira "perdido". */
export const TOLERANCIA_MINUTOS = 15;
export const MAX_TENTATIVAS = 3;

export interface PedidoDeLembrete {
  minutos_antes: number;
  canal: Canal;
}

/**
 * Reescreve os lembretes de um compromisso. Os que já foram enviados ficam
 * como estão, para não reenviar nada ao editar o horário de uma reunião.
 */
export async function definirLembretes(
  supabase: SupabaseClient,
  params: {
    usuarioId: string;
    compromissoId: string;
    inicio: string | Date;
    pedidos: PedidoDeLembrete[];
  },
): Promise<void> {
  const { usuarioId, compromissoId, inicio, pedidos } = params;

  await supabase
    .from("lembretes")
    .delete()
    .eq("compromisso_id", compromissoId)
    .eq("status", "pendente");

  if (pedidos.length === 0) return;

  const { data: jaEnviados } = await supabase
    .from("lembretes")
    .select("canal, minutos_antes")
    .eq("compromisso_id", compromissoId)
    .in("status", ["enviado", "perdido"]);

  const enviados = new Set((jaEnviados ?? []).map((l) => `${l.canal}:${l.minutos_antes}`));

  const novos = pedidos
    .filter((p) => !enviados.has(`${p.canal}:${p.minutos_antes}`))
    .map((p) => ({
      usuario_id: usuarioId,
      compromisso_id: compromissoId,
      minutos_antes: p.minutos_antes,
      canal: p.canal,
      enviar_em: momentoDoLembrete(inicio, p.minutos_antes).toISOString(),
      status: "pendente" as const,
    }));

  if (novos.length > 0) {
    const { error } = await supabase.from("lembretes").insert(novos);
    if (error) throw new Error(`Não consegui agendar os lembretes: ${error.message}`);
  }
}

/** Decide o que fazer com um lembrete vencido: enviar ou dar por perdido. */
export function devoEnviar(enviarEm: string | Date, agora: Date = new Date()): boolean {
  const alvo = typeof enviarEm === "string" ? new Date(enviarEm) : enviarEm;
  const atrasoMinutos = (agora.getTime() - alvo.getTime()) / 60_000;
  return atrasoMinutos >= 0 && atrasoMinutos <= TOLERANCIA_MINUTOS;
}

export function estaPerdido(enviarEm: string | Date, agora: Date = new Date()): boolean {
  const alvo = typeof enviarEm === "string" ? new Date(enviarEm) : enviarEm;
  return (agora.getTime() - alvo.getTime()) / 60_000 > TOLERANCIA_MINUTOS;
}

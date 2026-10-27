import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_LEMBRETES, MAX_MINUTOS } from "./google/limites";
import { momentoDoLembrete } from "./tempo";
import type { Canal } from "./tipos";

export interface PedidoDeLembrete {
  minutos_antes: number;
  canal: Canal;
}

/**
 * Deixa os lembretes do jeito que o Google aceita: sem repetidos, dentro de
 * 0 a 4 semanas e no máximo 5. Passou de 5, avisa em vez de cortar calado.
 */
export function normalizarLembretes(pedidos: PedidoDeLembrete[]): PedidoDeLembrete[] {
  const validos = pedidos
    .filter((p) => Number.isInteger(p.minutos_antes) && p.minutos_antes >= 0)
    .filter((p) => p.canal === "email" || p.canal === "notificacao")
    .filter(
      (p, i, todos) =>
        todos.findIndex((o) => o.canal === p.canal && o.minutos_antes === p.minutos_antes) === i,
    );

  if (validos.some((p) => p.minutos_antes > MAX_MINUTOS)) {
    throw new Error("O Google só aceita lembretes até 4 semanas antes.");
  }
  if (validos.length > MAX_LEMBRETES) {
    throw new Error(`O Google aceita no máximo ${MAX_LEMBRETES} lembretes por compromisso.`);
  }

  return validos.sort((a, b) => b.minutos_antes - a.minutos_antes);
}

export function mesmosLembretes(a: PedidoDeLembrete[], b: PedidoDeLembrete[]): boolean {
  const chave = (l: PedidoDeLembrete) => `${l.canal}:${l.minutos_antes}`;
  const ca = a.map(chave).sort();
  const cb = b.map(chave).sort();
  return ca.length === cb.length && ca.every((c, i) => c === cb.at(i));
}

/**
 * Guarda no banco uma cópia dos lembretes que estão no Google, só para o site
 * mostrá-los. Quem avisa é o Google Agenda.
 */
export async function guardarLembretes(
  supabase: SupabaseClient,
  params: {
    usuarioId: string;
    compromissoId: string;
    inicio: string | Date;
    pedidos: PedidoDeLembrete[];
  },
): Promise<void> {
  const { usuarioId, compromissoId, inicio, pedidos } = params;

  await supabase.from("lembretes").delete().eq("compromisso_id", compromissoId);
  if (pedidos.length === 0) return;

  const { error } = await supabase.from("lembretes").insert(
    pedidos.map((p) => ({
      usuario_id: usuarioId,
      compromisso_id: compromissoId,
      minutos_antes: p.minutos_antes,
      canal: p.canal,
      enviar_em: momentoDoLembrete(inicio, p.minutos_antes).toISOString(),
      status: "pendente" as const,
    })),
  );
  if (error) throw new Error(`Não consegui guardar os lembretes: ${error.message}`);
}

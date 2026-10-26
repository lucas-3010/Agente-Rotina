import { NextResponse } from "next/server";
import { conferirSegredo, usuarioDoAgendador } from "@/lib/cron/autorizar";
import { listarEventos } from "@/lib/google/calendar";
import { GoogleDesconectado } from "@/lib/google/token";
import { definirLembretes } from "@/lib/lembretes";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import { momentoDoLembrete } from "@/lib/tempo";
import type { Compromisso, Lembrete } from "@/lib/tipos";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const recusa = conferirSegredo(request);
  if (recusa) return recusa;
  return sincronizar();
}

async function sincronizar() {
  const usuario = await usuarioDoAgendador();
  if (!usuario) return NextResponse.json({ erro: "usuário não encontrado" }, { status: 404 });

  const admin = supabaseAdmin();

  let eventos;
  try {
    eventos = await listarEventos(usuario.id, 30);
  } catch (e) {
    if (e instanceof GoogleDesconectado) {
      return NextResponse.json({ erro: "google desconectado" }, { status: 409 });
    }
    throw e;
  }

  const { data: config } = await admin
    .from("configuracoes")
    .select("lembrete_padrao_minutos")
    .eq("usuario_id", usuario.id)
    .maybeSingle();

  let novos = 0;
  let atualizados = 0;
  let cancelados = 0;

  for (const evento of eventos) {
    const { data: existente } = await admin
      .from("compromissos")
      .select("*")
      .eq("usuario_id", usuario.id)
      .eq("google_event_id", evento.id)
      .maybeSingle();

    if (evento.cancelado) {
      if (existente) {
        await admin.from("compromissos").update({ cancelado: true }).eq("id", existente.id);
        await admin
          .from("lembretes")
          .update({ status: "cancelado" })
          .eq("compromisso_id", existente.id)
          .eq("status", "pendente");
        cancelados++;
      }
      continue;
    }

    if (!existente) {
      const { data: criado } = await admin
        .from("compromissos")
        .insert({
          usuario_id: usuario.id,
          titulo: evento.titulo,
          inicio: evento.inicio,
          fim: evento.fim,
          local: evento.local,
          origem: "calendar",
          google_event_id: evento.id,
          revisado: false,
        })
        .select()
        .single();

      // Se há um lembrete padrão, a reunião já chega agendada e revisada.
      const padrao = config?.lembrete_padrao_minutos;
      if (criado && typeof padrao === "number") {
        await definirLembretes(admin, {
          usuarioId: usuario.id,
          compromissoId: criado.id,
          inicio: criado.inicio,
          pedidos: [{ minutos_antes: padrao, canal: "whatsapp" }],
        });
        await admin.from("compromissos").update({ revisado: true }).eq("id", criado.id);
      }
      novos++;
      continue;
    }

    const mudou =
      existente.titulo !== evento.titulo ||
      new Date(existente.inicio).getTime() !== new Date(evento.inicio).getTime() ||
      (existente.local ?? null) !== (evento.local ?? null);

    if (mudou) {
      await admin
        .from("compromissos")
        .update({
          titulo: evento.titulo,
          inicio: evento.inicio,
          fim: evento.fim,
          local: evento.local,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", existente.id);

      await recalcularLembretes(admin, existente as Compromisso, evento.inicio);
      atualizados++;
    }
  }

  await admin
    .from("configuracoes")
    .upsert({ usuario_id: usuario.id, ultima_sync_calendar: new Date().toISOString() });

  return NextResponse.json({ novos, atualizados, cancelados, vistos: eventos.length });
}

/** Mudou o horário da reunião: os lembretes pendentes andam junto. */
async function recalcularLembretes(admin: any, compromisso: Compromisso, novoInicio: string) {
  const { data: pendentes } = await admin
    .from("lembretes")
    .select("*")
    .eq("compromisso_id", compromisso.id)
    .eq("status", "pendente");

  for (const lembrete of (pendentes ?? []) as Lembrete[]) {
    await admin
      .from("lembretes")
      .update({ enviar_em: momentoDoLembrete(novoInicio, lembrete.minutos_antes).toISOString() })
      .eq("id", lembrete.id);
  }
}

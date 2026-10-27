import { NextResponse } from "next/server";
import { conferirSegredo, paraCada, usuariosComGoogle } from "@/lib/cron/autorizar";
import { definirLembretesNoEvento, listarEventos, type EventoDoGoogle } from "@/lib/google/calendar";
import { GoogleDesconectado } from "@/lib/google/token";
import { guardarLembretes, mesmosLembretes } from "@/lib/lembretes";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import type { Lembrete } from "@/lib/tipos";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const recusa = conferirSegredo(request);
  if (recusa) return recusa;
  return NextResponse.json(await paraCada(await usuariosComGoogle(), sincronizar));
}

/**
 * O Google Agenda é quem avisa, então ele é a fonte da verdade: o site
 * copia daqui os eventos e os lembretes, inclusive os que você mudar
 * direto no app da Agenda.
 */
async function sincronizar(usuarioId: string) {
  const admin = supabaseAdmin();

  let eventos: EventoDoGoogle[];
  try {
    eventos = await listarEventos(usuarioId, 30);
  } catch (e) {
    if (e instanceof GoogleDesconectado) return { usuarioId, desconectado: true };
    throw e;
  }

  const { data: config } = await admin
    .from("configuracoes")
    .select("lembrete_padrao_minutos")
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  let novos = 0;
  let atualizados = 0;
  let cancelados = 0;

  for (const evento of eventos) {
    const { data: existente } = await admin
      .from("compromissos")
      .select("*, lembretes(*)")
      .eq("usuario_id", usuarioId)
      .eq("google_event_id", evento.id)
      .maybeSingle();

    if (evento.cancelado) {
      if (existente && !existente.cancelado) {
        await admin.from("compromissos").update({ cancelado: true }).eq("id", existente.id);
        await admin.from("lembretes").delete().eq("compromisso_id", existente.id);
        cancelados++;
      }
      continue;
    }

    if (!existente) {
      const { data: criado } = await admin
        .from("compromissos")
        .insert({
          usuario_id: usuarioId,
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

      if (!criado) continue;

      // Com lembrete padrão nas configurações, a reunião já chega com ele no
      // Google e sai da caixa "Novas reuniões".
      const padrao = config?.lembrete_padrao_minutos;
      let lembretes = evento.lembretes ?? [];
      if (typeof padrao === "number") {
        lembretes = [{ minutos_antes: padrao, canal: "notificacao" }];
        await definirLembretesNoEvento(usuarioId, evento.id, lembretes);
        await admin.from("compromissos").update({ revisado: true }).eq("id", criado.id);
      }

      await guardarLembretes(admin, {
        usuarioId,
        compromissoId: criado.id,
        inicio: criado.inicio,
        pedidos: lembretes,
      });
      novos++;
      continue;
    }

    const mudouEvento =
      existente.titulo !== evento.titulo ||
      new Date(existente.inicio).getTime() !== new Date(evento.inicio).getTime() ||
      (existente.local ?? null) !== (evento.local ?? null);

    // null = o evento usa o padrão da agenda; aí não há lista para copiar.
    const doGoogle = evento.lembretes ?? [];
    const guardados = (existente.lembretes as Lembrete[]).map((l) => ({
      minutos_antes: l.minutos_antes,
      canal: l.canal,
    }));
    const mudouLembretes = !mesmosLembretes(doGoogle, guardados);

    if (mudouEvento) {
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
    }

    // O horário de cada lembrete depende do início, então mudou um, recalcula.
    if (mudouEvento || mudouLembretes) {
      await guardarLembretes(admin, {
        usuarioId,
        compromissoId: existente.id,
        inicio: evento.inicio,
        pedidos: doGoogle,
      });
      atualizados++;
    }
  }

  await admin
    .from("configuracoes")
    .upsert({ usuario_id: usuarioId, ultima_sync_calendar: new Date().toISOString() });

  return { usuarioId, novos, atualizados, cancelados, vistos: eventos.length };
}

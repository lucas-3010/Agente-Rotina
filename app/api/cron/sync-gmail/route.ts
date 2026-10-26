import { NextResponse } from "next/server";
import { conferirSegredo, usuarioDoAgendador } from "@/lib/cron/autorizar";
import { criarEvento, listarEventos, pareceDuplicado } from "@/lib/google/calendar";
import { buscarCandidatos, lerIcs, type ConviteExtraido } from "@/lib/google/gmail";
import { GoogleDesconectado } from "@/lib/google/token";
import { extrairConvite } from "@/lib/ia/extrair-convite";
import { supabaseAdmin } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const recusa = conferirSegredo(request);
  if (recusa) return recusa;

  const usuario = await usuarioDoAgendador();
  if (!usuario) return NextResponse.json({ erro: "usuário não encontrado" }, { status: 404 });

  const admin = supabaseAdmin();

  const { data: config } = await admin
    .from("configuracoes")
    .select("ultima_sync_gmail")
    .eq("usuario_id", usuario.id)
    .maybeSingle();

  // Na primeira vez, olha 2 dias para trás; depois, só o que chegou desde a última passada.
  const desde = config?.ultima_sync_gmail
    ? new Date(config.ultima_sync_gmail)
    : new Date(Date.now() - 2 * 24 * 60 * 60_000);

  let candidatos;
  let naAgenda;
  try {
    candidatos = await buscarCandidatos(usuario.id, desde);
    naAgenda = await listarEventos(usuario.id, 60);
  } catch (e) {
    if (e instanceof GoogleDesconectado) {
      return NextResponse.json({ erro: "google desconectado" }, { status: 409 });
    }
    throw e;
  }

  let criados = 0;
  let paraConfirmar = 0;
  let ignorados = 0;

  for (const email of candidatos) {
    const { data: jaVisto } = await admin
      .from("compromissos")
      .select("id")
      .eq("usuario_id", usuario.id)
      .eq("gmail_message_id", email.id)
      .maybeSingle();

    if (jaVisto) {
      ignorados++;
      continue;
    }

    let convite: ConviteExtraido | null = email.ics ? lerIcs(email.ics) : null;
    if (!convite) convite = await extrairConvite(email);

    if (!convite || new Date(convite.inicio).getTime() < Date.now()) {
      ignorados++;
      continue;
    }

    if (pareceDuplicado(convite, naAgenda)) {
      ignorados++;
      continue;
    }

    // Data deduzida pelo Claude: não mexe na agenda, só pede confirmação no site.
    if (!convite.confiavel) {
      await admin.from("compromissos").insert({
        usuario_id: usuario.id,
        titulo: convite.titulo,
        inicio: convite.inicio,
        fim: convite.fim,
        local: convite.local,
        observacoes: `Do email de ${email.remetente}. A data foi deduzida, confira antes.`,
        origem: "gmail",
        gmail_message_id: email.id,
        revisado: false,
      });
      paraConfirmar++;
      continue;
    }

    const eventoId = await criarEvento(usuario.id, {
      titulo: convite.titulo,
      inicio: convite.inicio,
      fim: convite.fim,
      local: convite.local,
      descricao: `Criado pelo agente a partir do email de ${email.remetente}.`,
    });

    await admin.from("compromissos").insert({
      usuario_id: usuario.id,
      titulo: convite.titulo,
      inicio: convite.inicio,
      fim: convite.fim,
      local: convite.local,
      observacoes: `Do email de ${email.remetente}.`,
      origem: "gmail",
      gmail_message_id: email.id,
      google_event_id: eventoId,
      revisado: false,
    });

    criados++;
  }

  await admin
    .from("configuracoes")
    .upsert({ usuario_id: usuario.id, ultima_sync_gmail: new Date().toISOString() });

  return NextResponse.json({ criados, paraConfirmar, ignorados, vistos: candidatos.length });
}

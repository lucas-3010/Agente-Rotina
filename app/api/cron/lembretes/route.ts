import { NextResponse } from "next/server";
import { conferirSegredo } from "@/lib/cron/autorizar";
import { enviarEmail, enviarWhatsApp, FalhaDeEnvio } from "@/lib/envio/canais";
import { montarLembrete } from "@/lib/envio/mensagem";
import { devoEnviar, estaPerdido, MAX_TENTATIVAS, TOLERANCIA_MINUTOS } from "@/lib/lembretes";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import type { Compromisso, Configuracoes, Lembrete } from "@/lib/tipos";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const recusa = conferirSegredo(request);
  if (recusa) return recusa;

  const admin = supabaseAdmin();
  const agora = new Date();
  // Busca uma janela maior que a tolerância para poder marcar os perdidos.
  const limite = new Date(agora.getTime() + 30_000).toISOString();

  const { data: lembretes, error } = await admin
    .from("lembretes")
    .select("*, compromissos(*)")
    .eq("status", "pendente")
    .lte("enviar_em", limite)
    .order("enviar_em", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  let enviados = 0;
  let perdidos = 0;
  let falhas = 0;

  for (const linha of (lembretes ?? []) as (Lembrete & { compromissos: Compromisso })[]) {
    const compromisso = linha.compromissos;

    if (!compromisso || compromisso.cancelado) {
      await admin.from("lembretes").update({ status: "cancelado" }).eq("id", linha.id);
      continue;
    }

    if (estaPerdido(linha.enviar_em, agora)) {
      await admin
        .from("lembretes")
        .update({
          status: "perdido",
          erro: `Vencido há mais de ${TOLERANCIA_MINUTOS} min quando o agendador rodou.`,
        })
        .eq("id", linha.id);
      perdidos++;
      continue;
    }

    if (!devoEnviar(linha.enviar_em, agora)) continue;

    const { data: config } = await admin
      .from("configuracoes")
      .select("*")
      .eq("usuario_id", linha.usuario_id)
      .maybeSingle();

    try {
      await despachar(linha, compromisso, config as Configuracoes | null);
      await admin
        .from("lembretes")
        .update({ status: "enviado", enviado_em: new Date().toISOString(), erro: null })
        .eq("id", linha.id);
      enviados++;
    } catch (e) {
      const tentativas = linha.tentativas + 1;
      const mensagem = e instanceof Error ? e.message : String(e);
      await admin
        .from("lembretes")
        .update({
          tentativas,
          erro: mensagem.slice(0, 500),
          status: tentativas >= MAX_TENTATIVAS ? "falhou" : "pendente",
        })
        .eq("id", linha.id);
      falhas++;
    }
  }

  return NextResponse.json({ enviados, perdidos, falhas, vistos: lembretes?.length ?? 0 });
}

async function despachar(
  lembrete: Lembrete,
  compromisso: Compromisso,
  config: Configuracoes | null,
) {
  const mensagem = montarLembrete(compromisso, lembrete.minutos_antes);

  if (lembrete.canal === "email") {
    const destino = config?.email_destino ?? process.env.EMAIL_PERMITIDO;
    if (!destino) throw new FalhaDeEnvio("Sem email de destino configurado.");
    await enviarEmail(destino, mensagem);
    return;
  }

  if (!config) throw new FalhaDeEnvio("Sem configurações de WhatsApp.");
  await enviarWhatsApp(config, mensagem.texto);
}

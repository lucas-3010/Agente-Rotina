import { NextResponse } from "next/server";
import { conferirSegredo, emailDoUsuario, paraCada } from "@/lib/cron/autorizar";
import { enviarEmail, enviarWhatsApp } from "@/lib/envio/canais";
import { montarResumoDoDia } from "@/lib/envio/mensagem";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import { fimDoDia, inicioDoDia } from "@/lib/tempo";
import type { Compromisso, Configuracoes } from "@/lib/tipos";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const recusa = conferirSegredo(request);
  if (recusa) return recusa;

  const { data: configs, error } = await supabaseAdmin()
    .from("configuracoes")
    .select("*")
    .eq("resumo_diario", true);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  const porUsuario = new Map((configs ?? []).map((c) => [c.usuario_id, c as Configuracoes]));
  return NextResponse.json(
    await paraCada([...porUsuario.keys()], (id) => enviarResumo(porUsuario.get(id)!)),
  );
}

async function enviarResumo(config: Configuracoes) {
  const { data: compromissos } = await supabaseAdmin()
    .from("compromissos")
    .select("*")
    .eq("usuario_id", config.usuario_id)
    .eq("cancelado", false)
    .gte("inicio", inicioDoDia().toISOString())
    .lt("inicio", fimDoDia().toISOString())
    .order("inicio", { ascending: true });

  const mensagem = montarResumoDoDia((compromissos ?? []) as Compromisso[]);
  const erros: string[] = [];

  try {
    const destino = config.email_destino ?? (await emailDoUsuario(config.usuario_id));
    if (!destino) throw new Error("Sem email de destino.");
    await enviarEmail(destino, mensagem);
  } catch (e) {
    erros.push(e instanceof Error ? e.message : String(e));
  }

  // Sem WhatsApp configurado, o resumo vai só por email, sem contar como erro.
  if (config.whatsapp_telefone && config.whatsapp_apikey) {
    try {
      await enviarWhatsApp(config, mensagem.texto);
    } catch (e) {
      erros.push(e instanceof Error ? e.message : String(e));
    }
  }

  return { usuarioId: config.usuario_id, itens: compromissos?.length ?? 0, erros };
}

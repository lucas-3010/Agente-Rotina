import { NextResponse } from "next/server";
import { conferirSegredo, usuarioDoAgendador } from "@/lib/cron/autorizar";
import { enviarEmail, enviarWhatsApp } from "@/lib/envio/canais";
import { montarResumoDoDia } from "@/lib/envio/mensagem";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import { fimDoDia, inicioDoDia } from "@/lib/tempo";
import type { Compromisso, Configuracoes } from "@/lib/tipos";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const recusa = conferirSegredo(request);
  if (recusa) return recusa;

  const usuario = await usuarioDoAgendador();
  if (!usuario) return NextResponse.json({ erro: "usuário não encontrado" }, { status: 404 });

  const admin = supabaseAdmin();
  const { data: config } = await admin
    .from("configuracoes")
    .select("*")
    .eq("usuario_id", usuario.id)
    .maybeSingle();

  if (!config?.resumo_diario) {
    return NextResponse.json({ enviado: false, motivo: "resumo desligado" });
  }

  const { data: compromissos } = await admin
    .from("compromissos")
    .select("*")
    .eq("usuario_id", usuario.id)
    .eq("cancelado", false)
    .gte("inicio", inicioDoDia().toISOString())
    .lt("inicio", fimDoDia().toISOString())
    .order("inicio", { ascending: true });

  const mensagem = montarResumoDoDia((compromissos ?? []) as Compromisso[]);
  const erros: string[] = [];

  try {
    const destino = (config as Configuracoes).email_destino ?? usuario.email;
    await enviarEmail(destino, mensagem);
  } catch (e) {
    erros.push(e instanceof Error ? e.message : String(e));
  }

  try {
    await enviarWhatsApp(config as Configuracoes, mensagem.texto);
  } catch (e) {
    erros.push(e instanceof Error ? e.message : String(e));
  }

  return NextResponse.json({ enviado: erros.length < 2, itens: compromissos?.length ?? 0, erros });
}

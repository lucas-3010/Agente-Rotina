import { NextResponse } from "next/server";
import { enviarEmail, enviarWhatsApp } from "@/lib/envio/canais";
import { configuracoes } from "@/lib/consultas";
import { podeEntrar } from "@/lib/acesso";
import { usuarioAtual } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

/** Botão "enviar teste" das configurações. Exige sessão, como o resto do site. */
export async function POST() {
  const usuario = await usuarioAtual();
  if (!usuario || !(await podeEntrar(usuario.email))) {
    return NextResponse.json({ erro: "sem permissão" }, { status: 401 });
  }

  const config = await configuracoes();
  const texto = "✅ Teste do agente de rotina. Se chegou, está tudo certo.";
  const resultado: Record<string, string> = {};

  try {
    await enviarEmail(config?.email_destino ?? usuario.email!, {
      assunto: "Teste do agente de rotina",
      texto,
      html: `<p>${texto}</p>`,
    });
    resultado.email = "ok";
  } catch (e) {
    resultado.email = e instanceof Error ? e.message : String(e);
  }

  try {
    if (!config) throw new Error("Configure o WhatsApp primeiro.");
    await enviarWhatsApp(config, texto);
    resultado.whatsapp = "ok";
  } catch (e) {
    resultado.whatsapp = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(resultado);
}

import { Resend } from "resend";
import type { Mensagem } from "./mensagem";
import type { Configuracoes } from "@/lib/tipos";

export class FalhaDeEnvio extends Error {}

export async function enviarEmail(destino: string, mensagem: Mensagem): Promise<void> {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) throw new FalhaDeEnvio("RESEND_API_KEY não está configurada.");

  const resend = new Resend(chave);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_REMETENTE ?? "Agente de rotina <onboarding@resend.dev>",
    to: destino,
    subject: mensagem.assunto,
    text: mensagem.texto,
    html: `<div style="font-family:system-ui,sans-serif;color:#111">${mensagem.html}</div>`,
  });

  if (error) throw new FalhaDeEnvio(`Resend recusou: ${error.message}`);
}

/**
 * CallMeBot manda WhatsApp para o próprio número do dono da chave.
 * A ativação é feita uma vez, mandando a mensagem que eles pedem.
 */
export async function enviarWhatsApp(
  config: Pick<Configuracoes, "whatsapp_telefone" | "whatsapp_apikey">,
  texto: string,
): Promise<void> {
  if (!config.whatsapp_telefone || !config.whatsapp_apikey) {
    throw new FalhaDeEnvio("WhatsApp não está configurado nas configurações do site.");
  }

  const url = new URL("https://api.callmebot.com/whatsapp.php");
  url.searchParams.set("phone", config.whatsapp_telefone);
  url.searchParams.set("text", texto);
  url.searchParams.set("apikey", config.whatsapp_apikey);

  const resposta = await fetch(url, { method: "GET" });
  const corpo = await resposta.text();

  // O CallMeBot responde 200 mesmo em alguns erros, então o corpo também é checado.
  if (!resposta.ok || /error|invalid|not found/i.test(corpo)) {
    throw new FalhaDeEnvio(`CallMeBot recusou: ${corpo.slice(0, 200)}`);
  }
}

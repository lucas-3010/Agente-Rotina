import type { ConviteExtraido, EmailCandidato } from "@/lib/google/gmail";
import { FUSO } from "@/lib/tempo";

const MODELO = "claude-haiku-5-5";

/**
 * Para emails sem .ics, o Claude lê o texto e diz se há uma reunião ali.
 * Quando a data não está clara, devolve confiavel: false, e o site pede
 * confirmação em vez de mexer na agenda sozinho.
 */
export async function extrairConvite(email: EmailCandidato): Promise<ConviteExtraido | null> {
  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) return null;

  const hoje = new Date().toISOString();

  const resposta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": chave,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 400,
      system: [
        "Você lê emails em português e inglês e diz se eles marcam uma reunião com data e hora.",
        `Agora é ${hoje} e o fuso de referência é ${FUSO}.`,
        "Responda só com JSON, sem texto em volta.",
        "Se o email não marca uma reunião concreta, responda {\"reuniao\": false}.",
        "Se marca, responda {\"reuniao\": true, \"titulo\": string, \"inicio\": string ISO 8601 com fuso,",
        "\"fim\": string ISO 8601 ou null, \"local\": string ou null, \"confiavel\": boolean}.",
        "confiavel é false quando a data ou a hora foram deduzidas e podem estar erradas,",
        "por exemplo quando o email diz apenas 'semana que vem' ou 'quinta à tarde'.",
      ].join(" "),
      messages: [
        {
          role: "user",
          content: `Assunto: ${email.assunto}\nDe: ${email.remetente}\nRecebido em: ${email.recebidoEm}\n\n${email.texto}`,
        },
      ],
    }),
  });

  if (!resposta.ok) return null;

  const corpo = await resposta.json();
  const texto: string = corpo.content?.[0]?.text ?? "";

  try {
    const inicioJson = texto.indexOf("{");
    const fimJson = texto.lastIndexOf("}");
    if (inicioJson < 0 || fimJson < 0) return null;

    const dados = JSON.parse(texto.slice(inicioJson, fimJson + 1));
    if (!dados.reuniao || !dados.inicio) return null;

    const inicio = new Date(dados.inicio);
    if (Number.isNaN(inicio.getTime())) return null;
    // Convite para o passado não interessa.
    if (inicio.getTime() < Date.now()) return null;

    return {
      titulo: String(dados.titulo ?? email.assunto),
      inicio: inicio.toISOString(),
      fim: dados.fim ? new Date(dados.fim).toISOString() : null,
      local: dados.local ? String(dados.local) : null,
      confiavel: dados.confiavel === true,
    };
  } catch {
    return null;
  }
}

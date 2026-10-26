import ICAL from "ical.js";
import { accessTokenDoUsuario } from "./token";

const BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface EmailCandidato {
  id: string;
  assunto: string;
  remetente: string;
  recebidoEm: string;
  texto: string;
  ics: string | null;
}

export interface ConviteExtraido {
  titulo: string;
  inicio: string;
  fim: string | null;
  local: string | null;
  confiavel: boolean;
}

async function chamar(usuarioId: string, caminho: string) {
  const token = await accessTokenDoUsuario(usuarioId);
  const resposta = await fetch(`${BASE}${caminho}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resposta.ok) {
    const corpo = await resposta.text();
    throw new Error(`Gmail respondeu ${resposta.status}: ${corpo.slice(0, 300)}`);
  }
  return resposta.json();
}

/** Emails recentes que cheiram a convite de reunião. */
export async function buscarCandidatos(usuarioId: string, desde: Date): Promise<EmailCandidato[]> {
  const dias = Math.max(1, Math.ceil((Date.now() - desde.getTime()) / (24 * 60 * 60_000)));
  const consulta = [
    `newer_than:${dias}d`,
    "-in:spam",
    "-in:trash",
    "(has:attachment filename:ics OR meet.google.com OR zoom.us OR teams.microsoft.com",
    'OR "reunião" OR "reuniao" OR "convite" OR "call" OR "meeting")',
  ].join(" ");

  const lista = await chamar(usuarioId, `/messages?q=${encodeURIComponent(consulta)}&maxResults=25`);
  const ids: string[] = (lista.messages ?? []).map((m: any) => m.id);

  const emails: EmailCandidato[] = [];
  for (const id of ids) {
    const mensagem = await chamar(usuarioId, `/messages/${id}?format=full`);
    emails.push(lerMensagem(mensagem));
  }
  return emails;
}

function lerMensagem(mensagem: any): EmailCandidato {
  const cabecalhos: Record<string, string> = {};
  for (const h of mensagem.payload?.headers ?? []) {
    cabecalhos[h.name.toLowerCase()] = h.value;
  }

  let texto = "";
  let ics: string | null = null;

  const andar = (parte: any) => {
    if (!parte) return;
    const tipo = parte.mimeType ?? "";
    const nome: string = parte.filename ?? "";
    const dados = parte.body?.data;

    if (dados && tipo.startsWith("text/plain")) {
      texto += decodificar(dados);
    } else if (dados && (tipo.includes("calendar") || nome.toLowerCase().endsWith(".ics"))) {
      ics = decodificar(dados);
    }
    (parte.parts ?? []).forEach(andar);
  };
  andar(mensagem.payload);

  if (!texto) texto = mensagem.snippet ?? "";

  return {
    id: mensagem.id,
    assunto: cabecalhos["subject"] ?? "(sem assunto)",
    remetente: cabecalhos["from"] ?? "",
    recebidoEm: new Date(Number(mensagem.internalDate ?? Date.now())).toISOString(),
    texto: texto.slice(0, 4000),
    ics,
  };
}

function decodificar(base64url: string): string {
  return Buffer.from(base64url.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

/** Lê um .ics. É o caminho confiável: os dados vêm prontos, sem adivinhação. */
export function lerIcs(conteudo: string): ConviteExtraido | null {
  try {
    const jcal = ICAL.parse(conteudo);
    const comp = new ICAL.Component(jcal);
    const vevent = comp.getFirstSubcomponent("vevent");
    if (!vevent) return null;

    const evento = new ICAL.Event(vevent);
    if (!evento.startDate) return null;

    return {
      titulo: evento.summary ?? "(sem título)",
      inicio: evento.startDate.toJSDate().toISOString(),
      fim: evento.endDate ? evento.endDate.toJSDate().toISOString() : null,
      local: evento.location || null,
      confiavel: true,
    };
  } catch {
    return null;
  }
}

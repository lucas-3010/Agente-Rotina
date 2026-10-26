import { accessTokenDoUsuario } from "./token";

export interface EventoDoGoogle {
  id: string;
  titulo: string;
  inicio: string;
  fim: string | null;
  local: string | null;
  cancelado: boolean;
}

const BASE = "https://www.googleapis.com/calendar/v3";

async function chamar(usuarioId: string, caminho: string, init?: RequestInit) {
  const token = await accessTokenDoUsuario(usuarioId);
  const resposta = await fetch(`${BASE}${caminho}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!resposta.ok) {
    const corpo = await resposta.text();
    throw new Error(`Google Calendar respondeu ${resposta.status}: ${corpo.slice(0, 300)}`);
  }

  return resposta.status === 204 ? null : resposta.json();
}

/** Eventos dos próximos `dias` dias, já sem os dia-inteiro. */
export async function listarEventos(usuarioId: string, dias = 30): Promise<EventoDoGoogle[]> {
  const agora = new Date();
  const ate = new Date(agora.getTime() + dias * 24 * 60 * 60_000);

  const params = new URLSearchParams({
    timeMin: agora.toISOString(),
    timeMax: ate.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const dados = await chamar(usuarioId, `/calendars/primary/events?${params}`);

  return (dados.items ?? [])
    .filter((e: any) => e.start?.dateTime)
    .map((e: any) => ({
      id: e.id,
      titulo: e.summary ?? "(sem título)",
      inicio: e.start.dateTime,
      fim: e.end?.dateTime ?? null,
      local: e.location ?? null,
      cancelado: e.status === "cancelled",
    }));
}

export async function criarEvento(
  usuarioId: string,
  evento: { titulo: string; inicio: string; fim?: string | null; local?: string | null; descricao?: string },
): Promise<string> {
  const inicio = new Date(evento.inicio);
  const fim = evento.fim ? new Date(evento.fim) : new Date(inicio.getTime() + 60 * 60_000);

  const criado = await chamar(usuarioId, "/calendars/primary/events", {
    method: "POST",
    body: JSON.stringify({
      summary: `[Agente] ${evento.titulo}`,
      location: evento.local ?? undefined,
      description: evento.descricao ?? "Criado pelo agente de rotina a partir de um email.",
      start: { dateTime: inicio.toISOString(), timeZone: "America/Sao_Paulo" },
      end: { dateTime: fim.toISOString(), timeZone: "America/Sao_Paulo" },
    }),
  });

  return criado.id;
}

export async function apagarEvento(usuarioId: string, eventoId: string): Promise<void> {
  await chamar(usuarioId, `/calendars/primary/events/${encodeURIComponent(eventoId)}`, {
    method: "DELETE",
  });
}

/**
 * Um evento do Gmail só é criado se não houver nada parecido na agenda:
 * mesmo horário (até 30 min de diferença) e título semelhante.
 */
export function pareceDuplicado(
  candidato: { titulo: string; inicio: string },
  existentes: EventoDoGoogle[],
): boolean {
  const alvo = new Date(candidato.inicio).getTime();
  const titulo = normalizar(candidato.titulo);

  return existentes.some((e) => {
    const perto = Math.abs(new Date(e.inicio).getTime() - alvo) <= 30 * 60_000;
    if (!perto) return false;
    const outro = normalizar(e.titulo);
    return outro.includes(titulo) || titulo.includes(outro) || outro === titulo;
  });
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^\[agente\]\s*/, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

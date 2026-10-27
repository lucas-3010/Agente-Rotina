import type { Canal } from "@/lib/tipos";
import { accessTokenDoUsuario } from "./token";

export interface LembreteDoGoogle {
  minutos_antes: number;
  canal: Canal;
}

export interface EventoDoGoogle {
  id: string;
  titulo: string;
  inicio: string;
  fim: string | null;
  local: string | null;
  cancelado: boolean;
  /** null quando o evento usa os lembretes padrão da agenda. */
  lembretes: LembreteDoGoogle[] | null;
}

export { MAX_LEMBRETES, MAX_MINUTOS } from "./limites";

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

/** Converte os lembretes do site para o formato do Google, e de volta. */
export function paraOGoogle(lembretes: LembreteDoGoogle[]) {
  return {
    useDefault: false,
    overrides: lembretes.map((l) => ({
      method: l.canal === "email" ? "email" : "popup",
      minutes: l.minutos_antes,
    })),
  };
}

export function doGoogle(reminders: any): LembreteDoGoogle[] | null {
  if (!reminders || reminders.useDefault) return null;
  return (reminders.overrides ?? []).map((o: any) => ({
    minutos_antes: Number(o.minutes),
    canal: o.method === "email" ? "email" : "notificacao",
  }));
}

function paraEvento(e: any): EventoDoGoogle {
  return {
    id: e.id,
    titulo: e.summary ?? "(sem título)",
    inicio: e.start?.dateTime,
    fim: e.end?.dateTime ?? null,
    local: e.location ?? null,
    cancelado: e.status === "cancelled",
    lembretes: doGoogle(e.reminders),
  };
}

/**
 * Eventos dos próximos `dias` dias, já sem os de dia inteiro. showDeleted
 * traz também os cancelados, para os lembretes deles serem cancelados aqui.
 */
export async function listarEventos(usuarioId: string, dias = 30): Promise<EventoDoGoogle[]> {
  const agora = new Date();
  const ate = new Date(agora.getTime() + dias * 24 * 60 * 60_000);

  const params = new URLSearchParams({
    timeMin: agora.toISOString(),
    timeMax: ate.toISOString(),
    singleEvents: "true",
    showDeleted: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const dados = await chamar(usuarioId, `/calendars/primary/events?${params}`);

  return (dados.items ?? [])
    .filter((e: any) => e.start?.dateTime || e.status === "cancelled")
    .map(paraEvento);
}

export interface DadosDoEvento {
  titulo: string;
  inicio: string;
  fim?: string | null;
  local?: string | null;
  descricao?: string | null;
  lembretes?: LembreteDoGoogle[];
}

function corpoDoEvento(evento: DadosDoEvento) {
  const inicio = new Date(evento.inicio);
  const fim = evento.fim ? new Date(evento.fim) : new Date(inicio.getTime() + 60 * 60_000);

  return {
    summary: evento.titulo,
    location: evento.local ?? "",
    description: evento.descricao ?? "",
    start: { dateTime: inicio.toISOString(), timeZone: "America/Sao_Paulo" },
    end: { dateTime: fim.toISOString(), timeZone: "America/Sao_Paulo" },
    ...(evento.lembretes ? { reminders: paraOGoogle(evento.lembretes) } : {}),
  };
}

export async function criarEvento(usuarioId: string, evento: DadosDoEvento): Promise<string> {
  const criado = await chamar(usuarioId, "/calendars/primary/events", {
    method: "POST",
    body: JSON.stringify(corpoDoEvento(evento)),
  });
  return criado.id;
}

export async function atualizarEvento(
  usuarioId: string,
  eventoId: string,
  evento: DadosDoEvento,
): Promise<void> {
  await chamar(usuarioId, `/calendars/primary/events/${encodeURIComponent(eventoId)}`, {
    method: "PATCH",
    body: JSON.stringify(corpoDoEvento(evento)),
  });
}

/**
 * Muda só os lembretes. Serve também para reuniões de outras pessoas: os
 * lembretes são da sua cópia do evento, então convidado pode alterá-los.
 */
export async function definirLembretesNoEvento(
  usuarioId: string,
  eventoId: string,
  lembretes: LembreteDoGoogle[],
): Promise<void> {
  await chamar(usuarioId, `/calendars/primary/events/${encodeURIComponent(eventoId)}`, {
    method: "PATCH",
    body: JSON.stringify({ reminders: paraOGoogle(lembretes) }),
  });
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

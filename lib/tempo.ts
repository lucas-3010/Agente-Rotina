import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const FUSO = "America/Sao_Paulo";

/** Momento do envio de um lembrete: tantos minutos antes do começo. */
export function momentoDoLembrete(inicio: Date | string, minutosAntes: number): Date {
  const base = typeof inicio === "string" ? new Date(inicio) : inicio;
  return new Date(base.getTime() - minutosAntes * 60_000);
}

/**
 * Converte "2026-11-10T15:00" digitado no formulário (hora de São Paulo) para
 * o instante correto em UTC. O navegador do Lucas pode estar em outro fuso,
 * e o site trabalha sempre no horário de Brasília.
 */
export function horaLocalParaInstante(valor: string): Date {
  return fromZonedTime(valor, FUSO);
}

/** O inverso: um instante UTC vira "2026-11-10T15:00" para preencher o formulário. */
export function instanteParaHoraLocal(valor: Date | string): string {
  return formatInTimeZone(valor, FUSO, "yyyy-MM-dd'T'HH:mm");
}

export function horas(valor: Date | string): string {
  return formatInTimeZone(valor, FUSO, "HH:mm");
}

export function dataPorExtenso(valor: Date | string): string {
  const dias = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  const zonada = toZonedTime(valor, FUSO);
  const dia = dias.at(zonada.getDay()) ?? "";
  const mes = meses.at(zonada.getMonth()) ?? "";
  return `${dia}, ${zonada.getDate()} de ${mes}`;
}

/** Chave "2026-11-10" no fuso de São Paulo, usada para agrupar por dia. */
export function chaveDoDia(valor: Date | string): string {
  return formatInTimeZone(valor, FUSO, "yyyy-MM-dd");
}

export function inicioDoDia(referencia: Date = new Date()): Date {
  return fromZonedTime(`${chaveDoDia(referencia)}T00:00:00`, FUSO);
}

export function fimDoDia(referencia: Date = new Date()): Date {
  return new Date(inicioDoDia(referencia).getTime() + 24 * 60 * 60_000);
}

/** "em 30 min", "em 2 h", "agora" — o quanto falta para o compromisso. */
export function faltam(inicio: Date | string): string {
  const alvo = typeof inicio === "string" ? new Date(inicio) : inicio;
  const minutos = Math.round((alvo.getTime() - Date.now()) / 60_000);
  if (minutos < 0) return "já passou";
  if (minutos < 1) return "agora";
  if (minutos < 60) return `em ${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h < 24) return m === 0 ? `em ${h} h` : `em ${h} h ${m} min`;
  const dias = Math.round(h / 24);
  return dias === 1 ? "amanhã" : `em ${dias} dias`;
}

/** "30 min antes", "1 dia antes" — como o site descreve um lembrete. */
export function antecedenciaPorExtenso(minutos: number): string {
  if (minutos === 0) return "na hora";
  if (minutos < 60) return `${minutos} min antes`;
  if (minutos < 1440) {
    const h = minutos / 60;
    return Number.isInteger(h) ? `${h} h antes` : `${Math.floor(h)} h ${minutos % 60} min antes`;
  }
  const dias = minutos / 1440;
  return Number.isInteger(dias) ? `${dias} dia${dias > 1 ? "s" : ""} antes` : `${Math.round(minutos / 60)} h antes`;
}

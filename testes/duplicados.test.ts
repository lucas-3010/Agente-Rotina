import { describe, expect, it } from "vitest";
import { pareceDuplicado, type EventoDoGoogle } from "../lib/google/calendar";
import { lerIcs } from "../lib/google/gmail";

const naAgenda: EventoDoGoogle[] = [
  {
    id: "1",
    titulo: "Reunião de alinhamento",
    inicio: "2026-11-10T18:00:00Z",
    fim: "2026-11-10T19:00:00Z",
    local: null,
    cancelado: false,
  },
];

describe("pareceDuplicado", () => {
  it("pega o mesmo evento com o mesmo título", () => {
    expect(
      pareceDuplicado({ titulo: "Reunião de alinhamento", inicio: "2026-11-10T18:00:00Z" }, naAgenda),
    ).toBe(true);
  });

  it("ignora acentos e maiúsculas", () => {
    expect(
      pareceDuplicado({ titulo: "REUNIAO DE ALINHAMENTO", inicio: "2026-11-10T18:00:00Z" }, naAgenda),
    ).toBe(true);
  });

  it("pega o evento que o próprio agente criou", () => {
    const comEtiqueta: EventoDoGoogle[] = [
      { ...naAgenda[0], titulo: "[Agente] Reunião de alinhamento" },
    ];
    expect(
      pareceDuplicado({ titulo: "Reunião de alinhamento", inicio: "2026-11-10T18:00:00Z" }, comEtiqueta),
    ).toBe(true);
  });

  it("aceita diferença de alguns minutos no horário", () => {
    expect(
      pareceDuplicado({ titulo: "Reunião de alinhamento", inicio: "2026-11-10T18:20:00Z" }, naAgenda),
    ).toBe(true);
  });

  it("não confunde reunião de outro horário", () => {
    expect(
      pareceDuplicado({ titulo: "Reunião de alinhamento", inicio: "2026-11-10T21:00:00Z" }, naAgenda),
    ).toBe(false);
  });

  it("não confunde assunto diferente no mesmo horário", () => {
    expect(
      pareceDuplicado({ titulo: "Dentista", inicio: "2026-11-10T18:00:00Z" }, naAgenda),
    ).toBe(false);
  });

  it("com a agenda vazia, nada é duplicado", () => {
    expect(pareceDuplicado({ titulo: "Qualquer", inicio: "2026-11-10T18:00:00Z" }, [])).toBe(false);
  });
});

const ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:abc@example.com
SUMMARY:Conversa sobre o projeto
DTSTART:20261110T180000Z
DTEND:20261110T190000Z
LOCATION:Av. Paulista 1000
END:VEVENT
END:VCALENDAR`;

describe("lerIcs", () => {
  it("lê título, horários e local", () => {
    const convite = lerIcs(ICS);
    expect(convite).not.toBeNull();
    expect(convite!.titulo).toBe("Conversa sobre o projeto");
    expect(convite!.inicio).toBe("2026-11-10T18:00:00.000Z");
    expect(convite!.fim).toBe("2026-11-10T19:00:00.000Z");
    expect(convite!.local).toBe("Av. Paulista 1000");
  });

  it("marca o que veio do .ics como confiável", () => {
    expect(lerIcs(ICS)!.confiavel).toBe(true);
  });

  it("devolve null para um arquivo quebrado", () => {
    expect(lerIcs("isso não é um ics")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  antecedenciaPorExtenso,
  chaveDoDia,
  horaLocalParaInstante,
  horas,
  instanteParaHoraLocal,
  momentoDoLembrete,
} from "../lib/tempo";

describe("momentoDoLembrete", () => {
  it("tira os minutos pedidos do começo", () => {
    const inicio = new Date("2026-11-10T18:00:00Z");
    expect(momentoDoLembrete(inicio, 30).toISOString()).toBe("2026-11-10T17:30:00.000Z");
  });

  it("com zero minutos, envia na hora", () => {
    const inicio = "2026-11-10T18:00:00Z";
    expect(momentoDoLembrete(inicio, 0).toISOString()).toBe("2026-11-10T18:00:00.000Z");
  });

  it("um dia antes atravessa a virada do dia", () => {
    const inicio = new Date("2026-11-10T02:00:00Z");
    expect(momentoDoLembrete(inicio, 1440).toISOString()).toBe("2026-11-09T02:00:00.000Z");
  });
});

describe("fuso de São Paulo", () => {
  it("15:00 digitado vira 18:00 UTC", () => {
    // São Paulo está em UTC-3 e não tem mais horário de verão.
    expect(horaLocalParaInstante("2026-11-10T15:00").toISOString()).toBe(
      "2026-11-10T18:00:00.000Z",
    );
  });

  it("ida e volta devolve o mesmo texto", () => {
    const digitado = "2026-07-04T08:45";
    expect(instanteParaHoraLocal(horaLocalParaInstante(digitado))).toBe(digitado);
  });

  it("mostra a hora de São Paulo, não a do servidor", () => {
    expect(horas("2026-11-10T18:00:00Z")).toBe("15:00");
  });

  it("agrupa pelo dia de São Paulo, não pelo dia UTC", () => {
    // 01:00 UTC do dia 11 ainda é dia 10 em São Paulo.
    expect(chaveDoDia("2026-11-11T01:00:00Z")).toBe("2026-11-10");
  });
});

describe("antecedenciaPorExtenso", () => {
  it.each([
    [0, "na hora"],
    [10, "10 min antes"],
    [30, "30 min antes"],
    [60, "1 h antes"],
    [120, "2 h antes"],
    [1440, "1 dia antes"],
    [2880, "2 dias antes"],
  ])("%i minutos vira %s", (minutos, esperado) => {
    expect(antecedenciaPorExtenso(minutos)).toBe(esperado);
  });
});

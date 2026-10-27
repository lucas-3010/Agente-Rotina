import { describe, expect, it } from "vitest";
import { doGoogle, paraOGoogle } from "@/lib/google/calendar";
import { mesmosLembretes, normalizarLembretes } from "@/lib/lembretes";

describe("normalizarLembretes", () => {
  it("tira repetidos e inválidos e ordena do mais cedo para o mais tarde", () => {
    expect(
      normalizarLembretes([
        { minutos_antes: 10, canal: "notificacao" },
        { minutos_antes: 60, canal: "email" },
        { minutos_antes: 10, canal: "notificacao" },
        { minutos_antes: -5, canal: "notificacao" },
        { minutos_antes: Number.NaN, canal: "email" },
        { minutos_antes: 30, canal: "whatsapp" as any },
      ]),
    ).toEqual([
      { minutos_antes: 60, canal: "email" },
      { minutos_antes: 10, canal: "notificacao" },
    ]);
  });

  it("mesmo tempo em canais diferentes conta como dois", () => {
    expect(
      normalizarLembretes([
        { minutos_antes: 30, canal: "email" },
        { minutos_antes: 30, canal: "notificacao" },
      ]),
    ).toHaveLength(2);
  });

  it("recusa mais de 5", () => {
    const seis = [0, 10, 20, 30, 40, 50].map((m) => ({
      minutos_antes: m,
      canal: "notificacao" as const,
    }));
    expect(() => normalizarLembretes(seis)).toThrow(/no máximo 5/);
  });

  it("recusa mais de 4 semanas", () => {
    expect(() =>
      normalizarLembretes([{ minutos_antes: 40_321, canal: "email" }]),
    ).toThrow(/4 semanas/);
    expect(
      normalizarLembretes([{ minutos_antes: 40_320, canal: "email" }]),
    ).toHaveLength(1);
  });
});

describe("mesmosLembretes", () => {
  it("ignora a ordem", () => {
    expect(
      mesmosLembretes(
        [
          { minutos_antes: 10, canal: "notificacao" },
          { minutos_antes: 60, canal: "email" },
        ],
        [
          { minutos_antes: 60, canal: "email" },
          { minutos_antes: 10, canal: "notificacao" },
        ],
      ),
    ).toBe(true);
  });

  it("vê diferença de canal e de quantidade", () => {
    expect(
      mesmosLembretes(
        [{ minutos_antes: 10, canal: "email" }],
        [{ minutos_antes: 10, canal: "notificacao" }],
      ),
    ).toBe(false);
    expect(mesmosLembretes([], [{ minutos_antes: 10, canal: "email" }])).toBe(
      false,
    );
    expect(mesmosLembretes([], [])).toBe(true);
  });
});

describe("conversão para o Google", () => {
  it("notificação vira popup e email vira email", () => {
    expect(
      paraOGoogle([
        { minutos_antes: 30, canal: "notificacao" },
        { minutos_antes: 1440, canal: "email" },
      ]),
    ).toEqual({
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 30 },
        { method: "email", minutes: 1440 },
      ],
    });
  });

  it("sem lembretes desliga o padrão da agenda", () => {
    expect(paraOGoogle([])).toEqual({ useDefault: false, overrides: [] });
  });

  it("volta do Google do mesmo jeito", () => {
    const ida = [
      { minutos_antes: 30, canal: "notificacao" as const },
      { minutos_antes: 1440, canal: "email" as const },
    ];
    expect(doGoogle(paraOGoogle(ida))).toEqual(ida);
  });

  it("padrão da agenda vira null", () => {
    expect(doGoogle({ useDefault: true })).toBeNull();
    expect(doGoogle(undefined)).toBeNull();
  });
});

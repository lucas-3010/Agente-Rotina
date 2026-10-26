import { describe, expect, it } from "vitest";
import { devoEnviar, estaPerdido, TOLERANCIA_MINUTOS } from "../lib/lembretes";

const agora = new Date("2026-11-10T18:00:00Z");

describe("devoEnviar", () => {
  it("envia o que acabou de vencer", () => {
    expect(devoEnviar("2026-11-10T17:59:00Z", agora)).toBe(true);
  });

  it("envia o que venceu dentro da tolerância", () => {
    const limite = new Date(agora.getTime() - TOLERANCIA_MINUTOS * 60_000);
    expect(devoEnviar(limite, agora)).toBe(true);
  });

  it("não envia o que ainda não chegou a hora", () => {
    expect(devoEnviar("2026-11-10T18:05:00Z", agora)).toBe(false);
  });

  it("não envia o que está atrasado demais", () => {
    expect(devoEnviar("2026-11-10T17:30:00Z", agora)).toBe(false);
  });
});

describe("estaPerdido", () => {
  it("marca como perdido o que passou da tolerância", () => {
    expect(estaPerdido("2026-11-10T17:30:00Z", agora)).toBe(true);
  });

  it("não marca o que está dentro da tolerância", () => {
    expect(estaPerdido("2026-11-10T17:55:00Z", agora)).toBe(false);
  });

  it("não marca o que ainda vai acontecer", () => {
    expect(estaPerdido("2026-11-10T19:00:00Z", agora)).toBe(false);
  });
});

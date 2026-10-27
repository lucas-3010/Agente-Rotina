import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/servidor", () => ({ supabaseAdmin: () => ({}) }));

const { LIMITE_CONVIDADOS, validarConvite } = await import("../lib/convites");

afterEach(() => vi.unstubAllEnvs());

describe("validarConvite", () => {
  it("aceita um email novo", () => {
    expect(validarConvite("amiga@gmail.com", [])).toBeNull();
  });

  it("recusa o que não é email", () => {
    expect(validarConvite("amiga", [])).toMatch(/não parece válido/);
    expect(validarConvite("amiga @gmail.com", [])).toMatch(/não parece válido/);
  });

  it("recusa repetido, sem ligar para maiúsculas", () => {
    expect(validarConvite("Amiga@Gmail.com ", ["amiga@gmail.com"])).toMatch(/já está convidado/);
  });

  it("recusa o próprio email do dono", () => {
    vi.stubEnv("EMAIL_ADMIN", "dono@gmail.com");
    expect(validarConvite("dono@gmail.com", [])).toMatch(/seu email/);
  });

  it("para no limite do Google", () => {
    const cheios = Array.from({ length: LIMITE_CONVIDADOS }, (_, i) => `p${i}@gmail.com`);
    expect(validarConvite("mais-um@gmail.com", cheios)).toMatch(/limite/);
  });

  it("o limite deixa uma vaga para o dono entre os 100 do Google", () => {
    expect(LIMITE_CONVIDADOS).toBe(99);
  });
});

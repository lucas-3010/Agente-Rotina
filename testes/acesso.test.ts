import { afterEach, describe, expect, it, vi } from "vitest";

// A lista de convidados vem do banco; aqui ela é simulada.
const convidados = new Set<string>();
vi.mock("@/lib/supabase/servidor", () => ({
  supabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: (_coluna: string, email: string) => ({
          maybeSingle: async () => ({ data: convidados.has(email) ? { email } : null }),
        }),
      }),
    }),
  }),
}));

const { ehAdmin, podeEntrar } = await import("../lib/acesso");

afterEach(() => {
  vi.unstubAllEnvs();
  convidados.clear();
});

describe("ehAdmin", () => {
  it("reconhece o admin sem ligar para maiúsculas e espaços", () => {
    vi.stubEnv("EMAIL_ADMIN", "dono@gmail.com");
    expect(ehAdmin("  Dono@Gmail.com ")).toBe(true);
  });

  it("aceita o nome antigo EMAIL_PERMITIDO", () => {
    vi.stubEnv("EMAIL_PERMITIDO", "dono@gmail.com");
    expect(ehAdmin("dono@gmail.com")).toBe(true);
  });

  it("sem admin configurado, ninguém é admin", () => {
    expect(ehAdmin("")).toBe(false);
    expect(ehAdmin("qualquer@gmail.com")).toBe(false);
  });
});

describe("podeEntrar", () => {
  it("deixa o admin entrar", async () => {
    vi.stubEnv("EMAIL_ADMIN", "dono@gmail.com");
    expect(await podeEntrar("dono@gmail.com")).toBe(true);
  });

  it("deixa entrar quem foi convidado", async () => {
    vi.stubEnv("EMAIL_ADMIN", "dono@gmail.com");
    convidados.add("amiga@gmail.com");
    expect(await podeEntrar("Amiga@Gmail.com")).toBe(true);
  });

  it("barra quem não foi convidado", async () => {
    vi.stubEnv("EMAIL_ADMIN", "dono@gmail.com");
    expect(await podeEntrar("estranho@gmail.com")).toBe(false);
  });

  it("com o acesso aberto, qualquer conta entra", async () => {
    vi.stubEnv("ACESSO_ABERTO", "true");
    expect(await podeEntrar("estranho@gmail.com")).toBe(true);
  });

  it("nunca deixa entrar sem email", async () => {
    vi.stubEnv("ACESSO_ABERTO", "true");
    expect(await podeEntrar(null)).toBe(false);
    expect(await podeEntrar("")).toBe(false);
  });
});

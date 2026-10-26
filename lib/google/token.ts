import { supabaseAdmin } from "@/lib/supabase/servidor";

export class GoogleDesconectado extends Error {}

interface Cache {
  accessToken: string;
  expiraEm: number;
}

const cache = new Map<string, Cache>();

/**
 * Troca o refresh token por um access token, guardando em memória até perto
 * do vencimento. O refresh token nunca sai do servidor.
 */
export async function accessTokenDoUsuario(usuarioId: string): Promise<string> {
  const guardado = cache.get(usuarioId);
  if (guardado && guardado.expiraEm > Date.now() + 60_000) return guardado.accessToken;

  const admin = supabaseAdmin();
  const { data } = await admin
    .from("google_tokens")
    .select("refresh_token")
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  if (!data?.refresh_token) {
    throw new GoogleDesconectado("Sem refresh token do Google. É preciso entrar de novo.");
  }

  const resposta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const corpo = await resposta.json();

  if (!resposta.ok) {
    // invalid_grant quer dizer que o acesso foi revogado no Google.
    if (corpo.error === "invalid_grant") {
      await admin.from("google_tokens").delete().eq("usuario_id", usuarioId);
      await admin
        .from("configuracoes")
        .update({ erro_google: "O acesso ao Google foi revogado. Entre de novo no site." })
        .eq("usuario_id", usuarioId);
      throw new GoogleDesconectado("O Google revogou o acesso.");
    }
    throw new Error(`Google recusou o refresh: ${corpo.error ?? resposta.status}`);
  }

  cache.set(usuarioId, {
    accessToken: corpo.access_token,
    expiraEm: Date.now() + (corpo.expires_in ?? 3600) * 1000,
  });

  await admin.from("configuracoes").update({ erro_google: null }).eq("usuario_id", usuarioId);

  return corpo.access_token;
}

export async function guardarRefreshToken(usuarioId: string, refreshToken: string, escopos?: string) {
  const admin = supabaseAdmin();
  cache.delete(usuarioId);
  const { error } = await admin.from("google_tokens").upsert({
    usuario_id: usuarioId,
    refresh_token: refreshToken,
    escopos: escopos ?? null,
    atualizado_em: new Date().toISOString(),
  });
  if (error) throw new Error(`Não consegui guardar o token do Google: ${error.message}`);
}

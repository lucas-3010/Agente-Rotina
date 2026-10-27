import { NextResponse } from "next/server";
import { podeEntrar } from "@/lib/acesso";
import { supabaseDoUsuario } from "@/lib/supabase/servidor";
import { guardarRefreshToken } from "@/lib/google/token";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  // Só caminhos do próprio site: "//outro.com" ou uma URL completa levariam o
  // usuário para fora logo depois do login.
  const pedido = url.searchParams.get("de") ?? "/";
  const destino = pedido.startsWith("/") && !pedido.startsWith("//") ? pedido : "/";

  if (!code) {
    return NextResponse.redirect(new URL("/entrar?erro=sem-codigo", url.origin));
  }

  const supabase = await supabaseDoUsuario();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/entrar?erro=troca", url.origin));
  }

  if (!(await podeEntrar(data.user.email))) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/entrar?erro=conta", url.origin));
  }

  // O refresh token do Google vem na sessão e é guardado fora do alcance
  // do navegador, para o agendador poder sincronizar sozinho.
  const refresh = data.session?.provider_refresh_token;
  if (refresh) {
    await guardarRefreshToken(data.user.id, refresh);
  }

  return NextResponse.redirect(new URL(destino, url.origin));
}

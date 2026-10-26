import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/servidor";

/**
 * As rotas do agendador ficam fora do login, então exigem o segredo.
 * Devolve null quando está tudo certo, ou a resposta de recusa.
 */
export function conferirSegredo(request: Request): NextResponse | null {
  const esperado = process.env.CRON_SECRET;
  if (!esperado) {
    return NextResponse.json({ erro: "CRON_SECRET não configurado" }, { status: 500 });
  }

  const cabecalho = request.headers.get("authorization") ?? "";
  if (cabecalho !== `Bearer ${esperado}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  return null;
}

/**
 * O site é de uma pessoa só, mas o agendador não tem sessão. Ele acha o
 * usuário pelo email permitido.
 */
export async function usuarioDoAgendador(): Promise<{ id: string; email: string } | null> {
  const permitido = process.env.EMAIL_PERMITIDO?.trim().toLowerCase();
  if (!permitido) return null;

  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw new Error(`Não consegui listar usuários: ${error.message}`);

  const usuario = data.users.find((u) => u.email?.toLowerCase() === permitido);
  return usuario ? { id: usuario.id, email: usuario.email! } : null;
}

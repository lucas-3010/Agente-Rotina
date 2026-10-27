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

/** Quem tem o Google conectado: são essas pessoas que o agendador sincroniza. */
export async function usuariosComGoogle(): Promise<string[]> {
  const { data, error } = await supabaseAdmin().from("google_tokens").select("usuario_id");
  if (error) throw new Error(`Não consegui listar usuários: ${error.message}`);
  return (data ?? []).map((l) => l.usuario_id);
}

export async function emailDoUsuario(usuarioId: string): Promise<string | null> {
  const { data } = await supabaseAdmin().auth.admin.getUserById(usuarioId);
  return data.user?.email ?? null;
}

/**
 * Roda a mesma tarefa para cada usuário. O erro de um não impede os outros:
 * fica registrado no resultado e o agendador segue.
 */
export async function paraCada<T>(
  usuarios: string[],
  tarefa: (usuarioId: string) => Promise<T>,
): Promise<{ usuarios: number; resultados: T[]; erros: { usuarioId: string; erro: string }[] }> {
  const resultados: T[] = [];
  const erros: { usuarioId: string; erro: string }[] = [];

  for (const usuarioId of usuarios) {
    try {
      resultados.push(await tarefa(usuarioId));
    } catch (e) {
      erros.push({ usuarioId, erro: e instanceof Error ? e.message : String(e) });
    }
  }

  return { usuarios: usuarios.length, resultados, erros };
}

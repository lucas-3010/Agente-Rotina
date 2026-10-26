"use server";

import { revalidatePath } from "next/cache";
import { apagarEvento } from "@/lib/google/calendar";
import { definirLembretes } from "@/lib/lembretes";
import { emailPermitido, supabaseDoUsuario, usuarioAtual } from "@/lib/supabase/servidor";
import { horaLocalParaInstante } from "@/lib/tempo";
import type { Canal, EntradaCompromisso } from "@/lib/tipos";

async function sessao() {
  const usuario = await usuarioAtual();
  if (!usuario || !emailPermitido(usuario.email)) {
    throw new Error("Sem permissão.");
  }
  return { usuario, supabase: await supabaseDoUsuario() };
}

function lerLembretes(form: FormData): { minutos_antes: number; canal: Canal }[] {
  const minutos = form.getAll("lembrete_minutos").map((v) => Number(v));
  const canais = form.getAll("lembrete_canal").map((v) => String(v) as Canal);

  return minutos
    .map((m, i) => ({ minutos_antes: m, canal: canais[i] ?? "whatsapp" }))
    .filter((l) => Number.isFinite(l.minutos_antes) && l.minutos_antes >= 0)
    // O mesmo canal com a mesma antecedência só vale uma vez.
    .filter(
      (l, i, todos) =>
        todos.findIndex((o) => o.canal === l.canal && o.minutos_antes === l.minutos_antes) === i,
    );
}

function lerCampos(form: FormData): EntradaCompromisso {
  const titulo = String(form.get("titulo") ?? "").trim();
  const inicioLocal = String(form.get("inicio") ?? "").trim();

  if (!titulo) throw new Error("A tarefa precisa de um nome.");
  if (!inicioLocal) throw new Error("A tarefa precisa de data e hora.");

  const local = String(form.get("local") ?? "").trim();
  const observacoes = String(form.get("observacoes") ?? "").trim();

  return {
    titulo,
    inicio: horaLocalParaInstante(inicioLocal).toISOString(),
    local: local || null,
    observacoes: observacoes || null,
    lembretes: lerLembretes(form),
  };
}

export async function criarCompromisso(form: FormData) {
  const { usuario, supabase } = await sessao();
  const campos = lerCampos(form);

  const { data, error } = await supabase
    .from("compromissos")
    .insert({
      usuario_id: usuario.id,
      titulo: campos.titulo,
      inicio: campos.inicio,
      local: campos.local,
      observacoes: campos.observacoes,
      origem: "manual",
      revisado: true,
    })
    .select()
    .single();

  if (error) throw new Error(`Não consegui salvar: ${error.message}`);

  await definirLembretes(supabase, {
    usuarioId: usuario.id,
    compromissoId: data.id,
    inicio: campos.inicio,
    pedidos: campos.lembretes,
  });

  revalidatePath("/");
  revalidatePath("/semana");
}

export async function atualizarCompromisso(id: string, form: FormData) {
  const { usuario, supabase } = await sessao();
  const campos = lerCampos(form);

  const { error } = await supabase
    .from("compromissos")
    .update({
      titulo: campos.titulo,
      inicio: campos.inicio,
      local: campos.local,
      observacoes: campos.observacoes,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(`Não consegui salvar: ${error.message}`);

  await definirLembretes(supabase, {
    usuarioId: usuario.id,
    compromissoId: id,
    inicio: campos.inicio,
    pedidos: campos.lembretes,
  });

  revalidatePath("/");
  revalidatePath("/semana");
}

export async function excluirCompromisso(id: string) {
  const { supabase } = await sessao();
  const { error } = await supabase.from("compromissos").delete().eq("id", id);
  if (error) throw new Error(`Não consegui excluir: ${error.message}`);
  revalidatePath("/");
  revalidatePath("/semana");
}

/** Na caixa "Novas reuniões": escolhe os lembretes e tira o item de lá. */
export async function revisarReuniao(id: string, form: FormData) {
  const { usuario, supabase } = await sessao();

  const { data: compromisso, error } = await supabase
    .from("compromissos")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !compromisso) throw new Error("Reunião não encontrada.");

  await definirLembretes(supabase, {
    usuarioId: usuario.id,
    compromissoId: id,
    inicio: compromisso.inicio,
    pedidos: lerLembretes(form),
  });

  await supabase.from("compromissos").update({ revisado: true }).eq("id", id);
  revalidatePath("/novas");
  revalidatePath("/");
}

/** Desfazer: tira da agenda o evento que o agente criou a partir de um email. */
export async function desfazerDoGmail(id: string) {
  const { usuario, supabase } = await sessao();

  const { data: compromisso } = await supabase
    .from("compromissos")
    .select("*")
    .eq("id", id)
    .single();

  if (!compromisso) throw new Error("Reunião não encontrada.");
  if (compromisso.origem !== "gmail") throw new Error("Só dá para desfazer o que veio do Gmail.");

  if (compromisso.google_event_id) {
    try {
      await apagarEvento(usuario.id, compromisso.google_event_id);
    } catch {
      // Se o evento já sumiu da agenda, seguir adiante e limpar daqui mesmo.
    }
  }

  await supabase.from("compromissos").delete().eq("id", id);
  revalidatePath("/novas");
  revalidatePath("/");
}

export async function salvarConfiguracoes(form: FormData) {
  const { usuario, supabase } = await sessao();

  const padrao = String(form.get("lembrete_padrao_minutos") ?? "").trim();

  const { error } = await supabase.from("configuracoes").upsert({
    usuario_id: usuario.id,
    whatsapp_telefone: String(form.get("whatsapp_telefone") ?? "").trim() || null,
    whatsapp_apikey: String(form.get("whatsapp_apikey") ?? "").trim() || null,
    email_destino: String(form.get("email_destino") ?? "").trim() || null,
    lembrete_padrao_minutos: padrao === "" ? null : Number(padrao),
    resumo_diario: form.get("resumo_diario") === "on",
    atualizado_em: new Date().toISOString(),
  });

  if (error) throw new Error(`Não consegui salvar: ${error.message}`);
  revalidatePath("/configuracoes");
}

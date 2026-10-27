"use server";

import { revalidatePath } from "next/cache";
import {
  apagarEvento,
  atualizarEvento,
  criarEvento,
  definirLembretesNoEvento,
} from "@/lib/google/calendar";
import { GoogleDesconectado } from "@/lib/google/token";
import { guardarLembretes, normalizarLembretes } from "@/lib/lembretes";
import { podeEntrar } from "@/lib/acesso";
import { supabaseDoUsuario, usuarioAtual } from "@/lib/supabase/servidor";
import { horaLocalParaInstante } from "@/lib/tempo";
import type { Canal, EntradaCompromisso } from "@/lib/tipos";

async function sessao() {
  const usuario = await usuarioAtual();
  if (!usuario || !(await podeEntrar(usuario.email))) {
    throw new Error("Sem permissão.");
  }
  return { usuario, supabase: await supabaseDoUsuario() };
}

function lerLembretes(form: FormData): { minutos_antes: number; canal: Canal }[] {
  const minutos = form.getAll("lembrete_minutos").map((v) => Number(v));
  const canais = form.getAll("lembrete_canal").map((v) => String(v) as Canal);
  return normalizarLembretes(
    minutos.map((m, i) => ({ minutos_antes: m, canal: canais.at(i) ?? "notificacao" })),
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

/** Erros do Google viram uma frase que dá para agir. */
async function noGoogle<T>(passo: () => Promise<T>): Promise<T> {
  try {
    return await passo();
  } catch (e) {
    if (e instanceof GoogleDesconectado) {
      throw new Error("Sua conta Google desconectou. Saia e entre de novo no site.");
    }
    throw e;
  }
}

async function buscar(supabase: any, id: string) {
  const { data } = await supabase.from("compromissos").select("*").eq("id", id).maybeSingle();
  if (!data) throw new Error("Compromisso não encontrado.");
  return data;
}

/**
 * Toda tarefa vira um evento no Google Agenda, com os lembretes escolhidos.
 * Quem avisa é o próprio Google: notificação no celular e email.
 */
export async function criarCompromisso(form: FormData) {
  const { usuario, supabase } = await sessao();
  const campos = lerCampos(form);

  const eventoId = await noGoogle(() =>
    criarEvento(usuario.id, {
      titulo: campos.titulo,
      inicio: campos.inicio,
      local: campos.local,
      descricao: campos.observacoes,
      lembretes: campos.lembretes,
    }),
  );

  const linha = {
    usuario_id: usuario.id,
    titulo: campos.titulo,
    inicio: campos.inicio,
    local: campos.local,
    observacoes: campos.observacoes,
    origem: "manual",
    google_event_id: eventoId,
    revisado: true,
  };

  let { data, error } = await supabase.from("compromissos").insert(linha).select().single();

  // A sincronização pode ter trazido o evento novo antes deste insert. Nesse
  // caso a linha já existe: ela é assumida como tarefa manual.
  if (error?.code === "23505") {
    ({ data, error } = await supabase
      .from("compromissos")
      .update(linha)
      .eq("google_event_id", eventoId)
      .select()
      .single());
  }

  if (error || !data) throw new Error(`Não consegui salvar: ${error?.message}`);

  await guardarLembretes(supabase, {
    usuarioId: usuario.id,
    compromissoId: data.id,
    inicio: campos.inicio,
    pedidos: campos.lembretes,
  });

  revalidatePath("/");
  revalidatePath("/semana");
}

/**
 * Tarefa sua: muda tudo, aqui e no Google. Reunião da agenda ou do Gmail:
 * muda só os lembretes, porque o evento pode ser de outra pessoa.
 */
export async function atualizarCompromisso(id: string, form: FormData) {
  const { usuario, supabase } = await sessao();
  const atual = await buscar(supabase, id);

  if (atual.origem !== "manual") {
    const pedidos = lerLembretes(form);
    if (atual.google_event_id) {
      await noGoogle(() => definirLembretesNoEvento(usuario.id, atual.google_event_id, pedidos));
    } else {
      // Convite do Gmail com data deduzida: só vai para a agenda quando você confirma aqui.
      const eventoId = await noGoogle(() =>
        criarEvento(usuario.id, {
          titulo: `[Agente] ${atual.titulo}`,
          inicio: atual.inicio,
          fim: atual.fim,
          local: atual.local,
          descricao: atual.observacoes,
          lembretes: pedidos,
        }),
      );
      await supabase.from("compromissos").update({ google_event_id: eventoId }).eq("id", id);
    }
    await guardarLembretes(supabase, {
      usuarioId: usuario.id,
      compromissoId: id,
      inicio: atual.inicio,
      pedidos,
    });
    await supabase.from("compromissos").update({ revisado: true }).eq("id", id);
  } else {
    const campos = lerCampos(form);

    if (atual.google_event_id) {
      await noGoogle(() =>
        atualizarEvento(usuario.id, atual.google_event_id, {
          titulo: campos.titulo,
          inicio: campos.inicio,
          local: campos.local,
          descricao: campos.observacoes,
          lembretes: campos.lembretes,
        }),
      );
    }

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

    await guardarLembretes(supabase, {
      usuarioId: usuario.id,
      compromissoId: id,
      inicio: campos.inicio,
      pedidos: campos.lembretes,
    });
  }

  revalidatePath("/");
  revalidatePath("/semana");
  revalidatePath("/novas");
}

/** Só tarefas criadas no site: reunião de outra pessoa não se apaga daqui. */
export async function excluirCompromisso(id: string) {
  const { usuario, supabase } = await sessao();
  const atual = await buscar(supabase, id);
  if (atual.origem !== "manual") throw new Error("Só dá para excluir tarefas criadas no site.");

  if (atual.google_event_id) {
    try {
      await apagarEvento(usuario.id, atual.google_event_id);
    } catch (e) {
      // Já apagado no Google: segue e limpa daqui. Outro erro interrompe.
      if (!(e instanceof Error && /respondeu (404|410)/.test(e.message))) throw e;
    }
  }

  const { error } = await supabase.from("compromissos").delete().eq("id", id);
  if (error) throw new Error(`Não consegui excluir: ${error.message}`);
  revalidatePath("/");
  revalidatePath("/semana");
}

/** Na caixa "Novas reuniões": escolhe os lembretes e tira o item de lá. */
export async function revisarReuniao(id: string, form: FormData) {
  await atualizarCompromisso(id, form);
}

/** "Manter o padrão": deixa os lembretes que a agenda já dá e tira da caixa. */
export async function manterPadrao(id: string) {
  const { usuario, supabase } = await sessao();
  const atual = await buscar(supabase, id);

  // Convite do Gmail ainda não confirmado: confirmar é pô-lo na agenda.
  let eventoId = atual.google_event_id;
  if (!eventoId) {
    eventoId = await noGoogle(() =>
      criarEvento(usuario.id, {
        titulo: `[Agente] ${atual.titulo}`,
        inicio: atual.inicio,
        fim: atual.fim,
        local: atual.local,
        descricao: atual.observacoes,
      }),
    );
  }

  await supabase
    .from("compromissos")
    .update({ revisado: true, google_event_id: eventoId })
    .eq("id", id);
  revalidatePath("/novas");
  revalidatePath("/");
}

/** Desfazer: tira da agenda o evento que o agente criou a partir de um email. */
export async function desfazerDoGmail(id: string) {
  const { usuario, supabase } = await sessao();
  const compromisso = await buscar(supabase, id);
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
    lembrete_padrao_minutos: padrao === "" ? null : Number(padrao),
    atualizado_em: new Date().toISOString(),
  });

  if (error) throw new Error(`Não consegui salvar: ${error.message}`);
  revalidatePath("/configuracoes");
}

import { antecedenciaPorExtenso, dataPorExtenso, horas } from "@/lib/tempo";
import type { Compromisso } from "@/lib/tipos";

export interface Mensagem {
  assunto: string;
  texto: string;
  html: string;
}

function linkDoMapa(local: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local)}`;
}

export function montarLembrete(compromisso: Compromisso, minutosAntes: number): Mensagem {
  const hora = horas(compromisso.inicio);
  const quando = minutosAntes === 0 ? "agora" : `em ${antecedenciaPorExtenso(minutosAntes).replace(" antes", "")}`;
  const assunto = `Lembrete: ${compromisso.titulo} às ${hora}`;

  const linhas = [`⏰ ${compromisso.titulo} às ${hora} (${quando}).`];
  if (compromisso.local) linhas.push(`Local: ${compromisso.local}`);
  if (compromisso.observacoes) linhas.push(compromisso.observacoes);

  const html = [
    `<p style="font-size:16px;margin:0 0 12px"><strong>${escapar(compromisso.titulo)}</strong></p>`,
    `<p style="margin:0 0 8px">${escapar(dataPorExtenso(compromisso.inicio))} às ${hora} — ${escapar(quando)}</p>`,
    compromisso.local
      ? `<p style="margin:0 0 8px">Local: <a href="${linkDoMapa(compromisso.local)}">${escapar(compromisso.local)}</a></p>`
      : "",
    compromisso.observacoes ? `<p style="margin:0 0 8px">${escapar(compromisso.observacoes)}</p>` : "",
  ].join("");

  return { assunto, texto: linhas.join("\n"), html };
}

export function montarResumoDoDia(compromissos: Compromisso[]): Mensagem {
  const hoje = dataPorExtenso(new Date());
  if (compromissos.length === 0) {
    return {
      assunto: `Seu dia: nada marcado`,
      texto: `Bom dia. ${capitalizar(hoje)}: nada marcado.`,
      html: `<p>Bom dia. ${escapar(capitalizar(hoje))}: nada marcado.</p>`,
    };
  }

  const itens = compromissos.map((c) => {
    const local = c.local ? ` — ${c.local}` : "";
    return `${horas(c.inicio)} ${c.titulo}${local}`;
  });

  return {
    assunto: `Seu dia: ${compromissos.length} compromisso${compromissos.length > 1 ? "s" : ""}`,
    texto: `Bom dia. ${capitalizar(hoje)}:\n${itens.map((i) => `• ${i}`).join("\n")}`,
    html:
      `<p>Bom dia. ${escapar(capitalizar(hoje))}:</p><ul>` +
      compromissos
        .map((c) => {
          const local = c.local
            ? ` — <a href="${linkDoMapa(c.local)}">${escapar(c.local)}</a>`
            : "";
          return `<li><strong>${horas(c.inicio)}</strong> ${escapar(c.titulo)}${local}</li>`;
        })
        .join("") +
      `</ul>`,
  };
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

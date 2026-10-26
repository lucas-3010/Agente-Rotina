import { CartaoCompromisso } from "@/components/cartao-compromisso";
import { Moldura, Vazio } from "@/components/moldura";
import { compromissosDaSemana, contarNovas } from "@/lib/consultas";
import { chaveDoDia, dataPorExtenso } from "@/lib/tempo";
import type { CompromissoComLembretes } from "@/lib/tipos";

export const dynamic = "force-dynamic";

export default async function Semana() {
  const [compromissos, pendentes] = await Promise.all([compromissosDaSemana(), contarNovas()]);

  const porDia = new Map<string, CompromissoComLembretes[]>();
  for (const c of compromissos) {
    const dia = chaveDoDia(c.inicio);
    porDia.set(dia, [...(porDia.get(dia) ?? []), c]);
  }

  return (
    <Moldura titulo="Semana" subtitulo="Os próximos 7 dias" pendentes={pendentes}>
      {porDia.size === 0 ? (
        <Vazio>Nada marcado para os próximos 7 dias.</Vazio>
      ) : (
        <div className="space-y-8">
          {[...porDia.entries()].map(([dia, itens]) => (
            <section key={dia}>
              <h2 className="mb-3 text-sm font-medium text-slate-500">
                {dataPorExtenso(itens[0].inicio)}
              </h2>
              <ul className="space-y-3">
                {itens.map((c) => (
                  <li key={c.id}>
                    <CartaoCompromisso compromisso={c} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Moldura>
  );
}

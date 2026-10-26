import { CartaoCompromisso } from "@/components/cartao-compromisso";
import { Moldura, Vazio } from "@/components/moldura";
import { compromissosDeHoje, contarNovas } from "@/lib/consultas";
import { dataPorExtenso } from "@/lib/tempo";

export const dynamic = "force-dynamic";

export default async function Hoje() {
  const [compromissos, pendentes] = await Promise.all([compromissosDeHoje(), contarNovas()]);
  const agora = Date.now();
  const proximo = compromissos.find((c) => new Date(c.inicio).getTime() >= agora);

  return (
    <Moldura titulo="Hoje" subtitulo={dataPorExtenso(new Date())} pendentes={pendentes}>
      {compromissos.length === 0 ? (
        <Vazio>Nada marcado para hoje.</Vazio>
      ) : (
        <ul className="space-y-3">
          {compromissos.map((c) => (
            <li key={c.id}>
              <CartaoCompromisso compromisso={c} destaque={c.id === proximo?.id} />
            </li>
          ))}
        </ul>
      )}
    </Moldura>
  );
}

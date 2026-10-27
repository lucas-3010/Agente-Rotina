import { salvarConfiguracoes } from "@/app/acoes";
import { Moldura } from "@/components/moldura";
import { configuracoes, contarNovas } from "@/lib/consultas";
import { usuarioAtual } from "@/lib/supabase/servidor";
import { dataPorExtenso, horas } from "@/lib/tempo";

export const dynamic = "force-dynamic";

export default async function Configuracoes() {
  const [config, pendentes, usuario] = await Promise.all([
    configuracoes(),
    contarNovas(),
    usuarioAtual(),
  ]);

  return (
    <Moldura titulo="Configurações" pendentes={pendentes}>
      {config?.erro_google && (
        <p className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          {config.erro_google} <a href="/entrar" className="underline">Entrar de novo</a>
        </p>
      )}

      <form action={salvarConfiguracoes} className="space-y-6">
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-slate-500">Como os lembretes chegam</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Quem avisa é o próprio Google Agenda. A notificação aparece no celular pelo app do
            Google Agenda (deixe as notificações dele ligadas), e o lembrete por email chega no
            seu Gmail. Nada para configurar aqui.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium text-slate-500">Reuniões da agenda</h2>

          <Campo
            rotulo="Lembrete padrão"
            dica="Colocado como notificação nas reuniões novas. Deixe vazio para escolher uma a uma."
          >
            <select
              name="lembrete_padrao_minutos"
              defaultValue={config?.lembrete_padrao_minutos ?? ""}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">Sem padrão, eu escolho</option>
              <option value="10">10 min antes</option>
              <option value="30">30 min antes</option>
              <option value="60">1 h antes</option>
              <option value="1440">1 dia antes</option>
            </select>
          </Campo>
        </section>

        <button
          type="submit"
          className="w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white dark:bg-slate-100 dark:text-slate-900"
        >
          Salvar
        </button>
      </form>

      <div className="mt-8 space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
        <dl className="space-y-1 text-xs text-slate-500">
          <div className="flex justify-between">
            <dt>Última leitura da agenda</dt>
            <dd>{formatar(config?.ultima_sync_calendar)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Última leitura do Gmail</dt>
            <dd>{formatar(config?.ultima_sync_gmail)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Conta</dt>
            <dd>{usuario?.email}</dd>
          </div>
        </dl>
      </div>
    </Moldura>
  );
}

function formatar(valor: string | null | undefined): string {
  if (!valor) return "ainda não rodou";
  return `${dataPorExtenso(valor)}, ${horas(valor)}`;
}

function Campo({
  rotulo,
  dica,
  children,
}: {
  rotulo: string;
  dica?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {rotulo}
      </span>
      {children}
      {dica && <span className="mt-1.5 block text-xs text-slate-500">{dica}</span>}
    </label>
  );
}

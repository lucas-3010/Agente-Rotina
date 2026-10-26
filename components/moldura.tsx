import Link from "next/link";
import { Navegacao } from "./navegacao";

export function Moldura({
  titulo,
  subtitulo,
  pendentes = 0,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  pendentes?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navegacao pendentes={pendentes} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-24 sm:pb-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{titulo}</h1>
          {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
        </header>

        {children}
      </main>

      <Link
        href="/tarefa/nova"
        aria-label="Nova tarefa"
        className="fixed bottom-20 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-2xl text-white shadow-lg transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 sm:bottom-6"
      >
        +
      </Link>
    </div>
  );
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700">
      {children}
    </p>
  );
}

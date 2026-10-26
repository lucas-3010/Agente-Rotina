"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/", rotulo: "Hoje" },
  { href: "/semana", rotulo: "Semana" },
  { href: "/novas", rotulo: "Novas" },
  { href: "/configuracoes", rotulo: "Ajustes" },
];

export function Navegacao({ pendentes = 0 }: { pendentes?: number }) {
  const caminho = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:top-0 sm:bottom-auto sm:border-b sm:border-t-0">
      <ul className="mx-auto flex max-w-2xl">
        {ABAS.map((aba) => {
          const ativa = caminho === aba.href;
          return (
            <li key={aba.href} className="flex-1">
              <Link
                href={aba.href}
                className={`flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition ${
                  ativa
                    ? "text-slate-900 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                }`}
              >
                {aba.rotulo}
                {aba.href === "/novas" && pendentes > 0 && (
                  <span className="rounded-full bg-sky-600 px-1.5 text-xs font-semibold text-white">
                    {pendentes}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

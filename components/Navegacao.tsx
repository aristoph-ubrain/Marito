"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navegacao({
  links,
  grade = false,
  rotulo = "Navegação institucional",
}: {
  links: { href: string; rotulo: string }[];
  grade?: boolean;
  rotulo?: string;
}) {
  const caminho = usePathname();
  return (
    <nav
      aria-label={rotulo}
      className={grade ? "grid grid-cols-3 gap-1.5 text-center text-xs" : "flex flex-wrap gap-1.5 text-xs"}
    >
      {links.map((l) => {
        const ativo = caminho === l.href || caminho.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={ativo ? "page" : undefined}
            className={`border border-tinta px-2 py-1.5 no-underline ${grade ? "py-2.5" : ""} ${
              ativo ? "bg-tinta text-papel" : "text-tinta"
            }`}
          >
            {l.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}

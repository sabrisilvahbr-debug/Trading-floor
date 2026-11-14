"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Início", d: "M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" },
  { href: "/scanner", label: "Scanner", d: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5" },
  { href: "/trade", label: "Trade", d: "M3 17l6-6 4 4 8-8M15 7h6v6" },
  { href: "/analise", label: "Imagem", d: "M4 7h3l2-3h6l2 3h3v13H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  { href: "/mais", label: "Mais", d: "M4 6h16M4 12h16M4 18h16" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="bottom" aria-label="Navegação principal">
      <ul>
        {ITEMS.map((it) => {
          const more = ["/mais", "/pesquisa", "/congresso", "/carteira", "/historico", "/ajustes"];
          const on = it.href === "/" ? path === "/" : it.href === "/mais" ? more.some((m) => path.startsWith(m)) : path.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link href={it.href} className={on ? "on" : undefined} aria-current={on ? "page" : undefined}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={it.d} />
                </svg>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

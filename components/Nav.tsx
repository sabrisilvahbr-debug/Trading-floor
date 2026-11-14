"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Início", d: "M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" },
  { href: "/analise", label: "Analisar", d: "M4 7h3l2-3h6l2 3h3v13H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  { href: "/historico", label: "Histórico", d: "M12 8v5l3 2M3 12a9 9 0 1 0 3-6.7M3 4v4h4" },
  { href: "/simulacao", label: "Simulação", d: "M4 19V9M10 19V5M16 19v-7M22 19H2" },
  { href: "/ajustes", label: "Ajustes", d: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="bottom" aria-label="Navegação principal">
      <ul>
        {ITEMS.map((it) => {
          const on = it.href === "/" ? path === "/" : path.startsWith(it.href);
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

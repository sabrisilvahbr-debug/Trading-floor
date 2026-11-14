import Link from "next/link";

const LINKS = [
  { href: "/carteira", title: "Carteira paper", text: "Trades simulados, preço atual e resultado" },
  { href: "/pesquisa", title: "Pesquisa", text: "Notícias, 8-Ks e balanço trimestral de uma ação" },
  { href: "/congresso", title: "Congresso", text: "Declarações de transações de deputados dos EUA" },
  { href: "/historico", title: "Histórico de imagens", text: "Análises de gráfico por imagem já feitas" },
  { href: "/ajustes", title: "Ajustes", text: "Código de acesso, lista de observação e limites de risco" },
];

export default function MaisPage() {
  return (
    <main>
      <h1>Mais</h1>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="card" style={{ display: "block", color: "inherit" }}>
          <strong style={{ color: "var(--cyan)" }}>{l.title}</strong>
          <div className="muted">{l.text}</div>
        </Link>
      ))}
    </main>
  );
}

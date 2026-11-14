import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trading Mohamed Floor",
  description: "Análise de gráficos por imagem e simulação. Sem operações reais.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#05070a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="shell">
          <header className="top">
            <span className="brand">TRADING MOHAMED FLOOR</span>
            <span className="pill">Simulação</span>
          </header>
          {children}
          <p className="foot">
            Ferramenta de estudo em modo de simulação. Não executa operações reais e não é recomendação de investimento.
          </p>
        </div>
        <Nav />
      </body>
    </html>
  );
}

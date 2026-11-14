import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trading Mohamed Floor",
  description: "Scanner, plano de trade e simulação de ações dos EUA, só em modo paper.",
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
            <span className="pill">Paper · ações EUA</span>
          </header>
          {children}
          <p className="foot">
            Ferramenta de estudo em modo paper. Não envia ordens a corretora e não é recomendação de investimento. Cotações do Yahoo com atraso.
          </p>
        </div>
        <Nav />
      </body>
    </html>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, store, tradeStats, type PaperTrade } from "@/lib/storage";

interface Status {
  analysis_ready: boolean;
  vision_key: boolean;
  access_code: boolean;
  sec: boolean;
  market: { nyDate: string; nyTime: string; open: boolean; reason: string };
}
interface Quote {
  symbol: string;
  price?: number | null;
  changePct?: number | null;
  time?: string | null;
  error?: string;
}

export default function Home() {
  const [status, setStatus] = useState<Status | null>(null);
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [watch, setWatch] = useState<string[]>([]);
  const [hasCode, setHasCode] = useState(true);

  useEffect(() => {
    const s = store.settings();
    setWatch(s.watchlist);
    setHasCode(Boolean(s.accessCode));
    setTrades(store.trades());
    fetch("/api/status", { cache: "no-store" })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => null);
    if (s.watchlist.length && s.accessCode) {
      api<{ quotes: Quote[] }>(`/api/market/quote?symbols=${s.watchlist.slice(0, 20).join(",")}`)
        .then((d) => setQuotes(d.quotes))
        .catch((e) => setQuoteError(e.message));
    }
  }, []);

  const stats = tradeStats(trades, status?.market.nyDate ?? "");
  const open = trades.filter((t) => t.status === "aberta");

  return (
    <main>
      <h1>Painel</h1>

      {status && (
        <div className="card">
          <div className="row">
            <div>
              <strong>NYSE {status.market.open ? "aberta" : "fechada"}</strong>
              <div className="muted">
                Nova York {status.market.nyTime} · {status.market.reason}
              </div>
            </div>
            <span className={`tag ${status.market.open ? "alta" : "neutro"}`} style={{ flex: "0 0 auto" }}>
              {status.market.open ? "pregão" : "fora"}
            </span>
          </div>
        </div>
      )}

      {status && !status.access_code && <div className="alert">Falta configurar APP_ACCESS_CODE na Vercel. Sem ele, nada que busca dados funciona.</div>}
      {status?.access_code && !hasCode && (
        <div className="alert">
          Digite o código de acesso em <Link href="/ajustes">Ajustes</Link>.
        </div>
      )}
      {status && !status.sec && <div className="alert">Notícias da SEC e balanços precisam de SEC_USER_AGENT na Vercel (seu nome e um e-mail de contato).</div>}

      <div className="grid2" style={{ marginBottom: 14 }}>
        <Link href="/scanner" className="btn">
          Scanner
        </Link>
        <Link href="/trade" className="btn ghost">
          Novo trade
        </Link>
      </div>

      <div className="grid2" style={{ marginBottom: 14 }}>
        <div className="stat">
          <b>{open.length}</b>
          <span>posições paper abertas</span>
        </div>
        <div className="stat">
          <b>US$ {stats.realized.toFixed(2)}</b>
          <span>resultado paper fechado</span>
        </div>
        <div className="stat">
          <b>{stats.winRate == null ? "—" : `${Math.round(stats.winRate * 100)}%`}</b>
          <span>
            trades no lucro ({stats.wins}/{stats.closed})
          </span>
        </div>
        <div className="stat">
          <b>US$ {stats.todayRisk.toFixed(2)}</b>
          <span>risco aberto hoje</span>
        </div>
      </div>

      <div className="card">
        <h2>Lista de observação</h2>
        {watch.length === 0 ? (
          <p className="muted">
            Vazia. Adicione tickers em <Link href="/ajustes">Ajustes</Link>.
          </p>
        ) : quoteError ? (
          <div className="alert err">{quoteError}</div>
        ) : !quotes ? (
          <p className="muted">{hasCode ? "Buscando cotações…" : "Digite o código de acesso para ver as cotações."}</p>
        ) : (
          <ul className="clean">
            {quotes.map((q) => (
              <li key={q.symbol} className="row">
                <Link href={`/pesquisa?symbol=${q.symbol}`}>
                  <strong>{q.symbol}</strong>
                </Link>
                {q.error ? (
                  <span className="muted">{q.error}</span>
                ) : (
                  <span style={{ textAlign: "right" }}>
                    US$ {q.price?.toFixed(2) ?? "—"}{" "}
                    {q.changePct != null && (
                      <span className={`tag ${q.changePct >= 0 ? "alta" : "baixa"}`}>
                        {q.changePct >= 0 ? "+" : ""}
                        {q.changePct.toFixed(2)}%
                      </span>
                    )}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
          Fonte: Yahoo Finance, com atraso.
        </p>
      </div>
    </main>
  );
}

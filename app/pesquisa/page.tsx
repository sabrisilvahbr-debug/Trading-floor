"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/storage";
import type { NewsItem } from "@/lib/research/news";
import type { QuarterRow } from "@/lib/research/analyst";

interface Earnings {
  company: string;
  source: string;
  rows: QuarterRow[];
  ttm: Record<string, number>;
}

const money = (v: number | null | undefined) => {
  if (v == null) return "—";
  const a = Math.abs(v);
  const s = a >= 1e9 ? `${(a / 1e9).toFixed(2)} bi` : a >= 1e6 ? `${(a / 1e6).toFixed(1)} mi` : a.toFixed(0);
  return `${v < 0 ? "-" : ""}US$ ${s}`;
};
const pc = (v: number | null | undefined) => (v == null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`);

export default function PesquisaPage() {
  const [symbol, setSymbol] = useState("");
  const [news, setNews] = useState<{ items: NewsItem[]; errors: string[] } | null>(null);
  const [earn, setEarn] = useState<Earnings | null>(null);
  const [earnErr, setEarnErr] = useState<string | null>(null);
  const [newsErr, setNewsErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("symbol");
    if (s) {
      setSymbol(s.toUpperCase());
      void load(s.toUpperCase());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(sym = symbol) {
    if (!sym) return;
    setBusy(true);
    setNews(null);
    setEarn(null);
    setNewsErr(null);
    setEarnErr(null);
    await Promise.all([
      api<{ items: NewsItem[]; errors: string[] }>(`/api/market/news?symbol=${encodeURIComponent(sym)}`).then(setNews, (e) => setNewsErr(e.message)),
      api<Earnings>(`/api/market/earnings?symbol=${encodeURIComponent(sym)}`).then(setEarn, (e) => setEarnErr(e.message)),
    ]);
    setBusy(false);
  }

  return (
    <main>
      <h1>Pesquisa</h1>
      <div className="row">
        <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase().trim())} placeholder="Ticker, ex.: AAPL" aria-label="Ticker" />
        <button className="btn" style={{ flex: "0 0 110px" }} onClick={() => load()} disabled={!symbol || busy}>
          {busy ? <span className="spin" /> : "Buscar"}
        </button>
      </div>
      <div style={{ height: 14 }} />

      <div className="card">
        <h2>Balanço trimestral</h2>
        {earnErr && <div className="alert err">{earnErr}</div>}
        {earn && (
          <>
            <p className="muted">
              {earn.company} · {earn.source}
            </p>
            {Object.keys(earn.ttm).length > 0 && (
              <p>
                Últimos 12 meses: receita {money(earn.ttm.revenue)} · lucro {money(earn.ttm.net_income)}
                {earn.ttm.eps_diluted != null && ` · LPA US$ ${earn.ttm.eps_diluted}`}
              </p>
            )}
            <ul className="clean">
              {earn.rows.map((r) => (
                <li key={r.end}>
                  <strong>
                    {r.fiscal || r.end}
                  </strong>{" "}
                  <span className="muted">
                    até {r.end}
                    {r.derived ? " · 4º tri calculado (ano − 3 tri)" : ""}
                  </span>
                  <div>
                    Receita {money(r.revenue)} <span className="muted">({pc(r.revenueYoy)} a/a)</span>
                  </div>
                  <div>
                    Lucro {money(r.netIncome)} <span className="muted">({pc(r.netIncomeYoy)} a/a)</span> · LPA {r.epsDiluted ?? "—"} <span className="muted">({pc(r.epsYoy)})</span>
                  </div>
                  <div className="muted">
                    Margens: bruta {r.grossMargin ?? "—"}% · operacional {r.operatingMargin ?? "—"}% · líquida {r.netMargin ?? "—"}%
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        {!earn && !earnErr && <p className="muted">{busy ? "Buscando na SEC…" : "Busque um ticker."}</p>}
      </div>

      <div className="card">
        <h2>Notícias e documentos</h2>
        {newsErr && <div className="alert err">{newsErr}</div>}
        {news?.errors.map((e) => (
          <div key={e} className="alert">
            {e}
          </div>
        ))}
        {news && news.items.length === 0 && <p className="muted">Nada encontrado.</p>}
        {news && (
          <ul className="clean">
            {news.items.map((n) => (
              <li key={n.id}>
                {n.important && <span className="tag baixa">importante</span>}
                {n.tags.map((t) => (
                  <span key={t} className="tag neutro">
                    {t}
                  </span>
                ))}
                <div>
                  <a href={n.link} target="_blank" rel="noopener noreferrer">
                    {n.title}
                  </a>
                </div>
                <div className="muted">
                  {n.source}
                  {n.time && ` · ${new Date(n.time).toLocaleString("pt-BR")}`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, store } from "@/lib/storage";
import { SETUP_LABELS, type DailyScan, type SetupKey } from "@/lib/trading/scanner";

export default function ScannerPage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ at: string; source: string; results: DailyScan[] } | null>(null);

  useEffect(() => setText(store.settings().watchlist.join(", ")), []);

  async function scan() {
    const symbols = text.split(/[\s,;]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
    setBusy(true);
    setError(null);
    try {
      setData(await api("/api/market/scan", { method: "POST", body: JSON.stringify({ symbols }) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na varredura.");
    } finally {
      setBusy(false);
    }
  }

  const hits = data?.results.filter((r) => r.setups.length) ?? [];
  const rest = data?.results.filter((r) => !r.setups.length) ?? [];

  return (
    <main>
      <h1>Scanner</h1>
      <p className="muted">
        Regras do trader-scanner sobre fechamentos diários completos: rompimento da máxima de 20 dias, bandeira de alta, recuperação da média de 20 dias,
        sobrevenda e repique. Até 30 tickers por vez.
      </p>
      <label htmlFor="sy">Tickers</label>
      <textarea id="sy" value={text} onChange={(e) => setText(e.target.value)} placeholder="AAPL, MSFT, NVDA, TSLA" />
      <div style={{ height: 10 }} />
      <button className="btn" onClick={scan} disabled={busy || !text.trim()}>
        {busy ? (
          <>
            <span className="spin" /> Varrendo…
          </>
        ) : (
          "Varrer"
        )}
      </button>
      {error && (
        <div className="alert err" style={{ marginTop: 14 }}>
          {error}
        </div>
      )}

      {data && (
        <div style={{ marginTop: 16 }}>
          <p className="muted">
            {data.source} · {new Date(data.at).toLocaleString("pt-BR")} · {hits.length} com setup de {data.results.length}
          </p>
          {hits.map((r) => (
            <div className="card" key={r.symbol}>
              <div className="row">
                <strong>{r.symbol}</strong>
                <span style={{ textAlign: "right" }}>
                  US$ {r.price?.toFixed(2)} · RSI {r.rsi ?? "—"}
                </span>
              </div>
              <div style={{ margin: "8px 0" }}>
                {r.setups.map((s) => (
                  <span key={s} className="tag alta">
                    {SETUP_LABELS[s as SetupKey]}
                  </span>
                ))}
              </div>
              <p className="muted">
                Fechamento de {r.closeDate} · máxima 20d {r.high20} · média 20d {r.ma20}
              </p>
              <div className="row">
                <Link className="btn ghost small" href={`/trade?symbol=${r.symbol}`}>
                  Montar trade
                </Link>
                <Link className="btn ghost small" href={`/pesquisa?symbol=${r.symbol}`}>
                  Notícias e balanço
                </Link>
              </div>
            </div>
          ))}
          {rest.length > 0 && (
            <div className="card">
              <h2>Sem setup hoje</h2>
              <ul className="clean">
                {rest.map((r) => (
                  <li key={r.symbol} className="row">
                    <strong>{r.symbol}</strong>
                    <span className="muted" style={{ textAlign: "right" }}>
                      {r.status === "erro" ? r.error : r.status === "curto" ? "histórico curto" : `US$ ${r.price?.toFixed(2)} · RSI ${r.rsi ?? "—"}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

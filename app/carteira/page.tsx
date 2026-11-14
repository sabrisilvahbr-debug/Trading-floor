"use client";
import { useEffect, useState } from "react";
import { api, store, tradeStats, type PaperTrade } from "@/lib/storage";

interface Quote {
  symbol: string;
  price?: number | null;
  time?: string | null;
  error?: string;
}

export default function CarteiraPage() {
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setTrades(store.trades()), []);

  const open = trades.filter((t) => t.status === "aberta");
  const closed = trades.filter((t) => t.status === "fechada");
  const st = tradeStats(trades, "");

  async function refresh() {
    const syms = [...new Set(open.map((t) => t.symbol))];
    if (!syms.length) return;
    setBusy(true);
    setError(null);
    try {
      const d = await api<{ quotes: Quote[] }>(`/api/market/quote?symbols=${syms.join(",")}`);
      setQuotes(Object.fromEntries(d.quotes.map((q) => [q.symbol, q])));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function close(t: PaperTrade, price: number, reason: string) {
    const list = trades.map((x) => (x.id === t.id ? { ...x, status: "fechada" as const, exitPrice: price, exitAt: new Date().toISOString(), exitReason: reason } : x));
    store.saveTrades(list);
    setTrades(list);
  }

  function remove(id: string) {
    const list = trades.filter((x) => x.id !== id);
    store.saveTrades(list);
    setTrades(list);
  }

  return (
    <main>
      <h1>Carteira paper</h1>
      <p className="muted">Trades simulados registrados no fluxo de Trade. O preço vem do Yahoo, com atraso; o fechamento usa o último preço disponível.</p>

      <div className="grid2" style={{ marginBottom: 14 }}>
        <div className="stat">
          <b>US$ {st.realized.toFixed(2)}</b>
          <span>resultado fechado</span>
        </div>
        <div className="stat">
          <b>{st.winRate == null ? "—" : `${Math.round(st.winRate * 100)}%`}</b>
          <span>
            no lucro ({st.wins}/{st.closed})
          </span>
        </div>
      </div>

      <div className="card">
        <div className="row">
          <h2 style={{ margin: 0 }}>Abertas ({open.length})</h2>
          <button className="btn ghost small" style={{ flex: "0 0 auto" }} onClick={refresh} disabled={busy || !open.length}>
            {busy ? <span className="spin" /> : "Atualizar preços"}
          </button>
        </div>
        {error && <div className="alert err" style={{ marginTop: 10 }}>{error}</div>}
        {open.length === 0 ? (
          <p className="muted" style={{ marginTop: 10 }}>Nenhuma posição aberta.</p>
        ) : (
          <ul className="clean">
            {open.map((t) => {
              const q = quotes[t.symbol];
              const px = q?.price ?? null;
              const pnl = px != null ? st.pnl(t, px) : null;
              const hitStop = px != null && px <= t.stop;
              const hitTarget = px != null && px >= t.target;
              return (
                <li key={t.id}>
                  <div className="row">
                    <strong>
                      {t.symbol} · {t.qty} ações
                    </strong>
                    <span style={{ textAlign: "right" }}>
                      {pnl == null ? "—" : <span className={`tag ${pnl >= 0 ? "alta" : "baixa"}`}>US$ {pnl.toFixed(2)}</span>}
                    </span>
                  </div>
                  <div className="muted">
                    entrada {t.entry.toFixed(2)} · stop {t.stop.toFixed(2)} · alvo {t.target.toFixed(2)} · agora {px?.toFixed(2) ?? "—"}
                  </div>
                  {hitStop && <div className="alert err">O preço está no stop ou abaixo. Feche o trade.</div>}
                  {hitTarget && <div className="alert">O preço chegou ao alvo.</div>}
                  <div className="row" style={{ marginTop: 6 }}>
                    <button className="btn ghost small" disabled={px == null} onClick={() => px != null && close(t, px, hitStop ? "stop" : hitTarget ? "alvo" : "manual")}>
                      Fechar a {px?.toFixed(2) ?? "—"}
                    </button>
                    <button className="btn danger small" onClick={() => remove(t.id)}>
                      apagar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Fechadas ({closed.length})</h2>
        {closed.length === 0 ? (
          <p className="muted">Nenhuma ainda.</p>
        ) : (
          <ul className="clean">
            {closed.map((t) => {
              const pnl = st.pnl(t, t.exitPrice!);
              return (
                <li key={t.id}>
                  <div className="row">
                    <strong>
                      {t.symbol} · {t.qty}
                    </strong>
                    <span style={{ textAlign: "right" }}>
                      <span className={`tag ${pnl >= 0 ? "alta" : "baixa"}`}>US$ {pnl.toFixed(2)}</span>
                    </span>
                  </div>
                  <div className="muted">
                    {t.entry.toFixed(2)} → {t.exitPrice!.toFixed(2)} ({t.exitReason}) · {new Date(t.createdAt).toLocaleDateString("pt-BR")}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

"use client";
import { useState } from "react";
import { api } from "@/lib/storage";
import type { Ptr } from "@/lib/research/congress";

export default function CongressoPage() {
  const year0 = new Date().getUTCFullYear();
  const [year, setYear] = useState(year0);
  const [q, setQ] = useState("Pelosi");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ total: number; filings: Ptr[]; note: string; source: string } | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      setData(await api(`/api/market/congress?year=${year}&q=${encodeURIComponent(q)}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Congresso dos EUA</h1>
      <p className="muted">Declarações de transações de ações (PTR) que deputados entregam pela lei STOCK Act, direto do índice oficial da Câmara.</p>
      <div className="row">
        <div>
          <label htmlFor="q">Nome (vazio = todos)</label>
          <input id="q" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div style={{ flex: "0 0 110px" }}>
          <label htmlFor="y">Ano</label>
          <select id="y" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[year0, year0 - 1, year0 - 2].map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ height: 10 }} />
      <button className="btn" onClick={load} disabled={busy}>
        {busy ? <span className="spin" /> : "Buscar declarações"}
      </button>
      {error && (
        <div className="alert err" style={{ marginTop: 14 }}>
          {error}
        </div>
      )}
      {data && (
        <div className="card" style={{ marginTop: 14 }}>
          <p className="muted">
            {data.total} PTR(s) · {data.source}
          </p>
          <ul className="clean">
            {data.filings.map((f) => (
              <li key={f.docId}>
                <strong>{f.name}</strong> <span className="muted">{f.state}</span>
                <div className="row">
                  <span className="muted">entregue em {f.filed}</span>
                  <a href={f.pdf} target="_blank" rel="noopener noreferrer" style={{ textAlign: "right" }}>
                    abrir PDF oficial
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <p className="muted" style={{ marginTop: 8 }}>
            {data.note}
          </p>
        </div>
      )}
    </main>
  );
}

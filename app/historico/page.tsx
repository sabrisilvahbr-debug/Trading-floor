"use client";
import { useEffect, useState } from "react";
import SignalCard from "@/components/SignalCard";
import { store, type Analysis } from "@/lib/storage";

export default function HistoricoPage() {
  const [list, setList] = useState<Analysis[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<"TODOS" | "COMPRA" | "VENDA" | "NEUTRO">("TODOS");

  useEffect(() => setList(store.analyses()), []);

  const shown = filter === "TODOS" ? list : list.filter((a) => a.decision.signal === filter);

  function remove(id: string) {
    store.removeAnalysis(id);
    setList(store.analyses());
    setOpen(null);
  }

  return (
    <main>
      <h1>Histórico</h1>
      <label htmlFor="f">Filtrar</label>
      <select id="f" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
        <option value="TODOS">Todos</option>
        <option value="COMPRA">Compra</option>
        <option value="VENDA">Venda</option>
        <option value="NEUTRO">Neutro</option>
      </select>
      <div style={{ height: 14 }} />

      {shown.length === 0 ? (
        <p className="muted">Nada por aqui ainda.</p>
      ) : (
        shown.map((a) => (
          <div className="card" key={a.id}>
            <div className="row" style={{ cursor: "pointer" }} onClick={() => setOpen(open === a.id ? null : a.id)}>
              {a.thumbnail ? <img className="thumb" src={a.thumbnail} alt="" /> : <span className="thumb" />}
              <div>
                <span className={`tag ${a.decision.signal}`}>{a.decision.signal}</span> {a.reading.asset ?? "Ativo não identificado"}
                <div className="muted">
                  {new Date(a.createdAt).toLocaleString("pt-BR")} · {Math.round(a.reading.confidence * 100)}%
                </div>
              </div>
            </div>
            {open === a.id && (
              <div style={{ marginTop: 14 }}>
                <SignalCard reading={a.reading} decision={a.decision} />
                <button className="btn danger small" onClick={() => remove(a.id)}>
                  Apagar esta análise
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </main>
  );
}

"use client";
import { useEffect, useMemo, useState } from "react";
import { breakEven, profit, summarize, type Outcome, type Simulation } from "@/lib/stats";
import { newId, store, type AssetSetting } from "@/lib/storage";

const OUTCOMES: Outcome[] = ["acerto", "erro", "empate"];

export default function SimulacaoPage() {
  const [sims, setSims] = useState<Simulation[]>([]);
  const [assets, setAssets] = useState<AssetSetting[]>([]);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [asset, setAsset] = useState("");
  const [direction, setDirection] = useState<"COMPRA" | "VENDA">("COMPRA");
  const [expiration, setExpiration] = useState("");
  const [payout, setPayout] = useState("");
  const [stake, setStake] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSims(store.simulations());
    setAssets(store.settings().assets);
    const id = new URLSearchParams(window.location.search).get("analise");
    if (id) {
      const a = store.analyses().find((x) => x.id === id);
      if (a && a.decision.signal !== "NEUTRO") {
        setAnalysisId(a.id);
        setDirection(a.decision.signal);
        if (a.reading.asset) setAsset(a.reading.asset);
      }
    }
  }, []);

  const setting = assets.find((a) => a.asset.toLowerCase() === asset.trim().toLowerCase());
  useEffect(() => {
    if (setting?.payoutPct != null && payout === "") setPayout(String(setting.payoutPct));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setting?.asset]);

  const summary = useMemo(() => summarize(sims), [sims]);
  const payoutNum = Number(payout.replace(",", "."));
  const stakeNum = Number(stake.replace(",", "."));

  function save(list: Simulation[]) {
    setSims(list);
    if (!store.saveSimulations(list)) setError("Não foi possível salvar neste aparelho.");
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!asset.trim()) return setError("Informe o ativo.");
    if (!expiration.trim()) return setError("Informe a expiração como aparece na plataforma.");
    if (!(payoutNum > 0 && payoutNum <= 1000)) return setError("Informe o payout em % (ex.: o valor mostrado na plataforma).");
    if (!(stakeNum > 0)) return setError("Informe o valor simulado da entrada.");
    const sim: Simulation = {
      id: newId(),
      createdAt: new Date().toISOString(),
      analysisId,
      asset: asset.trim(),
      direction,
      expiration: expiration.trim(),
      payoutPct: payoutNum,
      stake: stakeNum,
      outcome: "pendente",
    };
    save([sim, ...sims]);
    setAnalysisId(null);
    setExpiration("");
  }

  function setOutcome(id: string, outcome: Outcome) {
    save(sims.map((s) => (s.id === id ? { ...s, outcome } : s)));
  }

  function remove(id: string) {
    save(sims.filter((s) => s.id !== id));
  }

  return (
    <main>
      <h1>Simulação</h1>
      <p className="muted">
        Registro de entradas simuladas. Nada é enviado a corretora. O resultado de cada entrada é marcado por você, olhando o
        que aconteceu na plataforma.
      </p>

      <div className="grid2" style={{ marginBottom: 14 }}>
        <div className="stat">
          <b>{summary.winRate == null ? "—" : `${Math.round(summary.winRate * 100)}%`}</b>
          <span>
            acerto ({summary.wins}/{summary.wins + summary.losses})
          </span>
        </div>
        <div className="stat">
          <b>{summary.avgBreakEven == null ? "—" : `${Math.round(summary.avgBreakEven * 1000) / 10}%`}</b>
          <span>acerto mínimo p/ empatar</span>
        </div>
        <div className="stat">
          <b>{summary.net.toFixed(2)}</b>
          <span>resultado simulado</span>
        </div>
        <div className="stat">
          <b>{summary.total - summary.closed}</b>
          <span>pendentes</span>
        </div>
      </div>

      <form className="card" onSubmit={add}>
        <h2>Nova entrada simulada</h2>
        {analysisId && <p className="muted">Ligada à análise selecionada.</p>}
        <label htmlFor="asset">Ativo</label>
        <input id="asset" list="assets" value={asset} onChange={(e) => setAsset(e.target.value)} placeholder="Como aparece na plataforma" />
        <datalist id="assets">
          {assets.map((a) => (
            <option key={a.asset} value={a.asset} />
          ))}
        </datalist>
        <label htmlFor="dir">Direção</label>
        <select id="dir" value={direction} onChange={(e) => setDirection(e.target.value as "COMPRA" | "VENDA")}>
          <option value="COMPRA">Compra</option>
          <option value="VENDA">Venda</option>
        </select>
        <div className="row">
          <div>
            <label htmlFor="exp">Expiração</label>
            {setting && setting.expirations.length > 0 ? (
              <select id="exp" value={expiration} onChange={(e) => setExpiration(e.target.value)}>
                <option value="">Escolha</option>
                {setting.expirations.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            ) : (
              <input id="exp" value={expiration} onChange={(e) => setExpiration(e.target.value)} placeholder="Digite" />
            )}
          </div>
          <div>
            <label htmlFor="pay">Payout (%)</label>
            <input id="pay" inputMode="decimal" value={payout} onChange={(e) => setPayout(e.target.value)} placeholder="Digite" />
          </div>
        </div>
        <label htmlFor="stake">Valor simulado</label>
        <input id="stake" inputMode="decimal" value={stake} onChange={(e) => setStake(e.target.value)} placeholder="Ex.: 10" />
        {payoutNum > 0 && (
          <p className="muted" style={{ marginTop: 8 }}>
            Com payout de {payoutNum}%, é preciso acertar pelo menos {Math.round(breakEven(payoutNum) * 1000) / 10}% das entradas
            só para empatar.
          </p>
        )}
        {error && <div className="alert err">{error}</div>}
        <div style={{ height: 8 }} />
        <button className="btn" type="submit">
          Registrar
        </button>
      </form>

      <div className="card">
        <h2>Entradas</h2>
        {sims.length === 0 ? (
          <p className="muted">Nenhuma entrada simulada.</p>
        ) : (
          <ul className="clean">
            {sims.map((s) => (
              <li key={s.id}>
                <div>
                  <span className={`tag ${s.direction}`}>{s.direction}</span> {s.asset} · {s.expiration} · {s.payoutPct}% ·{" "}
                  {s.stake.toFixed(2)} <span className={`tag ${s.outcome}`}>{s.outcome}</span>
                  {s.outcome !== "pendente" && <span className="muted"> {profit(s) >= 0 ? "+" : ""}{profit(s).toFixed(2)}</span>}
                </div>
                <div className="muted">{new Date(s.createdAt).toLocaleString("pt-BR")}</div>
                <div className="row" style={{ marginTop: 6, flexWrap: "wrap" }}>
                  {OUTCOMES.map((o) => (
                    <button key={o} className="btn ghost small" type="button" onClick={() => setOutcome(s.id, o)}>
                      {o}
                    </button>
                  ))}
                  <button className="btn danger small" type="button" onClick={() => remove(s.id)}>
                    apagar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

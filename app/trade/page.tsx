"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, newId, store, tradeStats, type PaperTrade } from "@/lib/storage";
import { computePlan, type Plan, type StopRule } from "@/lib/trading/plan";
import { DEFAULT_RULES, riskCheck, sizeTrade, type Rules } from "@/lib/trading/rules";

interface Orb {
  symbol: string;
  status: string;
  message: string;
  orHigh: number | null;
  orLow: number | null;
  last: number | null;
  trigger: { price: number; at: string; volumeOk: boolean | null } | null;
  market: { nyDate: string; nyTime: string; open: boolean; reason: string };
  source: string;
}

interface TM {
  mc: { pTarget: number; pStop: number; pNeither: number; pGreen: number; medianClose: number; p5Close: number; p95Close: number; avgR: number; until: string; replays: number };
  history: { sessions: number; triggered: number; target: number; stop: number; close: number; avgR: number | null } | null;
  verdict: { headline: string; notes: string[] };
  pool: { sessions: number; from: string; to: string };
  note: string;
}

const pctf = (x: number) => `${(x * 100).toFixed(1)}%`;

export default function TradePage() {
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
  const [symbol, setSymbol] = useState("");
  const [orMin, setOrMin] = useState(15);
  const [orb, setOrb] = useState<Orb | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [entry, setEntry] = useState("");
  const [entryTime, setEntryTime] = useState("");
  const [orHigh, setOrHigh] = useState("");
  const [orLow, setOrLow] = useState("");
  const [stopRule, setStopRule] = useState<StopRule>("or_mid");
  const [stopParam, setStopParam] = useState("");
  const [targetR, setTargetR] = useState("2");
  const [tm, setTm] = useState<TM | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setRules(store.settings().rules);
    const s = new URLSearchParams(window.location.search).get("symbol");
    if (s) setSymbol(s.toUpperCase());
  }, []);

  const num = (s: string) => Number(s.replace(",", "."));
  const plan: { plan: Plan | null; error: string | null } = useMemo(() => {
    if (!symbol || !entry) return { plan: null, error: null };
    try {
      return {
        plan: computePlan({
          symbol,
          entry: num(entry),
          stopRule,
          stopParam: stopParam ? num(stopParam) : undefined,
          targetR: num(targetR) || 2,
          orHigh: orHigh ? num(orHigh) : null,
          orLow: orLow ? num(orLow) : null,
        }),
        error: null,
      };
    } catch (e) {
      return { plan: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [symbol, entry, stopRule, stopParam, targetR, orHigh, orLow]);

  const sizing = useMemo(() => {
    if (!plan.plan) return null;
    try {
      return { s: sizeTrade(symbol, plan.plan.entry, plan.plan.stop, plan.plan.target, rules), error: null };
    } catch (e) {
      return { s: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [plan.plan, rules, symbol]);

  const nyDate = orb?.market.nyDate ?? "";
  const risk = useMemo(() => {
    if (!sizing?.s) return null;
    const st = tradeStats(store.trades(), nyDate);
    return riskCheck(sizing.s, rules, { trades: st.todayTrades, riskOpen: st.todayRisk });
  }, [sizing, rules, nyDate]);

  async function checkEntry() {
    setBusy("orb");
    setError(null);
    setTm(null);
    setSaved(false);
    try {
      const d = await api<Orb>(`/api/market/orb?symbol=${encodeURIComponent(symbol)}&or=${orMin}&vol=1.5`);
      setOrb(d);
      if (d.orHigh != null) setOrHigh(String(d.orHigh));
      if (d.orLow != null) setOrLow(String(d.orLow));
      if (d.trigger) {
        setEntry(String(d.trigger.price));
        setEntryTime(d.trigger.at);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function runTM() {
    if (!plan.plan) return;
    setBusy("tm");
    setError(null);
    try {
      setTm(
        await api<TM>("/api/market/timemachine", {
          method: "POST",
          body: JSON.stringify({
            symbol,
            entry: plan.plan.entry,
            stop: plan.plan.stop,
            target: plan.plan.target,
            entryTime,
            orMinutes: orMin,
            stopRule: stopRule === "or_mid" || stopRule === "or_low" ? stopRule : null,
            targetR: num(targetR) || 2,
          }),
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  function register() {
    if (!plan.plan || !sizing?.s || risk?.verdict !== "PASS") return;
    const t: PaperTrade = {
      id: newId(),
      createdAt: new Date().toISOString(),
      nyDate,
      symbol,
      qty: sizing.s.qty,
      entry: plan.plan.entry,
      stop: plan.plan.stop,
      target: plan.plan.target,
      maxLoss: sizing.s.maxLoss,
      setup: orb?.trigger ? `rompimento do opening range de ${orMin} min` : "manual",
      status: "aberta",
      exitPrice: null,
      exitAt: null,
      exitReason: null,
    };
    setSaved(store.saveTrades([t, ...store.trades()]));
  }

  return (
    <main>
      <h1>Trade (paper)</h1>
      <p className="muted">Fluxo das skills: entrada → stop e alvo → Time Machine → tamanho → risco. Só compra. Nada vai para corretora.</p>

      <div className="card">
        <h2>1. Entrada</h2>
        <div className="row">
          <div>
            <label htmlFor="sym">Ticker</label>
            <input id="sym" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase().trim())} placeholder="AAPL" />
          </div>
          <div>
            <label htmlFor="or">Opening range</label>
            <select id="or" value={orMin} onChange={(e) => setOrMin(Number(e.target.value))}>
              {[5, 10, 15, 30].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ height: 10 }} />
        <button className="btn" onClick={checkEntry} disabled={!symbol || busy !== null}>
          {busy === "orb" ? <span className="spin" /> : "Verificar rompimento agora"}
        </button>
        {orb && (
          <div className={`alert ${orb.status === "disparou" ? "" : ""}`} style={{ marginTop: 12 }}>
            <strong>{orb.status}</strong>: {orb.message}
            {orb.trigger?.volumeOk === false && " Volume do candle abaixo de 1,5× a média do range."}
            <div className="muted">
              {orb.source} · Nova York {orb.market.nyTime}
            </div>
          </div>
        )}
        <div className="row">
          <div>
            <label htmlFor="en">Entrada (US$)</label>
            <input id="en" inputMode="decimal" value={entry} onChange={(e) => setEntry(e.target.value)} />
          </div>
          <div>
            <label htmlFor="et">Hora do candle (NY)</label>
            <input id="et" value={entryTime} onChange={(e) => setEntryTime(e.target.value)} placeholder="09:50" />
          </div>
        </div>
        <div className="row">
          <div>
            <label htmlFor="oh">Máx. do range</label>
            <input id="oh" inputMode="decimal" value={orHigh} onChange={(e) => setOrHigh(e.target.value)} />
          </div>
          <div>
            <label htmlFor="ol">Mín. do range</label>
            <input id="ol" inputMode="decimal" value={orLow} onChange={(e) => setOrLow(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2>2. Stop e alvo</h2>
        <div className="row">
          <div>
            <label htmlFor="sr">Stop</label>
            <select id="sr" value={stopRule} onChange={(e) => setStopRule(e.target.value as StopRule)}>
              <option value="or_mid">Meio do range</option>
              <option value="or_low">Mínima do range</option>
              <option value="price">Preço</option>
              <option value="pct">% abaixo</option>
            </select>
          </div>
          {(stopRule === "price" || stopRule === "pct") && (
            <div>
              <label htmlFor="sp">{stopRule === "price" ? "Preço do stop" : "%"}</label>
              <input id="sp" inputMode="decimal" value={stopParam} onChange={(e) => setStopParam(e.target.value)} />
            </div>
          )}
          <div>
            <label htmlFor="tr">Alvo (R)</label>
            <input id="tr" inputMode="decimal" value={targetR} onChange={(e) => setTargetR(e.target.value)} />
          </div>
        </div>
        {plan.error && <div className="alert err" style={{ marginTop: 10 }}>{plan.error}</div>}
        {plan.plan && (
          <ul className="clean" style={{ marginTop: 10 }}>
            <li>Entrada US$ {plan.plan.entry.toFixed(2)}</li>
            <li>
              Stop US$ {plan.plan.stop.toFixed(2)} <span className="muted">({plan.plan.stopLabel})</span>
            </li>
            <li>
              Alvo US$ {plan.plan.target.toFixed(2)} <span className="muted">({plan.plan.targetLabel})</span>
            </li>
            <li>
              Risco US$ {plan.plan.risk.toFixed(2)} por ação · retorno/risco {plan.plan.rewardRisk}
            </li>
          </ul>
        )}
      </div>

      <div className="card">
        <h2>3. Time Machine</h2>
        <p className="muted">10.000 simulações do resto do pregão, montadas com candles de 5 min dos últimos 60 dias da própria ação.</p>
        <button className="btn ghost" onClick={runTM} disabled={!plan.plan || !entryTime || busy !== null}>
          {busy === "tm" ? <span className="spin" /> : "Rodar simulação"}
        </button>
        {tm && (
          <div style={{ marginTop: 12 }}>
            <p>
              <strong>{tm.verdict.headline}</strong>
            </p>
            {tm.verdict.notes.map((n) => (
              <p key={n} className="muted">
                {n}
              </p>
            ))}
            <div className="grid2">
              <div className="stat">
                <b>{pctf(tm.mc.pTarget)}</b>
                <span>alvo primeiro</span>
              </div>
              <div className="stat">
                <b>{pctf(tm.mc.pStop)}</b>
                <span>stop primeiro</span>
              </div>
              <div className="stat">
                <b>{pctf(tm.mc.pNeither)}</b>
                <span>nenhum até {tm.mc.until}</span>
              </div>
              <div className="stat">
                <b>{tm.mc.avgR > 0 ? "+" : ""}{tm.mc.avgR.toFixed(3)}R</b>
                <span>R médio</span>
              </div>
            </div>
            <p className="muted" style={{ marginTop: 8 }}>
              Fechamento: mediana US$ {tm.mc.medianClose} (5% a 95%: {tm.mc.p5Close} a {tm.mc.p95Close}).
            </p>
            {tm.history && (
              <p className="muted">
                Histórico da regra: disparou em {tm.history.triggered} de {tm.history.sessions} pregões · alvo {tm.history.target} · stop {tm.history.stop} · fechamento {tm.history.close}
                {tm.history.avgR != null && ` · R médio ${tm.history.avgR}`}.
              </p>
            )}
            <p className="muted">
              Pregões de {tm.pool.from} a {tm.pool.to}. {tm.note}
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <h2>4. Tamanho e risco</h2>
        {!plan.plan ? (
          <p className="muted">Monte o plano primeiro.</p>
        ) : sizing?.error ? (
          <div className="alert err">{sizing.error}</div>
        ) : (
          sizing?.s && (
            <>
              <p>
                <strong>{sizing.s.qty} ações</strong> · custo US$ {sizing.s.cost} · perda no stop US$ {sizing.s.maxLoss}
                <span className="muted"> (limitado por {sizing.s.boundBy})</span>
              </p>
              {sizing.s.refusal && <div className="alert err">{sizing.s.refusal}</div>}
              {risk && (
                <>
                  <div className={`signal ${risk.verdict === "PASS" ? "COMPRA" : "VENDA"}`} style={{ padding: 12 }}>
                    <b style={{ fontSize: "1.4rem" }}>{risk.verdict}</b>
                  </div>
                  <ul className="clean">
                    {risk.checks.map((c) => (
                      <li key={c.name}>
                        <span className={`tag ${c.pass ? "alta" : "baixa"}`}>{c.pass ? "ok" : "bloqueia"}</span> {c.name}
                        <div className="muted">{c.detail}</div>
                      </li>
                    ))}
                  </ul>
                  <div style={{ height: 10 }} />
                  <button className="btn" onClick={register} disabled={risk.verdict !== "PASS" || saved}>
                    {saved ? "Registrado na carteira paper" : "Registrar trade paper"}
                  </button>
                  {risk.verdict === "BLOCK" && <p className="muted" style={{ marginTop: 8 }}>Bloqueio do risco é final, como na skill trader-risk.</p>}
                  {saved && (
                    <p style={{ marginTop: 8 }}>
                      <Link href="/carteira">Ver carteira paper</Link>
                    </p>
                  )}
                </>
              )}
            </>
          )
        )}
        <p className="muted" style={{ marginTop: 8 }}>
          Limites em <Link href="/ajustes">Ajustes</Link>.
        </p>
      </div>

      {error && <div className="alert err">{error}</div>}
    </main>
  );
}

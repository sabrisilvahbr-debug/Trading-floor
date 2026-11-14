"use client";
import { useEffect, useState } from "react";
import { store, type Settings } from "@/lib/storage";
import { DEFAULT_RULES, type Rules } from "@/lib/trading/rules";

const NUM_FIELDS: { key: keyof Rules; label: string }[] = [
  { key: "budget", label: "Orçamento (US$)" },
  { key: "cashBufferPct", label: "Reserva de caixa (%)" },
  { key: "maxPositionPct", label: "Posição máxima (% do orçamento)" },
  { key: "maxOrderUsd", label: "Ordem máxima (US$)" },
  { key: "minOrderUsd", label: "Ordem mínima (US$)" },
  { key: "maxLossPerTradeUsd", label: "Perda máxima por trade (US$)" },
  { key: "maxDailyLossUsd", label: "Perda máxima por dia (US$)" },
  { key: "maxTradesPerDay", label: "Trades por dia" },
  { key: "minRewardRisk", label: "Retorno/risco mínimo" },
];
const TIME_FIELDS: { key: keyof Rules; label: string }[] = [
  { key: "noEntriesBefore", label: "Sem entradas antes de (NY)" },
  { key: "noEntriesAfter", label: "Sem entradas depois de (NY)" },
  { key: "flatBy", label: "Zerar até (NY)" },
];

export default function AjustesPage() {
  const [s, setS] = useState<Settings>({ accessCode: "", watchlist: [], rules: DEFAULT_RULES });
  const [watchText, setWatchText] = useState("");
  const [blockedText, setBlockedText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const cur = store.settings();
    setS(cur);
    setWatchText(cur.watchlist.join(", "));
    setBlockedText(cur.rules.blocked.join(", "));
  }, []);

  const tickers = (t: string) => [...new Set(t.split(/[\s,;]+/).map((x) => x.trim().toUpperCase()).filter((x) => /^[A-Z][A-Z0-9.\-]{0,9}$/.test(x)))];

  function save(e: React.FormEvent) {
    e.preventDefault();
    const next: Settings = { ...s, watchlist: tickers(watchText).slice(0, 30), rules: { ...s.rules, blocked: tickers(blockedText) } };
    setS(next);
    setWatchText(next.watchlist.join(", "));
    setMsg(store.saveSettings(next) ? "Ajustes salvos neste aparelho." : "Não foi possível salvar neste aparelho.");
  }

  const setRule = (k: keyof Rules, v: string | number) => setS({ ...s, rules: { ...s.rules, [k]: v } });

  return (
    <main>
      <h1>Ajustes</h1>
      <form onSubmit={save}>
        <div className="card">
          <h2>Código de acesso</h2>
          <p className="muted">O mesmo valor de APP_ACCESS_CODE na Vercel. Protege as buscas de dados e a análise de imagem.</p>
          <input type="password" autoComplete="current-password" aria-label="Código de acesso" value={s.accessCode} onChange={(e) => setS({ ...s, accessCode: e.target.value })} />
        </div>

        <div className="card">
          <h2>Lista de observação</h2>
          <p className="muted">Até 30 tickers, separados por vírgula. Usada no Início e no Scanner.</p>
          <textarea value={watchText} onChange={(e) => setWatchText(e.target.value)} placeholder="AAPL, MSFT, NVDA" />
        </div>

        <div className="card">
          <h2>Limites de risco (paper)</h2>
          <p className="muted">Os valores iniciais são os do trader/config.json das skills.</p>
          <div className="grid2">
            {NUM_FIELDS.map((f) => (
              <div key={f.key}>
                <label htmlFor={f.key}>{f.label}</label>
                <input id={f.key} inputMode="decimal" value={String(s.rules[f.key])} onChange={(e) => setRule(f.key, Number(e.target.value.replace(",", ".")) || 0)} />
              </div>
            ))}
            {TIME_FIELDS.map((f) => (
              <div key={f.key}>
                <label htmlFor={f.key}>{f.label}</label>
                <input id={f.key} value={String(s.rules[f.key])} onChange={(e) => setRule(f.key, e.target.value)} placeholder="HH:MM" />
              </div>
            ))}
          </div>
          <label htmlFor="bl">Tickers bloqueados</label>
          <input id="bl" value={blockedText} onChange={(e) => setBlockedText(e.target.value)} />
          <div style={{ height: 10 }} />
          <button type="button" className="btn ghost small" onClick={() => setS({ ...s, rules: DEFAULT_RULES })}>
            Voltar aos valores das skills
          </button>
        </div>

        <button className="btn" type="submit">
          Salvar
        </button>
      </form>

      {msg && (
        <div className="alert" style={{ marginTop: 14 }}>
          {msg}
        </div>
      )}

      <div className="card" style={{ marginTop: 14 }}>
        <h2>Dados deste aparelho</h2>
        <p className="muted">Até o login com Supabase, análises, trades paper e ajustes ficam só neste navegador.</p>
        <button
          className="btn danger"
          onClick={() => {
            if (window.confirm("Apagar análises, trades paper e ajustes deste aparelho?")) {
              store.clearAll();
              const cur = store.settings();
              setS(cur);
              setWatchText("");
              setBlockedText("");
              setMsg("Dados apagados.");
            }
          }}
        >
          Apagar todos os dados locais
        </button>
      </div>
    </main>
  );
}

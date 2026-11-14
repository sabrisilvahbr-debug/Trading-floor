"use client";
import { useEffect, useState } from "react";
import { store, type AssetSetting, type Settings } from "@/lib/storage";

export default function AjustesPage() {
  const [settings, setSettings] = useState<Settings>({ accessCode: "", assets: [] });
  const [saved, setSaved] = useState<string | null>(null);
  const [asset, setAsset] = useState("");
  const [exps, setExps] = useState("");
  const [payout, setPayout] = useState("");

  useEffect(() => setSettings(store.settings()), []);

  function persist(next: Settings, msg: string) {
    setSettings(next);
    setSaved(store.saveSettings(next) ? msg : "Não foi possível salvar neste aparelho.");
  }

  function addAsset(e: React.FormEvent) {
    e.preventDefault();
    const name = asset.trim();
    if (!name) return;
    const p = Number(payout.replace(",", "."));
    const item: AssetSetting = {
      asset: name,
      expirations: exps
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      payoutPct: payout.trim() && p > 0 ? p : null,
    };
    const others = settings.assets.filter((a) => a.asset.toLowerCase() !== name.toLowerCase());
    persist({ ...settings, assets: [...others, item].sort((a, b) => a.asset.localeCompare(b.asset)) }, "Ativo salvo.");
    setAsset("");
    setExps("");
    setPayout("");
  }

  return (
    <main>
      <h1>Ajustes</h1>

      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          persist(settings, "Código salvo neste aparelho.");
        }}
      >
        <h2>Código de acesso</h2>
        <p className="muted">É o mesmo valor definido em APP_ACCESS_CODE na Vercel. Protege a análise, que tem custo por uso.</p>
        <input
          type="password"
          autoComplete="current-password"
          value={settings.accessCode}
          onChange={(e) => setSettings({ ...settings, accessCode: e.target.value })}
          aria-label="Código de acesso"
        />
        <div style={{ height: 10 }} />
        <button className="btn" type="submit">
          Salvar código
        </button>
      </form>

      <form className="card" onSubmit={addAsset}>
        <h2>Ativos, expirações e payouts</h2>
        <p className="muted">
          Sem valores prontos: copie da plataforma o que ela mostra para cada ativo. Payouts mudam ao longo do dia; confira antes
          de cada entrada.
        </p>
        <label htmlFor="a">Ativo</label>
        <input id="a" value={asset} onChange={(e) => setAsset(e.target.value)} />
        <label htmlFor="e">Expirações (separe por vírgula)</label>
        <input id="e" value={exps} onChange={(e) => setExps(e.target.value)} />
        <label htmlFor="p">Payout (%)</label>
        <input id="p" inputMode="decimal" value={payout} onChange={(e) => setPayout(e.target.value)} />
        <div style={{ height: 10 }} />
        <button className="btn ghost" type="submit">
          Salvar ativo
        </button>
        {settings.assets.length > 0 && (
          <ul className="clean" style={{ marginTop: 12 }}>
            {settings.assets.map((a) => (
              <li key={a.asset} className="row">
                <div>
                  <strong>{a.asset}</strong>
                  <div className="muted">
                    {a.expirations.join(", ") || "sem expirações"} · {a.payoutPct == null ? "payout não informado" : `${a.payoutPct}%`}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn danger small"
                  style={{ flex: "0 0 auto" }}
                  onClick={() => persist({ ...settings, assets: settings.assets.filter((x) => x.asset !== a.asset) }, "Ativo removido.")}
                >
                  remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      {saved && <div className="alert">{saved}</div>}

      <div className="card">
        <h2>Dados deste aparelho</h2>
        <p className="muted">Até o login com Supabase ser ligado, análises e simulações ficam só neste navegador.</p>
        <button
          className="btn danger"
          onClick={() => {
            if (window.confirm("Apagar análises, simulações e ajustes deste aparelho?")) {
              store.clearAll();
              setSettings(store.settings());
              setSaved("Dados apagados.");
            }
          }}
        >
          Apagar todos os dados locais
        </button>
      </div>
    </main>
  );
}

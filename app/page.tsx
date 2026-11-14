"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { store, type Analysis } from "@/lib/storage";
import { summarize, type Summary } from "@/lib/stats";

interface Status {
  analysis_ready: boolean;
  vision_key: boolean;
  access_code: boolean;
  supabase: boolean;
  provider: string | null;
  model: string | null;
}

export default function Home() {
  const [status, setStatus] = useState<Status | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [hasCode, setHasCode] = useState(false);

  useEffect(() => {
    setAnalyses(store.analyses());
    setSummary(summarize(store.simulations()));
    setHasCode(Boolean(store.settings().accessCode));
    fetch("/api/status", { cache: "no-store" })
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatusError(true));
  }, []);

  const counts = { COMPRA: 0, VENDA: 0, NEUTRO: 0 };
  analyses.forEach((a) => (counts[a.decision.signal] += 1));

  return (
    <main>
      <h1>Painel</h1>

      {statusError && <div className="alert err">Não foi possível consultar o servidor.</div>}
      {status && !status.analysis_ready && (
        <div className="alert">
          A análise ainda não está ligada no servidor.{" "}
          {!status.vision_key && "Falta a chave do Gemini (GEMINI_API_KEY). "}
          {!status.access_code && "Falta o código de acesso (APP_ACCESS_CODE). "}
          Configure em Vercel → Settings → Environment Variables e publique de novo.
        </div>
      )}
      {status?.analysis_ready && !hasCode && (
        <div className="alert">
          Digite o código de acesso em <Link href="/ajustes">Ajustes</Link> para poder analisar.
        </div>
      )}

      <Link href="/analise" className="btn" style={{ marginBottom: 14 }}>
        Analisar gráfico
      </Link>

      <div className="grid2" style={{ marginBottom: 14 }}>
        <div className="stat">
          <b>{analyses.length}</b>
          <span>análises</span>
        </div>
        <div className="stat">
          <b>
            {counts.COMPRA} / {counts.VENDA} / {counts.NEUTRO}
          </b>
          <span>compra / venda / neutro</span>
        </div>
        <div className="stat">
          <b>{summary?.winRate == null ? "—" : `${Math.round(summary.winRate * 100)}%`}</b>
          <span>acerto na simulação</span>
        </div>
        <div className="stat">
          <b>{summary ? summary.net.toFixed(2) : "—"}</b>
          <span>resultado simulado</span>
        </div>
      </div>

      <div className="card">
        <h2>Últimas análises</h2>
        {analyses.length === 0 ? (
          <p className="muted">Nenhuma análise ainda. Envie a captura de um gráfico para começar.</p>
        ) : (
          <ul className="clean">
            {analyses.slice(0, 5).map((a) => (
              <li key={a.id} className="row">
                {a.thumbnail ? <img className="thumb" src={a.thumbnail} alt="" /> : <span className="thumb" />}
                <div>
                  <span className={`tag ${a.decision.signal}`}>{a.decision.signal}</span>{" "}
                  {a.reading.asset ?? "Ativo não identificado"}
                  <div className="muted">{new Date(a.createdAt).toLocaleString("pt-BR")}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Situação</h2>
        <ul className="clean">
          <li>Modo: simulação, sem operações reais</li>
          <li>Leitura por imagem: {status ? (status.analysis_ready ? `ligada (${status.model})` : "desligada") : "…"}</li>
          <li>Login e banco (Supabase): {status ? (status.supabase ? "configurado" : "ainda não; dados ficam neste aparelho") : "…"}</li>
        </ul>
      </div>
    </main>
  );
}

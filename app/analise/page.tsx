"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SignalCard from "@/components/SignalCard";
import { prepareImage, type PreparedImage } from "@/lib/image";
import { newId, store, type Analysis } from "@/lib/storage";
import type { Decision, VisionReading } from "@/lib/vision";

interface Result {
  model: string;
  elapsed_ms: number;
  reading: VisionReading;
  decision: Decision;
}

export default function AnalisePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [hasCode, setHasCode] = useState(true);

  useEffect(() => setHasCode(Boolean(store.settings().accessCode)), []);

  async function onFile(file: File | undefined) {
    setError(null);
    setResult(null);
    setSavedId(null);
    if (!file) return;
    try {
      setImage(await prepareImage(file));
    } catch (e) {
      setImage(null);
      setError(e instanceof Error ? e.message : "Não foi possível ler a imagem.");
    }
  }

  async function analyze() {
    if (!image) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json", "x-access-code": store.settings().accessCode },
        body: JSON.stringify({ image_base64: image.dataUrl, mime_type: image.mimeType, note }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<Result> & { error?: string };
      if (!res.ok || !data.reading || !data.decision) {
        throw new Error(data.error ?? `O servidor respondeu ${res.status}.`);
      }
      const r = data as Result;
      setResult(r);
      const analysis: Analysis = {
        id: newId(),
        createdAt: new Date().toISOString(),
        model: r.model,
        reading: r.reading,
        decision: r.decision,
        thumbnail: image.thumbnail,
      };
      if (store.addAnalysis(analysis)) setSavedId(analysis.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na análise.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Analisar gráfico</h1>
      <p className="muted">Envie a captura de tela do gráfico de velas. A imagem é reduzida no aparelho e não fica guardada no servidor.</p>

      {!hasCode && (
        <div className="alert">
          Falta o código de acesso. Digite em <Link href="/ajustes">Ajustes</Link>.
        </div>
      )}

      <div
        className="drop card"
        role="button"
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
      >
        {image ? (
          <img src={image.dataUrl} alt="Gráfico selecionado" />
        ) : (
          <>
            <strong>Toque para escolher a imagem</strong>
            <span className="muted">PNG, JPEG ou WEBP</span>
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />

      <label htmlFor="note">Observação (opcional)</label>
      <textarea id="note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: ativo EUR/USD OTC, velas de 1 minuto" />

      <div style={{ height: 12 }} />
      <button className="btn" onClick={analyze} disabled={!image || busy}>
        {busy ? (
          <>
            <span className="spin" /> Analisando…
          </>
        ) : (
          "Analisar"
        )}
      </button>

      {error && (
        <div className="alert err" style={{ marginTop: 14 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 18 }}>
          <SignalCard reading={result.reading} decision={result.decision} />
          <p className="muted">
            Modelo {result.model} · {(result.elapsed_ms / 1000).toFixed(1)} s{savedId ? " · salvo no histórico" : " · não foi possível salvar no histórico"}
          </p>
          {result.decision.signal !== "NEUTRO" && savedId && (
            <Link className="btn ghost" href={`/simulacao?analise=${savedId}`}>
              Registrar na simulação
            </Link>
          )}
        </div>
      )}
    </main>
  );
}

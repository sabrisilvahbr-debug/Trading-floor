import type { Decision, VisionReading } from "@/lib/vision";

export default function SignalCard({ reading, decision }: { reading: VisionReading; decision: Decision }) {
  return (
    <>
      <div className={`signal ${decision.signal}`} role="status">
        <b>{decision.signal}</b>
        <span className="muted">
          {[reading.asset, reading.timeframe].filter(Boolean).join(" · ") || "Ativo não identificado"} · confiança{" "}
          {Math.round(reading.confidence * 100)}%
        </span>
      </div>

      <div className="card">
        <h2>Por que este resultado</h2>
        <ul className="clean">
          {decision.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        {decision.signal === "NEUTRO" && reading.suggested !== "NEUTRO" && (
          <p className="muted" style={{ marginTop: 8 }}>
            A leitura sugeriu {reading.suggested}, mas o validador não confirmou.
          </p>
        )}
      </div>

      <div className="card">
        <h2>Critérios lidos</h2>
        {reading.criteria.length === 0 ? (
          <p className="muted">Nenhum critério identificado.</p>
        ) : (
          <ul className="clean">
            {reading.criteria.map((c, i) => (
              <li key={`${c.name}-${i}`}>
                <span className={`tag ${c.direction}`}>{c.direction}</span> <strong>{c.name}</strong>
                {c.evidence && <div className="muted">{c.evidence}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Leitura</h2>
        <p>{reading.summary || "Sem resumo."}</p>
        <p className="muted">
          Tendência: {reading.trend}
          {reading.patterns.length > 0 && <> · Padrões: {reading.patterns.join(", ")}</>}
        </p>
        {reading.warnings.length > 0 && (
          <div className="alert" style={{ marginTop: 8, marginBottom: 0 }}>
            {reading.warnings.join(" · ")}
          </div>
        )}
      </div>
    </>
  );
}

// Cálculos da simulação (paper trading de opções binárias). Funções puras.

export type Outcome = "pendente" | "acerto" | "erro" | "empate";

export interface Simulation {
  id: string;
  createdAt: string;
  analysisId: string | null;
  asset: string;
  direction: "COMPRA" | "VENDA";
  /** Expiração digitada pelo usuário, como aparece na plataforma. Sem valor padrão. */
  expiration: string;
  /** Payout em % digitado pelo usuário. Sem valor padrão. */
  payoutPct: number;
  stake: number;
  outcome: Outcome;
}

/** Taxa de acerto mínima para empatar com um payout: 1 / (1 + payout). */
export function breakEven(payoutPct: number): number {
  if (!Number.isFinite(payoutPct) || payoutPct <= 0) throw new RangeError("payout deve ser maior que zero");
  return 1 / (1 + payoutPct / 100);
}

/** Resultado em dinheiro simulado de uma operação. */
export function profit(sim: Pick<Simulation, "stake" | "payoutPct" | "outcome">): number {
  if (sim.outcome === "acerto") return round2((sim.stake * sim.payoutPct) / 100);
  if (sim.outcome === "erro") return -sim.stake;
  return 0;
}

export interface Summary {
  total: number;
  closed: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number | null;
  net: number;
  avgBreakEven: number | null;
}

export function summarize(sims: readonly Simulation[]): Summary {
  const closed = sims.filter((s) => s.outcome !== "pendente");
  const wins = closed.filter((s) => s.outcome === "acerto").length;
  const losses = closed.filter((s) => s.outcome === "erro").length;
  const ties = closed.filter((s) => s.outcome === "empate").length;
  const decided = wins + losses;
  const valid = closed.filter((s) => s.payoutPct > 0);
  return {
    total: sims.length,
    closed: closed.length,
    wins,
    losses,
    ties,
    winRate: decided > 0 ? wins / decided : null,
    net: round2(closed.reduce((acc, s) => acc + profit(s), 0)),
    avgBreakEven: valid.length ? valid.reduce((acc, s) => acc + breakEven(s.payoutPct), 0) / valid.length : null,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

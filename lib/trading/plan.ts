// Porta de trader-exit/exit.py (compute): stop e alvo em centavos exatos, só compra.

export class PlanError extends Error {}

export type StopRule = "or_mid" | "or_low" | "price" | "pct";

export interface PlanInput {
  symbol: string;
  entry: number;
  stopRule: StopRule;
  stopParam?: number; // preço (price) ou % (pct)
  targetR?: number; // alvo em múltiplos de R (padrão 2)
  targetPrice?: number; // ou um preço
  orHigh?: number | null;
  orLow?: number | null;
}

export interface Plan {
  symbol: string;
  entry: number;
  stop: number;
  stopLabel: string;
  target: number;
  targetLabel: string;
  risk: number;
  rewardRisk: number;
}

const MIN_RISK_PCT = 0.05;
const cents = (x: number) => Math.round(x * 100);
const floorCents = (x: number) => Math.floor(x * 100 + 1e-9);

export function computePlan(p: PlanInput): Plan {
  const e = cents(p.entry);
  if (!(e > 0)) throw new PlanError("A entrada precisa ser maior que zero.");
  let raw: number;
  let label: string;
  if (p.stopRule === "or_mid" || p.stopRule === "or_low") {
    if (p.orHigh == null || p.orLow == null) throw new PlanError("Esse stop precisa do opening range (máxima e mínima).");
    const oh = cents(p.orHigh);
    const ol = cents(p.orLow);
    if (oh <= ol) throw new PlanError("A máxima do opening range precisa ser maior que a mínima.");
    raw = p.stopRule === "or_mid" ? (oh + ol) / 2 / 100 : ol / 100;
    label = p.stopRule === "or_mid" ? "meio do opening range" : "mínima do opening range";
  } else if (p.stopRule === "price") {
    if (!(p.stopParam! > 0)) throw new PlanError("Informe o preço do stop.");
    raw = p.stopParam!;
    label = "seu preço";
  } else {
    if (!(p.stopParam! > 0 && p.stopParam! < 100)) throw new PlanError("Informe o % do stop (entre 0 e 100).");
    raw = (e / 100) * (1 - p.stopParam! / 100);
    label = `${p.stopParam}% abaixo da entrada`;
  }
  const stop = floorCents(raw);
  if (stop >= e) throw new PlanError(`O stop ${(stop / 100).toFixed(2)} (${label}) não está abaixo da entrada ${(e / 100).toFixed(2)}.`);
  if (stop <= 0) throw new PlanError("O stop ficou em zero ou abaixo.");
  const risk = e - stop;
  const floorRisk = (e * MIN_RISK_PCT) / 100;
  if (risk < floorRisk) {
    throw new PlanError(`O stop está só ${(risk / 100).toFixed(2)} abaixo da entrada, menos de 0,05% do preço: apertado demais para o spread. Afaste o stop.`);
  }
  let target: number;
  let tLabel: string;
  if (p.targetPrice != null && p.targetPrice > 0) {
    target = cents(p.targetPrice);
    tLabel = "seu preço";
  } else {
    const r = p.targetR && p.targetR > 0 ? p.targetR : 2;
    target = Math.round(e + r * risk);
    tLabel = `${r}R`;
  }
  if (target <= e) throw new PlanError("O alvo precisa ficar acima da entrada.");
  return {
    symbol: p.symbol,
    entry: e / 100,
    stop: stop / 100,
    stopLabel: label,
    target: target / 100,
    targetLabel: tLabel,
    risk: risk / 100,
    rewardRisk: Math.round(((target - e) / risk) * 100) / 100,
  };
}

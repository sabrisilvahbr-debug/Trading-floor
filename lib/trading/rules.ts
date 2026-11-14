// Porta de trader-budget/size.py (size_trade) e das regras de dia de trader-risk/check.py.
// Só modo paper: nada é enviado a corretora.
import { marketStatus, parseClock } from "../market/time";

export interface Rules {
  budget: number;
  cashBufferPct: number;
  maxPositionPct: number;
  maxOrderUsd: number;
  minOrderUsd: number;
  maxLossPerTradeUsd: number;
  maxDailyLossUsd: number;
  maxTradesPerDay: number;
  minRewardRisk: number;
  noEntriesBefore: string;
  noEntriesAfter: string;
  flatBy: string;
  blocked: string[];
}

/** Valores padrão do trader/config.json instalado com as skills (modo paper). */
export const DEFAULT_RULES: Rules = {
  budget: 5000,
  cashBufferPct: 10,
  maxPositionPct: 75,
  maxOrderUsd: 4000,
  minOrderUsd: 5,
  maxLossPerTradeUsd: 50,
  maxDailyLossUsd: 150,
  maxTradesPerDay: 3,
  minRewardRisk: 1,
  noEntriesBefore: "09:45",
  noEntriesAfter: "15:30",
  flatBy: "15:55",
  blocked: [],
};

const r2 = (x: number) => Math.round(x * 100) / 100;
const sharesFor = (usd: number, per: number) => (per > 0 ? Math.max(0, Math.floor(usd / per + 1e-9)) : 0);

export interface Sizing {
  qty: number;
  boundBy: string;
  limits: { name: string; usd: number; shares: number; how: string }[];
  cost: number;
  maxLoss: number;
  riskPerShare: number;
  rewardRisk: number;
  refusal: string | null;
}

export function sizeTrade(symbol: string, entry: number, stop: number, target: number, rules: Rules): Sizing {
  if (!(stop < entry)) throw new Error("O stop precisa ficar abaixo da entrada.");
  if (!(target > entry)) throw new Error("O alvo precisa ficar acima da entrada.");
  if (rules.blocked.map((b) => b.toUpperCase()).includes(symbol.toUpperCase())) throw new Error(`${symbol} está na sua lista de bloqueados.`);
  if (!(rules.budget > 0)) throw new Error("Defina o orçamento em Ajustes.");
  const riskC = Math.round((entry - stop) * 100);
  const rewardC = Math.round((target - entry) * 100);
  const risk = riskC / 100;
  const cashBuffer = r2((rules.budget * rules.cashBufferPct) / 100);
  const available = Math.max(r2(rules.budget - cashBuffer), 0);
  const limits: Sizing["limits"] = [];
  if (rules.maxLossPerTradeUsd) limits.push({ name: "perda máxima", usd: rules.maxLossPerTradeUsd, shares: sharesFor(rules.maxLossPerTradeUsd, risk), how: `US$ ${rules.maxLossPerTradeUsd} ÷ US$ ${risk.toFixed(2)} de risco por ação` });
  if (rules.maxPositionPct) {
    const cap = r2((rules.budget * rules.maxPositionPct) / 100);
    limits.push({ name: "limite da posição", usd: cap, shares: sharesFor(cap, entry), how: `${rules.maxPositionPct}% de US$ ${rules.budget} = US$ ${cap} ÷ US$ ${entry.toFixed(2)}` });
  }
  if (rules.maxOrderUsd) limits.push({ name: "ordem máxima", usd: rules.maxOrderUsd, shares: sharesFor(rules.maxOrderUsd, entry), how: `US$ ${rules.maxOrderUsd} ÷ US$ ${entry.toFixed(2)}` });
  limits.push({ name: "caixa", usd: available, shares: sharesFor(available, entry), how: `orçamento menos ${rules.cashBufferPct}% de reserva = US$ ${available} ÷ US$ ${entry.toFixed(2)}` });
  const qty = Math.min(...limits.map((l) => l.shares));
  const boundBy = limits.find((l) => l.shares === qty)!.name;
  const cost = r2(qty * entry);
  const maxLoss = r2((qty * riskC) / 100);
  let refusal: string | null = null;
  if (qty === 0) {
    refusal = boundBy === "perda máxima"
      ? `Uma ação arrisca US$ ${risk.toFixed(2)}, mais que sua perda máxima de US$ ${rules.maxLossPerTradeUsd} por trade. Sem ordem: pule o trade ou use um stop mais perto.`
      : `Uma ação de ${symbol} custa US$ ${entry.toFixed(2)}, mais que o limite "${boundBy}". Sem ordem.`;
  } else if (rules.minRewardRisk && rewardC < rules.minRewardRisk * riskC - 1e-9) {
    refusal = `Retorno/risco ${(rewardC / riskC).toFixed(2)} abaixo do seu mínimo ${rules.minRewardRisk}. Sem ordem.`;
  } else if (cost < rules.minOrderUsd - 0.005) {
    refusal = `${qty} ação(ões) somam US$ ${cost}, abaixo da ordem mínima de US$ ${rules.minOrderUsd}.`;
  }
  return { qty, boundBy, limits, cost, maxLoss, riskPerShare: risk, rewardRisk: Math.round((rewardC / riskC) * 100) / 100, refusal };
}

export interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

export interface TodayStats {
  trades: number;
  riskOpen: number; // soma da perda máxima dos trades de hoje
}

/** Checagem de risco (subconjunto de trader-risk para compra no dia, paper). PASS só se tudo passar. */
export function riskCheck(sizing: Sizing, rules: Rules, today: TodayStats, nowSeconds = Date.now() / 1000) {
  const m = marketStatus(nowSeconds);
  const nowMin = parseClock(m.nyTime) ?? 0;
  const before = parseClock(rules.noEntriesBefore) ?? 0;
  const after = parseClock(rules.noEntriesAfter) ?? 24 * 60;
  const checks: Check[] = [
    { name: "Stop definido", pass: sizing.riskPerShare > 0, detail: `risco de US$ ${sizing.riskPerShare.toFixed(2)} por ação` },
    { name: "Quantidade", pass: sizing.qty > 0 && !sizing.refusal, detail: sizing.refusal ?? `${sizing.qty} ações (limitado por ${sizing.boundBy})` },
    { name: "Perda máxima por trade", pass: sizing.maxLoss <= rules.maxLossPerTradeUsd + 0.005, detail: `US$ ${sizing.maxLoss} de US$ ${rules.maxLossPerTradeUsd}` },
    { name: "Retorno/risco mínimo", pass: sizing.rewardRisk >= rules.minRewardRisk - 1e-9, detail: `${sizing.rewardRisk} (mínimo ${rules.minRewardRisk})` },
    { name: "Ordem máxima", pass: sizing.cost <= rules.maxOrderUsd + 0.005, detail: `US$ ${sizing.cost} de US$ ${rules.maxOrderUsd}` },
    { name: "Perda máxima do dia", pass: today.riskOpen + sizing.maxLoss <= rules.maxDailyLossUsd + 0.005, detail: `US$ ${r2(today.riskOpen + sizing.maxLoss)} somando hoje, de US$ ${rules.maxDailyLossUsd}` },
    { name: "Trades por dia", pass: today.trades + 1 <= rules.maxTradesPerDay, detail: `${today.trades + 1} de ${rules.maxTradesPerDay}` },
    { name: "Pregão aberto", pass: m.open, detail: `${m.reason} (Nova York ${m.nyTime})` },
    { name: "Janela de entrada", pass: m.open && nowMin >= before && nowMin < after, detail: `entradas entre ${rules.noEntriesBefore} e ${rules.noEntriesAfter} de Nova York` },
  ];
  return { verdict: checks.every((c) => c.pass) ? ("PASS" as const) : ("BLOCK" as const), checks };
}

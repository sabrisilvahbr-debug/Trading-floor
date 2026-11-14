// Porta de trader-timemachine/timemachine.py: Monte Carlo a partir das barras de 5 min
// dos últimos 60 dias da própria ação, mais o replay da regra em cada pregão passado.
// O gerador aleatório é outro (mulberry32), então os números não batem dígito a dígito
// com a skill em Python; a regra é a mesma. Mesma semente, mesmos números.
import { NYSE_EARLY_CLOSE, CLOSE_MIN, EARLY_CLOSE_MIN, OPEN_MIN, clock, ny } from "../market/time";
import type { Series } from "../market/fetch";

export const SESSION_BARS = 78;
export const MIN_SESSIONS = 20;
const COIN_FLIP = 0.05;
const STRONG = 0.15;
const MANY_NEITHER = 0.4;

export class TMError extends Error {}

interface B {
  o: number;
  h: number;
  l: number;
  c: number;
}

export function parseBars(s: Series, nowSeconds: number) {
  const rmt = typeof s.meta.regularMarketTime === "number" ? (s.meta.regularMarketTime as number) : nowSeconds;
  const asOf = Math.min(nowSeconds, rmt);
  const days = new Map<string, Map<number, B>>();
  s.t.forEach((ts, i) => {
    const o = s.o[i], h = s.h[i], l = s.l[i], c = s.c[i];
    if (o == null || h == null || l == null || c == null || ts % 300) return;
    const t = ny(ts);
    const mins = t.minutes - OPEN_MIN;
    if (mins < 0 || mins >= SESSION_BARS * 5) return;
    if (ts + 300 > asOf) return;
    if (!days.has(t.date)) days.set(t.date, new Map());
    days.get(t.date)!.set(mins / 5, { o, h, l, c });
  });
  return days;
}

export function fullSessions(days: Map<string, Map<number, B>>, before: string) {
  const full: { date: string; bars: B[] }[] = [];
  let short = 0;
  for (const d of [...days.keys()].sort()) {
    if (d >= before) continue;
    const m = days.get(d)!;
    if (m.size === SESSION_BARS) full.push({ date: d, bars: Array.from({ length: SESSION_BARS }, (_, i) => m.get(i)!) });
    else short++;
  }
  return { full, short };
}

export function buildPool(sessions: { bars: B[] }[]): [number, number, number, number][][] {
  const pool: [number, number, number, number][][] = Array.from({ length: SESSION_BARS }, () => []);
  for (const { bars: D } of sessions) {
    for (let i = 1; i < SESSION_BARS; i++) {
      const pc = D[i - 1].c;
      pool[i].push([D[i].o / pc, D[i].h / pc, D[i].l / pc, D[i].c / pc]);
    }
  }
  return pool;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pct = (a: number[], q: number) => a[Math.min(a.length - 1, Math.floor(q * a.length))];

export interface MC {
  replays: number;
  barsLeft: number;
  pTarget: number;
  pStop: number;
  pNeither: number;
  pGreen: number;
  medianClose: number;
  p5Close: number;
  p95Close: number;
  avgR: number;
  rAtTarget: number;
  until: string;
}

export function simulate(pool: ReturnType<typeof buildPool>, entry: number, stop: number, target: number, k: number, last: number, replays = 10000, seed = 19, window = 2) {
  const risk = entry - stop;
  const rTarget = Math.round(((target - entry) / risk) * 10000) / 10000;
  const rnd = mulberry32(seed);
  const randint = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  const slot = (i: number) => (window === 0 ? i : Math.min(SESSION_BARS - 1, Math.max(1, i + randint(-window, window))));
  let nT = 0, nS = 0, nC = 0, green = 0, sumR = 0;
  const closes: number[] = [];
  for (let n = 0; n < replays; n++) {
    let p = entry;
    let outcome: "target" | "stop" | null = null;
    for (let i = k + 1; i <= last; i++) {
      const bucket = pool[slot(i)];
      const [, h, l, c] = bucket[Math.floor(rnd() * bucket.length)];
      if (outcome === null) {
        if (p * l <= stop) outcome = "stop";
        else if (p * h >= target) outcome = "target";
      }
      p = p * c;
    }
    closes.push(p);
    if (outcome === "target") {
      nT++;
      green++;
      sumR += rTarget;
    } else if (outcome === "stop") {
      nS++;
      sumR += -1;
    } else {
      nC++;
      if (p > entry) green++;
      sumR += (p - entry) / risk;
    }
  }
  closes.sort((a, b) => a - b);
  const r4 = (x: number) => Math.round(x * 10000) / 10000;
  return {
    replays,
    barsLeft: last - k,
    pTarget: r4(nT / replays),
    pStop: r4(nS / replays),
    pNeither: r4(nC / replays),
    pGreen: r4(green / replays),
    medianClose: round2(pct(closes, 0.5)),
    p5Close: round2(pct(closes, 0.05)),
    p95Close: round2(pct(closes, 0.95)),
    avgR: Math.round((sumR / replays) * 1000) / 1000,
    rAtTarget: rTarget,
  };
}

export function historyReplay(sessions: { date: string; bars: B[] }[], orMinutes: number, targetR: number, stopRule: "or_mid" | "or_low", last: number) {
  const n = orMinutes / 5;
  const trades: { date: string; time: string; entry: number; stop: number; target: number; outcome: string; R: number }[] = [];
  for (const { date, bars: D } of sessions) {
    const rng = D.slice(0, n);
    const oh = Math.max(...rng.map((b) => b.h));
    const ol = Math.min(...rng.map((b) => b.l));
    let kk: number | null = null;
    for (let i = n; i <= last; i++) if (D[i].c > oh) { kk = i; break; }
    if (kk === null) continue;
    const e = round2(D[kk].c);
    const s = Math.floor((stopRule === "or_mid" ? (oh + ol) / 2 : ol) * 100 + 1e-9) / 100;
    const risk = e - s;
    if (risk <= 0) continue;
    const t = round2(e + targetR * risk);
    let oc: string | null = null;
    for (const b of D.slice(kk + 1, last + 1)) {
      if (b.l <= s) { oc = "stop"; break; }
      if (b.h >= t) { oc = "target"; break; }
    }
    const cl = D[last].c;
    const R = oc === "target" ? (t - e) / risk : oc === "stop" ? -1 : (cl - e) / risk;
    trades.push({ date, time: clock(OPEN_MIN + 5 * (kk + 1)), entry: e, stop: s, target: t, outcome: oc ?? "close", R: Math.round(R * 100) / 100 });
  }
  const avg = trades.length ? trades.reduce((a, x) => a + x.R, 0) / trades.length : null;
  return {
    sessions: sessions.length,
    triggered: trades.length,
    target: trades.filter((x) => x.outcome === "target").length,
    stop: trades.filter((x) => x.outcome === "stop").length,
    close: trades.filter((x) => x.outcome === "close").length,
    green: trades.filter((x) => x.R > 0).length,
    avgR: avg === null ? null : Math.round(avg * 1000) / 1000,
    trades: trades.slice(-15),
  };
}

export function verdict(mc: { pTarget: number; pStop: number; pNeither: number; avgR: number; rAtTarget: number }, until: string) {
  const { pTarget: pt, pStop: ps } = mc;
  const notes: string[] = [];
  if (pt + ps <= 0) return { headline: `Nenhuma simulação chegou ao alvo nem ao stop até ${until}: o preço de ${until} decide todas.`, notes, lean: null };
  const r = mc.rAtTarget || 1;
  const share = pt / (pt + ps);
  const even = 1 / (1 + r);
  const d = share - even;
  const oneR = Math.abs(r - 1) < 0.005;
  let head: string;
  if (Math.abs(d) < COIN_FLIP) head = oneR ? "Perto de cara ou coroa" : "Perto do empate";
  else if (Math.abs(d) < STRONG) head = d > 0 ? "Inclina para o alvo" : "Inclina para o stop";
  else head = d > 0 ? "Fortemente para o alvo" : "Fortemente para o stop";
  const odds = `alvo primeiro ${(100 * pt).toFixed(1)}% contra stop primeiro ${(100 * ps).toFixed(1)}%`;
  const headline = oneR
    ? `${head}: ${odds}.`
    : `${head}: a ${round2(r)}R o alvo precisa vir primeiro em ${Math.round(100 * even)}% das simulações que tocam um dos lados; veio em ${Math.round(100 * share)}% (${odds}).`;
  if (mc.pNeither > MANY_NEITHER) notes.push(`${(100 * mc.pNeither).toFixed(1)}% das simulações não tocaram nenhum dos dois até ${until}.`);
  if (Math.abs(d) >= COIN_FLIP && mc.avgR !== 0 && mc.avgR > 0 !== d > 0) {
    notes.push(`Mesmo assim o R médio é ${mc.avgR > 0 ? "+" : ""}${mc.avgR.toFixed(3)}: as simulações que não tocaram nada puxam para o outro lado.`);
  }
  return { headline, notes, lean: d };
}

export interface TMInput {
  entry: number;
  stop: number;
  target: number;
  entryTime: string; // HH:MM, fechamento do candle de entrada
  date: string; // YYYY-MM-DD (pregões usados: anteriores a esta data)
  orMinutes?: number;
  stopRule?: "or_mid" | "or_low" | null;
  targetR?: number;
  until?: string | null;
}

export function timeMachine(s: Series, nowSeconds: number, p: TMInput) {
  if (!(p.stop < p.entry && p.target > p.entry)) throw new TMError("Só compra: o stop precisa ficar abaixo da entrada e o alvo acima.");
  const em = Number(p.entryTime.slice(0, 2)) * 60 + Number(p.entryTime.slice(3, 5));
  if (!/^\d{2}:\d{2}$/.test(p.entryTime) || (em - OPEN_MIN) % 5 || em <= OPEN_MIN) throw new TMError("O horário da entrada precisa ser o fechamento de um candle de 5 min (ex.: 09:50).");
  const k = (em - OPEN_MIN) / 5 - 1;
  const endMin = NYSE_EARLY_CLOSE[p.date] ? EARLY_CLOSE_MIN : CLOSE_MIN;
  const untilMin = p.until ? Number(p.until.slice(0, 2)) * 60 + Number(p.until.slice(3, 5)) : endMin;
  if ((untilMin - OPEN_MIN) % 5 || untilMin > endMin) throw new TMError(`O horário final precisa estar na grade de 5 min e até ${clock(endMin)}.`);
  const last = (untilMin - OPEN_MIN) / 5 - 1;
  if (last <= k) throw new TMError("Não sobra nenhum candle entre a entrada e o horário final.");
  const gran = s.meta.dataGranularity;
  if (gran && gran !== "5m") throw new TMError(`Os dados vieram em ${String(gran)}; a simulação precisa de candles de 5 min.`);
  const days = parseBars(s, nowSeconds);
  const { full, short } = fullSessions(days, p.date);
  if (full.length < MIN_SESSIONS) throw new TMError(`Só ${full.length} pregões completos antes de ${p.date}; são necessários pelo menos ${MIN_SESSIONS}.`);
  const pool = buildPool(full);
  const mc = { ...simulate(pool, p.entry, p.stop, p.target, k, last), until: clock(untilMin) };
  const history = p.stopRule ? historyReplay(full, p.orMinutes ?? 15, p.targetR ?? 2, p.stopRule, last) : null;
  return {
    mc,
    history,
    verdict: verdict(mc, clock(untilMin)),
    pool: { sessions: full.length, from: full[0].date, to: full[full.length - 1].date, shortLeftOut: short },
    note: `Simulação feita com os últimos ${full.length} pregões completos da própria ação. Não é previsão: balanços, notícias e paralisações podem fazer o que esses pregões nunca fizeram.`,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

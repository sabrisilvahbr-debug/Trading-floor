// Porta de trader-scanner/scan.py (rsi, daily_closes, find_setups) e trader-entry (opening range).
import { ny, session } from "../market/time";
import type { Series } from "../market/fetch";

export const MIN_DAILY_BARS = 30;
export const BAR_MIN = 5;

/** RSI de Wilder sobre fechamentos, igual ao scan.py. */
export function rsi(closes: readonly number[], n = 14): number | null {
  if (closes.length < n + 1) return null;
  const g: number[] = [];
  const lo: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    g.push(Math.max(0, closes[i] - closes[i - 1]));
    lo.push(Math.max(0, closes[i - 1] - closes[i]));
  }
  let ag = g.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let al = lo.slice(0, n).reduce((a, b) => a + b, 0) / n;
  for (let i = n; i < g.length; i++) {
    ag = (ag * (n - 1) + g[i]) / n;
    al = (al * (n - 1) + lo[i]) / n;
  }
  return al ? 100 - 100 / (1 + ag / al) : 100;
}

/** Fechamentos diários COMPLETOS: hoje só entra depois do fechamento. */
export function dailyCloses(s: Series, nowSeconds: number): { date: string; close: number }[] {
  const now = ny(nowSeconds);
  const sess = session(now.date);
  const todayDone = !sess || now.minutes >= sess.close;
  const out = new Map<string, number>();
  s.t.forEach((ts, i) => {
    const c = s.c[i];
    if (c == null) return;
    const d = ny(ts).date;
    if (d > now.date || (d === now.date && !todayDone)) return;
    out.set(d, c);
  });
  return [...out.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, close]) => ({ date, close }));
}

export type SetupKey = "breakout_20d" | "bull_flag" | "reclaim_ma20" | "oversold" | "oversold_bounce";

export const SETUP_LABELS: Record<SetupKey, string> = {
  breakout_20d: "Rompimento da máxima de 20 dias",
  bull_flag: "Bandeira de alta",
  reclaim_ma20: "Recuperou a média de 20 dias",
  oversold: "Sobrevendido (RSI < 30)",
  oversold_bounce: "Repique de sobrevenda",
};

export function findSetups(c: readonly number[]) {
  const last = c[c.length - 1];
  const hi20 = Math.max(...c.slice(-21, -1));
  const ma20 = c.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const ma20Prev = c.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
  const run = c[c.length - 6] / c[c.length - 16] - 1;
  const last5 = c.slice(-5);
  const rng5 = (Math.max(...last5) - Math.min(...last5)) / last;
  const r = rsi(c);
  const rPrev = rsi(c.slice(0, -1));
  const tags: SetupKey[] = [];
  if (last > hi20) tags.push("breakout_20d");
  if (run > 0.1 && rng5 < 0.05) tags.push("bull_flag");
  if (c[c.length - 2] < ma20Prev && last > ma20) tags.push("reclaim_ma20");
  if (r !== null && r < 30) tags.push("oversold");
  if (rPrev !== null && rPrev < 30 && last > c[c.length - 2]) tags.push("oversold_bounce");
  return { tags, rsi: r, high20: hi20, ma20, runPct: run * 100, range5Pct: rng5 * 100 };
}

export interface DailyScan {
  symbol: string;
  status: "ok" | "curto" | "erro";
  setups: SetupKey[];
  price: number | null;
  closeDate: string | null;
  rsi: number | null;
  high20: number | null;
  ma20: number | null;
  volume: number | null;
  error?: string;
}

export function scanDaily(symbol: string, s: Series, nowSeconds: number): DailyScan {
  const bars = dailyCloses(s, nowSeconds);
  const vol = typeof s.meta.regularMarketVolume === "number" ? (s.meta.regularMarketVolume as number) : null;
  if (bars.length < MIN_DAILY_BARS) {
    return { symbol, status: "curto", setups: [], price: bars.at(-1)?.close ?? null, closeDate: bars.at(-1)?.date ?? null, rsi: null, high20: null, ma20: null, volume: vol };
  }
  const closes = bars.map((b) => b.close);
  const f = findSetups(closes);
  return {
    symbol,
    status: "ok",
    setups: f.tags,
    price: round2(closes[closes.length - 1]),
    closeDate: bars[bars.length - 1].date,
    rsi: f.rsi === null ? null : Math.round(f.rsi * 10) / 10,
    high20: round2(f.high20),
    ma20: round2(f.ma20),
    volume: vol,
  };
}

// ------------------------------------------------------------- opening range (trader-entry)

export interface Bar {
  start: string; // HH:MM Nova York
  slot: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

/** Barras de 5 min do pregão de `date`, completas até agora, na grade, com preço. */
export function sessionBars(s: Series, date: string, nowSeconds: number): Bar[] {
  const sess = session(date);
  if (!sess) return [];
  const out = new Map<number, Bar>();
  s.t.forEach((ts, i) => {
    const o = s.o[i], h = s.h[i], l = s.l[i], c = s.c[i];
    if (o == null || h == null || l == null || c == null) return;
    const t = ny(ts);
    if (t.date !== date || t.second || t.minutes % BAR_MIN) return;
    if (t.minutes < sess.open || t.minutes >= sess.close) return;
    if (ts + BAR_MIN * 60 > nowSeconds) return;
    const slot = (t.minutes - sess.open) / BAR_MIN;
    out.set(slot, { start: t.hhmm, slot, o, h, l, c, v: s.v[i] ?? 0 });
  });
  return [...out.values()].sort((a, b) => a.slot - b.slot);
}

export interface OrbResult {
  status: "fechado" | "formando" | "aguardando" | "disparou" | "incompleto";
  date: string;
  orMinutes: number;
  orHigh: number | null;
  orLow: number | null;
  last: number | null;
  distancePct: number | null;
  trigger: { price: number; at: string; barStart: string; pctOver: number; volumeOk: boolean | null } | null;
  bars: Bar[];
  message: string;
}

/** Entrada no primeiro candle de 5 min que FECHA acima da máxima do opening range. Só compra. */
export function openingRange(s: Series, nowSeconds: number, orMinutes = 15, volumeMult = 0): OrbResult {
  const now = ny(nowSeconds);
  const date = now.date;
  const sess = session(date);
  const n = Math.round(orMinutes / BAR_MIN);
  const base = { date, orMinutes, orHigh: null, orLow: null, last: null, distancePct: null, trigger: null, bars: [] as Bar[] };
  if (!sess || now.minutes < sess.open) {
    return { ...base, status: "fechado", message: sess ? "O pregão de hoje ainda não abriu." : "Bolsa fechada hoje." };
  }
  const bars = sessionBars(s, date, nowSeconds);
  if (bars.length < n) {
    return { ...base, bars, status: "formando", message: `O opening range de ${orMinutes} min ainda está se formando (${bars.length}/${n} candles).` };
  }
  const contiguous = bars.slice(0, n).every((b, k) => b.slot === k);
  if (!contiguous) return { ...base, bars, status: "incompleto", message: "Faltam candles no início do pregão; o Yahoo não entregou o opening range completo." };
  const rng = bars.slice(0, n);
  const orHigh = Math.max(...rng.map((b) => b.h));
  const orLow = Math.min(...rng.map((b) => b.l));
  const avgVol = rng.reduce((a, b) => a + b.v, 0) / n;
  const last = bars[bars.length - 1].c;
  for (let k = n; k < bars.length; k++) {
    const b = bars[k];
    if (b.c > orHigh) {
      const closesAt = b.slot * BAR_MIN + sess.open + BAR_MIN;
      const hh = `${String(Math.floor(closesAt / 60)).padStart(2, "0")}:${String(closesAt % 60).padStart(2, "0")}`;
      return {
        ...base,
        bars,
        orHigh: round2(orHigh),
        orLow: round2(orLow),
        last: round2(last),
        distancePct: round2((last / orHigh - 1) * 100),
        status: "disparou",
        trigger: { price: round2(b.c), at: hh, barStart: b.start, pctOver: round2((b.c / orHigh - 1) * 100), volumeOk: volumeMult > 0 ? b.v >= volumeMult * avgVol : null },
        message: `Disparou às ${hh} (horário de Nova York): candle fechou a ${b.c.toFixed(2)}, acima da máxima ${orHigh.toFixed(2)}.`,
      };
    }
  }
  if (now.minutes >= sess.close) {
    return { ...base, bars, orHigh: round2(orHigh), orLow: round2(orLow), last: round2(last), distancePct: round2((last / orHigh - 1) * 100), status: "fechado", message: "O pregão terminou sem rompimento." };
  }
  return {
    ...base,
    bars,
    orHigh: round2(orHigh),
    orLow: round2(orLow),
    last: round2(last),
    distancePct: round2((last / orHigh - 1) * 100),
    status: "aguardando",
    message: `Aguardando: último fechamento ${last.toFixed(2)}, ${((orHigh / last - 1) * 100).toFixed(2)}% abaixo da máxima ${orHigh.toFixed(2)}.`,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

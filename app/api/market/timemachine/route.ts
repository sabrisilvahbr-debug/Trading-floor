import { guarded } from "@/lib/api";
import { cleanSymbol, yahooChart } from "@/lib/market/fetch";
import { ny } from "@/lib/market/time";
import { timeMachine } from "@/lib/trading/timemachine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 10.000 simulações do resto do pregão com os últimos 60 dias da ação (trader-timemachine). */
export async function POST(request: Request) {
  return guarded(request, async () => {
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const sym = cleanSymbol(b.symbol);
    const num = (k: string) => {
      const v = Number(b[k]);
      if (!Number.isFinite(v) || v <= 0) throw new Error(`Valor inválido em ${k}.`);
      return v;
    };
    const now = Date.now() / 1000;
    const s = await yahooChart(sym, "60d", "5m");
    const stopRule = b.stopRule === "or_mid" || b.stopRule === "or_low" ? b.stopRule : null;
    const r = timeMachine(s, now, {
      entry: num("entry"),
      stop: num("stop"),
      target: num("target"),
      entryTime: String(b.entryTime ?? ""),
      date: ny(now).date,
      orMinutes: Number(b.orMinutes) || 15,
      stopRule,
      targetR: Number(b.targetR) || 2,
      until: typeof b.until === "string" && b.until ? b.until : null,
    });
    return { symbol: sym, source: "Yahoo Finance, candles de 5 min, últimos 60 dias", ...r };
  });
}

import { guarded } from "@/lib/api";
import { cleanSymbol, yahooChart } from "@/lib/market/fetch";
import { marketStatus } from "@/lib/market/time";
import { openingRange } from "@/lib/trading/scanner";

export const dynamic = "force-dynamic";

/** Gatilho de entrada por rompimento do opening range (trader-entry). */
export async function GET(request: Request) {
  return guarded(request, async () => {
    const u = new URL(request.url);
    const sym = cleanSymbol(u.searchParams.get("symbol"));
    const orMinutes = Number(u.searchParams.get("or") ?? 15);
    if (![5, 10, 15, 30].includes(orMinutes)) throw new Error("Opening range deve ser 5, 10, 15 ou 30 minutos.");
    const vol = Number(u.searchParams.get("vol") ?? 0);
    const now = Date.now() / 1000;
    const s = await yahooChart(sym, "1d", "5m");
    const r = openingRange(s, now, orMinutes, Number.isFinite(vol) ? vol : 0);
    return { symbol: sym, market: marketStatus(now), source: "Yahoo Finance (cotação com atraso)", ...r, bars: r.bars.slice(-30) };
  });
}

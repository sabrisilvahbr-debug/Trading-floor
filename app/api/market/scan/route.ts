import { guarded } from "@/lib/api";
import { cleanSymbol, yahooChart } from "@/lib/market/fetch";
import { scanDaily, type DailyScan } from "@/lib/trading/scanner";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const MAX = 30;

/** Varredura diária (trader-scanner) de uma lista de tickers. */
export async function POST(request: Request) {
  return guarded(request, async () => {
    const body = (await request.json().catch(() => ({}))) as { symbols?: unknown };
    const list = Array.isArray(body.symbols) ? body.symbols : [];
    const symbols = [...new Set(list.map(cleanSymbol))];
    if (!symbols.length) throw new Error("Informe pelo menos um ticker.");
    if (symbols.length > MAX) throw new Error(`No máximo ${MAX} tickers por varredura.`);
    const now = Date.now() / 1000;
    const results: DailyScan[] = [];
    for (let i = 0; i < symbols.length; i += 5) {
      const chunk = symbols.slice(i, i + 5);
      const done = await Promise.all(
        chunk.map(async (sym) => {
          try {
            return scanDaily(sym, await yahooChart(sym, "3mo", "1d"), now);
          } catch (e) {
            return { symbol: sym, status: "erro", setups: [], price: null, closeDate: null, rsi: null, high20: null, ma20: null, volume: null, error: e instanceof Error ? e.message : String(e) } as DailyScan;
          }
        }),
      );
      results.push(...done);
    }
    results.sort((a, b) => b.setups.length - a.setups.length || (b.price ?? 0) * (b.volume ?? 0) - (a.price ?? 0) * (a.volume ?? 0));
    return { source: "Yahoo Finance (cotação com atraso)", at: new Date().toISOString(), results };
  });
}

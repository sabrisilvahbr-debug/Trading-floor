import { guarded } from "@/lib/api";
import { cleanSymbol, yahooChart } from "@/lib/market/fetch";
import { marketStatus } from "@/lib/market/time";

export const dynamic = "force-dynamic";

/** Último preço (atrasado) de até 20 tickers. */
export async function GET(request: Request) {
  return guarded(request, async () => {
    const u = new URL(request.url);
    const symbols = [...new Set((u.searchParams.get("symbols") ?? "").split(",").filter(Boolean).map(cleanSymbol))].slice(0, 20);
    if (!symbols.length) throw new Error("Informe os tickers.");
    const quotes = await Promise.all(
      symbols.map(async (sym) => {
        try {
          const s = await yahooChart(sym, "1d", "5m");
          const m = s.meta;
          const price = typeof m.regularMarketPrice === "number" ? m.regularMarketPrice : null;
          const prev = typeof m.chartPreviousClose === "number" ? m.chartPreviousClose : typeof m.previousClose === "number" ? m.previousClose : null;
          const time = typeof m.regularMarketTime === "number" ? new Date(m.regularMarketTime * 1000).toISOString() : null;
          return { symbol: sym, price, previousClose: prev, changePct: price != null && prev ? Math.round(((price / prev - 1) * 10000)) / 100 : null, time };
        } catch (e) {
          return { symbol: sym, error: e instanceof Error ? e.message : String(e) };
        }
      }),
    );
    return { market: marketStatus(), source: "Yahoo Finance (cotação com atraso)", quotes };
  });
}

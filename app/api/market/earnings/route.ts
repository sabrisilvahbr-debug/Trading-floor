import { guarded } from "@/lib/api";
import { cikFor, cleanSymbol, secCompanyFacts } from "@/lib/market/fetch";
import { analyse } from "@/lib/research/analyst";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Resultados trimestrais pela SEC (trader-analyst). */
export async function GET(request: Request) {
  return guarded(request, async () => {
    const sym = cleanSymbol(new URL(request.url).searchParams.get("symbol"));
    const { cik, title } = await cikFor(sym);
    const r = analyse(await secCompanyFacts(cik), 6);
    return { symbol: sym, cik, company: r.entity ?? title, source: "SEC EDGAR, XBRL company facts (10-Q e 10-K)", rows: r.rows, ttm: r.ttm };
  });
}

import { guarded } from "@/lib/api";
import { cikFor, cleanSymbol, secSubmissions, yahooRss } from "@/lib/market/fetch";
import { parseRss, parseSubmissions, type NewsItem } from "@/lib/research/news";

export const dynamic = "force-dynamic";

/** Manchetes do Yahoo e 8-Ks da SEC de um ticker (trader-news). */
export async function GET(request: Request) {
  return guarded(request, async () => {
    const sym = cleanSymbol(new URL(request.url).searchParams.get("symbol"));
    const errors: string[] = [];
    let items: NewsItem[] = [];
    try {
      items = items.concat(parseRss(await yahooRss(sym)));
    } catch (e) {
      errors.push(`Yahoo: ${e instanceof Error ? e.message : String(e)}`);
    }
    try {
      const { cik } = await cikFor(sym);
      items = items.concat(parseSubmissions(await secSubmissions(cik), cik));
    } catch (e) {
      errors.push(`SEC: ${e instanceof Error ? e.message : String(e)}`);
    }
    items.sort((a, b) => (b.time ?? "").localeCompare(a.time ?? ""));
    return { symbol: sym, items: items.slice(0, 40), errors };
  });
}

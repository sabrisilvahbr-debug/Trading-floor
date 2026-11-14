// Acesso às fontes públicas usadas pelas skills: Yahoo Finance (não oficial, com atraso),
// SEC EDGAR (oficial, exige User-Agent com nome e contato) e House Clerk.
// Só leitura. Nada é inventado: sem resposta, o erro sobe com a fonte e o motivo.

export class DataError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const UA = "Mozilla/5.0 (compatible; trading-mohamed-floor/0.1; +https://github.com/sabrisilvahbr-debug/Trading-floor)";
const YAHOO_HOSTS = ["https://query2.finance.yahoo.com", "https://query1.finance.yahoo.com"];

async function get(url: string, headers: Record<string, string>, timeoutMs = 15_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { headers, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

export function yahooSymbol(sym: string): string {
  return sym.trim().toUpperCase().replace(/\./g, "-");
}

export function cleanSymbol(sym: unknown): string {
  const s = typeof sym === "string" ? sym.trim().toUpperCase() : "";
  if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(s)) throw new DataError(422, `Ticker inválido: '${String(sym ?? "")}'.`);
  return s;
}

export interface Series {
  t: number[];
  o: (number | null)[];
  h: (number | null)[];
  l: (number | null)[];
  c: (number | null)[];
  v: (number | null)[];
  meta: Record<string, unknown>;
}

/** Gráfico v8 do Yahoo (query2 primeiro, query1 em 429 ou 5xx), como nas skills. */
export async function yahooChart(sym: string, range: string, interval: string): Promise<Series> {
  const path = `/v8/finance/chart/${encodeURIComponent(yahooSymbol(sym))}?range=${range}&interval=${interval}&includePrePost=false`;
  let last = "sem resposta";
  for (const host of YAHOO_HOSTS) {
    let res: Response;
    try {
      res = await get(host + path, { "User-Agent": UA, Accept: "application/json" });
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      last = `HTTP ${res.status}`;
      continue;
    }
    let doc: { chart?: { result?: unknown[]; error?: { description?: string } } };
    try {
      doc = await res.json();
    } catch {
      throw new DataError(502, `Yahoo devolveu algo inesperado para ${sym}.`);
    }
    const result = doc.chart?.result?.[0] as
      | { timestamp?: number[]; indicators?: { quote?: Record<string, (number | null)[]>[] }; meta?: Record<string, unknown> }
      | undefined;
    if (!result) throw new DataError(404, `Sem dados do Yahoo para ${sym}: ${doc.chart?.error?.description ?? "ticker desconhecido"}.`);
    const t = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};
    const col = (k: string) => {
      const arr = Array.isArray(q[k]) ? q[k] : [];
      return t.map((_, i) => (typeof arr[i] === "number" && Number.isFinite(arr[i]) ? (arr[i] as number) : null));
    };
    return { t, o: col("open"), h: col("high"), l: col("low"), c: col("close"), v: col("volume"), meta: result.meta ?? {} };
  }
  throw new DataError(502, `Yahoo não respondeu (${last}). Tente de novo em instantes.`);
}

export async function yahooRss(sym: string): Promise<string> {
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(yahooSymbol(sym))}&region=US&lang=en-US`;
  const res = await get(url, { "User-Agent": UA, Accept: "application/rss+xml, text/xml" });
  if (!res.ok) throw new DataError(502, `Notícias do Yahoo responderam HTTP ${res.status}.`);
  return res.text();
}

// ------------------------------------------------------------------ SEC

export function secUserAgent(): string {
  const ua = process.env.SEC_USER_AGENT?.trim();
  if (!ua || !/@/.test(ua)) {
    throw new DataError(503, "Dados da SEC desligados: configure SEC_USER_AGENT na Vercel (seu nome e um e-mail de contato, exigência da SEC).");
  }
  return ua;
}

async function secJson<T>(url: string): Promise<T> {
  const res = await get(url, { "User-Agent": secUserAgent(), Accept: "application/json" }, 20_000);
  if (res.status === 404) throw new DataError(404, "A SEC não tem esse registro.");
  if (res.status === 403 || res.status === 429) throw new DataError(502, `A SEC recusou o pedido (HTTP ${res.status}). Confira SEC_USER_AGENT e tente mais tarde.`);
  if (!res.ok) throw new DataError(502, `A SEC respondeu HTTP ${res.status}.`);
  return (await res.json()) as T;
}

let tickerCache: { at: number; map: Map<string, { cik: number; title: string }> } | null = null;

export async function cikFor(sym: string): Promise<{ cik: number; title: string }> {
  if (!tickerCache || Date.now() - tickerCache.at > 24 * 3600 * 1000) {
    const doc = await secJson<Record<string, { cik_str: number; ticker: string; title: string }>>("https://www.sec.gov/files/company_tickers.json");
    const map = new Map<string, { cik: number; title: string }>();
    for (const row of Object.values(doc)) map.set(row.ticker.toUpperCase(), { cik: row.cik_str, title: row.title });
    tickerCache = { at: Date.now(), map };
  }
  const hit = tickerCache.map.get(sym.toUpperCase()) ?? tickerCache.map.get(sym.toUpperCase().replace(/\./g, "-"));
  if (!hit) throw new DataError(404, `${sym} não está na lista de empresas da SEC.`);
  return hit;
}

export const pad10 = (cik: number) => String(cik).padStart(10, "0");

export function secCompanyFacts(cik: number) {
  return secJson<Record<string, unknown>>(`https://data.sec.gov/api/xbrl/companyfacts/CIK${pad10(cik)}.json`);
}

export function secSubmissions(cik: number) {
  return secJson<Record<string, unknown>>(`https://data.sec.gov/submissions/CIK${pad10(cik)}.json`);
}

// ------------------------------------------------------------------ House Clerk

export async function houseIndexZip(year: number): Promise<ArrayBuffer> {
  const url = `https://disclosures-clerk.house.gov/public_disc/financial-pdfs/${year}FD.zip`;
  const res = await get(url, { "User-Agent": UA }, 25_000);
  if (!res.ok) throw new DataError(502, `O House Clerk respondeu HTTP ${res.status} para o índice de ${year}.`);
  return res.arrayBuffer();
}

// Porta de trader-news/news.py: manchetes do Yahoo (RSS) e 8-Ks da SEC, com etiquetas.

export const ITEMS_8K: Record<string, string> = {
  "1.01": "acordo relevante", "1.02": "fim de acordo", "1.03": "falência",
  "1.05": "incidente de cibersegurança", "2.01": "compra ou venda de ativos",
  "2.02": "resultado trimestral", "2.03": "nova dívida", "2.04": "vencimento antecipado de dívida",
  "2.05": "custos de reestruturação", "2.06": "baixa contábil", "3.01": "aviso de deslistagem",
  "3.02": "venda de ações não registrada", "3.03": "mudança de direitos dos acionistas",
  "4.01": "troca de auditor", "4.02": "balanços anteriores não confiáveis",
  "5.01": "mudança de controle", "5.02": "troca de diretor ou executivo",
  "5.03": "estatuto ou ano fiscal", "5.07": "votação de acionistas",
  "7.01": "divulgação Regulation FD", "8.01": "outros eventos", "9.01": "anexos",
};
export const IMPORTANT_ITEMS = new Set(["1.03", "1.05", "2.02", "2.04", "2.06", "3.01", "4.02", "5.01", "5.02"]);

export const KEYWORDS: [string, RegExp][] = [
  ["resultado", /\bearnings\b|\bresults\b|\bEPS\b|\bguidance\b|\bforecast\b/i],
  ["analista", /\bupgrade[sd]?\b|\bdowngrade[sd]?\b|price target|\boutperform\b|\bunderperform\b/i],
  ["jurídico", /\blawsuit\b|\bsued\b|\bprobe\b|\binvestigation\b|\bSEC charges\b|\bantitrust\b|\bjudge\b|\bcourt\b/i],
  ["negócio", /\bacqui(?:re|res|red|sition)\b|\bmerger\b|\bbuyout\b|\btakeover\b|\bdeal\b/i],
  ["capital", /\bdividend\b|\bbuyback\b|\brepurchase\b|\bstock split\b|\boffering\b/i],
  ["pessoas", /\bCEO\b|\bCFO\b|\bresign|\bsteps down\b|\bappoint/i],
  ["risco", /\brecall\b|\bbankrupt|\bdefault\b|\bdelist|\bhack|\bbreach\b|\boutage\b/i],
  ["paralisação", /\bhalt(?:s|ed)?\b|\btrading (?:pause|suspen)/i],
  ["regulatório", /\bFDA\b|\bapproval\b|\bapproves\b|\bclinical\b|\bFTC\b|\bDOJ\b/i],
  ["macro", /\bFed\b|\bFOMC\b|\bCPI\b|\binflation\b|\bjobs report\b|\bpayrolls\b|\btariffs?\b|\bfutures\b/i],
];

export interface NewsItem {
  id: string;
  source: "Yahoo Finance" | "SEC EDGAR";
  kind: "headline" | "filing";
  title: string;
  link: string;
  time: string | null; // ISO
  tags: string[];
  important: boolean;
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

function field(block: string, name: string): string {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(block);
  return m ? decode(m[1]) : "";
}

export function tagOf(text: string): string[] {
  return KEYWORDS.filter(([, rx]) => rx.test(text)).map(([label]) => label);
}

export function parseRss(xml: string): NewsItem[] {
  const out: NewsItem[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const b = m[1];
    const title = field(b, "title");
    if (!title) continue;
    const link = field(b, "link");
    const pub = field(b, "pubDate");
    const d = pub ? new Date(pub) : null;
    const guid = field(b, "guid") || link || title;
    const text = `${title} ${field(b, "description")}`;
    out.push({ id: `y:${guid}`, source: "Yahoo Finance", kind: "headline", title, link, time: d && !isNaN(+d) ? d.toISOString() : null, tags: tagOf(text), important: false });
  }
  return out;
}

/** 8-Ks recentes a partir de data.sec.gov/submissions. */
export function parseSubmissions(doc: Record<string, unknown>, cik: number, limit = 10): NewsItem[] {
  const name = typeof doc.name === "string" ? doc.name : "";
  const recent = ((doc.filings as { recent?: Record<string, unknown[]> } | undefined)?.recent ?? {}) as Record<string, unknown[]>;
  const forms = (recent.form ?? []) as string[];
  const out: NewsItem[] = [];
  for (let i = 0; i < forms.length && out.length < limit; i++) {
    if (forms[i] !== "8-K" && forms[i] !== "8-K/A") continue;
    const acc = String(recent.accessionNumber?.[i] ?? "");
    const items: string[] = String(recent.items?.[i] ?? "").match(/\d+\.\d+/g) ?? [];
    const labels = items.filter((x) => x !== "9.01").map((x) => ITEMS_8K[x] ?? `item ${x}`);
    const doc1 = String(recent.primaryDocument?.[i] ?? "");
    const date = String(recent.acceptanceDateTime?.[i] ?? recent.filingDate?.[i] ?? "");
    const link = `https://www.sec.gov/Archives/edgar/data/${cik}/${acc.replace(/-/g, "")}/${doc1}`;
    const tags = items.includes("2.02") ? ["resultado"] : [];
    out.push({
      id: `sec:${acc}`,
      source: "SEC EDGAR",
      kind: "filing",
      title: `${name} entregou um ${forms[i]}${labels.length ? ": " + labels.join(", ") : ""}`,
      link,
      time: date ? new Date(date).toISOString() : null,
      tags,
      important: items.some((x) => IMPORTANT_ITEMS.has(x)),
    });
  }
  return out;
}

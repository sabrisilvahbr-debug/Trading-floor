// Porta de trader-analyst/facts.py: números trimestrais pelos XBRL company facts da SEC.

export const CONCEPTS: Record<string, string[]> = {
  revenue: ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "RevenuesNetOfInterestExpense", "RevenueFromContractWithCustomerIncludingAssessedTax", "SalesRevenueNet", "SalesRevenueGoodsNet", "SalesRevenueServicesNet"],
  cost_of_revenue: ["CostOfGoodsAndServicesSold", "CostOfRevenue", "CostOfGoodsSold"],
  gross_profit: ["GrossProfit"],
  operating_income: ["OperatingIncomeLoss"],
  net_income: ["NetIncomeLoss", "ProfitLoss", "NetIncomeLossAvailableToCommonStockholdersBasic"],
  eps_diluted: ["EarningsPerShareDiluted", "EarningsPerShareBasicAndDiluted"],
};

interface Fact {
  start?: string;
  end: string;
  val: number;
  form?: string;
  filed?: string;
  accn?: string;
  fy?: number;
  fp?: string;
}

interface Q {
  value: number;
  start: string;
  end: string;
  derived: boolean;
  fy?: number;
  fp?: string;
  form?: string;
  filed?: string;
}

const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86400000;

function factsFor(cf: Record<string, unknown>, concept: string, unit: string): Fact[] {
  const node = ((cf.facts as Record<string, Record<string, { units?: Record<string, Fact[]> }>> | undefined)?.["us-gaap"] ?? {})[concept];
  if (!node?.units) return [];
  const u = unit in node.units ? unit : Object.keys(node.units)[0];
  return u ? node.units[u] : [];
}

function periods(facts: Fact[]) {
  const latest = new Map<string, Fact>();
  const first = new Map<string, Fact>();
  const stamp = (f: Fact) => `${f.filed ?? ""}|${f.accn ?? ""}`;
  for (const f of facts) {
    if (!f.start || !["10-Q", "10-K", "20-F", "40-F"].includes((f.form ?? "").split("/")[0])) continue;
    const key = `${f.start}|${f.end}`;
    if (!latest.has(key) || stamp(f) > stamp(latest.get(key)!)) latest.set(key, f);
    if (!first.has(key) || stamp(f) < stamp(first.get(key)!)) first.set(key, f);
  }
  return [...latest.entries()].map(([key, f]) => ({ ...f, fy: first.get(key)!.fy, fp: first.get(key)!.fp }));
}

function quarterly(facts: Fact[]): Map<string, Q> {
  const q = new Map<string, Q>();
  const years: Fact[] = [];
  for (const f of periods(facts)) {
    const d = days(f.start!, f.end);
    if (d >= 80 && d <= 100) q.set(f.end, { value: f.val, start: f.start!, end: f.end, derived: false, fy: f.fy, fp: f.fp, form: f.form, filed: f.filed });
    else if (d >= 350 && d <= 380) years.push(f);
  }
  for (const f of years) {
    if (q.has(f.end)) continue;
    const inside = [...q.values()].filter((v) => v.start >= f.start! && v.end < f.end).sort((a, b) => (a.end < b.end ? -1 : 1));
    if (inside.length !== 3) continue;
    const startQ = new Date(Date.parse(inside[2].end) + 86400000).toISOString().slice(0, 10);
    q.set(f.end, { value: f.val - inside.reduce((a, v) => a + v.value, 0), start: startQ, end: f.end, derived: true, fy: f.fy, fp: "Q4", form: f.form, filed: f.filed });
  }
  return q;
}

function series(cf: Record<string, unknown>, key: string) {
  const unit = key === "eps_diluted" ? "USD/shares" : "USD";
  const merged = new Map<string, Q>();
  for (const concept of CONCEPTS[key]) {
    for (const [end, v] of quarterly(factsFor(cf, concept, unit))) if (!merged.has(end)) merged.set(end, v);
  }
  return merged;
}

function yoy(s: Map<string, Q>, end: string): Q | null {
  const target = Date.parse(end) - 365 * 86400000;
  let best: [number, Q] | null = null;
  for (const [e, v] of s) {
    const gap = Math.abs((Date.parse(e) - target) / 86400000);
    if (gap <= 10 && (!best || gap < best[0])) best = [gap, v];
  }
  return best ? best[1] : null;
}

const pct = (a: number | null | undefined, b: number | null | undefined) => (a == null || b == null || b === 0 ? null : Math.round((1000 * (a - b)) / Math.abs(b)) / 10);
const margin = (p: number | null | undefined, w: number | null | undefined) => (p == null || !w ? null : Math.round((1000 * p) / w) / 10);

export interface QuarterRow {
  end: string;
  fiscal: string;
  derived: boolean;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  epsDiluted: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  revenueYoy: number | null;
  netIncomeYoy: number | null;
  epsYoy: number | null;
  form: string | null;
  filed: string | null;
}

export function analyse(cf: Record<string, unknown>, quarters = 6) {
  const s: Record<string, Map<string, Q>> = {};
  for (const k of Object.keys(CONCEPTS)) s[k] = series(cf, k);
  const rev = s.revenue;
  if (!rev.size && !s.net_income.size) throw new Error("A SEC não tem receita nem lucro trimestral desta empresa nos dados XBRL.");
  const ends = [...new Set([...rev.keys(), ...s.net_income.keys()])].sort().reverse().slice(0, quarters);
  const rows: QuarterRow[] = ends.map((end) => {
    const r = rev.get(end)?.value ?? null;
    let gp = s.gross_profit.get(end)?.value ?? null;
    if (gp == null && r != null && s.cost_of_revenue.has(end)) gp = r - s.cost_of_revenue.get(end)!.value;
    const oi = s.operating_income.get(end)?.value ?? null;
    const ni = s.net_income.get(end)?.value ?? null;
    const eps = s.eps_diluted.get(end)?.value ?? null;
    const base = rev.get(end) ?? s.net_income.get(end);
    return {
      end,
      fiscal: `${base?.fp ?? ""} ${base?.fy ?? ""}`.trim(),
      derived: Boolean(rev.get(end)?.derived || s.net_income.get(end)?.derived),
      revenue: r,
      grossProfit: gp,
      operatingIncome: oi,
      netIncome: ni,
      epsDiluted: eps == null ? null : Math.round(eps * 100) / 100,
      grossMargin: margin(gp, r),
      operatingMargin: margin(oi, r),
      netMargin: margin(ni, r),
      revenueYoy: pct(r, yoy(rev, end)?.value),
      netIncomeYoy: pct(ni, yoy(s.net_income, end)?.value),
      epsYoy: pct(eps, yoy(s.eps_diluted, end)?.value),
      form: base?.form ?? null,
      filed: base?.filed ?? null,
    };
  });
  const ttm: Record<string, number> = {};
  for (const key of ["revenue", "net_income", "eps_diluted"]) {
    const last4 = [...s[key].keys()].sort().slice(-4);
    if (last4.length === 4 && days(last4[0], last4[3]) < 300) ttm[key] = last4.reduce((a, e) => a + s[key].get(e)!.value, 0);
  }
  if (ttm.eps_diluted != null) ttm.eps_diluted = Math.round(ttm.eps_diluted * 100) / 100;
  return { entity: typeof cf.entityName === "string" ? cf.entityName : null, rows, ttm };
}

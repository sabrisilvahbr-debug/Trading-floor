import { guarded } from "@/lib/api";
import { houseIndexZip } from "@/lib/market/fetch";
import { parseIndex, unzipFirst } from "@/lib/research/congress";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Declarações de transações (PTR) da Câmara dos EUA (trader-pelosi). */
export async function GET(request: Request) {
  return guarded(request, async () => {
    const u = new URL(request.url);
    const year = Number(u.searchParams.get("year") ?? new Date().getUTCFullYear());
    if (!Number.isInteger(year) || year < 2012 || year > new Date().getUTCFullYear()) throw new Error("Ano inválido.");
    const q = (u.searchParams.get("q") ?? "").trim().toLowerCase();
    const zip = Buffer.from(await houseIndexZip(year));
    const xml = unzipFirst(zip, (n) => n.toLowerCase().endsWith(".xml"));
    if (!xml) throw new Error("O índice da Câmara veio sem o arquivo XML.");
    let list = parseIndex(xml.toString("utf8"), year);
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    return { year, source: "House Clerk (disclosures-clerk.house.gov)", total: list.length, filings: list.slice(0, 60), note: "Cada linha é um PTR. Abra o PDF oficial para ver ativos, datas e faixas de valor. O Senado não está incluído." };
  });
}

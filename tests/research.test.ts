import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseIndex, unzipFirst } from "../lib/research/congress";
import { parseRss, parseSubmissions } from "../lib/research/news";

describe("índice da Câmara", () => {
  it("abre o ZIP (deflate) e lista só PTRs", () => {
    const xml = unzipFirst(readFileSync(new URL("./fixture-fd.zip", import.meta.url)), (n) => n.endsWith(".xml"));
    const list = parseIndex(xml!.toString("utf8"), 2026);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: "Hon. Nancy Pelosi", filed: "2026-01-23", docId: "20033725", state: "CA11" });
    expect(list[0].pdf).toBe("https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20033725.pdf");
  });
});

describe("notícias", () => {
  it("RSS com CDATA e etiquetas", () => {
    const xml = `<rss><channel><item><title><![CDATA[Apple beats earnings &amp; raises guidance]]></title><link>https://x/a</link><pubDate>Fri, 13 Nov 2026 21:00:00 +0000</pubDate><guid>a1</guid></item></channel></rss>`;
    const [it0] = parseRss(xml);
    expect(it0.title).toBe("Apple beats earnings & raises guidance");
    expect(it0.tags).toContain("resultado");
    expect(it0.time).toBe("2026-11-13T21:00:00.000Z");
  });
  it("8-K com item 2.02 é importante", () => {
    const doc = { name: "Apple Inc.", filings: { recent: { form: ["10-Q", "8-K"], accessionNumber: ["a", "0000320193-26-000001"], items: ["", "2.02,9.01"], primaryDocument: ["", "x.htm"], filingDate: ["2026-10-30", "2026-10-30"] } } };
    const [f] = parseSubmissions(doc, 320193);
    expect(f.important).toBe(true);
    expect(f.title).toBe("Apple Inc. entregou um 8-K: resultado trimestral");
    expect(f.link).toBe("https://www.sec.gov/Archives/edgar/data/320193/000032019326000001/x.htm");
  });
});

import { describe, expect, it } from "vitest";
import {
  VisionError,
  callClaude,
  decideSignal,
  extractJson,
  normalizeReading,
  parseClaudeResponse,
  parseVisionInput,
  type VisionReading,
} from "../lib/vision";

const base: VisionReading = {
  legible: true,
  asset: "EUR/USD OTC",
  timeframe: "M1",
  trend: "alta",
  patterns: [],
  criteria: [
    { name: "tendência", direction: "alta", evidence: "" },
    { name: "últimas velas", direction: "alta", evidence: "" },
    { name: "suporte", direction: "alta", evidence: "" },
  ],
  suggested: "COMPRA",
  confidence: 0.8,
  summary: "",
  warnings: [],
};

describe("decideSignal", () => {
  it("confirma COMPRA com 3 critérios a favor, nenhum contra e confiança suficiente", () => {
    expect(decideSignal(base).signal).toBe("COMPRA");
  });

  it("confirma VENDA espelhada", () => {
    const r = { ...base, suggested: "VENDA" as const, criteria: base.criteria.map((c) => ({ ...c, direction: "baixa" as const })) };
    expect(decideSignal(r).signal).toBe("VENDA");
  });

  it("vira NEUTRO com imagem ilegível", () => {
    expect(decideSignal({ ...base, legible: false }).signal).toBe("NEUTRO");
  });

  it("vira NEUTRO com confiança abaixo de 60%", () => {
    expect(decideSignal({ ...base, confidence: 0.59 }).signal).toBe("NEUTRO");
  });

  it("vira NEUTRO com só 2 critérios a favor", () => {
    expect(decideSignal({ ...base, criteria: base.criteria.slice(0, 2) }).signal).toBe("NEUTRO");
  });

  it("vira NEUTRO com 2 critérios contra", () => {
    const criteria = [...base.criteria, { name: "x", direction: "baixa" as const, evidence: "" }, { name: "y", direction: "baixa" as const, evidence: "" }];
    expect(decideSignal({ ...base, criteria }).signal).toBe("NEUTRO");
  });

  it("vira NEUTRO com margem menor que 2 (3 a favor, 1 contra passa; 2 a favor e 1 contra não)", () => {
    const one = { name: "x", direction: "baixa" as const, evidence: "" };
    expect(decideSignal({ ...base, criteria: [...base.criteria, one] }).signal).toBe("COMPRA");
    expect(decideSignal({ ...base, criteria: [...base.criteria.slice(0, 2), one] }).signal).toBe("NEUTRO");
  });

  it("mantém NEUTRO quando a IA sugere NEUTRO", () => {
    expect(decideSignal({ ...base, suggested: "NEUTRO" }).signal).toBe("NEUTRO");
  });

  it("critérios neutros não contam a favor", () => {
    const criteria = base.criteria.map((c) => ({ ...c, direction: "neutro" as const }));
    expect(decideSignal({ ...base, criteria }).signal).toBe("NEUTRO");
  });
});

describe("normalizeReading", () => {
  it("descarta valores fora do formato e assume o pior caso", () => {
    const r = normalizeReading({ legible: "sim", suggested: "COMPRAR", trend: "subindo", confidence: 7, criteria: [{ direction: "alta" }, "x"] });
    expect(r.legible).toBe(false);
    expect(r.suggested).toBe("NEUTRO");
    expect(r.trend).toBe("indefinida");
    expect(r.confidence).toBe(1);
    expect(r.criteria).toEqual([]);
  });
});

describe("extractJson", () => {
  it("lê JSON dentro de cerca de código", () => {
    expect(extractJson('Aqui:\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it("recusa texto sem JSON", () => {
    expect(() => extractJson("nada")).toThrow(VisionError);
  });
});

describe("parseVisionInput", () => {
  it("aceita data URL", () => {
    const i = parseVisionInput({ image_base64: "data:image/jpeg;base64,QUJD" });
    expect(i.mimeType).toBe("image/jpeg");
    expect(i.imageBase64).toBe("QUJD");
  });
  it("recusa formato não aceito", () => {
    expect(() => parseVisionInput({ image_base64: "QUJD", mime_type: "image/gif" })).toThrow(/Formato/);
  });
  it("recusa imagem acima de 3 MB", () => {
    const big = "A".repeat(Math.ceil((3 * 1024 * 1024 + 10) / 3) * 4);
    expect(() => parseVisionInput({ image_base64: big, mime_type: "image/png" })).toThrow(/grande/);
  });
});

describe("callClaude", () => {
  const input = { imageBase64: "QUJD", mimeType: "image/jpeg" as const, note: "" };

  it("envia imagem e cabeçalhos corretos e lê a resposta", async () => {
    let sent: { url: string; init: RequestInit } | null = null;
    const fake = (async (url: string, init: RequestInit) => {
      sent = { url, init };
      const text = JSON.stringify({ ...base });
      return new Response(JSON.stringify({ content: [{ type: "text", text }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await callClaude(input, "k", "m", fake);
    expect(r.suggested).toBe("COMPRA");
    expect(sent!.url).toBe("https://api.anthropic.com/v1/messages");
    const headers = sent!.init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("k");
    const body = JSON.parse(String(sent!.init.body));
    expect(body.model).toBe("m");
    expect(body.messages[0].content[0].source.data).toBe("QUJD");
  });

  it("traduz 401 em mensagem sobre a chave", async () => {
    const fake = (async () => new Response("{}", { status: 401 })) as unknown as typeof fetch;
    await expect(callClaude(input, "k", "m", fake)).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });

  it("resposta vazia vira erro", () => {
    expect(() => parseClaudeResponse({ content: [] })).toThrow(VisionError);
  });
});

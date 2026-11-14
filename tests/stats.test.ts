import { describe, expect, it } from "vitest";
import { breakEven, profit, summarize, type Simulation } from "../lib/stats";

const sim = (outcome: Simulation["outcome"], payoutPct = 80, stake = 10): Simulation => ({
  id: Math.random().toString(),
  createdAt: "",
  analysisId: null,
  asset: "X",
  direction: "COMPRA",
  expiration: "1m",
  payoutPct,
  stake,
  outcome,
});

describe("stats", () => {
  it("break-even de 80% de payout é 55,6%", () => {
    expect(breakEven(80)).toBeCloseTo(0.5556, 4);
  });
  it("recusa payout zero", () => {
    expect(() => breakEven(0)).toThrow();
  });
  it("lucro de acerto, erro e empate", () => {
    expect(profit(sim("acerto"))).toBe(8);
    expect(profit(sim("erro"))).toBe(-10);
    expect(profit(sim("empate"))).toBe(0);
  });
  it("resumo ignora pendentes e empates na taxa", () => {
    const s = summarize([sim("acerto"), sim("erro"), sim("empate"), sim("pendente")]);
    expect(s.total).toBe(4);
    expect(s.closed).toBe(3);
    expect(s.winRate).toBe(0.5);
    expect(s.net).toBe(-2);
  });
  it("sem operações fechadas, taxa é nula", () => {
    expect(summarize([]).winRate).toBeNull();
  });
});

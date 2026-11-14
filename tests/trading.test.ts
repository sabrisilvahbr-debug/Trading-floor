import { describe, expect, it } from "vitest";
import { rsi, findSetups, openingRange } from "../lib/trading/scanner";
import { computePlan, PlanError } from "../lib/trading/plan";
import { sizeTrade, riskCheck, DEFAULT_RULES } from "../lib/trading/rules";
import { simulate, buildPool, verdict, timeMachine, SESSION_BARS } from "../lib/trading/timemachine";
import { session, marketStatus, ny } from "../lib/market/time";
import type { Series } from "../lib/market/fetch";
import fixtures from "./fixtures-scan.json";

describe("rsi (Wilder, igual ao scan.py)", () => {
  it("só altas = 100", () => expect(rsi(Array.from({ length: 20 }, (_, i) => i + 1))).toBe(100));
  it("poucos dados = null", () => expect(rsi([1, 2, 3])).toBeNull());
  it("bate com scan.rsi do Python", () => {
    const c = [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28];
    expect(rsi(c)!).toBeCloseTo(70.46413502109705, 10);
  });
});

describe("findSetups: paridade com scan.find_setups (casos gerados pelo Python da skill)", () => {
  for (const [i, k] of (fixtures as { c: number[]; tags: string[]; rsi: number; rsi_prev: number; high20: number; ma20: number }[]).entries()) {
    it(`caso ${i}`, () => {
      const r = findSetups(k.c);
      expect(r.tags).toEqual(k.tags);
      expect(r.rsi!).toBeCloseTo(k.rsi, 9);
      expect(r.high20).toBeCloseTo(k.high20, 9);
      expect(r.ma20).toBeCloseTo(k.ma20, 9);
    });
  }
});

describe("findSetups", () => {
  it("rompimento de 20 dias", () => {
    const c = [...Array(29).fill(100), 105];
    expect(findSetups(c).tags).toContain("breakout_20d");
  });
  it("sobrevendido em queda contínua", () => {
    const c = Array.from({ length: 30 }, (_, i) => 100 - i);
    expect(findSetups(c).tags).toContain("oversold");
  });
});

describe("computePlan (exit.py)", () => {
  it("stop no meio do range e alvo 2R", () => {
    const p = computePlan({ symbol: "X", entry: 101, stopRule: "or_mid", orHigh: 100.5, orLow: 99.5, targetR: 2 });
    expect(p.stop).toBe(100);
    expect(p.target).toBe(103);
    expect(p.risk).toBe(1);
    expect(p.rewardRisk).toBe(2);
  });
  it("arredonda o stop para baixo", () => {
    const p = computePlan({ symbol: "X", entry: 10, stopRule: "pct", stopParam: 3.33 });
    expect(p.stop).toBe(9.66);
  });
  it("recusa stop acima da entrada", () => {
    expect(() => computePlan({ symbol: "X", entry: 100, stopRule: "price", stopParam: 101 })).toThrow(PlanError);
  });
  it("recusa stop apertado demais (< 0,05%)", () => {
    expect(() => computePlan({ symbol: "X", entry: 100, stopRule: "price", stopParam: 99.99 })).toThrow(/apertado/);
  });
});

describe("sizeTrade (size.py)", () => {
  it("limitado pela posição máxima: 75% de 5.000 / 101 = 37 ações", () => {
    const s = sizeTrade("X", 101, 100, 103, DEFAULT_RULES);
    expect(s.qty).toBe(37);
    expect(s.boundBy).toBe("limite da posição");
  });
  it("limitado pela perda máxima: US$ 50 / US$ 1 = 50 ações", () => {
    const s = sizeTrade("X", 21, 20, 23, DEFAULT_RULES);
    expect(s.qty).toBe(50);
    expect(s.boundBy).toBe("perda máxima");
    expect(s.maxLoss).toBe(50);
    expect(s.refusal).toBeNull();
  });
  it("recusa quando uma ação arrisca mais que o limite", () => {
    const s = sizeTrade("X", 200, 100, 400, DEFAULT_RULES);
    expect(s.qty).toBe(0);
    expect(s.refusal).toMatch(/perda máxima/);
  });
  it("recusa retorno/risco abaixo do mínimo", () => {
    expect(sizeTrade("X", 101, 100, 101.5, DEFAULT_RULES).refusal).toMatch(/Retorno\/risco/);
  });
  it("bloqueia ticker da lista", () => {
    expect(() => sizeTrade("X", 101, 100, 103, { ...DEFAULT_RULES, blocked: ["x"] })).toThrow(/bloqueados/);
  });
});

describe("riskCheck", () => {
  // 2026-11-16 (segunda) 10:00 em Nova York = 15:00 UTC
  const t1000 = Date.UTC(2026, 10, 16, 15, 0) / 1000;
  it("PASS dentro da janela com tudo certo", () => {
    const s = sizeTrade("X", 101, 100, 103, DEFAULT_RULES);
    expect(riskCheck(s, DEFAULT_RULES, { trades: 0, riskOpen: 0 }, t1000).verdict).toBe("PASS");
  });
  it("BLOCK quando estoura a perda do dia", () => {
    const s = sizeTrade("X", 21, 20, 23, DEFAULT_RULES);
    expect(riskCheck(s, DEFAULT_RULES, { trades: 1, riskOpen: 120 }, t1000).verdict).toBe("BLOCK");
  });
  it("BLOCK com bolsa fechada (sábado)", () => {
    const s = sizeTrade("X", 101, 100, 103, DEFAULT_RULES);
    expect(riskCheck(s, DEFAULT_RULES, { trades: 0, riskOpen: 0 }, Date.UTC(2026, 10, 14, 15) / 1000).verdict).toBe("BLOCK");
  });
});

describe("calendário NYSE", () => {
  it("Thanksgiving fechado, dia seguinte fecha às 13h", () => {
    expect(session("2026-11-26")).toBeNull();
    expect(session("2026-11-27")?.close).toBe(13 * 60);
  });
  it("fim de semana", () => expect(marketStatus(Date.UTC(2026, 10, 14, 17) / 1000).open).toBe(false));
  it("horário de verão: 13:30 UTC em julho = 09:30 em NY", () => expect(ny(Date.UTC(2026, 6, 1, 13, 30) / 1000).hhmm).toBe("09:30"));
});

function fakeSeries(days: string[], gen: (d: number, i: number) => [number, number, number, number]): Series {
  const s: Series = { t: [], o: [], h: [], l: [], c: [], v: [], meta: { dataGranularity: "5m" } };
  days.forEach((date, d) => {
    // novembro: NY = UTC-5, 09:30 NY = 14:30 UTC
    const base = Date.parse(`${date}T14:30:00Z`) / 1000;
    for (let i = 0; i < SESSION_BARS; i++) {
      const [o, h, l, c] = gen(d, i);
      s.t.push(base + i * 300);
      s.o.push(o); s.h.push(h); s.l.push(l); s.c.push(c); s.v.push(1000);
    }
  });
  return s;
}

describe("openingRange (trader-entry)", () => {
  it("dispara no primeiro candle que fecha acima da máxima do range", () => {
    const s = fakeSeries(["2026-11-16"], (_, i) => (i < 3 ? [100, 101, 99, 100] : i === 4 ? [100, 102, 100, 101.5] : [100, 100.5, 99.5, 100]));
    const now = Date.parse("2026-11-16T15:30:00Z") / 1000; // 10:30 NY
    const r = openingRange(s, now, 15);
    expect(r.orHigh).toBe(101);
    expect(r.status).toBe("disparou");
    expect(r.trigger?.price).toBe(101.5);
    expect(r.trigger?.at).toBe("09:55");
  });
  it("aguardando quando não rompeu", () => {
    const s = fakeSeries(["2026-11-16"], () => [100, 101, 99, 100]);
    const r = openingRange(s, Date.parse("2026-11-16T15:30:00Z") / 1000, 15);
    expect(r.status).toBe("aguardando");
  });
});

describe("Time Machine", () => {
  it("caminho determinístico: só altas bate o alvo sempre", () => {
    const pool = Array.from({ length: SESSION_BARS }, () => [[1, 1.01, 1, 1.01] as [number, number, number, number]]);
    const mc = simulate(pool, 100, 99, 102, 5, 77, 200);
    expect(mc.pTarget).toBe(1);
    expect(mc.pStop).toBe(0);
    expect(mc.avgR).toBe(2);
  });
  it("stop e alvo no mesmo candle conta como stop (conservador)", () => {
    const pool = Array.from({ length: SESSION_BARS }, () => [[1, 1.05, 0.95, 1] as [number, number, number, number]]);
    expect(simulate(pool, 100, 99, 102, 5, 77, 100).pStop).toBe(1);
  });
  it("mesma semente, mesmos números", () => {
    const pool = buildPool([{ bars: Array.from({ length: SESSION_BARS }, (_, i) => ({ o: 100 + (i % 3), h: 101 + (i % 3), l: 99 + (i % 3), c: 100 + ((i * 7) % 5) / 2 })) }]);
    expect(simulate(pool, 100, 99, 102, 5, 77, 500)).toEqual(simulate(pool, 100, 99, 102, 5, 77, 500));
  });
  it("veredito de cara ou coroa", () => {
    expect(verdict({ pTarget: 0.4, pStop: 0.4, pNeither: 0.2, avgR: 0, rAtTarget: 1 }, "16:00").headline).toMatch(/cara ou coroa/);
  });
  it("recusa com menos de 20 pregões", () => {
    const s = fakeSeries(["2026-11-09", "2026-11-10"], () => [100, 101, 99, 100]);
    expect(() => timeMachine(s, Date.parse("2026-11-16T16:00:00Z") / 1000, { entry: 101, stop: 100, target: 103, entryTime: "09:50", date: "2026-11-16" })).toThrow(/pregões/);
  });
});

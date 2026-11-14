"use client";
// Armazenamento local no navegador (modo pessoal, antes do Supabase).
import type { Decision, VisionReading } from "./vision";
import { DEFAULT_RULES, type Rules } from "./trading/rules";

export interface Analysis {
  id: string;
  createdAt: string;
  model: string;
  reading: VisionReading;
  decision: Decision;
  thumbnail: string | null;
}

export interface PaperTrade {
  id: string;
  createdAt: string;
  nyDate: string;
  symbol: string;
  qty: number;
  entry: number;
  stop: number;
  target: number;
  maxLoss: number;
  setup: string;
  status: "aberta" | "fechada";
  exitPrice: number | null;
  exitAt: string | null;
  exitReason: string | null;
}

export interface Settings {
  accessCode: string;
  watchlist: string[];
  rules: Rules;
}

const KEYS = { analyses: "tmf.analyses", trades: "tmf.trades", settings: "tmf.settings.v2" } as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

const DEFAULT_SETTINGS: Settings = { accessCode: "", watchlist: [], rules: DEFAULT_RULES };

export const store = {
  analyses: () => read<Analysis[]>(KEYS.analyses, []),
  addAnalysis(a: Analysis): boolean {
    const list = [a, ...store.analyses()].slice(0, 100);
    if (write(KEYS.analyses, list)) return true;
    return write(KEYS.analyses, list.map((x) => ({ ...x, thumbnail: null })));
  },
  removeAnalysis(id: string) {
    write(KEYS.analyses, store.analyses().filter((a) => a.id !== id));
  },
  trades: () => read<PaperTrade[]>(KEYS.trades, []),
  saveTrades: (list: PaperTrade[]) => write(KEYS.trades, list),
  settings(): Settings {
    const s = read<Partial<Settings>>(KEYS.settings, {});
    let accessCode = s.accessCode ?? "";
    if (!accessCode) accessCode = read<{ accessCode?: string }>("tmf.settings", {}).accessCode ?? "";
    return { ...DEFAULT_SETTINGS, ...s, accessCode, rules: { ...DEFAULT_RULES, ...(s.rules ?? {}) } };
  },
  saveSettings: (s: Settings) => write(KEYS.settings, s),
  clearAll() {
    try {
      [...Object.values(KEYS), "tmf.settings", "tmf.simulations"].forEach((k) => window.localStorage.removeItem(k));
    } catch {
      /* ignora */
    }
  },
};

/** Chamada às rotas do servidor com o código de acesso. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", "x-access-code": store.settings().accessCode, ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `O servidor respondeu ${res.status}.`);
  return data;
}

export function tradeStats(trades: PaperTrade[], nyDate: string) {
  const today = trades.filter((t) => t.nyDate === nyDate);
  const closed = trades.filter((t) => t.status === "fechada" && t.exitPrice != null);
  const pnl = (t: PaperTrade, price: number) => Math.round((price - t.entry) * t.qty * 100) / 100;
  const realized = closed.reduce((a, t) => a + pnl(t, t.exitPrice!), 0);
  const wins = closed.filter((t) => pnl(t, t.exitPrice!) > 0).length;
  return {
    todayTrades: today.length,
    todayRisk: Math.round(today.reduce((a, t) => a + t.maxLoss, 0) * 100) / 100,
    closed: closed.length,
    wins,
    winRate: closed.length ? wins / closed.length : null,
    realized: Math.round(realized * 100) / 100,
    pnl,
  };
}

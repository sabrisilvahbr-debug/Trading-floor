"use client";
// Armazenamento local no navegador (modo pessoal, antes do Supabase).
// Cada leitura e escrita é protegida: o navegador pode bloquear o armazenamento.

import type { Decision, VisionReading } from "./vision";
import type { Simulation } from "./stats";

export interface Analysis {
  id: string;
  createdAt: string;
  model: string;
  reading: VisionReading;
  decision: Decision;
  thumbnail: string | null;
}

export interface AssetSetting {
  asset: string;
  /** Expirações disponíveis na plataforma, digitadas pelo usuário. */
  expirations: string[];
  /** Payout em %, digitado pelo usuário. */
  payoutPct: number | null;
}

export interface Settings {
  accessCode: string;
  assets: AssetSetting[];
}

const KEYS = { analyses: "tmf.analyses", sims: "tmf.simulations", settings: "tmf.settings" } as const;
const MAX_ANALYSES = 100;

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

export const store = {
  analyses: () => read<Analysis[]>(KEYS.analyses, []),
  addAnalysis(a: Analysis): boolean {
    const list = [a, ...store.analyses()].slice(0, MAX_ANALYSES);
    if (write(KEYS.analyses, list)) return true;
    // Sem espaço: guarda sem miniaturas.
    return write(KEYS.analyses, list.map((x) => ({ ...x, thumbnail: null })));
  },
  removeAnalysis(id: string) {
    write(KEYS.analyses, store.analyses().filter((a) => a.id !== id));
  },
  simulations: () => read<Simulation[]>(KEYS.sims, []),
  saveSimulations: (list: Simulation[]) => write(KEYS.sims, list),
  settings: () => read<Settings>(KEYS.settings, { accessCode: "", assets: [] }),
  saveSettings: (s: Settings) => write(KEYS.settings, s),
  clearAll() {
    try {
      Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
    } catch {
      /* ignora */
    }
  },
};

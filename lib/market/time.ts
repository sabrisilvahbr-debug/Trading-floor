// Horário de Nova York e calendário da NYSE.
// Feriados e meios-pregões copiados das skills (trader-exit/exit.py), fonte nyse.com.

export const NYSE_HOLIDAYS: Record<string, string> = {
  "2026-01-01": "New Year's Day",
  "2026-01-19": "Martin Luther King, Jr. Day",
  "2026-02-16": "Washington's Birthday",
  "2026-04-03": "Good Friday",
  "2026-05-25": "Memorial Day",
  "2026-06-19": "Juneteenth",
  "2026-07-03": "Independence Day (observed)",
  "2026-09-07": "Labor Day",
  "2026-11-26": "Thanksgiving Day",
  "2026-12-25": "Christmas Day",
  "2027-01-01": "New Year's Day",
  "2027-01-18": "Martin Luther King, Jr. Day",
  "2027-02-15": "Washington's Birthday",
  "2027-03-26": "Good Friday",
  "2027-05-31": "Memorial Day",
  "2027-06-18": "Juneteenth (observed)",
  "2027-07-05": "Independence Day (observed)",
  "2027-09-06": "Labor Day",
  "2027-11-25": "Thanksgiving Day",
  "2027-12-24": "Christmas Day (observed)",
};

export const NYSE_EARLY_CLOSE: Record<string, string> = {
  "2026-11-27": "day after Thanksgiving",
  "2026-12-24": "Christmas Eve",
  "2027-11-26": "day after Thanksgiving",
};

export const OPEN_MIN = 9 * 60 + 30;
export const CLOSE_MIN = 16 * 60;
export const EARLY_CLOSE_MIN = 13 * 60;

const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
});

export interface NyTime {
  date: string; // YYYY-MM-DD
  minutes: number; // minutos desde a meia-noite em Nova York
  second: number;
  weekday: number; // 0 = domingo
  hhmm: string;
}

const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Segundos Unix -> data e hora em Nova York. */
export function ny(tsSeconds: number): NyTime {
  const parts = Object.fromEntries(fmt.formatToParts(new Date(tsSeconds * 1000)).map((p) => [p.type, p.value]));
  const h = Number(parts.hour) % 24;
  const m = Number(parts.minute);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: h * 60 + m,
    second: Number(parts.second),
    weekday: WD[parts.weekday] ?? 0,
    hhmm: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
  };
}

/** Abertura e fechamento (minutos) de um dia, ou null se a bolsa não abre. */
export function session(date: string): { open: number; close: number } | null {
  const d = new Date(`${date}T12:00:00Z`);
  const wd = d.getUTCDay();
  if (wd === 0 || wd === 6 || NYSE_HOLIDAYS[date]) return null;
  return { open: OPEN_MIN, close: NYSE_EARLY_CLOSE[date] ? EARLY_CLOSE_MIN : CLOSE_MIN };
}

export function marketStatus(nowSeconds = Date.now() / 1000) {
  const t = ny(nowSeconds);
  const s = session(t.date);
  const open = Boolean(s && t.minutes >= s.open && t.minutes < s.close);
  return {
    nyDate: t.date,
    nyTime: t.hhmm,
    open,
    reason: !s ? (NYSE_HOLIDAYS[t.date] ? `feriado: ${NYSE_HOLIDAYS[t.date]}` : "fim de semana") : open ? "pregão aberto" : "fora do pregão",
    closeAt: s ? clock(s.close) : null,
  };
}

export function clock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function parseClock(text: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  return h < 24 && mi < 60 ? h * 60 + mi : null;
}

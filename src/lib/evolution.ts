/** Relatório de evolução determinístico, a partir apenas do diário. Sem IA. */
import { moonPhase } from "./astro";

export type EvoEntry = { entry_date: string; mood: string | null; energy: number | null };
export type EvoSignal = {
  id: string; kind: string; description: string; amount: number | null;
  due_date: string | null; entry_date: string; resolved: boolean;
};

const MOOD_SCORE: Record<string, number> = { otimo: 10, bom: 7.5, neutro: 5, cansado: 3, dificil: 1 };

function avg(xs: number[]) {
  return xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;
}

function shift(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Compara os últimos 30 dias com os 30 anteriores. */
export function compareWindows(entries: EvoEntry[], today: string) {
  const a = shift(today, -30), b = shift(today, -60);
  const cur = entries.filter((e) => e.entry_date > a && e.entry_date <= today);
  const prev = entries.filter((e) => e.entry_date > b && e.entry_date <= a);
  const energy = (xs: EvoEntry[]) => avg(xs.flatMap((e) => (e.energy == null ? [] : [e.energy])));
  const mood = (xs: EvoEntry[]) => avg(xs.flatMap((e) => (e.mood && MOOD_SCORE[e.mood] != null ? [MOOD_SCORE[e.mood]!] : [])));
  return {
    days: { cur: cur.length, prev: prev.length },
    energy: { cur: energy(cur), prev: energy(prev) },
    mood: { cur: mood(cur), prev: mood(prev) },
  };
}

/** Energia média por fase da Lua, só com dias que têm energia registrada. */
export function energyByMoon(entries: EvoEntry[]) {
  const map = new Map<string, { label: string; symbol: string; vals: number[] }>();
  for (const e of entries) {
    if (e.energy == null) continue;
    const p = moonPhase(new Date(`${e.entry_date}T12:00:00Z`));
    const row = map.get(p.key) ?? { label: p.label, symbol: p.symbol, vals: [] };
    row.vals.push(e.energy);
    map.set(p.key, row);
  }
  return [...map.values()]
    .filter((r) => r.vals.length >= 3)
    .map((r) => ({ label: r.label, symbol: r.symbol, avg: avg(r.vals)!, n: r.vals.length }))
    .sort((x, y) => y.avg - x.avg);
}

/** Contas em aberto que vencem até `days` dias (inclui vencidas). */
export function billsDue(signals: EvoSignal[], today: string, days = 15) {
  const limit = shift(today, days);
  return signals
    .filter((s) => s.kind === "conta" && !s.resolved && s.due_date && s.due_date <= limit)
    .sort((x, y) => (x.due_date! < y.due_date! ? -1 : 1));
}

/** Melhorias que se repetem: agrupa por texto normalizado (primeiras palavras). */
export function recurringImprovements(signals: EvoSignal[], top = 5) {
  const key = (t: string) => t.toLowerCase().normalize("NFD").replace(/[^a-z\s]/g, "").split(/\s+/).filter((w) => w.length > 3).slice(0, 3).join(" ");
  const map = new Map<string, { text: string; n: number; last: string }>();
  for (const s of signals) {
    if (s.kind !== "melhoria") continue;
    const k = key(s.description) || s.description;
    const row = map.get(k) ?? { text: s.description, n: 0, last: s.entry_date };
    row.n += 1;
    if (s.entry_date > row.last) { row.last = s.entry_date; row.text = s.description; }
    map.set(k, row);
  }
  return [...map.values()].sort((a, b) => b.n - a.n || (a.last < b.last ? 1 : -1)).slice(0, top);
}

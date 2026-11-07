/** Published tropical ephemeris; diary buckets use São Paulo calendar days, not birth charts. */
export const SATURN_2026 = {
  retrogradeAt: "2026-07-26T19:57:00Z",
  directAt: "2026-12-10T23:23:00Z",
  shadowEnd: "2027-03-15",
  sources: [
    { label: "Cafe Astrology — datas e sombra", url: "https://cafeastrology.com/events/saturn-turns-retrograde-in-aries-2026/" },
    { label: "Chartnova — horários UTC", url: "https://chartnova.app/saturn-retrograde" },
  ],
} as const;

export const SATURN_PHASES = [
  { key: "pre", label: "Antes da retrogradação", start: "2026-04-20", end: "2026-07-25", symbolic: "Preparação: observar limites, compromissos e como você inicia projetos." },
  { key: "retro", label: "Retrogradação", start: "2026-07-26", end: "2026-12-10", symbolic: "Revisão: refletir sobre responsabilidades, ritmo e escolhas que pedem ajuste." },
  { key: "post", label: "Retomada / pós-sombra", start: "2026-12-11", end: "2027-03-15", symbolic: "Integração: testar gradualmente os ajustes, sem esperar uma virada automática." },
] as const;

export type SaturnEntry = { id: string; entry_date: string; summary: string | null; mood: string | null; energy: number | null };

export function saturnStatus(now: Date) {
  if (now.getTime() < Date.parse(SATURN_2026.retrogradeAt)) return "Antes da retrogradação";
  if (now.getTime() < Date.parse(SATURN_2026.directAt)) return "Saturno retrógrado em Áries";
  const localDay = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return localDay <= SATURN_2026.shadowEnd ? "Saturno direto · pós-sombra" : "Ciclo de 2026 encerrado";
}

export function compareSaturnDiary(entries: SaturnEntry[], today: string) {
  return SATURN_PHASES.map((phase) => {
    const rows = entries.filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.entry_date) && e.entry_date >= phase.start && e.entry_date <= phase.end && e.entry_date <= today)
      .sort((a, b) => b.entry_date.localeCompare(a.entry_date) || a.id.localeCompare(b.id));
    const energies = rows.flatMap((e) => e.energy !== null && Number.isFinite(e.energy) && e.energy >= 0 && e.energy <= 10 ? [e.energy] : []);
    const moods = new Map<string, number>();
    for (const row of rows) if (row.mood) moods.set(row.mood, (moods.get(row.mood) ?? 0) + 1);
    return {
      ...phase, days: new Set(rows.map((e) => e.entry_date)).size,
      energy: energies.length >= 3 ? Math.round(energies.reduce((a, b) => a + b, 0) / energies.length * 10) / 10 : null,
      energySamples: energies.length,
      moods: [...moods].sort((a, b) => b[1] - a[1]).slice(0, 2),
      evidence: rows.filter((e) => e.summary?.trim()).slice(0, 3),
    };
  });
}
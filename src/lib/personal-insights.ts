// Cálculos locais de estado, sequências e fase de vida (sem IA, sem dependências).

export const iso = (d: Date) => d.toISOString().slice(0, 10);

export function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
}

export type JournalLite = { entry_date: string; mood: string | null; energy: number | null };
export type LogLite = { practice_id: string; log_date: string };
export type TaskLite = { status: string; due_date: string | null; updated_at?: string };

const MOOD_SCORE: Record<string, number> = { otimo: 100, bom: 80, neutro: 55, cansado: 35, dificil: 20 };

export function moodScore(entries: JournalLite[]) {
  const recent = entries.slice(0, 14).filter((e) => e.mood);
  if (!recent.length) return null;
  return Math.round(recent.reduce((s, e) => s + (MOOD_SCORE[e.mood ?? ""] ?? 50), 0) / recent.length);
}

export function energyScore(entries: JournalLite[]) {
  const recent = entries.slice(0, 14).filter((e) => e.energy !== null);
  if (!recent.length) return null;
  return Math.round((recent.reduce((s, e) => s + (e.energy ?? 0), 0) / recent.length) * 10);
}

/** % de tarefas concluídas entre as que venceram nos últimos 30 dias + concluídas. */
export function productivityScore(tasks: TaskLite[]) {
  if (!tasks.length) return null;
  const done = tasks.filter((t) => t.status === "concluido").length;
  return Math.round((done / tasks.length) * 100);
}

/** % de aderência às práticas nos últimos 14 dias. */
export function disciplineScore(logs: LogLite[], practicesCount: number) {
  if (!practicesCount) return null;
  const since = daysAgo(13);
  const recent = logs.filter((l) => l.log_date >= since);
  return Math.min(100, Math.round((recent.length / (practicesCount * 14)) * 100));
}

/** Sequência atual de dias consecutivos com ao menos um registro de prática. */
export function currentStreak(logs: LogLite[]) {
  const days = new Set(logs.map((l) => l.log_date));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(iso(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(iso(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function rangeAdherence(logs: LogLite[], practicesCount: number, days: number) {
  if (!practicesCount) return 0;
  const since = daysAgo(days - 1);
  const count = logs.filter((l) => l.log_date >= since).length;
  return Math.min(100, Math.round((count / (practicesCount * days)) * 100));
}

export type Scores = {
  energy: number | null;
  mood: number | null;
  productivity: number | null;
  discipline: number | null;
};

/** Fase atual da vida derivada dos próprios dados. */
export function lifePhase(scores: Scores, activeMissions: number, openTasks: number) {
  const vals = [scores.energy, scores.mood, scores.productivity, scores.discipline].filter(
    (v): v is number => v !== null,
  );
  const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;

  if (!vals.length) {
    return {
      phase: "Ciclo de início",
      summary: "Registre diário, práticas e tarefas para o sistema ler seu momento atual.",
    };
  }
  if (avg >= 75) {
    return {
      phase: "Ciclo de expansão",
      summary: `Você está em alta constância: ${activeMissions} missão(ões) em curso e disciplina sustentada. Momento de ampliar escopo.`,
    };
  }
  if (avg >= 55) {
    return {
      phase: "Ciclo de construção e disciplina",
      summary: `Base sólida em formação com ${openTasks} frente(s) aberta(s). Foque em consistência antes de aumentar o volume.`,
    };
  }
  if (avg >= 35) {
    return {
      phase: "Ciclo de reorganização",
      summary: "Os dados apontam oscilação. Reduza o número de frentes e retome as práticas essenciais.",
    };
  }
  return {
    phase: "Ciclo de recolhimento",
    summary: "Energia e ritmo baixos no período. Priorize descanso, sono e uma única prática âncora por dia.",
  };
}

// Motor determinístico de contexto e priorização do HERMES.
// Não usa IA. Tudo o que sai daqui vem de registros reais do banco, com evidências.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { analyzePipeline, newContactsSince, todayISO, type DealRow, type PipelineHealth } from "./pipeline";
import { currentStreak, daysAgo, disciplineScore, energyScore, moodScore, productivityScore } from "./personal-insights";

type DB = SupabaseClient<Database>;

export type Evidence = { tipo: string; ref: string; id?: string; data?: string };

export type Priority = {
  id: string;
  titulo: string;
  dominio: "comercial" | "pessoal" | "operacional";
  score: number;
  motivo: string;
  evidencias: Evidence[];
  acao?: string;
};

export type HermesSnapshot = {
  hoje: string;
  estado: {
    energia: number | null;
    humor: number | null;
    produtividade: number | null;
    disciplina: number | null;
    sequenciaPraticas: number;
    ultimoDiario: string | null;
    diasDesdeUltimoDiario: number | null;
  };
  comercial: {
    totalOportunidades: number;
    abertas: number;
    pipelineBruto: number;
    pipelinePonderado: number;
    fechamentoEsperadoMes: number;
    followUpsVencidos: number;
    esfriando: number;
    semProximaAcao: number;
    propostasAbertas: number;
    novosContatosSemana: number;
    criticos: {
      id: string;
      titulo: string;
      estagio: string;
      valor: number | null;
      diasSemContato: number | null;
      diasAtraso: number;
      proximoPasso: string | null;
      proximoPassoData: string | null;
      problema: string;
    }[];
  };
  operacional: {
    tarefasAbertas: number;
    tarefasAtrasadas: number;
    capturasPendentes: number;
    compromissosProximos: { id: string; title: string; event_date: string; start_time: string | null }[];
    contasVencendo: { id: string; description: string; amount: number; due_date: string | null }[];
    missoesAtivas: number;
    objetivosAtivos: number;
  };
  historico: {
    diasRegistrados: number;
    acontecimentos: number;
    praticasRegistradas: number;
    diarioRecente: { entry_date: string; title: string | null; summary: string | null; mood: string | null; energy: number | null }[];
  };
  prioridades: Priority[];
  temDadosComerciais: boolean;
  temDadosPessoais: boolean;
};

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isNaN(n) ? 0 : n;
};

function diffDays(fromISO: string, toISO: string) {
  const a = Date.parse(`${fromISO.slice(0, 10)}T12:00:00Z`);
  const b = Date.parse(`${toISO.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

export async function buildHermesSnapshot(supabase: DB): Promise<HermesSnapshot> {
  const today = todayISO();
  const in7 = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const weekAgo = daysAgo(7);

  const [
    dealsRes, contactsRes, tasksRes, eventsRes, financeRes, capturesRes,
    journalRes, logsRes, practicesRes, missionsRes, goalsRes,
    daysCount, timelineCount, practiceHistCount,
  ] = await Promise.all([
    supabase.from("deals").select("*").order("updated_at", { ascending: false }).limit(300),
    supabase.from("contacts").select("id, name, created_at, last_touch_at").limit(500),
    supabase.from("tasks").select("id, title, status, priority, due_date, area, updated_at").limit(300),
    supabase.from("events").select("id, title, event_date, start_time").gte("event_date", today).lte("event_date", in7).order("event_date").limit(10),
    supabase.from("finance_transactions").select("id, description, amount, due_date, paid, kind").eq("kind", "despesa").eq("paid", false).limit(100),
    supabase.from("captures").select("id, captured_at, status").eq("status", "novo").limit(100),
    supabase.from("journal_entries").select("entry_date, title, summary, mood, energy").order("entry_date", { ascending: false }).limit(60),
    supabase.from("practice_logs").select("practice_id, log_date").gte("log_date", daysAgo(60)).limit(1000),
    supabase.from("practices").select("id").eq("active", true),
    supabase.from("missions").select("id, name, status").limit(50),
    supabase.from("life_goals").select("id, title, status").limit(50),
    supabase.from("journal_entries").select("id", { count: "exact", head: true }),
    supabase.from("timeline_events").select("id", { count: "exact", head: true }),
    supabase.from("practice_history").select("id", { count: "exact", head: true }),
  ]);

  const deals = (dealsRes.data ?? []) as unknown as DealRow[];
  const pipeline: PipelineHealth = analyzePipeline(deals, today);
  const contacts = contactsRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const openTasks = tasks.filter((t) => t.status !== "concluido");
  const lateTasks = openTasks.filter((t) => t.due_date && t.due_date < today);
  const journal = journalRes.data ?? [];
  const logs = logsRes.data ?? [];
  const activePractices = practicesRes.data?.length ?? 0;
  const bills = (financeRes.data ?? []).filter((f) => f.due_date && f.due_date <= in7);
  const captures = capturesRes.data ?? [];

  const lastJournal = journal[0]?.entry_date ?? null;

  const criticos = [
    ...pipeline.overdueFollowUps.map((a) => ({ a, problema: `Follow-up vencido há ${a.daysOverdue} dia(s)` })),
    ...pipeline.missingNextStep.map((a) => ({ a, problema: "Sem próxima ação definida" })),
    ...pipeline.cooling.map((a) => ({ a, problema: `Sem contato há ${a.daysSinceTouch} dia(s)` })),
  ]
    .filter((x, i, arr) => arr.findIndex((y) => y.a.deal.id === x.a.deal.id) === i)
    .slice(0, 12)
    .map(({ a, problema }) => ({
      id: a.deal.id,
      titulo: a.deal.title,
      estagio: a.stage,
      valor: a.value,
      diasSemContato: a.daysSinceTouch,
      diasAtraso: a.daysOverdue,
      proximoPasso: a.deal.next_step,
      proximoPassoData: a.deal.next_step_date,
      problema,
    }));

  // ---- Priorização determinística ----
  const prioridades: Priority[] = [];

  for (const a of pipeline.overdueFollowUps.slice(0, 6)) {
    prioridades.push({
      id: `deal-overdue-${a.deal.id}`,
      titulo: `Retomar “${a.deal.title}”`,
      dominio: "comercial",
      score: 90 + Math.min(a.daysOverdue, 10) + (a.value ? Math.min(a.value / 1000, 10) : 0),
      motivo: `Próximo passo previsto para ${a.deal.next_step_date} está ${a.daysOverdue} dia(s) atrasado.`,
      evidencias: [
        { tipo: "oportunidade", ref: a.deal.title, id: a.deal.id, data: a.deal.next_step_date ?? undefined },
      ],
      acao: a.deal.next_step ?? "Definir e executar o próximo passo",
    });
  }

  for (const a of pipeline.missingNextStep.slice(0, 6)) {
    prioridades.push({
      id: `deal-nostep-${a.deal.id}`,
      titulo: `Definir próxima ação de “${a.deal.title}”`,
      dominio: "comercial",
      score: 80 + (a.value ? Math.min(a.value / 1000, 8) : 0),
      motivo: "Oportunidade ativa sem próximo passo e data — risco de parar por esquecimento.",
      evidencias: [{ tipo: "oportunidade", ref: a.deal.title, id: a.deal.id, data: a.deal.updated_at.slice(0, 10) }],
      acao: "Registrar próximo passo e data",
    });
  }

  for (const a of pipeline.cooling.slice(0, 4)) {
    prioridades.push({
      id: `deal-cooling-${a.deal.id}`,
      titulo: `Reaquecer “${a.deal.title}”`,
      dominio: "comercial",
      score: 70 + Math.min(a.daysSinceTouch ?? 0, 20),
      motivo: `Sem registro de contato há ${a.daysSinceTouch} dia(s).`,
      evidencias: [
        { tipo: "oportunidade", ref: a.deal.title, id: a.deal.id, data: (a.deal.last_touch_at ?? a.deal.updated_at).slice(0, 10) },
      ],
      acao: "Registrar um contato ou marcar como perdida",
    });
  }

  for (const b of bills.slice(0, 3)) {
    prioridades.push({
      id: `bill-${b.id}`,
      titulo: `Pagar ${b.description}`,
      dominio: "operacional",
      score: 75,
      motivo: `Conta em aberto com vencimento em ${b.due_date}.`,
      evidencias: [{ tipo: "financeiro", ref: b.description, id: b.id, data: b.due_date ?? undefined }],
    });
  }

  for (const t of lateTasks.slice(0, 4)) {
    prioridades.push({
      id: `task-${t.id}`,
      titulo: t.title,
      dominio: "operacional",
      score: 60 + (t.priority === "alta" ? 10 : 0),
      motivo: `Tarefa com prazo em ${t.due_date}, já vencido.`,
      evidencias: [{ tipo: "tarefa", ref: t.title, id: t.id, data: t.due_date ?? undefined }],
    });
  }

  for (const e of (eventsRes.data ?? []).filter((e) => e.event_date === today)) {
    prioridades.push({
      id: `event-${e.id}`,
      titulo: `Compromisso: ${e.title}`,
      dominio: "operacional",
      score: 65,
      motivo: "Compromisso agendado para hoje.",
      evidencias: [{ tipo: "agenda", ref: e.title, id: e.id, data: e.event_date }],
    });
  }

  if (captures.length) {
    prioridades.push({
      id: "captures-pending",
      titulo: `Processar ${captures.length} captura(s) pendente(s)`,
      dominio: "operacional",
      score: 55,
      motivo: "Há texto capturado ainda não transformado em registros.",
      evidencias: captures.slice(0, 3).map((c) => ({ tipo: "captura", ref: "captura", id: c.id, data: c.captured_at.slice(0, 10) })),
    });
  }

  const diasSemDiario = lastJournal ? diffDays(lastJournal, today) : null;
  if (diasSemDiario !== null && diasSemDiario >= 3) {
    prioridades.push({
      id: "journal-gap",
      titulo: "Registrar o diário",
      dominio: "pessoal",
      score: 45 + Math.min(diasSemDiario, 15),
      motivo: `Último registro em ${lastJournal} — ${diasSemDiario} dia(s) sem diário.`,
      evidencias: [{ tipo: "diario", ref: "último registro", data: lastJournal ?? undefined }],
    });
  }

  prioridades.sort((a, b) => b.score - a.score);

  return {
    hoje: today,
    estado: {
      energia: energyScore(journal),
      humor: moodScore(journal),
      produtividade: productivityScore(tasks),
      disciplina: disciplineScore(logs, activePractices),
      sequenciaPraticas: currentStreak(logs),
      ultimoDiario: lastJournal,
      diasDesdeUltimoDiario: diasSemDiario,
    },
    comercial: {
      totalOportunidades: pipeline.total,
      abertas: pipeline.open,
      pipelineBruto: pipeline.grossPipeline,
      pipelinePonderado: pipeline.weightedPipeline,
      fechamentoEsperadoMes: pipeline.expectedThisMonth,
      followUpsVencidos: pipeline.overdueFollowUps.length,
      esfriando: pipeline.cooling.length,
      semProximaAcao: pipeline.missingNextStep.length,
      propostasAbertas: pipeline.openProposals.length,
      novosContatosSemana: newContactsSince(contacts, weekAgo),
      criticos,
    },
    operacional: {
      tarefasAbertas: openTasks.length,
      tarefasAtrasadas: lateTasks.length,
      capturasPendentes: captures.length,
      compromissosProximos: eventsRes.data ?? [],
      contasVencendo: bills.map((b) => ({ id: b.id, description: b.description, amount: num(b.amount), due_date: b.due_date })),
      missoesAtivas: (missionsRes.data ?? []).filter((m) => m.status !== "concluida").length,
      objetivosAtivos: (goalsRes.data ?? []).filter((g) => g.status !== "concluido").length,
    },
    historico: {
      diasRegistrados: daysCount.count ?? 0,
      acontecimentos: timelineCount.count ?? 0,
      praticasRegistradas: practiceHistCount.count ?? 0,
      diarioRecente: journal.slice(0, 7),
    },
    prioridades: prioridades.slice(0, 12),
    temDadosComerciais: pipeline.total > 0,
    temDadosPessoais: journal.length > 0,
  };
}

// Regras comerciais determinísticas. Sem IA, sem chamadas externas.
// Todos os números derivam exclusivamente dos registros salvos em `deals`.

export const DEAL_STAGES = [
  "contato",
  "conversa",
  "interesse",
  "proposta",
  "negociacao",
  "fechado",
  "perdido",
] as const;

export type DealStage = (typeof DEAL_STAGES)[number];

export const STAGE_LABEL: Record<DealStage, string> = {
  contato: "Contato",
  conversa: "Conversa",
  interesse: "Interesse",
  proposta: "Proposta",
  negociacao: "Negociação",
  fechado: "Fechado",
  perdido: "Perdido",
};

/**
 * Probabilidade padrão por estágio, usada SOMENTE quando o registro não tem
 * probabilidade explícita. Sempre exibida na interface como "estimativa padrão".
 */
export const DEFAULT_PROBABILITY: Record<DealStage, number> = {
  contato: 10,
  conversa: 20,
  interesse: 35,
  proposta: 55,
  negociacao: 75,
  fechado: 100,
  perdido: 0,
};

export const OPEN_STAGES: DealStage[] = ["contato", "conversa", "interesse", "proposta", "negociacao"];

/** Dias sem contato a partir dos quais uma oportunidade é considerada esfriando. */
export const COOLING_DAYS = 7;

export type DealRow = {
  id: string;
  title: string;
  client_id: string | null;
  company_id: string | null;
  contact_id: string | null;
  stage: string;
  value: number | string | null;
  probability: number | null;
  expected_close: string | null;
  next_step: string | null;
  next_step_date: string | null;
  last_touch_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DealAnalysis = {
  deal: DealRow;
  stage: DealStage;
  open: boolean;
  value: number | null;
  probability: number;
  probabilityIsDefault: boolean;
  weighted: number;
  daysSinceTouch: number | null;
  overdueFollowUp: boolean;
  daysOverdue: number;
  cooling: boolean;
  missingNextStep: boolean;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

function daysBetween(fromISO: string, toISO: string) {
  const a = Date.parse(`${fromISO.slice(0, 10)}T12:00:00Z`);
  const b = Date.parse(`${toISO.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

export function analyzeDeal(deal: DealRow, today = todayISO()): DealAnalysis {
  const stage = (DEAL_STAGES as readonly string[]).includes(deal.stage)
    ? (deal.stage as DealStage)
    : "contato";
  const open = OPEN_STAGES.includes(stage);
  const rawValue = deal.value === null || deal.value === undefined ? null : Number(deal.value);
  const value = rawValue === null || Number.isNaN(rawValue) ? null : rawValue;
  const probabilityIsDefault = deal.probability === null || deal.probability === undefined;
  const probability = probabilityIsDefault ? DEFAULT_PROBABILITY[stage] : Number(deal.probability);
  const weighted = value === null ? 0 : (value * probability) / 100;

  const touch = deal.last_touch_at ?? deal.updated_at ?? deal.created_at;
  const daysSinceTouch = touch ? daysBetween(touch, today) : null;

  const daysOverdue =
    open && deal.next_step_date && deal.next_step_date < today
      ? (daysBetween(deal.next_step_date, today) ?? 0)
      : 0;

  return {
    deal,
    stage,
    open,
    value,
    probability,
    probabilityIsDefault,
    weighted,
    daysSinceTouch,
    overdueFollowUp: daysOverdue > 0,
    daysOverdue,
    cooling: open && daysSinceTouch !== null && daysSinceTouch >= COOLING_DAYS,
    missingNextStep: open && (!deal.next_step?.trim() || !deal.next_step_date),
  };
}

export type PipelineHealth = {
  total: number;
  open: number;
  won: number;
  lost: number;
  grossPipeline: number;
  weightedPipeline: number;
  expectedThisMonth: number;
  overdueFollowUps: DealAnalysis[];
  cooling: DealAnalysis[];
  missingNextStep: DealAnalysis[];
  openProposals: DealAnalysis[];
  byStage: { stage: DealStage; count: number; value: number }[];
  analyses: DealAnalysis[];
};

export function analyzePipeline(deals: DealRow[], today = todayISO()): PipelineHealth {
  const analyses = deals.map((d) => analyzeDeal(d, today));
  const open = analyses.filter((a) => a.open);
  const month = today.slice(0, 7);

  return {
    total: analyses.length,
    open: open.length,
    won: analyses.filter((a) => a.stage === "fechado").length,
    lost: analyses.filter((a) => a.stage === "perdido").length,
    grossPipeline: open.reduce((s, a) => s + (a.value ?? 0), 0),
    weightedPipeline: open.reduce((s, a) => s + a.weighted, 0),
    expectedThisMonth: open
      .filter((a) => a.deal.expected_close?.slice(0, 7) === month)
      .reduce((s, a) => s + a.weighted, 0),
    overdueFollowUps: open.filter((a) => a.overdueFollowUp).sort((x, y) => y.daysOverdue - x.daysOverdue),
    cooling: open.filter((a) => a.cooling && !a.overdueFollowUp),
    missingNextStep: open.filter((a) => a.missingNextStep),
    openProposals: open.filter((a) => a.stage === "proposta" || a.stage === "negociacao"),
    byStage: DEAL_STAGES.map((stage) => {
      const items = analyses.filter((a) => a.stage === stage);
      return { stage, count: items.length, value: items.reduce((s, a) => s + (a.value ?? 0), 0) };
    }),
    analyses,
  };
}

export function newContactsSince(
  contacts: { created_at: string }[],
  sinceISO: string,
) {
  return contacts.filter((c) => c.created_at.slice(0, 10) >= sinceISO).length;
}

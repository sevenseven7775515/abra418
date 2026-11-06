import { describe, expect, it } from "vitest";
import { analyzeDeal, analyzePipeline, type DealRow } from "./pipeline";

const base: DealRow = {
  id: "d1", title: "X", client_id: null, company_id: null, contact_id: null,
  stage: "proposta", value: 1000, probability: null, expected_close: "2026-11-20",
  next_step: "Ligar", next_step_date: "2026-11-01", last_touch_at: "2026-10-20",
  created_at: "2026-10-01", updated_at: "2026-10-20",
};
const today = "2026-11-06";

describe("pipeline", () => {
  it("usa probabilidade padrão de proposta (55%) quando não informada", () => {
    const a = analyzeDeal(base, today);
    expect(a.probability).toBe(55);
    expect(a.probabilityIsDefault).toBe(true);
    expect(a.weighted).toBe(550);
  });
  it("marca follow-up vencido com dias de atraso", () => {
    const a = analyzeDeal(base, today);
    expect(a.overdueFollowUp).toBe(true);
    expect(a.daysOverdue).toBe(5);
  });
  it("oportunidade sem toque há 7+ dias esfria", () => {
    expect(analyzeDeal(base, today).cooling).toBe(true);
  });
  it("oportunidade ativa sem próximo passo é sinalizada", () => {
    expect(analyzeDeal({ ...base, next_step: null }, today).missingNextStep).toBe(true);
  });
  it("fechado/perdido não entram no pipeline bruto", () => {
    const h = analyzePipeline([base, { ...base, id: "d2", stage: "fechado" }, { ...base, id: "d3", stage: "perdido" }], today);
    expect(h.grossPipeline).toBe(1000);
    expect(h.expectedThisMonth).toBe(550);
  });
});

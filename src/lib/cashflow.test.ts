import { describe, expect, it } from "vitest";
import { analyzeFlow, userFlowSeed } from "./cashflow";

const f = analyzeFlow(userFlowSeed(new Date(2026, 10, 6)));

describe("fluxo mensal informado", () => {
  it("entradas somam R$ 3.300 sem a Zanfer", () => expect(f.totalIn).toBe(3300));
  it("Zanfer salva no banco é ignorada", () =>
    expect(analyzeFlow([{ kind: "receita", description: "Felipe Zanfer", amount: 1500, recurrence: "mensal", due_date: null, category: "x" }]).totalIn).toBe(0));
  it("R$ 300/semana vira ~R$ 1.300/mês e saídas somam ~R$ 3.604,25", () =>
    expect(f.totalOut).toBeCloseTo(3604.25, 2));
  it("sobra mensal ~-R$ 304,25", () => expect(f.sobra).toBeCloseTo(-304.25, 2));
  it("dívidas somam R$ 20.000 e sem sobra não há prazo de quitação", () => {
    expect(f.totalDebt).toBe(20000);
    expect(f.mesesParaQuitar).toBeNull();
  });
});

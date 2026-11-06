import { describe, expect, it } from "vitest";
import { analyzeFlow, userFlowSeed } from "./cashflow";

const f = analyzeFlow(userFlowSeed(new Date(2026, 10, 6)));

describe("fluxo mensal informado", () => {
  it("entradas somam R$ 4.800", () => expect(f.totalIn).toBe(4800));
  it("R$ 300/semana vira ~R$ 1.300/mês e saídas somam ~R$ 3.604,25", () =>
    expect(f.totalOut).toBeCloseTo(3604.25, 2));
  it("sobra mensal ~R$ 1.195,75", () => expect(f.sobra).toBeCloseTo(1195.75, 2));
  it("dívidas somam R$ 20.000 e levam 17 meses com toda a sobra", () => {
    expect(f.totalDebt).toBe(20000);
    expect(f.mesesParaQuitar).toBe(17);
  });
});

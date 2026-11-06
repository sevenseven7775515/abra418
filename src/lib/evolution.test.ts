import { describe, expect, it } from "vitest";
import { billsDue, compareWindows, recurringImprovements, type EvoSignal } from "./evolution";

const sig = (o: Partial<EvoSignal>): EvoSignal => ({ id: Math.random().toString(), kind: "conta", description: "x", amount: null, due_date: null, entry_date: "2026-11-01", resolved: false, ...o });

describe("evolução", () => {
  it("contas vencendo em até 15 dias, incluindo vencidas, ordenadas", () => {
    const r = billsDue([sig({ due_date: "2026-11-30" }), sig({ due_date: "2026-11-10" }), sig({ due_date: "2026-11-01" }), sig({ due_date: "2026-11-05", resolved: true })], "2026-11-06");
    expect(r.map((s) => s.due_date)).toEqual(["2026-11-01", "2026-11-10"]);
  });
  it("compara últimos 30 dias com os 30 anteriores", () => {
    const r = compareWindows([
      { entry_date: "2026-11-01", mood: "bom", energy: 8 },
      { entry_date: "2026-09-20", mood: "dificil", energy: 4 },
    ], "2026-11-06");
    expect(r.energy).toEqual({ cur: 8, prev: 4 });
    expect(r.days).toEqual({ cur: 1, prev: 1 });
  });
  it("melhorias repetidas sobem para o topo", () => {
    const r = recurringImprovements([
      sig({ kind: "melhoria", description: "Acordar mais cedo todos os dias" }),
      sig({ kind: "melhoria", description: "acordar mais cedo amanhã" }),
      sig({ kind: "melhoria", description: "Ler mais" }),
    ]);
    expect(r[0]!.n).toBe(2);
  });
});

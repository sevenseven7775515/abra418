import { describe, expect, it } from "vitest";
import { compareSaturnDiary, saturnStatus, SATURN_2026, type SaturnEntry } from "./saturn";

const entry = (id: string, date: string, energy: number | null = 5): SaturnEntry => ({ id, entry_date: date, energy, mood: "bom", summary: `Relato ${id}` });

describe("Saturno 2026", () => {
  it("encerra a retrogradação em 10 de dezembro às 20:23 de São Paulo", () => {
    expect(SATURN_2026.directAt).toBe("2026-12-10T23:23:00Z");
    expect(saturnStatus(new Date("2026-12-10T23:22:59Z"))).toBe("Saturno retrógrado em Áries");
    expect(saturnStatus(new Date("2026-12-10T20:23:00-03:00"))).toBe("Saturno direto · pós-sombra");
  });
  it("inicia a retrogradação em 26 de julho", () => {
    expect(saturnStatus(new Date("2026-07-26T19:56:59Z"))).toBe("Antes da retrogradação");
    expect(saturnStatus(new Date("2026-07-26T19:57:00Z"))).toBe("Saturno retrógrado em Áries");
  });
  it("encerra a pós-sombra em 15 de março no calendário local", () => {
    expect(saturnStatus(new Date("2027-03-16T02:59:00Z"))).toBe("Saturno direto · pós-sombra");
    expect(saturnStatus(new Date("2027-03-16T03:00:00Z"))).toBe("Ciclo de 2026 encerrado");
  });
  it("compara só relatos existentes, exclui futuro e preserva IDs de evidência", () => {
    const result = compareSaturnDiary([entry("a", "2026-07-25"), entry("b", "2026-07-26", 2), entry("c", "2026-08-01", 4), entry("d", "2026-11-07", 6), entry("future", "2026-12-11"), entry("old", "2025-12-01")], "2026-11-07");
    expect(result.map((p) => p.days)).toEqual([1, 3, 0]);
    expect(result[1]?.energy).toBe(4);
    expect(result[1]?.evidence.map((e) => e.id)).toEqual(["d", "c", "b"]);
    expect(result[2]?.energy).toBeNull();
  });
  it("não apresenta média como padrão quando há menos de três medições", () => {
    expect(compareSaturnDiary([entry("a", "2026-08-01")], "2026-11-07")[1]?.energy).toBeNull();
  });
});
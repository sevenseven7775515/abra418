import { describe, expect, it } from "vitest";
import { natalReading, SHEM_ANGELS, GOETIA } from "./natal";
import { scoreEnneagram, ENNEAGRAM_QUESTIONS } from "./enneagram-test";
import { cleanJournalText } from "./journal-parse";

describe("natal", () => {
  it("has 72 angels and 72 spirits", () => { expect(SHEM_ANGELS).toHaveLength(72); expect(GOETIA).toHaveLength(72); });
  it("0° Leão (~23 jul) = Vehuiah e Bael/Phenex", () => {
    const r = natalReading(new Date("2026-07-23T12:00:00-03:00"));
    expect(r.sign.name).toBe("Leão");
    expect(r.angel.name).toBe("Vehuiah");
    expect(r.daimonDay.name).toBe("Bael");
    expect(r.daimonNight.name).toBe("Phenex");
  });
});
describe("eneagrama", () => {
  it("picks highest type", () => {
    const a = ENNEAGRAM_QUESTIONS.map((q) => (q.type === "5" ? 5 : q.type === "4" ? 3 : 1));
    expect(scoreEnneagram(a)).toMatchObject({ main: "5", wing: "4" });
  });
});
describe("diário", () => {
  it("removes RTF residue", () => {
    expect(cleanJournalText("eftab720tightenfactor0\nSequência dos acontecimentos\\\n\\*\\*\\disc\\")).toBe("Sequência dos acontecimentos");
  });
});

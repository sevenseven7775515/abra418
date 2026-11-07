import { describe, expect, it } from "vitest";
import { bookKey, deriveDiaryBooks, type BookJournal, type DiaryBookRow } from "./diary-books";
const book = (title: string, status = "lendo"): DiaryBookRow => ({ id: title, title, status, author: null, learnings: null });
const journal = (content: string, date = "2026-11-03"): BookJournal => ({ id: date, entry_date: date, content, highlights: null, achievements: null });
describe("Livros a partir dos relatos", () => {
  it("consolida duplicatas e reconhece conclusão sem rebaixar por menção posterior", () => {
    const result = deriveDiaryBooks([book("Essencialismo"), book(" essencialismo ")], [journal('Finalizei mais uma vez, o livro “Essencialismo” de Greg Mckeown.'), journal('Li o livro Essencialismo novamente.', "2026-11-04")], [], []);
    expect(result).toHaveLength(1); expect(result[0]?.status).toBe("concluido"); expect(result[0]?.finishedDate).toBe("2026-11-03");
  });
  it("não confunde capítulos finalizados com livro terminado", () => {
    const result = deriveDiaryBooks([book("Einstein: Sua Vida, Seu Universo")], [journal("Finalizei os dois primeiros capítulos do livro Einstein: Sua Vida, Seu Universo.")], [], []);
    expect(result[0]?.status).toBe("lendo"); expect(result[0]?.finishedDate).toBeNull();
  });
  it("não conclui por negação, desejo ou sinal sem confirmação textual", () => {
    for (const text of ["Não finalizei o livro Sapiens.", "Quero terminar o livro Sapiens.", "Mencionei Sapiens."]) {
      expect(deriveDiaryBooks([book("Sapiens")], [journal(text)], [], [{ journal_id: "2026-11-03", entry_date: "2026-11-03", description: "Sapiens" }])[0]?.status).toBe("citado");
    }
  });
  it("encontra livros finalizados no texto mesmo sem cadastro anterior", () => {
    const result = deriveDiaryBooks([], [journal('Finalizei o livro fundamentos da psicologia analitica, de Jung.')], [], []);
    expect(result[0]?.title).toBe("fundamentos da psicologia analitica"); expect(result[0]?.status).toBe("concluido"); expect(result[0]?.evidence[0]?.journalId).toBe("2026-11-03");
  });
  it("normaliza acentos e artigos, sem juntar volumes diferentes", () => {
    expect(bookKey("O Caibalion")).toBe(bookKey("Caibalion"));
    expect(bookKey("Clavículas de Salomão")).toBe("claviculas de salomao");
    expect(bookKey("Monografia 1 do Lote 4")).not.toBe(bookKey("Monografia 2 do Lote 4"));
  });
  it("não usa o estado antigo nem exibe livros sem fonte no diário", () => {
    expect(deriveDiaryBooks([book("Não registrado", "concluido")], [], [], [])).toEqual([]);
    expect(deriveDiaryBooks([book("Sapiens", "concluido")], [journal("Mencionei Sapiens.")], [], [])[0]?.status).toBe("citado");
  });
});
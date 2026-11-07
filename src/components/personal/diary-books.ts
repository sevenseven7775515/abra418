import { cleanJournalText } from "@/lib/journal-parse";

export type DiaryBookRow = { id: string; title: string; author: string | null; status: string; learnings: string | null };
export type BookJournal = { id: string; entry_date: string; content: string | null; highlights: string | null; achievements: string | null };
export type BookMention = { journal_id: string; books: string[] };
export type BookSignal = { journal_id: string; description: string; entry_date: string };
export type BookEvidence = { journalId: string; date: string; excerpt: string; kind: "citado" | "lendo" | "concluido" };
export type DiaryBook = { id: string; title: string; author: string | null; status: "citado" | "lendo" | "concluido"; learnings: string | null; evidence: BookEvidence[]; finishedDate: string | null };

export function bookKey(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/^(?:o|a|os|as) /, "");
}

const FINISH = /\b(?:finalizei|finalizou|terminei|terminou|conclui|concluiu|acabei de ler|terminei de ler|conclui a leitura de)\s+(?:(?:mais uma vez|novamente|a leitura (?:do|de)|o livro|a obra|o|a|livro)\s+)*/;
const NEGATIVE = /\b(?:nao|nunca|ainda nao)\s+(?:(?:o|a)\s+)?$/;

function kindFor(sentence: string, title: string): BookEvidence["kind"] | null {
  const text = bookKey(sentence), key = bookKey(title);
  if (!key || !(" " + text + " ").includes(" " + key + " ")) return null;
  // Only completed whole works: chapter/page/part completion cannot reach the title directly.
  const match = text.match(FINISH);
  if (match && match.index !== undefined && !NEGATIVE.test(text.slice(0, match.index))) {
    const rest = text.slice(match.index + match[0].length).replace(/^(?:o|a|os|as) /, "");
    if (rest === key || rest.startsWith(key + " ")) return "concluido";
  }
  const before = text.slice(0, text.indexOf(key));
  if (/\b(?:li|lendo|leitura|lendo o livro|comecei (?:a ler|o livro)|capitulo|paginas?)\b/.test(before) && !/\b(?:quero|pretendo|vou|nao)\b/.test(before)) return "lendo";
  return "citado";
}

/** Read-only view: existing book metadata is preserved, statuses require diary evidence. */
export function deriveDiaryBooks(stored: DiaryBookRow[], journals: BookJournal[], mentions: BookMention[], signals: BookSignal[]): DiaryBook[] {
  const candidates = new Map<string, DiaryBook>();
  const add = (title: string, row?: DiaryBookRow) => {
    const cleaned = cleanJournalText(title).replace(/[\u0093\u0094“”"]/g, "").trim();
    const key = bookKey(cleaned);
    if (key.length < 3) return;
    const existing = candidates.get(key);
    if (existing) { existing.author ??= row?.author ?? null; existing.learnings ??= row?.learnings ?? null; return; }
    candidates.set(key, { id: key, title: cleaned, author: row?.author ?? null, status: "citado", learnings: row?.learnings ?? null, evidence: [], finishedDate: null });
  };
  stored.forEach((b) => add(b.title, b));
  mentions.forEach((m) => m.books.forEach((b) => add(b)));
  signals.forEach((s) => add(s.description));
  const sentences = new Map<string, string[]>();
  for (const journal of journals) {
    const text = cleanJournalText([journal.content, journal.highlights, journal.achievements].filter(Boolean).join("\n"))
      .replace(/[\u0093\u0094]/g, '"').replace(/\[[^\]]{2,30}\]/g, ". ").replace(/\n+/g, " ");
    const parts = text.split(/[.!?;]+/).map((s) => s.trim()).filter(Boolean);
    sentences.set(journal.id, parts);
    for (const part of parts) {
      const captured = part.match(/(?:finalizei|terminei|concluí|conclui|acabei de ler)\s+(?:mais uma vez,?\s*)?(?:o\s+)?livro\s*:?\s*["“]?(.+?)(?:["”]|,\s*(?:de|do|da)\s|$)/i)?.[1];
      if (captured && captured.length < 150) add(captured);
    }
  }
  const journalById = new Map(journals.map((j) => [j.id, j]));
  for (const book of candidates.values()) {
    for (const journal of journals) {
      for (const sentence of sentences.get(journal.id) ?? []) {
        const kind = kindFor(sentence, book.title);
        if (kind) book.evidence.push({ journalId: journal.id, date: journal.entry_date, excerpt: sentence, kind });
      }
    }
    for (const mention of mentions) {
      const journal = journalById.get(mention.journal_id);
      if (journal && mention.books.some((b) => bookKey(b) === book.id) && !book.evidence.some((e) => e.journalId === journal.id))
        book.evidence.push({ journalId: journal.id, date: journal.entry_date, excerpt: `Livro citado na análise deste diário: ${book.title}`, kind: "citado" });
    }
    book.evidence.sort((a, b) => b.date.localeCompare(a.date));
    const finished = book.evidence.find((e) => e.kind === "concluido");
    book.status = finished ? "concluido" : book.evidence.some((e) => e.kind === "lendo") ? "lendo" : "citado";
    book.finishedDate = finished?.date ?? null;
  }
  return [...candidates.values()].filter((b) => b.evidence.length).sort((a, b) => (b.finishedDate ?? b.evidence[0]?.date ?? "").localeCompare(a.finishedDate ?? a.evidence[0]?.date ?? "") || a.title.localeCompare(b.title));
}
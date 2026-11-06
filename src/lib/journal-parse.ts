/** Leitura e normalização de arquivos de diário histórico (client-side). */

export type ParsedFile = {
  fileName: string;
  date: string | null;
  title: string | null;
  content: string;
};

const MONTHS: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
  janeiro: 1, fevereiro: 2, marco: 3, março: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function valid(y: number, m: number, d: number): string | null {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Detecta a data em nomes de arquivo ou texto: 2024-05-03, 03/05/2024, 3 de maio de 2024. */
export function detectDate(text: string): string | null {
  const iso = text.match(/(20\d{2}|19\d{2})[-_.\/](\d{1,2})[-_.\/](\d{1,2})/);
  if (iso) {
    const r = valid(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    if (r) return r;
  }
  const br = text.match(/\b(\d{1,2})[-_.\/](\d{1,2})[-_.\/](20\d{2}|19\d{2}|\d{2})\b/);
  if (br) {
    let y = Number(br[3]);
    if (y < 100) y += y > 50 ? 1900 : 2000;
    const r = valid(y, Number(br[2]), Number(br[1]));
    if (r) return r;
  }
  const ext = text
    .toLowerCase()
    .match(/\b(\d{1,2})\s*(?:de\s*)?([a-zçã]{3,9})\.?\s*(?:de\s*)?((?:19|20)\d{2})\b/);
  if (ext) {
    const key = ext[2] ?? "";
    const m = MONTHS[key] ?? MONTHS[key.slice(0, 3)];
    if (m) {
      const r = valid(Number(ext[3]), m, Number(ext[1]));
      if (r) return r;
    }
  }
  return null;
}

function rtfToText(rtf: string): string {
  return rtf
    .replace(/\\'([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\{\\\*?[^{}]*\}/g, " ")
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\line/g, "\n")
    .replace(/\\[a-z]+-?\d*\s?/gi, "")
    .replace(/[{}]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function readText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(buf);
  } catch {
    return new TextDecoder("iso-8859-1").decode(buf);
  }
}

export async function parseJournalFile(file: File): Promise<ParsedFile> {
  const name = file.name;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  let raw = "";

  if (ext === "docx") {
    const mammoth = (await import("mammoth/mammoth.browser")) as unknown as {
      extractRawText: (opts: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
    };
    const buf = await file.arrayBuffer();
    const res = await mammoth.extractRawText({ arrayBuffer: buf });
    raw = res.value;
  } else if (ext === "rtf") {
    raw = cleanJournalText(rtfToText(await readText(file)));
  } else {
    raw = await readText(file);
  }

  const content = raw.replace(/\r\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
  const head = content.slice(0, 400);
  const date = detectDate(name) ?? detectDate(head);
  const firstLine = content.split("\n").find((l) => l.trim().length > 0)?.trim() ?? "";
  const title = firstLine.length > 0 && firstLine.length <= 120 ? firstLine : name.replace(/\.[^.]+$/, "");

  return { fileName: name, date, title, content };
}

export const ACCEPTED_EXTENSIONS = ".txt,.md,.markdown,.rtf,.docx";

/** Limpa resíduos de RTF/markdown já gravados (só exibição; não altera o banco). */
export function cleanJournalText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/\\'([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\\*\\?[a-z]*\\?/gi, " ")
    .replace(/\\[a-z]+-?\d*/gi, " ")
    .replace(/(?:eftab\d+|partightenfactor\d*|tightenfactor\d+|pardirnatural)/gi, " ")
    .replace(/\\(?=\s|$)/g, "")
    .replace(/[{}]/g, "")
    .replace(/^\s*[\\*\s]+\s*$/gm, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function cleanJournalTitle(title: string | null | undefined): string {
  const t = cleanJournalText(title);
  return /[a-zà-ú]{3,}/i.test(t) && t.length <= 120 ? t : "";
}

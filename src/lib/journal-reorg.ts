/** Limpeza profunda e estruturação dos diários já importados (sem IA, determinístico). */

import { detectDate } from "./journal-parse";

export type DayEvent = {
  time: string | null;
  description: string;
  category: string;
};

export type DetectedPractice = {
  name: string;
  category: string;
  time: string | null;
  description: string;
};

export type StructuredDay = {
  content: string;
  title: string;
  summary: string;
  mainActivities: string;
  achievements: string | null;
  pending: string | null;
  insights: string | null;
  events: DayEvent[];
  practices: DetectedPractice[];
};

/* ------------------------------------------------------------------ limpeza */

const JUNK_TOKENS = [
  "tightenfactor0", "irnatural", "expnd0", "expndtw0", "kerning0", "outl0", "strokewidth0",
  "strokec2", "strokec3", "cf0", "cf2", "cb1", "fs24", "fs26", "fs28", "fs22", "fs20",
  "pardirnatural", "partightenfactor0", "ltrch", "ltrpar", "qc", "ql", "sa0", "sl0",
];

const JUNK_LINE =
  /^(?:[\\{}*\s\u00a0]|disc|pard|par|tx\d+|li\d+|fi-?\d+|f\d+|fs\d+|cf\d+|b0|i0|ulnone|sb\d+|sa\d+|tightenfactor0|irnatural|expnd\w*|kerning\d+|outl\d+|strokewidth\d+|strokec\d+|listtext|marglsxn\d+|pntext|pnlvlblt|pnf\d+|pnindent\d+)+$/i;

/** Remove resíduos de RTF/Markdown quebrado preservando o texto real. */
export function cleanJournalText(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n");

  // remove blocos de controle e tabelas de fontes/cores remanescentes
  text = text.replace(/\{\\\*?[^{}]*\}/g, " ");

  const lines = text.split("\n").map((line) => {
    let l = line;
    l = l.replace(/\\'([0-9a-f]{2})/gi, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
    l = l.replace(/\\(?:disc|pard|pardirnatural|partightenfactor0|listtext|pntext|pnlvlblt|par|line|tab|ls\d*|ilvl\d*|fi-?\d+|li\d+|tx\d+|sa\d+|sb\d+|sl\d+|slmult\d+|f\d+|fs\d+|cf\d+|cb\d+|b0?|i0?|ulnone|ul|expnd\w*|kerning\d+|outl\d+|strokewidth-?\d+|strokec\d+|uc\d+|u-?\d+)\b\s?/gi, " ");
    for (const t of JUNK_TOKENS) l = l.split(t).join(" ");
    l = l.replace(/[{}]/g, " ");
    l = l.replace(/\\\*/g, " ");
    l = l.replace(/(?<![A-Za-zÀ-ÿ0-9])\\(?![A-Za-zÀ-ÿ0-9])/g, " ");
    l = l.replace(/\\$/g, " ");
    l = l.replace(/[ \t\u00a0]+/g, " ");
    return l.trim();
  });

  const kept = lines.filter((l) => l.length > 0 && !JUNK_LINE.test(l) && !/^[•\-–—*\s]+$/.test(l));

  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* -------------------------------------------------------------- classificação */

const CATEGORY_RULES: { category: string; words: string[] }[] = [
  { category: "espiritualidade", words: ["thelema", "cabala", "qabalah", "tarô", "taro", "tarot", "astrolog", "ritual", "pentagrama", "arcanjo", "exu", "invoca", "banimento", "liber", "hexagrama", "magick", "oração", "oracao", "reza", "hooponopono", "afirmaç"] },
  { category: "praticas", words: ["medita", "pranayama", "mantra", "asana", "yoga", "dharana", "dhyana", "respira", "concentraç", "vipassana", "japa", "prática", "pratica", "exercício de", "alongamento", "academia", "treino", "caminhada", "corrida"] },
  { category: "estudos", words: ["estud", "curso", "aula", "leitura", "li ", "livro", "inglês", "ingles", "idioma", "pesquis", "aprend", "anki", "revisão", "revisao"] },
  { category: "profissional", words: ["cliente", "projeto", "reunião", "reuniao", "marketing", "trabalh", "empresa", "negóci", "negoci", "proposta", "orçamento", "orcamento", "venda", "e-mail", "email", "freela"] },
  { category: "lazer", words: ["jogo", "videogame", "filme", "série", "serie", "descans", "música", "musica", "youtube", "netflix", "passeio", "lazer"] },
  { category: "rotina", words: ["acord", "dormi", "higiene", "banho", "remédio", "remedio", "medicaç", "medicac", "refeiç", "refeic", "almoç", "janta", "café", "cafe", "chá", "cha ", "família", "familia", "esposa", "filho", "criança", "crianca", "casa", "limpeza", "lixo", "compra", "mercado", "cozinh"] },
];

export function classify(text: string): string {
  const t = ` ${text.toLowerCase()} `;
  for (const rule of CATEGORY_RULES) {
    if (rule.words.some((w) => t.includes(w))) return rule.category;
  }
  return "rotina";
}

const PRACTICE_RULES: { name: string; category: string; words: string[]; description: string }[] = [
  { name: "Pranayama", category: "espiritual", words: ["pranayama", "respiração consciente", "respiracao consciente"], description: "Prática respiratória realizada como exercício de concentração e preparação meditativa." },
  { name: "Meditação", category: "espiritual", words: ["medita", "dhyana", "vipassana"], description: "Sessão de meditação para aquietar a mente e ampliar a consciência." },
  { name: "Dharana", category: "espiritual", words: ["dharana", "concentração em", "concentracao em"], description: "Exercício de concentração sustentada em um único objeto." },
  { name: "Mantra", category: "espiritual", words: ["mantra", "japa", "entoa"], description: "Recitação de mantra como prática vibratória e de foco." },
  { name: "Ritual", category: "espiritual", words: ["ritual", "pentagrama", "hexagrama", "banir", "banimento", "invoquei", "invocação", "invocacao"], description: "Trabalho ritual de banimento e invocação conforme a prática tradicional." },
  { name: "Oração", category: "espiritual", words: ["oração", "oracao", "orações", "oracoes", "rezei"], description: "Momento de oração e conexão espiritual." },
  { name: "Tarô", category: "espiritual", words: ["tarô", "taro", "tarot", "cartas"], description: "Consulta e estudo simbólico através das cartas." },
  { name: "Asana / Yoga", category: "corpo", words: ["asana", "yoga", "alongamento", "postura"], description: "Prática corporal de posturas e alongamento." },
  { name: "Exercício físico", category: "corpo", words: ["treino", "academia", "corrida", "caminhada", "exercício físico", "exercicio fisico", "flexõe", "flexoe"], description: "Atividade física realizada para condicionamento e disposição." },
  { name: "Leitura", category: "estudo", words: ["leitura", "li um", "li o", "li a ", "lendo"], description: "Sessão de leitura registrada no diário." },
  { name: "Estudo", category: "estudo", words: ["estudei", "estudo de", "curso", "aula", "revisei"], description: "Sessão de estudo registrada no diário." },
  { name: "Afirmações", category: "mental", words: ["afirmaç", "afirmac", "hooponopono"], description: "Prática de afirmações positivas e reprogramação mental." },
];

export function detectPractices(text: string, time: string | null): DetectedPractice[] {
  const t = text.toLowerCase();
  const out: DetectedPractice[] = [];
  for (const rule of PRACTICE_RULES) {
    if (rule.words.some((w) => t.includes(w))) {
      out.push({ name: rule.name, category: rule.category, time, description: `${rule.description} Registro: "${text.slice(0, 220)}"` });
    }
  }
  return out;
}

/* ----------------------------------------------------------------- estrutura */

const TIME_LINE = /^(\d{1,2})[:h](\d{2})\s*[-–—•]?\s*(.*)$/;
const HEADER_LINE = /^\d{1,2}\s+de\s+[A-Za-zçãéíóúÇÃÉ]+\s+de\s+\d{4}/i;

function normTime(h: string, m: string): string {
  return `${h.padStart(2, "0")}:${m}`;
}

/** Data oficial: 1º nome do arquivo, 2º conteúdo, 3º null (pede confirmação). */
export function resolveDate(sourceFile: string | null, content: string): { date: string | null; origin: "arquivo" | "conteudo" | "nenhum" } {
  const fromName = sourceFile ? detectDate(sourceFile) : null;
  if (fromName) return { date: fromName, origin: "arquivo" };
  const fromText = detectDate(content.slice(0, 600));
  if (fromText) return { date: fromText, origin: "conteudo" };
  return { date: null, origin: "nenhum" };
}

function pickLines(lines: string[], words: string[]): string[] {
  return lines.filter((l) => {
    const t = l.toLowerCase();
    return words.some((w) => t.includes(w));
  });
}

export function structureDay(rawContent: string, sourceFile: string | null, dateISO: string | null): StructuredDay {
  const content = cleanJournalText(rawContent);
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);

  const events: DayEvent[] = [];
  const practices: DetectedPractice[] = [];
  const blockTitles: string[] = [];

  let currentTime: string | null = null;

  for (const [idx, line] of lines.entries()) {
    if (idx < 2 && HEADER_LINE.test(line)) continue;
    const m = line.match(TIME_LINE);
    if (m) {
      currentTime = normTime(m[1]!, m[2]!);
      const label = (m[3] ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
      if (label) {
        blockTitles.push(`${currentTime} ${label}`);
        events.push({ time: currentTime, description: label.trim(), category: classify(label) });
        practices.push(...detectPractices(label, currentTime));
      }
      continue;
    }
    if (line.length < 3) continue;
    const clean = line.replace(/^[^\p{L}\p{N}"“(]+/u, "").trim();
    if (!clean || clean.length < 3) continue;
    events.push({ time: currentTime, description: clean.slice(0, 500), category: classify(clean) });
    practices.push(...detectPractices(clean, currentTime));
  }

  // deduplica práticas por nome+horário
  const seen = new Set<string>();
  const uniquePractices = practices.filter((p) => {
    const k = `${p.name}|${p.time ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const insights = pickLines(lines, ["percebi", "aprendi", "insight", "reflex", "compreendi", "entendi que", "conclusão", "conclusao"]);
  const pending = pickLines(lines, ["pendente", "preciso", "falta ", "amanhã", "amanha", "não consegui", "nao consegui", "deixei para"]);
  const achievements = pickLines(lines, ["consegui", "finalizei", "concluí", "conclui", "terminei", "entreguei", "conquist"]);

  const times = events.map((e) => e.time).filter((t): t is string => !!t).sort();
  const catCount = new Map<string, number>();
  for (const e of events) catCount.set(e.category, (catCount.get(e.category) ?? 0) + 1);
  const topCats = [...catCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, n]) => `${c} (${n})`);

  const dayLabel = dateISO ? dateISO.split("-").reverse().join("/") : (sourceFile ?? "sem data");
  const summaryParts = [
    `${events.length} registro(s) do dia ${dayLabel}`,
    times.length ? `das ${times[0]} às ${times[times.length - 1]}` : null,
    topCats.length ? `foco em ${topCats.join(", ")}` : null,
    uniquePractices.length ? `${uniquePractices.length} prática(s) identificada(s): ${uniquePractices.map((p) => p.name).join(", ")}` : null,
  ].filter(Boolean);

  const title = sourceFile
    ? sourceFile.replace(/\.[^.]+$/, "")
    : `Diário ${dayLabel}`;

  return {
    content,
    title,
    summary: summaryParts.join(" · "),
    mainActivities: blockTitles.join("\n"),
    achievements: achievements.length ? achievements.slice(0, 12).join("\n") : null,
    pending: pending.length ? pending.slice(0, 12).join("\n") : null,
    insights: insights.length ? insights.slice(0, 12).join("\n") : null,
    events,
    practices: uniquePractices,
  };
}

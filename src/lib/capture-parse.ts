/** Normalização determinística de texto colado (WhatsApp, notas soltas). Sem IA. */

import { detectDate } from "./journal-parse";
import { structureDay, type DayEvent, type DetectedPractice } from "./journal-reorg";

const WHATSAPP_LINE =
  /^\[?(\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4})[,]?\s+(\d{1,2}:\d{2})(?::\d{2})?\]?\s*(?:[-–]\s*)?([^:]{1,40}):\s?(.*)$/;

export type NormalizedCapture = {
  /** Texto limpo, uma linha por mensagem, prefixado por horário quando existir. */
  text: string;
  /** Datas encontradas nas mensagens, da mais frequente para a menos. */
  dates: string[];
  source: "whatsapp" | "manual";
  messages: number;
};

function brToISO(d: string): string | null {
  const parts = d.split(/[\/.]/).map(Number);
  if (parts.length !== 3) return null;
  let [dd, mm, yy] = parts as [number, number, number];
  if (yy < 100) yy += yy > 50 ? 1900 : 2000;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

export function normalizeCapture(raw: string): NormalizedCapture {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  const dateCount = new Map<string, number>();
  let messages = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(WHATSAPP_LINE);
    if (m) {
      messages += 1;
      const iso = brToISO(m[1]!);
      if (iso) dateCount.set(iso, (dateCount.get(iso) ?? 0) + 1);
      const body = (m[4] ?? "").trim();
      if (body && !/^(mensagem apagada|áudio ocultado|imagem ocultada|figurinha omitida)/i.test(body)) {
        out.push(`${m[2]} ${body}`);
      }
      continue;
    }
    out.push(trimmed);
  }

  const dates = [...dateCount.entries()].sort((a, b) => b[1] - a[1]).map(([d]) => d);
  if (!dates.length) {
    const found = detectDate(raw);
    if (found) dates.push(found);
  }

  return {
    text: out.join("\n"),
    dates,
    source: messages > 0 ? "whatsapp" : "manual",
    messages,
  };
}

export type CaptureProposal = {
  date: string | null;
  dateOrigin: "mensagens" | "conteudo" | "hoje";
  source: "whatsapp" | "manual";
  cleanText: string;
  title: string;
  summary: string;
  mainActivities: string;
  achievements: string | null;
  pending: string | null;
  insights: string | null;
  events: DayEvent[];
  practices: DetectedPractice[];
};

export function buildProposal(raw: string, fallbackDate: string): CaptureProposal {
  const normalized = normalizeCapture(raw);
  const date = normalized.dates[0] ?? null;
  const structured = structureDay(normalized.text, null, date ?? fallbackDate);

  return {
    date: date ?? fallbackDate,
    dateOrigin: normalized.dates.length ? "mensagens" : detectDate(raw) ? "conteudo" : "hoje",
    source: normalized.source,
    cleanText: structured.content,
    title: `Captura ${(date ?? fallbackDate).split("-").reverse().join("/")}`,
    summary: structured.summary,
    mainActivities: structured.mainActivities,
    achievements: structured.achievements,
    pending: structured.pending,
    insights: structured.insights,
    events: structured.events,
    practices: structured.practices,
  };
}

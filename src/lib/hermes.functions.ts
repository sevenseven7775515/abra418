import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { buildHermesSnapshot, type HermesSnapshot } from "./hermes-context";
import { analyzePipeline, todayISO, type DealRow } from "./pipeline";

const NO_INVENTION =
  "Regras invioláveis: use SOMENTE os dados do JSON fornecido. Nunca invente empresas, clientes, valores, datas ou fatos. " +
  "Se o JSON não sustentar uma afirmação, escreva explicitamente 'não há dados suficientes registrados'. " +
  "Toda recomendação deve citar a evidência (tipo, nome e data) presente no JSON. Responda em português do Brasil, " +
  "tom prático e direto de operador — sem linguagem mística.";

function extractJson<T>(text: string, fallback: T): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) return fallback;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return fallback;
  }
}

async function generate(system: string, prompt: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Inteligência indisponível: chave de IA ausente.");
  const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  const { streamText } = await import("ai");
  const gateway = createLovableAiGatewayProvider(key);
  const result = streamText({
    model: gateway("google/gemini-3.6-flash"),
    system,
    prompt,
  });
  return await result.text;
}

/** Snapshot determinístico completo — sem IA. */
export const getHermesSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => buildHermesSnapshot(context.supabase));

export type BriefContent = {
  estado: string;
  foco: string;
  prioridades: { titulo: string; motivo: string; evidencias: string[]; dominio: string }[];
  parados: string[];
  comercial: string;
  pessoal: string;
  comparativo?: string;
  semDados?: string[];
};

const GenerateInput = z.object({ kind: z.enum(["diario", "semanal"]) });

export const generateBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => GenerateInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const snapshot = await buildHermesSnapshot(supabase);
    const today = todayISO();

    let comparativo: Record<string, unknown> | null = null;
    if (data.kind === "semanal") {
      comparativo = await weeklyComparison(supabase, today);
    }

    const semDados: string[] = [];
    if (!snapshot.temDadosComerciais) semDados.push("Nenhuma oportunidade comercial registrada.");
    if (!snapshot.temDadosPessoais) semDados.push("Nenhum registro de diário disponível.");

    const fallback: BriefContent = {
      estado: "Briefing gerado a partir dos dados registrados.",
      foco: snapshot.prioridades[0]?.titulo ?? "Sem prioridade calculada — não há dados suficientes registrados.",
      prioridades: snapshot.prioridades.slice(0, 3).map((p) => ({
        titulo: p.titulo,
        motivo: p.motivo,
        evidencias: p.evidencias.map((e) => `${e.tipo}: ${e.ref}${e.data ? ` (${e.data})` : ""}`),
        dominio: p.dominio,
      })),
      parados: snapshot.comercial.criticos.map((c) => `${c.titulo} — ${c.problema}`),
      comercial: snapshot.temDadosComerciais
        ? `${snapshot.comercial.abertas} oportunidade(s) aberta(s).`
        : "Não há dados suficientes registrados.",
      pessoal: snapshot.temDadosPessoais
        ? `Último diário em ${snapshot.estado.ultimoDiario}.`
        : "Não há dados suficientes registrados.",
      semDados,
    };

    let content = fallback;
    try {
      const text = await generate(
        `Você é o HERMES, camada de direção de um sistema pessoal. Gere um briefing ${
          data.kind === "diario" ? "diário" : "semanal"
        }. ${NO_INVENTION} Responda SOMENTE com JSON válido no formato: ` +
          '{"estado":string,"foco":string,"prioridades":[{"titulo":string,"motivo":string,"evidencias":[string],"dominio":string}],' +
          '"parados":[string],"comercial":string,"pessoal":string' +
          (data.kind === "semanal" ? ',"comparativo":string' : "") +
          "}. As prioridades devem ser as mesmas já calculadas no campo `prioridades` do JSON, apenas redigidas de forma clara.",
        `Contexto (JSON):\n${JSON.stringify({ snapshot, comparativo })}`,
      );
      const parsed = extractJson<Partial<BriefContent>>(text, {});
      content = {
        ...fallback,
        ...parsed,
        prioridades: parsed.prioridades?.length ? parsed.prioridades : fallback.prioridades,
        semDados,
      };
    } catch {
      // Falha de IA não impede o briefing determinístico.
    }

    const sources = snapshot.prioridades.flatMap((p) => p.evidencias);

    const { data: brief, error } = await supabase
      .from("hermes_briefs")
      .insert({
        user_id: userId,
        kind: data.kind,
        ref_date: today,
        content: { ...content, snapshot, comparativo } as never,
        sources: sources as never,
      })
      .select()
      .single();
    if (error) throw error;

    // Sugestões acionáveis (determinísticas, com evidência)
    const top = snapshot.prioridades.slice(0, 5);
    if (top.length) {
      const { data: pending } = await supabase
        .from("hermes_suggestions")
        .select("title, status")
        .eq("status", "pendente");
      const existing = new Set((pending ?? []).map((s) => s.title));
      const rows = top
        .filter((p) => !existing.has(p.titulo))
        .map((p) => ({
          user_id: userId,
          brief_id: brief.id,
          title: p.titulo,
          rationale: p.motivo,
          evidence: p.evidencias as never,
          domain: p.dominio === "comercial" ? "comercial" : "pessoal",
          score: p.score,
          deal_id: p.id.startsWith("deal-") ? p.id.split("-").slice(2).join("-") : null,
        }));
      if (rows.length) await supabase.from("hermes_suggestions").insert(rows);
    }

    return { brief, content, snapshot };
  });

async function weeklyComparison(supabase: Parameters<typeof buildHermesSnapshot>[0], today: string) {
  const day = 86_400_000;
  const d = (n: number) => new Date(Date.now() - n * day).toISOString().slice(0, 10);
  const thisWeek = d(7);
  const prevWeek = d(14);

  const [deals, events, journal, logs, contacts] = await Promise.all([
    supabase.from("deals").select("*").limit(300),
    supabase.from("deal_events").select("id, occurred_at, kind").gte("occurred_at", `${prevWeek}T00:00:00Z`).limit(500),
    supabase.from("journal_entries").select("entry_date, mood, energy").gte("entry_date", prevWeek).limit(60),
    supabase.from("practice_logs").select("log_date").gte("log_date", prevWeek).limit(500),
    supabase.from("contacts").select("created_at").gte("created_at", `${prevWeek}T00:00:00Z`).limit(300),
  ]);

  const inRange = <T>(rows: T[], get: (r: T) => string, from: string, to: string) =>
    rows.filter((r) => {
      const v = get(r).slice(0, 10);
      return v >= from && v < to;
    }).length;

  const de = events.data ?? [];
  const pipeline = analyzePipeline((deals.data ?? []) as unknown as DealRow[], today);

  return {
    atividadeComercial: {
      atual: inRange(de, (r) => r.occurred_at, thisWeek, "9999"),
      anterior: inRange(de, (r) => r.occurred_at, prevWeek, thisWeek),
    },
    novosContatos: {
      atual: inRange(contacts.data ?? [], (r) => r.created_at, thisWeek, "9999"),
      anterior: inRange(contacts.data ?? [], (r) => r.created_at, prevWeek, thisWeek),
    },
    diarios: {
      atual: inRange(journal.data ?? [], (r) => r.entry_date, thisWeek, "9999"),
      anterior: inRange(journal.data ?? [], (r) => r.entry_date, prevWeek, thisWeek),
    },
    praticas: {
      atual: inRange(logs.data ?? [], (r) => r.log_date, thisWeek, "9999"),
      anterior: inRange(logs.data ?? [], (r) => r.log_date, prevWeek, thisWeek),
    },
    pipeline: {
      bruto: pipeline.grossPipeline,
      ponderado: pipeline.weightedPipeline,
      followUpsVencidos: pipeline.overdueFollowUps.length,
      semProximaAcao: pipeline.missingNextStep.length,
    },
  };
}

export const listBriefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("hermes_briefs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) throw error;
    return data;
  });

const SuggestionAction = z.object({
  id: z.string().uuid(),
  status: z.enum(["aceita", "recusada", "adiada", "pendente"]),
  createTask: z.boolean().default(false),
});

export const updateSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SuggestionAction.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: suggestion, error: readErr } = await supabase
      .from("hermes_suggestions")
      .select("*")
      .eq("id", data.id)
      .single();
    if (readErr) throw readErr;

    let taskId = suggestion.task_id;
    if (data.status === "aceita" && data.createTask && !taskId) {
      const { data: task, error: taskErr } = await supabase
        .from("tasks")
        .insert({
          user_id: userId,
          title: suggestion.title,
          description: suggestion.rationale,
          area: suggestion.domain === "comercial" ? "profissional" : "pessoal",
          priority: "alta",
          status: "pendente",
          origin: "hermes",
          origin_id: suggestion.id,
        })
        .select("id")
        .single();
      if (taskErr) throw taskErr;
      taskId = task.id;
    }

    const { error } = await supabase
      .from("hermes_suggestions")
      .update({ status: data.status, acted_at: new Date().toISOString(), task_id: taskId })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true, taskId };
  });

export const listSuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("hermes_suggestions")
      .select("*")
      .eq("status", "pendente")
      .order("score", { ascending: false })
      .limit(10);
    if (error) throw error;
    return data;
  });

export type HermesAnswer = {
  summary: string;
  actions: { titulo: string; motivo: string }[];
  sources: string[];
};

const AskInput = z.object({ question: z.string().trim().min(2).max(2000) });

export const askHermes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => AskInput.parse(i))
  .handler(async ({ data, context }): Promise<HermesAnswer & { snapshot: HermesSnapshot }> => {
    const snapshot = await buildHermesSnapshot(context.supabase);
    const text = await generate(
      `Você é o HERMES, camada de direção. ${NO_INVENTION} Responda SOMENTE com JSON válido: ` +
        '{"summary":string,"actions":[{"titulo":string,"motivo":string}],"sources":[string]}. ' +
        "Em `sources` liste as evidências usadas no formato 'tipo: nome (data)'. Se não houver dados, " +
        'summary deve dizer "Não há dados suficientes registrados" e actions deve ser [].',
      `Contexto (JSON):\n${JSON.stringify(snapshot)}\n\nPergunta: ${data.question}`,
    );
    const parsed = extractJson<Partial<HermesAnswer>>(text, {});
    return {
      summary: parsed.summary ?? "Não há dados suficientes registrados.",
      actions: parsed.actions ?? [],
      sources: parsed.sources ?? [],
      snapshot,
    };
  });

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DerivedItem = { titulo: string; descricao: string; evidencias: string[] };
export type DerivedProfile = {
  missao: string;
  missaoEvidencias: string[];
  valores: DerivedItem[];
  objetivos: (DerivedItem & { horizonte: "curto" | "medio" | "longo" })[];
  saved: { mission: boolean; values: number; goals: number };
};

/** Lê o histórico do diário e deriva missão, valores e objetivos com datas de evidência.
 *  Só grava onde ainda não há dados (nunca sobrescreve). */
export const deriveProfileFromJournal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DerivedProfile> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Análise indisponível: chave de IA ausente.");
    const { supabase, userId } = context;

    const { data: entries } = await supabase
      .from("journal_entries")
      .select("entry_date, summary, insights, achievements, pending, learnings")
      .order("entry_date", { ascending: false })
      .limit(220);
    const rows = (entries ?? []).filter((e) => e.summary || e.insights || e.achievements);
    if (rows.length < 5) {
      return { missao: "", missaoEvidencias: [], valores: [], objetivos: [], saved: { mission: false, values: 0, goals: 0 } };
    }
    const dates = new Set(rows.map((r) => r.entry_date));
    const compact = rows.map((r) => ({
      d: r.entry_date,
      r: (r.summary ?? "").slice(0, 300),
      i: (r.insights ?? "").slice(0, 200),
      c: (r.achievements ?? "").slice(0, 150),
      p: (r.pending ?? "").slice(0, 150),
    }));

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { streamText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);
    const result = streamText({
      model: gateway("openai/gpt-6-astra"),
      providerOptions: { "lovable-ai-gateway": { reasoningEffort: "low" } },
      system:
        "Você lê o diário de uma pessoa e infere, SÓ a partir do que está escrito, a missão pessoal, os valores centrais e os objetivos de vida que ela demonstra. " +
        "Nunca invente. Cada item precisa citar 2+ datas (AAAA-MM-DD) presentes nos dados como evidência. Português do Brasil, frases curtas. " +
        'Responda SOMENTE JSON: {"missao":string,"missaoEvidencias":[string],"valores":[{"titulo":string,"descricao":string,"evidencias":[string]}],' +
        '"objetivos":[{"titulo":string,"descricao":string,"horizonte":"curto"|"medio"|"longo","evidencias":[string]}]}. ' +
        "3 a 5 valores, 3 a 5 objetivos.",
      prompt: JSON.stringify(compact),
    });
    const text = await result.text;
    const s = text.indexOf("{"), e = text.lastIndexOf("}");
    if (s < 0 || e < 0) throw new Error("Resposta da IA em formato inesperado.");
    const raw = JSON.parse(text.slice(s, e + 1)) as Partial<DerivedProfile>;

    const keepEv = (ev: unknown) => (Array.isArray(ev) ? ev.filter((d): d is string => typeof d === "string" && dates.has(d)) : []);
    const valores = (raw.valores ?? []).map((v) => ({ ...v, evidencias: keepEv(v.evidencias) })).filter((v) => v.titulo && v.evidencias.length > 0);
    const objetivos = (raw.objetivos ?? [])
      .map((o) => ({ ...o, horizonte: (["curto", "medio", "longo"].includes(o.horizonte) ? o.horizonte : "medio") as "curto" | "medio" | "longo", evidencias: keepEv(o.evidencias) }))
      .filter((o) => o.titulo && o.evidencias.length > 0);
    const missaoEvidencias = keepEv(raw.missaoEvidencias);
    const missao = missaoEvidencias.length ? (raw.missao ?? "") : "";

    // Grava só onde está vazio.
    const saved = { mission: false, values: 0, goals: 0 };
    const [{ data: prof }, { count: vCount }, { count: gCount }] = await Promise.all([
      supabase.from("self_profile").select("mission").eq("user_id", userId).maybeSingle(),
      supabase.from("personal_values").select("id", { count: "exact", head: true }),
      supabase.from("life_goals").select("id", { count: "exact", head: true }),
    ]);
    if (missao && !prof?.mission) {
      const { error } = await supabase.from("self_profile").upsert({ user_id: userId, mission: missao }, { onConflict: "user_id" });
      saved.mission = !error;
    }
    if (!vCount && valores.length) {
      const { error } = await supabase.from("personal_values").insert(
        valores.map((v, i) => ({ user_id: userId, name: v.titulo, description: `${v.descricao} (diário: ${v.evidencias.join(", ")})`, rank: i + 1 })),
      );
      if (!error) saved.values = valores.length;
    }
    if (!gCount && objetivos.length) {
      const { error } = await supabase.from("life_goals").insert(
        objetivos.map((o) => ({ user_id: userId, title: o.titulo, description: `${o.descricao} (diário: ${o.evidencias.join(", ")})`, horizon: o.horizonte })),
      );
      if (!error) saved.goals = objetivos.length;
    }
    return { missao, missaoEvidencias, valores, objetivos, saved };
  });

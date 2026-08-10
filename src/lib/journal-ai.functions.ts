import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ProcessInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(8),
  integrate: z.boolean().default(true),
});

type Analysis = {
  humor: string | null;
  energia: number | null;
  habitos: string[];
  praticas: { nome: string; minutos: number | null }[];
  aprendizados: string | null;
  tags: string[];
  padroes: string | null;
  livros: { titulo: string; autor: string | null }[];
  eventos: { horario: string | null; categoria: string; descricao: string }[];
};

function safeJson(text: string): Record<string, Analysis> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("Resposta da IA em formato inesperado.");
  return JSON.parse(text.slice(start, end + 1)) as Record<string, Analysis>;
}

export const processJournalEntries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProcessInput.parse(input))
  .handler(async ({ data, context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Processamento indisponível: chave de IA ausente.");
    const { supabase, userId } = context;

    const { data: entries, error } = await supabase
      .from("journal_entries")
      .select("id, entry_date, title, content")
      .in("id", data.ids);
    if (error) throw error;
    if (!entries?.length) return { processed: 0 };

    const payload = entries.map((e) => ({
      id: e.id,
      data: e.entry_date,
      titulo: e.title,
      texto: (e.content ?? "").slice(0, 6000),
    }));

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const result = await generateText({
      model: gateway("google/gemini-3.6-flash"),
      system:
        "Você classifica entradas de diário pessoal em português do Brasil. Responda SOMENTE com JSON válido, " +
        'no formato {"<id>": {"humor": "otimo|bom|neutro|cansado|dificil", "energia": 0-10, "habitos": [], ' +
        '"praticas": [{"nome": "", "minutos": null}], "aprendizados": "", "tags": [], "padroes": "", ' +
        '"livros": [{"titulo": "", "autor": null}], "eventos": [{"horario": "HH:MM ou null", "categoria": "trabalho|estudo|saude|espiritual|pessoal|financeiro|geral", "descricao": ""}]}}. ' +
        "Sem texto fora do JSON. Use null quando não houver informação.",
      prompt: `Entradas:\n${JSON.stringify(payload)}`,
    });

    const parsed = safeJson(result.text);

    const events: Record<string, unknown>[] = [];
    const insights: Record<string, unknown>[] = [];
    const practiceNames = new Set<string>();
    const notes: Record<string, unknown>[] = [];
    const books: { titulo: string; autor: string | null }[] = [];

    for (const e of entries) {
      const a = parsed[e.id];
      if (!a) continue;
      for (const ev of a.eventos ?? []) {
        if (!ev?.descricao) continue;
        events.push({
          user_id: userId, journal_id: e.id, event_time: ev.horario ?? null,
          category: ev.categoria || "geral", description: ev.descricao.slice(0, 500),
        });
      }
      insights.push({
        user_id: userId, journal_id: e.id,
        mood: a.humor ?? null,
        energy: typeof a.energia === "number" ? Math.max(0, Math.min(10, Math.round(a.energia))) : null,
        habits: a.habitos ?? [],
        practices: (a.praticas ?? []).map((p) => (p.minutos ? `${p.nome} (${p.minutos}min)` : p.nome)),
        learnings: a.aprendizados ?? null,
        tags: a.tags ?? [],
        patterns: a.padroes ?? null,
        books: (a.livros ?? []).map((b) => b.titulo),
      });
      if (data.integrate) {
        for (const p of a.praticas ?? []) if (p?.nome) practiceNames.add(p.nome.trim());
        for (const b of a.livros ?? []) if (b?.titulo) books.push(b);
        if (a.aprendizados && a.aprendizados.trim().length > 20) {
          notes.push({
            user_id: userId,
            title: `Aprendizado — ${e.entry_date}`,
            content: a.aprendizados,
            area: "estudo",
            tags: (a.tags ?? []).slice(0, 5),
          });
        }
      }
      // mantém a entrada coerente com a análise
      await supabase.from("journal_entries").update({
        mood: a.humor ?? undefined,
        energy: typeof a.energia === "number" ? Math.round(a.energia) : undefined,
        learnings: a.aprendizados ?? undefined,
        processed: true,
      }).eq("id", e.id);
    }

    await supabase.from("journal_events").delete().in("journal_id", data.ids);
    await supabase.from("journal_insights").delete().in("journal_id", data.ids);
    if (events.length) await supabase.from("journal_events").insert(events);
    if (insights.length) await supabase.from("journal_insights").insert(insights);

    if (data.integrate) {
      if (practiceNames.size) {
        const { data: existing } = await supabase.from("practices").select("name");
        const have = new Set((existing ?? []).map((p) => p.name.toLowerCase()));
        const news = [...practiceNames]
          .filter((n) => n.length > 2 && !have.has(n.toLowerCase()))
          .slice(0, 10)
          .map((name) => ({ user_id: userId, name, category: "estudo", frequency: "diaria", active: true }));
        if (news.length) await supabase.from("practices").insert(news);
      }
      if (books.length) {
        const { data: existing } = await supabase.from("books").select("title");
        const have = new Set((existing ?? []).map((b) => b.title.toLowerCase()));
        const news = books
          .filter((b) => b.titulo.length > 2 && !have.has(b.titulo.toLowerCase()))
          .slice(0, 10)
          .map((b) => ({ user_id: userId, title: b.titulo, author: b.autor, category: "geral", status: "lendo" }));
        if (news.length) await supabase.from("books").insert(news);
      }
      if (notes.length) await supabase.from("brain_notes").insert(notes.slice(0, 8));
    }

    return { processed: entries.length };
  });

const AskPastInput = z.object({ question: z.string().trim().min(2).max(2000) });

export const askMyPast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskPastInput.parse(input))
  .handler(async ({ data, context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Assistente indisponível: chave de IA ausente.");
    const { supabase } = context;

    const [entries, insights, events, logs, practices, books] = await Promise.all([
      supabase.from("journal_entries")
        .select("entry_date, title, mood, energy, learnings, highlights, gratitude")
        .order("entry_date", { ascending: false }).limit(400),
      supabase.from("journal_insights").select("journal_id, mood, energy, habits, practices, tags, patterns").limit(400),
      supabase.from("journal_events").select("category, description, event_time").limit(400),
      supabase.from("practice_logs").select("log_date, practice_id").order("log_date", { ascending: false }).limit(400),
      supabase.from("practices").select("id, name, category"),
      supabase.from("books").select("title, author, status, rating").limit(100),
    ]);

    const snapshot = {
      diario: entries.data ?? [],
      insights: insights.data ?? [],
      acontecimentos: events.data ?? [],
      registrosDePratica: logs.data ?? [],
      praticas: practices.data ?? [],
      livros: books.data ?? [],
    };

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { streamText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const result = streamText({
      model: gateway("google/gemini-3.6-flash"),
      system:
        "Você é a memória histórica do usuário no PERSONAL OS. Responda em português do Brasil, de forma direta e " +
        "baseada EXCLUSIVAMENTE no histórico em JSON (diário, insights, acontecimentos, práticas e livros). " +
        "Sempre que possível cite datas, contagens e períodos concretos. Se o histórico não tiver a resposta, diga isso " +
        "e indique o que precisa ser registrado.",
      prompt: `Histórico:\n${JSON.stringify(snapshot).slice(0, 120000)}\n\nPergunta: ${data.question}`,
    });

    return { answer: await result.text };
  });

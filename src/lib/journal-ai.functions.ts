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
  contas?: { descricao: string; valor: number | null; vencimento: string | null }[];
  dividas?: { descricao: string; valor: number | null }[];
  melhorias?: string[];
  livros_finalizados?: { titulo: string; autor: string | null }[];
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
        '"livros": [{"titulo": "", "autor": null}], "eventos": [{"horario": "HH:MM ou null", "categoria": "trabalho|estudo|saude|espiritual|pessoal|financeiro|geral", "descricao": ""}], ' +
        '"contas": [{"descricao": "", "valor": null, "vencimento": "AAAA-MM-DD ou null"}], "dividas": [{"descricao": "", "valor": null}], ' +
        '"melhorias": ["pontos que o autor diz que precisa melhorar"], "livros_finalizados": [{"titulo": "", "autor": null}]}}. ' +
        "contas = contas a pagar citadas explicitamente; dividas = dívidas citadas; livros_finalizados = só livros que o texto diz ter terminado. " +
        "NUNCA invente: se não estiver escrito, use lista vazia. " +
        "Sem texto fora do JSON. Use null quando não houver informação.",
      prompt: `Entradas:\n${JSON.stringify(payload)}`,
    });

    const parsed = safeJson(result.text);

    const events: { user_id: string; journal_id: string; event_time: string | null; category: string; description: string }[] = [];
    const insights: {
      user_id: string; journal_id: string; mood: string | null; energy: number | null;
      habits: string[]; practices: string[]; learnings: string | null; tags: string[];
      patterns: string | null; books: string[];
    }[] = [];
    const practiceNames = new Set<string>();
    const notes: { user_id: string; title: string; content: string; area: string; tags: string[] }[] = [];
    const books: { titulo: string; autor: string | null }[] = [];
    const finished: { titulo: string; autor: string | null }[] = [];
    const signals: { user_id: string; journal_id: string; entry_date: string; kind: string; description: string; amount: number | null; due_date: string | null }[] = [];
    const isoOk = (d: unknown) => (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

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
      const base = { user_id: userId, journal_id: e.id, entry_date: e.entry_date };
      for (const c of a.contas ?? []) if (c?.descricao) signals.push({ ...base, kind: "conta", description: c.descricao.slice(0, 300), amount: num(c.valor), due_date: isoOk(c.vencimento) });
      for (const d of a.dividas ?? []) if (d?.descricao) signals.push({ ...base, kind: "divida", description: d.descricao.slice(0, 300), amount: num(d.valor), due_date: null });
      for (const m of a.melhorias ?? []) if (typeof m === "string" && m.trim()) signals.push({ ...base, kind: "melhoria", description: m.slice(0, 300), amount: null, due_date: null });
      for (const b of a.livros_finalizados ?? []) if (b?.titulo) {
        signals.push({ ...base, kind: "livro", description: b.titulo.slice(0, 200), amount: null, due_date: null });
        finished.push(b);
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
        mood: a.humor ?? null,
        energy: typeof a.energia === "number" ? Math.round(a.energia) : null,
        learnings: a.aprendizados ?? null,
        processed: true,
      }).eq("id", e.id);
    }

    await supabase.from("journal_events").delete().in("journal_id", data.ids);
    await supabase.from("journal_insights").delete().in("journal_id", data.ids);
    if (events.length) await supabase.from("journal_events").insert(events);
    if (insights.length) await supabase.from("journal_insights").insert(insights);
    await supabase.from("journal_signals").delete().in("journal_id", data.ids);
    if (signals.length) await supabase.from("journal_signals").insert(signals);

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
      if (finished.length) {
        const { data: existing } = await supabase.from("books").select("id, title");
        const map = new Map((existing ?? []).map((b) => [b.title.toLowerCase(), b.id]));
        for (const b of finished.slice(0, 10)) {
          const id = map.get(b.titulo.toLowerCase());
          if (id) await supabase.from("books").update({ status: "concluido" }).eq("id", id);
          else await supabase.from("books").insert({ user_id: userId, title: b.titulo, author: b.autor, category: "geral", status: "concluido" });
        }
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

    const [entries, insights, events, logs, practices, books, timeline, history] = await Promise.all([
      supabase.from("journal_entries")
        .select("entry_date, title, mood, energy, learnings, highlights, gratitude")
        .order("entry_date", { ascending: false }).limit(400),
      supabase.from("journal_insights").select("journal_id, mood, energy, habits, practices, tags, patterns").limit(400),
      supabase.from("journal_events").select("category, description, event_time").limit(400),
      supabase.from("practice_logs").select("log_date, practice_id").order("log_date", { ascending: false }).limit(400),
      supabase.from("practices").select("id, name, category"),
      supabase.from("books").select("title, author, status, rating").limit(100),
      supabase.from("timeline_events").select("event_date, event_time, description, category")
        .order("event_date", { ascending: false }).limit(3000),
      supabase.from("practice_history").select("practice_date, practice_time, name, category")
        .order("practice_date", { ascending: false }).limit(2000),
    ]);

    const snapshot = {
      diario: entries.data ?? [],
      insights: insights.data ?? [],
      acontecimentos: events.data ?? [],
      registrosDePratica: logs.data ?? [],
      praticas: practices.data ?? [],
      livros: books.data ?? [],
      linhaDoTempo: timeline.data ?? [],
      historicoDePraticas: history.data ?? [],
    };

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { streamText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const result = streamText({
      model: gateway("google/gemini-3.6-flash"),
      system:
        "Você é a memória histórica do usuário no PERSONAL OS. Responda em português do Brasil, de forma direta e " +
        "baseada EXCLUSIVAMENTE no histórico em JSON (diário, insights, acontecimentos, linha do tempo, histórico de práticas e livros). " +
        "Sempre que possível cite datas, contagens e períodos concretos. Se o histórico não tiver a resposta, diga isso " +
        "e indique o que precisa ser registrado.",
      prompt: `Histórico:\n${JSON.stringify(snapshot).slice(0, 160000)}\n\nPergunta: ${data.question}`,
    });

    return { answer: await result.text };
  });

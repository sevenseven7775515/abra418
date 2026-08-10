import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  days: z.number().int().min(30).max(365).default(90),
});

export type PatternItem = {
  titulo: string;
  descricao: string;
  evidencias: string[];
  acao?: string;
};

export type PatternReport = {
  resumo: string;
  positivos: PatternItem[];
  negativos: PatternItem[];
  ocultos: PatternItem[];
};

function extractJson(text: string): PatternReport {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("Resposta da IA em formato inesperado.");
  const parsed = JSON.parse(text.slice(start, end + 1)) as Partial<PatternReport>;
  return {
    resumo: parsed.resumo ?? "",
    positivos: parsed.positivos ?? [],
    negativos: parsed.negativos ?? [],
    ocultos: parsed.ocultos ?? [],
  };
}

export const analyzePatterns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Análise indisponível: chave de IA ausente.");

    const since = new Date(Date.now() - data.days * 86400000).toISOString().slice(0, 10);
    const { supabase } = context;

    const [journal, practices, logs, tasks, finance, books, thelema, events] = await Promise.all([
      supabase.from("journal_entries")
        .select("entry_date, mood, energy, gratitude, learnings, highlights, content")
        .gte("entry_date", since).order("entry_date", { ascending: false }).limit(200),
      supabase.from("practices").select("id, name, category, frequency, active"),
      supabase.from("practice_logs").select("practice_id, log_date").gte("log_date", since).limit(1000),
      supabase.from("tasks").select("title, area, priority, status, due_date, updated_at").limit(300),
      supabase.from("finance_transactions").select("kind, category, amount, tx_date").gte("tx_date", since).limit(300),
      supabase.from("books").select("title, status, rating").limit(100),
      supabase.from("thelema_journal")
        .select("entry_date, mental_state, practice, study, results, dreams, symbols")
        .gte("entry_date", since).limit(120),
      supabase.from("astronomical_events").select("title, kind, event_date").limit(30),
    ]);

    const practiceNames = new Map((practices.data ?? []).map((p) => [p.id, p.name]));
    const dataset = {
      periodoDias: data.days,
      diario: journal.data ?? [],
      praticas: practices.data ?? [],
      registrosDePratica: (logs.data ?? []).map((l) => ({
        data: l.log_date,
        pratica: practiceNames.get(l.practice_id) ?? l.practice_id,
      })),
      tarefas: tasks.data ?? [],
      financas: (finance.data ?? []).map((t) => ({ ...t, amount: Number(t.amount) })),
      livros: books.data ?? [],
      diarioThelemico: thelema.data ?? [],
      eventosAstronomicos: events.data ?? [],
    };

    const registros =
      (journal.data?.length ?? 0) + (logs.data?.length ?? 0) + (thelema.data?.length ?? 0);
    if (registros < 3) {
      return {
        resumo:
          "Ainda não há histórico suficiente para reconhecer padrões. Registre diário e práticas por alguns dias e volte aqui.",
        positivos: [], negativos: [], ocultos: [],
      } satisfies PatternReport;
    }

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { streamText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const result = streamText({
      model: gateway("google/gemini-3.6-flash"),
      system:
        "Você é um analista de padrões de vida. Analise os dados históricos do usuário (diário, humor, energia, práticas, " +
        "tarefas, finanças, estudos e ciclos) e identifique correlações reais observáveis nos dados. Nunca invente fatos: " +
        "toda evidência deve citar datas, contagens ou valores presentes no JSON. Responda SOMENTE com JSON válido, em " +
        "português do Brasil, no formato: " +
        '{"resumo":string,"positivos":[{"titulo":string,"descricao":string,"evidencias":[string],"acao":string}],' +
        '"negativos":[...],"ocultos":[...]}. ' +
        "Positivos = comportamentos ligados aos melhores dias. Negativos = gatilhos ligados a quedas de produtividade, " +
        "humor ou energia. Ocultos = correlações não óbvias entre módulos diferentes. De 2 a 4 itens por categoria.",
      prompt: `Dados do usuário (JSON):\n${JSON.stringify(dataset)}`,
    });

    return extractJson(await result.text);
  });

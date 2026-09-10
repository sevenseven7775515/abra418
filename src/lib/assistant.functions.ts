import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const AskInput = z.object({
  question: z.string().trim().min(2).max(2000),
  context: z.object({
    now: z.string().max(80),
    moon: z.string().max(200),
    planetary: z.string().max(200),
  }),
});

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data, context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Assistente indisponível: chave de IA ausente.");

    const { supabase } = context;
    const [tasks, missions, goals, values, profile, enn, mbti, events] = await Promise.all([
      supabase.from("tasks").select("title, area, priority, due_date, status").neq("status", "concluido").limit(40),
      supabase.from("missions").select("name, objective, deadline, status").limit(20),
      supabase.from("life_goals").select("title, horizon, target_date, status").limit(20),
      supabase.from("personal_values").select("name, rank").order("rank").limit(10),
      supabase.from("self_profile").select("headline, mission, vision, principles, rules").maybeSingle(),
      supabase.from("enneagram_profile").select("main_type, wing, instinct, strengths, challenges").maybeSingle(),
      supabase.from("mbti_profile").select("mbti_type, characteristics, decision_making").maybeSingle(),
      supabase.from("astronomical_events").select("title, kind, event_date").order("event_date").limit(10),
    ]);

    const { buildHermesSnapshot } = await import("./hermes-context");
    const hermes = await buildHermesSnapshot(supabase);

    const snapshot = {
      agora: data.context.now,
      hermes: {
        estado: hermes.estado,
        comercial: hermes.comercial,
        operacional: hermes.operacional,
        historico: { ...hermes.historico, diarioRecente: hermes.historico.diarioRecente.slice(0, 10) },
        prioridades: hermes.prioridades,
      },
      ciclos: { lua: data.context.moon, horasPlanetarias: data.context.planetary },
      tarefasAbertas: tasks.data ?? [],
      missoes: missions.data ?? [],
      objetivosDeVida: goals.data ?? [],
      valores: values.data ?? [],
      perfil: profile.data ?? null,
      eneagrama: enn.data ?? null,
      mbti: mbti.data ?? null,
      eventosAstronomicos: events.data ?? [],
    };

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { streamText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const result = streamText({
      model: gateway("google/gemini-3.6-flash"),
      system:
        "Você é o assistente pessoal do PERSONAL OS, uma segunda mente digital. Responda sempre em português do Brasil, " +
        "de forma direta, prática e organizada em tópicos curtos. Baseie-se estritamente nos dados do usuário fornecidos " +
        "em JSON: tarefas, missões, objetivos de vida, valores, perfil psicológico (eneagrama e MBTI), ciclos lunares e " +
        "horas planetárias. Quando priorizar, justifique brevemente citando prazo, prioridade, missão ou valor envolvido. " +
        "Nunca invente fatos, números, empresas, clientes ou datas que não estejam no JSON. Cite a origem (tipo e data) " +
        "de cada afirmação sobre o passado. Se não houver evidência, responda exatamente: 'Não há dados suficientes registrados'. " +
        "Se faltar informação, diga o que precisa ser cadastrado.",
      prompt: `Dados atuais do usuário:\n${JSON.stringify(snapshot)}\n\nPergunta: ${data.question}`,
    });

    return { answer: await result.text };
  });
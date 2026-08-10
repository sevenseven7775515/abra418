import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Bot, Send, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askAssistant } from "@/lib/assistant.functions";
import { askMyPast } from "@/lib/journal-ai.functions";
import { currentPlanetaryHour, dayRuler, moonIllumination, moonPhase, moonSign } from "@/lib/astro";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/personal/_app/ai")({
  head: () => ({
    meta: [
      { title: "Assistente IA — PERSONAL OS" },
      { name: "description", content: "Assistente que organiza o dia considerando tarefas, ciclos, perfil pessoal e objetivos." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Assistente IA — PERSONAL OS" },
      { property: "og:description", content: "Sua segunda mente digital." },
    ],
  }),
  component: AiPage,
});

const SUGGESTIONS_NOW = [
  "Qual minha melhor prioridade hoje?",
  "Com base no meu perfil e compromissos, organize meu dia.",
  "O que devo estudar hoje na biblioteca Thelema?",
  "Meus objetivos de vida estão coerentes com minhas tarefas atuais?",
];

const SUGGESTIONS_PAST = [
  "Quais hábitos aparecem nos meus melhores dias?",
  "Quando minha produtividade foi maior?",
  "Quais padrões antecedem períodos difíceis?",
  "Quantas vezes pratiquei meditação no histórico?",
];

type Message = { role: "user" | "assistant"; content: string };

function AiPage() {
  const ask = useServerFn(askAssistant);
  const askPast = useServerFn(askMyPast);
  const [mode, setMode] = useState<"now" | "past">("now");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    setError(null);
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setLoading(true);
    try {
      if (mode === "past") {
        const res = await askPast({ data: { question: q } });
        setMessages((m) => [...m, { role: "assistant", content: res.answer }]);
        return;
      }
      const now = new Date();
      const hour = currentPlanetaryHour(now);
      const phase = moonPhase(now);
      const res = await ask({
        data: {
          question: q,
          context: {
            now: now.toLocaleString("pt-BR"),
            moon: `${phase.label}, ${(moonIllumination(now) * 100).toFixed(0)}% iluminada, Lua em ${moonSign(now).name}`,
            planetary: `Hora de ${hour.planet}; dia regido por ${dayRuler(now)}`,
          },
        },
      });
      setMessages((m) => [...m, { role: "assistant", content: res.answer }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao consultar o assistente.";
      setError(msg.includes("429") ? "Muitas requisições. Tente novamente em instantes."
        : msg.includes("402") ? "Créditos de IA esgotados. Adicione créditos no workspace."
        : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <PersonalShell title="Assistente IA" subtitle="Sua segunda mente: momento atual ou memória histórica.">
      <div className="mb-4 inline-flex rounded-full border border-border p-1">
        {([["now", "Agora"], ["past", "Pergunte ao meu passado"]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => { setMode(k); setMessages([]); setError(null); }}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
              mode === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(mode === "now" ? SUGGESTIONS_NOW : SUGGESTIONS_PAST).map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            disabled={loading}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="panel grid gap-4 p-4 sm:p-5">
        <div className="grid gap-4">
          {messages.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {mode === "now"
                ? "Pergunte algo. O assistente lê suas tarefas, missões, objetivos, valores, perfil e os ciclos do dia."
                : "Pergunte ao seu passado. A resposta usa seu diário, acontecimentos, insights, práticas e livros registrados."}
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
              <div className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-xl",
                m.role === "user" ? "bg-secondary text-foreground" : "bg-primary text-primary-foreground",
              )}>
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={cn(
                "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm",
                m.role === "user" ? "bg-secondary" : "border border-border bg-card",
              )}>
                {m.role === "assistant" ? (
                  <div className="space-y-2 [&_a]:text-primary [&_a]:underline [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-bold [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-primary">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          {loading && <p className="text-sm text-muted-foreground">Analisando seus dados…</p>}
          {error && <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 border-t border-border pt-4"
        >
          <Textarea
            rows={2}
            placeholder="Pergunte ao seu assistente…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
            }}
          />
          <Button type="submit" disabled={loading || !input.trim()} className="h-10 font-semibold glow-neon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </PersonalShell>
  );
}
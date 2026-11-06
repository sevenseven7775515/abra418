import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RefreshCw, Send, Sparkles } from "lucide-react";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Chips, dateBR } from "@/components/personal/kit";
import { CommercialEngine, HermesDirection, StalledItems, useHermesSnapshot } from "@/components/personal/HermesBlocks";
import { askHermes, generateBrief, listBriefs, type BriefContent, type HermesAnswer } from "@/lib/hermes.functions";

export const Route = createFileRoute("/personal/_app/hermes")({
  head: () => ({
    meta: [
      { title: "Hermes — PERSONAL OS" },
      { name: "description", content: "Centro de inteligência: estado atual, foco recomendado, prioridades e briefings com evidências." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Hermes — PERSONAL OS" },
      { property: "og:description", content: "Contexto, decisões e direção com base nos seus dados." },
    ],
  }),
  component: HermesPage,
});

const KINDS = ["diario", "semanal"] as const;

function HermesPage() {
  const snapshot = useHermesSnapshot();
  const gen = useServerFn(generateBrief);
  const briefsFn = useServerFn(listBriefs);
  const ask = useServerFn(askHermes);

  const [kind, setKind] = useState<(typeof KINDS)[number]>("diario");
  const [brief, setBrief] = useState<BriefContent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<HermesAnswer | null>(null);
  const [asking, setAsking] = useState(false);

  const briefs = useQuery({
    queryKey: ["hermes-briefs"],
    queryFn: () => briefsFn({ data: undefined as never }),
  });

  const generate = async () => {
    setBusy(true); setError(null);
    try {
      const r = await gen({ data: { kind } });
      setBrief(r.content);
      briefs.refetch();
      snapshot.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar o briefing.");
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!question.trim()) return;
    setAsking(true); setError(null);
    try {
      setAnswer(await ask({ data: { question: question.trim() } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao consultar.");
    } finally {
      setAsking(false);
    }
  };

  const s = snapshot.data;

  return (
    <PersonalShell title="Hermes" subtitle="Contexto, decisões e direção — sempre com a origem do dado.">
      <div className="grid gap-4">
        <section className="panel p-5">
          <h2 className="text-sm font-semibold tracking-wide">Estado atual</h2>
          {!s ? (
            <p className="mt-2 text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[11px] text-muted-foreground sm:grid-cols-3 lg:grid-cols-4">
              {[
                ["Energia", s.estado.energia === null ? "—" : `${s.estado.energia}%`],
                ["Humor", s.estado.humor === null ? "—" : `${s.estado.humor}%`],
                ["Dias escritos (30d)", String(s.diario.diasEscritos30)],
                ["Último diário", s.estado.ultimoDiario ? dateBR(s.estado.ultimoDiario) : "—"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border bg-secondary/40 px-2 py-3">
                  <p className="text-base font-bold text-foreground">{value}</p>
                  <p className="mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <HermesDirection snapshot={s} />
        <CommercialEngine snapshot={s} />
        <StalledItems snapshot={s} />

        <section className="panel p-5">
          <h2 className="text-sm font-semibold tracking-wide">Perguntar ao Hermes</h2>
          <div className="mt-3 grid gap-2">
            <Textarea rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="O que devo fazer agora?" />
            <Button onClick={send} disabled={asking} className="justify-self-start font-semibold glow-neon">
              <Send className="h-4 w-4" /> {asking ? "Consultando…" : "Perguntar"}
            </Button>
          </div>
          {answer && (
            <div className="mt-4 grid gap-2 text-sm">
              <p>{answer.summary}</p>
              {answer.actions.map((a) => (
                <div key={a.titulo} className="rounded-xl border border-border bg-secondary/30 px-3 py-2">
                  <p className="font-medium">{a.titulo}</p>
                  <p className="text-xs text-muted-foreground">{a.motivo}</p>
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground">Fontes: {answer.sources.join(" · ") || "nenhuma fonte registrada"}</p>
            </div>
          )}
        </section>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </PersonalShell>
  );
}

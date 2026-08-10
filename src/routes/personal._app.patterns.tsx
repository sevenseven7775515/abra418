import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Radar, Sparkles, TrendingDown, TrendingUp, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { Button } from "@/components/ui/button";
import { Chips, Empty, Stat } from "@/components/personal/kit";
import { analyzePatterns, type PatternItem, type PatternReport } from "@/lib/patterns.functions";
import {
  currentStreak, daysAgo, disciplineScore, energyScore, moodScore, productivityScore,
} from "@/lib/personal-insights";

export const Route = createFileRoute("/personal/_app/patterns")({
  head: () => ({
    meta: [
      { title: "Reconhecimento de Padrões — PERSONAL OS" },
      { name: "description", content: "Análise inteligente de padrões positivos, negativos e ocultos do seu histórico pessoal." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Reconhecimento de Padrões — PERSONAL OS" },
      { property: "og:description", content: "Padrões positivos, negativos e ocultos da sua história." },
    ],
  }),
  component: PatternsPage,
});

const RANGES = ["30", "60", "90", "180", "365"] as const;

function ItemCard({ item, tone }: { item: PatternItem; tone: "good" | "bad" | "hidden" }) {
  const color =
    tone === "good" ? "text-primary" : tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <article className="panel p-5">
      <h3 className={`text-sm font-bold ${color}`}>{item.titulo}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{item.descricao}</p>
      {item.evidencias?.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {item.evidencias.map((e, i) => (
            <li key={i} className="rounded-lg border border-border bg-secondary/30 px-2.5 py-1.5">{e}</li>
          ))}
        </ul>
      )}
      {item.acao && <p className="mt-3 text-xs"><span className="text-primary">Ação: </span>{item.acao}</p>}
    </article>
  );
}

function Section({ title, icon: Icon, items, tone }: {
  title: string; icon: React.ElementType; items: PatternItem[]; tone: "good" | "bad" | "hidden";
}) {
  if (!items?.length) return null;
  return (
    <section className="mt-8">
      <header className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item, i) => <ItemCard key={i} item={item} tone={tone} />)}
      </div>
    </section>
  );
}

function PatternsPage() {
  const run = useServerFn(analyzePatterns);
  const [days, setDays] = useState<(typeof RANGES)[number]>("90");
  const [report, setReport] = useState<PatternReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: base } = useQuery({
    queryKey: ["patterns-base"],
    queryFn: async () => {
      const [journal, practices, logs, tasks] = await Promise.all([
        supabase.from("journal_entries").select("entry_date, mood, energy").order("entry_date", { ascending: false }).limit(120),
        supabase.from("practices").select("id").eq("active", true),
        supabase.from("practice_logs").select("practice_id, log_date").gte("log_date", daysAgo(120)),
        supabase.from("tasks").select("status, due_date"),
      ]);
      return {
        journal: journal.data ?? [],
        practices: practices.data ?? [],
        logs: logs.data ?? [],
        tasks: tasks.data ?? [],
      };
    },
  });

  const journal = base?.journal ?? [];
  const logs = base?.logs ?? [];
  const practicesCount = base?.practices.length ?? 0;

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      const res = await run({ data: { days: Number(days) } });
      setReport(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao analisar padrões.";
      setError(
        msg.includes("429") ? "Muitas requisições. Tente novamente em instantes."
          : msg.includes("402") ? "Créditos de IA esgotados. Adicione créditos no workspace."
          : msg,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <PersonalShell
      title="Reconhecimento de Padrões"
      subtitle="O que se repete na sua vida — inclusive o que costuma passar despercebido."
      actions={
        <Button onClick={analyze} disabled={loading} className="font-semibold glow-neon">
          <Sparkles className="h-4 w-4" /> {loading ? "Analisando…" : "Analisar padrões"}
        </Button>
      }
    >
      <Chips
        items={RANGES}
        value={days}
        onChange={setDays}
        labels={Object.fromEntries(RANGES.map((r) => [r, `${r} dias`]))}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Humor médio" value={moodScore(journal) ?? "—"} hint="últimos 14 registros" />
        <Stat label="Energia média" value={energyScore(journal) ?? "—"} hint="escala 0 a 100" />
        <Stat label="Disciplina" value={`${disciplineScore(logs, practicesCount) ?? 0}%`} hint="práticas em 14 dias" />
        <Stat label="Sequência atual" value={`${currentStreak(logs)} d`} hint="dias seguidos com prática" />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Produtividade geral em tarefas: {productivityScore(base?.tasks ?? []) ?? 0}% · registros no diário: {journal.length}
      </p>

      {error && (
        <p className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}

      {!report && !loading && !error && (
        <div className="mt-8">
          <Empty>
            Escolha o período e toque em “Analisar padrões”. A IA cruza diário, práticas, tarefas, finanças,
            estudos e ciclos para encontrar relações reais no seu histórico.
          </Empty>
        </div>
      )}

      {loading && (
        <div className="mt-8">
          <Empty>Lendo seu histórico e cruzando módulos…</Empty>
        </div>
      )}

      {report && (
        <>
          {report.resumo && (
            <section className="panel mt-8 p-5">
              <header className="mb-2 flex items-center gap-2">
                <Radar className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold tracking-wide">Leitura geral</h2>
              </header>
              <p className="text-sm text-muted-foreground">{report.resumo}</p>
            </section>
          )}
          <Section title="Padrões positivos" icon={TrendingUp} items={report.positivos} tone="good" />
          <Section title="Padrões negativos" icon={TrendingDown} items={report.negativos} tone="bad" />
          <Section title="Padrões ocultos" icon={Eye} items={report.ocultos} tone="hidden" />
        </>
      )}
    </PersonalShell>
  );
}

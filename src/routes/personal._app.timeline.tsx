import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Empty, Stat, dateBR } from "@/components/personal/kit";

export const Route = createFileRoute("/personal/_app/timeline")({
  head: () => ({
    meta: [
      { title: "Linha do Tempo — PERSONAL OS" },
      { name: "description", content: "Linha do tempo da vida: acontecimentos, práticas, aprendizados e mudanças por ano, mês e dia." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Linha do Tempo — PERSONAL OS" },
      { property: "og:description", content: "Sua história navegável por ano, mês e dia." },
    ],
  }),
  component: TimelinePage,
});

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

type Entry = {
  id: string; entry_date: string; title: string | null; content: string | null;
  mood: string | null; energy: number | null; learnings: string | null; highlights: string | null;
};
type Ev = { journal_id: string; category: string; event_time: string | null; description: string };
type Ins = { journal_id: string; practices: string[]; tags: string[]; patterns: string | null };
type TEv = { journal_id: string | null; event_date: string; event_time: string | null; description: string; category: string; source_file: string | null };
type PHist = { journal_id: string | null; practice_date: string; practice_time: string | null; name: string; category: string; description: string | null };

function TimelinePage() {
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data } = useQuery({
    queryKey: ["timeline"],
    queryFn: async () => {
      const [entries, events, insights, timeline, history] = await Promise.all([
        supabase.from("journal_entries").select("id, entry_date, title, content, mood, energy, learnings, highlights").order("entry_date", { ascending: false }),
        supabase.from("journal_events").select("journal_id, category, event_time, description"),
        supabase.from("journal_insights").select("journal_id, practices, tags, patterns"),
        supabase.from("timeline_events").select("journal_id, event_date, event_time, description, category, source_file").order("event_date", { ascending: false }).order("event_time", { ascending: true }),
        supabase.from("practice_history").select("journal_id, practice_date, practice_time, name, category, description").order("practice_date", { ascending: false }),
      ]);
      return {
        entries: (entries.data ?? []) as Entry[],
        events: (events.data ?? []) as Ev[],
        insights: (insights.data ?? []) as Ins[],
        timeline: (timeline.data ?? []) as TEv[],
        history: (history.data ?? []) as PHist[],
      };
    },
  });

  const entries = data?.entries ?? [];
  const events = data?.events ?? [];
  const insights = data?.insights ?? [];
  const timeline = data?.timeline ?? [];
  const history = data?.history ?? [];

  const term = search.trim().toLowerCase();
  const hits = term.length >= 2
    ? {
        events: timeline.filter((t) => `${t.description} ${t.category}`.toLowerCase().includes(term)).slice(0, 60),
        practices: history.filter((p) => `${p.name} ${p.description ?? ""}`.toLowerCase().includes(term)).slice(0, 60),
      }
    : null;

  const byYear = new Map<number, Entry[]>();
  for (const e of entries) {
    const y = Number(e.entry_date.slice(0, 4));
    byYear.set(y, [...(byYear.get(y) ?? []), e]);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);

  const yearEntries = year ? (byYear.get(year) ?? []) : [];
  const byMonth = new Map<number, Entry[]>();
  for (const e of yearEntries) {
    const m = Number(e.entry_date.slice(5, 7));
    byMonth.set(m, [...(byMonth.get(m) ?? []), e]);
  }
  const monthEntries = month ? (byMonth.get(month) ?? []) : [];
  const dayEntry = day ? entries.find((e) => e.id === day) ?? null : null;

  const back = () => {
    if (day) setDay(null);
    else if (month !== null) setMonth(null);
    else setYear(null);
  };

  return (
    <PersonalShell
      title="Linha do Tempo"
      subtitle="Sua história navegável: ano, mês e dia."
      actions={(year !== null || month !== null || day) ? (
        <Button variant="secondary" onClick={back}><ChevronLeft className="h-4 w-4" /> Voltar</Button>
      ) : undefined}
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Registros" value={entries.length} />
        <Stat label="Anos cobertos" value={years.length} />
        <Stat label="Acontecimentos" value={timeline.length + events.length} />
      </div>

      {entries.length > 0 && (() => {
        const seen = new Map<string, number>();
        for (const e of entries) seen.set(e.entry_date, (seen.get(e.entry_date) ?? 0) + 1);
        const dup = [...seen.values()].filter((n) => n > 1).length;
        const empty = entries.filter((e) => !e.content?.trim()).length;
        return (
          <div className="mb-6 rounded-xl border border-border bg-secondary/30 px-4 py-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Auditoria (somente leitura):</span>{" "}
            {entries.length} diários no banco × ~299 arquivos informados — diferença de {Math.max(0, 299 - entries.length)}.
            {" "}Datas repetidas: {dup} · sem conteúdo: {empty}. Causas prováveis: arquivos sem data reconhecida ou o mesmo dia em mais de um arquivo (unidos na importação). Nada foi alterado.
          </div>
        );
      })()}

      <div className="panel mb-6 p-5">
        <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Search className="h-3 w-3" /> Busca inteligente no histórico
        </p>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder='ex.: pranayama, Liber LXV, meditação, cliente' />
        {hits && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-primary">Acontecimentos ({hits.events.length})</p>
              <ul className="mt-2 max-h-64 space-y-1 overflow-auto text-sm">
                {hits.events.map((t, i) => (
                  <li key={i}><span className="text-primary">{dateBR(t.event_date)}{t.event_time ? ` ${t.event_time}` : ""}</span> — {t.description}</li>
                ))}
                {hits.events.length === 0 && <li className="text-muted-foreground">Nada encontrado.</li>}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-primary">Práticas ({hits.practices.length})</p>
              <ul className="mt-2 max-h-64 space-y-1 overflow-auto text-sm">
                {hits.practices.map((p, i) => (
                  <li key={i}><span className="text-primary">{dateBR(p.practice_date)}{p.practice_time ? ` ${p.practice_time}` : ""}</span> — {p.name}</li>
                ))}
                {hits.practices.length === 0 && <li className="text-muted-foreground">Nada encontrado.</li>}
              </ul>
            </div>
          </div>
        )}
      </div>

      {entries.length === 0 && <Empty>Nenhum registro ainda. Importe seu diário histórico para montar a linha do tempo.</Empty>}

      {year === null && years.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {years.map((y) => (
            <button key={y} onClick={() => setYear(y)} className="panel p-5 text-left transition-colors hover:border-primary">
              <p className="text-2xl font-black">{y}</p>
              <p className="text-xs text-muted-foreground">{byYear.get(y)?.length ?? 0} registro(s)</p>
            </button>
          ))}
        </div>
      )}

      {year !== null && month === null && (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {MONTH_NAMES.map((name, i) => {
            const list = byMonth.get(i + 1) ?? [];
            return (
              <button
                key={name}
                disabled={list.length === 0}
                onClick={() => setMonth(i + 1)}
                className="panel p-4 text-left transition-colors hover:border-primary disabled:opacity-40"
              >
                <p className="font-bold">{name}</p>
                <p className="text-xs text-muted-foreground">{list.length} registro(s)</p>
              </button>
            );
          })}
        </div>
      )}

      {month !== null && !dayEntry && (
        <div className="relative grid gap-3 border-l border-border pl-5">
          {monthEntries.map((e) => (
            <button key={e.id} onClick={() => setDay(e.id)} className="panel relative p-4 text-left transition-colors hover:border-primary">
              <span className="absolute -left-[27px] top-6 h-2 w-2 rounded-full bg-primary" />
              <p className="font-semibold">{e.title || dateBR(e.entry_date)}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {dateBR(e.entry_date)}{e.mood ? ` · ${e.mood}` : ""}{e.energy !== null ? ` · energia ${e.energy}/10` : ""}
              </p>
              {e.highlights && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{e.highlights}</p>}
            </button>
          ))}
        </div>
      )}

      {dayEntry && (
        <article className="panel p-5">
          <p className="text-xs uppercase tracking-wide text-primary">{dateBR(dayEntry.entry_date)}</p>
          <h2 className="mt-1 text-xl font-black">{dayEntry.title || "Registro"}</h2>
          {dayEntry.content && <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{dayEntry.content}</p>}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Acontecimentos</p>
              <ul className="mt-2 space-y-1 text-sm">
                {timeline.filter((v) => v.journal_id === dayEntry.id).map((v, i) => (
                  <li key={`t${i}`}><span className="text-primary">{v.event_time ?? v.category}</span> — {v.description}</li>
                ))}
                {events.filter((v) => v.journal_id === dayEntry.id).map((v, i) => (
                  <li key={i}><span className="text-primary">{v.event_time ?? v.category}</span> — {v.description}</li>
                ))}
                {events.every((v) => v.journal_id !== dayEntry.id) && timeline.every((v) => v.journal_id !== dayEntry.id) && (
                  <li className="text-muted-foreground">Sem acontecimentos extraídos.</li>
                )}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Práticas e padrões</p>
              <ul className="mt-2 space-y-1 text-sm">
                {history.filter((v) => v.journal_id === dayEntry.id).map((v, i) => (
                  <li key={`p${i}`}><Sparkles className="mr-1 inline h-3 w-3 text-primary" />{v.practice_time ? `${v.practice_time} · ` : ""}{v.name}</li>
                ))}
              </ul>
              {insights.filter((v) => v.journal_id === dayEntry.id).map((v, i) => (
                <div key={i} className="mt-2 space-y-2 text-sm">
                  {v.practices.length > 0 && <p><Sparkles className="mr-1 inline h-3 w-3 text-primary" />{v.practices.join(", ")}</p>}
                  {v.tags.length > 0 && <p className="text-muted-foreground">#{v.tags.join(" #")}</p>}
                  {v.patterns && <p className="text-muted-foreground">{v.patterns}</p>}
                </div>
              ))}
            </div>
          </div>

          {dayEntry.learnings && <p className="mt-4 text-sm"><span className="text-primary">Aprendizados:</span> {dayEntry.learnings}</p>}
          {dayEntry.highlights && <p className="mt-2 text-sm"><span className="text-primary">Acontecimentos importantes:</span> {dayEntry.highlights}</p>}
        </article>
      )}
    </PersonalShell>
  );
}

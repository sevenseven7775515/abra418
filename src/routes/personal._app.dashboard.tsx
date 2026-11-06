import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, BookOpen, Brain, CalendarClock, CalendarDays, CloudSun, Flame, MapPin, Moon, Sun, Target, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { money, dateBR } from "@/components/personal/kit";
import marcosAvatar from "@/assets/marcos.png.asset.json";
import { CommercialEngine, HermesDirection, StalledItems, useHermesSnapshot } from "@/components/personal/HermesBlocks";
import { fetchWeather } from "@/lib/weather";
import { currentPlanetaryHour, dayRuler, moonIllumination, moonPhase, moonSign } from "@/lib/astro";
import {
  currentStreak, daysAgo, disciplineScore, energyScore, lifePhase, moodScore,
  productivityScore, rangeAdherence,
} from "@/lib/personal-insights";

export const Route = createFileRoute("/personal/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — PERSONAL OS" },
      { name: "description", content: "Painel pessoal de comando com prioridades do dia, rotina, pendências e evolução pessoal." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Dashboard — PERSONAL OS" },
      { property: "og:description", content: "Seu painel pessoal de comando." },
    ],
  }),
  component: DashboardPage,
});

function Panel({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <section className="panel p-5">
      <header className="flex items-center gap-2 pb-4">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function greeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{value === null ? "—" : `${value}%`}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${value ?? 0}%` }} />
      </div>
    </div>
  );
}

function DashboardPage() {
  const [now, setNow] = useState(() => new Date());
  const [showMore, setShowMore] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const hermes = useHermesSnapshot();

  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [tasks, missions] = await Promise.all([
        supabase.from("tasks").select("*").order("due_date", { ascending: true }),
        supabase.from("missions").select("*"),
      ]);
      if (tasks.error) throw tasks.error;
      if (missions.error) throw missions.error;
      return { tasks: tasks.data ?? [], missions: missions.data ?? [] };
    },
  });

  const tasks = data?.tasks ?? [];
  const today = now.toISOString().slice(0, 10);

  const { data: widgets } = useQuery({
    queryKey: ["dashboard-widgets"],
    queryFn: async () => {
      const [events, finance, notes, books, practices, practiceLogs, journal] = await Promise.all([
        supabase.from("events").select("*").gte("event_date", new Date().toISOString().slice(0, 10)).order("event_date").limit(4),
        supabase.from("finance_transactions").select("*"),
        supabase.from("brain_notes").select("id,title,area,created_at").order("created_at", { ascending: false }).limit(3),
        supabase.from("books").select("id,title,status"),
        supabase.from("practices").select("id,name"),
        supabase.from("practice_logs").select("practice_id,log_date").eq("log_date", new Date().toISOString().slice(0, 10)),
        supabase.from("journal_entries").select("id,entry_date,mood").order("entry_date", { ascending: false }).limit(1),
      ]);
      return {
        events: events.data ?? [],
        finance: (finance.data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })),
        notes: notes.data ?? [],
        books: books.data ?? [],
        practices: practices.data ?? [],
        practiceLogs: practiceLogs.data ?? [],
        journal: journal.data ?? [],
      };
    },
  });

  const { data: base } = useQuery({
    queryKey: ["dashboard-history-base"],
    queryFn: async () => {
      const [days, events, hist, studyEvents, projects] = await Promise.all([
        supabase.from("journal_entries").select("id", { count: "exact", head: true }),
        supabase.from("timeline_events").select("id", { count: "exact", head: true }),
        supabase.from("practice_history").select("name"),
        supabase.from("timeline_events").select("id", { count: "exact", head: true }).eq("category", "estudos"),
        supabase.from("timeline_events").select("id", { count: "exact", head: true }).eq("category", "profissional"),
      ]);
      const names = new Set((hist.data ?? []).map((h) => h.name));
      return {
        days: days.count ?? 0,
        events: events.count ?? 0,
        practices: (hist.data ?? []).length,
        habits: names.size,
        studies: studyEvents.count ?? 0,
        projects: projects.count ?? 0,
      };
    },
  });

  const { data: state } = useQuery({
    queryKey: ["dashboard-state"],
    queryFn: async () => {
      const [settings, journal, logs, activePractices] = await Promise.all([
        supabase.from("user_settings").select("display_name, avatar_url, location").maybeSingle(),
        supabase.from("journal_entries").select("entry_date, mood, energy").order("entry_date", { ascending: false }).limit(120),
        supabase.from("practice_logs").select("practice_id, log_date").gte("log_date", daysAgo(60)),
        supabase.from("practices").select("id").eq("active", true),
      ]);
      return {
        settings: settings.data ?? null,
        journal: journal.data ?? [],
        logs: logs.data ?? [],
        activePractices: activePractices.data?.length ?? 0,
      };
    },
  });

  const { data: weather } = useQuery({
    queryKey: ["weather-sjdr"],
    queryFn: fetchWeather,
    staleTime: 15 * 60_000,
    retry: 1,
  });

  const fin = widgets?.finance ?? [];
  const income = fin.filter((t) => t.kind === "receita").reduce((s, t) => s + t.amount, 0);
  const expense = fin.filter((t) => t.kind === "despesa").reduce((s, t) => s + t.amount, 0);
  const upcomingBills = fin.filter((t) => t.kind === "despesa" && !t.paid && t.due_date && t.due_date >= today);
  const practicesDone = widgets?.practiceLogs.length ?? 0;
  const practicesTotal = widgets?.practices.length ?? 0;

  const done = tasks.filter((t) => t.status === "concluido");
  const open = tasks.filter((t) => t.status !== "concluido");
  const late = open.filter((t) => t.due_date && t.due_date < today);
  const priorities = open
    .slice()
    .sort((a, b) => {
      const w = { alta: 0, media: 1, baixa: 2 } as Record<string, number>;
      return (w[a.priority] ?? 3) - (w[b.priority] ?? 3);
    })
    .slice(0, 3);
  const routine = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;

  const journalEntries = state?.journal ?? [];
  const practiceHistory = state?.logs ?? [];
  const activePractices = state?.activePractices ?? 0;
  const scores = {
    energy: energyScore(journalEntries),
    mood: moodScore(journalEntries),
    productivity: productivityScore(tasks),
    discipline: disciplineScore(practiceHistory, activePractices),
  };
  const phase = lifePhase(scores, data?.missions.length ?? 0, open.length);
  const streak = currentStreak(practiceHistory);
  const week = rangeAdherence(practiceHistory, activePractices, 7);
  const month = rangeAdherence(practiceHistory, activePractices, 30);

  const fullName = state?.settings?.display_name?.trim() || "Marcos";
  const firstName = fullName.split(" ")[0] ?? "Marcos";
  const avatarUrl = state?.settings?.avatar_url || marcosAvatar.url;
  const place = state?.settings?.location?.trim() || "São João del-Rei — MG";
  const hour = currentPlanetaryHour(now);
  const phaseMoon = moonPhase(now);

  return (
    <PersonalShell title={`${greeting(now.getHours())}, ${firstName}.`} subtitle="Seu painel pessoal de comando.">
      <section className="panel mb-4 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-primary bg-secondary glow-neon">
          <img
            src={avatarUrl}
            alt={`Foto de perfil de ${fullName}`}
            className="h-full w-full object-cover object-top"
          />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-black tracking-tight">{greeting(now.getHours())}, {firstName}.</h2>
          <p className="mt-0.5 text-xs capitalize text-muted-foreground">
            {now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })} · {place}
          </p>
          <p className="mt-2 inline-flex rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
            {phase.phase}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{phase.summary}</p>
        </div>
      </section>

      <div className="mb-4 grid gap-4">
        <HermesDirection snapshot={hermes.data} compact />
        <CommercialEngine snapshot={hermes.data} />
        <StalledItems snapshot={hermes.data} />
      </div>

      <button
        onClick={() => setShowMore((v) => !v)}
        className="mb-4 w-full rounded-xl border border-border py-2.5 text-xs uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
      >
        {showMore ? "Ocultar o secundário" : "Ver o secundário (histórico, hoje, módulos)"}
      </button>

      {showMore && (<>
      <section className="panel mb-4 p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Base histórica</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[11px] text-muted-foreground sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Dias registrados", base?.days ?? 0],
            ["Acontecimentos", base?.events ?? 0],
            ["Práticas realizadas", base?.practices ?? 0],
            ["Hábitos identificados", base?.habits ?? 0],
            ["Registros de estudo", base?.studies ?? 0],
            ["Registros profissionais", base?.projects ?? 0],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-border bg-secondary/40 px-2 py-3">
              <p className="text-xl font-black text-foreground">{value as number}</p>
              <p className="mt-0.5">{label as string}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="Hoje" icon={Sun}>
          <p className="text-3xl font-black tracking-tight">
            {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            {now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </p>
          <p className="mt-4 flex items-center gap-2 text-sm text-foreground/80">
            <MapPin className="h-4 w-4 text-primary" /> {place}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
            <div className="rounded-xl border border-border bg-secondary/40 px-2 py-3">
              <p className="flex items-center justify-center gap-1 text-foreground/70"><CloudSun className="h-3.5 w-3.5 text-primary" /> Clima</p>
              <p className="mt-1 font-semibold text-foreground">{weather ? `${weather.temperature}°C` : "—"}</p>
              <p className="mt-0.5">{weather ? weather.label : "carregando"}</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 px-2 py-3">
              <p className="text-foreground/70">Nascer do sol</p>
              <p className="mt-1 font-semibold text-foreground">{weather?.sunrise ?? "—"}</p>
              <p className="mt-0.5">mín {weather ? `${weather.min}°` : "—"}</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 px-2 py-3">
              <p className="text-foreground/70">Pôr do sol</p>
              <p className="mt-1 font-semibold text-foreground">{weather?.sunset ?? "—"}</p>
              <p className="mt-0.5">máx {weather ? `${weather.max}°` : "—"}</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <p className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2">
              <Moon className="h-3.5 w-3.5 text-primary" />
              {phaseMoon.label} · {(moonIllumination(now) * 100).toFixed(0)}% · {moonSign(now).name}
            </p>
            <p className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2">
              <Activity className="h-3.5 w-3.5 text-primary" />
              Hora de {hour.planet} · dia de {dayRuler(now)}
            </p>
          </div>
        </Panel>

        <Panel title="Prioridades do dia" icon={Target}>
          <ol className="space-y-3">
            {[0, 1, 2].map((i) => {
              const t = priorities[i];
              return (
                <li key={i} className="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="min-w-0 text-sm">
                    {t ? (
                      <>
                        <span className="block truncate font-medium">{t.title}</span>
                        <span className="text-xs capitalize text-muted-foreground">{t.priority} · {t.area}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Definir prioridade</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
          <Link to="/personal/tasks" className="mt-4 inline-block text-xs text-primary hover:underline">
            Ver todas as tarefas →
          </Link>
        </Panel>

        <Panel title="Minha rotina" icon={CalendarClock}>
          <p className="text-4xl font-black text-neon">{routine}%</p>
          <p className="mt-1 text-sm text-muted-foreground">concluído</p>
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${routine}%` }} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {done.length} de {tasks.length} tarefas concluídas
          </p>
        </Panel>

        <Panel title="Pendências" icon={AlertTriangle}>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Tarefas atrasadas</span>
              <span className="font-bold text-destructive">{late.length}</span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Contas próximas</span>
              <span className="font-bold text-foreground">{upcomingBills.length}</span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Práticas de hoje</span>
              <span className="font-bold text-foreground">{practicesDone}/{practicesTotal}</span>
            </li>
          </ul>
        </Panel>

        <Panel title="Evolução pessoal" icon={Flame}>
          <div className="grid gap-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-border bg-secondary/30 px-2 py-3">
                <p className="text-[11px] text-muted-foreground">Sequência</p>
                <p className="text-xl font-bold text-neon">{streak}d</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/30 px-2 py-3">
                <p className="text-[11px] text-muted-foreground">Semana</p>
                <p className="text-xl font-bold">{week}%</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/30 px-2 py-3">
                <p className="text-[11px] text-muted-foreground">Mês</p>
                <p className="text-xl font-bold">{month}%</p>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 px-3 py-3">
              <p className="text-xs text-muted-foreground">Missões ativas</p>
              <p className="text-2xl font-bold">{data?.missions.length ?? 0}</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-3 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4 text-primary" />
              {(widgets?.books.filter((b) => b.status === "lendo").length ?? 0)} livro(s) em leitura ·{" "}
              {widgets?.journal[0] ? `último diário ${dateBR(widgets.journal[0].entry_date)}` : "sem registro no diário"}
            </div>
          </div>
        </Panel>

        <Panel title="Como estou?" icon={Activity}>
          <div className="grid gap-3">
            <ScoreBar label="Energia" value={scores.energy} />
            <ScoreBar label="Humor" value={scores.mood} />
            <ScoreBar label="Produtividade" value={scores.productivity} />
            <ScoreBar label="Disciplina" value={scores.discipline} />
          </div>
          <Link to="/personal/patterns" className="mt-4 inline-block text-xs text-primary hover:underline">
            Ver reconhecimento de padrões →
          </Link>
        </Panel>

        <Panel title="Próximos compromissos" icon={CalendarDays}>
          {(widgets?.events.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento agendado.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {widgets?.events.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-2">
                  <span className="min-w-0 truncate">{e.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{dateBR(e.event_date)}{e.start_time ? ` ${String(e.start_time).slice(0, 5)}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/personal/agenda" className="mt-4 inline-block text-xs text-primary hover:underline">Abrir agenda →</Link>
        </Panel>

        <Panel title="Resumo financeiro" icon={Wallet}>
          <p className="text-3xl font-black text-neon">{money(income - expense)}</p>
          <p className="mt-1 text-sm text-muted-foreground">saldo atual</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-xl border border-border bg-secondary/30 px-2 py-3">
              <p className="text-muted-foreground">Receitas</p>
              <p className="mt-1 font-semibold">{money(income)}</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 px-2 py-3">
              <p className="text-muted-foreground">Despesas</p>
              <p className="mt-1 font-semibold">{money(expense)}</p>
            </div>
          </div>
          <Link to="/personal/finance" className="mt-4 inline-block text-xs text-primary hover:underline">Ver financeiro →</Link>
        </Panel>

        <Panel title="Notas recentes" icon={Brain}>
          {(widgets?.notes.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma nota no Segundo Cérebro ainda.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {widgets?.notes.map((n) => (
                <li key={n.id} className="rounded-xl border border-border bg-secondary/30 px-3 py-2">
                  <span className="block truncate font-medium">{n.title}</span>
                  <span className="text-xs capitalize text-muted-foreground">{n.area}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/personal/brain" className="mt-4 inline-block text-xs text-primary hover:underline">Abrir Segundo Cérebro →</Link>
        </Panel>
      </div>
      </>)}
    </PersonalShell>
  );
}
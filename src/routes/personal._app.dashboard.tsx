import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertTriangle, BookOpen, Brain, CalendarClock, CalendarDays, Flame, MapPin, Sun, Target, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { money, dateBR } from "@/components/personal/kit";

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

function DashboardPage() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

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

  const firstName = "Marcos";

  return (
    <PersonalShell title={`${greeting(now.getHours())}, ${firstName}.`} subtitle="Seu painel pessoal de comando.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="Hoje" icon={Sun}>
          <p className="text-3xl font-black tracking-tight">
            {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            {now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </p>
          <p className="mt-4 flex items-center gap-2 text-sm text-foreground/80">
            <MapPin className="h-4 w-4 text-primary" /> São João del-Rei — MG
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
            {["Clima", "Nascer do sol", "Pôr do sol"].map((l) => (
              <div key={l} className="rounded-xl border border-border bg-secondary/40 px-2 py-3">
                <p className="text-foreground/70">{l}</p>
                <p className="mt-1">em breve</p>
              </div>
            ))}
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
    </PersonalShell>
  );
}
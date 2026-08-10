import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Chips, Empty, Field, Opt, Select, useUserId, dateBR } from "@/components/personal/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/personal/_app/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — PERSONAL OS" },
      { name: "description", content: "Agenda pessoal com visão mensal, semanal e diária, categorias, prioridades e lembretes." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Agenda — PERSONAL OS" },
      { property: "og:description", content: "Compromissos, lembretes e integração com tarefas." },
    ],
  }),
  component: AgendaPage,
});

const VIEWS = ["mes", "semana", "dia"] as const;
const VIEW_LABEL = { mes: "Mês", semana: "Semana", dia: "Dia" };
const CATEGORIES = ["pessoal", "profissional", "saude", "estudo", "ritual", "outros"];
const PRIORITIES = ["alta", "media", "baixa"];
const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

type EventRow = {
  id: string; title: string; description: string | null; event_date: string;
  start_time: string | null; end_time: string | null; category: string;
  priority: string; reminder_minutes: number | null; task_id: string | null;
};

const emptyForm = {
  title: "", description: "", event_date: iso(new Date()), start_time: "", end_time: "",
  category: "pessoal", priority: "media", reminder_minutes: "", task_id: "",
};

function AgendaPage() {
  const qc = useQueryClient();
  const userId = useUserId();
  const [view, setView] = useState<(typeof VIEWS)[number]>("mes");
  const [cursor, setCursor] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*")
        .order("event_date").order("start_time", { nullsFirst: true });
      if (error) throw error;
      return data as EventRow[];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("id,title").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["events"] });
    qc.invalidateQueries({ queryKey: ["dashboard-widgets"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        event_date: form.event_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        category: form.category,
        priority: form.priority,
        reminder_minutes: form.reminder_minutes ? Number(form.reminder_minutes) : null,
        task_id: form.task_id || null,
      };
      if (editing) {
        const { error } = await supabase.from("events").update(payload).eq("id", editing);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events").insert({ ...payload, user_id: userId! });
        if (error) throw error;
      }
    },
    onSuccess: () => { setOpen(false); setEditing(null); setForm(emptyForm); invalidate(); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const range = useMemo(() => {
    if (view === "dia") return [cursor, cursor];
    if (view === "semana") {
      const start = addDays(cursor, -cursor.getDay());
      return [start, addDays(start, 6)];
    }
    return [
      new Date(cursor.getFullYear(), cursor.getMonth(), 1),
      new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0),
    ];
  }, [cursor, view]);

  const visible = events.filter((e) => e.event_date >= iso(range[0]!) && e.event_date <= iso(range[1]!));

  const monthCells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const cells: (Date | null)[] = Array.from({ length: first.getDay() }, () => null);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= last; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    return cells;
  }, [cursor]);

  function shift(dir: number) {
    if (view === "mes") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
    else setCursor(addDays(cursor, dir * (view === "semana" ? 7 : 1)));
  }

  function startEdit(e: EventRow) {
    setEditing(e.id);
    setForm({
      title: e.title, description: e.description ?? "", event_date: e.event_date,
      start_time: e.start_time?.slice(0, 5) ?? "", end_time: e.end_time?.slice(0, 5) ?? "",
      category: e.category, priority: e.priority,
      reminder_minutes: e.reminder_minutes ? String(e.reminder_minutes) : "",
      task_id: e.task_id ?? "",
    });
    setOpen(true);
  }

  const label = view === "mes"
    ? cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : `${dateBR(iso(range[0]!))} — ${dateBR(iso(range[1]!))}`;

  return (
    <PersonalShell
      title="Agenda"
      subtitle="Compromissos, lembretes e integração com tarefas."
      actions={
        <Button onClick={() => { setEditing(null); setForm(emptyForm); setOpen((v) => !v); }} className="font-semibold glow-neon">
          <Plus className="h-4 w-4" /> Evento
        </Button>
      }
    >
      <Chips items={VIEWS} value={view} onChange={setView} labels={VIEW_LABEL} />

      {open && (
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="panel mb-6 grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Título" className="sm:col-span-2">
            <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Descrição" className="sm:col-span-2">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Data">
            <Input type="date" required value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
          </Field>
          <Field label="Lembrete (min antes)">
            <Input type="number" min="0" value={form.reminder_minutes} onChange={(e) => setForm({ ...form, reminder_minutes: e.target.value })} />
          </Field>
          <Field label="Início">
            <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          </Field>
          <Field label="Fim">
            <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          </Field>
          <Field label="Categoria">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="capitalize">
              {CATEGORIES.map((c) => <Opt key={c} value={c}>{c}</Opt>)}
            </Select>
          </Field>
          <Field label="Prioridade">
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="capitalize">
              {PRIORITIES.map((p) => <Opt key={p} value={p}>{p}</Opt>)}
            </Select>
          </Field>
          <Field label="Tarefa relacionada" className="sm:col-span-2">
            <Select value={form.task_id} onChange={(e) => setForm({ ...form, task_id: e.target.value })}>
              <Opt value="">Sem vínculo</Opt>
              {tasks.map((t) => <Opt key={t.id} value={t.id}>{t.title}</Opt>)}
            </Select>
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={save.isPending} className="font-semibold glow-neon">
              {editing ? "Salvar alterações" : "Criar evento"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setOpen(false); setEditing(null); }}>Cancelar</Button>
          </div>
        </form>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <Button variant="ghost" size="icon" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <p className="text-sm font-semibold capitalize">{label}</p>
        <Button variant="ghost" size="icon" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {view === "mes" && (
        <div className="panel mb-6 p-3">
          <div className="grid grid-cols-7 gap-1 pb-2 text-center text-[11px] text-muted-foreground">
            {WEEKDAYS.map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((day, i) => {
              const key = day ? iso(day) : `x${i}`;
              const dayEvents = day ? events.filter((e) => e.event_date === iso(day)) : [];
              const today = day && iso(day) === iso(new Date());
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!day}
                  onClick={() => day && (setCursor(day), setView("dia"))}
                  className={cn(
                    "min-h-16 rounded-lg border border-border/60 p-1 text-left text-[11px] transition-colors",
                    !day && "border-transparent",
                    today && "border-primary",
                    day && "hover:border-primary/60",
                  )}
                >
                  {day && <span className="font-semibold">{day.getDate()}</span>}
                  {dayEvents.slice(0, 2).map((e) => (
                    <span key={e.id} className="mt-0.5 block truncate rounded bg-primary/15 px-1 text-primary">{e.title}</span>
                  ))}
                  {dayEvents.length > 2 && <span className="text-muted-foreground">+{dayEvents.length - 2}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {visible.length === 0 && <Empty>Nenhum compromisso neste período.</Empty>}
        {visible.map((e) => (
          <article key={e.id} className="panel flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-semibold">{e.title}</p>
              <p className="text-xs text-muted-foreground">
                {dateBR(e.event_date)}
                {e.start_time && ` · ${e.start_time.slice(0, 5)}`}
                {e.end_time && `–${e.end_time.slice(0, 5)}`}
                {` · ${e.category} · prioridade ${e.priority}`}
                {e.reminder_minutes ? ` · lembrete ${e.reminder_minutes} min antes` : ""}
              </p>
              {e.description && <p className="mt-2 text-sm text-muted-foreground">{e.description}</p>}
              {e.task_id && (
                <p className="mt-1 text-xs text-primary">
                  Tarefa: {tasks.find((t) => t.id === e.task_id)?.title ?? "vinculada"}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" onClick={() => startEdit(e)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove.mutate(e.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </article>
        ))}
      </div>
    </PersonalShell>
  );
}

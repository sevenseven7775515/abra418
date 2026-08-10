import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/personal/_app/tasks")({
  head: () => ({
    meta: [
      { title: "Tarefas — PERSONAL OS" },
      { name: "description", content: "Gerencie tarefas profissionais, pessoais e administrativas com prioridade, prazo e checklist." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Tarefas — PERSONAL OS" },
      { property: "og:description", content: "Sistema completo de gerenciamento de tarefas." },
    ],
  }),
  component: TasksPage,
});

const AREAS: Record<string, string[]> = {
  profissional: ["Clientes", "Marketing", "Conteúdo", "Projetos", "Produtos"],
  pessoal: ["Família", "Casa", "Organização", "Saúde"],
  administrativo: ["Contas", "Documentos", "Pendências"],
};
const PRIORITIES = ["alta", "media", "baixa"] as const;
const STATUSES = ["pendente", "em_andamento", "concluido"] as const;
const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};
const FILTERS = ["todas", "hoje", "semana", "atrasadas", "concluidas"] as const;

type ChecklistItem = { text: string; done: boolean };

function TasksPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("todas");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    area: "pessoal",
    category: "",
    priority: "media",
    due_date: "",
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createTask = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("tasks").insert({
        user_id: auth.user!.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        area: form.area,
        category: form.category || null,
        priority: form.priority,
        due_date: form.due_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setOpen(false);
      setForm({ title: "", description: "", area: "pessoal", category: "", priority: "media", due_date: "" });
      invalidate();
    },
  });

  type TaskPatch = { status?: string; checklist?: ChecklistItem[] };
  const updateTask = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TaskPatch }) => {
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const visible = tasks.filter((t) => {
    if (filter === "concluidas") return t.status === "concluido";
    if (filter === "hoje") return t.status !== "concluido" && t.due_date === today;
    if (filter === "semana") return t.status !== "concluido" && !!t.due_date && t.due_date >= today && t.due_date <= weekEnd;
    if (filter === "atrasadas") return t.status !== "concluido" && !!t.due_date && t.due_date < today;
    return t.status !== "concluido";
  });

  return (
    <PersonalShell
      title="Tarefas"
      subtitle="Profissional, pessoal e administrativo em um só fluxo."
      actions={
        <Button onClick={() => setOpen((v) => !v)} className="hidden font-semibold glow-neon sm:inline-flex">
          <Plus className="mr-1 h-4 w-4" /> Nova tarefa
        </Button>
      }
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs capitalize transition-colors",
              filter === f
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createTask.mutate();
          }}
          className="panel mb-6 grid gap-4 p-5 sm:grid-cols-2"
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="desc">Descrição</Label>
            <Textarea id="desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Área</Label>
            <select
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value, category: "" })}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm capitalize"
            >
              {Object.keys(AREAS).map((a) => (
                <option key={a} value={a} className="bg-card">{a}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="" className="bg-card">Sem categoria</option>
            {(AREAS[form.area] ?? []).map((c) => (
                <option key={c} value={c} className="bg-card">{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm capitalize"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p} className="bg-card">{p}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="due">Data limite</Label>
            <Input id="due" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={createTask.isPending} className="font-semibold glow-neon">
              Salvar tarefa
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {visible.length === 0 && (
          <p className="panel p-8 text-center text-sm text-muted-foreground">Nenhuma tarefa neste filtro.</p>
        )}
        {visible.map((task) => {
          const checklist = (task.checklist as unknown as ChecklistItem[]) ?? [];
          return (
            <article key={task.id} className="panel p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={cn("truncate font-semibold", task.status === "concluido" && "line-through text-muted-foreground")}>
                      {task.title}
                    </h3>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide",
                        task.priority === "alta"
                          ? "bg-destructive/20 text-destructive"
                          : task.priority === "media"
                            ? "bg-primary/15 text-primary"
                            : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {task.priority}
                    </span>
                  </div>
                  {task.description && <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>}
                  <p className="mt-2 text-xs capitalize text-muted-foreground">
                    {task.area}
                    {task.category ? ` · ${task.category}` : ""}
                    {task.due_date ? ` · ${new Date(`${task.due_date}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}
                  </p>
                  {checklist.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {checklist.map((item, i) => (
                        <li key={i}>
                          <button
                            onClick={() => {
                              const next = checklist.map((c, idx) => (idx === i ? { ...c, done: !c.done } : c));
                              updateTask.mutate({ id: task.id, patch: { checklist: next } });
                            }}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <span
                              className={cn(
                                "grid h-4 w-4 place-items-center rounded border border-border",
                                item.done && "border-primary bg-primary text-primary-foreground",
                              )}
                            >
                              {item.done && <Check className="h-3 w-3" />}
                            </span>
                            <span className={cn(item.done && "line-through")}>{item.text}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = e.currentTarget.elements.namedItem("item") as HTMLInputElement;
                      if (!input.value.trim()) return;
                      updateTask.mutate({
                        id: task.id,
                        patch: { checklist: [...checklist, { text: input.value.trim(), done: false }] },
                      });
                      input.value = "";
                    }}
                    className="mt-3"
                  >
                    <input
                      name="item"
                      placeholder="+ item do checklist"
                      className="w-full max-w-xs rounded-lg border border-border bg-transparent px-3 py-1.5 text-xs outline-none focus:border-primary"
                    />
                  </form>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <select
                    value={task.status}
                    onChange={(e) => updateTask.mutate({ id: task.id, patch: { status: e.target.value } })}
                    className="rounded-lg border border-border bg-transparent px-2 py-1 text-xs"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s} className="bg-card">{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeTask.mutate(task.id)}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Excluir tarefa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <Button onClick={() => setOpen(true)} className="mt-6 w-full font-semibold sm:hidden">
        <Plus className="mr-1 h-4 w-4" /> Nova tarefa
      </Button>
    </PersonalShell>
  );
}
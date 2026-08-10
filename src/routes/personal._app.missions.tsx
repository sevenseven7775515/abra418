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

export const Route = createFileRoute("/personal/_app/missions")({
  head: () => ({
    meta: [
      { title: "Missões — PERSONAL OS" },
      { name: "description", content: "Defina objetivos de longo prazo, etapas e acompanhe o progresso de cada missão pessoal." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Missões — PERSONAL OS" },
      { property: "og:description", content: "Sistema de objetivos e progresso." },
    ],
  }),
  component: MissionsPage,
});

type Step = { text: string; done: boolean };

function MissionsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", objective: "", deadline: "" });

  const { data: missions = [] } = useQuery({
    queryKey: ["missions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("missions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["missions"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("missions").insert({
        user_id: auth.user!.id,
        name: form.name.trim(),
        objective: form.objective.trim() || null,
        deadline: form.deadline || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setOpen(false);
      setForm({ name: "", objective: "", deadline: "" });
      invalidate();
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, steps }: { id: string; steps: Step[] }) => {
      const { error } = await supabase.from("missions").update({ steps }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("missions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return (
    <PersonalShell
      title="Missões"
      subtitle="Objetivos maiores, divididos em etapas mensuráveis."
      actions={
        <Button onClick={() => setOpen((v) => !v)} className="hidden font-semibold glow-neon sm:inline-flex">
          <Plus className="mr-1 h-4 w-4" /> Nova missão
        </Button>
      }
    >
      {open && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="panel mb-6 grid gap-4 p-5 sm:grid-cols-2"
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Nome da missão</Label>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Construir autoridade digital" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="obj">Objetivo</Label>
            <Textarea id="obj" value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Publicar 100 vídeos" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline">Prazo</Label>
            <Input id="deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={create.isPending} className="font-semibold glow-neon">Salvar</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {missions.length === 0 && (
          <p className="panel p-8 text-center text-sm text-muted-foreground lg:col-span-2">
            Nenhuma missão criada ainda.
          </p>
        )}
        {missions.map((mission) => {
          const steps = (mission.steps as unknown as Step[]) ?? [];
          const doneCount = steps.filter((s) => s.done).length;
          const progress = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;
          return (
            <article key={mission.id} className="panel p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold">{mission.name}</h3>
                  {mission.objective && <p className="mt-1 text-sm text-muted-foreground">{mission.objective}</p>}
                  {mission.deadline && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Prazo: {new Date(`${mission.deadline}T12:00:00`).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => remove.mutate(mission.id)}
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                  aria-label="Excluir missão"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progresso</span>
                  <span className="font-bold text-primary">{progress}%</span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <ul className="mt-4 space-y-1.5">
                {steps.map((step, i) => (
                  <li key={i}>
                    <button
                      onClick={() => update.mutate({ id: mission.id, steps: steps.map((s, idx) => (idx === i ? { ...s, done: !s.done } : s)) })}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <span className={cn("grid h-4 w-4 place-items-center rounded border border-border", step.done && "border-primary bg-primary text-primary-foreground")}>
                        {step.done && <Check className="h-3 w-3" />}
                      </span>
                      <span className={cn(step.done && "line-through")}>{step.text}</span>
                    </button>
                  </li>
                ))}
              </ul>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = e.currentTarget.elements.namedItem("step") as HTMLInputElement;
                  if (!input.value.trim()) return;
                  update.mutate({ id: mission.id, steps: [...steps, { text: input.value.trim(), done: false }] });
                  input.value = "";
                }}
                className="mt-3"
              >
                <input
                  name="step"
                  placeholder="+ nova etapa"
                  className="w-full max-w-xs rounded-lg border border-border bg-transparent px-3 py-1.5 text-xs outline-none focus:border-primary"
                />
              </form>
            </article>
          );
        })}
      </div>

      <Button onClick={() => setOpen(true)} className="mt-6 w-full font-semibold sm:hidden">
        <Plus className="mr-1 h-4 w-4" /> Nova missão
      </Button>
    </PersonalShell>
  );
}
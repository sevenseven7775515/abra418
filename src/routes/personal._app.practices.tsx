import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Empty, Field, Opt, Select, Stat, useUserId } from "@/components/personal/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/personal/_app/practices")({
  head: () => ({
    meta: [
      { title: "Práticas — PERSONAL OS" },
      { name: "description", content: "Acompanhe práticas pessoais como meditação, exercícios e estudos com sequência diária e histórico." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Práticas — PERSONAL OS" },
      { property: "og:description", content: "Sequência diária, histórico e evolução das práticas." },
    ],
  }),
  component: PracticesPage,
});

const CATEGORIES = ["bem_estar", "corpo", "mente", "estudo", "ritual"];
const CAT_LABEL: Record<string, string> = {
  bem_estar: "Bem-estar", corpo: "Corpo", mente: "Mente", estudo: "Estudo", ritual: "Ritual",
};
const FREQUENCIES = ["diaria", "semanal", "mensal"];

type Practice = { id: string; name: string; category: string; frequency: string; objective: string | null; active: boolean };
type Log = { id: string; practice_id: string; log_date: string };

const emptyForm = { name: "", category: "bem_estar", frequency: "diaria", objective: "" };
const iso = (d: Date) => d.toISOString().slice(0, 10);

function PracticesPage() {
  const qc = useQueryClient();
  const userId = useUserId();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: practices = [] } = useQuery({
    queryKey: ["practices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("practices").select("*").order("created_at");
      if (error) throw error;
      return data as Practice[];
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["practice-logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("practice_logs").select("*").order("log_date", { ascending: false });
      if (error) throw error;
      return data as Log[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["practice-logs"] });
    qc.invalidateQueries({ queryKey: ["practices"] });
    qc.invalidateQueries({ queryKey: ["dashboard-widgets"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("practices").insert({
        user_id: userId!,
        name: form.name.trim(),
        category: form.category,
        frequency: form.frequency,
        objective: form.objective.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { setOpen(false); setForm(emptyForm); invalidate(); },
  });

  const toggleToday = useMutation({
    mutationFn: async (p: Practice) => {
      const today = iso(new Date());
      const existing = logs.find((l) => l.practice_id === p.id && l.log_date === today);
      if (existing) {
        const { error } = await supabase.from("practice_logs").delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("practice_logs").insert({ user_id: userId!, practice_id: p.id, log_date: today });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("practices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const today = iso(new Date());
  const last7 = Array.from({ length: 7 }, (_, i) => iso(new Date(Date.now() - (6 - i) * 86400000)));

  function streak(id: string) {
    const dates = new Set(logs.filter((l) => l.practice_id === id).map((l) => l.log_date));
    let count = 0;
    const d = new Date();
    if (!dates.has(iso(d))) d.setDate(d.getDate() - 1);
    while (dates.has(iso(d))) { count++; d.setDate(d.getDate() - 1); }
    return count;
  }

  const doneToday = practices.filter((p) => logs.some((l) => l.practice_id === p.id && l.log_date === today)).length;

  return (
    <PersonalShell
      title="Práticas"
      subtitle="Sequência diária, histórico e evolução."
      actions={<Button onClick={() => setOpen((v) => !v)} className="font-semibold glow-neon"><Plus className="h-4 w-4" /> Prática</Button>}
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Práticas ativas" value={practices.length} />
        <Stat label="Concluídas hoje" value={`${doneToday}/${practices.length || 0}`} />
        <Stat label="Registros totais" value={logs.length} />
      </div>

      {open && (
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="panel mb-6 grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Nome" className="sm:col-span-2">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Meditação, leitura, respiração..." />
          </Field>
          <Field label="Categoria">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <Opt key={c} value={c}>{CAT_LABEL[c]}</Opt>)}
            </Select>
          </Field>
          <Field label="Frequência">
            <Select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className="capitalize">
              {FREQUENCIES.map((f) => <Opt key={f} value={f}>{f}</Opt>)}
            </Select>
          </Field>
          <Field label="Objetivo" className="sm:col-span-2">
            <Textarea value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} />
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={create.isPending} className="font-semibold glow-neon">Criar prática</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {practices.length === 0 && <Empty>Nenhuma prática cadastrada ainda.</Empty>}
        {practices.map((p) => {
          const done = logs.some((l) => l.practice_id === p.id && l.log_date === today);
          return (
            <article key={p.id} className="panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {CAT_LABEL[p.category] ?? p.category} · {p.frequency} · sequência {streak(p.id)} dia(s)
                  </p>
                  {p.objective && <p className="mt-2 text-sm text-muted-foreground">{p.objective}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant={done ? "default" : "ghost"}
                    size="icon"
                    onClick={() => toggleToday.mutate(p)}
                    className={done ? "glow-neon" : ""}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="mt-3 flex gap-1">
                {last7.map((d) => (
                  <span
                    key={d}
                    title={d}
                    className={cn(
                      "h-2 flex-1 rounded",
                      logs.some((l) => l.practice_id === p.id && l.log_date === d) ? "bg-primary" : "bg-muted",
                    )}
                  />
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </PersonalShell>
  );
}

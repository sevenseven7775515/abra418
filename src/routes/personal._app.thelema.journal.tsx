import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { ThelemaTabs } from "@/components/personal/ThelemaTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/personal/_app/thelema/journal")({
  head: () => ({
    meta: [
      { title: "Diário Thelêmico — PERSONAL OS" },
      { name: "description", content: "Registro diário de práticas, estudos, experiências, sonhos e símbolos." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Diário Thelêmico" },
      { property: "og:description", content: "Registro avançado de práticas e experiências." },
    ],
  }),
  component: ThelemaJournal,
});

const FIELDS = [
  { key: "mental_state", label: "Estado mental" },
  { key: "practice", label: "Prática realizada" },
  { key: "study", label: "Estudo realizado" },
  { key: "results", label: "Resultados" },
  { key: "experiences", label: "Experiências" },
  { key: "dreams", label: "Sonhos" },
  { key: "symbols", label: "Símbolos" },
  { key: "observations", label: "Observações" },
] as const;

type FormState = Record<string, string>;
const EMPTY: FormState = {
  entry_date: new Date().toISOString().slice(0, 10),
  ...Object.fromEntries(FIELDS.map((f) => [f.key, ""])),
};

function ThelemaJournal() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data: entries = [] } = useQuery({
    queryKey: ["thelema-journal"],
    queryFn: async () => {
      const { data, error } = await supabase.from("thelema_journal").select("*").order("entry_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createEntry = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const payload: Record<string, string | null> = { user_id: auth.user!.id, entry_date: form["entry_date"]! };
      for (const f of FIELDS) payload[f.key] = form[f.key]?.trim() || null;
      const { error } = await supabase.from("thelema_journal").insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      setOpen(false);
      setForm({ ...EMPTY, entry_date: new Date().toISOString().slice(0, 10) });
      qc.invalidateQueries({ queryKey: ["thelema-journal"] });
    },
  });

  const removeEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("thelema_journal").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["thelema-journal"] }),
  });

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (from && e.entry_date < from) return false;
      if (to && e.entry_date > to) return false;
      if (!q) return true;
      return FIELDS.some((f) => ((e as Record<string, unknown>)[f.key] as string | null)?.toLowerCase().includes(q));
    });
  }, [entries, search, from, to]);

  return (
    <PersonalShell
      title="Diário Thelêmico"
      subtitle="Registro avançado de práticas, estudos e experiências."
      actions={
        <Button onClick={() => setOpen((v) => !v)} className="hidden font-semibold glow-neon sm:inline-flex">
          <Plus className="mr-1 h-4 w-4" /> Novo registro
        </Button>
      }
    >
      <ThelemaTabs active="journal" />

      <div className="panel mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1 lg:col-span-2">
          <Label htmlFor="q">Busca histórica</Label>
          <Input id="q" placeholder="Buscar por prática, símbolo, sonho…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="from">De</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="to">Até</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button onClick={() => setOpen((v) => !v)} className="font-semibold glow-neon sm:hidden">
          <Plus className="mr-1 h-4 w-4" /> Novo registro
        </Button>
      </div>

      {open && (
        <form onSubmit={(e) => { e.preventDefault(); createEntry.mutate(); }} className="panel mb-6 grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input id="date" type="date" required value={form["entry_date"]} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} />
          </div>
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-2">
              <Label htmlFor={f.key}>{f.label}</Label>
              <Textarea id={f.key} rows={2} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            </div>
          ))}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={createEntry.isPending} className="font-semibold glow-neon">Salvar registro</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {visible.length === 0 && <p className="panel p-8 text-center text-sm text-muted-foreground">Nenhum registro encontrado.</p>}
        {visible.map((e) => (
          <article key={e.id} className="panel p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <h3 className="font-bold text-primary">
                {new Date(`${e.entry_date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
              </h3>
              <button onClick={() => removeEntry.mutate(e.id)} className="rounded-lg p-2 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <dl className="mt-2 grid gap-3 sm:grid-cols-2">
              {FIELDS.map((f) => {
                const value = (e as Record<string, unknown>)[f.key] as string | null;
                if (!value) return null;
                return (
                  <div key={f.key} className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{f.label}</dt>
                    <dd className="whitespace-pre-wrap break-words text-sm">{value}</dd>
                  </div>
                );
              })}
            </dl>
          </article>
        ))}
      </div>
    </PersonalShell>
  );
}
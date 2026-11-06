import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Upload, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { JournalImport } from "@/components/personal/JournalImport";
import { JournalReorg } from "@/components/personal/JournalReorg";
import { EvolutionReport } from "@/components/personal/EvolutionReport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Empty, Field, Opt, Select, dateBR, useUserId } from "@/components/personal/kit";

export const Route = createFileRoute("/personal/_app/journal")({
  head: () => ({
    meta: [
      { title: "Diário — PERSONAL OS" },
      { name: "description", content: "Diário pessoal com humor, energia, gratidão, aprendizados e histórico pesquisável." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Diário — PERSONAL OS" },
      { property: "og:description", content: "Registro diário de humor, energia e aprendizados." },
    ],
  }),
  component: JournalPage,
});

const MOODS = ["otimo", "bom", "neutro", "cansado", "dificil"];

type Entry = {
  id: string; entry_date: string; title: string | null; content: string | null;
  mood: string | null; energy: number | null; gratitude: string | null;
  learnings: string | null; highlights: string | null; source_file: string | null;
  summary: string | null; main_activities: string | null; achievements: string | null;
  pending: string | null; insights: string | null; reorganized: boolean | null;
};

const emptyForm = {
  entry_date: new Date().toISOString().slice(0, 10), title: "", content: "",
  mood: "bom", energy: "7", gratitude: "", learnings: "", highlights: "",
};

function JournalPage() {
  const qc = useQueryClient();
  const userId = useUserId();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [reorgOpen, setReorgOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: entries = [] } = useQuery({
    queryKey: ["journal-entries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("journal_entries").select("*").order("entry_date", { ascending: false });
      if (error) throw error;
      return data as Entry[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["journal-entries"] });
    qc.invalidateQueries({ queryKey: ["dashboard-widgets"] });
    qc.invalidateQueries({ queryKey: ["timeline"] });
    qc.invalidateQueries({ queryKey: ["journal-signals"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("journal_entries").insert({
        user_id: userId!,
        entry_date: form.entry_date,
        title: form.title.trim() || null,
        content: form.content.trim() || null,
        mood: form.mood,
        energy: form.energy ? Number(form.energy) : null,
        gratitude: form.gratitude.trim() || null,
        learnings: form.learnings.trim() || null,
        highlights: form.highlights.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { setOpen(false); setForm(emptyForm); invalidate(); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("journal_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const term = search.trim().toLowerCase();
  const filtered = entries.filter((e) => {
    if (from && e.entry_date < from) return false;
    if (to && e.entry_date > to) return false;
    if (!term) return true;
    return [e.title, e.content, e.gratitude, e.learnings, e.highlights, e.mood, e.summary, e.main_activities, e.insights, e.source_file]
      .some((v) => (v ?? "").toLowerCase().includes(term));
  });


  return (
    <PersonalShell
      title="Diário"
      subtitle="Envie o que você já escreve. O resto é automático."
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" title="Reorganizar histórico" onClick={() => setReorgOpen((v) => !v)}>
            <Wand2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Escrever entrada" onClick={() => setOpen((v) => !v)}><Plus className="h-4 w-4" /></Button>
          <Button onClick={() => setImportOpen((v) => !v)} className="font-semibold glow-neon">
            <Upload className="h-4 w-4" /> Enviar diário
          </Button>
        </div>
      }
    >
      {reorgOpen && <JournalReorg onDone={invalidate} onClose={() => setReorgOpen(false)} />}
      {importOpen && (
        <JournalImport userId={userId} onDone={invalidate} onClose={() => setImportOpen(false)} />
      )}

      <EvolutionReport entries={entries} />

      {open && (
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="panel mb-6 grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Data">
            <Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} />
          </Field>
          <Field label="Título">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Humor">
            <Select value={form.mood} onChange={(e) => setForm({ ...form, mood: e.target.value })} className="capitalize">
              {MOODS.map((m) => <Opt key={m} value={m}>{m}</Opt>)}
            </Select>
          </Field>
          <Field label="Energia (0-10)">
            <Input type="number" min="0" max="10" value={form.energy} onChange={(e) => setForm({ ...form, energy: e.target.value })} />
          </Field>
          <Field label="Texto livre" className="sm:col-span-2">
            <Textarea rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </Field>
          <Field label="Gratidão"><Textarea value={form.gratitude} onChange={(e) => setForm({ ...form, gratitude: e.target.value })} /></Field>
          <Field label="Aprendizados"><Textarea value={form.learnings} onChange={(e) => setForm({ ...form, learnings: e.target.value })} /></Field>
          <Field label="Acontecimentos importantes" className="sm:col-span-2">
            <Textarea value={form.highlights} onChange={(e) => setForm({ ...form, highlights: e.target.value })} />
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={create.isPending} className="font-semibold glow-neon">Salvar entrada</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      <div className="panel mb-6 grid gap-4 p-5 sm:grid-cols-3">
        <Field label="Buscar"><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="palavra-chave" /></Field>
        <Field label="De"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="Até"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 && <Empty>Nenhuma entrada encontrada.</Empty>}
        {filtered.map((e) => (
          <article key={e.id} className="panel p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{cleanJournalTitle(e.title) || dateBR(e.entry_date)}</p>
                <p className="text-xs capitalize text-muted-foreground">
                  {dateBR(e.entry_date)}{e.mood ? ` · humor ${e.mood}` : ""}{e.energy !== null ? ` · energia ${e.energy}/10` : ""}
                  
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove.mutate(e.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            {e.content && (
              <details className="mt-3 group">
                <summary className="cursor-pointer text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground">Ver texto original</summary>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{cleanJournalText(e.content)}</p>
              </details>
            )}
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              {e.gratitude && <p><span className="text-primary">Gratidão:</span> {e.gratitude}</p>}
              {e.learnings && <p><span className="text-primary">Aprendizados:</span> {e.learnings}</p>}
              {e.highlights && <p><span className="text-primary">Acontecimentos:</span> {e.highlights}</p>}
            </div>
            {e.summary && <p className="mt-3 rounded-xl border border-border bg-muted/20 p-3 text-sm"><span className="text-primary">Resumo do dia:</span> {e.summary}</p>}
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              {e.achievements && <p><span className="text-primary">Conquistas:</span> {e.achievements}</p>}
              {e.pending && <p><span className="text-primary">Pendências:</span> {e.pending}</p>}
              {e.insights && <p><span className="text-primary">Insights:</span> {e.insights}</p>}
            </div>
          </article>
        ))}
      </div>
    </PersonalShell>
  );
}

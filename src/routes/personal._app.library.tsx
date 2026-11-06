import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Chips, Empty, Field, Opt, Select, Stat, useUserId } from "@/components/personal/kit";

export const Route = createFileRoute("/personal/_app/library")({
  head: () => ({
    meta: [
      { title: "Biblioteca — PERSONAL OS" },
      { name: "description", content: "Sua biblioteca pessoal: livros, status de leitura, avaliação, notas e aprendizados." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Biblioteca — PERSONAL OS" },
      { property: "og:description", content: "Livros, leitura, notas e aprendizados." },
    ],
  }),
  component: LibraryPage,
});

const STATUSES = ["todos", "quero_ler", "lendo", "concluido"] as const;
const LABEL: Record<string, string> = { todos: "Todos", quero_ler: "Quero ler", lendo: "Lendo", concluido: "Concluído" };

type Book = {
  id: string; title: string; author: string | null; cover_url: string | null; category: string;
  status: string; rating: number | null; notes: string | null; learnings: string | null;
};

const emptyForm = { title: "", author: "", cover_url: "", category: "", status: "quero_ler", rating: "0", notes: "", learnings: "" };

function LibraryPage() {
  const qc = useQueryClient();
  const userId = useUserId();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("todos");

  const { data: books = [] } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const { data, error } = await supabase.from("books").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Book[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["books"] });
    qc.invalidateQueries({ queryKey: ["dashboard-widgets"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("books").insert({
        user_id: userId!, title: form.title.trim(), author: form.author.trim() || null,
        cover_url: form.cover_url.trim() || null, category: form.category.trim() || 'geral',
        status: form.status, rating: Number(form.rating) || 0,
        notes: form.notes.trim() || null, learnings: form.learnings.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { setOpen(false); setForm(emptyForm); invalidate(); },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { status?: string; rating?: number } }) => {
      const { error } = await supabase.from("books").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const filtered = status === "todos" ? books : books.filter((b) => b.status === status);

  return (
    <PersonalShell
      title="Biblioteca"
      subtitle="Só os livros citados nos seus diários."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Citados" value={books.length} />
        <Stat label="Em leitura" value={books.filter((b) => b.status === "lendo").length} />
        <Stat label="Terminados" value={books.filter((b) => b.status === "concluido").length} />
      </div>

      {open && (
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="panel mb-6 grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Título"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Autor"><Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></Field>
          <Field label="Categoria"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
          <Field label="Capa (URL)"><Input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} /></Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.filter((s) => s !== "todos").map((s) => <Opt key={s} value={s}>{LABEL[s]}</Opt>)}
            </Select>
          </Field>
          <Field label="Avaliação (0-5)"><Input type="number" min="0" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} /></Field>
          <Field label="Notas" className="sm:col-span-2"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <Field label="Aprendizados" className="sm:col-span-2"><Textarea value={form.learnings} onChange={(e) => setForm({ ...form, learnings: e.target.value })} /></Field>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={create.isPending} className="font-semibold glow-neon">Salvar livro</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      <Chips items={STATUSES} value={status} onChange={setStatus} labels={LABEL} />

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.length === 0 && <div className="md:col-span-2"><Empty>Nenhum livro citado nos diários.</Empty></div>}
        {filtered.map((b) => (
          <article key={b.id} className="panel flex gap-4 p-4">
            {b.cover_url && <img src={b.cover_url} alt={`Capa do livro ${b.title}`} loading="lazy" className="h-24 w-16 shrink-0 rounded object-cover" />}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{b.title}</p>
                  <p className="text-xs text-muted-foreground">{b.author || "Autor desconhecido"}{b.category ? ` · ${b.category}` : ""}</p>
                </div>
                <span className="shrink-0 text-[10px] uppercase text-muted-foreground">{LABEL[b.status] ?? b.status}</span>
              </div>
              {b.notes && <p className="mt-2 text-sm text-muted-foreground">{b.notes}</p>}
              {b.learnings && <p className="mt-1 text-xs"><span className="text-primary">Aprendizados:</span> {b.learnings}</p>}
            </div>
          </article>
        ))}
      </div>
    </PersonalShell>
  );
}

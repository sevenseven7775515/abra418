import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Chips, Empty, Field, Opt, Select, Stat, useUserId } from "@/components/personal/kit";

export const Route = createFileRoute("/personal/_app/brain")({
  head: () => ({
    meta: [
      { title: "Segundo Cérebro — PERSONAL OS" },
      { name: "description", content: "Notas de ideias, estudos, projetos e insights com tags, links e busca inteligente." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Segundo Cérebro — PERSONAL OS" },
      { property: "og:description", content: "Ideias, estudos, projetos e insights organizados." },
    ],
  }),
  component: BrainPage,
});

const AREAS = ["todos", "ideias", "estudos", "projetos", "insights"] as const;
type Note = { id: string; title: string; content: string | null; area: string; tags: string[] | null; links: string | null };

const emptyForm = { title: "", content: "", area: "ideias", tags: "", links: "" };

function BrainPage() {
  const qc = useQueryClient();
  const userId = useUserId();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [area, setArea] = useState<(typeof AREAS)[number]>("todos");
  const [search, setSearch] = useState("");

  const { data: notes = [] } = useQuery({
    queryKey: ["brain-notes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brain_notes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Note[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["brain-notes"] });
    qc.invalidateQueries({ queryKey: ["dashboard-widgets"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("brain_notes").insert({
        user_id: userId!,
        title: form.title.trim(),
        content: form.content.trim() || null,
        area: form.area,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        links: form.links.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { setOpen(false); setForm(emptyForm); invalidate(); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("brain_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const term = search.trim().toLowerCase();
  const filtered = notes.filter((n) => {
    if (area !== "todos" && n.area !== area) return false;
    if (!term) return true;
    return [n.title, n.content, (n.tags ?? []).join(" ")].some((v) => (v ?? "").toLowerCase().includes(term));
  });

  return (
    <PersonalShell
      title="Segundo Cérebro"
      subtitle="Ideias, estudos, projetos e insights conectados."
      actions={<Button onClick={() => setOpen((v) => !v)} className="font-semibold glow-neon"><Plus className="h-4 w-4" /> Nota</Button>}
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Notas" value={notes.length} />
        <Stat label="Ideias" value={notes.filter((n) => n.area === "ideias").length} />
        <Stat label="Insights" value={notes.filter((n) => n.area === "insights").length} />
      </div>

      {open && (
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="panel mb-6 grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Título" className="sm:col-span-2"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Área">
            <Select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="capitalize">
              {AREAS.filter((a) => a !== "todos").map((a) => <Opt key={a} value={a}>{a}</Opt>)}
            </Select>
          </Field>
          <Field label="Tags (separadas por vírgula)"><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></Field>
          <Field label="Conteúdo" className="sm:col-span-2"><Textarea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></Field>
          <Field label="Links (URLs separadas por espaço)" className="sm:col-span-2">
            <Input value={form.links} onChange={(e) => setForm({ ...form, links: e.target.value })} />
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={create.isPending} className="font-semibold glow-neon">Salvar nota</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      <div className="mb-4"><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título, conteúdo ou tag" /></div>
      <Chips items={AREAS} value={area} onChange={setArea} />

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.length === 0 && <div className="md:col-span-2"><Empty>Nenhuma nota encontrada.</Empty></div>}
        {filtered.map((n) => (
          <article key={n.id} className="panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{n.title}</p>
                <p className="text-xs capitalize text-muted-foreground">{n.area}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove.mutate(n.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            {n.content && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{n.content}</p>}
            {!!(n.tags ?? []).length && (
              <div className="mt-3 flex flex-wrap gap-1">
                {(n.tags ?? []).map((t) => <span key={t} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-primary">#{t}</span>)}
              </div>
            )}
            {n.links && (
              <div className="mt-2 grid gap-1">
                {n.links.split(/[\s,]+/).filter(Boolean).map((l) => (
                  <a key={l} href={l} target="_blank" rel="noreferrer" className="truncate text-xs text-primary underline">{l}</a>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </PersonalShell>
  );
}

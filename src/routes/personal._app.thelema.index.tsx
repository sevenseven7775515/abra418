import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BookOpen, ExternalLink, Plus, Star, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { ThelemaTabs } from "@/components/personal/ThelemaTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/personal/_app/thelema/")({
  head: () => ({
    meta: [
      { title: "Thelema — Biblioteca — PERSONAL OS" },
      { name: "description", content: "Biblioteca de estudos thelêmicos com textos, traduções, progresso de leitura e anotações." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Thelema — Biblioteca" },
      { property: "og:description", content: "Textos clássicos, traduções e anotações pessoais." },
    ],
  }),
  component: ThelemaLibrary,
});

const STATUS = ["nao_iniciado", "lendo", "finalizado"] as const;
const STATUS_LABEL: Record<string, string> = {
  nao_iniciado: "Não iniciado",
  lendo: "Lendo",
  finalizado: "Finalizado",
};
const FILTERS = ["todos", "lendo", "finalizado", "nao_iniciado", "favoritos"] as const;
const FILTER_LABEL: Record<string, string> = { ...STATUS_LABEL, todos: "Todos", favoritos: "Favoritos" };

function ThelemaLibrary() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("todos");
  const [search, setSearch] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [trDraft, setTrDraft] = useState({ title_pt: "", translator: "", publisher: "", year: "", source_url: "" });
  const [form, setForm] = useState({ title_original: "", title_pt: "", original_language: "Inglês", author: "Aleister Crowley", source_url: "" });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["thelema-texts"] });
    qc.invalidateQueries({ queryKey: ["thelema-translations"] });
    qc.invalidateQueries({ queryKey: ["thelema-notes"] });
  };

  const { data: texts = [] } = useQuery({
    queryKey: ["thelema-texts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("thelema_texts").select("*").order("title_original");
      if (error) throw error;
      return data;
    },
  });

  const { data: translations = [] } = useQuery({
    queryKey: ["thelema-translations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("thelema_translations").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["thelema-notes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("thelema_notes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createText = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("thelema_texts").insert({
        user_id: auth.user!.id,
        title_original: form.title_original.trim(),
        title_pt: form.title_pt.trim() || null,
        original_language: form.original_language.trim() || "Inglês",
        author: form.author.trim() || "Desconhecido",
        source_url: form.source_url.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setOpenNew(false);
      setForm({ title_original: "", title_pt: "", original_language: "Inglês", author: "Aleister Crowley", source_url: "" });
      invalidate();
    },
  });

  type TextPatch = { status?: string; favorite?: boolean; notes?: string; study_minutes?: number; last_read_at?: string };
  const updateText = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TextPatch }) => {
      const { error } = await supabase.from("thelema_texts").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeText = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("thelema_texts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { setSelected(null); invalidate(); },
  });

  const addNote = useMutation({
    mutationFn: async (textId: string) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("thelema_notes").insert({
        user_id: auth.user!.id, text_id: textId, content: noteDraft.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => { setNoteDraft(""); invalidate(); },
  });

  const removeNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("thelema_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addTranslation = useMutation({
    mutationFn: async (textId: string) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("thelema_translations").insert({
        user_id: auth.user!.id,
        text_id: textId,
        title_pt: trDraft.title_pt.trim(),
        translator: trDraft.translator.trim() || null,
        publisher: trDraft.publisher.trim() || null,
        year: trDraft.year ? Number(trDraft.year) : null,
        source_url: trDraft.source_url.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { setTrDraft({ title_pt: "", translator: "", publisher: "", year: "", source_url: "" }); invalidate(); },
  });

  const removeTranslation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("thelema_translations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return texts.filter((t) => {
      if (filter === "favoritos" && !t.favorite) return false;
      if (filter !== "todos" && filter !== "favoritos" && t.status !== filter) return false;
      if (!q) return true;
      return `${t.title_original} ${t.title_pt ?? ""} ${t.author}`.toLowerCase().includes(q);
    });
  }, [texts, filter, search]);

  const finished = texts.filter((t) => t.status === "finalizado").length;
  const studied = texts.filter((t) => t.status !== "nao_iniciado").length;
  const minutes = texts.reduce((acc, t) => acc + (t.study_minutes ?? 0), 0);
  const lastRead = texts
    .filter((t) => t.last_read_at)
    .sort((a, b) => (a.last_read_at! > b.last_read_at! ? -1 : 1))[0];

  const detail = texts.find((t) => t.id === selected) ?? null;

  return (
    <PersonalShell
      title="Thelema"
      subtitle="Biblioteca de estudos, traduções e anotações."
      actions={
        <Button onClick={() => setOpenNew((v) => !v)} className="hidden font-semibold glow-neon sm:inline-flex">
          <Plus className="mr-1 h-4 w-4" /> Novo texto
        </Button>
      }
    >
      <ThelemaTabs active="library" />

      <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Livros concluídos", value: String(finished) },
          { label: "Textos estudados", value: String(studied) },
          { label: "Tempo de estudo", value: `${Math.floor(minutes / 60)}h ${minutes % 60}min` },
          { label: "Última leitura", value: lastRead ? lastRead.title_original : "—" },
        ].map((s) => (
          <div key={s.label} className="panel p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-1 truncate text-lg font-black text-primary">{s.value}</p>
          </div>
        ))}
      </section>

      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs transition-colors",
                filter === f ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {FILTER_LABEL[f]}
            </button>
          ))}
        </div>
        <Input placeholder="Buscar texto ou autor…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {openNew && (
        <form onSubmit={(e) => { e.preventDefault(); createText.mutate(); }} className="panel mb-6 grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="t-orig">Nome original</Label>
            <Input id="t-orig" required value={form.title_original} onChange={(e) => setForm({ ...form, title_original: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-pt">Nome em português</Label>
            <Input id="t-pt" value={form.title_pt} onChange={(e) => setForm({ ...form, title_pt: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-lang">Idioma original</Label>
            <Input id="t-lang" value={form.original_language} onChange={(e) => setForm({ ...form, original_language: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-author">Autor</Label>
            <Input id="t-author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="t-url">Link da fonte</Label>
            <Input id="t-url" type="url" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={createText.isPending} className="font-semibold glow-neon">Salvar texto</Button>
            <Button type="button" variant="ghost" onClick={() => setOpenNew(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {visible.length === 0 && <p className="panel p-8 text-center text-sm text-muted-foreground">Nenhum texto encontrado.</p>}
        {visible.map((t) => {
          const trs = translations.filter((tr) => tr.text_id === t.id);
          const isOpen = selected === t.id;
          const textNotes = notes.filter((n) => n.text_id === t.id);
          return (
            <article key={t.id} className="panel p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <button className="min-w-0 text-left" onClick={() => setSelected(isOpen ? null : t.id)}>
                  <h3 className="truncate font-semibold">{t.title_original}</h3>
                  <p className="truncate text-sm text-muted-foreground">
                    {t.title_pt ?? "Sem tradução oficial encontrada"} · {t.author} · {t.original_language}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide">
                    <span className={cn(
                      "rounded-full px-2 py-0.5",
                      t.status === "finalizado" ? "bg-primary/20 text-primary"
                        : t.status === "lendo" ? "bg-secondary text-foreground" : "bg-secondary/60 text-muted-foreground",
                    )}>
                      {STATUS_LABEL[t.status]}
                    </span>
                    <span className="text-muted-foreground">{trs.length} tradução(ões)</span>
                    <span className="text-muted-foreground">{textNotes.length} nota(s)</span>
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    aria-label="Favoritar"
                    onClick={() => updateText.mutate({ id: t.id, patch: { favorite: !t.favorite } })}
                    className={cn("rounded-lg p-2", t.favorite ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                  >
                    <Star className={cn("h-4 w-4", t.favorite && "fill-current")} />
                  </button>
                  {t.source_url && (
                    <a href={t.source_url} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button onClick={() => removeText.mutate(t.id)} className="rounded-lg p-2 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {isOpen && detail && (
                <div className="mt-4 grid gap-4 border-t border-border pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {STATUS.map((s) => (
                      <button
                        key={s}
                        onClick={() => updateText.mutate({ id: t.id, patch: { status: s, last_read_at: new Date().toISOString() } })}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs",
                          t.status === s ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
                        )}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                    <button
                      onClick={() => updateText.mutate({ id: t.id, patch: { study_minutes: (t.study_minutes ?? 0) + 30, last_read_at: new Date().toISOString() } })}
                      className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <BookOpen className="mr-1 inline h-3 w-3" /> +30 min de estudo
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {t.study_minutes ?? 0} min registrados
                      {t.last_read_at && ` · última leitura ${new Date(t.last_read_at).toLocaleDateString("pt-BR")}`}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">Traduções disponíveis</p>
                    {trs.length === 0 && <p className="mt-1 text-sm text-muted-foreground">Sem tradução oficial encontrada</p>}
                    <ul className="mt-2 grid gap-2">
                      {trs.map((tr) => (
                        <li key={tr.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-xl border border-border p-3 text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{tr.title_pt}</p>
                            <p className="text-xs text-muted-foreground">
                              {tr.translator ?? "Tradutor não informado"}
                              {tr.publisher && ` · ${tr.publisher}`}
                              {tr.year && ` · ${tr.year}`}
                            </p>
                            {tr.source_url && (
                              <a href={tr.source_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                                Abrir fonte
                              </a>
                            )}
                          </div>
                          <button onClick={() => removeTranslation.mutate(tr.id)} className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <form
                      onSubmit={(e) => { e.preventDefault(); addTranslation.mutate(t.id); }}
                      className="mt-3 grid gap-2 sm:grid-cols-2"
                    >
                      <Input placeholder="Título em português" required value={trDraft.title_pt} onChange={(e) => setTrDraft({ ...trDraft, title_pt: e.target.value })} />
                      <Input placeholder="Tradutor" value={trDraft.translator} onChange={(e) => setTrDraft({ ...trDraft, translator: e.target.value })} />
                      <Input placeholder="Editora ou fonte" value={trDraft.publisher} onChange={(e) => setTrDraft({ ...trDraft, publisher: e.target.value })} />
                      <Input placeholder="Ano da tradução" inputMode="numeric" value={trDraft.year} onChange={(e) => setTrDraft({ ...trDraft, year: e.target.value.replace(/\D/g, "") })} />
                      <Input placeholder="Link" type="url" className="sm:col-span-2" value={trDraft.source_url} onChange={(e) => setTrDraft({ ...trDraft, source_url: e.target.value })} />
                      <Button type="submit" size="sm" variant="secondary" className="sm:col-span-2">Adicionar tradução</Button>
                    </form>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">Notas pessoais</p>
                    <Textarea
                      className="mt-2"
                      placeholder="Escreva uma anotação sobre este texto…"
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                    />
                    <Button
                      size="sm"
                      className="mt-2 font-semibold"
                      disabled={!noteDraft.trim() || addNote.isPending}
                      onClick={() => addNote.mutate(t.id)}
                    >
                      Salvar nota
                    </Button>
                    <ul className="mt-3 grid gap-2">
                      {textNotes.map((n) => (
                        <li key={n.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-xl border border-border p-3 text-sm">
                          <div className="min-w-0">
                            <p className="whitespace-pre-wrap break-words">{n.content}</p>
                            <p className="mt-1 text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
                          </div>
                          <button onClick={() => removeNote.mutate(n.id)} className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </PersonalShell>
  );
}
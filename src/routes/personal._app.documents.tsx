import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Eye, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Chips, Empty, Field, Opt, Select, Stat, dateBR, useUserId } from "@/components/personal/kit";

export const Route = createFileRoute("/personal/_app/documents")({
  head: () => ({
    meta: [
      { title: "Documentos — PERSONAL OS" },
      { name: "description", content: "Armazene, organize e baixe seus documentos pessoais e profissionais com tags e categorias." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Documentos — PERSONAL OS" },
      { property: "og:description", content: "Upload seguro, tags e download de documentos." },
    ],
  }),
  component: DocumentsPage,
});

const CATEGORIES = ["todos", "pessoal", "profissional", "financeiro", "juridico", "outros"] as const;

type Doc = {
  id: string; title: string; description: string | null; category: string; tags: string[] | null;
  file_path: string; file_name: string; mime_type: string | null; file_size: number | null; created_at: string;
};

const emptyForm = { title: "", description: "", category: "pessoal", tags: "" };
const sizeKB = (n: number | null) => (n ? `${Math.max(1, Math.round(n / 1024))} KB` : "—");

function DocumentsPage() {
  const qc = useQueryClient();
  const userId = useUserId();
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("todos");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const { data: docs = [] } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error: err } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
      if (err) throw err;
      return data as Doc[];
    },
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file || !userId) throw new Error("Selecione um arquivo.");
      const path = `${userId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("documents").insert({
        user_id: userId,
        title: form.title.trim() || file.name,
        description: form.description.trim() || null,
        category: form.category,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        file_path: path,
        file_name: file.name,
        mime_type: file.type || null,
        file_size: file.size,
      });
      if (dbErr) throw dbErr;
    },
    onSuccess: () => { setForm(emptyForm); setFile(null); setError(""); qc.invalidateQueries({ queryKey: ["documents"] }); },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: async (doc: Doc) => {
      await supabase.storage.from("documents").remove([doc.file_path]);
      const { error: err } = await supabase.from("documents").delete().eq("id", doc.id);
      if (err) throw err;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });

  async function openDoc(doc: Doc, download = false) {
    const { data } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 60, download ? { download: doc.file_name } : undefined);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  }

  const term = search.trim().toLowerCase();
  const filtered = docs.filter((d) => {
    if (category !== "todos" && d.category !== category) return false;
    if (!term) return true;
    return [d.title, d.description, (d.tags ?? []).join(" ")].some((v) => (v ?? "").toLowerCase().includes(term));
  });

  const totalMB = Math.round((docs.reduce((s, d) => s + (d.file_size ?? 0), 0) / 1048576) * 10) / 10;

  return (
    <PersonalShell title="Documentos" subtitle="Upload seguro, organização por categoria e tags.">
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Arquivos" value={docs.length} />
        <Stat label="Espaço usado" value={`${totalMB} MB`} />
        <Stat label="Último upload" value={docs[0] ? dateBR(docs[0].created_at.slice(0, 10)) : "—"} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); upload.mutate(); }} className="panel mb-6 grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Arquivo" className="sm:col-span-2">
          <Input type="file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        <Field label="Título"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Opcional" /></Field>
        <Field label="Categoria">
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="capitalize">
            {CATEGORIES.filter((c) => c !== "todos").map((c) => <Opt key={c} value={c}>{c}</Opt>)}
          </Select>
        </Field>
        <Field label="Tags (vírgula)"><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></Field>
        <Field label="Descrição"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
        <Button type="submit" disabled={upload.isPending} className="font-semibold glow-neon sm:col-span-2">
          <Upload className="h-4 w-4" /> {upload.isPending ? "Enviando..." : "Enviar documento"}
        </Button>
      </form>

      <div className="mb-4"><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar documento" /></div>
      <Chips items={CATEGORIES} value={category} onChange={setCategory} />

      <div className="grid gap-3">
        {filtered.length === 0 && <Empty>Nenhum documento encontrado.</Empty>}
        {filtered.map((d) => (
          <article key={d.id} className="panel flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate font-semibold">{d.title}</p>
              <p className="text-xs capitalize text-muted-foreground">{d.category} · {sizeKB(d.file_size)} · {dateBR(d.created_at.slice(0, 10))}</p>
              {d.description && <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>}
              {!!(d.tags ?? []).length && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(d.tags ?? []).map((t) => <span key={t} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-primary">#{t}</span>)}
                </div>
              )}
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" aria-label="Visualizar" onClick={() => openDoc(d)}><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" aria-label="Baixar" onClick={() => openDoc(d, true)}><Download className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => remove.mutate(d)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </article>
        ))}
      </div>
    </PersonalShell>
  );
}

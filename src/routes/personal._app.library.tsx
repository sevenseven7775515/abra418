import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { Chips, Empty, Stat } from "@/components/personal/kit";

export const Route = createFileRoute("/personal/_app/library")({
  head: () => ({
    meta: [
      { title: "Biblioteca — PERSONAL OS" },
      { name: "description", content: "Livros citados nos seus diários: em leitura e terminados." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Biblioteca — PERSONAL OS" },
      { property: "og:description", content: "Livros citados nos diários." },
    ],
  }),
  component: LibraryPage,
});

const STATUSES = ["todos", "lendo", "concluido"] as const;
const LABEL: Record<string, string> = { todos: "Todos", quero_ler: "Quero ler", lendo: "Em leitura", concluido: "Terminado" };

type Book = { id: string; title: string; author: string | null; status: string; notes: string | null; learnings: string | null };

function LibraryPage() {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("todos");
  const { data: books = [] } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const { data, error } = await supabase.from("books").select("id,title,author,status,notes,learnings").order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Book[];
    },
  });
  const filtered = status === "todos" ? books : books.filter((b) => b.status === status);

  return (
    <PersonalShell title="Biblioteca" subtitle="Só os livros citados nos seus diários.">
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Citados" value={books.length} />
        <Stat label="Em leitura" value={books.filter((b) => b.status === "lendo").length} />
        <Stat label="Terminados" value={books.filter((b) => b.status === "concluido").length} />
      </div>
      <Chips items={STATUSES} value={status} onChange={setStatus} labels={LABEL} />
      <div className="grid gap-2 md:grid-cols-2">
        {filtered.length === 0 && <div className="md:col-span-2"><Empty>Nenhum livro citado nos diários.</Empty></div>}
        {filtered.map((b) => (
          <article key={b.id} className="panel p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{b.title}</p>
                {b.author && <p className="text-xs text-muted-foreground">{b.author}</p>}
              </div>
              <span className="shrink-0 text-[10px] uppercase text-muted-foreground">{LABEL[b.status] ?? b.status}</span>
            </div>
            {b.learnings && <p className="mt-2 text-xs"><span className="text-primary">Aprendizados:</span> {b.learnings}</p>}
          </article>
        ))}
      </div>
    </PersonalShell>
  );
}

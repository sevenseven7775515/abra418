import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { Empty, useUserId } from "@/components/personal/kit";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDiaryBooks } from "@/components/personal/diary-books.functions";

export const Route = createFileRoute("/personal/_app/library")({
  head: () => ({
    meta: [
      { title: "Biblioteca — PERSONAL OS" },
      { name: "description", content: "Livros citados nos seus diários: em leitura e terminados." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Biblioteca — PERSONAL OS" },
      { property: "og:description", content: "Livros citados nos diários." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LibraryPage,
});

const STATUSES = ["todos", "concluido", "lendo", "citado"] as const;
const LABEL: Record<string, string> = { todos: "Todos", citado: "Citados", lendo: "Em leitura", concluido: "Terminados" };

function LibraryPage() {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("todos");
  const userId = useUserId();
  const readBooks = useServerFn(getDiaryBooks);
  const { data: books = [], isPending, isError } = useQuery({
    queryKey: ["diary-books", userId], enabled: !!userId,
    queryFn: () => readBooks(), staleTime: 0,
  });
  const filtered = status === "todos" ? books : books.filter((b) => b.status === status);

  return (
    <PersonalShell title="Biblioteca" subtitle="Só os livros citados nos seus diários.">
      <p className="mb-4 text-sm text-muted-foreground">{books.filter((b) => b.status === "concluido").length} livros terminados com evidência nos relatos · {books.length} títulos identificados</p>
      <Tabs value={status} onValueChange={(v) => { const selected = STATUSES.find((s) => s === v); if (selected) setStatus(selected); }} className="mb-4">
        <TabsList className="flex h-auto w-fit max-w-full flex-wrap justify-start">{STATUSES.map((s) => <TabsTrigger key={s} value={s}>{LABEL[s]}</TabsTrigger>)}</TabsList>
      </Tabs>
      <div className="grid gap-2 md:grid-cols-2">
        {isPending && <p className="text-sm text-muted-foreground">Cruzando os relatos do diário…</p>}
        {isError && <p role="alert" className="text-sm text-destructive">Não foi possível consultar os livros agora.</p>}
        {!isPending && !isError && filtered.length === 0 && <div className="md:col-span-2"><Empty>Nenhum livro com evidência neste grupo.</Empty></div>}
        {filtered.map((b) => (
          <article key={b.id} className="panel p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{b.title}</p>
                {b.author && <p className="text-xs text-muted-foreground">{b.author}</p>}
              </div>
              <span className="shrink-0 text-[10px] uppercase text-muted-foreground">{LABEL[b.status] ?? b.status}</span>
            </div>
            {b.finishedDate && <p className="mt-2 text-xs text-primary">Conclusão relatada em {b.finishedDate.split("-").reverse().join("/")}</p>}
            {b.learnings && <p className="mt-2 text-xs"><span className="text-primary">Aprendizados:</span> {b.learnings}</p>}
            <details className="mt-3 text-xs text-muted-foreground"><summary className="cursor-pointer">Ver relatos</summary>
              <ul className="mt-2 space-y-3">{[...b.evidence.filter((e) => e.kind === "concluido"), ...b.evidence.filter((e) => e.kind !== "concluido")].slice(0, 5).map((e, i) => <li key={`${e.journalId}-${i}`}>
                <p className="font-semibold">{e.date.split("-").reverse().join("/")} · {LABEL[e.kind]}</p><p className="mt-1 break-words">{e.excerpt}</p><p className="mt-1 break-all text-[10px]">Diário {e.journalId}</p>
              </li>)}</ul>
            </details>
          </article>
        ))}
      </div>
    </PersonalShell>
  );
}

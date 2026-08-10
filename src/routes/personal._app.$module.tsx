import { createFileRoute } from "@tanstack/react-router";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { NAV_ITEMS } from "@/lib/personal-nav";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/personal/_app/$module")({
  head: () => ({
    meta: [
      { title: "Módulo — PERSONAL OS" },
      { name: "description", content: "Módulo do PERSONAL OS em construção dentro da sua central pessoal de comando." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Módulo — PERSONAL OS" },
      { property: "og:description", content: "Módulo em construção." },
    ],
  }),
  component: ModulePlaceholder,
});

const EXTRA: Record<string, string> = {
  notifications: "Notificações",
  agenda: "Agenda",
};

function ModulePlaceholder() {
  const { module } = Route.useParams();
  const label = NAV_ITEMS.find((i) => i.slug === module)?.label ?? EXTRA[module] ?? "Módulo";

  return (
    <PersonalShell title={label} subtitle="Este módulo entra na próxima etapa do PERSONAL OS.">
      <div className="panel grid place-items-center px-6 py-20 text-center">
        <Sparkles className="h-8 w-8 text-primary" />
        <h2 className="mt-4 text-lg font-bold">{label} em construção</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          A estrutura e o banco de dados já estão preparados. Peça a próxima etapa para eu ativar
          este módulo com todas as funcionalidades.
        </p>
      </div>
    </PersonalShell>
  );
}
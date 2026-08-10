import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function ThelemaTabs({ active }: { active: "library" | "journal" }) {
  const base = "rounded-full border px-4 py-1.5 text-xs transition-colors";
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      <Link
        to="/personal/thelema"
        className={cn(base, active === "library" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
      >
        Biblioteca
      </Link>
      <Link
        to="/personal/thelema/journal"
        className={cn(base, active === "journal" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
      >
        Diário Thelêmico
      </Link>
    </div>
  );
}
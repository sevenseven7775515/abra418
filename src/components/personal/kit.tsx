import { useQuery } from "@tanstack/react-query";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function useUserId() {
  const { data } = useQuery({
    queryKey: ["auth-user-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
    staleTime: Infinity,
  });
  return data ?? null;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn("h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm", className)}
    />
  );
}

export function Opt({ value, children }: { value: string; children: ReactNode }) {
  return <option value={value} className="bg-card">{children}</option>;
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="panel p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="panel p-8 text-center text-sm text-muted-foreground">{children}</p>;
}

export function Chips<T extends string>({
  items,
  value,
  onChange,
  labels,
}: {
  items: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Record<string, string>;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
            value === item
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {labels?.[item] ?? item}
        </button>
      ))}
    </div>
  );
}

export const money = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export const dateBR = (v?: string | null) =>
  v ? new Date(`${v}T12:00:00`).toLocaleDateString("pt-BR") : "—";

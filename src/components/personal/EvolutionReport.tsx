import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dateBR, money } from "@/components/personal/kit";
import { billsDue, compareWindows, energyByMoon, recurringImprovements, type EvoEntry, type EvoSignal } from "@/lib/evolution";

function Delta({ cur, prev }: { cur: number | null; prev: number | null }) {
  if (cur == null) return <span className="text-muted-foreground">sem dados</span>;
  const d = prev == null ? null : Math.round((cur - prev) * 10) / 10;
  return (
    <span>
      <span className="text-xl font-bold">{cur}</span>
      {d != null && <span className={`ml-2 text-xs ${d >= 0 ? "text-primary" : "text-destructive"}`}>{d >= 0 ? "+" : ""}{d}</span>}
    </span>
  );
}

/** Uma única leitura do que o diário revela. Nada para preencher. */
export function EvolutionReport({ entries }: { entries: EvoEntry[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: signals = [] } = useQuery({
    queryKey: ["journal-signals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("journal_signals").select("id, kind, description, amount, due_date, entry_date, resolved").order("entry_date", { ascending: false }).limit(2000);
      if (error) throw error;
      return data as EvoSignal[];
    },
  });

  const r = useMemo(() => {
    const debts = signals.filter((s) => s.kind === "divida" && !s.resolved);
    const latestDebt = new Map<string, EvoSignal>();
    for (const d of debts) { const k = d.description.toLowerCase(); if (!latestDebt.has(k)) latestDebt.set(k, d); }
    return {
      cmp: compareWindows(entries, today),
      moon: energyByMoon(entries),
      bills: billsDue(signals, today),
      debts: [...latestDebt.values()].slice(0, 5),
      improve: recurringImprovements(signals),
      books: signals.filter((s) => s.kind === "livro").slice(0, 5),
    };
  }, [entries, signals, today]);

  const none = <p className="text-sm text-muted-foreground">Não há dados suficientes registrados.</p>;

  return (
    <section className="panel mb-6 p-5">
      <h2 className="font-bold">Evolução</h2>
      <p className="mb-4 text-xs text-muted-foreground">Tirado só do que você escreveu. Últimos 30 dias contra os 30 anteriores.</p>

      <div className="grid gap-4 sm:grid-cols-3">
        <div><p className="text-xs text-muted-foreground">Dias escritos</p><Delta cur={r.cmp.days.cur} prev={r.cmp.days.prev} /></div>
        <div><p className="text-xs text-muted-foreground">Energia média</p><Delta cur={r.cmp.energy.cur} prev={r.cmp.energy.prev} /></div>
        <div><p className="text-xs text-muted-foreground">Humor (0–10)</p><Delta cur={r.cmp.mood.cur} prev={r.cmp.mood.prev} /></div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-primary">Onde melhorar</h3>
          {r.improve.length ? (
            <ul className="space-y-1 text-sm">{r.improve.map((m) => <li key={m.text}>{m.text} <span className="text-xs text-muted-foreground">· {m.n}× · {dateBR(m.last)}</span></li>)}</ul>
          ) : none}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-primary">Contas vencendo</h3>
          {r.bills.length ? (
            <ul className="space-y-1 text-sm">{r.bills.map((b) => (
              <li key={b.id} className={b.due_date! < today ? "text-destructive" : ""}>{dateBR(b.due_date)} · {b.description}{b.amount ? ` · ${money(b.amount)}` : ""}</li>
            ))}</ul>
          ) : none}
          {r.debts.length > 0 && (
            <>
              <h3 className="mb-2 mt-4 text-sm font-semibold text-primary">Dívidas citadas</h3>
              <ul className="space-y-1 text-sm">{r.debts.map((d) => <li key={d.id}>{d.description}{d.amount ? ` · ${money(d.amount)}` : ""} <span className="text-xs text-muted-foreground">· {dateBR(d.entry_date)}</span></li>)}</ul>
            </>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-primary">Energia por fase da Lua</h3>
          {r.moon.length ? (
            <ul className="space-y-1 text-sm">{r.moon.map((m) => <li key={m.label}>{m.symbol} {m.label} · {m.avg} <span className="text-xs text-muted-foreground">({m.n} dias)</span></li>)}</ul>
          ) : none}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-primary">Livros terminados</h3>
          {r.books.length ? (
            <ul className="space-y-1 text-sm">{r.books.map((b) => <li key={b.id}>{b.description} <span className="text-xs text-muted-foreground">· {dateBR(b.entry_date)}</span></li>)}</ul>
          ) : none}
        </div>
      </div>
    </section>
  );
}

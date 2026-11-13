import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/components/personal/kit";
import { reconcileMonth, type FlowItem } from "@/lib/cashflow";

export function MonthCash() {
  const { data } = useQuery({
    queryKey: ["month-cash"],
    queryFn: async () => {
      const start = new Date(); start.setDate(1);
      const [flow, bank] = await Promise.all([
        supabase.from("finance_transactions").select("kind,description,amount,recurrence,due_date,category").neq("recurrence", "extrato"),
        supabase.from("finance_transactions").select("kind,description,amount,tx_date").eq("recurrence", "extrato")
          .gte("tx_date", start.toISOString().slice(0, 10)).limit(1000),
      ]);
      const f = (flow.data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as FlowItem[];
      const b = (bank.data ?? []).map((r) => ({ ...r, amount: Number(r.amount) }));
      return reconcileMonth(f, b);
    },
  });
  if (!data) return null;
  const got = data.incomes.filter((i) => i.hit).reduce((s, i) => s + i.item.amount, 0);
  const late = data.incomes.filter((i) => i.status === "atrasado");
  const openBills = data.bills.filter((b) => !b.hit);
  return (
    <section className="panel p-5">
      <header className="flex items-center gap-2 pb-3">
        <Wallet className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-wide">Caixa do mês</h2>
        <Link to="/personal/finance" className="ml-auto text-[11px] text-muted-foreground hover:text-primary">detalhes</Link>
      </header>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div><p className="text-lg font-black text-primary">{money(got)}</p><p className="text-[10px] uppercase text-muted-foreground">de {money(data.expectedIn)}</p></div>
        <div><p className="text-lg font-black">{money(data.spent)}</p><p className="text-[10px] uppercase text-muted-foreground">saiu no extrato</p></div>
        <div><p className="text-lg font-black">{money(data.received - data.spent)}</p><p className="text-[10px] uppercase text-muted-foreground">saldo do mês</p></div>
      </div>
      {!data.hasStatement && <p className="mt-3 text-xs text-muted-foreground">Extrato deste mês ainda não chegou no Drive.</p>}
      <ul className="mt-4 space-y-1.5 text-sm">
        {data.incomes.map((i) => (
          <li key={i.item.description} className="flex items-center justify-between">
            <span className={i.status === "atrasado" ? "text-destructive" : i.hit ? "text-foreground" : "text-muted-foreground"}>
              {i.hit ? "✓" : i.status === "atrasado" ? "!" : "·"} {i.item.description} · dia {i.item.due_date?.slice(8, 10)}
            </span>
            <span className="tabular-nums">{money(i.item.amount)}</span>
          </li>
        ))}
      </ul>
      {(late.length > 0 || openBills.length > 0) && (
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          {late.length > 0 && <>{late.length} entrada(s) passaram do dia sem aparecer no extrato. </>}
          {openBills.length > 0 && <>Sem débito identificado: {openBills.map((b) => b.item.description.replace(/ \(aprox\.\)/, "")).join(", ")}.</>}
        </p>
      )}
    </section>
  );
}

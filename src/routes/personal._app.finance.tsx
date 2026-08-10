import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chips, Empty, Field, Opt, Select, Stat, money, dateBR, useUserId } from "@/components/personal/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/personal/_app/finance")({
  head: () => ({
    meta: [
      { title: "Financeiro — PERSONAL OS" },
      { name: "description", content: "Controle financeiro pessoal com receitas, despesas, categorias, saldo e evolução mensal." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Financeiro — PERSONAL OS" },
      { property: "og:description", content: "Saldo, receitas, despesas e contas a vencer." },
    ],
  }),
  component: FinancePage,
});

const CATEGORIES = ["moradia", "alimentacao", "transporte", "saude", "lazer", "investimentos", "negocios", "outros"];
const CAT_LABEL: Record<string, string> = {
  moradia: "Moradia", alimentacao: "Alimentação", transporte: "Transporte", saude: "Saúde",
  lazer: "Lazer", investimentos: "Investimentos", negocios: "Negócios", outros: "Outros",
};
const RECURRENCES = ["unica", "mensal", "semanal", "anual"];
const PERIODS = ["mes", "trimestre", "ano", "tudo"] as const;
const PERIOD_LABEL = { mes: "Mês atual", trimestre: "3 meses", ano: "Ano", tudo: "Tudo" };

type Tx = {
  id: string; kind: string; description: string; category: string; amount: number;
  tx_date: string; recurrence: string; due_date: string | null; paid: boolean;
};

const emptyForm = {
  kind: "despesa", description: "", category: "outros", amount: "",
  tx_date: new Date().toISOString().slice(0, 10), recurrence: "unica", due_date: "", paid: "true",
};

function FinancePage() {
  const qc = useQueryClient();
  const userId = useUserId();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("mes");
  const [form, setForm] = useState(emptyForm);

  const { data: rows = [] } = useQuery({
    queryKey: ["finance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("finance_transactions").select("*").order("tx_date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as Tx[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["finance"] });
    qc.invalidateQueries({ queryKey: ["dashboard-widgets"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("finance_transactions").insert({
        user_id: userId!,
        kind: form.kind,
        description: form.description.trim(),
        category: form.category,
        amount: Number(form.amount || 0),
        tx_date: form.tx_date,
        recurrence: form.recurrence,
        due_date: form.due_date || null,
        paid: form.paid === "true",
      });
      if (error) throw error;
    },
    onSuccess: () => { setOpen(false); setForm(emptyForm); invalidate(); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const togglePaid = useMutation({
    mutationFn: async (tx: Tx) => {
      const { error } = await supabase.from("finance_transactions").update({ paid: !tx.paid }).eq("id", tx.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const start = useMemo(() => {
    const now = new Date();
    if (period === "mes") return new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === "trimestre") return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    if (period === "ano") return new Date(now.getFullYear(), 0, 1);
    return new Date(1970, 0, 1);
  }, [period]);

  const filtered = rows.filter((r) => r.tx_date >= start.toISOString().slice(0, 10));
  const income = filtered.filter((r) => r.kind === "receita").reduce((s, r) => s + r.amount, 0);
  const expense = filtered.filter((r) => r.kind === "despesa").reduce((s, r) => s + r.amount, 0);
  const balance = rows.reduce((s, r) => s + (r.kind === "receita" ? r.amount : -r.amount), 0);

  const monthly = useMemo(() => {
    const map = new Map<string, { in: number; out: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      map.set(d.toISOString().slice(0, 7), { in: 0, out: 0 });
    }
    rows.forEach((r) => {
      const key = r.tx_date.slice(0, 7);
      const cell = map.get(key);
      if (!cell) return;
      if (r.kind === "receita") cell.in += r.amount; else cell.out += r.amount;
    });
    return [...map.entries()];
  }, [rows]);

  const maxMonthly = Math.max(1, ...monthly.map(([, v]) => Math.max(v.in, v.out)));
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = rows
    .filter((r) => !r.paid && r.due_date && r.due_date >= today)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
    .slice(0, 5);

  return (
    <PersonalShell
      title="Financeiro"
      subtitle="Receitas, despesas, saldo e contas a vencer."
      actions={<Button onClick={() => setOpen((v) => !v)} className="font-semibold glow-neon"><Plus className="h-4 w-4" /> Lançar</Button>}
    >
      <Chips items={PERIODS} value={period} onChange={setPeriod} labels={PERIOD_LABEL} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Saldo atual" value={money(balance)} hint="todos os lançamentos" />
        <Stat label="Receitas" value={money(income)} hint={PERIOD_LABEL[period]} />
        <Stat label="Despesas" value={money(expense)} hint={PERIOD_LABEL[period]} />
        <Stat label="Resultado" value={money(income - expense)} hint={PERIOD_LABEL[period]} />
      </div>

      {open && (
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="panel mb-6 grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Tipo">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <Opt value="despesa">Despesa</Opt>
              <Opt value="receita">Receita</Opt>
            </Select>
          </Field>
          <Field label="Valor">
            <Input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="Descrição" className="sm:col-span-2">
            <Input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Categoria">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <Opt key={c} value={c}>{CAT_LABEL[c]}</Opt>)}
            </Select>
          </Field>
          <Field label="Recorrência">
            <Select value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value })} className="capitalize">
              {RECURRENCES.map((r) => <Opt key={r} value={r}>{r}</Opt>)}
            </Select>
          </Field>
          <Field label="Data">
            <Input type="date" value={form.tx_date} onChange={(e) => setForm({ ...form, tx_date: e.target.value })} />
          </Field>
          <Field label="Vencimento">
            <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </Field>
          <Field label="Situação">
            <Select value={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.value })}>
              <Opt value="true">Pago / recebido</Opt>
              <Opt value="false">Em aberto</Opt>
            </Select>
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={create.isPending} className="font-semibold glow-neon">Salvar lançamento</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">Evolução (6 meses)</h2>
          <div className="grid gap-3">
            {monthly.map(([key, v]) => (
              <div key={key}>
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>{key}</span>
                  <span>{money(v.in - v.out)}</span>
                </div>
                <div className="h-1.5 w-full rounded bg-muted">
                  <div className="h-1.5 rounded bg-primary" style={{ width: `${(v.in / maxMonthly) * 100}%` }} />
                </div>
                <div className="mt-1 h-1.5 w-full rounded bg-muted">
                  <div className="h-1.5 rounded bg-destructive" style={{ width: `${(v.out / maxMonthly) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">Contas próximas do vencimento</h2>
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma conta em aberto.</p>}
          <div className="grid gap-2">
            {upcoming.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span className="truncate">{r.description}</span>
                <span className="shrink-0 text-muted-foreground">{dateBR(r.due_date)} · {money(r.amount)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 && <Empty>Nenhum lançamento neste período.</Empty>}
        {filtered.map((r) => (
          <article key={r.id} className="panel flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-semibold">{r.description}</p>
              <p className="text-xs text-muted-foreground">
                {CAT_LABEL[r.category] ?? r.category} · {dateBR(r.tx_date)} · {r.recurrence}
                {r.due_date ? ` · vence ${dateBR(r.due_date)}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={cn("font-bold", r.kind === "receita" ? "text-primary" : "text-destructive")}>
                {r.kind === "receita" ? "+" : "-"}{money(r.amount)}
              </span>
              <button
                onClick={() => togglePaid.mutate(r)}
                className={cn("rounded-full border px-2 py-1 text-[10px] uppercase", r.paid ? "border-primary text-primary" : "border-border text-muted-foreground")}
              >
                {r.paid ? "pago" : "aberto"}
              </button>
              <Button variant="ghost" size="icon" onClick={() => remove.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </article>
        ))}
      </div>
    </PersonalShell>
  );
}

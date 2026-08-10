import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chips, Empty, Field, Opt, Select, Stat, money, dateBR, useUserId } from "@/components/personal/kit";

export const Route = createFileRoute("/personal/_app/shopping")({
  head: () => ({
    meta: [
      { title: "Compras — PERSONAL OS" },
      { name: "description", content: "Lista de compras com categorias, prioridade, status e histórico de gastos." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Compras — PERSONAL OS" },
      { property: "og:description", content: "Lista de compras e histórico com integração financeira." },
    ],
  }),
  component: ShoppingPage,
});

const CATEGORIES = ["mercado", "casa", "saude", "tecnologia", "vestuario", "outros"];
const PRIORITIES = ["alta", "media", "baixa"];
const TABS = ["lista", "historico"] as const;
const TAB_LABEL = { lista: "Lista de compras", historico: "Histórico" };

type Item = {
  id: string; name: string; category: string; quantity: number; priority: string;
  status: string; price: number | null; purchased_at: string | null;
};

const emptyForm = { name: "", category: "mercado", quantity: "1", priority: "media", price: "" };

function ShoppingPage() {
  const qc = useQueryClient();
  const userId = useUserId();
  const [tab, setTab] = useState<(typeof TABS)[number]>("lista");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [toFinance, setToFinance] = useState(true);

  const { data: items = [] } = useQuery({
    queryKey: ["shopping"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shopping_items").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, quantity: Number(r.quantity), price: r.price === null ? null : Number(r.price) })) as Item[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["shopping"] });
    qc.invalidateQueries({ queryKey: ["finance"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("shopping_items").insert({
        user_id: userId!,
        name: form.name.trim(),
        category: form.category,
        quantity: Number(form.quantity || 1),
        priority: form.priority,
        price: form.price ? Number(form.price) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => { setOpen(false); setForm(emptyForm); invalidate(); },
  });

  const buy = useMutation({
    mutationFn: async (item: Item) => {
      const done = item.status === "comprado";
      const { error } = await supabase.from("shopping_items").update({
        status: done ? "pendente" : "comprado",
        purchased_at: done ? null : new Date().toISOString().slice(0, 10),
      }).eq("id", item.id);
      if (error) throw error;
      if (!done && toFinance && item.price) {
        await supabase.from("finance_transactions").insert({
          user_id: userId!,
          kind: "despesa",
          description: `Compra: ${item.name}`,
          category: item.category === "mercado" ? "alimentacao" : "outros",
          amount: item.price * item.quantity,
        });
      }
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shopping_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const pending = items.filter((i) => i.status !== "comprado");
  const history = items.filter((i) => i.status === "comprado");
  const spent = history.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0);
  const list = tab === "lista" ? pending : history;

  return (
    <PersonalShell
      title="Compras"
      subtitle="Lista, prioridades e histórico de gastos."
      actions={<Button onClick={() => setOpen((v) => !v)} className="font-semibold glow-neon"><Plus className="h-4 w-4" /> Item</Button>}
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Itens pendentes" value={pending.length} />
        <Stat label="Compras realizadas" value={history.length} />
        <Stat label="Total gasto" value={money(spent)} />
      </div>

      <Chips items={TABS} value={tab} onChange={setTab} labels={TAB_LABEL} />

      {open && (
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="panel mb-6 grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Item" className="sm:col-span-2">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Categoria">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="capitalize">
              {CATEGORIES.map((c) => <Opt key={c} value={c}>{c}</Opt>)}
            </Select>
          </Field>
          <Field label="Prioridade">
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="capitalize">
              {PRIORITIES.map((p) => <Opt key={p} value={p}>{p}</Opt>)}
            </Select>
          </Field>
          <Field label="Quantidade">
            <Input type="number" min="1" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </Field>
          <Field label="Preço unitário">
            <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={create.isPending} className="font-semibold glow-neon">Adicionar</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      <label className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={toFinance} onChange={(e) => setToFinance(e.target.checked)} className="accent-primary" />
        Lançar automaticamente no Financeiro ao marcar como comprado
      </label>

      <div className="grid gap-3">
        {list.length === 0 && <Empty>{tab === "lista" ? "Nenhum item na lista." : "Nenhuma compra registrada."}</Empty>}
        {list.map((i) => (
          <article key={i.id} className="panel flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-semibold">{i.name}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {i.category} · qtd {i.quantity} · prioridade {i.priority}
                {i.price ? ` · ${money(i.price * i.quantity)}` : ""}
                {i.purchased_at ? ` · ${dateBR(i.purchased_at)}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" onClick={() => buy.mutate(i)}><Check className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove.mutate(i.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </article>
        ))}
      </div>
    </PersonalShell>
  );
}

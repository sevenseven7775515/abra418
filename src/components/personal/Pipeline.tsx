import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock, MessageSquarePlus, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Empty, Field, Opt, Select, Stat, money, dateBR, useUserId } from "@/components/personal/kit";
import {
  DEAL_STAGES, DEFAULT_PROBABILITY, STAGE_LABEL, analyzePipeline, todayISO,
  type DealRow, type DealStage,
} from "@/lib/pipeline";

const emptyDeal = {
  title: "", client_id: "", company_id: "", contact_id: "", stage: "contato" as DealStage,
  value: "", probability: "", expected_close: "", next_step: "", next_step_date: "", source: "",
};

export function Pipeline() {
  const qc = useQueryClient();
  const userId = useUserId();
  const [form, setForm] = useState(emptyDeal);
  const [showForm, setShowForm] = useState(false);
  const [logFor, setLogFor] = useState<string | null>(null);
  const [logText, setLogText] = useState("");
  const [contactForm, setContactForm] = useState({ name: "", channel: "", handle: "", role: "" });
  const [showContact, setShowContact] = useState(false);

  const deals = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DealRow[];
    },
  });
  const contacts = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const clients = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const events = useQuery({
    queryKey: ["deal-events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deal_events").select("*").order("occurred_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const health = useMemo(() => analyzePipeline(deals.data ?? [], todayISO()), [deals.data]);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["deals"] });
    qc.invalidateQueries({ queryKey: ["deal-events"] });
    qc.invalidateQueries({ queryKey: ["hermes-snapshot"] });
  };

  const createDeal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("deals").insert({
        user_id: userId!,
        title: form.title,
        stage: form.stage,
        client_id: form.client_id || null,
        contact_id: form.contact_id || null,
        value: form.value ? Number(form.value) : null,
        probability: form.probability ? Number(form.probability) : null,
        expected_close: form.expected_close || null,
        next_step: form.next_step || null,
        next_step_date: form.next_step_date || null,
        source: form.source || null,
        last_touch_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => { setForm(emptyDeal); setShowForm(false); refresh(); },
  });

  const createContact = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("contacts").insert({ user_id: userId!, ...contactForm, channel: contactForm.channel || null, handle: contactForm.handle || null, role: contactForm.role || null });
      if (error) throw error;
    },
    onSuccess: () => { setContactForm({ name: "", channel: "", handle: "", role: "" }); setShowContact(false); qc.invalidateQueries({ queryKey: ["contacts"] }); },
  });

  const logEvent = useMutation({
    mutationFn: async (dealId: string) => {
      const { error } = await supabase.from("deal_events").insert({ user_id: userId!, deal_id: dealId, kind: "conversa", content: logText });
      if (error) throw error;
      await supabase.from("deals").update({ last_touch_at: new Date().toISOString() }).eq("id", dealId);
    },
    onSuccess: () => { setLogText(""); setLogFor(null); refresh(); },
  });

  const patch = async (id: string, values: Partial<DealRow> & { last_touch_at?: string }) => {
    await supabase.from("deals").update(values as never).eq("id", id);
    refresh();
  };

  const removeDeal = async (id: string) => {
    await supabase.from("deals").delete().eq("id", id);
    refresh();
  };

  const clientName = (id: string | null) => clients.data?.find((c) => c.id === id)?.name ?? null;
  const contactName = (id: string | null) => contacts.data?.find((c) => c.id === id)?.name ?? null;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pipeline bruto" value={money(health.grossPipeline)} hint={`${health.open} oportunidade(s) aberta(s)`} />
        <Stat label="Pipeline ponderado" value={money(health.weightedPipeline)} hint="valor × probabilidade" />
        <Stat label="Fechamento esperado no mês" value={money(health.expectedThisMonth)} hint="por data prevista" />
        <Stat label="Propostas em aberto" value={health.openProposals.length} />
        <Stat label="Follow-ups vencidos" value={health.overdueFollowUps.length} />
        <Stat label="Sem próxima ação" value={health.missingNextStep.length} />
        <Stat label="Sem contato há 7+ dias" value={health.cooling.length} />
        <Stat label="Novos contatos (7 dias)" value={(contacts.data ?? []).filter((c) => c.created_at.slice(0, 10) >= new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)).length} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setShowForm((v) => !v)} className="font-semibold glow-neon"><Plus className="h-4 w-4" /> Nova oportunidade</Button>
        <Button variant="secondary" onClick={() => setShowContact((v) => !v)}><Plus className="h-4 w-4" /> Novo contato</Button>
      </div>

      {showContact && (
        <form onSubmit={(e) => { e.preventDefault(); createContact.mutate(); }} className="panel grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Nome"><Input required value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} /></Field>
          <Field label="Papel"><Input value={contactForm.role} onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })} /></Field>
          <Field label="Canal"><Input placeholder="WhatsApp, e-mail…" value={contactForm.channel} onChange={(e) => setContactForm({ ...contactForm, channel: e.target.value })} /></Field>
          <Field label="Identificador"><Input value={contactForm.handle} onChange={(e) => setContactForm({ ...contactForm, handle: e.target.value })} /></Field>
          <Button type="submit" className="font-semibold sm:col-span-2">Salvar contato</Button>
        </form>
      )}

      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); createDeal.mutate(); }} className="panel grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Título" className="sm:col-span-2"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Estágio">
            <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as DealStage })}>
              {DEAL_STAGES.map((s) => <Opt key={s} value={s}>{STAGE_LABEL[s]}</Opt>)}
            </Select>
          </Field>
          <Field label="Cliente">
            <Select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
              <Opt value="">Sem cliente</Opt>
              {(clients.data ?? []).map((c) => <Opt key={c.id} value={c.id}>{c.name}</Opt>)}
            </Select>
          </Field>
          <Field label="Pessoa">
            <Select value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })}>
              <Opt value="">Sem contato</Opt>
              {(contacts.data ?? []).map((c) => <Opt key={c.id} value={c.id}>{c.name}</Opt>)}
            </Select>
          </Field>
          <Field label="Valor (opcional)"><Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></Field>
          <Field label="Probabilidade % (opcional)"><Input type="number" min="0" max="100" placeholder={`padrão ${DEFAULT_PROBABILITY[form.stage]}%`} value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} /></Field>
          <Field label="Fechamento previsto"><Input type="date" value={form.expected_close} onChange={(e) => setForm({ ...form, expected_close: e.target.value })} /></Field>
          <Field label="Próximo passo"><Input value={form.next_step} onChange={(e) => setForm({ ...form, next_step: e.target.value })} /></Field>
          <Field label="Data do próximo passo"><Input type="date" value={form.next_step_date} onChange={(e) => setForm({ ...form, next_step_date: e.target.value })} /></Field>
          <Button type="submit" className="font-semibold glow-neon sm:col-span-2">Salvar oportunidade</Button>
        </form>
      )}

      {(deals.data ?? []).length === 0 ? (
        <Empty>
          Nenhuma oportunidade cadastrada. Crie a primeira com título, estágio e próximo passo — o Hermes só recomenda
          sobre dados reais.
        </Empty>
      ) : (
        <div className="grid gap-3">
          {health.analyses.map((a) => (
            <article key={a.deal.id} className="panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{a.deal.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {STAGE_LABEL[a.stage]}
                    {clientName(a.deal.client_id) ? ` · ${clientName(a.deal.client_id)}` : ""}
                    {contactName(a.deal.contact_id) ? ` · ${contactName(a.deal.contact_id)}` : ""}
                    {a.value !== null ? ` · ${money(a.value)}` : " · sem valor"}
                    {` · ${a.probability}%${a.probabilityIsDefault ? " (padrão do estágio)" : ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Select
                    value={a.stage}
                    onChange={(e) => patch(a.deal.id, { stage: e.target.value, last_touch_at: new Date().toISOString() })}
                    className="h-8 w-36 text-xs"
                  >
                    {DEAL_STAGES.map((s) => <Opt key={s} value={s}>{STAGE_LABEL[s]}</Opt>)}
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => setLogFor(logFor === a.deal.id ? null : a.deal.id)} aria-label="Registrar conversa">
                    <MessageSquarePlus className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeDeal(a.deal.id)} aria-label="Excluir">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                {a.missingNextStep && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-destructive/50 bg-destructive/10 px-2 py-1 text-destructive">
                    <AlertTriangle className="h-3 w-3" /> Sem próxima ação
                  </span>
                )}
                {a.overdueFollowUp && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-destructive/50 bg-destructive/10 px-2 py-1 text-destructive">
                    <Clock className="h-3 w-3" /> Follow-up atrasado {a.daysOverdue}d
                  </span>
                )}
                {a.cooling && !a.overdueFollowUp && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/40 px-2 py-1 text-muted-foreground">
                    Sem contato há {a.daysSinceTouch}d
                  </span>
                )}
                {a.deal.next_step && (
                  <span className="rounded-full border border-border bg-secondary/40 px-2 py-1 text-muted-foreground">
                    Próximo: {a.deal.next_step} · {dateBR(a.deal.next_step_date)}
                  </span>
                )}
              </div>

              {a.open && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Input
                    defaultValue={a.deal.next_step ?? ""}
                    placeholder="Definir próximo passo"
                    onBlur={(e) => e.target.value !== (a.deal.next_step ?? "") && patch(a.deal.id, { next_step: e.target.value || null })}
                    className="h-9 text-sm"
                  />
                  <Input
                    type="date"
                    defaultValue={a.deal.next_step_date ?? ""}
                    onBlur={(e) => e.target.value !== (a.deal.next_step_date ?? "") && patch(a.deal.id, { next_step_date: e.target.value || null })}
                    className="h-9 text-sm"
                  />
                </div>
              )}

              {logFor === a.deal.id && (
                <form
                  onSubmit={(e) => { e.preventDefault(); logEvent.mutate(a.deal.id); }}
                  className="mt-3 grid gap-2"
                >
                  <Textarea required value={logText} onChange={(e) => setLogText(e.target.value)} placeholder="O que aconteceu nessa conversa?" rows={2} />
                  <Button type="submit" size="sm" className="justify-self-start font-semibold">Registrar</Button>
                </form>
              )}

              {(events.data ?? []).filter((e) => e.deal_id === a.deal.id).slice(0, 3).map((e) => (
                <p key={e.id} className="mt-2 border-l-2 border-border pl-3 text-xs text-muted-foreground">
                  {new Date(e.occurred_at).toLocaleDateString("pt-BR")} · {e.content}
                </p>
              ))}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Chips, Empty, Field, Opt, Select, Stat, money, dateBR, useUserId } from "@/components/personal/kit";

export const Route = createFileRoute("/personal/_app/business")({
  head: () => ({
    meta: [
      { title: "Negócios — PERSONAL OS" },
      { name: "description", content: "Centro de gestão empresarial com empresas, projetos, clientes e indicadores financeiros." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Negócios — PERSONAL OS" },
      { property: "og:description", content: "Empresas, projetos, clientes e métricas." },
    ],
  }),
  component: BusinessPage,
});

const TABS = ["visao", "empresas", "projetos", "clientes"] as const;
const TAB_LABEL = { visao: "Visão geral", empresas: "Empresas", projetos: "Projetos", clientes: "Clientes" };

function BusinessPage() {
  const qc = useQueryClient();
  const userId = useUserId();
  const [tab, setTab] = useState<(typeof TABS)[number]>("visao");
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState({ name: "", segment: "", description: "", contacts: "", status: "ativa" });
  const [project, setProject] = useState({ name: "", objective: "", deadline: "", status: "ativo", company_id: "", task_id: "" });
  const [client, setClient] = useState({ name: "", contact: "", history: "", notes: "", company_id: "", status: "ativo" });

  const companies = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const projects = useQuery({
    queryKey: ["business-projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("business_projects").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const clients = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const finance = useQuery({
    queryKey: ["finance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("finance_transactions").select("*").order("tx_date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) }));
    },
  });

  const invalidate = (key: string) => {
    qc.invalidateQueries({ queryKey: [key] });
    setOpen(false);
  };

  const createCompany = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("companies").insert({ ...company, user_id: userId! });
      if (error) throw error;
    },
    onSuccess: () => { setCompany({ name: "", segment: "", description: "", contacts: "", status: "ativa" }); invalidate("companies"); },
  });
  const createProject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("business_projects").insert({
        user_id: userId!, name: project.name, objective: project.objective || null,
        deadline: project.deadline || null, status: project.status, company_id: project.company_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { setProject({ name: "", objective: "", deadline: "", status: "ativo", company_id: "", task_id: "" }); invalidate("business-projects"); },
  });
  const createClient = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clients").insert({
        user_id: userId!, name: client.name, contact: client.contact || null, history: client.history || null,
        notes: client.notes || null, company_id: client.company_id || null, status: client.status,
      });
      if (error) throw error;
    },
    onSuccess: () => { setClient({ name: "", contact: "", history: "", notes: "", company_id: "", status: "ativo" }); invalidate("clients"); },
  });

  const del = async (table: "companies" | "business_projects" | "clients", id: string, key: string) => {
    await supabase.from(table).delete().eq("id", id);
    qc.invalidateQueries({ queryKey: [key] });
  };

  const biz = (finance.data ?? []).filter((r) => r.category === "negocios" || r.scope === "negocios");
  const income = biz.filter((r) => r.kind === "receita").reduce((s, r) => s + r.amount, 0);
  const expense = biz.filter((r) => r.kind === "despesa").reduce((s, r) => s + r.amount, 0);
  const growth = expense > 0 ? Math.round(((income - expense) / expense) * 100) : 0;

  return (
    <PersonalShell
      title="Negócios"
      subtitle="Empresas, projetos, clientes e indicadores."
      actions={<Button onClick={() => setOpen((v) => !v)} className="font-semibold glow-neon"><Plus className="h-4 w-4" /> Novo</Button>}
    >
      <Chips items={TABS} value={tab} onChange={setTab} labels={TAB_LABEL} />

      {tab === "visao" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Empresas" value={companies.data?.length ?? 0} />
          <Stat label="Projetos ativos" value={(projects.data ?? []).filter((p) => p.status === "ativo").length} />
          <Stat label="Clientes" value={clients.data?.length ?? 0} />
          <Stat label="Crescimento" value={`${growth}%`} hint="receitas vs despesas de negócios" />
          <Stat label="Receitas (negócios)" value={money(income)} />
          <Stat label="Despesas (negócios)" value={money(expense)} />
          <Stat label="Resultado" value={money(income - expense)} />
          <Stat label="Meta mensal" value={money(income)} hint="acompanhe no Financeiro" />
        </div>
      )}

      {tab === "empresas" && (
        <>
          {open && (
            <form onSubmit={(e) => { e.preventDefault(); createCompany.mutate(); }} className="panel mb-6 grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Nome"><Input required value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} /></Field>
              <Field label="Segmento"><Input value={company.segment} onChange={(e) => setCompany({ ...company, segment: e.target.value })} /></Field>
              <Field label="Contatos"><Input value={company.contacts} onChange={(e) => setCompany({ ...company, contacts: e.target.value })} /></Field>
              <Field label="Status">
                <Select value={company.status} onChange={(e) => setCompany({ ...company, status: e.target.value })}>
                  <Opt value="ativa">Ativa</Opt><Opt value="pausada">Pausada</Opt><Opt value="encerrada">Encerrada</Opt>
                </Select>
              </Field>
              <Field label="Descrição" className="sm:col-span-2">
                <Textarea value={company.description} onChange={(e) => setCompany({ ...company, description: e.target.value })} />
              </Field>
              <Button type="submit" className="font-semibold glow-neon sm:col-span-2">Salvar empresa</Button>
            </form>
          )}
          <div className="grid gap-3">
            {(companies.data ?? []).length === 0 && <Empty>Nenhuma empresa cadastrada.</Empty>}
            {(companies.data ?? []).map((c) => (
              <article key={c.id} className="panel flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{c.segment || "sem segmento"} · {c.status}</p>
                  {c.description && <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>}
                  {c.contacts && <p className="mt-1 text-xs text-primary">{c.contacts}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => del("companies", c.id, "companies")}><Trash2 className="h-4 w-4" /></Button>
              </article>
            ))}
          </div>
        </>
      )}

      {tab === "projetos" && (
        <>
          {open && (
            <form onSubmit={(e) => { e.preventDefault(); createProject.mutate(); }} className="panel mb-6 grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Nome"><Input required value={project.name} onChange={(e) => setProject({ ...project, name: e.target.value })} /></Field>
              <Field label="Prazo"><Input type="date" value={project.deadline} onChange={(e) => setProject({ ...project, deadline: e.target.value })} /></Field>
              <Field label="Empresa">
                <Select value={project.company_id} onChange={(e) => setProject({ ...project, company_id: e.target.value })}>
                  <Opt value="">Sem empresa</Opt>
                  {(companies.data ?? []).map((c) => <Opt key={c.id} value={c.id}>{c.name}</Opt>)}
                </Select>
              </Field>
              <Field label="Status">
                <Select value={project.status} onChange={(e) => setProject({ ...project, status: e.target.value })}>
                  <Opt value="ativo">Ativo</Opt><Opt value="pausado">Pausado</Opt><Opt value="concluido">Concluído</Opt>
                </Select>
              </Field>
              <Field label="Objetivo" className="sm:col-span-2">
                <Textarea value={project.objective} onChange={(e) => setProject({ ...project, objective: e.target.value })} />
              </Field>
              <Button type="submit" className="font-semibold glow-neon sm:col-span-2">Salvar projeto</Button>
            </form>
          )}
          <div className="grid gap-3">
            {(projects.data ?? []).length === 0 && <Empty>Nenhum projeto cadastrado.</Empty>}
            {(projects.data ?? []).map((p) => (
              <article key={p.id} className="panel flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {p.status} · prazo {dateBR(p.deadline)}
                    {p.company_id ? ` · ${(companies.data ?? []).find((c) => c.id === p.company_id)?.name ?? ""}` : ""}
                  </p>
                  {p.objective && <p className="mt-2 text-sm text-muted-foreground">{p.objective}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => del("business_projects", p.id, "business-projects")}><Trash2 className="h-4 w-4" /></Button>
              </article>
            ))}
          </div>
        </>
      )}

      {tab === "clientes" && (
        <>
          {open && (
            <form onSubmit={(e) => { e.preventDefault(); createClient.mutate(); }} className="panel mb-6 grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Nome"><Input required value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} /></Field>
              <Field label="Contato"><Input value={client.contact} onChange={(e) => setClient({ ...client, contact: e.target.value })} /></Field>
              <Field label="Empresa">
                <Select value={client.company_id} onChange={(e) => setClient({ ...client, company_id: e.target.value })}>
                  <Opt value="">Sem empresa</Opt>
                  {(companies.data ?? []).map((c) => <Opt key={c.id} value={c.id}>{c.name}</Opt>)}
                </Select>
              </Field>
              <Field label="Status">
                <Select value={client.status} onChange={(e) => setClient({ ...client, status: e.target.value })}>
                  <Opt value="ativo">Ativo</Opt><Opt value="prospect">Prospect</Opt><Opt value="inativo">Inativo</Opt>
                </Select>
              </Field>
              <Field label="Histórico" className="sm:col-span-2"><Textarea value={client.history} onChange={(e) => setClient({ ...client, history: e.target.value })} /></Field>
              <Field label="Observações" className="sm:col-span-2"><Textarea value={client.notes} onChange={(e) => setClient({ ...client, notes: e.target.value })} /></Field>
              <Button type="submit" className="font-semibold glow-neon sm:col-span-2">Salvar cliente</Button>
            </form>
          )}
          <div className="grid gap-3">
            {(clients.data ?? []).length === 0 && <Empty>Nenhum cliente cadastrado.</Empty>}
            {(clients.data ?? []).map((c) => (
              <article key={c.id} className="panel flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{c.status}{c.contact ? ` · ${c.contact}` : ""}</p>
                  {c.history && <p className="mt-2 text-sm text-muted-foreground">{c.history}</p>}
                  {c.notes && <p className="mt-1 text-xs text-muted-foreground">{c.notes}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => del("clients", c.id, "clients")}><Trash2 className="h-4 w-4" /></Button>
              </article>
            ))}
          </div>
        </>
      )}
    </PersonalShell>
  );
}

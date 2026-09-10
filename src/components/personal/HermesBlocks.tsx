import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Briefcase, Clock, Compass, Target } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { money, dateBR } from "@/components/personal/kit";
import { getHermesSnapshot, listSuggestions, updateSuggestion } from "@/lib/hermes.functions";
import { STAGE_LABEL, type DealStage } from "@/lib/pipeline";
import type { HermesSnapshot } from "@/lib/hermes-context";

export function useHermesSnapshot() {
  const fn = useServerFn(getHermesSnapshot);
  return useQuery<HermesSnapshot>({
    queryKey: ["hermes-snapshot"],
    queryFn: () => fn({ data: undefined as never }),
    staleTime: 60_000,
  });
}

export function NoData({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/** Bloco 1 — Direção do Hermes: foco, 3 prioridades com evidência e sugestões acionáveis. */
export function HermesDirection({ snapshot, compact = false }: { snapshot: HermesSnapshot | undefined; compact?: boolean }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listSuggestions);
  const updateFn = useServerFn(updateSuggestion);

  const suggestions = useQuery({
    queryKey: ["hermes-suggestions"],
    queryFn: () => listFn({ data: undefined as never }),
  });

  const act = useMutation({
    mutationFn: (vars: { id: string; status: "aceita" | "recusada" | "adiada" }) =>
      updateFn({ data: { ...vars, createTask: vars.status === "aceita" } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hermes-suggestions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const top = snapshot?.prioridades.slice(0, 3) ?? [];

  return (
    <section className="panel p-5">
      <header className="flex items-center justify-between gap-2 pb-4">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-wide">Direção do Hermes</h2>
        </div>
        {compact && <Link to="/personal/hermes" className="text-xs text-primary hover:underline">Abrir Hermes →</Link>}
      </header>

      {!snapshot ? (
        <NoData>Calculando o contexto…</NoData>
      ) : top.length === 0 ? (
        <NoData>Não há dados suficientes registrados para recomendar uma ação. Cadastre oportunidades em Negócios ou use a Captura.</NoData>
      ) : (
        <>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Foco agora</p>
          <p className="mt-1 text-lg font-bold leading-snug">{top[0]!.titulo}</p>
          <p className="mt-1 text-sm text-muted-foreground">{top[0]!.motivo}</p>

          <ol className="mt-4 grid gap-2">
            {top.map((p, i) => (
              <li key={p.id} className="rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
                <div className="flex items-start gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-primary/15 text-xs font-bold text-primary">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{p.titulo}</p>
                    <p className="text-xs text-muted-foreground">{p.motivo}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Evidências: {p.evidencias.map((e) => `${e.tipo}: ${e.ref}${e.data ? ` (${dateBR(e.data)})` : ""}`).join(" · ") || "—"}
                    </p>
                  </div>
                  <span className="ml-auto shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase text-muted-foreground">{p.dominio}</span>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      {(suggestions.data?.length ?? 0) > 0 && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Sugestões pendentes</p>
          <ul className="mt-2 grid gap-2">
            {suggestions.data!.map((s) => (
              <li key={s.id} className="rounded-xl border border-border bg-secondary/20 px-3 py-2.5">
                <p className="text-sm font-medium">{s.title}</p>
                {s.rationale && <p className="text-xs text-muted-foreground">{s.rationale}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" className="h-7 text-xs font-semibold" disabled={act.isPending} onClick={() => act.mutate({ id: s.id, status: "aceita" })}>
                    Aceitar (cria tarefa)
                  </Button>
                  <Button size="sm" variant="secondary" className="h-7 text-xs" disabled={act.isPending} onClick={() => act.mutate({ id: s.id, status: "adiada" })}>Adiar</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={act.isPending} onClick={() => act.mutate({ id: s.id, status: "recusada" })}>Recusar</Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Bloco 2 — Motor comercial: higiene do pipeline e itens parados. */
export function CommercialEngine({ snapshot }: { snapshot: HermesSnapshot | undefined }) {
  const c = snapshot?.comercial;
  return (
    <section className="panel p-5">
      <header className="flex items-center justify-between gap-2 pb-4">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold tracking-wide">Motor comercial</h2>
        </div>
        <Link to="/personal/business" className="text-xs text-primary hover:underline">Abrir Negócios →</Link>
      </header>

      {!c || c.totalOportunidades === 0 ? (
        <NoData>Nenhuma oportunidade registrada. Cadastre a primeira em Negócios → Pipeline para o motor comercial funcionar.</NoData>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 text-center text-[11px] text-muted-foreground lg:grid-cols-4">
            {[
              ["Pipeline bruto", money(c.pipelineBruto)],
              ["Ponderado", money(c.pipelinePonderado)],
              ["Previsto no mês", money(c.fechamentoEsperadoMes)],
              ["Propostas abertas", String(c.propostasAbertas)],
              ["Follow-ups vencidos", String(c.followUpsVencidos)],
              ["Sem próxima ação", String(c.semProximaAcao)],
              ["Sem contato 7+ dias", String(c.esfriando)],
              ["Novos contatos (7d)", String(c.novosContatosSemana)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border bg-secondary/40 px-2 py-3">
                <p className="text-base font-bold text-foreground">{value}</p>
                <p className="mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {c.criticos.length > 0 && (
            <ul className="mt-4 grid gap-2">
              {c.criticos.slice(0, 5).map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate font-medium">{d.titulo}</span>
                  <span className="flex items-center gap-2 text-xs text-destructive">
                    {d.diasAtraso > 0 ? <Clock className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    {d.problema}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {STAGE_LABEL[d.estagio as DealStage] ?? d.estagio}
                    {d.valor !== null ? ` · ${money(d.valor)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

/** Itens parados em qualquer frente. */
export function StalledItems({ snapshot }: { snapshot: HermesSnapshot | undefined }) {
  const o = snapshot?.operacional;
  const items = [
    ...(snapshot?.comercial.criticos ?? []).map((c) => `${c.titulo} — ${c.problema}`),
    ...(o && o.tarefasAtrasadas ? [`${o.tarefasAtrasadas} tarefa(s) com prazo vencido`] : []),
    ...(o && o.capturasPendentes ? [`${o.capturasPendentes} captura(s) não processada(s)`] : []),
    ...(snapshot?.estado.diasDesdeUltimoDiario && snapshot.estado.diasDesdeUltimoDiario >= 3
      ? [`${snapshot.estado.diasDesdeUltimoDiario} dias sem registro no diário`]
      : []),
  ];

  return (
    <section className="panel p-5">
      <header className="flex items-center gap-2 pb-4">
        <Target className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-wide">O que está parado</h2>
      </header>
      {items.length === 0 ? <NoData>Nada parado com base nos registros atuais.</NoData> : (
        <ul className="grid gap-1.5 text-sm text-muted-foreground">
          {items.slice(0, 8).map((t) => <li key={t}>• {t}</li>)}
        </ul>
      )}
    </section>
  );
}

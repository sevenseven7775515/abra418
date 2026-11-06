import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Briefcase, Clock, Compass, Target } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { money, dateBR } from "@/components/personal/kit";
import { getHermesSnapshot } from "@/lib/hermes.functions";
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
        <NoData>Lendo seus diários…</NoData>
      ) : top.length === 0 ? (
        <NoData>Seus diários recentes não apontam nada urgente.</NoData>
      ) : (
        <>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Foco agora</p>
          <p className="mt-1 text-lg font-bold leading-snug">{top[0]!.titulo}</p>
          <p className="mt-1 text-sm text-muted-foreground">{top[0]!.motivo}</p>
          {top.length > 1 && (
            <ol className="mt-4 grid gap-2">
              {top.slice(1).map((p, i) => (
                <li key={p.id} className="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-primary/15 text-xs font-bold text-primary">{i + 2}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{p.titulo}</p>
                    <p className="text-xs text-muted-foreground">{p.motivo}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Fonte: {[...new Set(top.flatMap((p) => p.evidencias.map((e) => `${e.tipo}${e.data ? ` ${dateBR(e.data)}` : ""}`)))].join(" · ")}
          </p>
        </>
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
          <h2 className="text-sm font-semibold tracking-wide">Trabalho</h2>
        </div>
        <Link to="/personal/business" className="text-xs text-primary hover:underline">Abrir Negócios →</Link>
      </header>

      {!c || c.totalOportunidades === 0 ? (
        <DiaryWork snapshot={snapshot} />
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

/** Trabalho relatado nos diários (últimos 45 dias). */
export function DiaryWork({ snapshot }: { snapshot: HermesSnapshot | undefined }) {
  const w = snapshot?.diario.trabalho ?? [];
  if (!snapshot) return <NoData>Lendo seus diários…</NoData>;
  if (w.length === 0) return <NoData>Nenhum trabalho relatado nos diários dos últimos 45 dias.</NoData>;
  return (
    <ul className="grid gap-1.5 text-sm">
      {w.slice(0, 6).map((t, i) => (
        <li key={i} className="flex gap-3"><span className="w-12 shrink-0 text-xs text-muted-foreground">{dateBR(t.data).slice(0, 5)}</span><span>{t.texto}</span></li>
      ))}
    </ul>
  );
}

/** Itens parados em qualquer frente. */
export function StalledItems({ snapshot }: { snapshot: HermesSnapshot | undefined }) {
  const o = snapshot?.operacional;
  const items = [
    ...(snapshot?.comercial.criticos ?? []).map((c) => `${c.titulo} — ${c.problema}`),
    ...(o && o.tarefasAtrasadas ? [`${o.tarefasAtrasadas} tarefa(s) com prazo vencido`] : []),
    ...(snapshot?.diario.contas ?? []).slice(3).map((c) => `${c.texto}${c.vence ? ` — vence ${dateBR(c.vence)}` : ""}`),
    ...(snapshot?.diario.melhorias ?? []).filter((m) => m.vezes >= 2).map((m) => `${m.texto} (repetido ${m.vezes}× no diário)`),
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
      {items.length === 0 ? <NoData>Nada parado segundo os diários.</NoData> : (
        <ul className="grid gap-1.5 text-sm text-muted-foreground">
          {items.slice(0, 8).map((t) => <li key={t}>• {t}</li>)}
        </ul>
      )}
    </section>
  );
}

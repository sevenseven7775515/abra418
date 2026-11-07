import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "./kit";
import { compareSaturnDiary, SATURN_2026, saturnStatus, type SaturnEntry } from "./saturn";

const dateBR = (date: string) => date.split("-").reverse().join("/");
const MOODS: Record<string, string> = { otimo: "ótimo", bom: "bom", neutro: "neutro", cansado: "cansado", dificil: "difícil" };

export function SaturnDiary() {
  const userId = useUserId();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const timer = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(timer); }, []);
  const query = useQuery({
    queryKey: ["personal-saturn-diary", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const entries: SaturnEntry[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from("journal_entries")
          .select("id, entry_date, summary, mood, energy").eq("user_id", userId)
          .gte("entry_date", "2026-04-20").lte("entry_date", "2027-03-15")
          .order("entry_date").order("id").range(offset, offset + 499);
        if (error) throw error;
        entries.push(...(data ?? []));
        if (!data || data.length < 500) break;
      }
      return entries;
    },
  });
  const today = now ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now) : "";
  const phases = compareSaturnDiary(query.data ?? [], today);
  return (
    <section className="border-y border-border py-5 lg:col-span-2" aria-label="Saturno e seus relatos">
      <p className="text-[11px] uppercase text-primary">Ciclos e diário · 2026</p>
      <h2 className="mt-1 text-lg font-bold">{now ? saturnStatus(now) : "Saturno e seus relatos"}</h2>
      <p className="mt-2 text-sm">A retrogradação termina em <strong>10/12/2026, às 20h23</strong> (São Paulo). A pós-sombra segue até <strong>15/03/2027</strong>.</p>
      <p className="mt-2 text-sm text-muted-foreground">Na astrologia tropical, Saturno em Áries simboliza responsabilidade na iniciativa, limites e autonomia. A retomada pode servir como marco de reflexão, não como promessa de melhora ou previsão de acontecimentos.</p>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold text-primary">Fases nos meus relatos</summary>
        {query.isPending && <p className="mt-3 text-sm text-muted-foreground">Lendo os relatos…</p>}
        {query.isError && <p role="alert" className="mt-3 text-sm text-destructive">Não foi possível consultar os relatos agora.</p>}
        {query.isSuccess && <div className="mt-4 grid gap-5 sm:grid-cols-3">
          {phases.map((phase) => <div key={phase.key} className="min-w-0">
            <h3 className="text-sm font-bold">{phase.label}</h3>
            <p className="text-xs text-muted-foreground">{dateBR(phase.start)} — {dateBR(phase.end)}</p>
            <p className="mt-2 text-xs text-muted-foreground">Leitura simbólica: {phase.symbolic}</p>
            {phase.days ? <>
              <p className="mt-3 text-sm">{phase.days} dias com relatos</p>
              {phase.energy !== null && <p className="text-xs">Energia média: {phase.energy}/10 · {phase.energySamples} medições</p>}
              {!!phase.moods.length && <p className="text-xs">Humor registrado: {phase.moods.map(([mood, n]) => `${MOODS[mood] ?? mood} (${n})`).join(", ")}</p>}
              <ul className="mt-3 space-y-3">{phase.evidence.map((e) => <li key={e.id} className="text-xs">
                <p className="font-semibold">{dateBR(e.entry_date)}</p>
                <p className="mt-1 line-clamp-4 break-words text-muted-foreground">{e.summary}</p>
                <details className="mt-1"><summary className="cursor-pointer text-muted-foreground">Ver evidência</summary><p className="mt-1 break-words">Diário {e.id}</p><p className="mt-1 whitespace-pre-wrap break-words">{e.summary}</p></details>
              </li>)}</ul>
            </> : <p className="mt-3 text-xs text-muted-foreground">{phase.start > today ? "Período futuro: ainda não há relatos para comparar." : "Não há dados suficientes registrados neste período."}</p>}
          </div>)}
        </div>}
        <p className="mt-4 text-xs text-muted-foreground">Comparação por dia, não por horário: 26/07 e 10/12 entram na retrogradação. Diferenças entre relatos não demonstram que Saturno causou mudanças emocionais. Sem mapa natal completo, não são inferidos casas ou aspectos pessoais.</p>
      </details>
      <details className="mt-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer">Datas e fontes</summary>
        <p className="mt-2">Início: 26/07/2026, 16h57. Fim: 10/12/2026, 20h23. Horários de São Paulo (UTC−3). A data da pós-sombra não informa horário exato.</p>
        <p className="mt-2">Retrogradação é movimento aparente visto da Terra; Saturno não inverte sua órbita. “Sombra” e significados pessoais são convenções astrológicas, sem comprovação científica de previsão.</p>
        <ul className="mt-2 space-y-1">{SATURN_2026.sources.map((s) => <li key={s.url}><a className="text-primary underline" href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}</ul>
      </details>
    </section>
  );
}
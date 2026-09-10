import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, ClipboardPaste, Check } from "lucide-react";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Empty, Field, Opt, Select } from "@/components/personal/kit";
import { supabase } from "@/integrations/supabase/client";
import { commitCapture, interpretCapture, type InterpretResult } from "@/lib/capture.functions";

export const Route = createFileRoute("/personal/_app/capture")({
  head: () => ({
    meta: [
      { title: "Captura — PERSONAL OS" },
      { name: "description", content: "Cole o texto do dia e transforme em registros revisáveis, sem digitar duas vezes." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Captura — PERSONAL OS" },
      { property: "og:description", content: "Captura rápida de texto bruto." },
    ],
  }),
  component: CapturePage,
});

function CapturePage() {
  const interpret = useServerFn(interpretCapture);
  const commit = useServerFn(commitCapture);

  const [text, setText] = useState("");
  const [result, setResult] = useState<InterpretResult | null>(null);
  const [date, setDate] = useState("");
  const [saveJournal, setSaveJournal] = useState(true);
  const [eventsOn, setEventsOn] = useState<Record<number, boolean>>({});
  const [practicesOn, setPracticesOn] = useState<Record<number, boolean>>({});
  const [dealId, setDealId] = useState("");
  const [dealNote, setDealNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const deals = useQuery({
    queryKey: ["deals-lite"],
    queryFn: async () => {
      const { data } = await supabase.from("deals").select("id, title").order("updated_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const run = async () => {
    setBusy(true); setError(null); setDone(null);
    try {
      const r = await interpret({ data: { text, persist: true } });
      setResult(r);
      setDate(r.proposal.date ?? new Date().toISOString().slice(0, 10));
      setEventsOn(Object.fromEntries(r.proposal.events.map((_, i) => [i, true])));
      setPracticesOn(Object.fromEntries(r.proposal.practices.map((_, i) => [i, true])));
      setDealNote(r.proposal.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao interpretar o texto.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!result) return;
    setBusy(true); setError(null);
    try {
      const p = result.proposal;
      const r = await commit({
        data: {
          captureId: result.captureId,
          date,
          saveJournal,
          journal: {
            title: p.title,
            content: p.cleanText,
            summary: p.summary,
            mainActivities: p.mainActivities,
            achievements: p.achievements,
            pending: p.pending,
            insights: p.insights,
          },
          events: p.events.filter((_, i) => eventsOn[i]),
          practices: p.practices.filter((_, i) => practicesOn[i]),
          dealEvent: dealId && dealNote.trim() ? { dealId, content: dealNote.trim(), kind: "conversa" } : null,
        },
      });
      setDone(
        `Gravado: ${r.journalId ? (r.appended ? "diário atualizado" : "diário criado") : "sem diário"}, ` +
          `${r.events} acontecimento(s), ${r.practices} prática(s)${r.dealEvent ? ", 1 registro comercial" : ""}.`,
      );
      setResult(null); setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gravar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PersonalShell title="Captura" subtitle="Cole o texto bruto do dia. Nada é gravado sem sua confirmação.">
      {!result && (
        <section className="panel grid gap-4 p-5">
          <Field label="Texto colado (WhatsApp, notas, áudio transcrito)">
            <Textarea
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"08/09/2026 07:12 - Marcos: acordei 5h30, pranayama 20min\n08/09/2026 14:00 - Marcos: reunião com cliente X, mandar proposta sexta"}
            />
          </Field>
          <Button onClick={run} disabled={busy || text.trim().length < 3} className="justify-self-start font-semibold glow-neon">
            <ClipboardPaste className="h-4 w-4" /> {busy ? "Interpretando…" : "Interpretar"}
          </Button>
          {done && <p className="flex items-center gap-2 text-sm text-primary"><Check className="h-4 w-4" /> {done}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </section>
      )}

      {result && (
        <div className="grid gap-4">
          {result.conflicts.length > 0 && (
            <section className="panel border-destructive/40 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-destructive"><AlertTriangle className="h-4 w-4" /> Verifique antes de gravar</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {result.conflicts.map((c) => <li key={c.tipo + c.mensagem}>• {c.mensagem}</li>)}
              </ul>
            </section>
          )}

          <section className="panel grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Data do registro"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Origem da data">
              <p className="pt-2 text-sm text-muted-foreground">
                {result.proposal.dateOrigin === "mensagens" ? "detectada nas mensagens" : result.proposal.dateOrigin === "conteudo" ? "detectada no texto" : "não encontrada — hoje"}
              </p>
            </Field>
            <Field label="Resumo" className="sm:col-span-2">
              <p className="text-sm text-muted-foreground">{result.proposal.summary || "Sem resumo automático."}</p>
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={saveJournal} onChange={(e) => setSaveJournal(e.target.checked)} />
              Gravar no diário
            </label>
          </section>

          <section className="panel p-5">
            <h2 className="text-sm font-semibold">Acontecimentos ({result.proposal.events.length})</h2>
            {result.proposal.events.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nenhum acontecimento identificado.</p>
            ) : (
              <ul className="mt-3 grid max-h-72 gap-1 overflow-auto text-sm">
                {result.proposal.events.map((e, i) => (
                  <li key={`${i}-${e.description}`} className="flex items-start gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2">
                    <input type="checkbox" checked={!!eventsOn[i]} onChange={(ev) => setEventsOn({ ...eventsOn, [i]: ev.target.checked })} className="mt-1" />
                    <span className="min-w-0">
                      <span className="text-xs text-primary">{e.time ?? "—"}</span> {e.description}
                      <span className="ml-2 text-[11px] capitalize text-muted-foreground">{e.category}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel p-5">
            <h2 className="text-sm font-semibold">Práticas ({result.proposal.practices.length})</h2>
            {result.proposal.practices.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nenhuma prática identificada.</p>
            ) : (
              <ul className="mt-3 grid gap-1 text-sm">
                {result.proposal.practices.map((p, i) => (
                  <li key={`${i}-${p.name}`} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2">
                    <input type="checkbox" checked={!!practicesOn[i]} onChange={(ev) => setPracticesOn({ ...practicesOn, [i]: ev.target.checked })} />
                    <span>{p.name} <span className="text-[11px] capitalize text-muted-foreground">{p.category}{p.time ? ` · ${p.time}` : ""}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Registrar em uma oportunidade (opcional)">
              <Select value={dealId} onChange={(e) => setDealId(e.target.value)}>
                <Opt value="">Não registrar</Opt>
                {(deals.data ?? []).map((d) => <Opt key={d.id} value={d.id}>{d.title}</Opt>)}
              </Select>
            </Field>
            <Field label="Nota comercial"><Input value={dealNote} onChange={(e) => setDealNote(e.target.value)} /></Field>
          </section>

          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={busy} className="font-semibold glow-neon">{busy ? "Gravando…" : "Confirmar e gravar"}</Button>
            <Button variant="secondary" onClick={() => setResult(null)} disabled={busy}>Voltar</Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}

      {!result && !text && <Empty>Cole aqui o que você mandou para si mesmo no WhatsApp. O sistema extrai data, horários e práticas automaticamente.</Empty>}
    </PersonalShell>
  );
}

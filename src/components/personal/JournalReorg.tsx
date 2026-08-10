import { useState } from "react";
import { RotateCcw, Undo2, Wand2, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { listReorgTargets, reorganizeJournalEntries, restoreJournalBackups } from "@/lib/journal-reorg.functions";

type Props = { onDone: () => void; onClose: () => void };

const BATCH = 10;

export function JournalReorg({ onDone, onClose }: Props) {
  const listTargets = useServerFn(listReorgTargets);
  const reorganize = useServerFn(reorganizeJournalEntries);
  const restore = useServerFn(restoreJournalBackups);

  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  async function run() {
    if (busy) return;
    setBusy(true); setError(null); setLog([]); setStatus("Buscando arquivos importados…");
    try {
      const { ids } = await listTargets({ data: { onlyPending: !all } });
      if (!ids.length) { setStatus("Nada a reorganizar — todos os registros já estão estruturados."); return; }

      let done = 0, events = 0, practices = 0;
      const pending: string[] = [];
      for (let i = 0; i < ids.length; i += BATCH) {
        const chunk = ids.slice(i, i + BATCH);
        setStatus(`Reorganizando… ${Math.min(i + BATCH, ids.length)}/${ids.length}`);
        try {
          const r = await reorganize({ data: { ids: chunk } });
          done += r.processed; events += r.events; practices += r.practices;
          if (r.needsDate.length) pending.push(...r.needsDate);
        } catch (e) {
          setLog((l) => [...l, `Falhou em ${chunk.length} registro(s): ${e instanceof Error ? e.message : "erro"}`]);
        }
      }
      if (pending.length) {
        setLog((l) => [...l, `Sem data no nome do arquivo (confirme manualmente): ${pending.slice(0, 20).join(", ")}`]);
      }
      setStatus(`Concluído: ${done} diário(s) limpos e estruturados · ${events} evento(s) na linha do tempo · ${practices} prática(s) histórica(s).`);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao reorganizar.");
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (busy) return;
    setBusy(true); setError(null); setStatus("Restaurando textos originais…");
    try {
      const { ids } = await listTargets({ data: { onlyPending: false } });
      let restored = 0;
      for (let i = 0; i < ids.length; i += 25) {
        const r = await restore({ data: { ids: ids.slice(i, i + 25) } });
        restored += r.restored;
      }
      setStatus(`Restaurados ${restored} registro(s) a partir do backup.`);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao restaurar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel mb-6 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">Reorganizar histórico importado</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Faz backup, limpa códigos de formatação, corrige a data pelo nome do arquivo e gera resumo,
            linha do tempo e práticas históricas — sem reimportar nada.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} disabled={busy}><X className="h-4 w-4" /></Button>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} disabled={busy} />
        Reprocessar também os que já foram reorganizados
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button className="font-semibold glow-neon" disabled={busy} onClick={run}>
          <Wand2 className="h-4 w-4" /> {busy ? "Processando…" : "Reorganizar agora"}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={undo}>
          <Undo2 className="h-4 w-4" /> Restaurar originais
        </Button>
      </div>

      {status && <p className="mt-3 flex items-center gap-2 text-sm text-primary"><RotateCcw className="h-3 w-3" />{status}</p>}
      {error && <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {log.length > 0 && (
        <ul className="mt-3 max-h-32 space-y-1 overflow-auto text-xs text-muted-foreground">
          {log.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      )}
    </section>
  );
}

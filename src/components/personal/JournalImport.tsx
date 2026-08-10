import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ACCEPTED_EXTENSIONS, parseJournalFile } from "@/lib/journal-parse";
import { processJournalEntries } from "@/lib/journal-ai.functions";

type Props = { userId: string | null; onDone: () => void; onClose: () => void };

export function JournalImport({ userId, onDone, onClose }: Props) {
  const process = useServerFn(processJournalEntries);
  const inputRef = useRef<HTMLInputElement>(null);
  const [withAi, setWithAi] = useState(true);
  const [integrate, setIntegrate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  async function run(files: FileList | null) {
    if (!files?.length || !userId || busy) return;
    setBusy(true); setError(null); setLog([]);
    const list = Array.from(files);
    const ids: string[] = [];
    let skipped = 0;

    try {
      for (let i = 0; i < list.length; i += 1) {
        const file = list[i]!;
        setStatus(`Lendo arquivos… ${i + 1}/${list.length}`);
        try {
          const parsed = await parseJournalFile(file);
          if (!parsed.content.trim()) { skipped += 1; continue; }
          const { data, error: err } = await supabase.from("journal_entries").insert({
            user_id: userId,
            entry_date: parsed.date ?? new Date(file.lastModified).toISOString().slice(0, 10),
            title: parsed.title,
            content: parsed.content.slice(0, 60000),
            source_file: parsed.fileName,
            imported: true,
          }).select("id").single();
          if (err) throw err;
          ids.push(data.id);
        } catch {
          skipped += 1;
          setLog((l) => [...l, `Falhou: ${file.name}`]);
        }
      }

      if (withAi && ids.length) {
        for (let i = 0; i < ids.length; i += 5) {
          const chunk = ids.slice(i, i + 5);
          setStatus(`Analisando com IA… ${Math.min(i + 5, ids.length)}/${ids.length}`);
          try {
            await process({ data: { ids: chunk, integrate } });
          } catch (e) {
            const msg = e instanceof Error ? e.message : "erro";
            setLog((l) => [...l, `Análise falhou em ${chunk.length} entrada(s): ${msg}`]);
            if (msg.includes("402")) { setError("Créditos de IA esgotados — as entradas foram salvas sem análise."); break; }
          }
        }
      }

      setStatus(`Importação concluída: ${ids.length} entrada(s) salvas${skipped ? `, ${skipped} ignorada(s)` : ""}.`);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na importação.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="panel mb-6 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">Importar Diário Histórico</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecione vários arquivos (TXT, MD, RTF, DOCX). A data é detectada no nome ou no texto, os
            acontecimentos são extraídos e classificados automaticamente.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} disabled={busy}><X className="h-4 w-4" /></Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={withAi} onChange={(e) => setWithAi(e.target.checked)} disabled={busy} />
          Analisar com IA (humor, energia, eventos, tags)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={integrate} onChange={(e) => setIntegrate(e.target.checked)} disabled={busy || !withAi} />
          Alimentar Práticas, Segundo Cérebro e Biblioteca
        </label>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={(e) => run(e.target.files)}
      />

      <Button className="mt-4 font-semibold glow-neon" disabled={busy || !userId} onClick={() => inputRef.current?.click()}>
        <Upload className="h-4 w-4" /> {busy ? "Processando…" : "Escolher arquivos"}
      </Button>

      {status && <p className="mt-3 text-sm text-primary">{status}</p>}
      {error && <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {log.length > 0 && (
        <ul className="mt-3 max-h-32 space-y-1 overflow-auto text-xs text-muted-foreground">
          {log.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
      )}
    </section>
  );
}

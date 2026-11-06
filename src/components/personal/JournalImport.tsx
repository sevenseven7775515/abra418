import { useRef, useState } from "react";
import { Cloud, Upload, X } from "lucide-react";
import { fetchDriveFile, listNewDriveDiaries } from "@/lib/drive.functions";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ACCEPTED_EXTENSIONS, parseJournalFile } from "@/lib/journal-parse";
import { processJournalEntries } from "@/lib/journal-ai.functions";

type Props = { userId: string | null; onDone: () => void; onClose: () => void };

export function JournalImport({ userId, onDone, onClose }: Props) {
  const process = useServerFn(processJournalEntries);
  const listDrive = useServerFn(listNewDriveDiaries);
  const getDriveFile = useServerFn(fetchDriveFile);
  const inputRef = useRef<HTMLInputElement>(null);
  const withAi = true;
  const integrate = true;
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  async function fromDrive() {
    if (!userId || busy) return;
    setBusy(true); setError(null); setLog([]);
    try {
      setStatus("Procurando diários novos no Google Drive…");
      const { total, fresh } = await listDrive();
      if (!fresh.length) { setStatus(`Nada novo: ${total} arquivo(s) na pasta, todos já importados.`); setBusy(false); return; }
      const files: File[] = [];
      for (let i = 0; i < fresh.length; i += 1) {
        const f = fresh[i]!;
        setStatus(`Baixando do Drive… ${i + 1}/${fresh.length}`);
        try {
          const { base64 } = await getDriveFile({ data: { id: f.id, mimeType: f.mimeType } });
          const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
          const name = /\.(txt|md|markdown|rtf|docx)$/i.test(f.name) ? f.name : `${f.name}.txt`;
          files.push(new File([bytes], name, { lastModified: Date.parse(f.modifiedTime) || Date.now() }));
        } catch { setLog((l) => [...l, `Falhou ao baixar: ${f.name}`]); }
      }
      setBusy(false);
      await run(files);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao ler o Google Drive.");
      setBusy(false);
    }
  }

  async function run(files: FileList | File[] | null) {
    if (!files?.length || !userId) return;
    setBusy(true); setError(null);
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
          <h2 className="font-bold">Enviar diário</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha os arquivos (TXT, MD, RTF, DOCX). O sistema lê sozinho: humor, energia, contas, dívidas,
            onde melhorar e livros terminados.
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} disabled={busy}><X className="h-4 w-4" /></Button>
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
      <Button variant="outline" className="ml-2 mt-4" disabled={busy || !userId} onClick={fromDrive}>
        <Cloud className="h-4 w-4" /> Buscar no Google Drive
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

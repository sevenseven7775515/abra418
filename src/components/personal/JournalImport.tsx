import { useRef, useState } from "react";
import { Cloud, Upload, X } from "lucide-react";
import { fetchDriveFile, listNewDriveDiaries } from "@/lib/drive.functions";
import { useServerFn } from "@tanstack/react-start";
import { LAST_SYNC_KEY, importFiles, syncDrive, type SyncResult } from "@/lib/drive-sync";
import { Button } from "@/components/ui/button";
import { ACCEPTED_EXTENSIONS } from "@/lib/journal-parse";
import { processJournalEntries } from "@/lib/journal-ai.functions";

type Props = { userId: string | null; onDone: () => void; onClose: () => void };

export function JournalImport({ userId, onDone, onClose }: Props) {
  const process = useServerFn(processJournalEntries);
  const listDrive = useServerFn(listNewDriveDiaries);
  const getDriveFile = useServerFn(fetchDriveFile);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  async function fromDrive() {
    if (!userId || busy) return;
    setBusy(true); setError(null); setLog([]);
    try {
      const r = await syncDrive({ userId, listDrive, getFile: getDriveFile, process, onStatus: setStatus });
      localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
      finish(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao ler o Google Drive.");
    } finally { setBusy(false); }
  }

  function finish(r: SyncResult) {
    setLog(r.failed.map((f) => `Falhou: ${f}`));
    if (r.aiStopped) setError(r.aiStopped);
    setStatus(r.saved ? `Concluído: ${r.saved} diário(s) novo(s) salvos e lidos.` : `Nada novo: ${r.total} arquivo(s), todos já importados.`);
    if (r.saved) onDone();
  }

  async function run(files: FileList | null) {
    if (!files?.length || !userId) return;
    setBusy(true); setError(null); setLog([]);
    try { finish(await importFiles(Array.from(files), { userId, process, onStatus: setStatus })); }
    catch (e) { setError(e instanceof Error ? e.message : "Falha na importação."); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  return (
    <section className="panel mb-6 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">Enviar diário</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha os arquivos (TXT, MD, RTF, DOCX). O sistema lê sozinho: humor, energia, contas, dívidas,
            onde melhorar e livros terminados. O Google Drive é verificado sozinho a cada 6 horas.
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

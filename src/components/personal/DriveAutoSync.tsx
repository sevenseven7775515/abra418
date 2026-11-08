import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Cloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchDriveFile, listNewDriveDiaries } from "@/lib/drive.functions";
import { listUnanalyzedJournals, processJournalEntries } from "@/lib/journal-ai.functions";
import { useQueryClient } from "@tanstack/react-query";
import { importStatement, listNewStatements } from "@/lib/statements.functions";
import { LAST_SYNC_KEY, analyzePending, syncDrive } from "@/lib/drive-sync";

const INTERVAL_MS = 6 * 60 * 60 * 1000; // no máximo a cada 6 horas
let running = false; // evita duas sincronizações ao trocar de página

/** Sincroniza diários novos do Google Drive em segundo plano. Silencioso quando não há nada novo. */
export function DriveAutoSync() {
  const listDrive = useServerFn(listNewDriveDiaries);
  const getFile = useServerFn(fetchDriveFile);
  const process = useServerFn(processJournalEntries);
  const listPending = useServerFn(listUnanalyzedJournals);
  const listStatements = useServerFn(listNewStatements);
  const importOne = useServerFn(importStatement);
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const last = Number(localStorage.getItem(LAST_SYNC_KEY) ?? 0);
    if (running || Date.now() - last < INTERVAL_MS) return;
    running = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;
        // Extratos bancários (Nubank PF/PJ) → Financeiro
        try {
          const { fresh } = await listStatements();
          let n = 0;
          for (let i = 0; i < fresh.length; i += 1) {
            setMsg(`Lendo extratos bancários… ${i + 1}/${fresh.length}`);
            try { n += (await importOne({ data: fresh[i]! })).inserted; } catch { /* tenta na próxima */ }
          }
          if (n) qc.invalidateQueries({ queryKey: ["finance"] });
        } catch { /* Drive indisponível */ }
        const r = await syncDrive({ userId: data.user.id, listDrive, getFile, process, onStatus: (s) => setMsg(s) });
        const { ids } = r.aiStopped ? { ids: [] as string[] } : await listPending();
        const p = await analyzePending(ids, { process, onStatus: (s) => setMsg(s) });
        const pendingLeft = ids.length - p.analyzed;
        // só marca como sincronizado quando não sobrou nada pendente
        if (pendingLeft <= 0) localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
        if (!r.saved && !p.analyzed) { setMsg(null); return; }
        const stop = r.aiStopped ?? p.aiStopped;
        setMsg(`Diário atualizado: ${r.saved} novo(s) do Drive, ${p.analyzed} lido(s) pela IA.${stop ? ` ${stop}` : ""}`);
        setTimeout(() => setMsg(null), 8000);
      } catch {
        setMsg(null); // falha silenciosa; tenta de novo na próxima janela
      } finally { running = false; }
    })();
  }, [listDrive, getFile, process, listPending, listStatements, importOne, qc]);

  if (!msg) return null;
  return (
    <p className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
      <Cloud className="h-3.5 w-3.5 text-primary" /> {msg}
    </p>
  );
}

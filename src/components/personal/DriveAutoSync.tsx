import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Cloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchDriveFile, listNewDriveDiaries } from "@/lib/drive.functions";
import { processJournalEntries } from "@/lib/journal-ai.functions";
import { LAST_SYNC_KEY, syncDrive } from "@/lib/drive-sync";

const INTERVAL_MS = 6 * 60 * 60 * 1000; // no máximo a cada 6 horas
let running = false; // evita duas sincronizações ao trocar de página

/** Sincroniza diários novos do Google Drive em segundo plano. Silencioso quando não há nada novo. */
export function DriveAutoSync() {
  const listDrive = useServerFn(listNewDriveDiaries);
  const getFile = useServerFn(fetchDriveFile);
  const process = useServerFn(processJournalEntries);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const last = Number(localStorage.getItem(LAST_SYNC_KEY) ?? 0);
    if (running || Date.now() - last < INTERVAL_MS) return;
    running = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;
        const r = await syncDrive({ userId: data.user.id, listDrive, getFile, process, onStatus: (s) => setMsg(s) });
        localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
        if (!r.saved) { setMsg(null); return; }
        setMsg(`${r.saved} diário(s) novo(s) do Drive lidos.${r.aiStopped ? ` ${r.aiStopped}` : ""}`);
        setTimeout(() => setMsg(null), 8000);
      } catch {
        setMsg(null); // falha silenciosa; tenta de novo na próxima janela
      } finally { running = false; }
    })();
  }, [listDrive, getFile, process]);

  if (!msg) return null;
  return (
    <p className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
      <Cloud className="h-3.5 w-3.5 text-primary" /> {msg}
    </p>
  );
}

// Sincronização Drive → Diário (roda no navegador). Só importa arquivos novos; nunca apaga nada.
import { supabase } from "@/integrations/supabase/client";
import { parseJournalFile } from "@/lib/journal-parse";

type DFile = { id: string; name: string; mimeType: string; modifiedTime: string };
export type SyncDeps = {
  userId: string;
  listDrive: () => Promise<{ total: number; fresh: DFile[] }>;
  getFile: (a: { data: { id: string; mimeType: string } }) => Promise<{ base64: string }>;
  process: (a: { data: { ids: string[]; integrate: boolean } }) => Promise<unknown>;
  onStatus?: (s: string) => void;
};
export type SyncResult = { total: number; saved: number; failed: string[]; aiStopped?: string | undefined };

export const LAST_SYNC_KEY = "personal.drive.lastSync";

/** Lê com IA diários já salvos mas ainda não analisados (retomada após interrupção). */
export async function analyzePending(
  ids: string[], d: Pick<SyncDeps, "process" | "onStatus">, max = 40,
): Promise<{ analyzed: number; aiStopped?: string | undefined }> {
  const todo = ids.slice(0, max);
  let analyzed = 0;
  for (let i = 0; i < todo.length; i += 5) {
    d.onStatus?.(`Lendo diários pendentes… ${Math.min(i + 5, todo.length)}/${todo.length}`);
    try { await d.process({ data: { ids: todo.slice(i, i + 5), integrate: true } }); analyzed += todo.slice(i, i + 5).length; }
    catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("402")) return { analyzed, aiStopped: "Créditos de IA esgotados." };
      if (msg.includes("429")) return { analyzed, aiStopped: "Limite de IA atingido — continua mais tarde." };
    }
  }
  return { analyzed };
}

export async function importFiles(files: File[], d: Omit<SyncDeps, "listDrive" | "getFile">): Promise<SyncResult> {
  const ids: string[] = [];
  const failed: string[] = [];
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i]!;
    d.onStatus?.(`Lendo arquivos… ${i + 1}/${files.length}`);
    try {
      const parsed = await parseJournalFile(file);
      if (!parsed.content.trim()) continue;
      const { data, error } = await supabase.from("journal_entries").insert({
        user_id: d.userId,
        entry_date: parsed.date ?? new Date(file.lastModified).toISOString().slice(0, 10),
        title: parsed.title,
        content: parsed.content.slice(0, 60000),
        source_file: parsed.fileName,
        imported: true,
      }).select("id").single();
      if (error) throw error;
      ids.push(data.id);
    } catch { failed.push(file.name); }
  }
  let aiStopped: string | undefined;
  for (let i = 0; i < ids.length; i += 5) {
    d.onStatus?.(`Analisando com IA… ${Math.min(i + 5, ids.length)}/${ids.length}`);
    try { await d.process({ data: { ids: ids.slice(i, i + 5), integrate: true } }); }
    catch (e) {
      const msg = e instanceof Error ? e.message : "erro";
      if (msg.includes("402") || msg.includes("429")) { aiStopped = msg.includes("402") ? "Créditos de IA esgotados — diários salvos sem análise." : "Limite de IA atingido — tente mais tarde."; break; }
      failed.push(`análise de ${ids.slice(i, i + 5).length} diário(s)`);
    }
  }
  return { total: files.length, saved: ids.length, failed, aiStopped };
}

export async function syncDrive(d: SyncDeps): Promise<SyncResult> {
  d.onStatus?.("Procurando diários novos no Google Drive…");
  const { total, fresh } = await d.listDrive();
  if (!fresh.length) return { total, saved: 0, failed: [] };
  const files: File[] = [];
  const failed: string[] = [];
  for (let i = 0; i < fresh.length; i += 1) {
    const f = fresh[i]!;
    d.onStatus?.(`Baixando do Drive… ${i + 1}/${fresh.length}`);
    try {
      const { base64 } = await d.getFile({ data: { id: f.id, mimeType: f.mimeType } });
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const name = /\.(txt|md|markdown|rtf|docx)$/i.test(f.name) ? f.name : `${f.name}.txt`;
      files.push(new File([bytes], name, { lastModified: Date.parse(f.modifiedTime) || Date.now() }));
    } catch { failed.push(f.name); }
  }
  const r = await importFiles(files, d);
  return { ...r, total, failed: [...failed, ...r.failed] };
}

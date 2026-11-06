import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Pasta de diários informada pelo usuário (Google Drive). Somente leitura.
export const DIARY_FOLDER_ID = "13g_n1Jq8VJxqZ3YHTos3GwuMrGi2grvp";
const GATEWAY = "https://connector-gateway.lovable.dev/google_drive/drive/v3";

const FOLDER = "application/vnd.google-apps.folder";
const GDOC = "application/vnd.google-apps.document";
const OK_EXT = /\.(txt|md|markdown|rtf|docx)$/i;

function headers() {
  const a = process.env.LOVABLE_API_KEY;
  const b = process.env.GOOGLE_DRIVE_API_KEY;
  if (!a || !b) throw new Error("Google Drive não está conectado.");
  return { Authorization: `Bearer ${a}`, "X-Connection-Api-Key": b };
}

async function gw(path: string) {
  const r = await fetch(`${GATEWAY}${path}`, { headers: headers() });
  if (!r.ok) throw new Error(`Google Drive [${r.status}]: ${await r.text()}`);
  return r;
}

type DFile = { id: string; name: string; mimeType: string; modifiedTime: string; path: string };

async function listRecursive(folderId: string, path: string, out: DFile[], depth = 0) {
  if (depth > 5) return;
  let pageToken = "";
  do {
    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const r = await gw(`/files?q=${q}&pageSize=1000&fields=files(id,name,mimeType,modifiedTime),nextPageToken&supportsAllDrives=true&includeItemsFromAllDrives=true${pageToken ? `&pageToken=${pageToken}` : ""}`);
    const j = (await r.json()) as { files: Omit<DFile, "path">[]; nextPageToken?: string };
    for (const f of j.files) {
      if (f.mimeType === FOLDER) await listRecursive(f.id, `${path}${f.name}/`, out, depth + 1);
      else if (f.mimeType === GDOC || OK_EXT.test(f.name)) out.push({ ...f, path });
    }
    pageToken = j.nextPageToken ?? "";
  } while (pageToken);
}

/** Lista arquivos de diário na pasta do Drive que ainda não foram importados. */
export const listNewDriveDiaries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const all: DFile[] = [];
    await listRecursive(DIARY_FOLDER_ID, "", all);
    const { data, error } = await context.supabase.from("journal_entries").select("source_file").not("source_file", "is", null);
    if (error) throw new Error(error.message);
    const seen = new Set((data ?? []).map((d) => String(d.source_file).toLowerCase().replace(/\.(txt|md|markdown|rtf|docx)$/i, "")));
    const fresh = all.filter((f) => !seen.has(f.name.toLowerCase().replace(/\.(txt|md|markdown|rtf|docx)$/i, "")));
    return { total: all.length, fresh };
  });

/** Baixa um arquivo (Google Docs exportado como texto). Retorna base64. */
export const fetchDriveFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().min(5).max(200), mimeType: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    const path = data.mimeType === GDOC
      ? `/files/${data.id}/export?mimeType=text/plain`
      : `/files/${data.id}?alt=media&supportsAllDrives=true`;
    const buf = new Uint8Array(await (await gw(path)).arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { base64: btoa(bin) };
  });

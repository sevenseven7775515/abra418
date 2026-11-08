import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { parseNubankStatement, txRefs } from "@/lib/bank-statement";

// Pasta de extratos (Google Drive). Somente leitura: subpastas NUBANK/PF e NUBANK/PJ.
export const STATEMENTS_FOLDER_ID = "15XjstcyK7Pb_A0nzIL8eILcPkzA_1pjh";
const GATEWAY = "https://connector-gateway.lovable.dev/google_drive/drive/v3";
const FOLDER = "application/vnd.google-apps.folder";

function headers() {
  const a = process.env["LOVABLE_API_KEY"];
  const b = process.env["GOOGLE_DRIVE_API_KEY"];
  if (!a || !b) throw new Error("Google Drive não está conectado.");
  return { Authorization: `Bearer ${a}`, "X-Connection-Api-Key": b };
}
async function gw(path: string) {
  const r = await fetch(`${GATEWAY}${path}`, { headers: headers() });
  if (!r.ok) throw new Error(`Google Drive [${r.status}]: ${await r.text()}`);
  return r;
}

type SFile = { id: string; name: string; account: "pf" | "pj" };

async function walk(folderId: string, path: string, out: SFile[], depth = 0) {
  if (depth > 4) return;
  let pageToken = "";
  do {
    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const r = await gw(`/files?q=${q}&pageSize=1000&fields=files(id,name,mimeType),nextPageToken${pageToken ? `&pageToken=${pageToken}` : ""}`);
    const j = (await r.json()) as { files: { id: string; name: string; mimeType: string }[]; nextPageToken?: string };
    for (const f of j.files) {
      if (f.mimeType === FOLDER) await walk(f.id, `${path}${f.name}/`, out, depth + 1);
      else if (/\.pdf$/i.test(f.name)) out.push({ id: f.id, name: f.name, account: /(^|\/)PJ\//i.test(path) ? "pj" : "pf" });
    }
    pageToken = j.nextPageToken ?? "";
  } while (pageToken);
}

/** Lista extratos PDF ainda não importados. */
export const listNewStatements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const all: SFile[] = [];
    await walk(STATEMENTS_FOLDER_ID, "", all);
    const { data, error } = await context.supabase.from("finance_transactions").select("source_file").not("source_file", "is", null).limit(10000);
    if (error) throw new Error(error.message);
    const seen = new Set((data ?? []).map((d) => d.source_file));
    return { total: all.length, fresh: all.filter((f) => !seen.has(f.name)) };
  });

/** Baixa, lê e grava os lançamentos de um extrato. Não duplica (chave única por lançamento). */
export const importStatement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().min(5).max(200), name: z.string().max(300), account: z.enum(["pf", "pj"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const buf = new Uint8Array(await (await gw(`/files/${data.id}?alt=media`)).arrayBuffer());
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(buf);
    const { text } = await extractText(pdf, { mergePages: true });
    const txs = parseNubankStatement(String(text));
    if (!txs.length) return { inserted: 0, parsed: 0 };
    const refs = txRefs(data.account, txs);
    const rows = txs.map((t, i) => ({
      user_id: context.userId,
      kind: t.kind,
      description: t.description,
      category: data.account === "pj" && t.category !== "investimentos" ? "negocios" : t.category,
      amount: t.amount,
      tx_date: t.date,
      recurrence: "extrato",
      paid: true,
      scope: data.account === "pj" ? "empresa" : "pessoal",
      source_ref: refs[i],
      source_file: data.name,
    }));
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const { data: ins, error } = await context.supabase.from("finance_transactions")
        .upsert(rows.slice(i, i + 500), { onConflict: "user_id,source_ref", ignoreDuplicates: true }).select("id");
      if (error) throw new Error(error.message);
      inserted += ins?.length ?? 0;
    }
    return { inserted, parsed: txs.length };
  });

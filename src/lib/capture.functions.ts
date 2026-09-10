import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { buildProposal, type CaptureProposal } from "./capture-parse";

const today = () => new Date().toISOString().slice(0, 10);

const InterpretInput = z.object({
  text: z.string().trim().min(3).max(60_000),
  persist: z.boolean().default(true),
});

export type CaptureConflict = { tipo: string; mensagem: string };

export type InterpretResult = {
  captureId: string | null;
  proposal: CaptureProposal;
  conflicts: CaptureConflict[];
  duplicateEvents: number;
  duplicatePractices: number;
};

/** Interpreta o texto colado de forma determinística. Nada é gravado nos módulos. */
export const interpretCapture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => InterpretInput.parse(i))
  .handler(async ({ data, context }): Promise<InterpretResult> => {
    const { supabase, userId } = context;
    const proposal = buildProposal(data.text, today());
    const conflicts: CaptureConflict[] = [];

    const { data: existingJournal } = await supabase
      .from("journal_entries")
      .select("id, title, source_file")
      .eq("entry_date", proposal.date!)
      .maybeSingle();
    if (existingJournal) {
      conflicts.push({
        tipo: "diario",
        mensagem: `Já existe um diário em ${proposal.date}. O conteúdo será anexado ao registro existente, sem substituir o original.`,
      });
    }

    const { data: existingEvents } = await supabase
      .from("timeline_events")
      .select("description, event_time")
      .eq("event_date", proposal.date!)
      .limit(500);
    const eventKeys = new Set((existingEvents ?? []).map((e) => `${e.event_time ?? ""}|${e.description}`));
    const duplicateEvents = proposal.events.filter((e) => eventKeys.has(`${e.time ?? ""}|${e.description}`)).length;

    const { data: existingPractices } = await supabase
      .from("practice_history")
      .select("name, practice_time")
      .eq("practice_date", proposal.date!)
      .limit(200);
    const practiceKeys = new Set((existingPractices ?? []).map((p) => `${p.practice_time ?? ""}|${p.name}`));
    const duplicatePractices = proposal.practices.filter((p) => practiceKeys.has(`${p.time ?? ""}|${p.name}`)).length;

    if (duplicateEvents) conflicts.push({ tipo: "eventos", mensagem: `${duplicateEvents} acontecimento(s) já existem nessa data e serão ignorados.` });
    if (duplicatePractices) conflicts.push({ tipo: "praticas", mensagem: `${duplicatePractices} prática(s) já registradas nessa data serão ignoradas.` });
    if (proposal.dateOrigin === "hoje") conflicts.push({ tipo: "data", mensagem: "Nenhuma data encontrada no texto — usando a data de hoje. Ajuste se necessário." });

    let captureId: string | null = null;
    if (data.persist) {
      const { data: row, error } = await supabase
        .from("captures")
        .insert({
          user_id: userId,
          raw_text: data.text,
          source: proposal.source,
          status: "novo",
          parsed: proposal as never,
        })
        .select("id")
        .single();
      if (error) throw error;
      captureId = row.id;
    }

    return { captureId, proposal, conflicts, duplicateEvents, duplicatePractices };
  });

const CommitInput = z.object({
  captureId: z.string().uuid().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  saveJournal: z.boolean(),
  journal: z.object({
    title: z.string().max(300),
    content: z.string().max(60_000),
    summary: z.string().max(4000),
    mainActivities: z.string().max(8000),
    achievements: z.string().max(4000).nullable(),
    pending: z.string().max(4000).nullable(),
    insights: z.string().max(4000).nullable(),
  }),
  events: z.array(z.object({ time: z.string().nullable(), description: z.string().max(500), category: z.string().max(40) })).max(500),
  practices: z.array(z.object({ name: z.string().max(120), category: z.string().max(40), time: z.string().nullable(), description: z.string().max(500) })).max(200),
  dealEvent: z
    .object({ dealId: z.string().uuid(), content: z.string().min(2).max(4000), kind: z.string().max(40).default("nota") })
    .nullable()
    .default(null),
});

/** Grava somente o que o usuário confirmou, com deduplicação segura. */
export const commitCapture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CommitInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const result = { journalId: null as string | null, events: 0, practices: 0, dealEvent: false, appended: false };

    let journalId: string | null = null;
    if (data.saveJournal) {
      const { data: existing } = await supabase
        .from("journal_entries")
        .select("id, content")
        .eq("entry_date", data.date)
        .maybeSingle();

      if (existing) {
        const merged = `${existing.content ?? ""}\n\n--- captura ${new Date().toISOString().slice(0, 16).replace("T", " ")} ---\n${data.journal.content}`.trim();
        const { error } = await supabase.from("journal_entries").update({ content: merged }).eq("id", existing.id);
        if (error) throw error;
        journalId = existing.id;
        result.appended = true;
      } else {
        const { data: row, error } = await supabase
          .from("journal_entries")
          .insert({
            user_id: userId,
            entry_date: data.date,
            title: data.journal.title,
            content: data.journal.content,
            summary: data.journal.summary,
            main_activities: data.journal.mainActivities,
            achievements: data.journal.achievements,
            pending: data.journal.pending,
            insights: data.journal.insights,
            imported: false,
            processed: true,
            reorganized: true,
            source_file: "captura",
          })
          .select("id")
          .single();
        if (error) throw error;
        journalId = row.id;
      }
      result.journalId = journalId;
    }

    if (data.events.length) {
      const { data: existing } = await supabase
        .from("timeline_events")
        .select("description, event_time")
        .eq("event_date", data.date)
        .limit(1000);
      const keys = new Set((existing ?? []).map((e) => `${e.event_time ?? ""}|${e.description}`));
      const rows = data.events
        .filter((e) => !keys.has(`${e.time ?? ""}|${e.description}`))
        .map((e) => ({
          user_id: userId,
          journal_id: journalId,
          event_date: data.date,
          event_time: e.time,
          description: e.description,
          category: e.category,
          source: "captura",
        }));
      if (rows.length) {
        const { error } = await supabase.from("timeline_events").insert(rows);
        if (error) throw error;
        result.events = rows.length;
      }
    }

    if (data.practices.length) {
      const { data: existing } = await supabase
        .from("practice_history")
        .select("name, practice_time")
        .eq("practice_date", data.date)
        .limit(500);
      const keys = new Set((existing ?? []).map((p) => `${p.practice_time ?? ""}|${p.name}`));
      const rows = data.practices
        .filter((p) => !keys.has(`${p.time ?? ""}|${p.name}`))
        .map((p) => ({
          user_id: userId,
          journal_id: journalId,
          practice_date: data.date,
          practice_time: p.time,
          name: p.name,
          category: p.category,
          description: p.description,
          source_file: "captura",
        }));
      if (rows.length) {
        const { error } = await supabase.from("practice_history").insert(rows);
        if (error) throw error;
        result.practices = rows.length;
      }
    }

    if (data.dealEvent) {
      const { error } = await supabase.from("deal_events").insert({
        user_id: userId,
        deal_id: data.dealEvent.dealId,
        kind: data.dealEvent.kind,
        content: data.dealEvent.content,
      });
      if (error) throw error;
      await supabase.from("deals").update({ last_touch_at: new Date().toISOString() }).eq("id", data.dealEvent.dealId);
      result.dealEvent = true;
    }

    if (data.captureId) {
      await supabase
        .from("captures")
        .update({ status: "processado", linked_journal_id: journalId, linked_deal_id: data.dealEvent?.dealId ?? null })
        .eq("id", data.captureId);
    }

    return result;
  });

export const discardCapture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("captures").update({ status: "descartado" }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listPendingCaptures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("captures")
      .select("id, raw_text, source, captured_at, status")
      .eq("status", "novo")
      .order("captured_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return data;
  });

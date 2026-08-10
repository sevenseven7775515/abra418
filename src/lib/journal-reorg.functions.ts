import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { structureDay, resolveDate } from "@/lib/journal-reorg";
import { z } from "zod";

const ListInput = z.object({ onlyPending: z.boolean().default(true) });

export const listReorgTargets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListInput.parse(input))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("journal_entries")
      .select("id")
      .eq("imported", true)
      .order("entry_date", { ascending: true });
    if (data.onlyPending) query = query.eq("reorganized", false);
    const { data: rows, error } = await query;
    if (error) throw error;
    return { ids: (rows ?? []).map((r) => r.id) };
  });

const ReorgInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(25),
});

export const reorganizeJournalEntries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ReorgInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: entries, error } = await supabase
      .from("journal_entries")
      .select("id, entry_date, title, content, source_file")
      .in("id", data.ids);
    if (error) throw error;
    if (!entries?.length) return { processed: 0, events: 0, practices: 0, needsDate: [] as string[] };

    // backup (uma vez por entrada)
    const { data: existingBackups } = await supabase
      .from("journal_backups")
      .select("journal_id")
      .in("journal_id", data.ids);
    const backedUp = new Set((existingBackups ?? []).map((b) => b.journal_id));
    const backups = entries
      .filter((e) => !backedUp.has(e.id))
      .map((e) => ({
        user_id: userId,
        journal_id: e.id,
        source_file: e.source_file,
        entry_date: e.entry_date,
        title: e.title,
        raw_content: e.content,
      }));
    if (backups.length) {
      const { error: bErr } = await supabase.from("journal_backups").insert(backups);
      if (bErr) throw bErr;
    }

    const needsDate: string[] = [];
    let eventCount = 0;
    let practiceCount = 0;

    // catálogo de práticas existente (para vincular/criar em /personal/practices)
    const { data: existingPractices } = await supabase.from("practices").select("id, name");
    const practiceMap = new Map<string, string>((existingPractices ?? []).map((p) => [p.name.toLowerCase(), p.id]));

    for (const e of entries) {
      const resolved = resolveDate(e.source_file, e.content ?? "");
      if (resolved.origin === "nenhum") needsDate.push(e.source_file ?? e.id);
      const date = resolved.date ?? e.entry_date;

      const s = structureDay(e.content ?? "", e.source_file, date);

      await supabase.from("timeline_events").delete().eq("journal_id", e.id);
      await supabase.from("practice_history").delete().eq("journal_id", e.id);

      if (s.events.length) {
        const rows = s.events.slice(0, 300).map((ev) => ({
          user_id: userId,
          journal_id: e.id,
          event_date: date,
          event_time: ev.time,
          description: ev.description,
          category: ev.category,
          source: "diario",
          source_file: e.source_file,
        }));
        const { error: evErr } = await supabase.from("timeline_events").insert(rows);
        if (evErr) throw evErr;
        eventCount += rows.length;
      }

      if (s.practices.length) {
        for (const p of s.practices) {
          let practiceId = practiceMap.get(p.name.toLowerCase()) ?? null;
          if (!practiceId) {
            const { data: created } = await supabase
              .from("practices")
              .insert({ user_id: userId, name: p.name, category: p.category, frequency: "diaria", active: true })
              .select("id")
              .single();
            if (created) {
              practiceId = created.id;
              practiceMap.set(p.name.toLowerCase(), created.id);
            }
          }
          const { error: phErr } = await supabase.from("practice_history").insert({
            user_id: userId,
            journal_id: e.id,
            practice_id: practiceId,
            practice_date: date,
            practice_time: p.time,
            name: p.name,
            category: p.category,
            description: p.description,
            source_file: e.source_file,
          });
          if (phErr) throw phErr;
          practiceCount += 1;
          if (practiceId) {
            const { data: log } = await supabase
              .from("practice_logs")
              .select("id")
              .eq("practice_id", practiceId)
              .eq("log_date", date)
              .maybeSingle();
            if (!log) {
              await supabase.from("practice_logs").insert({ user_id: userId, practice_id: practiceId, log_date: date });
            }
          }
        }
      }

      const { error: upErr } = await supabase
        .from("journal_entries")
        .update({
          entry_date: date,
          title: s.title,
          content: s.content.slice(0, 60000),
          summary: s.summary,
          main_activities: s.mainActivities || null,
          achievements: s.achievements,
          pending: s.pending,
          insights: s.insights,
          reorganized: true,
          reorganized_at: new Date().toISOString(),
        })
        .eq("id", e.id);
      if (upErr) throw upErr;
    }

    return { processed: entries.length, events: eventCount, practices: practiceCount, needsDate };
  });

const RestoreInput = z.object({ ids: z.array(z.string().uuid()).min(1).max(50) });

export const restoreJournalBackups = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RestoreInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: backups, error } = await supabase
      .from("journal_backups")
      .select("journal_id, entry_date, title, raw_content")
      .in("journal_id", data.ids);
    if (error) throw error;

    for (const b of backups ?? []) {
      await supabase
        .from("journal_entries")
        .update({
          ...(b.entry_date ? { entry_date: b.entry_date } : {}),
          title: b.title,
          content: b.raw_content,
          reorganized: false,
          reorganized_at: null,
        })
        .eq("id", b.journal_id);
      await supabase.from("timeline_events").delete().eq("journal_id", b.journal_id);
      await supabase.from("practice_history").delete().eq("journal_id", b.journal_id);
    }
    return { restored: (backups ?? []).length };
  });

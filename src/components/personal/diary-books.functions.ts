import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { deriveDiaryBooks } from "./diary-books";

export const getDiaryBooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // Paginate all historical sources; no AI reprocessing and no writes.
    const loadBooks = async () => {
      const all = [];
      for (let start = 0; ; start += 500) {
        const { data, error } = await supabase.from("books").select("id,title,author,status,learnings").eq("user_id", userId).order("id").range(start, start + 499);
        if (error) throw error;
        all.push(...(data ?? [])); if (!data || data.length < 500) return all;
      }
    };
    const loadJournals = async () => {
      const all = [];
      for (let start = 0; ; start += 100) {
        const { data, error } = await supabase.from("journal_entries").select("id,entry_date,content,highlights,achievements").eq("user_id", userId).order("id").range(start, start + 99);
        if (error) throw error;
        all.push(...(data ?? [])); if (!data || data.length < 100) return all;
      }
    };
    const loadMentions = async () => {
      const all = [];
      for (let start = 0; ; start += 500) {
        const { data, error } = await supabase.from("journal_insights").select("journal_id,books").eq("user_id", userId).order("id").range(start, start + 499);
        if (error) throw error;
        all.push(...(data ?? [])); if (!data || data.length < 500) return all;
      }
    };
    const loadSignals = async () => {
      const all = [];
      for (let start = 0; ; start += 500) {
        const { data, error } = await supabase.from("journal_signals").select("journal_id,description,entry_date").eq("user_id", userId).eq("kind", "livro").order("id").range(start, start + 499);
        if (error) throw error;
        all.push(...(data ?? [])); if (!data || data.length < 500) return all;
      }
    };
    const [books, journals, mentions, signals] = await Promise.all([loadBooks(), loadJournals(), loadMentions(), loadSignals()]);
    return deriveDiaryBooks(books, journals, mentions, signals);
  });
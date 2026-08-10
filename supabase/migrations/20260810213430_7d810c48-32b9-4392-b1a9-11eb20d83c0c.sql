CREATE TABLE public.journal_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journal_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  source_file text,
  entry_date date,
  title text,
  raw_content text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_backups TO authenticated;
GRANT ALL ON public.journal_backups TO service_role;
ALTER TABLE public.journal_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own journal_backups" ON public.journal_backups FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX journal_backups_journal_idx ON public.journal_backups(journal_id);

CREATE TABLE public.timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journal_id uuid REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  event_date date NOT NULL,
  event_time text,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'rotina',
  source text NOT NULL DEFAULT 'diario',
  source_file text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timeline_events TO authenticated;
GRANT ALL ON public.timeline_events TO service_role;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own timeline_events" ON public.timeline_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX timeline_events_date_idx ON public.timeline_events(user_id, event_date);
CREATE INDEX timeline_events_journal_idx ON public.timeline_events(journal_id);

CREATE TABLE public.practice_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journal_id uuid REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  practice_id uuid REFERENCES public.practices(id) ON DELETE SET NULL,
  practice_date date NOT NULL,
  practice_time text,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'pratica',
  description text,
  source_file text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_history TO authenticated;
GRANT ALL ON public.practice_history TO service_role;
ALTER TABLE public.practice_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own practice_history" ON public.practice_history FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX practice_history_date_idx ON public.practice_history(user_id, practice_date);
CREATE INDEX practice_history_journal_idx ON public.practice_history(journal_id);

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS main_activities text,
  ADD COLUMN IF NOT EXISTS achievements text,
  ADD COLUMN IF NOT EXISTS pending text,
  ADD COLUMN IF NOT EXISTS insights text,
  ADD COLUMN IF NOT EXISTS reorganized boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reorganized_at timestamptz;
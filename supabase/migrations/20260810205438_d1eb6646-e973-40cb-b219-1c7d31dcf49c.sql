ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS source_file text,
  ADD COLUMN IF NOT EXISTS imported boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS processed boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.journal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journal_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  event_time text,
  category text NOT NULL DEFAULT 'geral',
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_events TO authenticated;
GRANT ALL ON public.journal_events TO service_role;
ALTER TABLE public.journal_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own journal_events" ON public.journal_events FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS journal_events_journal_idx ON public.journal_events(journal_id);

CREATE TABLE IF NOT EXISTS public.journal_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journal_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  mood text,
  energy integer,
  habits text[] NOT NULL DEFAULT '{}',
  practices text[] NOT NULL DEFAULT '{}',
  learnings text,
  tags text[] NOT NULL DEFAULT '{}',
  patterns text,
  books text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_insights TO authenticated;
GRANT ALL ON public.journal_insights TO service_role;
ALTER TABLE public.journal_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own journal_insights" ON public.journal_insights FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS journal_insights_journal_idx ON public.journal_insights(journal_id);
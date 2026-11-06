CREATE TABLE IF NOT EXISTS public.journal_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  journal_id uuid NOT NULL,
  entry_date date NOT NULL,
  kind text NOT NULL,
  description text NOT NULL,
  amount numeric,
  due_date date,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_signals TO authenticated;
GRANT ALL ON public.journal_signals TO service_role;
ALTER TABLE public.journal_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own signals" ON public.journal_signals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS journal_signals_user_kind ON public.journal_signals(user_id, kind, entry_date DESC);
CREATE INDEX IF NOT EXISTS journal_signals_journal ON public.journal_signals(journal_id);
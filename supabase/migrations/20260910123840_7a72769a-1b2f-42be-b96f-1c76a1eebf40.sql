-- CAPTURES
CREATE TABLE IF NOT EXISTS public.captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_text text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  captured_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'novo',
  parsed jsonb NOT NULL DEFAULT '{}'::jsonb,
  linked_journal_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  linked_deal_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.captures TO authenticated;
GRANT ALL ON public.captures TO service_role;
ALTER TABLE public.captures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own captures" ON public.captures;
CREATE POLICY "own captures" ON public.captures FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS captures_user_status_idx ON public.captures (user_id, status, captured_at DESC);
DROP TRIGGER IF EXISTS captures_updated_at ON public.captures;
CREATE TRIGGER captures_updated_at BEFORE UPDATE ON public.captures FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CONTACTS
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  channel text,
  handle text,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  notes text,
  last_touch_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own contacts" ON public.contacts;
CREATE POLICY "own contacts" ON public.contacts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS contacts_user_touch_idx ON public.contacts (user_id, last_touch_at DESC NULLS LAST);
DROP TRIGGER IF EXISTS contacts_updated_at ON public.contacts;
CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- DEALS
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  stage text NOT NULL DEFAULT 'contato',
  value numeric,
  probability integer,
  expected_close date,
  source text,
  next_step text,
  next_step_date date,
  last_touch_at timestamptz,
  lost_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;
GRANT ALL ON public.deals TO service_role;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own deals" ON public.deals;
CREATE POLICY "own deals" ON public.deals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS deals_user_stage_idx ON public.deals (user_id, stage, next_step_date NULLS FIRST);
DROP TRIGGER IF EXISTS deals_updated_at ON public.deals;
CREATE TRIGGER deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- DEAL EVENTS
CREATE TABLE IF NOT EXISTS public.deal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'nota',
  content text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_events TO authenticated;
GRANT ALL ON public.deal_events TO service_role;
ALTER TABLE public.deal_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own deal events" ON public.deal_events;
CREATE POLICY "own deal events" ON public.deal_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS deal_events_deal_idx ON public.deal_events (deal_id, occurred_at DESC);

-- HERMES BRIEFS
CREATE TABLE IF NOT EXISTS public.hermes_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'diario',
  ref_date date NOT NULL DEFAULT CURRENT_DATE,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hermes_briefs TO authenticated;
GRANT ALL ON public.hermes_briefs TO service_role;
ALTER TABLE public.hermes_briefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own hermes briefs" ON public.hermes_briefs;
CREATE POLICY "own hermes briefs" ON public.hermes_briefs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS hermes_briefs_user_kind_idx ON public.hermes_briefs (user_id, kind, ref_date DESC);
DROP TRIGGER IF EXISTS hermes_briefs_updated_at ON public.hermes_briefs;
CREATE TRIGGER hermes_briefs_updated_at BEFORE UPDATE ON public.hermes_briefs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- HERMES SUGGESTIONS
CREATE TABLE IF NOT EXISTS public.hermes_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brief_id uuid REFERENCES public.hermes_briefs(id) ON DELETE SET NULL,
  title text NOT NULL,
  rationale text,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  domain text NOT NULL DEFAULT 'pessoal',
  score numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  acted_at timestamptz,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hermes_suggestions TO authenticated;
GRANT ALL ON public.hermes_suggestions TO service_role;
ALTER TABLE public.hermes_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own hermes suggestions" ON public.hermes_suggestions;
CREATE POLICY "own hermes suggestions" ON public.hermes_suggestions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS hermes_suggestions_user_status_idx ON public.hermes_suggestions (user_id, status, created_at DESC);
DROP TRIGGER IF EXISTS hermes_suggestions_updated_at ON public.hermes_suggestions;
CREATE TRIGGER hermes_suggestions_updated_at BEFORE UPDATE ON public.hermes_suggestions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TASKS traceability (optional columns only)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS origin text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS origin_id uuid;

-- Helpful indexes on existing history tables (additive)
CREATE INDEX IF NOT EXISTS journal_entries_user_date_idx ON public.journal_entries (user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS timeline_events_user_date_idx ON public.timeline_events (user_id, event_date DESC);
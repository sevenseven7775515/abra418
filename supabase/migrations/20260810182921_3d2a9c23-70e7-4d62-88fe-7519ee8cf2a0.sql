-- AUTHORS
CREATE TABLE public.thelema_authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thelema_authors TO authenticated;
GRANT ALL ON public.thelema_authors TO service_role;
ALTER TABLE public.thelema_authors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own thelema_authors" ON public.thelema_authors FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER thelema_authors_updated_at BEFORE UPDATE ON public.thelema_authors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TEXTS
CREATE TABLE public.thelema_texts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_original text NOT NULL,
  title_pt text,
  original_language text NOT NULL DEFAULT 'Inglês',
  author text NOT NULL DEFAULT 'Aleister Crowley',
  source_url text,
  status text NOT NULL DEFAULT 'nao_iniciado',
  favorite boolean NOT NULL DEFAULT false,
  notes text,
  study_minutes integer NOT NULL DEFAULT 0,
  last_read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thelema_texts TO authenticated;
GRANT ALL ON public.thelema_texts TO service_role;
ALTER TABLE public.thelema_texts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own thelema_texts" ON public.thelema_texts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER thelema_texts_updated_at BEFORE UPDATE ON public.thelema_texts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRANSLATIONS
CREATE TABLE public.thelema_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text_id uuid NOT NULL REFERENCES public.thelema_texts(id) ON DELETE CASCADE,
  title_pt text NOT NULL,
  translator text,
  publisher text,
  year integer,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thelema_translations TO authenticated;
GRANT ALL ON public.thelema_translations TO service_role;
ALTER TABLE public.thelema_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own thelema_translations" ON public.thelema_translations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER thelema_translations_updated_at BEFORE UPDATE ON public.thelema_translations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- NOTES
CREATE TABLE public.thelema_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text_id uuid NOT NULL REFERENCES public.thelema_texts(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thelema_notes TO authenticated;
GRANT ALL ON public.thelema_notes TO service_role;
ALTER TABLE public.thelema_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own thelema_notes" ON public.thelema_notes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER thelema_notes_updated_at BEFORE UPDATE ON public.thelema_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- JOURNAL
CREATE TABLE public.thelema_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT current_date,
  mental_state text,
  practice text,
  study text,
  results text,
  experiences text,
  dreams text,
  symbols text,
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thelema_journal TO authenticated;
GRANT ALL ON public.thelema_journal TO service_role;
ALTER TABLE public.thelema_journal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own thelema_journal" ON public.thelema_journal FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER thelema_journal_updated_at BEFORE UPDATE ON public.thelema_journal FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ASTRONOMICAL EVENTS
CREATE TABLE public.astronomical_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'evento',
  event_date date NOT NULL,
  end_date date,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.astronomical_events TO authenticated;
GRANT ALL ON public.astronomical_events TO service_role;
ALTER TABLE public.astronomical_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own astronomical_events" ON public.astronomical_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER astronomical_events_updated_at BEFORE UPDATE ON public.astronomical_events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SELF PROFILE
CREATE TABLE public.self_profile (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  headline text,
  mission text,
  vision text,
  principles text,
  rules text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.self_profile TO authenticated;
GRANT ALL ON public.self_profile TO service_role;
ALTER TABLE public.self_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own self_profile" ON public.self_profile FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER self_profile_updated_at BEFORE UPDATE ON public.self_profile FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ENNEAGRAM
CREATE TABLE public.enneagram_profile (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  main_type text,
  wing text,
  instinct text,
  development_level text,
  strengths text,
  challenges text,
  fears text,
  desires text,
  virtues text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enneagram_profile TO authenticated;
GRANT ALL ON public.enneagram_profile TO service_role;
ALTER TABLE public.enneagram_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own enneagram_profile" ON public.enneagram_profile FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER enneagram_profile_updated_at BEFORE UPDATE ON public.enneagram_profile FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- MBTI
CREATE TABLE public.mbti_profile (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mbti_type text NOT NULL DEFAULT 'INTJ',
  characteristics text,
  strengths text,
  watchouts text,
  communication text,
  decision_making text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mbti_profile TO authenticated;
GRANT ALL ON public.mbti_profile TO service_role;
ALTER TABLE public.mbti_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mbti_profile" ON public.mbti_profile FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER mbti_profile_updated_at BEFORE UPDATE ON public.mbti_profile FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- VALUES
CREATE TABLE public.personal_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  rank integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_values TO authenticated;
GRANT ALL ON public.personal_values TO service_role;
ALTER TABLE public.personal_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own personal_values" ON public.personal_values FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER personal_values_updated_at BEFORE UPDATE ON public.personal_values FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- LIFE GOALS
CREATE TABLE public.life_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  horizon text NOT NULL DEFAULT 'medio',
  target_date date,
  status text NOT NULL DEFAULT 'ativa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.life_goals TO authenticated;
GRANT ALL ON public.life_goals TO service_role;
ALTER TABLE public.life_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own life_goals" ON public.life_goals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER life_goals_updated_at BEFORE UPDATE ON public.life_goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SEED base inicial
INSERT INTO public.thelema_authors (user_id, name, bio)
SELECT u.id, 'Aleister Crowley', 'Poeta, ocultista e fundador de Thelema (1875-1947). Autor do Liber AL vel Legis.'
FROM auth.users u WHERE u.email = 'sevenseven7775515@gmail.com';

INSERT INTO public.thelema_texts (user_id, title_original, title_pt, original_language, author, source_url)
SELECT u.id, t.title_original, t.title_pt, 'Inglês', 'Aleister Crowley', t.source_url
FROM auth.users u
CROSS JOIN (VALUES
  ('Liber AL vel Legis', 'O Livro da Lei', 'https://sacred-texts.com/oto/engccxx.htm'),
  ('The Book of the Law', 'O Livro da Lei', 'https://sacred-texts.com/oto/engccxx.htm'),
  ('Liber ABA (Book 4)', NULL, 'https://hermetic.com/crowley/book-4/index'),
  ('Magick in Theory and Practice', NULL, 'https://hermetic.com/crowley/book-4/index'),
  ('The Confessions of Aleister Crowley', NULL, 'https://hermetic.com/crowley/confessions/index'),
  ('The Equinox', NULL, 'https://hermetic.com/crowley/equinox/index'),
  ('Liber 777', NULL, 'https://hermetic.com/777/index'),
  ('Liber O vel Manus et Sagittae', NULL, 'https://hermetic.com/crowley/libers/lib6'),
  ('Liber E vel Exercitiorum', NULL, 'https://hermetic.com/crowley/libers/lib5'),
  ('Liber Resh vel Helios', NULL, 'https://hermetic.com/crowley/libers/lib200'),
  ('Liber III vel Jugorum', NULL, 'https://hermetic.com/crowley/libers/lib3'),
  ('Liber Samekh', NULL, 'https://hermetic.com/crowley/libers/lib800'),
  ('Liber Astarte vel Berylli', NULL, 'https://hermetic.com/crowley/libers/lib175'),
  ('Liber Israfel', NULL, 'https://hermetic.com/crowley/libers/lib64'),
  ('Liber Reguli', NULL, 'https://hermetic.com/crowley/libers/lib-reguli'),
  ('Liber V vel Reguli', NULL, 'https://hermetic.com/crowley/libers/lib-reguli'),
  ('Liber Cheth vel Vallum Abiegni', NULL, 'https://hermetic.com/crowley/libers/lib156'),
  ('Liber Tau vel Kabbalae Trium Literarum', NULL, 'https://hermetic.com/crowley/libers/lib230'),
  ('Liber Tzaddi vel Hamus Hermeticus', NULL, 'https://hermetic.com/crowley/libers/lib90'),
  ('Liber Cordis Cincti Serpente', NULL, 'https://hermetic.com/crowley/libers/lib65'),
  ('Liber Porta Lucis', NULL, 'https://hermetic.com/crowley/libers/libible'),
  ('Liber Stellae Rubeae', NULL, 'https://hermetic.com/crowley/libers/lib66'),
  ('Liber Arcanorum', NULL, 'https://hermetic.com/crowley/libers/lib231'),
  ('Liber B vel Magi', NULL, 'https://hermetic.com/crowley/libers/lib1'),
  ('Liber C vel Agape', NULL, NULL),
  ('Liber D vel Sepher Sephiroth', NULL, NULL)
) AS t(title_original, title_pt, source_url)
WHERE u.email = 'sevenseven7775515@gmail.com';

INSERT INTO public.astronomical_events (user_id, title, kind, event_date, end_date, description)
SELECT u.id, e.title, e.kind, e.event_date::date, e.end_date::date, e.description
FROM auth.users u
CROSS JOIN (VALUES
  ('Solstício de Inverno (Hemisfério Sul)', 'solsticio', '2026-06-21', NULL, 'Noite mais longa do ano no Hemisfério Sul.'),
  ('Equinócio de Primavera (Hemisfério Sul)', 'equinocio', '2026-09-22', NULL, 'Equilíbrio entre luz e sombra.'),
  ('Solstício de Verão (Hemisfério Sul)', 'solsticio', '2026-12-21', NULL, 'Dia mais longo do ano no Hemisfério Sul.'),
  ('Equinócio de Outono (Hemisfério Sul)', 'equinocio', '2027-03-20', NULL, 'Equilíbrio entre luz e sombra.')
) AS e(title, kind, event_date, end_date, description)
WHERE u.email = 'sevenseven7775515@gmail.com';
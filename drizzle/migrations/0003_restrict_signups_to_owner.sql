CREATE OR REPLACE FUNCTION public.only_owner_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(coalesce(NEW.email,'')) <> 'sevenseven7775515@gmail.com' THEN
    RAISE EXCEPTION 'Acesso não autorizado';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.only_owner_signup() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS only_owner_signup ON auth.users;
CREATE TRIGGER only_owner_signup BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.only_owner_signup();
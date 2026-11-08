ALTER TABLE public.finance_transactions ADD COLUMN IF NOT EXISTS source_ref text;
ALTER TABLE public.finance_transactions ADD COLUMN IF NOT EXISTS source_file text;
CREATE UNIQUE INDEX IF NOT EXISTS finance_transactions_user_source_ref_uq ON public.finance_transactions (user_id, source_ref);
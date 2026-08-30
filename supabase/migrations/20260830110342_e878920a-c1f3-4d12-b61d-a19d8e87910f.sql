ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account_name text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_branch text,
  ADD COLUMN IF NOT EXISTS bank_swift text,
  ADD COLUMN IF NOT EXISTS mobile_money_name text,
  ADD COLUMN IF NOT EXISTS mobile_money_number text,
  ADD COLUMN IF NOT EXISTS show_bank_on_documents boolean NOT NULL DEFAULT true;
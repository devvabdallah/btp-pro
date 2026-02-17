-- Ajouter les colonnes de paiement dans invoices
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Ajouter les colonnes de paiement et acompte dans quotes
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC,
ADD COLUMN IF NOT EXISTS deposit_percent NUMERIC;

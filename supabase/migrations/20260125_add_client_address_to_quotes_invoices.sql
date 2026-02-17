-- Ajouter les colonnes d'adresse client dans quotes
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS client_address_line1 TEXT,
ADD COLUMN IF NOT EXISTS client_address_line2 TEXT,
ADD COLUMN IF NOT EXISTS client_postal_code TEXT,
ADD COLUMN IF NOT EXISTS client_city TEXT;

-- Ajouter les colonnes d'adresse client dans invoices
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS client_address_line1 TEXT,
ADD COLUMN IF NOT EXISTS client_address_line2 TEXT,
ADD COLUMN IF NOT EXISTS client_postal_code TEXT,
ADD COLUMN IF NOT EXISTS client_city TEXT;

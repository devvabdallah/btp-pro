-- Table des entreprises
CREATE TABLE IF NOT EXISTS entreprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index sur le code pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_entreprises_code ON entreprises(code);

-- Table des profils utilisateurs
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('patron', 'employe')),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index sur l'entreprise_id pour jointures rapides
CREATE INDEX IF NOT EXISTS idx_profiles_entreprise_id ON profiles(entreprise_id);

-- Index sur le rôle pour filtrage rapide
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- RLS (Row Level Security) - À activer dans Supabase Dashboard
-- ALTER TABLE entreprises ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLE DEVIS (quotes)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_contact TEXT,
  description TEXT,
  amount_ht NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('brouillon', 'envoye', 'accepte', 'refuse')) DEFAULT 'brouillon',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index sur l'entreprise_id pour jointures rapides
CREATE INDEX IF NOT EXISTS idx_quotes_entreprise_id ON public.quotes(entreprise_id);

-- Index sur le status pour filtrage rapide
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);

-- Commentaires pour documentation
COMMENT ON TABLE public.quotes IS 'Table contenant les devis d''une entreprise';
COMMENT ON COLUMN public.quotes.status IS 'État du devis : brouillon, envoyé, accepté, refusé';
COMMENT ON COLUMN public.quotes.amount_ht IS 'Montant hors taxes du devis';

-- FIN TABLE DEVIS


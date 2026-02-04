-- ============================================================
-- AJOUT DES COLONNES STRIPE À LA TABLE entreprises
-- ============================================================
-- Ce script ajoute les colonnes nécessaires pour gérer
-- l'abonnement Stripe au niveau de l'entreprise.
-- ============================================================

-- Ajouter la colonne is_active si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'entreprises' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE entreprises ADD COLUMN is_active BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Ajouter la colonne stripe_customer_id si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'entreprises' 
    AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE entreprises ADD COLUMN stripe_customer_id TEXT;
  END IF;
END $$;

-- Ajouter la colonne stripe_subscription_id si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'entreprises' 
    AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE entreprises ADD COLUMN stripe_subscription_id TEXT;
  END IF;
END $$;

-- Ajouter la colonne trial_ends_at si elle n'existe pas (déjà utilisée dans le code)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'entreprises' 
    AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE entreprises ADD COLUMN trial_ends_at TIMESTAMPTZ;
  END IF;
END $$;

-- Index pour recherche rapide par customer Stripe
CREATE INDEX IF NOT EXISTS idx_entreprises_stripe_customer_id ON entreprises(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_entreprises_stripe_subscription_id ON entreprises(stripe_subscription_id);

-- Commentaires pour documentation
COMMENT ON COLUMN entreprises.is_active IS 'Statut d''abonnement actif (géré par Stripe webhooks)';
COMMENT ON COLUMN entreprises.stripe_customer_id IS 'ID du customer Stripe associé';
COMMENT ON COLUMN entreprises.stripe_subscription_id IS 'ID de l''abonnement Stripe actif';
COMMENT ON COLUMN entreprises.trial_ends_at IS 'Date de fin de l''essai gratuit (5 jours)';

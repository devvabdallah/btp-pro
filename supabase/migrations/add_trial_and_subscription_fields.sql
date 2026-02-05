-- ============================================================
-- Migration: Ajout des champs d'essai et d'abonnement
-- ============================================================
-- Ajoute les colonnes nécessaires pour gérer la période d'essai
-- de 5 jours et l'intégration Stripe future
-- ============================================================

-- Ajouter les colonnes à la table entreprises
ALTER TABLE entreprises
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT NULL,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT NULL,
ADD COLUMN IF NOT EXISTS subscription_status TEXT NULL,
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Index pour les recherches par statut
CREATE INDEX IF NOT EXISTS idx_entreprises_subscription_status ON entreprises(subscription_status);
CREATE INDEX IF NOT EXISTS idx_entreprises_trial_ends_at ON entreprises(trial_ends_at);

-- Commentaires pour documentation
COMMENT ON COLUMN entreprises.trial_started_at IS 'Date de début de la période d''essai';
COMMENT ON COLUMN entreprises.trial_ends_at IS 'Date de fin de la période d''essai (5 jours après le début)';
COMMENT ON COLUMN entreprises.stripe_customer_id IS 'ID du client Stripe';
COMMENT ON COLUMN entreprises.stripe_subscription_id IS 'ID de l''abonnement Stripe';
COMMENT ON COLUMN entreprises.subscription_status IS 'Statut de l''abonnement: trialing, active, canceled, past_due, incomplete, expired';
COMMENT ON COLUMN entreprises.subscription_current_period_end IS 'Date de fin de la période d''abonnement actuelle';
COMMENT ON COLUMN entreprises.is_active IS 'Statut actif/inactif de l''entreprise (calculé automatiquement)';

-- ============================================================
-- Migration: Trial 5 jours et fonction is_company_active
-- Date: 2026-02-09
-- ============================================================

-- 1. Ajouter des colonnes à public.entreprises (si elles n'existent pas)
ALTER TABLE public.entreprises
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '5 days'),
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing';

-- 2. Backfill pour les entreprises existantes
UPDATE public.entreprises
SET 
  trial_started_at = COALESCE(trial_started_at, now()),
  trial_ends_at = COALESCE(trial_ends_at, COALESCE(trial_started_at, now()) + interval '5 days'),
  subscription_status = COALESCE(subscription_status, 'trialing')
WHERE 
  trial_started_at IS NULL 
  OR trial_ends_at IS NULL 
  OR subscription_status IS NULL;

-- 3. Créer / remplacer la fonction public.is_company_active
CREATE OR REPLACE FUNCTION public.is_company_active(company_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription_status TEXT;
  v_trial_ends_at TIMESTAMPTZ;
BEGIN
  -- Récupérer les informations de l'entreprise
  SELECT 
    subscription_status,
    trial_ends_at
  INTO 
    v_subscription_status,
    v_trial_ends_at
  FROM public.entreprises
  WHERE id = company_id;

  -- Si l'entreprise n'existe pas, retourner false
  IF v_subscription_status IS NULL THEN
    RETURN false;
  END IF;

  -- TRUE si subscription_status = 'active'
  IF v_subscription_status = 'active' THEN
    RETURN true;
  END IF;

  -- TRUE si subscription_status IN ('trialing','trial') ET trial_ends_at > now()
  IF v_subscription_status IN ('trialing', 'trial') AND v_trial_ends_at IS NOT NULL AND v_trial_ends_at > now() THEN
    RETURN true;
  END IF;

  -- Sinon FALSE
  RETURN false;
END;
$$;

-- 4. Grant minimal
GRANT EXECUTE ON FUNCTION public.is_company_active(UUID) TO authenticated;

-- Commentaires pour documentation
COMMENT ON FUNCTION public.is_company_active(UUID) IS 'Vérifie si une entreprise est active (abonnement actif ou trial valide)';
COMMENT ON COLUMN public.entreprises.trial_started_at IS 'Date de début de la période d''essai';
COMMENT ON COLUMN public.entreprises.trial_ends_at IS 'Date de fin de la période d''essai (5 jours après le début)';
COMMENT ON COLUMN public.entreprises.subscription_status IS 'Statut de l''abonnement: trialing, active, canceled, past_due, inactive';

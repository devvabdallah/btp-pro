-- ============================================================
-- FONCTION RPC is_company_active
-- ============================================================
-- Cette fonction vérifie si une entreprise est active
-- en tenant compte de la période d'essai (5 jours) et du statut d'abonnement.
-- ============================================================

-- Supprimer la fonction existante si elle existe
DROP FUNCTION IF EXISTS is_company_active(UUID);
DROP FUNCTION IF EXISTS is_company_active();

-- Créer la fonction avec entreprise_id en paramètre
CREATE OR REPLACE FUNCTION is_company_active(p_entreprise_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entreprise_id UUID;
  v_trial_ends_at TIMESTAMPTZ;
  v_subscription_status TEXT;
  v_subscription_current_period_end TIMESTAMPTZ;
BEGIN
  -- Si entreprise_id fourni, l'utiliser
  IF p_entreprise_id IS NOT NULL THEN
    v_entreprise_id := p_entreprise_id;
  ELSE
    -- Sinon, récupérer depuis le profil de l'utilisateur connecté
    SELECT entreprise_id INTO v_entreprise_id
    FROM profiles
    WHERE id = auth.uid()
    LIMIT 1;
  END IF;

  -- Si aucune entreprise trouvée, retourner false
  IF v_entreprise_id IS NULL THEN
    RETURN false;
  END IF;

  -- Récupérer les informations de l'entreprise
  SELECT 
    trial_ends_at,
    subscription_status,
    subscription_current_period_end
  INTO 
    v_trial_ends_at,
    v_subscription_status,
    v_subscription_current_period_end
  FROM entreprises
  WHERE id = v_entreprise_id;

  -- Condition A: Période d'essai active
  -- trial_ends_at IS NOT NULL ET now() < trial_ends_at
  IF v_trial_ends_at IS NOT NULL AND NOW() < v_trial_ends_at THEN
    RETURN true;
  END IF;

  -- Condition B: Abonnement actif
  -- subscription_status IN ('active','trialing') ET (subscription_current_period_end IS NULL OU now() < subscription_current_period_end)
  IF v_subscription_status IN ('active', 'trialing') THEN
    IF v_subscription_current_period_end IS NULL OR NOW() < v_subscription_current_period_end THEN
      RETURN true;
    END IF;
  END IF;

  -- Sinon, l'entreprise n'est pas active
  RETURN false;
END;
$$;

-- Créer aussi une version sans paramètre (pour compatibilité)
CREATE OR REPLACE FUNCTION is_company_active()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entreprise_id UUID;
  v_trial_ends_at TIMESTAMPTZ;
  v_subscription_status TEXT;
  v_subscription_current_period_end TIMESTAMPTZ;
BEGIN
  -- Récupérer entreprise_id depuis le profil de l'utilisateur connecté
  SELECT entreprise_id INTO v_entreprise_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;

  -- Si aucune entreprise trouvée, retourner false
  IF v_entreprise_id IS NULL THEN
    RETURN false;
  END IF;

  -- Récupérer les informations de l'entreprise
  SELECT 
    trial_ends_at,
    subscription_status,
    subscription_current_period_end
  INTO 
    v_trial_ends_at,
    v_subscription_status,
    v_subscription_current_period_end
  FROM entreprises
  WHERE id = v_entreprise_id;

  -- Condition A: Période d'essai active
  -- trial_ends_at IS NOT NULL ET now() < trial_ends_at
  IF v_trial_ends_at IS NOT NULL AND NOW() < v_trial_ends_at THEN
    RETURN true;
  END IF;

  -- Condition B: Abonnement actif
  -- subscription_status IN ('active','trialing') ET (subscription_current_period_end IS NULL OU now() < subscription_current_period_end)
  IF v_subscription_status IN ('active', 'trialing') THEN
    IF v_subscription_current_period_end IS NULL OR NOW() < v_subscription_current_period_end THEN
      RETURN true;
    END IF;
  END IF;

  -- Sinon, l'entreprise n'est pas active
  RETURN false;
END;
$$;

-- Commentaire pour documentation
COMMENT ON FUNCTION is_company_active(UUID) IS 'Vérifie si une entreprise est active (période d''essai ou abonnement actif)';
COMMENT ON FUNCTION is_company_active() IS 'Vérifie si l''entreprise de l''utilisateur connecté est active';

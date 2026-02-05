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
  v_is_active BOOLEAN;
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
    subscription_current_period_end,
    is_active
  INTO 
    v_trial_ends_at,
    v_subscription_status,
    v_subscription_current_period_end,
    v_is_active
  FROM entreprises
  WHERE id = v_entreprise_id;

  -- Si l'entreprise n'existe pas, retourner false
  IF v_entreprise_id IS NULL THEN
    RETURN false;
  END IF;

  -- Vérifier la période d'essai
  -- Si trial_ends_at existe et est dans le futur, l'entreprise est active
  IF v_trial_ends_at IS NOT NULL AND v_trial_ends_at > NOW() THEN
    RETURN true;
  END IF;

  -- Vérifier le statut d'abonnement Stripe
  -- Si subscription_status est 'trialing' ou 'active', l'entreprise est active
  IF v_subscription_status IN ('trialing', 'active') THEN
    -- Vérifier aussi que la période n'est pas expirée
    IF v_subscription_current_period_end IS NULL OR v_subscription_current_period_end > NOW() THEN
      RETURN true;
    END IF;
  END IF;

  -- Si is_active est explicitement true, retourner true
  IF v_is_active = true THEN
    RETURN true;
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
  v_is_active BOOLEAN;
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
    subscription_current_period_end,
    is_active
  INTO 
    v_trial_ends_at,
    v_subscription_status,
    v_subscription_current_period_end,
    v_is_active
  FROM entreprises
  WHERE id = v_entreprise_id;

  -- Vérifier la période d'essai
  -- Si trial_ends_at existe et est dans le futur, l'entreprise est active
  IF v_trial_ends_at IS NOT NULL AND v_trial_ends_at > NOW() THEN
    RETURN true;
  END IF;

  -- Vérifier le statut d'abonnement Stripe
  -- Si subscription_status est 'trialing' ou 'active', l'entreprise est active
  IF v_subscription_status IN ('trialing', 'active') THEN
    -- Vérifier aussi que la période n'est pas expirée
    IF v_subscription_current_period_end IS NULL OR v_subscription_current_period_end > NOW() THEN
      RETURN true;
    END IF;
  END IF;

  -- Si is_active est explicitement true, retourner true
  IF v_is_active = true THEN
    RETURN true;
  END IF;

  -- Sinon, l'entreprise n'est pas active
  RETURN false;
END;
$$;

-- Commentaire pour documentation
COMMENT ON FUNCTION is_company_active(UUID) IS 'Vérifie si une entreprise est active (période d''essai ou abonnement actif)';
COMMENT ON FUNCTION is_company_active() IS 'Vérifie si l''entreprise de l''utilisateur connecté est active';

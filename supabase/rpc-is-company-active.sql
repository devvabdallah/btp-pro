-- ============================================================
-- FONCTION RPC is_company_active
-- ============================================================
-- Cette fonction vérifie si une entreprise est active
-- en se basant sur le champ is_active de la table entreprises.
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

  -- Récupérer is_active depuis la table entreprises
  SELECT COALESCE(is_active, false) INTO v_is_active
  FROM entreprises
  WHERE id = v_entreprise_id;

  -- Retourner le statut
  RETURN COALESCE(v_is_active, false);
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

  -- Récupérer is_active depuis la table entreprises
  SELECT COALESCE(is_active, false) INTO v_is_active
  FROM entreprises
  WHERE id = v_entreprise_id;

  -- Retourner le statut
  RETURN COALESCE(v_is_active, false);
END;
$$;

-- Commentaire pour documentation
COMMENT ON FUNCTION is_company_active(UUID) IS 'Vérifie si une entreprise est active (basé sur is_active)';
COMMENT ON FUNCTION is_company_active() IS 'Vérifie si l''entreprise de l''utilisateur connecté est active';

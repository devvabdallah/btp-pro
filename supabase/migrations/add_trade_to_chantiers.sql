-- Migration: Ajouter le champ "trade" (métier) à la table chantiers
-- Date: 2024

-- 1) Ajouter la colonne trade (nullable pour les anciens enregistrements)
ALTER TABLE public.chantiers
ADD COLUMN IF NOT EXISTS trade TEXT;

-- 2) Ajouter une contrainte CHECK pour limiter aux valeurs autorisées
-- Note: La contrainte permet NULL pour les anciens enregistrements
ALTER TABLE public.chantiers
ADD CONSTRAINT IF NOT EXISTS chantiers_trade_check 
CHECK (
  trade IS NULL OR 
  trade IN (
    'plomberie',
    'electricite',
    'maconnerie',
    'enduit',
    'carrelage',
    'charpente',
    'chauffage',
    'couverture',
    'menuiserie',
    'peinture',
    'autre'
  )
);

-- 3) Ajouter un index composite sur (entreprise_id, trade) pour améliorer les performances
-- (optionnel, seulement si pas déjà indexé sur entreprise_id seul)
CREATE INDEX IF NOT EXISTS idx_chantiers_entreprise_trade 
ON public.chantiers(entreprise_id, trade)
WHERE trade IS NOT NULL;


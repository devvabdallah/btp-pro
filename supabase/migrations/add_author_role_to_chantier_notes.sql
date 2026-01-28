-- Migration: Ajouter author_role à chantier_notes et mettre à jour les RLS

-- 1) Ajouter la colonne author_role si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'chantier_notes' 
    AND column_name = 'author_role'
  ) THEN
    ALTER TABLE public.chantier_notes 
    ADD COLUMN author_role TEXT NOT NULL DEFAULT 'patron' 
    CHECK (author_role IN ('patron', 'employe'));
    
    -- Mettre à jour les notes existantes avec le rôle depuis profiles
    UPDATE public.chantier_notes cn
    SET author_role = COALESCE(
      (SELECT p.role FROM public.profiles p WHERE p.id = cn.author_user_id),
      'patron'
    )
    WHERE author_role = 'patron'; -- seulement les valeurs par défaut
    
    -- Supprimer la valeur par défaut maintenant que les données sont migrées
    ALTER TABLE public.chantier_notes 
    ALTER COLUMN author_role DROP DEFAULT;
  END IF;
END $$;

-- 2) Créer les index si nécessaire
CREATE INDEX IF NOT EXISTS idx_chantier_notes_chantier_created 
ON public.chantier_notes(chantier_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chantier_notes_entreprise 
ON public.chantier_notes(entreprise_id);

-- 3) RLS Policies pour chantier_notes

-- Activer RLS si pas déjà fait
ALTER TABLE public.chantier_notes ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can view notes from their company" ON public.chantier_notes;
DROP POLICY IF EXISTS "Users can insert notes in their company" ON public.chantier_notes;
DROP POLICY IF EXISTS "Patrons can delete any note, users can delete their own" ON public.chantier_notes;

-- SELECT : autoriser si l'utilisateur est authentifié et que son entreprise_id match
CREATE POLICY "Users can view notes from their company"
ON public.chantier_notes
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND entreprise_id IN (
    SELECT entreprise_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- INSERT : autoriser si l'utilisateur est authentifié et que son entreprise match
-- Note: entreprise_id sera forcé depuis le profil côté code
CREATE POLICY "Users can insert notes in their company"
ON public.chantier_notes
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND entreprise_id IN (
    SELECT entreprise_id FROM public.profiles WHERE id = auth.uid()
  )
  AND author_user_id = auth.uid()
);

-- DELETE : autoriser uniquement si même entreprise + (role patron) OU (auteur de la note)
CREATE POLICY "Patrons can delete any note, users can delete their own"
ON public.chantier_notes
FOR DELETE
USING (
  auth.uid() IS NOT NULL 
  AND entreprise_id IN (
    SELECT entreprise_id FROM public.profiles WHERE id = auth.uid()
  )
  AND (
    -- Patron peut supprimer toutes les notes de son entreprise
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'patron'
      AND entreprise_id = chantier_notes.entreprise_id
    )
    OR
    -- Employé peut supprimer seulement ses propres notes
    author_user_id = auth.uid()
  )
);

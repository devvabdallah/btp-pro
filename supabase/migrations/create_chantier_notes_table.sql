-- Créer la table chantier_notes pour le suivi des chantiers
CREATE TABLE IF NOT EXISTS public.chantier_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id uuid NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  entreprise_id uuid NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Créer l'index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_chantier_notes_chantier_created_at 
ON public.chantier_notes(chantier_id, created_at DESC);

-- Activer RLS
ALTER TABLE public.chantier_notes ENABLE ROW LEVEL SECURITY;

-- Policy SELECT : autoriser uniquement les membres de la même entreprise
CREATE POLICY "Les membres de l'entreprise peuvent lire les notes"
ON public.chantier_notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.entreprise_id = chantier_notes.entreprise_id
  )
);

-- Policy INSERT : autoriser uniquement les membres de la même entreprise
CREATE POLICY "Les membres de l'entreprise peuvent ajouter des notes"
ON public.chantier_notes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.entreprise_id = chantier_notes.entreprise_id
  )
  AND author_id = auth.uid()
);

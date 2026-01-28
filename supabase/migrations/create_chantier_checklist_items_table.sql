-- Table pour les items de checklist des chantiers
CREATE TABLE IF NOT EXISTS public.chantier_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id uuid NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  entreprise_id uuid NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
  label text NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour les requêtes par chantier
CREATE INDEX IF NOT EXISTS idx_chantier_checklist_items_chantier_created_at
ON public.chantier_checklist_items(chantier_id, created_at);

-- RLS (Row Level Security)
ALTER TABLE public.chantier_checklist_items ENABLE ROW LEVEL SECURITY;

-- Policy SELECT : membres de la même entreprise
CREATE POLICY "Les membres de l'entreprise peuvent lire les items de checklist"
ON public.chantier_checklist_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.entreprise_id = chantier_checklist_items.entreprise_id
  )
);

-- Policy INSERT : membres de la même entreprise
CREATE POLICY "Les membres de l'entreprise peuvent ajouter des items de checklist"
ON public.chantier_checklist_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.entreprise_id = chantier_checklist_items.entreprise_id
  )
);

-- Policy UPDATE : membres de la même entreprise
CREATE POLICY "Les membres de l'entreprise peuvent modifier les items de checklist"
ON public.chantier_checklist_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.entreprise_id = chantier_checklist_items.entreprise_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.entreprise_id = chantier_checklist_items.entreprise_id
  )
);

-- Policy DELETE : membres de la même entreprise
CREATE POLICY "Les membres de l'entreprise peuvent supprimer les items de checklist"
ON public.chantier_checklist_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.entreprise_id = chantier_checklist_items.entreprise_id
  )
);

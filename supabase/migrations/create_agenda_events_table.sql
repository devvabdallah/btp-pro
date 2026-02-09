-- ============================================================
-- TABLE: agenda_events
-- Système d'agenda MVP pour BTP PRO
-- ============================================================

-- Fonction helper pour récupérer l'entreprise_id de l'utilisateur connecté
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  company_id UUID;
BEGIN
  SELECT entreprise_id INTO company_id
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN company_id;
END;
$$;

-- Table agenda_events
CREATE TABLE IF NOT EXISTS public.agenda_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  chantier_id UUID NULL REFERENCES public.chantiers(id) ON DELETE SET NULL,
  client_id UUID NULL REFERENCES public.clients(id) ON DELETE SET NULL,
  notes TEXT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agenda_events_ends_after_starts CHECK (ends_at >= starts_at)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_agenda_events_company_starts_at 
ON public.agenda_events(company_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_agenda_events_chantier_starts_at 
ON public.agenda_events(chantier_id, starts_at)
WHERE chantier_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agenda_events_client_starts_at 
ON public.agenda_events(client_id, starts_at)
WHERE client_id IS NOT NULL;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_agenda_events_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_agenda_events_updated_at
BEFORE UPDATE ON public.agenda_events
FOR EACH ROW
EXECUTE FUNCTION update_agenda_events_updated_at();

-- Activer RLS
ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;

-- Policy SELECT: autoriser si company_id = get_user_company_id()
CREATE POLICY "users_can_view_events_in_their_company"
ON public.agenda_events
FOR SELECT
USING (
  company_id = get_user_company_id()
);

-- Policy INSERT: autoriser si company_id = get_user_company_id() ET created_by = auth.uid()
CREATE POLICY "users_can_insert_events_in_their_company"
ON public.agenda_events
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id()
  AND created_by = auth.uid()
);

-- Policy UPDATE: autoriser si company_id = get_user_company_id()
CREATE POLICY "users_can_update_events_in_their_company"
ON public.agenda_events
FOR UPDATE
USING (
  company_id = get_user_company_id()
)
WITH CHECK (
  company_id = get_user_company_id()
);

-- Policy DELETE: autoriser si company_id = get_user_company_id()
CREATE POLICY "users_can_delete_events_in_their_company"
ON public.agenda_events
FOR DELETE
USING (
  company_id = get_user_company_id()
);

-- ============================================================
-- RLS POLICIES POUR BTP PRO
-- ============================================================
-- Ce fichier contient toutes les politiques RLS nécessaires
-- pour sécuriser l'accès aux données multi-entreprises.
--
-- IMPORTANT : Exécuter ce script dans l'éditeur SQL de Supabase
-- après avoir créé les tables.
-- ============================================================

-- ============================================================
-- 1. TABLE: entreprises
-- ============================================================

-- Activer RLS
ALTER TABLE entreprises ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "patrons_can_view_their_company" ON entreprises;
DROP POLICY IF EXISTS "employees_can_view_their_company" ON entreprises;

-- Policy: Patrons peuvent voir leur entreprise
CREATE POLICY "patrons_can_view_their_company"
ON entreprises
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'patron'
    AND profiles.entreprise_id = entreprises.id
  )
);

-- Policy: Employés peuvent voir leur entreprise
CREATE POLICY "employees_can_view_their_company"
ON entreprises
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'employe'
    AND profiles.entreprise_id = entreprises.id
  )
);

-- ============================================================
-- 2. TABLE: profiles
-- ============================================================

-- Activer RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "users_can_view_profiles_in_their_company" ON profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;

-- Policy: Utilisateurs peuvent voir les profils de leur entreprise
CREATE POLICY "users_can_view_profiles_in_their_company"
ON profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles AS p
    WHERE p.id = auth.uid()
    AND p.entreprise_id = profiles.entreprise_id
  )
);

-- Policy: Utilisateurs peuvent modifier leur propre profil uniquement
CREATE POLICY "users_can_update_own_profile"
ON profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================================
-- 3. TABLE: quotes
-- ============================================================

-- Activer RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "patrons_full_access_quotes" ON quotes;
DROP POLICY IF EXISTS "employees_read_only_quotes" ON quotes;

-- Policy: Patrons ont accès complet (SELECT, INSERT, UPDATE, DELETE) sur leurs devis
CREATE POLICY "patrons_full_access_quotes"
ON quotes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'patron'
    AND profiles.entreprise_id = quotes.entreprise_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'patron'
    AND profiles.entreprise_id = quotes.entreprise_id
  )
);

-- Policy: Employés peuvent uniquement lire les devis de leur entreprise
CREATE POLICY "employees_read_only_quotes"
ON quotes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'employe'
    AND profiles.entreprise_id = quotes.entreprise_id
  )
);

-- ============================================================
-- 4. TABLE: quote_lines
-- ============================================================

-- Activer RLS
ALTER TABLE quote_lines ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "patrons_full_access_quote_lines" ON quote_lines;
DROP POLICY IF EXISTS "employees_read_only_quote_lines" ON quote_lines;

-- Policy: Patrons ont accès complet sur les lignes de devis de leur entreprise
CREATE POLICY "patrons_full_access_quote_lines"
ON quote_lines
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM quotes
    INNER JOIN profiles ON profiles.entreprise_id = quotes.entreprise_id
    WHERE quotes.id = quote_lines.quote_id
    AND profiles.id = auth.uid()
    AND profiles.role = 'patron'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotes
    INNER JOIN profiles ON profiles.entreprise_id = quotes.entreprise_id
    WHERE quotes.id = quote_lines.quote_id
    AND profiles.id = auth.uid()
    AND profiles.role = 'patron'
  )
);

-- Policy: Employés peuvent uniquement lire les lignes de devis de leur entreprise
CREATE POLICY "employees_read_only_quote_lines"
ON quote_lines
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM quotes
    INNER JOIN profiles ON profiles.entreprise_id = quotes.entreprise_id
    WHERE quotes.id = quote_lines.quote_id
    AND profiles.id = auth.uid()
    AND profiles.role = 'employe'
  )
);

-- ============================================================
-- 5. TABLE: invoices
-- ============================================================

-- Activer RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "patrons_full_access_invoices" ON invoices;
DROP POLICY IF EXISTS "employees_read_only_invoices" ON invoices;

-- Policy: Patrons ont accès complet (SELECT, INSERT, UPDATE, DELETE) sur leurs factures
CREATE POLICY "patrons_full_access_invoices"
ON invoices
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'patron'
    AND profiles.entreprise_id = invoices.entreprise_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'patron'
    AND profiles.entreprise_id = invoices.entreprise_id
  )
);

-- Policy: Employés peuvent uniquement lire les factures de leur entreprise
CREATE POLICY "employees_read_only_invoices"
ON invoices
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'employe'
    AND profiles.entreprise_id = invoices.entreprise_id
  )
);

-- ============================================================
-- 6. TABLE: invoice_lines
-- ============================================================

-- Activer RLS
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "patrons_full_access_invoice_lines" ON invoice_lines;
DROP POLICY IF EXISTS "employees_read_only_invoice_lines" ON invoice_lines;

-- Policy: Patrons ont accès complet sur les lignes de facture de leur entreprise
CREATE POLICY "patrons_full_access_invoice_lines"
ON invoice_lines
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM invoices
    INNER JOIN profiles ON profiles.entreprise_id = invoices.entreprise_id
    WHERE invoices.id = invoice_lines.invoice_id
    AND profiles.id = auth.uid()
    AND profiles.role = 'patron'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM invoices
    INNER JOIN profiles ON profiles.entreprise_id = invoices.entreprise_id
    WHERE invoices.id = invoice_lines.invoice_id
    AND profiles.id = auth.uid()
    AND profiles.role = 'patron'
  )
);

-- Policy: Employés peuvent uniquement lire les lignes de facture de leur entreprise
CREATE POLICY "employees_read_only_invoice_lines"
ON invoice_lines
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM invoices
    INNER JOIN profiles ON profiles.entreprise_id = invoices.entreprise_id
    WHERE invoices.id = invoice_lines.invoice_id
    AND profiles.id = auth.uid()
    AND profiles.role = 'employe'
  )
);

-- ============================================================
-- FIN DES POLITIQUES RLS
-- ============================================================
-- 
-- VALIDATION :
-- 1. Vérifier que RLS est activé sur toutes les tables :
--    SELECT tablename, rowsecurity FROM pg_tables 
--    WHERE schemaname = 'public' 
--    AND tablename IN ('entreprises', 'profiles', 'quotes', 'quote_lines', 'invoices', 'invoice_lines');
--
-- 2. Vérifier les politiques créées :
--    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
--    FROM pg_policies 
--    WHERE schemaname = 'public' 
--    ORDER BY tablename, policyname;
-- ============================================================

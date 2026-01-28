-- Migration: Créer la table invoices (factures) liée aux quotes (devis)

-- MVP: invoices linked to quotes (devis -> facture)
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  quote_id uuid unique references public.quotes(id) on delete set null,

  -- snapshot fields (so invoice stays stable even if quote changes later)
  title text,
  client text not null,
  contact text,
  description text,
  amount_ht numeric not null default 0,

  status text not null default 'draft', -- draft | sent | paid
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at auto
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

-- Helpful indexes
create index if not exists idx_invoices_entreprise_id on public.invoices(entreprise_id);
create index if not exists idx_invoices_status on public.invoices(status);

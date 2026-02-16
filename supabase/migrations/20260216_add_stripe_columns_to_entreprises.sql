ALTER TABLE public.entreprises ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.entreprises ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE public.entreprises ADD COLUMN IF NOT EXISTS subscription_current_period_start timestamptz;
ALTER TABLE public.entreprises ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz;
ALTER TABLE public.entreprises ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end boolean DEFAULT false;
ALTER TABLE public.entreprises ADD COLUMN IF NOT EXISTS subscription_canceled_at timestamptz;
ALTER TABLE public.entreprises ADD COLUMN IF NOT EXISTS subscription_updated_at timestamptz;
ALTER TABLE public.entreprises ADD COLUMN IF NOT EXISTS last_stripe_event_id text;

CREATE INDEX IF NOT EXISTS idx_entreprises_stripe_customer_id ON public.entreprises(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_entreprises_stripe_subscription_id ON public.entreprises(stripe_subscription_id);

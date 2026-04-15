CREATE TABLE IF NOT EXISTS public.affiliate_payout_alert (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  fp_promoter_id bigint NOT NULL,
  fp_payout_id text NOT NULL,
  payout_state text NOT NULL,
  payout_error text,
  payout_amount numeric,
  payout_email text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  ac_synced_at timestamptz,
  resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (fp_promoter_id, fp_payout_id)
);

ALTER TABLE public.affiliate_payout_alert ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_affiliate_payout_alert_member_id
  ON public.affiliate_payout_alert (member_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_payout_alert_unresolved
  ON public.affiliate_payout_alert (resolved_at, ac_synced_at)
  WHERE resolved_at IS NULL;

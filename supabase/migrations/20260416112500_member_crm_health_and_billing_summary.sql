-- Member CRM record enhancements:
-- - billing/commercial summary for fast LTV + payment context
-- - health snapshot for support/coaching triage
-- - follow-up task workflow for owned next steps

DO $$
BEGIN
  CREATE TYPE member_health_status AS ENUM (
    'healthy',
    'watch',
    'at_risk'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE member_engagement_status AS ENUM (
    'engaged',
    'warming_up',
    'inactive'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.member_billing_summary (
  member_id uuid PRIMARY KEY REFERENCES public.member(id) ON DELETE CASCADE,
  stripe_customer_id text,
  currency text NOT NULL DEFAULT 'usd',
  first_paid_at timestamptz,
  last_paid_at timestamptz,
  lifetime_value_cents integer NOT NULL DEFAULT 0,
  subscription_lifetime_value_cents integer NOT NULL DEFAULT 0,
  course_lifetime_value_cents integer NOT NULL DEFAULT 0,
  successful_payment_count integer NOT NULL DEFAULT 0,
  failed_payment_count integer NOT NULL DEFAULT 0,
  refund_total_cents integer NOT NULL DEFAULT 0,
  chargeback_count integer NOT NULL DEFAULT 0,
  active_subscription_price_id text,
  active_subscription_amount_cents integer,
  active_subscription_interval text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_billing_summary_stripe_customer
  ON public.member_billing_summary (stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_member_billing_summary_ltv
  ON public.member_billing_summary (lifetime_value_cents DESC);

ALTER TABLE public.member_billing_summary ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.member_billing_summary IS
  'App-owned commercial snapshot used by the admin CRM for LTV, payment counts, and active subscription summary.';

CREATE TABLE IF NOT EXISTS public.member_health_snapshot (
  member_id uuid PRIMARY KEY REFERENCES public.member(id) ON DELETE CASCADE,
  health_status member_health_status NOT NULL DEFAULT 'watch',
  engagement_status member_engagement_status NOT NULL DEFAULT 'warming_up',
  risk_flags text[] NOT NULL DEFAULT '{}'::text[],
  last_meaningful_activity_at timestamptz,
  practice_days_30 integer NOT NULL DEFAULT 0,
  logins_30 integer NOT NULL DEFAULT 0,
  listens_30 integer NOT NULL DEFAULT 0,
  journal_entries_30 integer NOT NULL DEFAULT 0,
  course_progress_events_30 integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_health_snapshot_health
  ON public.member_health_snapshot (health_status, computed_at DESC);

ALTER TABLE public.member_health_snapshot ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.member_health_snapshot IS
  'Support/coaching health summary derived from app activity, used for CRM triage and queueing.';

CREATE TABLE IF NOT EXISTS public.member_followup_task (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  owner_member_id uuid REFERENCES public.member(id) ON DELETE SET NULL,
  status member_followup_status NOT NULL DEFAULT 'needs_followup',
  due_at timestamptz,
  category text,
  summary text NOT NULL,
  details text,
  created_by uuid REFERENCES public.member(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT member_followup_task_status_check CHECK (status <> 'none')
);

CREATE INDEX IF NOT EXISTS idx_member_followup_task_member
  ON public.member_followup_task (member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_member_followup_task_owner_status_due
  ON public.member_followup_task (owner_member_id, status, due_at);

CREATE INDEX IF NOT EXISTS idx_member_followup_task_open_member
  ON public.member_followup_task (member_id, due_at)
  WHERE status IN ('needs_followup', 'waiting_on_member');

ALTER TABLE public.member_followup_task ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.member_followup_task IS
  'Internal-only support/coaching follow-up workflow tied to a member record.';

DROP TRIGGER IF EXISTS member_billing_summary_updated_at ON public.member_billing_summary;
CREATE TRIGGER member_billing_summary_updated_at
  BEFORE UPDATE ON public.member_billing_summary
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS member_followup_task_updated_at ON public.member_followup_task;
CREATE TRIGGER member_followup_task_updated_at
  BEFORE UPDATE ON public.member_followup_task
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

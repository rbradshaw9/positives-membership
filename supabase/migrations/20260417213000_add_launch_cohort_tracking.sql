ALTER TABLE public.member
  ADD COLUMN IF NOT EXISTS launch_cohort text NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS launch_source text,
  ADD COLUMN IF NOT EXISTS launch_campaign_code text;

ALTER TABLE public.member
  DROP CONSTRAINT IF EXISTS member_launch_cohort_check;

ALTER TABLE public.member
  ADD CONSTRAINT member_launch_cohort_check
  CHECK (launch_cohort IN ('alpha', 'beta', 'live'));

UPDATE public.member
SET launch_source = COALESCE(NULLIF(launch_source, ''), 'public_join')
WHERE launch_source IS NULL OR launch_source = '';

CREATE INDEX IF NOT EXISTS idx_member_launch_cohort
  ON public.member (launch_cohort, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_member_launch_source
  ON public.member (launch_source, created_at DESC);

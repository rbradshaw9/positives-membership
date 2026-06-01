-- Tracks member-facing product tours without re-showing them after skip/finish.

CREATE TABLE IF NOT EXISTS public.member_onboarding_tour (
  member_id UUID NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  tour_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  last_step TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (member_id, tour_key),
  CONSTRAINT member_onboarding_tour_status_check
    CHECK (status IN ('not_started', 'started', 'dismissed', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_member_onboarding_tour_status
  ON public.member_onboarding_tour (tour_key, status, updated_at DESC);

ALTER TABLE public.member_onboarding_tour ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member_onboarding_tour: members select own" ON public.member_onboarding_tour;
CREATE POLICY "member_onboarding_tour: members select own"
  ON public.member_onboarding_tour
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = member_id);

DROP POLICY IF EXISTS "member_onboarding_tour: members insert own" ON public.member_onboarding_tour;
CREATE POLICY "member_onboarding_tour: members insert own"
  ON public.member_onboarding_tour
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = member_id);

DROP POLICY IF EXISTS "member_onboarding_tour: members update own" ON public.member_onboarding_tour;
CREATE POLICY "member_onboarding_tour: members update own"
  ON public.member_onboarding_tour
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = member_id)
  WITH CHECK ((SELECT auth.uid()) = member_id);

DROP TRIGGER IF EXISTS member_onboarding_tour_updated_at ON public.member_onboarding_tour;
CREATE TRIGGER member_onboarding_tour_updated_at
  BEFORE UPDATE ON public.member_onboarding_tour
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.member_onboarding_tour IS
  'Per-member product tour state for in-app guided onboarding. Used to avoid repeated prompts and allow manual relaunch.';

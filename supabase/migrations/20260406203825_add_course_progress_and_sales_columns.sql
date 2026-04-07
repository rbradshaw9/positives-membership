-- ─── Course Progress Table ─────────────────────────────────────────────────
-- Tracks per-member completion state for course lessons and sessions.
-- Supports both auto-completion (at 95% video watch) and manual marking.

CREATE TABLE IF NOT EXISTS public.course_progress (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id           uuid NOT NULL REFERENCES public.member(id) ON DELETE CASCADE,
  course_id           uuid NOT NULL REFERENCES public.course(id) ON DELETE CASCADE,
  course_lesson_id    uuid REFERENCES public.course_lesson(id) ON DELETE CASCADE,
  course_session_id   uuid REFERENCES public.course_session(id) ON DELETE CASCADE,
  video_watch_percent integer NOT NULL DEFAULT 0,
  completed           boolean NOT NULL DEFAULT false,
  auto_completed      boolean NOT NULL DEFAULT false,
  completed_at        timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),

  -- Each member can only have one progress record per lesson (or per session)
  CONSTRAINT course_progress_lesson_unique  UNIQUE (member_id, course_lesson_id),
  CONSTRAINT course_progress_session_unique UNIQUE (member_id, course_session_id),
  -- Must reference at least one of lesson or session
  CONSTRAINT course_progress_target_check   CHECK (
    course_lesson_id IS NOT NULL OR course_session_id IS NOT NULL
  )
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_course_progress_member  ON public.course_progress (member_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_course  ON public.course_progress (course_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_lesson  ON public.course_progress (course_lesson_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_session ON public.course_progress (course_session_id);

-- ─── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members see own course progress"
  ON public.course_progress FOR SELECT
  USING (member_id = auth.uid());

CREATE POLICY "Members insert own course progress"
  ON public.course_progress FOR INSERT
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "Members update own course progress"
  ON public.course_progress FOR UPDATE
  USING (member_id = auth.uid());

-- ─── Auto-update updated_at ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS course_progress_updated_at ON public.course_progress;
CREATE TRIGGER course_progress_updated_at
  BEFORE UPDATE ON public.course_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Course Table: standalone sales groundwork ────────────────────────────
-- These columns enable future standalone course sales via Stripe.
-- Not wired to any purchase flow yet — groundwork only.

ALTER TABLE public.course
  ADD COLUMN IF NOT EXISTS stripe_product_id      text,
  ADD COLUMN IF NOT EXISTS stripe_price_id        text,
  ADD COLUMN IF NOT EXISTS is_standalone_purchasable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_cents            integer;

COMMENT ON COLUMN public.course.stripe_product_id       IS 'Stripe Product ID — populated when course is listed for standalone sale.';
COMMENT ON COLUMN public.course.stripe_price_id         IS 'Stripe Price ID — the one-time price for purchasing this course.';
COMMENT ON COLUMN public.course.is_standalone_purchasable IS 'When true, course can be purchased without a subscription.';
COMMENT ON COLUMN public.course.price_cents             IS 'Standalone purchase price in cents USD.';;

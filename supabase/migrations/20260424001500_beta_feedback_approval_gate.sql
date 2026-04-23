-- Explicit admin approval gate for beta feedback development pickup.
-- Feedback can be triaged without automatically becoming build-ready.

ALTER TABLE public.beta_feedback_submission
  ADD COLUMN IF NOT EXISTS approved_for_development boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_for_development_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_for_development_by_member_id uuid REFERENCES public.member(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_beta_feedback_approval_created
  ON public.beta_feedback_submission (approved_for_development, created_at DESC);

COMMENT ON COLUMN public.beta_feedback_submission.approved_for_development IS
  'True when an admin has explicitly approved this beta feedback item for development work.';

COMMENT ON COLUMN public.beta_feedback_submission.approved_for_development_at IS
  'When the feedback item was most recently approved for development.';

COMMENT ON COLUMN public.beta_feedback_submission.approved_for_development_by_member_id IS
  'Admin member who approved the feedback item for development.';

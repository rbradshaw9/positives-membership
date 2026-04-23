-- Feedback discussion threads, member unread tracking, and explicit Asana linkage.

DO $$
BEGIN
  CREATE TYPE beta_feedback_comment_visibility AS ENUM (
    'internal',
    'member'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.beta_feedback_submission
  ADD COLUMN IF NOT EXISTS member_last_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS asana_task_gid text,
  ADD COLUMN IF NOT EXISTS asana_task_url text,
  ADD COLUMN IF NOT EXISTS asana_task_created_at timestamptz;

CREATE TABLE IF NOT EXISTS public.beta_feedback_comment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  feedback_submission_id uuid NOT NULL REFERENCES public.beta_feedback_submission(id) ON DELETE CASCADE,
  author_member_id uuid REFERENCES public.member(id) ON DELETE SET NULL,
  author_name text,
  author_email text,
  author_kind text NOT NULL DEFAULT 'member',
  visibility beta_feedback_comment_visibility NOT NULL DEFAULT 'member',
  body text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_beta_feedback_comment_feedback_created
  ON public.beta_feedback_comment (feedback_submission_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_beta_feedback_comment_visibility_created
  ON public.beta_feedback_comment (visibility, created_at DESC);

ALTER TABLE public.beta_feedback_comment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "beta_feedback_submission: members select own rows"
  ON public.beta_feedback_submission;
CREATE POLICY "beta_feedback_submission: members select own rows"
  ON public.beta_feedback_submission
  FOR SELECT
  TO authenticated
  USING (member_id = auth.uid());

DROP POLICY IF EXISTS "beta_feedback_submission: members insert own rows"
  ON public.beta_feedback_submission;
CREATE POLICY "beta_feedback_submission: members insert own rows"
  ON public.beta_feedback_submission
  FOR INSERT
  TO authenticated
  WITH CHECK (member_id = auth.uid());

DROP POLICY IF EXISTS "beta_feedback_comment: members select own visible rows"
  ON public.beta_feedback_comment;
CREATE POLICY "beta_feedback_comment: members select own visible rows"
  ON public.beta_feedback_comment
  FOR SELECT
  TO authenticated
  USING (
    visibility = 'member'
    AND EXISTS (
      SELECT 1
      FROM public.beta_feedback_submission submission
      WHERE submission.id = feedback_submission_id
        AND submission.member_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "beta_feedback_comment: members insert own visible rows"
  ON public.beta_feedback_comment;
CREATE POLICY "beta_feedback_comment: members insert own visible rows"
  ON public.beta_feedback_comment
  FOR INSERT
  TO authenticated
  WITH CHECK (
    visibility = 'member'
    AND author_member_id = auth.uid()
    AND author_kind = 'member'
    AND EXISTS (
      SELECT 1
      FROM public.beta_feedback_submission submission
      WHERE submission.id = feedback_submission_id
        AND submission.member_id = auth.uid()
    )
  );

COMMENT ON TABLE public.beta_feedback_comment IS
  'Discussion thread entries for beta feedback, including internal-only notes and member-visible clarification replies.';

COMMENT ON COLUMN public.beta_feedback_submission.member_last_viewed_at IS
  'When the reporting member last opened the feedback thread, used to calculate unread admin replies.';

COMMENT ON COLUMN public.beta_feedback_submission.asana_task_gid IS
  'Asana task created when a super admin approves the feedback for development.';

COMMENT ON COLUMN public.beta_feedback_submission.asana_task_url IS
  'Permalink to the Asana task created from approved beta feedback.';

COMMENT ON COLUMN public.beta_feedback_submission.asana_task_created_at IS
  'When the Asana development task was created from this feedback record.';

DROP TRIGGER IF EXISTS beta_feedback_comment_updated_at ON public.beta_feedback_comment;
CREATE TRIGGER beta_feedback_comment_updated_at
  BEFORE UPDATE ON public.beta_feedback_comment
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

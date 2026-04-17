-- Beta feedback intake and triage workflow.
-- Supports lightweight member-submitted bug/UX/content reports with
-- optional private screenshot uploads and internal admin triage state.

DO $$
BEGIN
  CREATE TYPE beta_feedback_status AS ENUM (
    'new',
    'triaged',
    'investigating',
    'waiting_on_member',
    'resolved',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE beta_feedback_severity AS ENUM (
    'low',
    'medium',
    'high',
    'blocker'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE beta_feedback_category AS ENUM (
    'bug',
    'ux',
    'content',
    'billing',
    'performance',
    'idea',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.beta_feedback_submission (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  member_id uuid REFERENCES public.member(id) ON DELETE SET NULL,
  member_email text NOT NULL,
  member_name text,
  summary text NOT NULL,
  details text NOT NULL,
  expected_behavior text,
  category beta_feedback_category NOT NULL DEFAULT 'bug',
  severity beta_feedback_severity NOT NULL DEFAULT 'medium',
  status beta_feedback_status NOT NULL DEFAULT 'new',
  page_path text,
  page_url text,
  app_release text,
  browser_name text,
  os_name text,
  device_type text,
  viewport_width integer,
  viewport_height integer,
  user_agent text,
  timezone text,
  loom_url text,
  screenshot_storage_path text,
  screenshot_file_name text,
  screenshot_content_type text,
  screenshot_size_bytes integer,
  assigned_member_id uuid REFERENCES public.member(id) ON DELETE SET NULL,
  triage_notes text,
  stripe_customer_id text,
  subscription_tier text,
  subscription_status text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_beta_feedback_status_created
  ON public.beta_feedback_submission (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_beta_feedback_severity_created
  ON public.beta_feedback_submission (severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_beta_feedback_member
  ON public.beta_feedback_submission (member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_beta_feedback_assigned
  ON public.beta_feedback_submission (assigned_member_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_beta_feedback_email
  ON public.beta_feedback_submission (member_email, created_at DESC);

ALTER TABLE public.beta_feedback_submission ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.beta_feedback_submission IS
  'Internal beta feedback reports submitted by members with technical context and admin triage state.';

DROP TRIGGER IF EXISTS beta_feedback_submission_updated_at ON public.beta_feedback_submission;
CREATE TRIGGER beta_feedback_submission_updated_at
  BEFORE UPDATE ON public.beta_feedback_submission
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'beta-feedback-uploads',
  'beta-feedback-uploads',
  false,
  8388608,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

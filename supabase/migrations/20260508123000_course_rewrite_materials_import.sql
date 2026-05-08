-- Course commerce/delivery rewrite groundwork.
-- Keeps existing course commerce intact while adding the three-level course
-- model fields, structured resources, enrollment resume state, and a
-- compatibility bridge from legacy course_session rows.

ALTER TABLE public.course
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS full_description text,
  ADD COLUMN IF NOT EXISTS promo_video_url text,
  ADD COLUMN IF NOT EXISTS estimated_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS what_you_get jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS access_type text NOT NULL DEFAULT 'membership_included',
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'usd',
  ADD COLUMN IF NOT EXISTS display_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS learndash_source jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.course
  DROP CONSTRAINT IF EXISTS course_access_type_check,
  ADD CONSTRAINT course_access_type_check
    CHECK (access_type IN ('free', 'paid', 'membership_included', 'manual'));

ALTER TABLE public.course
  DROP CONSTRAINT IF EXISTS course_visibility_check,
  ADD CONSTRAINT course_visibility_check
    CHECK (visibility IN ('public', 'members', 'hidden'));

ALTER TABLE public.course
  DROP CONSTRAINT IF EXISTS course_currency_check,
  ADD CONSTRAINT course_currency_check
    CHECK (currency ~ '^[a-z]{3}$');

UPDATE public.course
SET
  short_description = COALESCE(short_description, description),
  full_description = COALESCE(full_description, description),
  access_type = CASE
    WHEN is_standalone_purchasable THEN 'paid'
    WHEN tier_min IS NOT NULL THEN 'membership_included'
    ELSE access_type
  END
WHERE short_description IS NULL
   OR full_description IS NULL
   OR access_type = 'membership_included';

ALTER TABLE public.course_lesson
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS status content_status NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS is_preview boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS source_system text,
  ADD COLUMN IF NOT EXISTS source_id text,
  ADD COLUMN IF NOT EXISTS source_parent_id text,
  ADD COLUMN IF NOT EXISTS source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS migrated_from_session_id uuid REFERENCES public.course_session(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_course_lesson_module_status_sort
  ON public.course_lesson (module_id, status, sort_order);

CREATE INDEX IF NOT EXISTS idx_course_lesson_slug
  ON public.course_lesson (slug)
  WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_course_lesson_migrated_session
  ON public.course_lesson (migrated_from_session_id)
  WHERE migrated_from_session_id IS NOT NULL;

ALTER TABLE public.course_entitlement
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_accessed_lesson_id uuid REFERENCES public.course_lesson(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS progress_percent integer NOT NULL DEFAULT 0;

ALTER TABLE public.course_entitlement
  DROP CONSTRAINT IF EXISTS course_entitlement_progress_percent_check,
  ADD CONSTRAINT course_entitlement_progress_percent_check
    CHECK (progress_percent >= 0 AND progress_percent <= 100);

CREATE INDEX IF NOT EXISTS idx_course_entitlement_resume
  ON public.course_entitlement (member_id, course_id, status, last_accessed_at DESC);

ALTER TABLE public.course_progress
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz;

ALTER TABLE public.course_progress
  DROP CONSTRAINT IF EXISTS course_progress_status_check,
  ADD CONSTRAINT course_progress_status_check
    CHECK (status IN ('not_started', 'in_progress', 'completed'));

UPDATE public.course_progress
SET
  status = CASE WHEN completed THEN 'completed' ELSE 'in_progress' END,
  started_at = COALESCE(started_at, created_at),
  last_viewed_at = COALESCE(last_viewed_at, updated_at, created_at)
WHERE completed = true
   OR video_watch_percent > 0
   OR started_at IS NULL
   OR last_viewed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.course_resource (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.course(id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.course_module(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.course_lesson(id) ON DELETE CASCADE,
  media_asset_id uuid REFERENCES public.media_asset(id) ON DELETE SET NULL,
  scope text NOT NULL DEFAULT 'lesson',
  label text NOT NULL,
  description text,
  url text NOT NULL,
  s3_key text,
  source_url text,
  source_system text,
  source_id text,
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  file_type text NOT NULL DEFAULT 'file',
  content_type text,
  size_bytes bigint,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  import_status text NOT NULL DEFAULT 'external',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT course_resource_scope_check
    CHECK (scope IN ('course', 'module', 'lesson')),
  CONSTRAINT course_resource_status_check
    CHECK (status IN ('active', 'archived', 'failed')),
  CONSTRAINT course_resource_import_status_check
    CHECK (import_status IN ('copied', 'external', 'failed', 'manual')),
  CONSTRAINT course_resource_target_check
    CHECK (
      (scope = 'course' AND module_id IS NULL AND lesson_id IS NULL)
      OR (scope = 'module' AND module_id IS NOT NULL AND lesson_id IS NULL)
      OR (scope = 'lesson' AND lesson_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_course_resource_course_scope_sort
  ON public.course_resource (course_id, scope, sort_order);

CREATE INDEX IF NOT EXISTS idx_course_resource_lesson_sort
  ON public.course_resource (lesson_id, sort_order)
  WHERE lesson_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_course_resource_import_status
  ON public.course_resource (import_status, status);

DROP TRIGGER IF EXISTS course_resource_updated_at ON public.course_resource;
CREATE TRIGGER course_resource_updated_at
  BEFORE UPDATE ON public.course_resource
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.course_resource ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read active course resources"
  ON public.course_resource;
CREATE POLICY "Members can read active course resources"
  ON public.course_resource FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Compatibility bridge: imported LearnDash topics used to live as sessions.
-- Convert them into lessons once, preserving the original rows as source data.
INSERT INTO public.course_lesson (
  module_id,
  title,
  description,
  body,
  video_url,
  duration_seconds,
  resources,
  sort_order,
  status,
  source_system,
  source_id,
  source_parent_id,
  source_metadata,
  migrated_from_session_id
)
SELECT
  s.module_id,
  s.title,
  s.description,
  s.body,
  s.video_url,
  s.duration_seconds,
  s.resources,
  (COALESCE(parent.sort_order, 0) * 1000) + s.sort_order,
  'published'::content_status,
  'legacy_course_session',
  s.id::text,
  s.lesson_id::text,
  jsonb_build_object('legacy_session_id', s.id, 'legacy_lesson_id', s.lesson_id),
  s.id
FROM public.course_session s
LEFT JOIN public.course_lesson parent ON parent.id = s.lesson_id
WHERE s.lesson_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.course_lesson existing
    WHERE existing.migrated_from_session_id = s.id
  );

UPDATE public.course_lesson parent
SET status = 'archived'::content_status
WHERE EXISTS (
    SELECT 1 FROM public.course_session s WHERE s.lesson_id = parent.id
  )
  AND parent.migrated_from_session_id IS NULL
  AND NULLIF(BTRIM(COALESCE(parent.body, '')), '') IS NULL
  AND NULLIF(BTRIM(COALESCE(parent.video_url, '')), '') IS NULL
  AND NULLIF(BTRIM(COALESCE(parent.resources, '')), '') IS NULL
  AND NULLIF(BTRIM(COALESCE(parent.description, '')), '') IS NULL;

INSERT INTO public.course_progress (
  member_id,
  course_id,
  course_lesson_id,
  video_watch_percent,
  completed,
  auto_completed,
  completed_at,
  status,
  started_at,
  last_viewed_at
)
SELECT
  p.member_id,
  p.course_id,
  migrated.id,
  p.video_watch_percent,
  p.completed,
  p.auto_completed,
  p.completed_at,
  CASE WHEN p.completed THEN 'completed' ELSE 'in_progress' END,
  COALESCE(p.started_at, p.created_at),
  COALESCE(p.last_viewed_at, p.updated_at, p.created_at)
FROM public.course_progress p
JOIN public.course_lesson migrated
  ON migrated.migrated_from_session_id = p.course_session_id
WHERE p.course_session_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.course_progress existing
    WHERE existing.member_id = p.member_id
      AND existing.course_lesson_id = migrated.id
  );

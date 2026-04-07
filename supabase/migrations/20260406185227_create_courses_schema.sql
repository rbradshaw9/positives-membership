
-- ============================================================
-- Courses schema: three-tier hierarchy
--   Course → Module → Session
-- Sessions can optionally link to existing content rows for media.
-- ============================================================

-- Course = top-level container
CREATE TABLE public.course (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  slug        text UNIQUE,
  description text,
  cover_image_url text,
  status      content_status NOT NULL DEFAULT 'draft',
  tier_min    subscription_tier,
  sort_order  int NOT NULL DEFAULT 0,
  admin_notes text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.course ENABLE ROW LEVEL SECURITY;

-- Admin full access via service role; members read published
CREATE POLICY "Members can read published courses"
  ON public.course FOR SELECT
  USING (status = 'published');

-- Module = grouping within a course
CREATE TABLE public.course_module (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid NOT NULL REFERENCES public.course(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_module ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read modules of published courses"
  ON public.course_module FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course
      WHERE course.id = course_module.course_id
        AND course.status = 'published'
    )
  );

-- Session = individual lesson within a module
-- content_id is optional — allows linking to existing content for media
CREATE TABLE public.course_session (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id   uuid NOT NULL REFERENCES public.course_module(id) ON DELETE CASCADE,
  content_id  uuid REFERENCES public.content(id) ON DELETE SET NULL,
  title       text NOT NULL,
  description text,
  body        text,
  duration_seconds int,
  video_url   text,
  mux_playback_id text,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_session ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read sessions of published courses"
  ON public.course_session FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.course_module m
      JOIN public.course c ON c.id = m.course_id
      WHERE m.id = course_session.module_id
        AND c.status = 'published'
    )
  );

-- Indexes
CREATE INDEX idx_course_module_course_id ON public.course_module(course_id);
CREATE INDEX idx_course_session_module_id ON public.course_session(module_id);
CREATE INDEX idx_course_session_content_id ON public.course_session(content_id);
CREATE INDEX idx_course_status ON public.course(status);
;

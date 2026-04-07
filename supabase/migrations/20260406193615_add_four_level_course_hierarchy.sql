
-- ── 1. Create course_lesson table (sits between module and session) ──────────
CREATE TABLE IF NOT EXISTS public.course_lesson (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id      UUID        NOT NULL REFERENCES public.course_module(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  description    TEXT,
  body           TEXT,
  video_url      TEXT,
  duration_seconds INTEGER,
  resources      TEXT,        -- JSON array of {label, url, type}
  sort_order     INTEGER     NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ── 2. Add lesson_id to course_session ──────────────────────────────────────
ALTER TABLE public.course_session
  ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES public.course_lesson(id) ON DELETE CASCADE;

-- ── 3. RLS — inherit same open policy as other course tables ─────────────────
ALTER TABLE public.course_lesson ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access" ON public.course_lesson
  USING (true) WITH CHECK (true);
;

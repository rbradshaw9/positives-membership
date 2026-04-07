-- Allow video_views to track course lesson progress alongside content progress
ALTER TABLE video_views
  ADD COLUMN course_lesson_id uuid REFERENCES course_lesson(id) ON DELETE CASCADE;

-- Make content_id nullable (course lessons don't have a content row)
ALTER TABLE video_views
  ALTER COLUMN content_id DROP NOT NULL;

-- Index for fast resume lookups by lesson
CREATE INDEX idx_video_views_lesson ON video_views (user_id, course_lesson_id)
  WHERE course_lesson_id IS NOT NULL;

-- Unique constraint: one row per user per lesson
CREATE UNIQUE INDEX video_views_user_lesson_unique
  ON video_views (user_id, course_lesson_id)
  WHERE course_lesson_id IS NOT NULL;

-- RLS: existing policies already cover user_id = auth.uid() checks;

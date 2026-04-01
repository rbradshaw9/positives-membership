-- =============================================================================
-- supabase/seed.sql
-- Positives Platform — Development Seed Data
-- =============================================================================
-- Inserts a minimal set of test content rows to make /today functional
-- immediately after migrations are applied.
--
-- Apply with:
--   psql $DATABASE_URL < supabase/seed.sql
-- or paste into the Supabase SQL editor.
--
-- Safe to re-run — uses ON CONFLICT DO NOTHING.
-- Do NOT apply to production. Use the admin interface for real content.
--
-- Sprint 10 fix: removed obsolete is_active and published_at columns;
-- uses status='published' and corrected column names per current schema.

INSERT INTO public.content (
  id,
  title,
  description,
  type,
  duration_seconds,
  status,
  publish_date,
  source
)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Morning Grounding',
  'A short audio practice to start your day with calm and clarity. Dr. Paul guides you through a simple grounding exercise designed to settle your nervous system before the day begins.',
  'daily_audio',
  480,  -- 8 minutes
  'published',
  CURRENT_DATE,
  'admin'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 0013_mux_video_tracking.sql
-- Positives Platform — Mux Video Tracking Backfill Migration
-- =============================================================================
-- These objects were added directly via SQL (not through a migration file)
-- during the Mux video migration in early April 2026.
-- This migration captures them in version control for reproducibility.
--
-- Safe to run: All statements use IF NOT EXISTS / DO block guards.
-- =============================================================================

-- ─── Mux columns on content ──────────────────────────────────────────────────

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS mux_asset_id    TEXT,
  ADD COLUMN IF NOT EXISTS mux_playback_id TEXT;

COMMENT ON COLUMN content.mux_asset_id    IS
  'Mux asset ID — used for deletion / dashboard lookup. Added via Mux upload panel.';
COMMENT ON COLUMN content.mux_playback_id IS
  'Mux playback ID — used by VideoEmbed MuxPlayer component for streaming delivery.';

-- ─── video_views table ───────────────────────────────────────────────────────
-- Per-member video watch progress for resume, milestone tracking, and analytics.
-- One row per (user_id, content_id) OR (user_id, mux_asset_id) — upserted on watch events.

CREATE TABLE IF NOT EXISTS video_views (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id         UUID        REFERENCES content(id) ON DELETE CASCADE,
  mux_asset_id       TEXT,                -- fallback key when no content_id
  mux_playback_id    TEXT,                -- informational; may change on video replace
  watch_percent      INTEGER     NOT NULL DEFAULT 0 CHECK (watch_percent BETWEEN 0 AND 100),
  completed          BOOLEAN     NOT NULL DEFAULT FALSE,
  resume_at_seconds  NUMERIC(10,2) NOT NULL DEFAULT 0,
  started_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_count      INTEGER     NOT NULL DEFAULT 1
);

-- Indexes for the lookup patterns used in video-actions.ts
CREATE INDEX IF NOT EXISTS idx_video_views_user_content
  ON video_views (user_id, content_id)
  WHERE content_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_video_views_user_mux
  ON video_views (user_id, mux_asset_id)
  WHERE mux_asset_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_video_views_user_last_seen
  ON video_views (user_id, last_seen_at DESC);

-- ─── RLS for video_views ─────────────────────────────────────────────────────

ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;

-- Members can only see their own video views
CREATE POLICY IF NOT EXISTS "video_views_select_own"
  ON video_views FOR SELECT
  USING (auth.uid() = user_id);

-- Members can insert their own video views
CREATE POLICY IF NOT EXISTS "video_views_insert_own"
  ON video_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Members can update their own video views
CREATE POLICY IF NOT EXISTS "video_views_update_own"
  ON video_views FOR UPDATE
  USING (auth.uid() = user_id);

-- ─── Notes ───────────────────────────────────────────────────────────────────
-- This migration captures schema state as of 2026-04-06.
-- video_views rows were written to the DB before this migration existed.
-- The data is intact; this file just adds version-control coverage.
-- =============================================================================

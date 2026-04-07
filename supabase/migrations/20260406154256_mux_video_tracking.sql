-- =============================================================================
-- 0013_mux_video_tracking.sql
-- Positives Platform — Mux Video Tracking Backfill Migration
-- =============================================================================
-- Captures schema objects added directly during the Mux video migration
-- in early April 2026. All statements are idempotent.
-- =============================================================================

-- ─── Mux columns on content ──────────────────────────────────────────────────

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS mux_asset_id    TEXT,
  ADD COLUMN IF NOT EXISTS mux_playback_id TEXT;

COMMENT ON COLUMN content.mux_asset_id    IS
  'Mux asset ID — used for deletion / dashboard lookup.';
COMMENT ON COLUMN content.mux_playback_id IS
  'Mux playback ID — used by VideoEmbed MuxPlayer for streaming delivery.';

-- ─── video_views table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS video_views (
  id                 UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id         UUID          REFERENCES content(id) ON DELETE CASCADE,
  mux_asset_id       TEXT,
  mux_playback_id    TEXT,
  watch_percent      INTEGER       NOT NULL DEFAULT 0 CHECK (watch_percent BETWEEN 0 AND 100),
  completed          BOOLEAN       NOT NULL DEFAULT FALSE,
  resume_at_seconds  NUMERIC(10,2) NOT NULL DEFAULT 0,
  started_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  last_seen_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  session_count      INTEGER       NOT NULL DEFAULT 1
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_video_views_user_content
  ON video_views (user_id, content_id)
  WHERE content_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_video_views_user_mux
  ON video_views (user_id, mux_asset_id)
  WHERE mux_asset_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_video_views_user_last_seen
  ON video_views (user_id, last_seen_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'video_views' AND policyname = 'video_views_select_own'
  ) THEN
    CREATE POLICY video_views_select_own
      ON video_views FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'video_views' AND policyname = 'video_views_insert_own'
  ) THEN
    CREATE POLICY video_views_insert_own
      ON video_views FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'video_views' AND policyname = 'video_views_update_own'
  ) THEN
    CREATE POLICY video_views_update_own
      ON video_views FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;;

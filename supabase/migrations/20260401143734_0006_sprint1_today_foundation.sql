-- =============================================================================
-- 0006_sprint1_today_foundation.sql
-- Positives Platform — Sprint 1: Today Comes Alive
-- =============================================================================

-- ─── Content status enum ──────────────────────────────────────────────────────
CREATE TYPE content_status AS ENUM (
  'draft',
  'ready_for_review',
  'published',
  'archived'
);

-- ─── Content source enum ──────────────────────────────────────────────────────
CREATE TYPE content_source AS ENUM (
  'gdrive',
  'vimeo',
  'admin'
);

-- ─── Activity event type enum ─────────────────────────────────────────────────
CREATE TYPE activity_event_type AS ENUM (
  'session_start',
  'daily_listened',
  'daily_started',
  'weekly_viewed',
  'monthly_viewed',
  'note_created',
  'note_updated',
  'journal_opened',
  'event_attended',
  'qa_submitted',
  'qa_viewed',
  'milestone_reached',
  'upgrade_prompt_seen',
  'upgrade_clicked'
);

-- ─── Content table additions ──────────────────────────────────────────────────
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS status            content_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS publish_date      DATE,
  ADD COLUMN IF NOT EXISTS week_start        DATE,
  ADD COLUMN IF NOT EXISTS month_year        TEXT,
  ADD COLUMN IF NOT EXISTS excerpt           TEXT,
  ADD COLUMN IF NOT EXISTS source            content_source NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS source_ref        TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes       TEXT,
  ADD COLUMN IF NOT EXISTS is_today_override BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── Member table additions ───────────────────────────────────────────────────
ALTER TABLE member
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/New_York';

-- ─── Activity event table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_event (
  id          UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id   UUID                NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  event_type  activity_event_type NOT NULL,
  content_id  UUID                REFERENCES content(id) ON DELETE SET NULL,
  metadata    JSONB,
  occurred_at TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ─── Activity event indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_activity_event_member_id
  ON activity_event (member_id);

CREATE INDEX IF NOT EXISTS idx_activity_event_member_occurred_at
  ON activity_event (member_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_event_type
  ON activity_event (event_type);

-- ─── Content indexes for Today page queries ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_content_publish_date
  ON content (publish_date)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_content_week_start
  ON content (week_start)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_content_month_year
  ON content (month_year)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_content_status_type
  ON content (status, type);

CREATE INDEX IF NOT EXISTS idx_content_today_override
  ON content (is_today_override)
  WHERE is_today_override = TRUE AND status = 'published';

-- ─── Journal table additions ──────────────────────────────────────────────────
ALTER TABLE journal
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TRIGGER journal_updated_at
  BEFORE UPDATE ON journal
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Backfill existing published content ─────────────────────────────────────
UPDATE content
SET status = 'published'
WHERE is_active = TRUE
  AND status = 'draft';;

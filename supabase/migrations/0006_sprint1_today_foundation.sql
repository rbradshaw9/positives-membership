-- =============================================================================
-- 0006_sprint1_today_foundation.sql
-- Positives Platform — Sprint 1: Today Comes Alive
-- =============================================================================
-- Adds the content publishing workflow, engagement tracking foundation,
-- and journal update tracking needed for the Sprint 1 Today experience.
--
-- Impacted tables: content, member, journal
-- New table:       activity_event
-- New enums:       content_status, content_source, activity_event_type
-- =============================================================================

-- ─── Content status enum ──────────────────────────────────────────────────────
-- draft             → being written / not ready
-- ready_for_review  → ingestion complete, awaiting admin sign-off
-- published         → live; eligible for Today page queries
-- archived          → explicitly removed from all surfaces (admin action only)

CREATE TYPE content_status AS ENUM (
  'draft',
  'ready_for_review',
  'published',
  'archived'
);

-- ─── Content source enum ──────────────────────────────────────────────────────
CREATE TYPE content_source AS ENUM (
  'gdrive',   -- from Google Drive ingestion pipeline (Sprint 5)
  'vimeo',    -- direct Vimeo reference
  'admin'     -- manually created/seeded by admin
);

-- ─── Activity event type enum ─────────────────────────────────────────────────
-- Full event vocabulary defined now even though most types aren't fired until
-- later sprints. The enum itself is cheap; adding new values later is cheap.
-- Only 'daily_listened' is fired in Sprint 1.

CREATE TYPE activity_event_type AS ENUM (
  'session_start',       -- member logged in / session begins (Sprint 2)
  'daily_listened',      -- daily audio reached 80% threshold — WIRED IN SPRINT 1
  'daily_started',       -- daily audio started but not completed (Sprint 2+)
  'weekly_viewed',       -- weekly principle card was viewed (Sprint 2)
  'monthly_viewed',      -- monthly theme card was viewed (Sprint 2)
  'note_created',        -- member wrote a note/journal entry (Sprint 2)
  'note_updated',        -- member edited an existing note (Sprint 2)
  'journal_opened',      -- member opened the journal/notes view (Sprint 2)
  'event_attended',      -- attended a live event (Sprint 4+)
  'qa_submitted',        -- submitted a Q&A question (Sprint 4+)
  'qa_viewed',           -- viewed Q&A content (Sprint 4+)
  'milestone_reached',   -- streak or engagement milestone (Sprint 6+)
  'upgrade_prompt_seen', -- upgrade prompt shown to member (Sprint 4+)
  'upgrade_clicked'      -- member clicked an upgrade CTA (Sprint 4+)
);

-- ─── Content table additions ──────────────────────────────────────────────────

ALTER TABLE content
  -- Publishing state. All new rows default to 'draft'.
  -- Existing rows are backfilled below.
  ADD COLUMN IF NOT EXISTS status            content_status NOT NULL DEFAULT 'draft',

  -- Calendar date (Eastern) this daily_audio should appear on Today.
  -- Only used for type='daily_audio'.
  ADD COLUMN IF NOT EXISTS publish_date      DATE,

  -- The Monday that starts the week this weekly_principle is active.
  -- Only used for type='weekly_principle'.
  ADD COLUMN IF NOT EXISTS week_start        DATE,

  -- 'YYYY-MM' string matching the month this monthly_theme covers.
  -- Only used for type='monthly_theme'.
  ADD COLUMN IF NOT EXISTS month_year        TEXT,

  -- Short pull-quote / excerpt shown on Today cards.
  -- Used by Weekly and Monthly cards; optional for Daily.
  ADD COLUMN IF NOT EXISTS excerpt           TEXT,

  -- Where this content came from.
  ADD COLUMN IF NOT EXISTS source            content_source NOT NULL DEFAULT 'admin',

  -- Reference ID in the source system (Drive file ID, Vimeo video ID, etc.)
  ADD COLUMN IF NOT EXISTS source_ref        TEXT,

  -- Internal-only notes for admin use. Never member-facing.
  ADD COLUMN IF NOT EXISTS admin_notes       TEXT,

  -- Admin override: force this record to appear as today's Daily regardless
  -- of publish_date. Used for late uploads, corrections. Sprint 3 UI.
  ADD COLUMN IF NOT EXISTS is_today_override BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── Member table additions ───────────────────────────────────────────────────

ALTER TABLE member
  -- IANA timezone string for the member.
  -- Stored now for future Option B timezone-aware rendering (Sprint 4+).
  -- NOT used for Today rendering in Sprint 1— all queries use America/New_York.
  -- Default covers ~85% of U.S. audience safely.
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/New_York';

-- ─── Activity event table ─────────────────────────────────────────────────────
-- Append-only general event log for all member behavior.
-- Powers: analytics, retention, marketing automations, unlock/bonus triggers.
-- Sits alongside `progress` (content-specific) — not a replacement for it.

CREATE TABLE IF NOT EXISTS activity_event (
  id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id   UUID            NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  event_type  activity_event_type NOT NULL,
  content_id  UUID            REFERENCES content(id) ON DELETE SET NULL,  -- nullable
  metadata    JSONB,           -- flexible per-event context; see memo for shape
  occurred_at TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ─── Activity event indexes ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_activity_event_member_id
  ON activity_event (member_id);

CREATE INDEX IF NOT EXISTS idx_activity_event_member_occurred_at
  ON activity_event (member_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_event_type
  ON activity_event (event_type);

-- ─── Content indexes for Today page queries ───────────────────────────────────
-- Partial indexes on status='published' for Today content queries.

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
-- Add updated_at so members can edit notes (Sprint 2 UI).
-- Uses the repo's existing update_updated_at_column() trigger function
-- (defined in 0001, fixed/hardened in 0004).

ALTER TABLE journal
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TRIGGER journal_updated_at
  BEFORE UPDATE ON journal
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Backfill: migrate existing published content ─────────────────────────────
-- Rows with is_active = TRUE were the old "published" state.
-- Mark them as 'published' in the new status field so they remain queryable.
-- The is_active column is NOT removed — it stays for backward compat until
-- all queries are migrated to status-based filtering.

UPDATE content
SET status = 'published'
WHERE is_active = TRUE
  AND status = 'draft';  -- only backfill rows that haven't been touched

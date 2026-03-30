-- =============================================================================
-- 0001_initial_schema.sql
-- Positives Platform — Schema v1
-- =============================================================================
-- Creates the 5 core tables for the Positives platform.
-- Milestone 01 scope: member, content, progress, journal, community_post.
-- Coaching, analytics, and ingestion job tables will be added in later milestones.

-- ─── Extensions ──────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE subscription_status AS ENUM (
  'active',
  'past_due',
  'canceled',
  'trialing',
  'inactive'
);

CREATE TYPE subscription_tier AS ENUM (
  'level_1',
  'level_2',
  'level_3',
  'level_4'
);

CREATE TYPE content_type AS ENUM (
  'daily_audio',
  'weekly_principle',
  'monthly_theme',
  'library',
  'workshop'
);

CREATE TYPE community_post_type AS ENUM (
  'reflection',
  'question',
  'share'
);

-- ─── member ──────────────────────────────────────────────────────────────────
-- One row per authenticated user. id = auth.uid().
-- subscription_status is mirrored from Stripe via webhooks.
-- Stripe is the authoritative billing source — never trust client-side state.

CREATE TABLE IF NOT EXISTS member (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT NOT NULL,
  name                  TEXT,
  avatar_url            TEXT,
  stripe_customer_id    TEXT UNIQUE,
  subscription_status   subscription_status NOT NULL DEFAULT 'inactive',
  subscription_tier     subscription_tier,
  subscription_end_date TIMESTAMPTZ,
  practice_streak       INTEGER NOT NULL DEFAULT 0,
  last_practiced_at     TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_stripe_customer_id
  ON member (stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_member_subscription_status
  ON member (subscription_status);

-- ─── content ─────────────────────────────────────────────────────────────────
-- All publishable content records.
-- Supports daily audio, weekly principles, monthly themes, library, workshops.
-- Audio delivered via S3 / Castos.
-- Video delivered via Vimeo.
-- AI-generated metadata fields filled by the ingestion pipeline.

CREATE TABLE IF NOT EXISTS content (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title                   TEXT NOT NULL,
  description             TEXT,
  type                    content_type NOT NULL,
  vimeo_video_id          TEXT,
  s3_audio_key            TEXT,
  castos_episode_url      TEXT,
  transcription           TEXT,
  ai_generated_title      TEXT,
  ai_generated_description TEXT,
  duration_seconds        INTEGER,
  published_at            TIMESTAMPTZ,
  month_theme             TEXT,
  tags                    TEXT[] NOT NULL DEFAULT '{}',
  is_active               BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_type
  ON content (type);

CREATE INDEX IF NOT EXISTS idx_content_published_at
  ON content (published_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_is_active
  ON content (is_active);

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_updated_at
  BEFORE UPDATE ON content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── progress ────────────────────────────────────────────────────────────────
-- Tracks a member's listening history and completion state.
-- One row per listen event (not per content item).

CREATE TABLE IF NOT EXISTS progress (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id       UUID NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  content_id      UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  listened_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed       BOOLEAN NOT NULL DEFAULT FALSE,
  reflection_text TEXT
);

CREATE INDEX IF NOT EXISTS idx_progress_member_id
  ON progress (member_id);

CREATE INDEX IF NOT EXISTS idx_progress_content_id
  ON progress (content_id);

CREATE INDEX IF NOT EXISTS idx_progress_member_listened_at
  ON progress (member_id, listened_at DESC);

-- ─── journal ─────────────────────────────────────────────────────────────────
-- Private journal entries written by members.
-- Optionally linked to a content item (reflection after listening).

CREATE TABLE IF NOT EXISTS journal (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id   UUID NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  content_id  UUID REFERENCES content(id) ON DELETE SET NULL,
  entry_text  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_member_id
  ON journal (member_id);

CREATE INDEX IF NOT EXISTS idx_journal_member_created_at
  ON journal (member_id, created_at DESC);

-- ─── community_post ──────────────────────────────────────────────────────────
-- Community posts from members (reflections, questions, shares).
-- Readable by all authenticated active members.
-- Writable only by the post owner.

CREATE TABLE IF NOT EXISTS community_post (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id   UUID NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  content_id  UUID REFERENCES content(id) ON DELETE SET NULL,
  body        TEXT NOT NULL,
  post_type   community_post_type NOT NULL DEFAULT 'reflection',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_post_member_id
  ON community_post (member_id);

CREATE INDEX IF NOT EXISTS idx_community_post_created_at
  ON community_post (created_at DESC);

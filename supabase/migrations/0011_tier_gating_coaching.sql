-- =============================================================================
-- 0011_tier_gating_coaching.sql
-- Sprint 10: Tier-gated access + coaching content type
--
-- Changes:
--   1. Add `coaching_call` to the content_type enum
--   2. Add `tier_min` (nullable subscription_tier) to content table
--   3. Add `starts_at` (nullable TIMESTAMPTZ) to content table
--   4. Add `coaching_attended` to activity_event_type enum
--   5. Index on starts_at for coaching queries
--
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction block.
-- Supabase remote migrations run outside transactions by default — this is safe.
-- Apply locally with: psql $DATABASE_URL < supabase/migrations/0011_tier_gating_coaching.sql
-- =============================================================================

-- 1. Extend content_type enum
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'coaching_call';

-- 2. Add tier_min to content
--    NULL = visible to all tiers (existing content is unaffected)
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS tier_min subscription_tier;

-- 3. Add starts_at for time-aware content (coaching calls, future events)
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;

-- 4. Extend activity_event_type enum
ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'coaching_attended';

-- 5. Index for upcoming coaching queries
CREATE INDEX IF NOT EXISTS idx_content_starts_at
  ON public.content (starts_at)
  WHERE status = 'published' AND type = 'coaching_call';

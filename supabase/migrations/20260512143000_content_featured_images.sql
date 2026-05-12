ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS featured_image_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_image_url TEXT;

COMMENT ON COLUMN public.content.featured_image_url IS
  'Optional member-facing artwork for Daily, Weekly, Monthly, and library content. Usually points to /api/media/assets/{id}.';

COMMENT ON COLUMN public.content.thumbnail_image_url IS
  'Optional compact artwork or video poster for content cards. Falls back to featured_image_url when null.';

ALTER TABLE public.media_asset
  DROP CONSTRAINT IF EXISTS media_asset_usage_context_check;

ALTER TABLE public.media_asset
  ADD CONSTRAINT media_asset_usage_context_check
  CHECK (usage_context IN ('event', 'course', 'content', 'daily_practice', 'member', 'admin', 'general'));

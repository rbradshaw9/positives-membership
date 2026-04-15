-- Remove retired video-provider and affiliate-provider columns now that
-- Positives uses Vimeo and FirstPromoter. Historical migrations remain intact;
-- this forward migration makes the current schema match the current product
-- architecture.

DROP INDEX IF EXISTS public.idx_content_mux_playback_id;
DROP INDEX IF EXISTS public.idx_video_views_user_mux;
DROP INDEX IF EXISTS public.video_views_user_mux_asset_idx;

ALTER TABLE public.content
  DROP COLUMN IF EXISTS mux_asset_id,
  DROP COLUMN IF EXISTS mux_playback_id;

ALTER TABLE public.video_views
  DROP COLUMN IF EXISTS mux_asset_id,
  DROP COLUMN IF EXISTS mux_playback_id;

ALTER TABLE public.course_session
  DROP COLUMN IF EXISTS mux_playback_id;

ALTER TABLE public.member
  DROP COLUMN IF EXISTS rewardful_referral_id,
  DROP COLUMN IF EXISTS rewardful_affiliate_token,
  DROP COLUMN IF EXISTS rewardful_affiliate_id;

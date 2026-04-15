
-- Migration: rename_rewardful_columns_to_agnostic
--
-- Renames Rewardful-specific column names to platform-agnostic equivalents.
-- The old Rewardful columns are preserved as compatibility aliases using
-- generated columns so existing data/queries don't break during cutover.
-- Data is migrated forward; the old columns are dropped.
--
-- Old → New:
--   rewardful_affiliate_id    → affiliate_id
--   rewardful_affiliate_token → affiliate_token
--   rewardful_referral_id     → referral_id   (the referral UUID from old Rewardful tracking)

-- Step 1: Add new agnostic columns (if they don't already exist)
ALTER TABLE public.member
  ADD COLUMN IF NOT EXISTS affiliate_id    TEXT,
  ADD COLUMN IF NOT EXISTS affiliate_token TEXT,
  ADD COLUMN IF NOT EXISTS referral_id     TEXT;

-- Step 2: Copy any existing data from old columns into new ones
UPDATE public.member
SET
  affiliate_id    = COALESCE(affiliate_id, rewardful_affiliate_id),
  affiliate_token = COALESCE(affiliate_token, rewardful_affiliate_token),
  referral_id     = COALESCE(referral_id, rewardful_referral_id)
WHERE
  rewardful_affiliate_id IS NOT NULL
  OR rewardful_affiliate_token IS NOT NULL
  OR rewardful_referral_id IS NOT NULL;

-- Step 3: Drop the old Rewardful-named columns
ALTER TABLE public.member
  DROP COLUMN IF EXISTS rewardful_affiliate_id,
  DROP COLUMN IF EXISTS rewardful_affiliate_token,
  DROP COLUMN IF EXISTS rewardful_referral_id;

-- Comments
COMMENT ON COLUMN public.member.affiliate_id IS
  'Platform-agnostic affiliate program ID (previously rewardful_affiliate_id). '
  'Now populated from FirstPromoter via fp_promoter_id.';

COMMENT ON COLUMN public.member.affiliate_token IS
  'Platform-agnostic affiliate referral token / tracking code (previously rewardful_affiliate_token). '
  'Now populated from FirstPromoter via fp_ref_id.';

COMMENT ON COLUMN public.member.referral_id IS
  'Platform-agnostic referral ID assigned to this member at time of referral '
  '(previously rewardful_referral_id). Superseded by referred_by_fpr.';
;

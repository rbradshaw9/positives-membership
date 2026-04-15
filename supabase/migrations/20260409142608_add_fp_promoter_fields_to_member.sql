
-- Migration: add_fp_promoter_fields_to_member
--
-- Stores the FirstPromoter promoter ID and ref_id (tracking code) for
-- members who have enrolled in the affiliate program.
--
-- fp_promoter_id: FP's internal numeric promoter ID (used for API calls)
-- fp_ref_id:      The member's referral tracking code / slug (used in ?fpr= links)
--
-- These replace the old rewardful_affiliate_id / rewardful_affiliate_token columns
-- (which are preserved for backward compatibility with existing data).

ALTER TABLE public.member
  ADD COLUMN IF NOT EXISTS fp_promoter_id BIGINT,
  ADD COLUMN IF NOT EXISTS fp_ref_id TEXT;

COMMENT ON COLUMN public.member.fp_promoter_id IS
  'FirstPromoter numeric promoter ID. Set when member enrolls in the affiliate program.';

COMMENT ON COLUMN public.member.fp_ref_id IS
  'FirstPromoter referral tracking code (slug). Used in affiliate links as ?fpr=<ref_id>. '
  'Set when member enrolls in the affiliate program.';
;


-- Migration: add_referred_by_fpr_to_member
--
-- Permanently stores the FirstPromoter ref_id of the promoter who referred
-- this member at checkout time. Unlike the 90-day browser cookie, this is
-- a forever reference used to:
--   1. Track which member "owns" the referral regardless of time elapsed
--   2. When the member later joins the affiliate program, link them as a
--      "child" promoter under their referrer in FP (enabling override commission)
--
-- This field is ONLY set at checkout (checkout.session.completed webhook) and
-- is NEVER overwritten — first referrer wins.

ALTER TABLE public.member
  ADD COLUMN IF NOT EXISTS referred_by_fpr TEXT;

COMMENT ON COLUMN public.member.referred_by_fpr IS
  'The FirstPromoter ref_id of the promoter who referred this member. '
  'Set once at checkout via session metadata.fpr. Never overwritten. '
  'Used to establish permanent affiliate genealogy when this member '
  'later joins the affiliate program.';
;

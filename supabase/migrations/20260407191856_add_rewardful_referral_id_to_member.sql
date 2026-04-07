-- Track Rewardful affiliate referral for members who joined via affiliate link.
-- client_reference_id from Stripe = Rewardful's referral UUID.
-- Rewardful uses this to automatically attribute the conversion via their
-- Stripe webhook listener. We store it here for our own reporting.
ALTER TABLE public.member
  ADD COLUMN IF NOT EXISTS rewardful_referral_id text DEFAULT NULL;

COMMENT ON COLUMN public.member.rewardful_referral_id IS
  'Rewardful referral UUID passed as client_reference_id in Stripe checkout session. Set on join when visitor arrived via an affiliate link.';

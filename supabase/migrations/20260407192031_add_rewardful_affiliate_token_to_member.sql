-- Cache the member's Rewardful affiliate token so we don't re-fetch
-- from the Rewardful API on every account page load.
-- Set when the member first clicks "Get my referral link".
ALTER TABLE public.member
  ADD COLUMN IF NOT EXISTS rewardful_affiliate_token text DEFAULT NULL;

COMMENT ON COLUMN public.member.rewardful_affiliate_token IS
  'Cached Rewardful affiliate referral_token. Used to generate positives.life/join?via={token}. Set on first click of "Get my referral link" in /account.';

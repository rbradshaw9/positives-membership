-- Store the Rewardful affiliate UUID so we can call /v1/affiliates/:id/sso
-- for the one-click portal redirect. The referral_token is for tracking;
-- this id is for API calls (SSO, stats, etc).
ALTER TABLE public.member
  ADD COLUMN IF NOT EXISTS rewardful_affiliate_id text DEFAULT NULL;

COMMENT ON COLUMN public.member.rewardful_affiliate_id IS
  'Rewardful affiliate UUID (from POST /v1/affiliates response). Required to call the SSO magic link endpoint for one-click portal access.';


-- Migration: add_paypal_email_to_member
-- 
-- Stores the affiliate's preferred PayPal payout email.
-- FirstPromoter does not have a native PayPal field on promoters;
-- payouts are managed via FP's built-in payout dashboard.
-- We store this here for internal record-keeping and support.

ALTER TABLE public.member
  ADD COLUMN IF NOT EXISTS paypal_email TEXT;

COMMENT ON COLUMN public.member.paypal_email IS
  'Affiliate preferred PayPal payout email. Set by the member in their affiliate dashboard.';
;

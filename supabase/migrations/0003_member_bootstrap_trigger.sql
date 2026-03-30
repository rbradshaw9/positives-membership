-- =============================================================================
-- 0003_member_bootstrap_trigger.sql
-- Positives Platform — Member Bootstrap Trigger
-- =============================================================================
-- Creates a trigger on auth.users that automatically provisions a member row
-- whenever a new user is created by Supabase Auth.
--
-- This ensures every authenticated user has a corresponding member record
-- before any protected route attempts to read it, eliminating the race
-- condition where requireActiveMember() fails on first sign-in.
--
-- Design decisions:
-- - SECURITY DEFINER runs as the function owner (postgres superuser),
--   bypassing RLS so inserts always succeed even if RLS is restrictive.
-- - ON CONFLICT (id) DO NOTHING is safe for retries and backfill runs.
-- - subscription_status defaults to 'inactive' — Stripe events activate it.
-- - name is populated from raw_user_meta_data if available (e.g. Google OAuth).
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.member (
    id,
    email,
    name,
    subscription_status
  )
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(TRIM(COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name'
    )), ''),
    'inactive'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Attach the trigger to auth.users.
-- Fires after each INSERT — once per new user, including OAuth and magic link.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

# Core Member Launch Checklist

## Product Scope
- `Home` (`/today`) is the primary daily entry point.
- `My Practice` is a secondary discovery/dashboard surface.
- `Community` stays behind `ENABLE_COMMUNITY_PREVIEW=false`.
- Level 2-4 pricing remains preview / notify-me only.
- `Saved` is not part of the launch scope.

## Content Readiness
- Run `npm run audit:launch`.
- Confirm zero published daily/weekly items rely on `s3_audio_key` without `castos_episode_url`.
- Confirm 8 weeks of daily coverage are present.
- Confirm all visible weeks have a published weekly principle.
- Confirm all visible months have a published monthly theme.

## Member QA
- Sign in with seeded member account.
- Verify unauthenticated redirects for `/today`, `/library`, `/practice`, `/community`, `/coaching`, `/account`, and `/admin`.
- Verify `Home -> Library -> My Practice -> Account` navigation works without full reload regressions.
- Start audio on `/today`, navigate to `/library`, then `/practice`, then `/account`, and confirm the persistent player survives.
- Verify the persistent player does not duplicate on `/today`, then reappears after navigation away from `/today`.
- Verify `/journal` still works as a standalone note archive.
- Verify mobile safe-area spacing, bottom player offset, and no overlap with the tab bar.
- Verify `/join` starts Level 1 checkout and `/subscribe/success` lands the member back in `/today`.
- If `/subscribe/success` falls back instead of instant login, verify it still clearly states the membership is active and routes the member toward `/login`.
- Verify `/account` can still open the Stripe billing portal for an active member.

## Admin QA
- Sign in with an admin account.
- Open `/admin/content/calendar`.
- Confirm the calendar distinguishes:
  - missing daily coverage
  - daily scheduled but unpublished
- Confirm `Create Daily`, `Create Weekly`, and `Create Monthly` prefill `/admin/content/new`.
- Confirm at least one admin can edit content from the calendar.
- Confirm a non-admin hitting `/admin` is redirected safely to `/today`.

## Release Safety
- `npm run build`
- `npm run lint`
- `npm run audit:launch`
- `npx playwright test tests/e2e/auth-and-member.spec.ts --project=chromium`
- `npx playwright test tests/e2e/admin-calendar.spec.ts --project=chromium`
- `npx playwright test tests/e2e/join-checkout.spec.ts tests/e2e/billing-portal.spec.ts tests/e2e/subscribe-success.spec.ts --project=chromium`
- Confirm Vercel env vars from `.env.example` are set in production.
- Confirm `ADMIN_EMAILS` includes the launch operators.
- Confirm Stripe webhook and Supabase auth callback URLs match the production domain.

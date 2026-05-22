# Positives Beta Readiness Evidence

**Date:** 2026-05-21  
**Workspace:** `/Users/ryanbradshaw/AntiGravity/positives-membership`  
**Branch / SHA:** `main` / `eb25d21`  
**Scope authority:** `BETA_LAUNCH_GATE.md`, `CURRENT_IMPLEMENTATION_TRUTH.md`  
**Asana system of record:** Positives Finish Roadmap

## Summary

This report tracks the beta gate verification pass for the first Positives L1 beta cohort.

Beta promise under test:

- L1 member can subscribe and land on Today.
- Member can use Today, Practice, Library/courses, Journal, Account/billing.
- Member can submit beta feedback and the workflow can sync to Asana.
- Production systems are aligned enough to invite a cohort of 15 or fewer.

Current launch decision: **not ready to invite yet**. The local code, targeted browser gate, and launch coverage audit are green, but external/manual readiness still has beta blockers:

- `npm run audit:launch` now passes after extending the beta runway through 2026-07-15, but the added rows use placeholder launch-runway audio/copy and still need final approved Dr. Paul/Castos content before a broad invite.
- Transactional email app env and ActiveCampaign sender identities are improved, but Postmark sender-domain DNS/DKIM/SPF readiness is still not proven.
- Production feedback submit -> admin -> Asana creation/comment-sync was not exercised end to end in this pass.

## Starting State

- Existing repo had uncommitted changes before this pass began.
- This pass should not broaden beta scope to community, live events, coaching booking, affiliate payouts, L2-L4, full ActiveCampaign lifecycle, blog, or gamification.
- Verification must distinguish shipped code, verified production behavior, and manual setup still required outside the repo.
- Existing local dev server was already using port `3001`; production build smoke tests were run against `http://localhost:3012`.
- Code fixes made during this pass were limited to beta-gate blockers and stale test/audit expectations.

## Command Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run lint` | Pass | Exit 0 with 0 warnings after cleanup. |
| `npm run build` | Pass | Exit 0. Next.js 16.2.3 production build completed and generated 114 static pages. |
| `npm run audit:launch` | Pass | Static readiness 13/13, recommended scripts 4/4. Content window 2026-05-21 to 2026-07-15: 234 published content rows, 0 audio blockers, 0 missing audio sources, 0 missing/unpublished daily dates, 0 weeks missing principle, 0 months missing theme. |
| Targeted Playwright specs | Pass with one environment skip | `PLAYWRIGHT_BASE_URL=http://localhost:3012 npx playwright test tests/e2e/launch-smoke.spec.ts tests/e2e/join-checkout.spec.ts tests/e2e/subscribe-success.spec.ts tests/e2e/billing-portal.spec.ts tests/e2e/auth-and-member.spec.ts tests/e2e/course-entitlements.spec.ts tests/e2e/stripe-webhook-lifecycle.spec.ts --project=chromium`: 23 passed, 1 skipped. Skip: persistent player smoke because no playable Today audio initialized in this environment. |
| `npm run ops:beta-check` | Pass command, checks remain | Exit 0. Beta Feedback: 0 high/blocker open, 16 total reports, 6 open reports. Sentry: CHECK 4 unresolved recent issues. Stripe account/webhook OK. Supabase bucket/private and early-release members OK. Vercel links require manual review. Asana Beta Feedback triage open tasks: 0. |
| `node --env-file=/tmp/positives-vercel-production.env scripts/audit-email-launch-readiness.mjs` | Pass command, setup gaps remain | Exit 0 using pulled Vercel production env. App-side Postmark env is visible, ActiveCampaign tags/fields/templates OK, 0 messages still use `gmail.com`, 37 messages use `positives.life`. CHECK: only 1/16 expected launch automations visible, no Postmark-like DKIM selector, SPF lacks Postmark include. |
| `npm run content:launch -- --plan /tmp/positives-beta-window-through-2026-07-15.json --write --audit` | Pass | Supabase content runway extension wrote 1 July month and 48 content rows; skipped existing June month; errors 0. Post-write audit returned no launch blockers. |

## Manual / Production Evidence

| Area | Result | Evidence |
| --- | --- | --- |
| Join -> Stripe checkout -> subscribe success -> Today | Verified locally with corrected test prices | Playwright verified `/join` launches Stripe Checkout and subscribe success fallback/exchange guards work. Most recent Checkout Session used L1 monthly `amount_cents=3700`, which Stripe displays as `$37.00/month`. |
| Today audio and mark-listened | Partially verified | Member routes and Today daily practice card render in Playwright. Persistent-player test skipped because playable Today audio did not initialize locally. Launch audit reports no missing daily/weekly audio source for published items through 2026-07-15. |
| Library and Face Your Giants | Verified read-only plus e2e | Course-only entitlement e2e passed. Supabase read-only check: Face Your Giants `slug=face-your-giants`, `status=published`, `access_type=membership_included`, `tier_min=level_1`, 1 module, 6/6 published lessons with `video_url`. |
| Journal save | Not manually exercised | No targeted Journal save spec was found/run in this pass. Keep manual smoke open until exercised. |
| Account and billing portal | Verified local e2e | Billing tests passed for `/account` -> `/account/billing`, past-due repair redirect, missing Stripe/customer fallback, password setup link, and legacy `/upgrade` redirect. |
| Beta feedback to admin and Asana | Partially verified, not end-to-end | `ops:beta-check` reports 0 open high/blocker beta feedback tasks and Asana Beta Feedback triage open tasks = 0. Supabase tables/fields `beta_feedback_submission`, `beta_feedback_comment`, `asana_task_gid`, `asana_task_url`, `asana_task_created_at` exist. A new feedback submit/admin approval/Asana task/comment-sync flow was not executed. |
| Supabase production readiness | Read-only checks passed with caveat | Verified required course/coaching/beta-feedback structures by read-only Supabase queries. `course_lesson` has `slug/status`; it does not have `access_type`, and current compatibility comes from `course.access_type`. No migrations were applied. |
| Stripe live/test pricing and webhook | Test pricing fixed; production env uses test mode | Local `.env.local` and pulled Vercel production env both point L1 to active test prices: monthly `amount_cents=3700` (`$37.00/month`) and annual `amount_cents=37000` (`$370.00/year`). `ops:beta-check` verified enabled webhook `https://positives.life/api/webhooks/stripe`. Note: Vercel production currently uses test-mode Stripe keys; real-payment launch requires live keys and live price IDs. |
| Content coverage | Audit green, final media/copy still needed | Added published scaffold rows for 2026-06-05 through 2026-07-15 so `npm run audit:launch` passes. These rows intentionally carry placeholder launch-runway audio/copy and must be replaced with final approved Dr. Paul/Castos content before broad launch. |
| Postmark / transactional email | Improved, dashboard/DNS required | Vercel production has Postmark env configured and ActiveCampaign sender identities were moved off Gmail. Remaining blockers are Postmark-like DKIM, SPF include alignment, and hidden/missing launch automations in ActiveCampaign/Postmark dashboards. |
| Production performance/mobile smoke | Not completed | `ops:beta-check` Sentry watchlist: homepage p75 8.5s, join p75 2.9s, Today p75 1.9s, 4 unresolved recent issues. No full mobile production browser pass was completed. |

## Asana Evidence

| Project / Task | Result | Evidence |
| --- | --- | --- |
| Positives Finish Roadmap | Updated | Dated evidence comments posted through Asana API on tasks `1214748014996826`, `1214137888145240`, `1214916179855804`, `1215039389363428`, `1213890896816020`, `1213890896816024`, `1214993865752940`, `1214980379608802`, `1214993861279302`, and `1214048635465708`. Content task `1214748014996826` was renamed to reflect the remaining final-content replacement blocker. |
| Positives - Beta Feedback | Reconciled | `npm run ops:beta-check` reports 0 high/blocker open, 6 open product feedback reports, and 0 open Asana Beta Feedback triage tasks. Original podcast app-link feedback task `1215032669487137` was closed after the UX bug was fixed/verified, and feedback submission `810814dc-2e73-4804-b454-7be3187b55f1` was marked resolved. One open Discuss follow-up remains: `1215037881870808` decide whether private podcast downloads/listens should count toward streaks. |

## Open Blockers

- **Final content quality blocker:** replace the scaffolded 2026-06-05 through 2026-07-15 runway rows with final approved Dr. Paul/Castos audio and copy. The database coverage audit is green; the user-facing content is not final.
- **Transactional email blocker:** prove Postmark sender-domain readiness, DKIM/SPF alignment, and visible/active launch automations. Sender addresses are now off Gmail.
- **Manual feedback pipeline blocker:** submit a member feedback item, verify admin queue receipt, approve/create/link an Asana task for high/blocker feedback, and verify admin comments sync back.
- **Production/mobile blocker:** complete mobile/desktop production smoke on `/join`, `/today`, `/practice`, `/library`, Face Your Giants lesson, `/journal`, `/account`, and feedback; triage Sentry unresolved issues if they reproduce on beta-critical routes.

## Follow-Ups

- Replace scaffolded content rows with final approved launch content, then rerun `npm run audit:launch`.
- If beta will collect real payments, create/find live-mode `$37/mo` and `$370/yr` prices, swap Vercel production to live Stripe keys/price IDs, and rerun checkout verification.
- Rerun the email audit after Postmark/DNS/dashboard work.
- Add or run a focused Journal save smoke test.
- Decide the remaining podcast external-listen tracking follow-up in Beta Feedback task `1215037881870808`.

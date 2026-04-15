# Asana Dependency Pass: Launch Sprint Ordering

Date: 2026-04-15

This pass reorganizes the open work into prerequisite order so we do not burn
time on downstream tasks before the base decisions and infrastructure are in
place.

## Highest-Leverage Order

### 1. Environment Separation And Billing Safety

Do first because it protects every billing, migration, and reminder test.

Order:

1. Provision Supabase staging project and apply production migrations.
2. Configure Vercel Preview environment for staging Supabase and Stripe test mode.
3. Run live-account test-mode Stripe Checkout and Customer Portal smoke test.
4. Prepare live Stripe mode cutover checklist after business verification.
5. Complete switch to live in Stripe only after verification, smoke tests, and rollback plan.

Why this comes first:

- Course purchases, webhooks, reminders, and migration tests need somewhere safe
  to run.
- Stripe customer IDs, webhook secrets, and price IDs are environment-specific.
- We should not test permanent course entitlement edge cases directly against
  production member data.

### 2. Permanent Course Entitlements

This is launch-critical and unlocks course sales, course-only member access, and
legacy course purchaser migration.

Order:

1. Confirm/implement entitlement data model and ownership states.
2. Grant and revoke course entitlements from Stripe webhooks.
3. Wire standalone course purchase checkout and logged-in quick purchase.
4. Design and implement course-only member home + resubscribe prompts.
5. Create legacy course purchaser migration/import path.
6. Add course entitlement QA coverage.

Why this order:

- Webhooks and checkout need a stable entitlement model first.
- Course-only UI is only meaningful once access rules are real.
- Migration needs the same entitlement write path as new purchases.
- QA coverage should lock behavior after the main paths exist.

### 3. Admin Member CRM Foundation

This should follow or run alongside course entitlements, but the most valuable
CRM pieces depend on the access model.

Order:

1. Add admin role and permission model for member CRM operations.
2. Refactor admin member detail into launch CRM workspace.
3. Add internal coach notes and member documents foundation.
4. Add subscriber-only points ledger foundation for course unlocks.

Why this order:

- Roles/permissions should gate sensitive CRM actions from the start.
- The member detail workspace is where course grants, notes, documents, and
  points should come together.
- Points depend on the course entitlement unlock model and should not precede it.

### 4. Affiliate Payout Operations

This is important, but it does not block core member launch unless affiliate
payouts are required on day one.

Order:

1. Set up dedicated Positives PayPal account for affiliate payouts.
2. Request and confirm PayPal Payouts API approval.
3. Configure FirstPromoter PayPal direct payouts.
4. Trigger ActiveCampaign follow-up when affiliate PayPal payout fails.

Why this order:

- FirstPromoter direct PayPal payouts cannot be configured until the PayPal
  account and Payouts API approval exist.
- The ActiveCampaign failure automation is useful, but only after payout status
  exists somewhere we can reliably sync or review.

### 5. Reminder Cron And ActiveCampaign R01-R06

This depends on real scheduled event/coaching content and safe environment
testing.

Order:

1. Replace placeholder Level 2 and Level 3 scheduled content in admin.
2. Verify Vercel Pro reminder cron and ActiveCampaign R01-R06 trigger flow.
3. Add/adjust reminder follow-ups only if the dispatch log, tags, or fields do
   not behave as expected.

Why this order:

- Reminder automations need real scheduled content records.
- Cron should be tested in a safe environment before relying on production
  delivery.

### 6. Monitoring And Performance

These are launch-polish and launch-safety tasks, but they should not block the
core access model.

Order:

1. Add Sentry uptime and cron monitors.
2. Add Sentry alert rules for critical launch failures.
3. Run site performance pass across Vercel, Supabase, and app code.
4. Run full user-facing visual and UX review.

Why this order:

- Monitoring should exist before the final QA pass.
- Performance work should be driven by fresh deployed Speed Insights data.

## Tasks That Should Stay Decision-Oriented

Keep these out of implementation until Ryan/Dr. Paul decide direction:

- Help Scout AI support bot vs custom support assistant.
- Social media setup as launch-critical vs post-launch growth.
- Legacy Practitioner members and free invited seats.
- Live events/coaching launch promise if it changes tier scope.

## Ownership Rule

Assign Ryan only when the task requires Ryan or an external account owner to do
manual work. Leave Codex-executable tasks unassigned.

Manual Ryan/account-owner tasks include:

- Dedicated PayPal account setup.
- PayPal Payouts API approval.
- Stripe dashboard/business verification tasks.
- Real-device QA tasks.
- Gathering legacy billing/member inventory.

Codex-executable tasks should remain unassigned unless Ryan explicitly asks for
an assignee.

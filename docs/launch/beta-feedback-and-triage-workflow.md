# Beta Feedback And Triage Workflow

## Purpose

Keep beta feedback fast to submit, rich in context, and easy for support/coaches to triage without losing momentum.

## Intake

- Logged-in members see a persistent `Share beta feedback` button in the member shell.
- The form collects:
  - category
  - urgency
  - short summary
  - what happened
  - expected behavior
  - optional screenshot
  - optional Loom link
- The app automatically captures:
  - member ID
  - member email
  - current page URL/path
  - browser
  - operating system
  - device type
  - viewport size
  - timezone
  - user agent
  - current release identifier when available
  - Stripe customer and subscription context when present

## Queue

- Admins, support, and coaches use `/admin/beta-feedback` as the working queue.
- The queue supports:
  - search
  - status filter
  - severity filter
  - category filter
  - owner filter
- Each report can be:
  - assigned
  - reclassified
  - moved through triage statuses
  - annotated with internal triage notes
- Reports submitted as `high` or `blocker` automatically create an Asana task in `Beta Feedback Triage`.
- Reports submitted as `low` or `medium` stay in the admin queue unless an operator manually escalates them.

## Sentry User Feedback Recommendation

- Keep the native in-app beta feedback form as the primary beta intake path.
- Reason:
  - it captures member ID, email, cohort, page context, severity, screenshots, and admin triage state in our own CRM workflow
  - it can create Asana tasks only for `high` and `blocker` issues, which keeps task noise down
  - it keeps tester experience consistent instead of showing multiple feedback widgets
- Use Sentry User Feedback later as a complement, not a replacement:
  - best fit is a crash-report modal after an error or a custom button attached to an error boundary
  - avoid the default floating Sentry feedback button during alpha unless native intake proves insufficient
- If enabled, add the browser-only integration in `instrumentation-client.ts`; do not add it to server or edge Sentry config.

## Ops Health

- Admins use `/admin/ops` as the read-only beta operations dashboard.
- The page summarizes:
  - beta feedback volume and urgent reports
  - Sentry issue and cron monitor status
  - Stripe account and webhook readiness
  - Supabase connectivity and feedback upload storage
  - Vercel deployment, logs, Speed Insights, and Analytics links
  - Asana `Beta Feedback Triage` workload
- Local agents can run `npm run ops:beta-check` for the same lightweight operating review in Markdown form.

## Status Model

- `new`
  - freshly submitted and not yet reviewed
- `triaged`
  - understood, categorized, and routed
- `investigating`
  - active engineering/support investigation
- `waiting_on_member`
  - blocked on member clarification or confirmation
- `resolved`
  - fix or answer is ready
- `closed`
  - completed and no more action needed

## Recommended Daily Operating Rhythm

- Alpha:
  - one daily triage pass
- Private beta:
  - one morning pass
  - one late-day pass
- Blockers:
  - review as soon as they appear

## Severity Rules

- `blocker`
  - signup, login, billing, access, checkout, Today, or app-wide usage is blocked
- `high`
  - major feature broken, repeated error, member access wrong, payment/webhook issue, or admin cannot complete required support work
- `medium`
  - confusing UX, slow route, non-critical feature broken, or workaround exists
- `low`
  - polish, copy, visual inconsistency, small content issue, or nice-to-have improvement

## Close-the-Loop Checklist

- Reproduce or verify the report when possible.
- Create or confirm the Asana task for `high`/`blocker` issues.
- Fix directly if actionable; otherwise add the decision/manual dependency to Asana.
- Run the relevant verification checks.
- Push/deploy the fix.
- Update the feedback item with triage notes and move it to `resolved` or `closed`.
- Complete or update the Asana task with commit, verification, and production status.

## Ownership Recommendations

- Ryan / product owner:
  - approve severity policy
  - review blocker patterns
  - review weekly summary
- Support / ops:
  - first-pass triage
  - assign owner
  - request clarification from members when needed
- Coaches:
  - handle coaching/content/context reports
- Engineering:
  - investigate and resolve product/system defects

## Notes

- Screenshots are stored privately in Supabase Storage.
- This workflow is intentionally lighter than a full external support stack.
- If beta volume becomes noisy, we can later add Help Scout or a deeper support layer without replacing the core in-app intake.

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

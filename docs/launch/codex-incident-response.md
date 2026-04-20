# Codex Incident Response And Sentry Approval Queue

## Purpose

Use Sentry as the signal source, Asana as the approval/work queue, and Codex as
the implementation agent. The goal is fast repair without letting automation
make risky production changes without review.

## Operating Rule

Codex may investigate any Sentry issue, but fix authority depends on the safety
class below. No auto-fix workflow may merge or deploy changes that touch
payments, auth, permissions, or destructive data behavior without explicit human
approval.

## Safety Classes

### Class 1: Auto-Triage Only

Codex can summarize impact, likely root cause, reproduction path, and recommended
next action. It should not write code automatically.

- Unknown issue class or low confidence diagnosis
- Cross-cutting production errors
- Data consistency warnings
- Anything involving unclear customer impact
- Any issue where the fix likely spans multiple domains

Required output:
- Sentry issue link or ID
- affected route/subsystem
- latest event timing
- suspected cause
- suggested owner/action

### Class 2: Auto-Fix With Approval

Codex can prepare a fix, run verification, push a branch or commit when approved,
and document production status. Human review is required before merge/deploy if
the workflow is PR-based.

- Frontend rendering errors
- Hydration issues caused by deterministic rendering mismatches
- Admin UI bugs
- Beta feedback/admin ops UI defects
- Non-destructive cron failures
- Reminder pipeline bugs that do not change subscription/payment state
- Affiliate dashboard display bugs
- Performance regressions with low-risk code changes
- Copy or content truth mismatches

Approval requirements:
- explain the user impact
- explain why the fix is low risk
- list files changed
- run relevant checks
- include rollback note if production behavior is affected

### Class 3: Human-Approved Investigation And Fix

Codex can investigate and propose a fix, but implementation should wait for
explicit approval because the blast radius is meaningful.

- Billing portal regressions
- Stripe webhook handler changes
- Course purchase or entitlement logic
- ActiveCampaign/Postmark sending behavior
- Member migration or reconciliation logic
- Role/permission management
- Admin actions that mutate member access
- Database migrations affecting existing records

Approval requirements:
- written fix plan
- test plan
- manual rollback/reconciliation plan
- confirmation from Ryan before applying production-impacting changes

### Class 4: Never Auto-Merge

Codex must not auto-merge or auto-deploy these changes. It can only diagnose,
draft a plan, and wait for approval.

- Auth/session logic
- Password reset or magic-link security
- Stripe charging logic
- Subscription state transitions
- Refund, chargeback, or proration behavior
- Permission model changes
- RLS or service-role policy changes
- Destructive data changes
- PII/privacy policy changes
- External account credentials or live account configuration

## Asana Approval Queue Structure

Use the existing `Codex / Needs Review` or `Beta Feedback Triage` section unless
the issue is part of a larger epic. Each Sentry approval task should include:

- Sentry issue ID and URL
- severity
- affected route or subsystem
- customer/member impact
- latest seen timestamp
- reproduction status
- likely root cause
- proposed fix
- safety class
- Codex confidence: low, medium, or high
- approval state: needs review, approved to patch, patched, deployed, verified
- verification steps
- rollback or follow-up note

## Recommended Workflow

1. Ops check finds a Sentry issue or monitor failure.
2. Codex investigates and classifies the issue.
3. If Class 1, Codex comments in Asana with triage only.
4. If Class 2, Codex can prepare the fix and request/record approval where
   needed.
5. If Class 3 or 4, Codex creates or updates an Asana approval task and stops
   before implementation unless Ryan explicitly approves the plan.
6. After deployment, run `npm run ops:beta-check`.
7. Resolve the Sentry issue only after the relevant signal recovers or the issue
   is confirmed stale.

## Closeout Checklist

- Sentry issue linked
- Asana task updated
- safety class recorded
- code commit linked when applicable
- lint/build or targeted test recorded
- production deploy verified when applicable
- Sentry issue resolved or left open with reason

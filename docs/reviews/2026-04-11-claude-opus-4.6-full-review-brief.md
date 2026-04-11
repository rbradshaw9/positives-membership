# Claude Opus 4.6 Full Review Brief

## Goal

Run a full comprehensive review of:

1. the Positives codebase
2. the current launch-state product behavior
3. the live Asana board that is being used as the system of record

This is a review-only pass. Do not make code changes. Do not update Asana. Produce findings, recommendations, and a concrete action list that can be handed back to Codex for implementation.

## Working Context

- Repository root: `/Users/ryanbradshaw/AntiGravity/positives-membership`
- Framework: Next.js App Router on a newer version than many older examples assume
- Important note: do not assume older Next.js conventions are correct for this repo
- Current working product areas include:
  - public marketing pages
  - Stripe checkout and customer portal
  - Supabase auth
  - member routes like `/today`, `/practice`, `/library`, `/events`, `/coaching`, `/community`, `/account`
  - admin content management
  - affiliate and referral flows

## Launch Context

The app is already quite far along. The goal of this review is not to brainstorm from scratch. The goal is to identify:

- launch blockers
- hidden support burdens
- truth-alignment issues between copy and behavior
- security risks
- performance risks
- missing or weak tests
- UX friction
- stale or misorganized Asana tasks
- product decisions that still need sharper framing

Prefer concrete findings over generic advice.

## Asana Is The System Of Record

You should review the full Asana project in addition to the codebase.

Use the Asana connection info from `.env.local`:

- `ASANA_ACCESS_TOKEN`
- `ASANA_PROJECT_GID`
- `ASANA_PROJECT_URL`
- optional section gids if useful

Important:

- read task titles
- read task descriptions/notes
- read comments/stories
- inspect subtasks
- pay special attention to `Blocked / Needs Decision`
- also inspect `Ryan / Manual Setup Needed`, if present

Do not just skim task names. The descriptions and comments contain important product context.

## How To Review The Asana Project

At minimum, inspect:

- all open tasks in the project
- all tasks in `Blocked / Needs Decision`
- all tasks in manual-setup / manual-review sections
- comments and subtasks for any task that looks vague or decision-heavy

You can use the Asana API with the token from `.env.local`.

Recommended API surfaces:

- `GET /projects/{project_gid}/tasks`
- `GET /projects/{project_gid}/sections`
- `GET /tasks/{task_gid}`
- `GET /tasks/{task_gid}/subtasks`
- `GET /tasks/{task_gid}/stories`

Recommended fields to request where useful:

- `name`
- `notes`
- `completed`
- `memberships.section.name`
- `assignee.name`
- `permalink_url`
- `created_at`
- `modified_at`

## Codebase Review Scope

Review the full repo with special attention to these areas:

### Public experience

- `/`
- `/join`
- `/watch`
- `/try`
- `/with/[slug]`
- `/about`
- `/faq`
- `/support`
- `/privacy`
- `/terms`
- `404`

### Auth and account

- `/login`
- forgot/reset password flow
- magic link flow
- `/account`
- password creation and password change flow
- billing handoff to Stripe Customer Portal

### Billing and subscriptions

- paid signup
- trial signup
- Stripe checkout integration
- customer portal integration
- upgrade/downgrade behavior
- trial cancellation path
- referral attribution continuity
- receipts / post-purchase lifecycle correctness

### Member experience

- `/today`
- `/practice`
- `/library`
- `/library/months/[monthYear]`
- `/journal`
- `/events`
- `/coaching`
- `/community`

### Tier gating and promise alignment

Check whether actual product behavior matches what the copy and pricing imply for:

- Level 1
- Level 2
- Level 3
- any Level 4 / executive language

### Admin and operations

- admin route structure
- content publishing workflow
- month planning workflow
- event/coaching admin surfaces
- email/admin operational workflows

### Affiliate and growth

- FirstPromoter attribution assumptions
- affiliate portal usefulness
- share kit realism
- trial and paid attribution continuity

### Performance and security

- server/client boundaries
- unnecessary dynamic rendering
- auth/session coupling on public pages
- query count and heavy routes
- third-party scripts
- image/media loading
- sensitive action protection
- webhook handling and secrets usage
- obvious support-ticket generators

### Test coverage

Check whether the current automated coverage appears sufficient for launch-critical behavior.

## Files And Docs To Read Early

Start with these before going too deep:

- `docs/reports/2026-04-10-positives-finish-roadmap.md`
- `docs/reports/2026-04-10-positives-asana-setup.md`
- `docs/funnels/2026-04-10-offer-routing-rules.md`
- `docs/funnels/2026-04-10-vsl-sales-page-spec.md`
- `docs/funnels/2026-04-10-7-day-trial-funnel-spec.md`
- `docs/funnels/2026-04-10-partner-webinar-page-template-spec.md`

Then inspect the implementation against those documents.

## Commands You Should Run

Run as many of these as practical:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm audit --omit=dev
npm run test:e2e
```

If a command is too expensive or not practical in your environment, say so explicitly.

## Review Standard

Be opinionated and concrete.

Do not give generic compliments or generic “looks good overall” commentary.

Prioritize:

1. bugs
2. regressions
3. hidden launch risks
4. support burden
5. missing tests
6. product/copy drift
7. stale or poorly organized Asana work
8. lower-priority polish ideas

## Asana-Specific Questions To Answer

While reviewing the Asana board, explicitly answer:

1. Are any tasks in the wrong section?
2. Are any blocked items actually executable work that should be moved out of `Blocked / Needs Decision`?
3. Are there any vague tasks that should be split into separate tasks or subtasks?
4. Are there duplicate or stale tasks that should be consolidated or closed?
5. Are there any missing tasks that the current board should include?
6. Are any manual Ryan tasks actually automatable or engineer-owned?

## Output Format

Return your review in this exact structure:

### 1. Critical Findings

Use a flat numbered list. For each finding include:

- severity
- title
- why it matters
- file or route references
- recommended fix

### 2. High-Value Non-Critical Findings

Same format, but for important non-blocking issues.

### 3. Asana Board Recommendations

Use bullets. Include:

- tasks to move
- tasks to split
- tasks to rename
- tasks to close
- tasks to add

### 4. Open Product Decisions

List only true decisions that still need human choice.

### 5. Residual Risks Before Launch

What still makes you nervous even if the code is mostly solid.

### 6. Suggested Next 10 Tasks

Give the next 10 highest-leverage tasks in recommended execution order.

## Important Constraints

- Review, do not implement
- Be specific
- Use file paths and route references
- Use the Asana board context, not just the repo
- Prefer launch realism over theoretical elegance

## Paste-Ready Prompt

```text
You are reviewing the Positives codebase and launch board as a senior product-minded staff engineer.

Your job is to do a full comprehensive review of BOTH:

1. the repository at /Users/ryanbradshaw/AntiGravity/positives-membership
2. the live Asana board used as the system of record

Read and follow this brief first:
/Users/ryanbradshaw/AntiGravity/positives-membership/docs/reviews/2026-04-11-claude-opus-4.6-full-review-brief.md

Important requirements:
- This is a review-only pass. Do not modify code. Do not update Asana.
- Read task descriptions, comments/stories, and subtasks in Asana, not just titles.
- Use the Asana connection info in .env.local.
- Review the repo, the product shape, the launch risks, and the board organization together.
- Be concrete and opinionated.
- Findings first. Generic praise is not useful.
- Use file paths, route references, and task recommendations.
- If you cannot run a command or access something, say exactly what was blocked.

Deliver the output in the exact structure requested by the brief.
```

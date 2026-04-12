# Claude Sonnet 4.6 Launch Closure Handoff

Date: 2026-04-11
Owner: Codex
Audience: Claude Sonnet 4.6 implementation pass

## Goal

Implement the current launch-closure sprint for Positives without drifting into future epics, deferred work, or manual-only setup tasks.

This is not a greenfield product pass. The app is already far along. The right job is to:

1. read the live Asana board as the system of record
2. implement the current open engineering tasks in the sprint
3. keep Asana current as work progresses
4. avoid inventing new scope unless a discovered issue truly blocks launch

## Repo and product context

- Repo root: `/Users/ryanbradshaw/AntiGravity/positives-membership`
- Live site: `https://positives.life`
- Stack:
  - Next.js 16 App Router
  - Supabase auth + DB
  - Stripe checkout + customer portal
  - FirstPromoter attribution
  - Resend + ActiveCampaign
  - Sentry baseline now installed and DSN-verified

Important:
- Do not assume older Next.js conventions are correct here.
- This repo uses `proxy.ts`, not `middleware.ts`.
- Public marketing shell and member shell are already partially optimized and cleaned up.

## Asana is the system of record

Use the Asana board directly. Read:

- task title
- notes/description
- comments/stories
- subtasks

Do not rely on task titles alone.

### Asana connection information

Source the existing local env first:

```bash
set -a && source .env.local && set +a
```

Use these env vars from `.env.local`:

- `ASANA_ACCESS_TOKEN`
- `ASANA_WORKSPACE_GID`
- `ASANA_TEAM_GID`
- `ASANA_PROJECT_GID`
- `ASANA_PROJECT_URL`
- `ASANA_ASSIGNEE_GID`
- `ASANA_SECTION_PHASE_1_GID`
- `ASANA_SECTION_PHASE_4_GID`
- `ASANA_SECTION_PHASE_5_GID`
- `ASANA_SECTION_BLOCKED_GID`
- `ASANA_SECTION_RYAN_MANUAL_GID`

Important security note:
- Use the connection info from `.env.local`.
- Do not paste raw secrets into repo-tracked files.
- Do not rotate, replace, or remove credentials unless explicitly required.

### Recommended Asana API surfaces

- `GET /projects/{project_gid}/sections`
- `GET /projects/{project_gid}/tasks`
- `GET /tasks/{task_gid}`
- `GET /tasks/{task_gid}/subtasks`
- `GET /tasks/{task_gid}/stories`
- `PUT /tasks/{task_gid}`
- `POST /tasks/{task_gid}/stories`
- `POST /tasks`
- `POST /tasks/{task_gid}/subtasks`
- `POST /sections/{section_gid}/addTask`

### Asana working rules

- Keep using the same project.
- Do not create a second sprint project.
- `Current Sprint — Launch Closure` is the focus lens.
- `Phase 4 — Marketing + Funnel Variants + Launch Polish` is the main implementation section for this pass.
- `Ryan / Manual Setup Needed` is for tasks Sonnet should not try to automate unless the task is clearly engineer-owned.
- `Blocked / Needs Decision` should only contain true decisions or future-design work. If something is executable, move it out before implementing.
- `Codex / Needs Review` is the intake lane for vague review requests.

## Current sprint source of truth

### Sprint tracker

- `Sprint Focus — Launch Closure`
  - `https://app.asana.com/1/1121814557377551/project/1214005103885510/task/1214047861676047`

### Primary execution tasks

These are the current launch-closure implementation tasks Sonnet should focus on first, in order:

1. `Homepage launch polish round 2`
   - `https://app.asana.com/1/1121814557377551/project/1214005103885510/task/1214046406812279`
2. `Join page launch polish round 2`
   - `https://app.asana.com/1/1121814557377551/project/1214005103885510/task/1214049441936293`
3. `Run full user-facing visual and UX review across all public and member pages`
   - `https://app.asana.com/1/1121814557377551/project/1214005103885510/task/1214044882071618`
4. `Run site performance pass across Vercel, Supabase, and app code`
   - `https://app.asana.com/1/1121814557377551/project/1214005103885510/task/1214048625214962`
5. `Polish add-to-home-screen / installable app experience for members`
   - `https://app.asana.com/1/1121814557377551/project/1214005103885510/task/1214049436299116`
6. `Tighten empty upcoming-state layouts on Events and Coaching pages`
   - `https://app.asana.com/1/1121814557377551/project/1214005103885510/task/1214044886826642`
7. `Finish abuse-protection hardening for support and auth endpoints`
   - `https://app.asana.com/1/1121814557377551/project/1214005103885510/task/1214046384837373`

### Manual launch gates

Do not try to silently “do around” these unless they are clearly automatable and safe:

- `Apply Positives branding across Stripe-hosted billing surfaces`
- `Manual full-site QA pass before launch`
- `Provide final Dr. Paul VSL asset package for the /watch page`
- `Replace placeholder Level 2 and Level 3 scheduled content in admin`
- `Verify add-to-home-screen flow on iPhone Safari and Android Chrome`
- `Verify Supabase Auth leaked-password protection is enabled in production`

If Sonnet discovers that any manual task is actually automatable and engineer-owned, it should:

1. comment on the task explaining why
2. move it to the correct phase section
3. only then implement it

## Current homepage notes to implement

These were clarified after the earlier homepage task had already been marked complete. They now live as explicit subtasks under `Homepage launch polish round 2`, but they are important enough to call out here too:

- remove `Dr. Paul Jenkins · Clinical Psychologist` from the top of the homepage
- widen the wrap of:
  - `Positives is a guided daily practice designed to help you think more clearly, respond more calmly, and build a life you actually enjoy living.`
- add a stronger image, icon, or visual element beside:
  - `A simple practice that builds real change.`
- homepage behavior should be the same whether logged in or not
  - only the `Sign in` button destination should differ
  - authenticated users should go to `/today`
  - unauthenticated users should go to `/login`
- improve the visual treatment of the `Hear Dr. Paul's practice` sample session section
- remove `at higher levels` style phrasing from homepage support/comparison copy
- incorporate Dr. Paul’s `Save and Enrich 7 Key Relationships` framing where it genuinely strengthens the page
  - research first
  - keep it accurate and on-brand
- fix the vertical alignment in the `Our promise / 30-day money-back guarantee` section
- remove the `Watch` link from the public footer

## Current Sentry state

Do not redo the initial install.

Already done:

- `@sentry/nextjs` installed
- `withSentryConfig()` wired in `next.config.ts`
- `instrumentation.ts`
- `instrumentation-client.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `app/global-error.tsx`
- `/sentry-example-page`
- `/api/sentry-example-api`
- real DSN added to `.env.local`
- real issue verified in Sentry Issues:
  - Issue ID: `7404782583`
  - project: `javascript-nextjs`
  - message: `This is a test error`

Remaining Sentry work is not baseline install. It is:

- launch alert rules
- uptime / cron monitors
- optional source map upload setup if desired

## Files and docs to read first

Read these before changing code:

- `docs/reports/2026-04-10-positives-finish-roadmap.md`
- `docs/reports/2026-04-10-positives-asana-setup.md`
- `docs/reviews/2026-04-11-site-speed-optimization-path.md`
- `docs/funnels/2026-04-10-offer-routing-rules.md`
- `docs/funnels/2026-04-10-vsl-sales-page-spec.md`
- `docs/funnels/2026-04-10-7-day-trial-funnel-spec.md`

## Recommended execution order

### 1. Re-ground in current implementation

Before making changes:

- inspect the live sprint tasks in Asana
- inspect the relevant routes/components in the repo
- read the latest comments on homepage, join, speed, UX review, and install tasks

### 2. Implement the page-critical polish first

Start with:

- homepage round 2
- join round 2

Then:

- re-run the user-facing visual/UX review task
- split any new findings into explicit tasks before implementation if they are meaningfully separate

### 3. Do the speed pass

Use the speed-plan doc as the baseline.

Highest-value targets:

- public LCP on `/`, `/join`, `/try`
- shared public JS
- heavy media and script strategy
- member query cost on `/today`, `/practice`, `/events`, `/coaching`
- add a lightweight repeatable regression check

### 4. Finish member polish and hardening

- add-to-home-screen polish
- events/coaching empty-state polish
- abuse-protection hardening

## Implementation rules

- Keep Asana current while working.
- If Sonnet finds new work, add the task before or while doing it.
- If Sonnet finds a task in the wrong section, move it.
- If Sonnet finds a vague task, split it into subtasks.
- If Sonnet finds a completed task that still has unresolved remainder, fix the board state instead of ignoring it.
- Leave comments where context will help humans later.

## Commands to run

At minimum:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

When relevant:

```bash
npm run test:e2e
npm run audit:launch
```

If a command is too expensive, run the targeted version and explain why.

## What not to do

- Do not start the admin finance dashboard epic.
- Do not start Ask Dr. Paul.
- Do not build transcript/search infrastructure in this pass.
- Do not build push/SMS reminders.
- Do not create a second Asana project for the sprint.
- Do not leave hidden context only in chat if it belongs in Asana.

## Expected output back to Codex

When Sonnet finishes or pauses, it should report back with:

1. what it implemented
2. which Asana tasks it updated, moved, created, or completed
3. what remains open in the sprint
4. any manual Ryan tasks that became newly necessary
5. any real blockers or decisions that surfaced

## Paste-ready prompt

```text
You are implementing the current launch-closure sprint for Positives.

Start by reading this handoff document:
/Users/ryanbradshaw/AntiGravity/positives-membership/docs/reviews/2026-04-11-claude-sonnet-4.6-launch-closure-handoff.md

You are allowed to make code changes and update the live Asana board.

Important rules:
- Use the existing Asana project as the system of record.
- Source Asana connection info from `.env.local`.
- Read task notes, comments, and subtasks, not just titles.
- Keep Asana current as you work.
- If you discover new work, create the task before or while implementing it.
- If something is in the wrong section, move it.
- If a task is vague, split it.
- Do not create a new Asana project.
- Do not drift into deferred or future-epic work unless it blocks launch.
- Do not redo the initial Sentry install; it is already complete and DSN-verified.

Execution priority:
1. Homepage launch polish round 2
2. Join page launch polish round 2
3. Run full user-facing visual and UX review across all public and member pages
4. Run site performance pass across Vercel, Supabase, and app code
5. Polish add-to-home-screen / installable app experience for members
6. Tighten empty upcoming-state layouts on Events and Coaching pages
7. Finish abuse-protection hardening for support and auth endpoints

Before coding:
- inspect the current sprint tasks in Asana
- inspect the relevant routes/components in the repo
- summarize the current implementation state briefly

While working:
- update Asana comments when context would help a human later
- keep the board truthful
- prefer explicit tasks over hidden chat context

When you finish, report:
1. what you implemented
2. which Asana tasks changed
3. what remains open
4. any blockers or decisions
```

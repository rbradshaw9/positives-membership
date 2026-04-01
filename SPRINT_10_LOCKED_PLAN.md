# Sprint 10 — Decision-Locked Implementation Record

> Locked 2026-04-01. This document supersedes `BUILD_BRIEF_NEXT_MILESTONE.md` where there is any conflict.
> Do not modify this file during implementation. Amendments require an explicit decision record update.

---

## 1. Final Milestone Decision

### Milestone Name

**Sprint 10: Tier-Gated Access + Coaching System + Journal New Entry**

### Primary Objective

Add `tier_min` access control to the content system, implement the `/coaching` page gated to Level 3+, and enforce tier filtering in library and search queries.

### Secondary Objectives

1. Add "New Entry" button to the journal page (freeform notes with `content_id = NULL`).
2. Extend admin content form to support `coaching_call` type, `tier_min` field, and `starts_at` field.
3. Update `MemberTopNav` to show the Coaching link conditionally for Level 3+ members.
4. Fix broken `seed.sql` and add coaching call seed records.
5. Delete the orphaned `dashboard` route.

### What Counts as Success

Sprint 10 is complete when **all of the following are true:**

- Migration 0011 is applied to production with no errors.
- A Level 1 member cannot see coaching-call content anywhere (Today, Library, Search).
- A Level 3 member can visit `/coaching`, see the upcoming call, and play a past replay.
- A Level 1 member visiting `/coaching` sees an upgrade prompt — not an error or redirect.
- Admin can create a `coaching_call` content record with `tier_min` and `starts_at`.
- "New Entry" button on journal page opens NoteSheet with no content association.
- The `dashboard` route is deleted.
- `seed.sql` runs without errors on a fresh schema.
- `npm run build` succeeds with no type errors.

### What Is Explicitly Not Required for Sprint 10

The following items are **out of scope**. Do not build them, even if implementation is easy:

- Onboarding flow or first-login overlay
- Admin content calendar or gap detection
- Admin member viewer
- Upgrade prompt CTAs with Stripe links
- Milestone/streak celebration cards on Today
- ActiveCampaign or Resend email integration
- Any ingestion pipeline or transcription code
- Community features (events, Q&A)
- Error boundaries (`error.tsx` / `not-found.tsx`)
- Castos podcast publishing
- Any AI or vector search work
- Private podcast feed in Account page

---

## 2. Decision Log

### D-01: Will Sprint 10 include Journal New Entry?

**Decision: YES — required, not optional.**

**Rationale:** The schema already supports it (`content_id` nullable), the server action already accepts it, and NoteSheet already handles null contentId. The entire change is a button and a small client wrapper component. Cost is under 1 hour. The feature closes a documented UX gap and should not remain deferred.

**Risk of the opposite (defer):** The journal page has had this gap for 9 sprints. Deferring again creates a pattern of permanent incompleteness that erodes trust in spec tracking.

---

### D-02: Will lower-tier members who visit `/coaching` see an upgrade prompt or get blocked?

**Decision: UPGRADE PROMPT — not a redirect or 403.**

**Rationale:** The product philosophy is "calm UX, never punitive." Hard-blocking or redirecting a member who finds the Coaching link via URL bar creates confusion and feels hostile. An upgrade prompt converts the visit into a sales moment. This also matches the documented principle: "Guided upgrade UX instead of hard blocks."

**Risk of the opposite (block/redirect):** Wastes potential upgrade conversion. Creates a confusing UX if user bookmarks the URL. Violates documented product philosophy.

**Implementation note:** The upgrade prompt component should be calm and branded. It should name the tier required ("Coaching Circle, Level 3"), describe the value briefly, and include one CTA ("See plans" → `/join`). Do not build the Stripe upgrade flow in this sprint — a link to `/join` is sufficient.

---

### D-03: Should `tier_min` be added to the content table now, even if only coaching uses it initially?

**Decision: YES — add to content table universally.**

**Rationale:** `tier_min` is a universal content column. Future content types (events, workshops, bonus material) need the same column. Adding it once now is a 1-line migration. Adding it selectively per type would require another migration later and creates inconsistency in the content model.

**Risk of the opposite (add later):** Another migration later, another deploy, another round of TypeScript type regeneration, and a period where future content types silently have no gating because the column doesn't exist.

**Implementation note:** Column is nullable. NULL means "all tiers." All existing content retains `tier_min = NULL` automatically after the migration — no data manipulation required.

---

### D-04: Should coaching calls live in the unified `content` table?

**Decision: YES — unified content model, no exceptions.**

**Rationale:** This has been a documented architectural principle since before Sprint 1. The `content` table already has all the fields coaching calls need: `title`, `body`, `vimeo_video_id`, `resource_links` (for Zoom join URL), `publish_date`, `status`, and now `starts_at` and `tier_min`. Creating a separate `coaching_call` table would break search, notes, library integration, and admin CRUD.

**Risk of the opposite (separate table):** Breaks 5 existing systems immediately. Creates a parallel data model that contradicts every planning document in the repo.

---

### D-05: Should library and search queries respect `tier_min` immediately in Sprint 10?

**Decision: YES — both queries updated in this sprint.**

**Rationale:** If coaching calls are added with `tier_min = level_3` but queries don't filter by tier, Level 1 members will see coaching content in the library and search results immediately after migration. This is a security/access control problem, not a nice-to-have polish item. The filter must ship alongside the content type.

**Risk of the opposite (defer queries):** Coaching call content leaks to all tiers as soon as any call record is created. Access control is broken at launch.

**Implementation note:** Apply SQL filter: `tier_min IS NULL OR tier_min <= memberTier`. The `<=` comparison works because Postgres enum ordering uses the declaration order. However — use explicit tier order in `checkTierAccess()` application code; don't rely on Postgres enum comparison in the query. Use the SQL filter in the query and `checkTierAccess()` separately in page-level guards.

---

### D-06: Should admin content CRUD support `tier_min` and `starts_at` immediately?

**Decision: YES — both fields in admin form in this sprint.**

**Rationale:** If admin cannot set `tier_min`, every coaching call record must be manually inserted via SQL. That is not a usable workflow. Admin CRUD support for the new fields must ship with the migration.

**Risk of the opposite (defer admin):** Coaching calls can only be created via SQL until the next sprint. This blocks content operations and makes the feature unusable.

---

### D-07: Should this sprint include any onboarding work?

**Decision: NO.**

**Rationale:** Onboarding depends on content existing (specifically, seed content so the first-login demo works). Onboarding without real content in the DB results in an empty onboarding overlay. Sequence is: seed content → onboarding. That's Sprint 12.

**Risk of the opposite (build onboarding now):** Onboarding demo works with empty DB = broken first impression. Requires another sprint to wire to real content anyway.

---

### D-08: Should this sprint include admin calendar or member viewer?

**Decision: NO.**

**Rationale:** Neither feature is blocking any member-facing functionality. Admin CRUD works. The calendar and member viewer become valuable once content volume and member count justify them. They are Phase 1 admin polish, not blocking work.

**Risk of the opposite:** Scope creep. Both are multi-day builds. Sprint 10 would lose 3–5 days on admin polish instead of shipping the coaching feature.

---

### D-09: Should this sprint include any ingestion, AI, or email work?

**Decision: NO.**

**Rationale:** All three are multi-week Phase 3+ efforts with no dependencies in the current sprint. Including any of them in Sprint 10 would delay the coaching system by weeks.

---

## 3. Final Implementation Contract

### Required Schema Changes

**File:** `supabase/migrations/0011_tier_gating_coaching.sql`

```sql
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'coaching_call';

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS tier_min subscription_tier;

ALTER TABLE content
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;

ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'coaching_attended';

CREATE INDEX IF NOT EXISTS idx_content_starts_at
  ON content (starts_at)
  WHERE status = 'published' AND type = 'coaching_call';
```

**Constraint:** `ALTER TYPE ADD VALUE` cannot run inside a transaction block. Supabase remote migrations run outside transactions. Confirm this locally before applying to production.

**After migration:** Regenerate TypeScript types: `npx supabase gen types typescript --project-id <PROJECT_ID> > types/supabase.ts`

---

### Required Helper Functions

**`lib/auth/check-tier-access.ts`**

```typescript
const TIER_ORDER: Record<string, number> = {
  level_1: 1,
  level_2: 2,
  level_3: 3,
  level_4: 4,
};

export function checkTierAccess(
  memberTier: string | null | undefined,
  requiredTier: string | null | undefined
): boolean {
  if (!requiredTier) return true;
  if (!memberTier) return false;
  return (TIER_ORDER[memberTier] ?? 0) >= (TIER_ORDER[requiredTier] ?? 0);
}
```

**Rules:**
- Never use Postgres enum ordering for tier comparison in application code. Use `TIER_ORDER`.
- Used in page-level server components (not middleware).
- Export only the pure function. No Supabase imports.

---

### Required Query Changes

**`lib/queries/get-library-content.ts`**

Add `memberTier: string | null` parameter. Add filter:

```typescript
.or(`tier_min.is.null,tier_min.lte.${memberTier}`)
```

Applied after all existing filters. If `memberTier` is null (should never happen in a protected route), fall back to showing only `tier_min IS NULL` content.

**`lib/queries/search-library-content.ts`**

Same parameter and filter pattern as above.

---

### Required Routes

**`app/(member)/coaching/page.tsx`** — New, server component

- Call `requireActiveMember()` at the top. This handles auth.
- Call `checkTierAccess(member.subscription_tier, 'level_3')`.
- If false: return `<CoachingUpgradePrompt />`.
- If true: fetch `coaching_call` content records, render `<UpcomingCallCard />` and `<CoachingReplayCard />` list.

**Query for coaching page:**
```typescript
const { data } = await supabase
  .from('content')
  .select('id, title, body, starts_at, vimeo_video_id, resource_links, publish_date')
  .eq('type', 'coaching_call')
  .eq('status', 'published')
  .order('starts_at', { ascending: false });
```

Split results: `starts_at > now()` → upcoming (show first). `starts_at <= now() OR starts_at IS NULL` → past replays.

**Zoom join link:** Retrieved from `process.env.COACHING_ZOOM_URL` in the server component. Rendered as a plain `<a>` tag. Never passed to a client component as a prop.

---

### Required Components

| Component | File | Notes |
|-----------|------|-------|
| `UpcomingCallCard` | `components/coaching/UpcomingCallCard.tsx` | Shows date, time, description, Zoom join link anchor |
| `CoachingReplayCard` | `components/coaching/CoachingReplayCard.tsx` | Shows title, date, Vimeo embed (if `vimeo_video_id`), body |
| `CoachingUpgradePrompt` | `components/coaching/CoachingUpgradePrompt.tsx` | Calm upgrade message. CTA links to `/join`. No Stripe logic. |
| `JournalNewEntryButton` | `components/journal/JournalNewEntryButton.tsx` | `"use client"` — wraps NoteSheet trigger with `contentId={null}` |

**Design guidance:** Match existing card design system. Use CSS tokens from `globals.css`. Reference `DailyPracticeCard` and `WeeklyPrincipleCard` for tone and spacing.

---

### Required Admin Changes

**`app/admin/content/new/page.tsx` and `app/admin/content/[id]/edit/page.tsx`:**

- Add `coaching_call` to the `<select>` for content type.
- Add `tier_min` field: `<select>` with options `[ none (NULL), level_1, level_2, level_3, level_4 ]`.
- Add `starts_at` field: `<input type="datetime-local">`. Show for all types (future-proofs events). Label it "Scheduled / Starts At".

**`app/admin/content/actions.ts`:**

- Add `tier_min: string | null` and `starts_at: string | null` to the input parsing and `buildRow()` function.
- Parse `tier_min`: `formData.get('tier_min') || null`.
- Parse `starts_at`: if non-empty string, convert to ISO before storing. `new Date(raw).toISOString()` or pass raw datetime-local string (Postgres accepts it).

---

### Required Navigation Changes

**`app/(member)/layout.tsx`:**

- Add `subscription_tier` to the member select: `select('*, subscription_tier, practice_streak')` (exact column names may differ — check against actual schema).
- Pass `tier={member.subscription_tier}` to `MemberTopNav`.

**`components/member/MemberTopNav.tsx`:**

- Accept `tier: string | null` prop.
- Import `checkTierAccess` from `lib/auth/check-tier-access`.
- Conditionally render Coaching nav link: `{checkTierAccess(tier, 'level_3') && <NavLink href="/coaching">Coaching</NavLink>}`.
- Desktop: add between existing nav links.
- Mobile: add Coaching tab icon to bottom bar.

---

### Required Cleanup

| Item | Action |
|------|--------|
| `app/(member)/dashboard/page.tsx` | **Delete.** Not linked from nav. Milestone 01 leftover. |
| `supabase/seed.sql` | **Fix** column names (`status` not `is_active`, `publish_date` not `published_at`). Add 3 coaching call records. |
| `types/supabase.ts` | **Regenerate** after migration is applied. |

---

### Required Testing

Minimum verification for each area before marking the sprint complete:

1. **Migration**: `SELECT * FROM content LIMIT 1` returns with `tier_min` and `starts_at` columns present.
2. **Tier gating - library**: Log in as Level 1 member. Create coaching call with `tier_min = level_3` via admin. Confirm it does NOT appear in library.
3. **Tier gating - search**: Search for the coaching call title as Level 1 member. Confirm no results.
4. **Coaching page - blocked**: Level 1 member visits `/coaching`. Confirm upgrade prompt renders, no crash.
5. **Coaching page - allowed**: Level 3 member visits `/coaching`. Confirm content renders.
6. **Zoom link**: View page source of `/coaching` as Level 3. Confirm Zoom URL appears only in rendered HTML (not bundled JS).
7. **Admin - create**: Create coaching call from admin form with `tier_min = level_3` and `starts_at`. Confirm saves and appears in content list.
8. **Journal new entry**: Click "New Entry" on journal page. Confirm NoteSheet opens. Save note. Confirm note appears in journal list with no associated content label.
9. **Build**: `npm run build` passes with zero TypeScript errors.
10. **Regression - Today**: Today page renders normally for Level 1 member after migration.

---

### Anti-Scope / Do Not Build

The following items are **explicitly excluded**. If implementation naturally encounters them, stop and move on:

- Onboarding overlay
- First-login detection
- Admin content calendar or gap detection
- Admin member viewer
- Upgrade prompt Stripe integration (just link to `/join`)
- Error boundaries
- ActiveCampaign or Resend
- Ingestion pipeline
- Transcription
- AI/vector/semantic search
- Community features
- Castos
- Streak milestone cards
- Coaching call scheduling or Calendly integration
- Per-member Zoom access tokens or registration

---

## 4. Implementation Order

### Step 1 — Apply Migration and Regenerate Types

**Goal:** Establish the schema foundation. Everything else depends on this.

**Output:** Migration 0011 applied to local dev DB and Supabase production. TypeScript types regenerated.

**Blocker checks:**
- Run `npm run build` before touching anything. Confirm it currently passes. This establishes baseline.
- Confirm `supabase/migrations/` has migrations 0001–0010 and no `0011` file yet.

**Go/no-go:** `SELECT column_name FROM information_schema.columns WHERE table_name='content' AND column_name='tier_min'` returns one row. Types file is updated with `tier_min` field on `content`.

---

### Step 2 — Create `checkTierAccess()` Helper

**Goal:** Establish the single source of truth for tier comparison logic.

**Output:** `lib/auth/check-tier-access.ts` with `checkTierAccess()` function.

**Blocker checks:** Step 1 complete.

**Go/no-go:** Function correctly returns `true` for `checkTierAccess('level_3', 'level_3')`, `false` for `checkTierAccess('level_1', 'level_3')`, and `true` for `checkTierAccess('level_4', 'level_3')`. No Supabase import in the file.

---

### Step 3 — Update Library and Search Queries with Tier Filtering

**Goal:** Ensure coaching calls (and any future tier-gated content) don't leak to lower tiers in existing views.

**Output:** `lib/queries/get-library-content.ts` and `lib/queries/search-library-content.ts` both accept and apply `memberTier` filter. `app/(member)/library/page.tsx` passes `member.subscription_tier` to queries.

**Blocker checks:** Step 2 complete. Step 1 complete so TypeScript knows `tier_min` exists.

**Go/no-go:** Create a test content row with `tier_min = 'level_3'`. Log in as Level 1 → not visible. Log in as Level 3 → visible. Existing content (tier_min = NULL) visible to Level 1.

---

### Step 4 — Update Admin Content Form

**Goal:** Admin can create coaching calls with all required fields.

**Output:** Admin form has `coaching_call` in type dropdown, `tier_min` select, and `starts_at` input. `buildRow()` handles both new fields. Create and edit both work.

**Blocker checks:** Step 1 complete (types must reflect new columns before admin form can save them without TS errors).

**Go/no-go:** Create a coaching call record via admin UI. Confirm it appears in content list with correct type badge. Confirm `tier_min` and `starts_at` are saved correctly by querying the DB directly.

---

### Step 5 — Build `/coaching` Page and Components

**Goal:** Level 3+ members have a working coaching destination. Lower-tier members see a calm upgrade prompt.

**Output:**
- `app/(member)/coaching/page.tsx`
- `components/coaching/UpcomingCallCard.tsx`
- `components/coaching/CoachingReplayCard.tsx`
- `components/coaching/CoachingUpgradePrompt.tsx`

**Blocker checks:** Step 4 complete (need at least one coaching call in DB to test the page). Step 2 complete (need `checkTierAccess`).

**Go/no-go:**
- `/coaching` renders upgrade prompt for Level 1.
- `/coaching` renders content for Level 3.
- Zoom URL is NOT in client JS bundle (check page source).
- Vimeo embed renders on past call cards.

---

### Step 6 — Update MemberTopNav with Tier-Aware Coaching Link

**Goal:** Coaching link appears only for eligible members.

**Output:** `app/(member)/layout.tsx` passes tier to nav. `components/member/MemberTopNav.tsx` conditionally renders Coaching link.

**Blocker checks:** Step 5 complete (route must exist before linking to it).

**Go/no-go:**
- Level 1 desktop nav: no Coaching link.
- Level 3 desktop nav: Coaching link visible, routes correctly.
- Mobile bottom bar: same conditional behavior.

---

### Step 7 — Add Journal New Entry Button

**Goal:** Members can write freeform journal entries without attaching them to content.

**Output:**
- `components/journal/JournalNewEntryButton.tsx`
- `app/(member)/journal/page.tsx` updated with button.

**Blocker checks:** None. This step is independent and can run parallel to Step 5–6 if pairing.

**Go/no-go:**
- "New Entry" button visible on `/journal`.
- NoteSheet opens with no content title displayed.
- Saving creates a `journal` row with `content_id = NULL`.
- Saved entry appears in journal list.

---

### Step 8 — Fix Seed Data

**Goal:** `seed.sql` works against current schema and includes coaching call test records.

**Output:** `supabase/seed.sql` updated with correct column names and 3 coaching call rows.

**Blocker checks:** Step 1 complete (seed must use current schema including new columns).

**Go/no-go:** Reset local DB, run seed, confirm no errors. Confirm coaching calls appear in admin content list. Confirm they have `tier_min = 'level_3'`.

---

### Step 9 — Delete Dead Dashboard Route

**Goal:** Remove Milestone 01 leftover that will confuse future developers.

**Output:** `app/(member)/dashboard/page.tsx` deleted.

**Blocker checks:** None.

**Go/no-go:** File does not exist. `npm run build` still passes.

---

### Step 10 — Final Build Verification

**Goal:** Confirm zero regressions, clean build, all acceptance criteria met.

**Output:** Clean `npm run build`. Manual verification of all 10 test cases from the testing checklist.

**Blocker checks:** All previous steps complete.

**Go/no-go:** All acceptance criteria from Section 1 are true. Sprint 10 is done.

---

## Final Locked Summary for ChatGPT

> Use this to orient any AI PM or coding session continuing Sprint 10.

**Status:** The Positives membership platform has completed Sprints 1–9. The core product is production-ready: daily audio, weekly/monthly content, library, notes/journal, admin CRUD, Stripe billing, and premium UI system.

**Sprint 10 goal:** Add tier-based access control and the coaching feature for Level 3+ members.

**What must be built:**

1. **Migration 0011** — adds `coaching_call` to `content_type` enum, `tier_min` (nullable `subscription_tier`) to `content`, `starts_at` (nullable TIMESTAMPTZ) to `content`, `coaching_attended` to `activity_event_type` enum.

2. **`checkTierAccess(memberTier, requiredTier): boolean`** in `lib/auth/check-tier-access.ts`. Uses explicit `{ level_1: 1, level_2: 2, level_3: 3, level_4: 4 }` ordering. Never relies on Postgres enum comparison.

3. **Library + search queries** updated to filter on `tier_min IS NULL OR tier_min <= memberTier`. Both `get-library-content.ts` and `search-library-content.ts`.

4. **`/coaching` page** — server component. Level 3+ sees upcoming call (with Zoom link from env var `COACHING_ZOOM_URL`, rendered server-side only) and replay archive. Level 1/2 sees upgrade prompt linking to `/join`.

5. **Admin form** extended with `coaching_call` type, `tier_min` select (None / Level 1–4), `starts_at` datetime input.

6. **MemberTopNav** shows Coaching link for Level 3+ only. Layout passes `subscription_tier` to nav.

7. **Journal "New Entry" button** — opens `NoteSheet` with `contentId={null}`. Pure client wrapper component.

8. **Seed data fixed** — correct column names, 3 coaching call records.

9. **Delete** `app/(member)/dashboard/page.tsx`.

**Key decisions locked:**
- Coaching calls live in the unified `content` table. No separate tables.
- Lower-tier members get an upgrade prompt on `/coaching`, not a redirect or error.
- `tier_min` is a universal content column, not coaching-specific.
- No onboarding, calendar, member viewer, ingestion, AI, email, or community work in this sprint.

**Architecture rules:**
- All access control is server-side. Never gate in client components.
- Design tokens from `globals.css`. Use `member-container` layout class.
- Follow existing `requireActiveMember()` pattern at top of every member page.
- Extend `buildRow()` in admin actions — do not rewrite the form.
- TypeScript types must be regenerated after migration.

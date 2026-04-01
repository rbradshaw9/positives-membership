# Next Milestone Recommendation

> Based on actual repo state, not aspirational docs.
> Generated 2026-04-01.

---

## Milestone Name

**Sprint 10: Tier-Gated Access + Coaching System + Journal New Entry**

---

## Why This Should Come Next

### 1. It's the highest-leverage schema change

Every premium feature planned for the next 6 months depends on `tier_min` existing on the `content` table. Adding it now establishes the pattern once, so every future content type (events, workshops, courses, bonus material) gets gating for free.

### 2. It validates the unified content model with a real use case

The docs claim "everything member-facing should be a content row." Coaching calls are the first test of this principle beyond the original 3 types. If it works cleanly (and it should), the pattern is proven for events, replays, and bonus content.

### 3. It's the smallest milestone that closes the biggest doc/code gap

`POSITIVES_AI_CONTEXT.md` says `coaching_call` and `tier_min` exist. They don't. Building them now makes the canonical AI context doc truthful — which means every future AI-assisted session starts with accurate context.

### 4. The freeform journal entry is nearly free

The schema already supports `content_id = NULL`. The server action already accepts it. Adding a "New Entry" button to the journal page is 30 minutes of work and closes a real UX gap.

### Why NOT the other candidates

| Alternative | Why defer |
|-------------|----------|
| **Onboarding** | Requires content to exist first. An onboarding flow with no seed data to demo is useless. Build tier gating first, seed content second, then onboarding. |
| **Admin completion** (calendar, member viewer) | Nice-to-have but not blocking any member-facing feature. Admin CRUD works. Calendar and member viewer can wait until content volume justifies them. |
| **Ingestion pipeline** | Solves a content-ops problem. Current content volume (manually created via admin) doesn't justify the complexity yet. Phase 3 remains the right timing. |

---

## Scope

### In Scope

| Deliverable | Details |
|-------------|---------|
| Migration `0011` | Add `coaching_call` to `content_type` enum. Add `tier_min` (nullable `subscription_tier`) to `content`. Add `starts_at` (nullable TIMESTAMPTZ) to `content`. Add `coaching_attended` to `activity_event_type` enum. |
| `checkTierAccess()` helper | `lib/auth/check-tier-access.ts` — pure function: `(memberTier, requiredTier) → boolean`. Tier order: `level_1 < level_2 < level_3 < level_4`. |
| `/coaching` page | Server component. Requires Level 3+. Shows next upcoming call (from `starts_at`), Zoom join link (from env var `COACHING_ZOOM_URL`), replay archive (past coaching calls with Vimeo embeds). |
| Tier-aware library queries | Update `getLibraryContent()` and `searchLibraryContent()` to accept `memberTier` and filter by `tier_min`. |
| MemberTopNav coaching link | Show "Coaching" link for Level 3+ members only. |
| Admin coaching support | Add `coaching_call` to content type dropdown. Add `tier_min` field to admin content form. |
| Journal "New Entry" | Add button to `/journal` page that opens NoteSheet with `contentId = null`. |
| Seed data update | Fix `seed.sql` to use current column names. Add 3 coaching call records (2 past with vimeo_video_id, 1 upcoming). |
| Clean up dead `dashboard` route | Delete `app/(member)/dashboard/page.tsx` or redirect to `/today`. |

### Out of Scope

| Item | Reason |
|------|--------|
| Onboarding flow | Defer to Sprint 12 — needs seed content first |
| Admin content calendar | Not blocking anything |
| Admin member viewer | Not blocking anything |
| Events system (Level 2) | Phase 2 feature |
| Q&A system | Phase 2 feature |
| Ingestion pipeline | Phase 3 feature |
| ActiveCampaign / Resend | Phase 1.5+ |
| Community post UI | Phase 2+ |
| Upgrade prompts | Can be added incrementally later |

---

## Required Schema Changes

### Migration 0011

```sql
-- Add coaching_call to content_type enum
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'coaching_call';

-- Add tier_min to content table
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS tier_min subscription_tier;

-- Add starts_at for time-aware content (coaching calls, events)
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;

-- Add coaching_attended event type
ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'coaching_attended';

-- Index for upcoming coaching queries
CREATE INDEX IF NOT EXISTS idx_content_starts_at
  ON content (starts_at)
  WHERE status = 'published' AND type = 'coaching_call';
```

**Risk:** `ALTER TYPE ... ADD VALUE` cannot run inside a transaction in Postgres. The migration must handle this. Supabase migrations run outside transactions by default, so this should be fine.

---

## Required Routes / Components / Actions

### New Files

| File | Purpose |
|------|---------|
| `lib/auth/check-tier-access.ts` | `checkTierAccess(memberTier, requiredTier): boolean` |
| `app/(member)/coaching/page.tsx` | Coaching page — server component |
| `components/coaching/CoachingReplayCard.tsx` | Replay card with Vimeo embed |
| `components/coaching/UpcomingCallCard.tsx` | Next call info with Zoom join button |

### Modified Files

| File | Change |
|------|--------|
| `app/(member)/layout.tsx` | Pass `subscription_tier` to MemberTopNav |
| `components/member/MemberTopNav.tsx` | Accept `tier` prop, conditionally render Coaching link |
| `lib/queries/get-library-content.ts` | Accept `memberTier` param, add `WHERE tier_min IS NULL OR tier_min <= $tier` |
| `lib/queries/search-library-content.ts` | Same tier filtering |
| `app/(member)/library/page.tsx` | Pass `member.subscription_tier` to query functions |
| `app/(member)/journal/page.tsx` | Add "New Entry" button |
| `app/admin/content/new/page.tsx` | Add `coaching_call` to type dropdown, add `tier_min` select |
| `app/admin/content/actions.ts` | Handle `tier_min` and `starts_at` in `buildRow()` |
| `supabase/seed.sql` | Fix column names, add coaching call seed data |
| `types/supabase.ts` | Regenerate types after migration |

### Deleted Files

| File | Reason |
|------|--------|
| `app/(member)/dashboard/page.tsx` | Dead code — Milestone 01 leftover |

---

## Dependencies

| Dependency | Status |
|------------|--------|
| Supabase database access | ✅ Available |
| `COACHING_ZOOM_URL` env var | ⚠️ Must be added to `.env.local` and Vercel |
| Existing `requireActiveMember()` | ✅ Already built |
| Existing `NoteSheet` component | ✅ Already handles null contentId |
| Existing admin content form | ✅ Will be extended, not replaced |

---

## Risks

| Risk | Mitigation |
|------|------------|
| `ALTER TYPE ADD VALUE` cannot be rolled back inside a transaction | Supabase remote migrations run outside TX. Test locally first. |
| Tier comparison relies on enum ordering | Implement explicit ordering in `checkTierAccess()` — don't rely on Postgres enum comparison. |
| Library queries may break if `tier_min` filter is added incorrectly | `tier_min IS NULL` must pass (null = all tiers). Test with existing content (which has null tier_min). |
| Zoom link exposure | Only render on authenticated, tier-verified server component. Never in client bundle. |
| MemberTopNav changes may affect mobile layout | Test both desktop and mobile after adding Coaching link. |

---

## Acceptance Criteria

### Schema

- [ ] Migration 0011 applied successfully
- [ ] `content.tier_min` column exists and accepts `subscription_tier` values
- [ ] `content.starts_at` column exists
- [ ] `coaching_call` is a valid `content_type`
- [ ] `coaching_attended` is a valid `activity_event_type`
- [ ] Existing content works unchanged (all have `tier_min = NULL`)

### Tier Gating

- [ ] `checkTierAccess('level_1', 'level_3')` returns `false`
- [ ] `checkTierAccess('level_3', 'level_3')` returns `true`
- [ ] `checkTierAccess('level_4', 'level_3')` returns `true`
- [ ] Library queries exclude content where `tier_min > memberTier`
- [ ] Library queries include content where `tier_min IS NULL`
- [ ] Search queries respect same tier filtering

### Coaching Page

- [ ] `/coaching` renders for Level 3+ members
- [ ] `/coaching` renders upgrade prompt for Level 1/2 members (not a hard redirect)
- [ ] Upcoming call shows date, time, and Zoom join button
- [ ] Past calls show Vimeo replay embed
- [ ] Zoom link is NOT present in client-side JavaScript bundle

### Navigation

- [ ] MemberTopNav shows "Coaching" link for Level 3+ members
- [ ] MemberTopNav does NOT show "Coaching" link for Level 1/2 members
- [ ] Mobile bottom bar includes Coaching icon for Level 3+

### Admin

- [ ] Content form shows `coaching_call` in type dropdown
- [ ] Content form has `tier_min` select (None / Level 1 / Level 2 / Level 3 / Level 4)
- [ ] Content form has `starts_at` datetime input for coaching calls
- [ ] Creating a coaching call with `tier_min = level_3` works

### Journal

- [ ] "New Entry" button visible on journal page
- [ ] Clicking it opens NoteSheet with no content association
- [ ] Saving a freeform note works (content_id = null)
- [ ] Freeform note appears in journal list

### Cleanup

- [ ] `app/(member)/dashboard/page.tsx` is deleted or redirects to `/today`
- [ ] `seed.sql` uses correct column names
- [ ] Seed includes coaching call test data
- [ ] TypeScript types regenerated

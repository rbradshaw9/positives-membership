# Build Brief — Sprint 10: Tier-Gated Access + Coaching + Journal Entry

> Execution brief for IDE coding agent. Based on actual code inspection, not docs.
> Generated 2026-04-01.

---

## Objective

Add `tier_min` gating to the content system, build the `/coaching` page for Level 3+ members, update library/search queries to enforce tier filtering, add a "New Entry" button to the journal page, and clean up dead code.

---

## Why It Matters

This is the foundation for every premium feature. Without `tier_min` on the content table, there is no way to gate any content to higher tiers. Without the coaching page, there is no differentiated value for Level 3+ members. These are the two biggest gaps between what the product docs promise and what the code delivers.

---

## Existing Architecture Patterns to Preserve

Before writing code, understand these patterns:

1. **Server-side access control.** All member pages call `requireActiveMember()` at the top. Never gate access client-side.

2. **Unified content model.** All member-facing content is a row in the `content` table. Coaching calls should follow this pattern exactly — same admin CRUD, same library integration, same notes support.

3. **Server actions pattern.** Form mutations use `"use server"` actions in `actions.ts` files. See `app/admin/content/actions.ts` and `app/(member)/notes/actions.ts`.

4. **Query helpers in `lib/queries/`.** Each content query is its own file. Follow the existing pattern: export a typed function, use the server Supabase client.

5. **Component location.** Member-facing components go in `components/` under a feature subfolder. Today cards are in `components/today/`, journal in `components/journal/`, etc.

6. **CSS design tokens.** Use CSS custom properties from `globals.css`. Classes like `member-container`, `shadow-soft`, `border-border`, `text-foreground`, `text-muted-foreground`, etc.

7. **Admin content form.** Uses `parseFormData()` → `buildRow()` → Supabase upsert pattern. Extend `buildRow`, don't restructure it.

---

## Implementation Steps

### Step 1: Apply Migration 0011

**File:** `supabase/migrations/0011_tier_gating_coaching.sql`

```sql
-- Extend content_type enum with coaching_call
ALTER TYPE content_type ADD VALUE IF NOT EXISTS 'coaching_call';

-- Add tier_min to content table
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS tier_min subscription_tier;

-- Add starts_at for time-aware content (coaching calls, future events)
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;

-- Add coaching_attended to activity_event_type enum
ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'coaching_attended';

-- Index for coaching queries
CREATE INDEX IF NOT EXISTS idx_content_starts_at
  ON content (starts_at)
  WHERE status = 'published' AND type = 'coaching_call';
```

**Apply remotely via Supabase Dashboard SQL editor or CLI.** Then regenerate TypeScript types.

### Step 2: Create `checkTierAccess()` helper

**File:** `lib/auth/check-tier-access.ts`

```typescript
const TIER_ORDER: Record<string, number> = {
  level_1: 1,
  level_2: 2,
  level_3: 3,
  level_4: 4,
};

/**
 * Returns true if the member's tier meets or exceeds the required tier.
 * If requiredTier is null/undefined, access is granted (content is public to all members).
 */
export function checkTierAccess(
  memberTier: string | null | undefined,
  requiredTier: string | null | undefined
): boolean {
  if (!requiredTier) return true; // null tier_min = all tiers
  if (!memberTier) return false;  // no tier = no premium access
  return (TIER_ORDER[memberTier] ?? 0) >= (TIER_ORDER[requiredTier] ?? 0);
}
```

**Important:** Do not use Postgres enum comparison. Use explicit ordering. This keeps the logic testable and portable.

### Step 3: Update library queries with tier filtering

**File:** `lib/queries/get-library-content.ts`

Current signature: `getLibraryContent(typeFilter, limit, offset)`

New signature: `getLibraryContent(typeFilter, limit, offset, memberTier)`

Add to the query builder:

```typescript
// After existing filters...
if (memberTier) {
  query = query.or(`tier_min.is.null,tier_min.lte.${memberTier}`);
}
```

**File:** `lib/queries/search-library-content.ts`

Same pattern — add `memberTier` parameter and apply `tier_min` filter.

**File:** `app/(member)/library/page.tsx`

Pass `member.subscription_tier` from the `requireActiveMember()` result to both query functions.

### Step 4: Build the `/coaching` page

**File:** `app/(member)/coaching/page.tsx`

Server component structure:

```typescript
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { checkTierAccess } from "@/lib/auth/check-tier-access";
// ... queries and components

export default async function CoachingPage() {
  const member = await requireActiveMember();

  if (!checkTierAccess(member.subscription_tier, "level_3")) {
    // Render upgrade prompt, NOT a redirect
    return <UpgradePrompt requiredTier="level_3" />;
  }

  // Fetch coaching content: upcoming + past
  // Render UpcomingCallCard + CoachingReplayCard list
}
```

**Query:** Fetch content with `type = 'coaching_call'`, `status = 'published'`, ordered by `starts_at DESC`. Split into upcoming (starts_at > now) and past (starts_at <= now || starts_at IS NULL).

**Components to create:**
- `components/coaching/UpcomingCallCard.tsx` — shows date, time, Zoom join button (from env var)
- `components/coaching/CoachingReplayCard.tsx` — shows title, date, Vimeo embed
- `components/coaching/UpgradePrompt.tsx` — calm, branded upgrade message for non-eligible members

**Zoom link:** Use `process.env.COACHING_ZOOM_URL` server-side. Never expose in client bundle. The join button can be a simple `<a>` tag rendered only on the server.

### Step 5: Update MemberTopNav with tier-aware coaching link

**File:** `app/(member)/layout.tsx`

Currently fetches `practice_streak`. Also select `subscription_tier` and pass it to `MemberTopNav`.

**File:** `components/member/MemberTopNav.tsx`

Accept new prop: `tier: string | null`

Conditionally render `Coaching` link when `checkTierAccess(tier, 'level_3')` is true.

Desktop: Add "Coaching" link between existing nav items.
Mobile: Add coaching icon to bottom bar.

### Step 6: Add coaching to admin content form

**File:** `app/admin/content/new/page.tsx`

- Add `coaching_call` to the content type `<select>` dropdown.
- Add `tier_min` select field (options: None, Level 1, Level 2, Level 3, Level 4).
- Add `starts_at` datetime input (shown when type is `coaching_call`).

**File:** `app/admin/content/actions.ts`

- Add `tier_min` and `starts_at` to `ContentInput` type.
- Add both to `parseFormData()`.
- Add both to `buildRow()` output.

### Step 7: Add "New Entry" button to journal page

**File:** `app/(member)/journal/page.tsx`

Add a button after the `PageHeader` that opens `NoteSheet` with `contentId={null}`.

This requires making the journal page partially client-interactive. Options:

**Option A (recommended):** Create a small client component `JournalNewEntryButton` that wraps the NoteSheet trigger.

```typescript
// components/journal/JournalNewEntryButton.tsx
"use client";
import { NoteSheet } from "@/components/notes/NoteSheet";
// ... button that opens NoteSheet with contentId={null}
```

Import into the server page and render alongside PageHeader.

### Step 8: Clean up dead code

**Delete:** `app/(member)/dashboard/page.tsx` — Milestone 01 leftover, not linked from nav. Dead code.

### Step 9: Fix and extend seed data

**File:** `supabase/seed.sql`

- Fix existing seed row to use correct columns (`status = 'published'` instead of `is_active = true`; `publish_date` instead of `published_at`).
- Add 3 coaching call records:
  - 2 past calls with `vimeo_video_id`, `tier_min = 'level_3'`, `starts_at` in the past
  - 1 upcoming call with `tier_min = 'level_3'`, `starts_at` in the future, no vimeo_video_id

### Step 10: Regenerate TypeScript types

Run `npx supabase gen types typescript --project-id $PROJECT_ID > types/supabase.ts` or equivalent.

---

## Testing Checklist

### Schema Verification

- [ ] Migration applied without errors
- [ ] `SELECT column_name FROM information_schema.columns WHERE table_name = 'content' AND column_name IN ('tier_min', 'starts_at')` returns 2 rows
- [ ] Existing content rows still have `tier_min = NULL`

### Tier Gating

- [ ] Create a content row with `tier_min = 'level_3'`
- [ ] Log in as Level 1 member → that content should NOT appear in library
- [ ] Log in as Level 3 member → that content SHOULD appear in library
- [ ] Search for that content → same tier filtering applies
- [ ] Content with `tier_min = NULL` → visible to all tiers

### Coaching Page

- [ ] Level 1 member navigates to `/coaching` → sees upgrade prompt
- [ ] Level 3 member navigates to `/coaching` → sees coaching content
- [ ] Upcoming call shows Zoom join link
- [ ] Past call shows Vimeo replay
- [ ] View page source → Zoom URL is NOT in client JS bundle

### Navigation

- [ ] Level 1 member → no "Coaching" in nav
- [ ] Level 3 member → "Coaching" visible in nav
- [ ] Mobile bottom bar → Coaching icon present for Level 3+

### Admin

- [ ] Create new content → `coaching_call` available in type dropdown
- [ ] Set `tier_min = level_3` → saves correctly
- [ ] Set `starts_at` → saves correctly
- [ ] Edit existing content → tier_min shows current value

### Journal

- [ ] "New Entry" button visible on journal page
- [ ] Click opens NoteSheet
- [ ] Save creates note with `content_id = NULL`
- [ ] Note appears in journal list (not associated with any content)

### Regressions

- [ ] Today page renders normally
- [ ] All existing library content still visible
- [ ] Existing notes still accessible
- [ ] Audio player still works
- [ ] Account page renders normally
- [ ] Admin content list still works

---

## Definition of Done

1. Migration 0011 applied to Supabase production
2. All acceptance criteria from `NEXT_MILESTONE_RECOMMENDATION.md` pass
3. No regressions in existing functionality
4. TypeScript types regenerated
5. Dead `dashboard` route removed
6. Seed data fixed and extended
7. Build succeeds (`npm run build`)

---

## Things to Avoid

| Anti-pattern | Why |
|--------------|-----|
| Adding tier checks to middleware | Tier gating belongs in page-level server components, not middleware. Middleware only knows auth status. |
| Creating separate tables for coaching | Coaching calls are `content` rows. Use the unified model. |
| Client-side tier enforcement | All tier checks happen server-side. Client components receive already-filtered data. |
| Redirecting lower-tier members from `/coaching` | Show a calm upgrade prompt instead. Never hard-block. |
| Exposing Zoom URL in client JavaScript | Render the Zoom link as a server-rendered `<a>` tag inside a server component. |
| Restructuring admin content form | Extend `buildRow()` and `parseFormData()`. Don't rewrite the form. |
| Building onboarding in this sprint | Defer to Sprint 12. |
| Building admin calendar or member viewer | Defer to Sprint 11. |
| Changing RLS policies for tier gating | Tier filtering should happen at the query level (application code), not RLS. RLS is for row ownership — not tier logic. |

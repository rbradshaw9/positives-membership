# Sprint 1 Build Plan — Today Comes Alive
## Positives Platform · April 2026

> ✅ **Sprint 1 is complete.** This document is retained as historical reference only.

> **Status:** Complete
> **Scope:** Today page only — Daily, Weekly, Monthly content live + Progress tracking foundation
> **Depends on:** `member-experience-implementation-plan.md`

---

## 1. Sprint 1 Objective

Make the Today page feel like a real premium daily-practice product for Positives Membership members.

By the end of this sprint, when a member opens `/today` they will see:

- **Daily Practice:** real audio content fetched by calendar date from Supabase
- **This Week:** real weekly principle text from Supabase (no hardcoded copy)
- **This Month:** real monthly theme text from Supabase (no hardcoded copy)
- All three sections handle graceful empty states (no content = calm placeholder, not an error)
- Audio completion fires a progress record write and updates the member's streak
- The page renders correctly in both Eastern morning and earlier UTC contexts

This sprint does not build admin tools, the ingestion pipeline, the Library, or the Journal. Its only job is to make Today real.

---

## 2. Scope — Included vs Excluded

### Included in Sprint 1

| Area | Detail |
|------|--------|
| Schema migration | Add `status`, `publish_date`, `week_start`, `month_year`, `excerpt`, `member_timezone` (storage only), `is_today_override` to schema |
| Daily content query | Replace `is_active + published_at DESC` with `publish_date = resolved_local_date` and `status = 'published'` |
| Weekly content query | New `getWeeklyContent()` — `week_start <= resolved_local_date DESC LIMIT 1` |
| Monthly content query | New `getMonthlyContent()` — `month_year = YYYY-MM` matching resolved local month |
| `WeeklyPrincipleCard` | Wire to real data with typed props and graceful empty state |
| `MonthlyThemeCard` | Wire to real data with typed props and graceful empty state |
| Today page loader | Parallel `Promise.all` for all three queries |
| Progress tracking | `markListened` server action — writes to `progress` table |
| Streak update | `markListened` increments `member.practice_streak` + `last_practiced_at` on the same action |
| AudioPlayer completion callback | Fire `markListened` at 80% playback threshold (client → server action) |
| Timezone strategy | Option A (canonical Eastern) for rendering; `member_timezone` column added for future Option B |
| Seed data | 1 daily, 1 weekly, 1 monthly seeded in Supabase for smoke testing |

### Excluded from Sprint 1

| Area | Reason |
|------|--------|
| Admin content CRUD | Sprint 3 |
| Ingestion pipeline (Drive → S3 → AI) | Sprint 5 |
| Library page (`/library`) | Sprint 2 |
| Journal page (`/journal`) | Sprint 2 |
| Events, Q&A | Sprint 4 |
| Vimeo embeds in Weekly/Monthly | Sprint 3 (when admin can set the `vimeo_video_id`) |
| Member timezone rendering (Option B) | Deferred — column stored now, rendering remains Option A |
| Streak milestone recognition | Sprint 6 |
| ActiveCampaign integration | Sprint 6 |
| Castos podcast feed | Sprint 5 |
| RLS tier-gating for content | Sprint 4 (Today content is Level 1 — no gating needed now) |
| `is_today_override` rendering logic | Sprint 3 (admin toggle — no UI yet) |
| Duplicate-record guard (gap detection) | Sprint 3 |

---

## 3. Final Today Page Recommendation

### Page model

Today is a single **stacked column** page. It is not tabbed. It is not a horizontal carousel. It has one scroll direction on mobile, and a calm grid on desktop.

This is a deliberate product decision: tabs imply equal-weight content. Today is not equal-weight. Daily is primary. Weekly and Monthly are supporting context.

### Mobile layout (390px reference)

```
┌────────────────────────────┐
│ [Today heading]  [streak]  │  ← fixed header area with greeting + subtle streak
├────────────────────────────┤
│                            │
│   DAILY PRACTICE CARD      │  ← full width, dark surface, audio player
│   (DailyPracticeCard)      │     dominant visual weight
│                            │
├────────────────────────────┤
│   THIS WEEK                │  ← lighter card, secondary visual weight
│   (WeeklyPrincipleCard)    │
├────────────────────────────┤
│   THIS MONTH               │  ← lighter card, tertiary visual weight
│   (MonthlyThemeCard)       │
└────────────────────────────┘
  [Nav: Today · Library · Journal · Account]  ← fixed bottom nav
```

Safe area at bottom for nav bar — already implemented in layout.

### Desktop layout

On screens >= 768px: max-width container centered, single column preserved.
Do not introduce a 2-column layout in this sprint. The product should feel mobile-native first.

If a sidebar or 2-column layout is desired in a future sprint, introduce it then with full design review. For now: one column, spacious, calm.

### Content hierarchy

| Slot | Component | Visual weight | Props |
|------|-----------|--------------|-------|
| Primary | `DailyPracticeCard` | Dominant — dark card, full width, audio player | `content`, `audioUrl` |
| Secondary | `WeeklyPrincipleCard` | Supporting — lighter card, text-first | `content` (nullable) |
| Tertiary | `MonthlyThemeCard` | Grounding context — lightest card | `content` (nullable) |

### Empty states — all three

Every section must render calmly when content is missing. Do not show error UI. Do not show a skeleton indefinitely.

| Section | Empty state copy |
|---------|-----------------|
| Daily | "Today's practice is being prepared. Check back soon." |
| Weekly | "This week's principle is on its way." |
| Monthly | "This month's theme will be here soon." |

All empty states should feel intentional, warm, and non-apologetic. They should read like brand copy, not error messages.

### First-run experience (new member, no progress)

- No streak shown (or shown as "Day 1" — not "0 days")
- All three content slots shown, empty or live depending on content existence
- No tutorial overlay, no modal, no onboarding checklist
- The page itself is the welcome — it should not need explanation

### What should NOT be built in this sprint

- Streak display on Today (schema and logic wired, display deferred to Sprint 6)
- Reflection prompt input on Today page (Sprint 2)
- "Listened" indicators inside Today (Sprint 2)
- Any Vimeo embed in Weekly or Monthly cards (Sprint 3)
- Any milestone celebration UI (Sprint 6)

---

## 4. Timezone Strategy Decision

### The problem

The Today page shows content for "today." But "today" is different for a member in New York vs. a server running in UTC.

At midnight UTC (8pm ET), a server that renders `CURRENT_DATE` will return April 2 while a member in Eastern time is still on April 1. They would see no content, or worse, tomorrow's content a day early.

This must be resolved before any daily content is published.

### Option A — Canonical Timezone Rendering

**Definition:** Content activation is always evaluated against a single canonical timezone — `America/New_York` (Eastern). The server computes the current Eastern date and uses it in all Today queries.

**How it works:**
- Supabase function or DB call evaluates `NOW() AT TIME ZONE 'America/New_York'` to get the effective date
- `publish_date` column stores Eastern calendar dates (admin always enters Eastern dates)
- Server computes the effective date at render time; no client timezone is used
- All members in the U.S. see the same "today" — Eastern calendar date

**Tradeoffs:**

| | |
|--|--|
| ✅ Implementation simplicity | No client-side timezone logic needed |
| ✅ No hydration mismatch risk | Date computed server-side only |
| ✅ Consistent publishing | Admin always knows which date activates which content |
| ✅ No new column on member | No member_timezone needed for rendering |
| ⚠️ West Coast 9pm anomaly | Members in Pacific time see "tomorrow's" content at 9pm PT (midnight ET) |
| ⚠️ International members | If Positives ever expands, members in Europe or Asia-Pacific see wrong dates |
| ✅ Acceptable for v1 | Audience is U.S.-centric; Eastern is the dominant timezone |

**Implementation:**

```ts
// lib/dates/effective-date.ts
export function getEffectiveDate(): string {
  // Returns YYYY-MM-DD in America/New_York timezone
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()).split("/").map((p, i) =>
    i === 2 ? p : p.padStart(2, "0")
  ).join("-") // returns MM-DD-YYYY — needs reordering
  // Simplest: use toLocaleDateString + manual format, or date-fns-tz
}
```

Better: use `date-fns-tz` (already in most Next.js projects or trivial to add):

```ts
import { format, toZonedTime } from "date-fns-tz";

const CANONICAL_TZ = "America/New_York";

export function getEffectiveDate(): string {
  return format(toZonedTime(new Date(), CANONICAL_TZ), "yyyy-MM-dd");
}

export function getEffectiveMonthYear(): string {
  return format(toZonedTime(new Date(), CANONICAL_TZ), "yyyy-MM");
}
```

This runs server-side only. No client import. No hydration risk.

---

### Option B — Member-Local Rendering

**Definition:** Each member's "today" is their own local calendar date. The member's IANA timezone string is stored on their `member` row. The server uses it to resolve the effective date per member.

**How it works:**
- `member.timezone` stores IANA string (e.g., `"America/Los_Angeles"`)
- On `requireActiveMember()`, `timezone` is returned alongside subscription data
- Today page uses `member.timezone` to compute effective date for all three content queries
- A member in Tokyo and a member in Chicago see different "today" content

**Tradeoffs:**

| | |
|--|--|
| ✅ Genuine international-quality UX | Members always see "their" today |
| ✅ West Coast evening is correct | Pacific member at 10pm PT sees today's content, not tomorrow's |
| ⚠️ Implementation complexity | Timezone must be stored, retrieved, and used in every content query |
| ⚠️ Hydration mismatch risk | If any timezone logic leaks to client, Next.js date will differ between server/client renders |
| ⚠️ Admin scheduling complexity | Admin must understand that a single `publish_date` resolves differently for different members |
| ⚠️ Missing timezone fallback | New members or browser-restricted members may not have a timezone stored |
| ⚠️ Timezone detection | Requires client-side detection on first visit or browser API usage |

**Timezone detection approaches:**
- **At sign-up/onboarding:** `Intl.DateTimeFormat().resolvedOptions().timeZone` in the browser → sent to server as part of password/profile step. Clean but requires onboarding change.
- **On first Today page visit (client component):** detect timezone client-side, write to member row via server action. Introduces a client hydration step on a server-rendered page.
- **Account page:** Member sets it manually. Least automated but fully safe.

---

### Recommendation

**Ship Option A (canonical Eastern) in Sprint 1.**

**Reason:**
1. The audience is U.S.-centric. The overwhelming majority of Positives members are in ET or CT — at most one hour behind Eastern.
2. The West Coast 9pm anomaly is minor: Pacific members see the next day's content an hour before midnight PT. This is a tolerable edge case for an early platform.
3. Option A has zero hydration risk, zero client-side timezone code, and zero new UI work.
4. It can be changed to Option B in a single sprint when the platform scales.

**What to do now about member timezone:**

Add `timezone TEXT` to the `member` table in this sprint's migration. Do NOT use it for rendering yet. Populate it on account creation and profile update going forward. This prevents a future migration from having to backfill an entirely missing column.

```sql
-- In migration 0006
ALTER TABLE member ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';
```

**Default:** `America/New_York`. Safe fallback for U.S. members.

**When to switch to Option B:**

Sprint 4 or later, when member timezone has had time to populate organically through account settings. Migration path: replace `getEffectiveDate()` call in Today page to accept `member.timezone` as parameter instead of hardcoded `America/New_York`.

**DST concern with Option A:** `date-fns-tz` handles DST automatically when using IANA timezone strings. Do not use a fixed UTC offset (e.g., `UTC-5`). Always use `"America/New_York"`. This is correct year-round regardless of DST transitions.

---

## 5. Content Publishing Logic — Daily / Weekly / Monthly

### 5.1 Daily Audio

**Activation model:** Exact date match. A `daily_audio` record with `publish_date = effective_date_eastern` and `status = 'published'` is the current day's content.

**Query (conceptual):**
```sql
SELECT id, title, description, excerpt, duration_seconds, castos_episode_url, s3_audio_key, published_at
FROM content
WHERE type = 'daily_audio'
  AND status = 'published'
  AND publish_date = :effective_date   -- YYYY-MM-DD in Eastern time
ORDER BY created_at DESC              -- tiebreaker: latest-created wins if duplicates
LIMIT 1;
```

**Why no future content leak:** The `publish_date = :effective_date` exact match means content scheduled for tomorrow never appears today. No range needed. Clean.

**Admin override:** The `is_today_override` boolean field allows an admin to force a specific record to appear regardless of its `publish_date`. The query should check this first:

```sql
-- Preferred: check override first
SELECT ... FROM content
WHERE type = 'daily_audio' AND status = 'published' AND is_today_override = TRUE
LIMIT 1;

-- Fallback: exact date match
SELECT ... FROM content
WHERE type = 'daily_audio' AND status = 'published' AND publish_date = :effective_date
ORDER BY created_at DESC LIMIT 1;
```

In Sprint 1, the override logic is not needed yet (no admin UI). For Sprint 1: use date-match only. The `is_today_override` column is added to schema now so it's ready for Sprint 3.

**Archive behavior:** Old daily records stay `status = 'published'` permanently. They do not become `archived` automatically. A past `publish_date` simply no longer matches the today query. These records become the Library archive — browsable by date. No cleanup cron needed.

---

### 5.2 Weekly Principle

**Activation model:** The most recently active week. "Active" = a `weekly_principle` record whose `week_start` (a Monday) is on or before today's effective date.

**Query (conceptual):**
```sql
SELECT id, title, description, excerpt, vimeo_video_id
FROM content
WHERE type = 'weekly_principle'
  AND status = 'published'
  AND week_start <= :effective_date   -- any week that has started
ORDER BY week_start DESC             -- most recent week wins
LIMIT 1;
```

**Rollover behavior:** No cron needed. On Monday, `effective_date` advances. The query now returns the record whose `week_start` is the most recent past Monday. This is self-activating by date logic alone.

**Admin creates weekly records ahead of time.** Ideally 2–4 weeks in advance. The record simply sits dormant until its `week_start` date is reached.

**If no weekly record exists with `week_start <= effective_date`:** Empty state rendered — "This week's principle is on its way." Calm, not broken.

---

### 5.3 Monthly Theme

**Activation model:** Match on `month_year` string (`YYYY-MM`) against the effective Eastern month.

**Query (conceptual):**
```sql
SELECT id, title, description, excerpt, vimeo_video_id
FROM content
WHERE type = 'monthly_theme'
  AND status = 'published'
  AND month_year = :effective_month_year   -- e.g. '2026-04'
LIMIT 1;
```

**Rollover behavior:** No cron. On the first of the month, `effective_month_year` changes. The query automatically returns the new month's record if one exists.

**Archive behavior:** Past monthly records (`month_year < current`) remain `published` and are accessible in Library. No state change needed.

---

### 5.4 Archive state summary

No records in Library need to be manually archived. The Today query's temporal constraints handle which record is "current":

- Daily past records: `publish_date` in the past → not matched by today's query → appear in Library
- Weekly past records: `week_start` older records → still returned by Weekly query (most recent), older ones appear in Library
- Monthly past records: `month_year` in the past → not matched → appear in Library

The `archived` status exists for admin-explicit removal. It is not used for automated time-based behavior.

---

## 6. Required Schema Changes

### Migration: `0006_content_publishing.sql`

This is the only schema migration Sprint 1 requires.

```sql
-- ============================================================
-- 0006_content_publishing.sql
-- Adds publishing workflow fields to content + member tables.
-- Sprint 1 dependency.
-- ============================================================

-- ── Content status enum ──────────────────────────────────────
CREATE TYPE content_status AS ENUM (
  'draft',
  'ready_for_review',
  'published',
  'archived'
);

-- ── Content source enum ──────────────────────────────────────
CREATE TYPE content_source AS ENUM (
  'gdrive',
  'vimeo',
  'admin'
);

-- ── Content table additions ───────────────────────────────────
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS status            content_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS publish_date      DATE,           -- YYYY-MM-DD (Eastern calendar) — daily_audio only
  ADD COLUMN IF NOT EXISTS week_start        DATE,           -- Monday of target week — weekly_principle only
  ADD COLUMN IF NOT EXISTS month_year        TEXT,           -- 'YYYY-MM' — monthly_theme only
  ADD COLUMN IF NOT EXISTS excerpt           TEXT,           -- Short pull quote for card display
  ADD COLUMN IF NOT EXISTS source            content_source NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS source_ref        TEXT,           -- Drive file ID, Vimeo ID, etc.
  ADD COLUMN IF NOT EXISTS admin_notes       TEXT,           -- Internal only — never member-facing
  ADD COLUMN IF NOT EXISTS is_today_override BOOLEAN NOT NULL DEFAULT FALSE;
  -- tier_min deferred to Sprint 4 (no gating needed for Level 1 content)

-- ── Member table additions ────────────────────────────────────
ALTER TABLE member
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/New_York';
  -- Stored now for future Option B rendering; not used in Sprint 1 queries

-- ── Indexes for Today page queries ───────────────────────────
CREATE INDEX IF NOT EXISTS idx_content_publish_date
  ON content (publish_date)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_content_week_start
  ON content (week_start)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_content_month_year
  ON content (month_year)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_content_status_type
  ON content (status, type);

CREATE INDEX IF NOT EXISTS idx_content_today_override
  ON content (is_today_override)
  WHERE is_today_override = TRUE AND status = 'published';

-- ── Backfill: mark all existing published records ─────────────
-- Existing content rows have is_active = TRUE. Mark these as published
-- so the new status field doesn't orphan existing seeded data.
UPDATE content
SET status = 'published'
WHERE is_active = TRUE;
```

**Why `is_today_override` now:** The column is cheap to add and Sprint 3 admin needs it. Adding it now avoids a mid-sprint migration.

**Why `tier_min` is deferred:** Sprint 1 serves Level 1 members only. All Today content is all-tier. The `tier_min` column is straightforward to add in Sprint 4 when gating is built.

**Why no `0007_progress_streak.sql` entries here:** The `progress` table already exists with the correct schema. Sprint 1 only needs to *write* to it — no new columns needed. The `member.practice_streak` and `member.last_practiced_at` columns already exist in `0001`. The only addition needed is a DB function/trigger if we want atomic streak increment — see §7 below.

---

## 7. Required Query / Service Changes

### 7.1 New utility: `lib/dates/effective-date.ts`

**Purpose:** Single source of truth for the canonical Eastern date used in all Today content queries.

```ts
// lib/dates/effective-date.ts
// Server-only — never import in client components.

import { format, toZonedTime } from "date-fns-tz";

const CANONICAL_TZ = "America/New_York";

/**
 * Returns the current calendar date in America/New_York timezone.
 * Used for all Today content queries — daily, weekly, and monthly.
 *
 * Returns: "YYYY-MM-DD"
 */
export function getEffectiveDate(): string {
  return format(toZonedTime(new Date(), CANONICAL_TZ), "yyyy-MM-dd");
}

/**
 * Returns the current month in "YYYY-MM" format (Eastern time).
 * Used for monthly_theme content queries.
 */
export function getEffectiveMonthYear(): string {
  return format(toZonedTime(new Date(), CANONICAL_TZ), "yyyy-MM");
}
```

**Dependency:** `date-fns-tz`. Check if already present — if not, `npm install date-fns-tz`. It is a zero-config, tree-shakeable package, no issues with Next.js.

---

### 7.2 Update: `lib/queries/get-today-content.ts`

**Change:** Replace `is_active = true` + `ORDER BY published_at DESC` with `status = 'published'` + `publish_date = effectiveDate`.

```ts
// lib/queries/get-today-content.ts — updated

import { createClient } from "@/lib/supabase/server";
import { getEffectiveDate } from "@/lib/dates/effective-date";
import type { Tables } from "@/types/supabase";

export type TodayContent = Pick<
  Tables<"content">,
  | "id"
  | "title"
  | "description"
  | "excerpt"           // NEW field — for card subtitle
  | "duration_seconds"
  | "castos_episode_url"
  | "s3_audio_key"
  | "publish_date"      // NEW — for display ("Published April 1")
>;

export async function getTodayContent(): Promise<TodayContent | null> {
  const supabase = await createClient();
  const effectiveDate = getEffectiveDate();

  const { data, error } = await supabase
    .from("content")
    .select(
      "id, title, description, excerpt, duration_seconds, castos_episode_url, s3_audio_key, publish_date"
    )
    .eq("type", "daily_audio")
    .eq("status", "published")
    .eq("publish_date", effectiveDate)
    .order("created_at", { ascending: false })   // tiebreaker if duplicates
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getTodayContent] error:", error.message);
    return null;
  }

  return data;
}
```

---

### 7.3 New: `lib/queries/get-weekly-content.ts`

```ts
// lib/queries/get-weekly-content.ts

import { createClient } from "@/lib/supabase/server";
import { getEffectiveDate } from "@/lib/dates/effective-date";
import type { Tables } from "@/types/supabase";

export type WeeklyContent = Pick<
  Tables<"content">,
  "id" | "title" | "description" | "excerpt" | "vimeo_video_id" | "week_start"
>;

export async function getWeeklyContent(): Promise<WeeklyContent | null> {
  const supabase = await createClient();
  const effectiveDate = getEffectiveDate();

  const { data, error } = await supabase
    .from("content")
    .select("id, title, description, excerpt, vimeo_video_id, week_start")
    .eq("type", "weekly_principle")
    .eq("status", "published")
    .lte("week_start", effectiveDate)     // week has started
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getWeeklyContent] error:", error.message);
    return null;
  }

  return data;
}
```

---

### 7.4 New: `lib/queries/get-monthly-content.ts`

```ts
// lib/queries/get-monthly-content.ts

import { createClient } from "@/lib/supabase/server";
import { getEffectiveMonthYear } from "@/lib/dates/effective-date";
import type { Tables } from "@/types/supabase";

export type MonthlyContent = Pick<
  Tables<"content">,
  "id" | "title" | "description" | "excerpt" | "vimeo_video_id" | "month_year"
>;

export async function getMonthlyContent(): Promise<MonthlyContent | null> {
  const supabase = await createClient();
  const effectiveMonthYear = getEffectiveMonthYear();

  const { data, error } = await supabase
    .from("content")
    .select("id, title, description, excerpt, vimeo_video_id, month_year")
    .eq("type", "monthly_theme")
    .eq("status", "published")
    .eq("month_year", effectiveMonthYear)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getMonthlyContent] error:", error.message);
    return null;
  }

  return data;
}
```

---

### 7.5 Update: `app/(member)/today/page.tsx`

**Changes:**
- Import and call all three queries in parallel
- Pass real props to `WeeklyPrincipleCard` and `MonthlyThemeCard`
- All awaits run concurrently — do not await sequentially

```ts
// app/(member)/today/page.tsx

import { getTodayContent } from "@/lib/queries/get-today-content";
import { getWeeklyContent } from "@/lib/queries/get-weekly-content";
import { getMonthlyContent } from "@/lib/queries/get-monthly-content";
import { resolveAudioUrl } from "@/lib/media/resolve-audio-url";
import { DailyPracticeCard } from "@/components/today/DailyPracticeCard";
import { WeeklyPrincipleCard } from "@/components/today/WeeklyPrincipleCard";
import { MonthlyThemeCard } from "@/components/today/MonthlyThemeCard";

export const metadata = {
  title: "Today's Practice — Positives",
  description: "Your daily grounding practice from Dr. Paul.",
};

export default async function TodayPage() {
  // All three content queries run in parallel — no sequential waterfalls
  const [todayContent, weeklyContent, monthlyContent] = await Promise.all([
    getTodayContent(),
    getWeeklyContent(),
    getMonthlyContent(),
  ]);

  const audioUrl = todayContent
    ? await resolveAudioUrl(todayContent.castos_episode_url, todayContent.s3_audio_key)
    : null;

  return (
    <div className="px-5 py-8 max-w-lg mx-auto flex flex-col gap-5">
      <header className="mb-2">
        <h1 className="font-heading font-bold text-2xl text-foreground tracking-[-0.03em]">
          Today
        </h1>
      </header>

      <DailyPracticeCard
        content={todayContent}
        audioUrl={audioUrl}
        contentId={todayContent?.id ?? null}
      />

      <WeeklyPrincipleCard content={weeklyContent} />
      <MonthlyThemeCard content={monthlyContent} />
    </div>
  );
}
```

**Note:** `contentId` is passed to `DailyPracticeCard` so the `markListened` action knows which content row to associate with the progress record.

---

### 7.6 Update: `components/today/WeeklyPrincipleCard.tsx`

Accepts typed `content` prop. Renders real data OR empty state.

```ts
import type { WeeklyContent } from "@/lib/queries/get-weekly-content";

interface WeeklyPrincipleCardProps {
  content: WeeklyContent | null;
}

export function WeeklyPrincipleCard({ content }: WeeklyPrincipleCardProps) {
  return (
    <article className="bg-card rounded-lg border border-border shadow-soft p-5">
      <span className="text-xs font-medium uppercase tracking-widest text-secondary mb-3 block">
        This Week
      </span>

      {content ? (
        <>
          <h2 className="font-heading font-semibold text-lg text-foreground leading-heading tracking-[-0.02em] mb-2">
            {content.title}
          </h2>
          {content.excerpt && (
            <p className="text-sm text-muted-foreground leading-body">
              {content.excerpt}
            </p>
          )}
        </>
      ) : (
        <>
          <h2 className="font-heading font-semibold text-lg text-foreground/40 leading-heading tracking-[-0.02em] mb-2">
            This week&apos;s principle
          </h2>
          <p className="text-sm text-muted-foreground leading-body">
            This week&apos;s principle is on its way.
          </p>
        </>
      )}
    </article>
  );
}
```

---

### 7.7 Update: `components/today/MonthlyThemeCard.tsx`

Same pattern as Weekly.

```ts
import type { MonthlyContent } from "@/lib/queries/get-monthly-content";

interface MonthlyThemeCardProps {
  content: MonthlyContent | null;
}

export function MonthlyThemeCard({ content }: MonthlyThemeCardProps) {
  return (
    <article className="bg-surface-tint rounded-lg border border-border shadow-soft p-5">
      <span className="text-xs font-medium uppercase tracking-widest text-accent mb-3 block">
        This Month
      </span>

      {content ? (
        <>
          <h2 className="font-heading font-semibold text-lg text-foreground leading-heading tracking-[-0.02em] mb-2">
            {content.title}
          </h2>
          {content.excerpt && (
            <p className="text-sm text-muted-foreground leading-body">
              {content.excerpt}
            </p>
          )}
        </>
      ) : (
        <>
          <h2 className="font-heading font-semibold text-lg text-foreground/40 leading-heading tracking-[-0.02em] mb-2">
            This month&apos;s theme
          </h2>
          <p className="text-sm text-muted-foreground leading-body">
            This month&apos;s theme will be here soon.
          </p>
        </>
      )}
    </article>
  );
}
```

---

### 7.8 New: `app/(member)/today/actions.ts` — `markListened`

Server action called by the AudioPlayer at completion threshold.

```ts
// app/(member)/today/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Mark a daily_audio content item as listened by the current user.
 *
 * - Writes a progress record
 * - Updates member.last_practiced_at to now
 * - Increments member.practice_streak (only if not already practiced today)
 *
 * Called client-side at ~80% audio playback threshold.
 * Idempotent-ish: duplicate calls insert additional progress rows but
 * streak logic checks last_practiced_at to avoid double-incrementing.
 */
export async function markListened(contentId: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return; // silently fail — member may have been logged out

  // Write progress record
  const { error: progressError } = await supabase.from("progress").insert({
    member_id: user.id,
    content_id: contentId,
    completed: true,
    // listened_at defaults to NOW() in DB
  });

  if (progressError) {
    console.error("[markListened] progress insert error:", progressError.message);
    return;
  }

  // Update streak — fetch current state first to avoid double-increment
  const { data: member } = await supabase
    .from("member")
    .select("last_practiced_at, practice_streak")
    .eq("id", user.id)
    .single();

  if (!member) return;

  const now = new Date();
  const lastPracticed = member.last_practiced_at
    ? new Date(member.last_practiced_at)
    : null;

  // Only increment streak if not already practiced today (UTC calendar day check)
  // This is a simple guard; a proper grace-period implementation is Sprint 6
  const practicedToday =
    lastPracticed !== null &&
    lastPracticed.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);

  if (!practicedToday) {
    await supabase
      .from("member")
      .update({
        last_practiced_at: now.toISOString(),
        practice_streak: (member.practice_streak ?? 0) + 1,
      })
      .eq("id", user.id);
  }
}
```

**Note on streak date comparison:** The streak guard above uses UTC date (`.toISOString().slice(0, 10)`). This is intentionally simple for Sprint 1. If a member practices at 11pm ET, `last_practiced_at` records UTC time; the comparison will still be correct for the same calendar day. Sprint 6 should refine this to use the member's timezone when Option B is activated.

---

### 7.9 Update: `components/today/AudioPlayer.tsx` — completion callback

Add an `onComplete` callback prop and fire it at 80% playback threshold.

```ts
interface AudioPlayerProps {
  src: string;
  title: string;
  duration: string;
  onComplete?: () => void;   // NEW — called once at 80% threshold
}

// Inside the component:
const completedRef = useRef(false);  // guard against firing multiple times

function handleTimeUpdate() {
  const audio = audioRef.current;
  if (!audio) return;
  setCurrentTime(audio.currentTime);

  // Fire onComplete at 80% threshold — only once per session
  if (
    !completedRef.current &&
    audio.duration > 0 &&
    audio.currentTime / audio.duration >= 0.8
  ) {
    completedRef.current = true;
    onComplete?.();
  }
}
```

**In `DailyPracticeCard`:** The `onComplete` prop is wired from the parent.

`DailyPracticeCard` needs to become a client component boundary (or receive `contentId` and call the server action via `startTransition`):

```ts
// components/today/DailyPracticeCard.tsx — updated interface
interface DailyPracticeCardProps {
  content: TodayContent | null;
  audioUrl: string | null;
  contentId: string | null;   // NEW — passed from Today page
}
```

Inside the card, import `markListened` and call it:

```ts
"use client";
import { useTransition } from "react";
import { markListened } from "@/app/(member)/today/actions";

// ...
const [, startTransition] = useTransition();

function handleComplete() {
  if (!contentId) return;
  startTransition(() => {
    markListened(contentId); // fire and forget — don't await in UI
  });
}

// Pass to AudioPlayer:
<AudioPlayer src={audioUrl} title={content.title} duration={duration} onComplete={handleComplete} />
```

**Important:** `DailyPracticeCard` already must be a client component (it imports AudioPlayer which is `"use client"`). Verify the current directive. If it's not marked `"use client"`, add it.

---

## 8. Admin Implications for This Sprint

### What admin work is NOT needed in Sprint 1

The full admin content management interface is Sprint 3. In Sprint 1, admin operations happen **directly in Supabase Studio** or via seeding scripts.

This is acceptable because:
- Sprint 1 is about proving the Today page works with real data
- You control the content seeding directly — no third party is publishing yet
- The admin dashboard would add 2–3 extra days to this sprint without member-visible value

### What admin-adjacent work IS needed in Sprint 1

| Task | How |
|------|-----|
| Seed 1 daily record | SQL insert in Supabase Studio with `publish_date = today's Eastern date` and `status = 'published'` |
| Seed 1 weekly record | SQL insert with `week_start = this Monday's date` and `status = 'published'` |
| Seed 1 monthly record | SQL insert with `month_year = '2026-04'` and `status = 'published'` |
| Verify Today page renders | Open /today as a member — all three sections visible |

### Seed SQL (run in Supabase Studio after migration)

```sql
-- Daily seed — replace with real content
INSERT INTO content (
  title, description, excerpt, type, status, publish_date,
  s3_audio_key, duration_seconds, source
) VALUES (
  'Starting with Presence',
  'A short grounding practice to begin your day with intention.',
  'Begin here. Just a few minutes is enough.',
  'daily_audio',
  'published',
  CURRENT_DATE,   -- will use DB server date; verify this is Eastern date
  NULL,           -- no audio file yet — DailyPracticeCard handles gracefully
  600,            -- 10 minutes
  'admin'
);

-- Weekly seed
INSERT INTO content (
  title, description, excerpt, type, status, week_start, source
) VALUES (
  'The Practice of Presence',
  'This week we return our attention to the present moment — gently, without judgment, as many times as needed.',
  'Return here as many times as you need.',
  'weekly_principle',
  'published',
  date_trunc('week', CURRENT_DATE)::date,  -- Monday of this week
  'admin'
);

-- Monthly seed
INSERT INTO content (
  title, description, excerpt, type, status, month_year, source
) VALUES (
  'Building Emotional Resilience',
  'April explores the foundation beneath calm — how to stay grounded when life pushes back.',
  'Resilience is not a wall. It is a rhythm.',
  'monthly_theme',
  'published',
  TO_CHAR(NOW(), 'YYYY-MM'),  -- '2026-04'
  'admin'
);
```

**Caution:** `CURRENT_DATE` in Supabase Studio uses the DB server timezone (usually UTC). For the daily seed, you may need to hard-code the Eastern calendar date string (e.g., `'2026-04-01'`) rather than rely on `CURRENT_DATE` to avoid off-by-one on date boundary.

---

## 9. Risks and Edge Cases

### Missing content

**Risk:** No daily record exists with `publish_date = today's Eastern date`.
**Handling:** `getTodayContent()` returns `null`. `DailyPracticeCard` renders the "Coming soon" empty state — already implemented. Member sees a calm message, not an error.

**Risk:** No weekly or monthly record exists.
**Handling:** Both cards render graceful empty state copy. Members see calm placeholder.

### Wrong dates

**Risk:** Admin or seed SQL sets `publish_date` using UTC date, which is one day behind Eastern after 8pm ET.
**Handling:** Seed SQL should hard-code the Eastern calendar date string. Add a note in the admin UI (Sprint 3) reminding admin to enter Eastern dates. If migrated to Option B later, this is no longer a concern.

### Duplicate records

**Risk:** Two `daily_audio` records with `status = 'published'` and the same `publish_date`.
**Handling:** Query uses `ORDER BY created_at DESC LIMIT 1` — the most recently created record wins. The member always sees one item. Gap detection (Sprint 3 admin UI) will flag this as an anomaly.

### Late uploads / late publish

**Risk:** Dr. Paul uploads audio at noon. Admin publishes at 1pm. Members who checked Today at 7am saw the empty state and may not come back.
**Handling:** This is acceptable for v1. The empty state is calm. There is no re-notification system in Sprint 1. Sprint 6 can add a push/email nudge when daily content is published.

### Timezone edge cases

**Risk:** Member in Pacific time opens Today at 9pm PT (midnight ET). `getEffectiveDate()` on the server now returns the *next* ET date. Member in PT sees tomorrow's daily content.
**Handling:** Under Option A (canonical Eastern), this is a known tradeoff. The window is 9pm–midnight PT. Acceptable for v1. Option B (member-local) resolves this when implemented.

### DST transitions (spring forward / fall back)

**Risk:** On DST transition nights, `America/New_York` shifts. Canonical date computation may produce wrong date for 1-hour window.
**Handling:** `date-fns-tz` with IANA timezone string `"America/New_York"` handles DST automatically. This is a non-issue if the library is used correctly. Do NOT use a fixed UTC offset.

### No member timezone stored (future Option B)

**Risk:** When Option B is implemented, members who signed up before `timezone` column was added have `null` or default values.
**Handling:** Default `'America/New_York'` covers the majority. Sprint 1 adds the column with that default. Option B implementation should always fall back to `'America/New_York'` if `member.timezone` is null.

### Hydration mismatch

**Risk:** `getEffectiveDate()` is called server-side. If any component re-runs date logic client-side (e.g., using `new Date()` in a client component), the date string may differ between server and client SSR output.
**Handling:** Strictly server-only: `effective-date.ts` must never be imported in a client component. Pass the resolved date to client components as a string prop if needed. Today page is a Server Component — no hydration issues from date logic there.

### `markListened` called multiple times

**Risk:** User replays audio. `onComplete` fires again at 80% on the second play.
**Handling:** `completedRef.current` guard in `AudioPlayer` prevents multiple fires within one page session. On page reload, a second progress record may be inserted — this is acceptable. Uniqueness on `(member_id, content_id, listen_date)` is a future Sprint 6 optimization.

### Server action fails silently

**Risk:** `markListened` fails but the member sees no error.
**Handling:** Silent failure is correct for this UX. Progress tracking failure should never interrupt audio playback. Log errors server-side.

---

## 10. Ordered Sprint Task Breakdown

Tasks are ordered by dependency. Complete one before starting the next unless explicitly marked as parallelizable.

---

### Task 1 — Install `date-fns-tz` if not present
- **Purpose:** Provides reliable timezone-aware date formatting for canonical Eastern date logic
- **Files:** `package.json`
- **Dependencies:** None
- **Required:** Yes
- **Command:** `npm install date-fns-tz`
- **Verify:** `import { format, toZonedTime } from 'date-fns-tz'` compiles without error

---

### Task 2 — Write and apply migration `0006_content_publishing.sql`
- **Purpose:** Adds `status`, `publish_date`, `week_start`, `month_year`, `excerpt`, `source`, `source_ref`, `admin_notes`, `is_today_override` to `content`; adds `timezone` to `member`; adds performance indexes; backfills existing `is_active = TRUE` rows to `status = 'published'`
- **Files:** `supabase/migrations/0006_content_publishing.sql`
- **Dependencies:** Task 1 can run in parallel
- **Required:** Yes — all subsequent tasks depend on this schema
- **Apply via:** Supabase MCP tool or `supabase db push` (confirm with Supabase MCP apply_migration)
- **Verify:** `SELECT status, publish_date, week_start, month_year FROM content LIMIT 5` returns new columns

---

### Task 3 — Regenerate TypeScript types
- **Purpose:** `TodayContent`, `WeeklyContent`, `MonthlyContent` types must reflect new columns
- **Files:** `types/supabase.ts`
- **Dependencies:** Task 2 must be complete
- **Required:** Yes
- **Command:** `npx supabase gen types typescript --linked > types/supabase.ts` or use Supabase MCP `generate_typescript_types`
- **Verify:** `Tables<"content">` now includes `status`, `publish_date`, `week_start`, `month_year`, `excerpt`, `timezone` on member

---

### Task 4 — Create `lib/dates/effective-date.ts`
- **Purpose:** Canonical Eastern date resolver used by all Today queries
- **Files:** `lib/dates/effective-date.ts` (new)
- **Dependencies:** Task 1 (date-fns-tz)
- **Required:** Yes
- **Verify:** Unit test or console output confirms `getEffectiveDate()` returns `YYYY-MM-DD` in Eastern time regardless of server clock

---

### Task 5 — Update `lib/queries/get-today-content.ts`
- **Purpose:** Replace `is_active + published_at DESC` logic with `status = 'published' + publish_date = effectiveDate` query
- **Files:** `lib/queries/get-today-content.ts`
- **Dependencies:** Tasks 3, 4
- **Required:** Yes
- **Verify:** Returns `null` when no record for today's date, returns content row when one exists with correct `publish_date`

---

### Task 6 — Create `lib/queries/get-weekly-content.ts`
- **Purpose:** Returns current active weekly_principle content using `week_start <= effectiveDate` logic
- **Files:** `lib/queries/get-weekly-content.ts` (new)
- **Dependencies:** Tasks 3, 4
- **Required:** Yes
- **Can parallelize with:** Task 7

---

### Task 7 — Create `lib/queries/get-monthly-content.ts`
- **Purpose:** Returns current monthly_theme content using `month_year = effectiveMonthYear` match
- **Files:** `lib/queries/get-monthly-content.ts` (new)
- **Dependencies:** Tasks 3, 4
- **Required:** Yes
- **Can parallelize with:** Task 6

---

### Task 8 — Seed content records in Supabase
- **Purpose:** Ensure Today page has data to render — 1 daily, 1 weekly, 1 monthly record with correct schema fields and `status = 'published'`
- **Files:** None (SQL in Supabase Studio or a throwaway seed script)
- **Dependencies:** Task 2
- **Required:** Yes — without this, all three sections render empty state and Sprint 1 cannot be verified
- **Caution:** Hard-code Eastern calendar dates in daily seed, not `CURRENT_DATE`

---

### Task 9 — Update `components/today/WeeklyPrincipleCard.tsx`
- **Purpose:** Replace hardcoded copy with typed `content` prop; render real data or graceful empty state
- **Files:** `components/today/WeeklyPrincipleCard.tsx`
- **Dependencies:** Tasks 6, 3
- **Required:** Yes
- **Can parallelize with:** Task 10

---

### Task 10 — Update `components/today/MonthlyThemeCard.tsx`
- **Purpose:** Replace hardcoded copy with typed `content` prop; render real data or graceful empty state
- **Files:** `components/today/MonthlyThemeCard.tsx`
- **Dependencies:** Tasks 7, 3
- **Required:** Yes
- **Can parallelize with:** Task 9

---

### Task 11 — Update `app/(member)/today/page.tsx`
- **Purpose:** Add parallel `Promise.all` for all three queries; pass real props including `contentId` to `DailyPracticeCard`
- **Files:** `app/(member)/today/page.tsx`
- **Dependencies:** Tasks 5, 6, 7, 9, 10
- **Required:** Yes
- **Verify:** Page renders without TypeScript errors; all three sections show real or graceful-empty content

---

### Task 12 — Create `app/(member)/today/actions.ts` — `markListened`
- **Purpose:** Server action that writes a progress record and updates member streak
- **Files:** `app/(member)/today/actions.ts` (new)
- **Dependencies:** Task 2 (schema), Task 5 (understand contentId shape)
- **Required:** Yes
- **CONTRIBUTING.md reminder:** Server actions go in `actions.ts` co-located with their route segment

---

### Task 13 — Update `components/today/AudioPlayer.tsx` — `onComplete` callback
- **Purpose:** Add `onComplete` prop; fire at 80% playback threshold with de-duplication guard
- **Files:** `components/today/AudioPlayer.tsx`
- **Dependencies:** None (standalone component change)
- **Required:** Yes
- **Can parallelize with:** Task 12

---

### Task 14 — Update `components/today/DailyPracticeCard.tsx` — wire `markListened`
- **Purpose:** Accept `contentId` prop; call `markListened` via `useTransition` when `AudioPlayer.onComplete` fires; confirm `"use client"` directive present
- **Files:** `components/today/DailyPracticeCard.tsx`
- **Dependencies:** Tasks 12, 13
- **Required:** Yes
- **Verify:** Playing audio in browser → 80% reached → Supabase `progress` table receives new row → `member.last_practiced_at` updated

---

### Task 15 — End-to-end smoke test
- **Purpose:** Confirm the full Today page works as a member; all three sections render; audio completion writes progress; Today page metadata is correct
- **Files:** No code changes
- **Test steps:**
  1. Run `npm run dev`
  2. Sign in as an active member
  3. Navigate to `/today`
  4. Verify: Daily, Weekly, Monthly sections all show real seeded content
  5. Play audio past 80%
  6. Verify: `progress` row inserted in Supabase Studio
  7. Verify: `member.last_practiced_at` and `practice_streak` updated
  8. Change seeded `publish_date` to yesterday → verify Daily enters empty state
  9. Remove weekly record → verify WeeklyPrincipleCard shows graceful empty copy
- **Required:** Yes

---

### Task 16 (Optional) — Run `npm run build`
- **Purpose:** Confirm no TypeScript or build errors introduced
- **Required:** Recommended before committing; required before deploying

---

## 11. Recommended Decision Summary

### Today page model

**Ship:** Single stacked column — Daily (primary, full-width dark card) → Weekly (secondary, lighter card) → Monthly (tertiary, lightest card). No tabs. No horizontal navigation. One scroll direction.

### Timezone strategy

**Ship in Sprint 1:** Option A — canonical Eastern time (`America/New_York`) via `date-fns-tz`, computed server-side only, zero client-side date logic.

**Add now:** `member.timezone TEXT DEFAULT 'America/New_York'` column to `member` table. Do not use it for rendering in Sprint 1. Populate it at onboarding in a future sprint.

**Defer:** Option B (member-local rendering) — implement in Sprint 4 or later once `member.timezone` has been populated organically.

### Schema changes to do now (Sprint 1 only)

All in `0006_content_publishing.sql`:
- `content.status content_status NOT NULL DEFAULT 'draft'`
- `content.publish_date DATE`
- `content.week_start DATE`
- `content.month_year TEXT`
- `content.excerpt TEXT`
- `content.source content_source NOT NULL DEFAULT 'admin'`
- `content.source_ref TEXT`
- `content.admin_notes TEXT`
- `content.is_today_override BOOLEAN NOT NULL DEFAULT FALSE`
- `member.timezone TEXT NOT NULL DEFAULT 'America/New_York'`
- Four performance indexes on content

### What to build immediately (Sprint 1)

In order:
1. `date-fns-tz` install
2. Migration 0006 applied + types regenerated
3. `lib/dates/effective-date.ts`
4. Updated `get-today-content.ts`
5. New `get-weekly-content.ts`, `get-monthly-content.ts`
6. Seed data
7. Updated component props for WeeklyPrincipleCard, MonthlyThemeCard
8. Updated Today page (`Promise.all`)
9. `markListened` server action
10. AudioPlayer `onComplete` callback
11. DailyPracticeCard `markListened` wiring
12. Smoke test

### What to delay

| Item | Reason |
|------|--------|
| Admin content CRUD | Sprint 3 |
| Streak display on Today | Sprint 6 |
| Vimeo embeds in cards | Sprint 3 |
| Option B timezone rendering | Sprint 4+ |
| Milestone recognition | Sprint 6 |
| Ingestion pipeline | Sprint 5 |
| `tier_min` column | Sprint 4 |
| is_today_override rendering logic | Sprint 3 |
| Streak grace period (1-day recovery) | Sprint 6 |

---

*This plan supersedes the Sprint 1 section in `member-experience-implementation-plan.md` for execution detail. The broader plan remains the reference for Sprints 2–6.*

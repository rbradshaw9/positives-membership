# Planning Memo — Tracking, Streaks & Journal/Notes
## Positives Platform · Sprint 1–2 Boundary Refinement

> **Type:** Architecture/UX planning — not a coding task
> **Scope:** Engagement tracking, streak model, journal/notes product, responsive UX, sprint boundary decisions
> **Builds on:** `member-experience-implementation-plan.md`, `sprint-1-build-plan.md`

---

## 1. Decision Summary

| Decision | Recommendation |
|----------|----------------|
| Tracking architecture | Add `activity_event` table now; keep `progress` for audio-specific data |
| Streak definition | Daily practice only — not broad engagement |
| Streak display | Visible to member; non-pressuring; no "failure" language |
| Other engagement signals | Tracked internally via `activity_event`; invisible to member until Sprint 6+ |
| Podcast feed streak credit | Not credited in Sprint 1–4. Custom RSS proxy deferred to Sprint 5. |
| Journal vs notes | One unified system — the `journal` table — framed as "notes" in UI |
| Notes tied to content | Yes — optional `content_id` FK already exists |
| Journal retrieval | In-product journal history view (Sprint 2 `/library` or `/journal` section) |
| Desktop journal UX | Slide-over panel (right side) |
| Mobile journal UX | Bottom sheet (full-width, partial height, expandable) |
| Conceptual model | Same — slide-over on wide viewports, bottom sheet on narrow |
| Sprint 1 journal scope | Schema only — no UI. Wire `markListened` action to fire one `activity_event`. |
| Sprint 2 journal scope | Full notes UI — inline "Add a note" button on Today cards, slide-over/bottom sheet |

---

## 2. Tracking Architecture Recommendation

### Is `progress` alone enough?

No. The existing `progress` table is well-suited for audio listening history but has a structural mismatch with broader tracking needs:

- `progress.content_id` is NOT NULL — requires a linked content item. Many events (login, profile update, event attendance) have no content item.
- `progress.listened_at` implies audio/media engagement. It is semantically wrong for a "member opened journal" event.
- The table does not have an `event_type` field — it cannot distinguish between listening 20% vs. completing vs. re-listening.

The right structure is a **two-table model**:

| Table | Purpose |
|-------|---------|
| `progress` | Audio and media engagement. Content-specific. Keeps current role. |
| `activity_event` | All member actions — a general event log for analytics, automations, and future unlock logic. |

### The `activity_event` table

This is a lightweight, append-only event log. It is not a replacement for `progress` — it sits alongside it. When a member listens to audio and `markListened` fires, it writes to **both**:
- `progress` (the content-specific record with `completed`, `listened_at`)
- `activity_event` (the general event log entry)

```sql
-- Proposed: 0007_activity_events.sql (Sprint 1 schema addition)

CREATE TYPE activity_event_type AS ENUM (
  'session_start',          -- member logged in / session begins
  'daily_listened',         -- daily audio reached completion threshold
  'daily_started',          -- daily audio started (even if not completed)
  'weekly_viewed',          -- weekly principle card was viewed
  'monthly_viewed',         -- monthly theme card was viewed
  'note_created',           -- member wrote a note/journal entry
  'note_updated',           -- member edited an existing note
  'journal_opened',         -- member opened the journal view
  'event_attended',         -- Sprint 4+
  'qa_submitted',           -- Sprint 4+
  'qa_viewed',              -- Sprint 4+
  'milestone_reached',      -- streak milestone — Sprint 6+
  'upgrade_prompt_seen',    -- upgrade prompt shown — Sprint 4+
  'upgrade_clicked'         -- upgrade CTA clicked — Sprint 4+
);

CREATE TABLE IF NOT EXISTS activity_event (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id     UUID NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  event_type    activity_event_type NOT NULL,
  content_id    UUID REFERENCES content(id) ON DELETE SET NULL,  -- optional
  metadata      JSONB,                                           -- flexible extra context
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_event_member_id
  ON activity_event (member_id);

CREATE INDEX IF NOT EXISTS idx_activity_event_member_occurred_at
  ON activity_event (member_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_event_type
  ON activity_event (event_type);
```

### What the `metadata` JSONB holds

The `metadata` column handles event-specific context without requiring new columns per event type:

```json
// daily_listened
{ "percent_completed": 83, "duration_seconds": 600 }

// daily_started
{ "started_at_seconds": 0 }

// milestone_reached
{ "streak_days": 30, "milestone_type": "30_day" }

// upgrade_prompt_seen
{ "prompt_location": "events_page", "member_tier": "level_1" }
```

This is intentionally flexible and non-normalized. It is not meant to be queried deeply in Sprint 1. It is captured now so the data exists when analytics or marketing automation needs it.

### What fires `activity_event` in Sprint 1

In Sprint 1, the only event that must be implemented is `daily_listened`. This is fired inside `markListened()`:

```ts
// Inside markListened server action — writes both records
await supabase.from("progress").insert({ ... });
await supabase.from("activity_event").insert({
  member_id: user.id,
  event_type: "daily_listened",
  content_id: contentId,
  metadata: { percent_completed: 80 },  // hardcoded at threshold for now
});
```

All other event types in the enum are modeled now but **not implemented yet**. The enum is cheap to define; implementing the fires is Sprint 2+.

### What is explicitly deferred

| Event | Deferred to |
|-------|-------------|
| `session_start` | Sprint 2 (middleware or layout hook) |
| `weekly_viewed` | Sprint 2 (when Weekly card becomes interactive) |
| `monthly_viewed` | Sprint 2 |
| `note_created` / `note_updated` | Sprint 2 (when journal UI ships) |
| `journal_opened` | Sprint 2 |
| `daily_started` from podcast feed | Sprint 5 (custom RSS proxy — see §3 podcast note) |
| Everything else | Sprint 4+ |

### Why not a third-party event system (Segment, Amplitude)?

Out of scope for v1. The `activity_event` table is the internal equivalent. When/if external analytics are added, these events can be replicated out via a Supabase function or a lightweight webhook. Building a clean internal log now means the external integration is additive, not a rewrite.

---

## 3. Streak Model Recommendation

### What the main streak should mean

**The main streak = consecutive calendar days of Daily Practice completion.**

"Completion" = listening to the daily audio past the 80% threshold. One completion per calendar day (Eastern canonical date, consistent with the Today rendering decision).

This is the right definition because:

1. **The Daily is the center of the product.** The brand brief is explicit: "The daily habit is the most important behavior in the system." The streak should reinforce that specific behavior, not general platform engagement.
2. **Broad engagement streaks become meaningless.** If logging in counts toward the streak, members will start treating the streak as a login streak, not a practice streak. That dilutes the meaning and undermines the product's reason for existing.
3. **It is honest.** A streak that requires actual practice is more emotionally honest than a streak that could be maintained by browsing. When a member sees "Day 30," it means something.

### What counts toward the streak

| Action | Counts? | Reason |
|--------|---------|--------|
| Daily audio ≥ 80% listened | ✅ Yes | Core behavior — this is the practice |
| Daily audio started but not completed | ✗ No | Threshold must be met |
| Weekly viewed | ✗ No | Supporting content — not the daily practice |
| Monthly viewed | ✗ No | Same |
| Note/journal written | ✗ No | Reflection is valuable but incidental |
| Logging in | ✗ No | Engagement, not practice |
| Library browsing | ✗ No | Same |

### Streak grace period

Not in Sprint 1. Sprint 6. But model it now: the logic for "did member practice yesterday?" should be written as a function, not inline in `markListened`, so the grace period logic is easy to add.

```ts
// lib/streak/compute-streak.ts (Sprint 1 stub, Sprint 6 full implementation)
export function shouldIncrementStreak(lastPracticedAt: Date | null, now: Date): boolean {
  // Sprint 1: simple — did they practice today (UTC)?
  // Sprint 6: replace with Eastern-calendar + grace-period logic
  if (!lastPracticedAt) return true;
  return lastPracticedAt.toISOString().slice(0, 10) !== now.toISOString().slice(0, 10);
}
```

This is the function called inside `markListened`. It is trivial to swap the body in Sprint 6 without touching the server action.

### Streak reset behavior

When a member misses a day, the streak resets to 0 (or to 1 on the day they return). This happens automatically because `practice_streak` is only incremented when the member completes the daily. No cron is needed to "reset" it — the streak is a counter, not a timer.

**Critical UX rule:** The streak should **never display a failure state.** No "You broke your streak." No red indicators. No drama. If a member returns after missing days, show their current streak warmly. Do not reference the break.

### One visible streak, internal-only everything else

**Only one streak is visible to members** — the practice streak. All other engagement signals (weekly/monthly views, notes written, events attended) are tracked internally via `activity_event` but never surfaced as separate counters in the UI.

Member-facing: "12-day practice"
Admin-only: engagement score, event log, upgrade signals

No "Achievement Unlocked" system in Sprint 1. No badges. No leaderboards. These are antithetical to the calm, non-competitive brand positioning.

### Podcast feed listening — not credited, tracked later

**Decision: podcast feed listening does not credit the streak in Sprint 1–4.**

The RSS/podcast delivery model (Castos or any standard podcast host) has a fundamental limitation: once a podcast app fetches the audio file, the host loses all visibility into playback. There is no per-subscriber completion event. What is observable is only a download/fetch, not a listen.

Two things were evaluated:

1. **Using Castos analytics** — no API for per-subscriber download events; only aggregate dashboard data exportable as CSV manually. Not automatable.
2. **Building per-member RSS feeds with an audio proxy** — technically feasible. If the audio `<enclosure>` URL points to our own API, we can log the request, identify the member (via unique token in URL), and record a `daily_started` event with `source: 'podcast_feed'`. However, this is still a download event, not a completion event. Auto-download in Apple Podcasts and Overcast means "audio was fetched" ≠ "member listened."

**Why not credit the fetch as streak completion:** The streak is defined as completing the daily practice — the 80% threshold. Crediting a download-proxy event would be crediting behavior we cannot verify. It would make the streak counter dishonest and undermine the product's core meaning.

**What this means for members:** Communicate clearly at the podcast feed access point:
> *"Your practice streak updates when you listen in the app. The podcast feed is available for on-the-go listening."*

This is honest, on-brand, and non-punitive. Members who prefer podcast apps can still listen — they just understand the streak is tied to the in-app experience.

**The future path (Sprint 5):**
- Build per-member RSS feeds served from our own API (primary motivation: access revocation, tier gating, content control)
- The audio proxy logs `daily_started` events with `metadata: { source: 'podcast_feed' }` into `activity_event`
- The `daily_started` event type is already in the enum — no schema change needed when Sprint 5 ships
- Sprint 6 decides whether `source: 'podcast_feed'` events receive any form of streak credit, and under what UX framing

**Do not build the RSS proxy in Sprint 1–4.** The functionality and plan are documented here. Build it when member access control needs it (Sprint 5), not now.

---

## 4. Journal / Notes Product Recommendation

### Quick notes vs. true journal entries — one system

**Recommendation: one unified system, the existing `journal` table, surfaced in the UI as "notes."**

The distinction between "quick notes" and "journal entries" is a UI/framing difference, not a data difference. A note IS a journal entry — it may be shorter, more spontaneous, written in the moment of listening. But storing them in separate tables is unnecessary complexity.

**What changes:** The UX framing shifts from "Journal" (implies sitting down to write at length) to "Notes" (implies capturing a thought quickly). The underlying `journal` table is unchanged. The section in the app can be called "Your Notes" or "Reflections" rather than "Journal."

This matters because:
- "Journal" implies commitment and effort — which is the wrong association for a daily practice platform
- "Note" or "Reflection" implies capturing something as it arises — which is on-brand
- Members who don't write at all should never feel behind for not journaling. Light framing reduces that risk.

### Should notes be tied to a content item?

**Yes — optionally.** The `journal` table already has `content_id` as a nullable FK. This is the right model.

- When a member taps "Add a note" from the Today page (on the Daily, Weekly, or Monthly card), `content_id` is pre-populated with that card's content row
- When a member writes a freeform note from the Notes section, `content_id` is null
- Both are valid and stored identically

**Retrieving notes:** Members should be able to see past notes. The primary retrieval context is "notes I wrote while listening to this practice" — so linking via `content_id` makes the Library more meaningful. When a member is in the Library looking at a past daily item, they can see "You wrote a note here." This is Sprint 2 work but the data model is already correct.

### Should progress and notes be the same system?

**No.** Keep them separate:

| Table | Records |
|-------|---------|
| `progress` | When you listened, how far, completed or not — objective engagement data |
| `journal` | What you thought or felt — subjective member text |

The `progress.reflection_text` field that currently exists on the `progress` table should be removed or ignored. It was an early over-consolidation. Reflections belong in `journal`, not `progress`. In Sprint 1, do not write to `progress.reflection_text`. When the journal UI ships in Sprint 2, it writes to `journal`.

### Added field needed: `updated_at` on `journal`

The current `journal` table has no `updated_at` column. Members should be able to edit notes. Add `updated_at` in the Sprint 1 schema migration:

```sql
ALTER TABLE journal
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TRIGGER journal_updated_at
  BEFORE UPDATE ON journal
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

This uses the existing `update_updated_at_column()` trigger function from migration 0001.

### Minimum version that should exist first

Sprint 2 minimum journal feature:
1. "Add a note" inline affordance on the Daily card on Today page
2. Slide-over / bottom sheet accepting free text input
3. `saveNote` server action writing to `journal` with `content_id`
4. Notes surfaced in a simple list when member taps the card title in Library

That is the complete minimum. No rich text editor. No categories. No tags. No search. Plain text, saved, retrievable by content item.

---

## 5. Responsive UX Recommendation

### The core constraint

Today is the primary page. The notes interaction must not break the Today page experience. It must feel **contextual and temporary** — a thought captured in the moment, then dismissed so the member returns to the content.

### Desktop interaction pattern

**Recommendation: slide-over panel (right side)**

On viewports >= 768px, when a member clicks "Add a note" on any Today card, a panel slides in from the right:

```
┌──────────────────────────────┬───────────────────┐
│                              │   Add a note       │
│   DAILY PRACTICE CARD        │                    │
│   (audio player active)      │   [textarea]       │
│                              │                    │
│   THIS WEEK CARD             │   [Save note]      │
│                              │   [Cancel]         │
│   THIS MONTH CARD            │                    │
│                              │                    │
└──────────────────────────────┴───────────────────┘
```

- The slide-over is 360–400px wide
- The Today page content remains visible and the audio continues playing
- The panel has a dark scrim overlay over the nav but NOT over the main Today content (member can still see the card they're noting on)
- Closed with "Cancel," "Save," or clicking outside the panel
- Title of the panel: "Note — [content title]" (auto-populated) or just "Note" for freeform

**Why not a modal (full overlay)?** A modal interrupts the content — member loses visual context of what they were reflecting on. The slide-over keeps the content visible alongside the writing surface.

**Why not an inline expandable area?** Inline expansion pushes other cards down — disrupts the Today page layout. For short notes it's fine, but for anything longer than 1–2 lines it becomes unwieldy and shifts the whole page.

**Why not a small popup?** A popup implies something quick and transient. Notes are worth slightly more prominent treatment, and a popup at 140px height is frustrating to write in.

### Mobile interaction pattern

**Recommendation: bottom sheet (partial height, expandable)**

On viewports < 768px, when a member taps "Add a note":

```
┌──────────────────────────┐
│                          │
│   (Today page grayed     │  ← today page content dimmed but visible
│    out, not hidden)      │
│                          │
├──────────────────────────┤  ← drag handle
│   Note                   │  ← title
│                          │
│   [textarea — autofocus] │
│                          │
│   [Save]  [Cancel]       │
└──────────────────────────┘
```

- Bottom sheet appears at ~50% screen height
- Expanding: when member taps into textarea and keyboard appears, sheet rises naturally to sit above the keyboard (standard iOS/Android behavior with `env(keyboard-inset-height)`)
- Drag handle at top allows member to dismiss by dragging down
- Tap on the dimmed Today page content also dismisses
- No full-screen takeover unless member explicitly expands (swipe up)

**Why not a modal on mobile?** A centered modal over a dark overlay looks generic and unrefined. On mobile, material and iOS both converge on bottom sheets for this pattern because it is comfortable for thumb reach and feels native.

**Why not a full-screen sheet?** Full-screen hides the Today page entirely — member loses the context of why they're writing. A partial bottom sheet keeps content visible.

**Why not inline?** Same reason as desktop — layout disruption. Even on mobile, pushing cards down while typing is disorienting.

### Cross-device conceptual model

The conceptual model is identical:
- A **contextual writing surface** appears alongside but never replaces the content
- It is **temporary** — it has a clear dismiss path
- It is **quiet** — it does not announce itself with animation flourish or sound, just a smooth, fast transition
- It uses **the same textarea, same save/cancel affordance** on both breakpoints

Implementation: one `NoteSheet` component with responsive behavior. On desktop it renders as a fixed side panel. On mobile it renders as a bottom sheet. CSS + a breakpoint-conditional className is sufficient — no need for two separate components.

```
NoteSheet (shared component)
├── On md+ (≥768px): fixed right panel, slide in from right
└── On <md (<768px): bottom sheet, slide up from bottom
```

Both variants share: textarea, autofocus, save/cancel controls, `content_id` context, form submission logic.

---

## 6. Sprint Boundary Recommendation

### Sprint 1 — What to add (schema only, minimal fire logic)

| Item | Action |
|------|--------|
| `activity_event` table + enum | **Add to 0006 migration** (or new 0007 migration) |
| `activity_event_type` enum | **Add now** — define all known event types even if most aren't fired yet |
| `journal.updated_at` column | **Add to 0006 migration** |
| `markListened` fires `daily_listened` event | **Implement** — the one activity event Sprint 1 wires |
| `lib/streak/compute-streak.ts` stub | **Create** — even as a 5-line function |
| Note UI (slide-over / bottom sheet) | **Defer to Sprint 2** |
| Journal history retrieval | **Defer to Sprint 2** |
| `session_start` event | **Defer to Sprint 2** |
| Any other event firing | **Defer to Sprint 2** |
| Custom RSS feed / audio proxy | **Defer to Sprint 5** |

### Sprint 2 — What is newly in scope

| Item | Sprint |
|------|--------|
| "Add a note" button on Today cards (Daily, Weekly, Monthly) | Sprint 2 |
| `NoteSheet` component (slide-over + bottom sheet) | Sprint 2 |
| `saveNote` server action → `journal` insert | Sprint 2 |
| `note_created`, `note_updated`, `journal_opened` events fired | Sprint 2 |
| Library page with notes linked per content item | Sprint 2 |
| `weekly_viewed`, `monthly_viewed` events fired | Sprint 2 (when those cards become interactive) |
| `session_start` event | Sprint 2 |

### Sprint 5 — Custom RSS proxy (podcast feed tracking)

| Item | Detail |
|------|--------|
| Per-member RSS feed API | `GET /api/feed/{member_token}/feed.xml` → valid RSS for podcast apps |
| Audio proxy endpoint | `GET /api/feed/{member_token}/audio/{episode_id}` → logs event → 302 to signed S3 URL |
| Access revocation | Invalidate member token when subscription cancels |
| Tier gating | Only include episodes the member's tier grants access to |
| Event fired | `daily_started` with `metadata: { source: 'podcast_feed' }` into `activity_event` |
| Streak credit | **Not granted at Sprint 5.** `daily_started` events logged but not credited. Sprint 6 decision. |
| Schema change needed | None — `daily_started` already in enum; `metadata.source` is JSONB |

### What would be overbuilding in Sprint 1

| Do NOT build in Sprint 1 |
|--------------------------|
| Note UI of any kind |
| Journal history view |
| `NoteSheet` component |
| Streak display on Today page (just wire the counter — display is Sprint 6) |
| Any engagement score calculation |
| Any milestone logic |
| Multiple streak counters |
| Rich text in journal |
| Note search |
| Note tagging |
| Custom RSS feed or audio proxy |
| Podcast feed streak credit logic |

The data is flowing. The UI can wait.

---

## 7. Data Model Recommendation

### Current state — what already exists

```
progress (content-specific listen log)
  id, member_id, content_id, listened_at, completed, reflection_text

journal (private notes)
  id, member_id, content_id, entry_text, created_at

member
  practice_streak  INTEGER (counter)
  last_practiced_at TIMESTAMPTZ (last daily completion timestamp)
```

### Additions needed for Sprint 1

```sql
-- 1. activity_event — general event log
CREATE TYPE activity_event_type AS ENUM (
  'session_start', 'daily_listened', 'daily_started',
  'weekly_viewed', 'monthly_viewed',
  'note_created', 'note_updated', 'journal_opened',
  'event_attended', 'qa_submitted', 'qa_viewed',
  'milestone_reached', 'upgrade_prompt_seen', 'upgrade_clicked'
);

CREATE TABLE activity_event (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id   UUID NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  event_type  activity_event_type NOT NULL,
  content_id  UUID REFERENCES content(id) ON DELETE SET NULL,
  metadata    JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_activity_event_member_id ON activity_event (member_id);
CREATE INDEX idx_activity_event_member_occurred_at ON activity_event (member_id, occurred_at DESC);
CREATE INDEX idx_activity_event_type ON activity_event (event_type);

-- 2. journal.updated_at
ALTER TABLE journal
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TRIGGER journal_updated_at
  BEFORE UPDATE ON journal FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### What each layer holds

| Table | Source of truth for |
|-------|---------------------|
| `progress` | Audio listening history — completion, timestamp, per-listen event |
| `activity_event` | All trackable member actions — analytics, marketing, unlock triggers |
| `member.practice_streak` | Current streak counter — the visible member-facing number |
| `member.last_practiced_at` | Last daily completion timestamp — used by streak increment logic |
| `journal` | Member reflections/notes — private, per-member, optionally content-linked |

### How streak is computed

`practice_streak` on `member` is the running counter. It is incremented inside `markListened()` (the server action) when:
- `daily_listened` threshold is crossed
- `shouldIncrementStreak(last_practiced_at, now)` returns true

This is not recomputed from scratch on every page load. The `member.practice_streak` integer is the authoritative current value.

**Correctness note:** If a member listens twice on the same day, `shouldIncrementStreak` returns false on the second call and the counter is not double-incremented. This is correct.

**Recovery:** If `last_practiced_at` falls more than 1 calendar day in the past (without grace period), the streak counter is NOT reset automatically by any cron or trigger. It is simply not incremented again until the member practices. The displayed value remains stale until the next complete. This is acceptable for Sprint 1. Sprint 6 should add either:
- A `reset_if_stale()` server action called on Today page load
- Or compute the effective streak dynamically from `activity_event` (preferred, longer-term)

### Content-note linkage model

```
content (id, title, type, ...)
    ↑ content_id (nullable FK)
journal (id, member_id, content_id, entry_text, created_at, updated_at)
```

When a note is created from the Today page:
- `content_id` = the ID of the card the member was looking at (daily, weekly, or monthly)
- `entry_text` = what the member typed

In the Library (Sprint 2), when rendering a past daily item, query:
```sql
SELECT * FROM journal
WHERE member_id = :uid AND content_id = :content_id
ORDER BY created_at DESC;
```

This surfaces all notes the member wrote while engaging with that specific content item.

---

## 8. Recommendation for the Next Build Prompt

### Changes to incorporate into the Sprint 1 build prompt

**Add to the migration (`0006_content_publishing.sql` or a new `0007`):**
1. `activity_event` table + `activity_event_type` enum
2. `journal.updated_at` column + trigger

**Add to `app/(member)/today/actions.ts` — `markListened`:**
- After writing to `progress`, insert one `activity_event` row with `event_type = 'daily_listened'`
- Call `shouldIncrementStreak()` from `lib/streak/compute-streak.ts`

**Add new file:**
- `lib/streak/compute-streak.ts` — the streak increment predicate

**No UI changes in Sprint 1 from journal decisions.** Journal UI is Sprint 2.

### The next build prompt should say

Sprint 1 build prompt should state:

> Wire `markListened` to also fire a `daily_listened` event into `activity_event`. Do not build journal UI. Do not build note-taking UI. Add `journal.updated_at` to the migration. Add the `activity_event` table to the migration. Create `lib/streak/compute-streak.ts` as a focused utility function.

### Sprint 2 build prompt should say

> Implement the journal/notes feature. Add "Add a note" button to DailyPracticeCard, WeeklyPrincipleCard, and MonthlyThemeCard on the Today page. Implement `NoteSheet` — a slide-over on desktop (md+), a bottom sheet on mobile (<md). Implement `saveNote` server action. Fire `note_created` and `note_updated` events into `activity_event`. Build the Library page with notes linked per content item.

---

*This memo supersedes the Sprint 1/2 boundary sections in both `member-experience-implementation-plan.md` and `sprint-1-build-plan.md` for the areas it covers. All other sprint planning in those documents remains valid.*

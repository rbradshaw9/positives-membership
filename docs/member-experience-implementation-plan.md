# Positives — Authenticated Member Experience
## Implementation Plan

> **Grounded in:** `PROJECT_BRIEF.md`, `CONTRIBUTING.md`, North Star Documentation, AI Technical Build Specification, and current repository source code.
> **Prepared:** April 2026

---

## Table of Contents

1. [Current-State Assessment](#1-current-state-assessment)
2. [Product Architecture](#2-product-architecture)
3. [Tier-Aware Navigation & Entitlements](#3-tier-aware-navigation--entitlements)
4. [Information Architecture: All Sections](#4-information-architecture-all-sections)
5. [UX Design Direction](#5-ux-design-direction)
6. [Content Publishing Architecture for Today](#6-content-publishing-architecture-for-today)
7. [Content & Data Model](#7-content--data-model)
8. [Daily Ingestion Workflow](#8-daily-ingestion-workflow)
9. [Weekly & Monthly Workflow](#9-weekly--monthly-workflow)
10. [Admin Requirements for Today Content](#10-admin-requirements-for-today-content)
11. [Reliability & Edge Cases](#11-reliability--edge-cases)
12. [Backend & Data Model Implications](#12-backend--data-model-implications)
13. [Phased Implementation Roadmap](#13-phased-implementation-roadmap)
14. [Recommended Next Sprint](#14-recommended-next-sprint)

---

## 1. Current-State Assessment

### What is solid right now

| Area | Status | Notes |
|------|--------|-------|
| Auth & guest checkout | ✅ Production-ready | Payment-first onboarding live, webhooks verified |
| Member gating | ✅ Solid | `requireActiveMember()` enforces subscription server-side |
| Stripe webhook handling | ✅ Solid | checkout.session.completed, subscription.*, invoice.payment_failed handled |
| Today page shell | ✅ Good foundation | DailyPracticeCard, WeeklyPrincipleCard, MonthlyThemeCard render correctly |
| Daily content query | ✅ Correct pattern | getTodayContent() queries by type=daily_audio, is_active=true, ordered by published_at DESC |
| Schema v1 | ✅ Deployed | member, content, progress, journal, community_post exist |
| Member nav | ✅ Working | Bottom nav with Today / Library / Journal / Account |
| Account / password nudge | ✅ Done | PasswordNudgeBanner, /account password setup complete |
| Hardening pass | ✅ Done | Shared admin client, no O(N) scan, single DB query per layout |

### What is stubbed or missing

| Area | Current state | Required |
|------|---------------|---------|
| Weekly content | Hardcoded placeholder text | Real weekly_principle content + query |
| Monthly content | Hardcoded placeholder text | Real monthly_theme content + query |
| Progress tracking | Schema exists, no writes | Mark-as-listened logic, streak update |
| Library | Nav link only — route missing | /library page and query |
| Journal | Nav link + DB table — no UI | /journal write/read UI |
| Q&A | Schema references community_post — no UI | Q&A section (Level 2+) |
| Events | Not started | Events section (Level 2+) |
| Tier-awareness in UI | subscription_tier in schema — not checked in UI | All gated sections |
| Content ingestion | Not built | Google Drive → S3 → AI → Supabase |
| Admin content management | Route shell only, no content CRUD | Full admin for Today content |
| Streak logic | practice_streak, last_practiced_at in schema — never written | Progress completion hook |
| Podcast feed | Not implemented | Private Castos feed URL per member |

### Critical gap summary

The Today page displays the correct data structure but **Weekly and Monthly content are entirely hardcoded**. The `content` table schema supports these types but no records are queryable because there is no ingestion path or admin creation flow. This is the most important gap to close before Today feels real.

---

## 2. Product Architecture

### Core principle

> Positives is a daily practice platform. It is not an LMS. Members return to it; they do not complete it.

### Authenticated member routing

```
/today        → Primary destination — always the first-loaded route after login
/library      → Content archive — all published daily/weekly/monthly browsable
/journal      → Private reflection journal
/events       → Quarterly events + replays (Level 2+)
/qa           → Coach-led Q&A (Level 2+)
/account      → Settings, password, billing
```

### Route access model

```
All member routes:  requireActiveMember() — subscription_status = 'active' required
Tier-gated routes:  checked inside page/component, not at middleware level
Admin routes:       /admin/** — requireAdmin() guard (separate from member guard)
```

### Why tier-gating is in-page, not in middleware

Middleware knows the user is authenticated. It should not know tier logic — that belongs to server components. The correct pattern keeps redirects to a minimum and allows guided upgrade UX instead of hard blocks.

---

## 3. Tier-Aware Navigation & Entitlements

### Plan names (confirmed)

| Tier | Name | DB value |
|------|------|----------|
| Level 1 | Positives Membership | level_1 |
| Level 2 | Positives Plus | level_2 |
| Level 3 | Positives Circle | level_3 |
| Level 4 | Executive Coaching | level_4 |

### Entitlement matrix

| Feature | Membership | Plus | Circle | Executive |
|---------|-----------|------|--------|-----------|
| Daily audio | ✅ | ✅ | ✅ | ✅ |
| Weekly principles | ✅ | ✅ | ✅ | ✅ |
| Monthly themes | ✅ | ✅ | ✅ | ✅ |
| Content library | ✅ | ✅ | ✅ | ✅ |
| Private podcast feed | ✅ | ✅ | ✅ | ✅ |
| Quarterly virtual events | — | ✅ | ✅ | ✅ |
| Event replays | — | ✅ | ✅ | ✅ |
| Q&A access | — | ✅ | ✅ | ✅ |
| Weekly group coaching | — | — | ✅ | ✅ |
| Coaching replays | — | — | ✅ | ✅ |
| Implementation support | — | — | ✅ | ✅ |
| Bi-weekly 1:1 coaching | — | — | — | ✅ |
| Personalized support | — | — | — | ✅ |

### Navigation treatment by tier

**Level 1 (Membership):**
Bottom nav: Today · Library · Journal · Account
Events and Q&A tabs are hidden entirely — members don't see what they're missing. If a member navigates directly to /events or /qa, they see a calm upgrade prompt.

**Level 2+ (Plus, Circle, Executive):**
Bottom nav: Today · Library · Events · Q&A · Account
Journal deprioritized from nav (still accessible from Account). Events and Q&A appear as primary nav items.

**Level 3+ (Circle, Executive):**
Coaching section visible — surfaced as a card on Today or as a nav item.

**Implementation note:** MemberNav currently has 4 static items. It should accept a `tier` prop and derive navItems dynamically. Small targeted change — do not rebuild the nav.

### Upgrade prompts (guided upgrade, never locked-door UX)

When a Level 1 member lands on a gated route, show:

```
┌─────────────────────────────────────┐
│  This is included in Positives Plus │
│                                     │
│  Live quarterly events, replays,    │
│  and Q&A with Dr. Paul and coaches. │
│                                     │
│  [ Upgrade to Plus — $X/month ]     │
│  [ Maybe later ]                    │
└─────────────────────────────────────┘
```

Design rules: Calm, not urgent. Show value, not restriction. Never use "locked" language. "Maybe later" always dismisses gracefully.

---

## 4. Information Architecture: All Sections

### 4.1 Today /today

**Purpose:** The one page members open every day.

**Layout (mobile-first, vertical stack):**
1. Greeting header — time-aware ("Good morning" / "Welcome back")
2. **Daily Practice Card** (dominant, dark surface, audio player)
3. **This Week Card** — Principle of the week
4. **This Month Card** — Monthly theme, brief text or video thumbnail
5. Reflection prompt (optional, below fold)
6. Streak indicator (subtle — "12-day practice")

**Key design rule:** Daily card always full-width and visually primary. Weekly and Monthly are secondary cards.

**Content queries:**
- Daily: `content WHERE type='daily_audio' AND status='published' AND publish_date = CURRENT_DATE`
- Weekly: `content WHERE type='weekly_principle' AND status='published' AND week_start <= now() ORDER BY week_start DESC LIMIT 1`
- Monthly: `content WHERE type='monthly_theme' AND status='published' AND month_year = YYYY-MM LIMIT 1`

---

### 4.2 Library /library

**Purpose:** Browsable archive of all published content. Not a curriculum — an archive.

**IA:**
```
/library
  → All                (default — recents + type filtering)
  → Daily              (filterable by month/year)
  → Weekly Principles  (all published, date-sorted)
  → Monthly Themes     (archive)
  → Workshops          (admin-created supplemental content)
```

**Design rules:**
- No "completed/not completed" visual treatment — this is not an LMS checklist
- Members can see what they've listened to (subtle indicator, not a progress bar)
- Tier access: Library is fully accessible to all Level 1 members. No gating within the library.

---

### 4.3 Q&A /qa

**Access:** Level 2+ (Positives Plus, Circle, Executive)

**Model:**
- Organized around Q&A threads — one question + coach response + member replies
- Dr. Paul or coaches initiate/respond; members submit questions to a queue
- Questions go to admin review before featuring

**IA:**
```
/qa
  → Featured Q&A       (Dr. Paul's recent responses)
  → All Questions      (answered or pending)
  → Ask a Question     (submit new question — goes to review queue)
```

Level 1 members who navigate to /qa see a calm upgrade prompt.

---

### 4.4 Events /events

**Access:** Level 2+

**Model:**
- Each event is a content row with type='event' and a Vimeo video ID
- Live events: link to Zoom during event window
- Replays: Vimeo player after event ends

**IA:**
```
/events
  → Upcoming           (next quarterly event — date, registration)
  → Past Events        (replays, ordered by date)
  → Annual Event       (separate featured card)
```

v1: Vimeo embed + "Join live" external link. No custom registration system.

---

### 4.5 Account /account

**Current:** Password setup done.

**Full Account IA (phased):**
```
/account
  → Password & Security  (done)
  → Your Plan            (tier display, Stripe portal link — Sprint 3)
  → Profile              (name, avatar — Sprint 3)
  → Podcast Feed         (private Castos URL — Sprint 5)
  → Notifications        (email preferences — Sprint 5)
  → Sign Out
```

Sprint 3 priority: Stripe Customer Portal link. Members must manage billing without contacting support.

---

## 5. UX Design Direction

### Positioning

The member UX should feel like a premium wellness or meditation app — not a course portal, not a SaaS dashboard. Closest design analogs: Calm, Headspace, Superhuman. Restrained, intentional, beautiful, fast.

### Mobile-first requirements

- All primary interactions must work perfectly at 390px
- Bottom nav fixed — already implemented
- No horizontal scroll anywhere
- Audio player controls minimum 44px touch targets

### States and loading

| State | Treatment |
|-------|-----------|
| Daily content missing | "Today's practice is being prepared." — calm, warm |
| Weekly content missing | "This week's principle is coming soon." |
| Monthly missing | Same pattern |
| Progress milestone | Subtle inline recognition — not a popup, not confetti |
| Network error | Retry quietly — never show technical errors to members |

### Streak display

Subtle "12-day practice" label in the Today header. Non-pressuring. If a member misses a day, streak resets quietly — no alarm, no guilt copy.

### Avoiding locked-door UX

Never show content members can't access with no explanation. Always either show the content (they have access) or show a calm upgrade prompt (they don't). Never use padlock icons. Frame upgrades around gain, not restriction.

---

## 6. Content Publishing Architecture for Today

### Architectural principle

```
Google Drive  =  human upload layer (Dr. Paul's input)
S3            =  storage and processing layer
AI            =  enrichment layer (transcript, title, metadata)
Supabase      =  publishing layer and single source of truth
Today page    =  renders only published, active Supabase records
```

**Google Drive file names are never the source of truth for rendering.** A filename may contain a date hint, but the actual rendering date is always controlled by the `publish_date` field on the Supabase content record, set by an admin.

### Why Supabase must be the publishing layer

- Drive files can be renamed, moved, or deleted
- S3 keys are internal infrastructure references
- AI-generated titles may need human editing before publication
- The admin needs final say on what appears on Today and when
- Date-alignment issues must be correctable without touching the pipeline

### Source-of-truth queries for Today

```sql
-- Current daily (exact date match)
SELECT * FROM content
WHERE type = 'daily_audio'
  AND status = 'published'
  AND publish_date = CURRENT_DATE
LIMIT 1;

-- Current weekly (most recent past Monday)
SELECT * FROM content
WHERE type = 'weekly_principle'
  AND status = 'published'
  AND week_start <= CURRENT_DATE
ORDER BY week_start DESC
LIMIT 1;

-- Current monthly (active month window)
SELECT * FROM content
WHERE type = 'monthly_theme'
  AND status = 'published'
  AND month_year = TO_CHAR(NOW(), 'YYYY-MM')
LIMIT 1;
```

All three are deterministic O(1) queries with proper indexes. No date arithmetic on the Today page.

---

## 7. Content & Data Model

### Schema additions — migration 0006_content_publishing.sql

```sql
-- New enums
CREATE TYPE content_status AS ENUM (
  'draft',
  'ready_for_review',
  'published',
  'archived'
);

CREATE TYPE content_source AS ENUM (
  'gdrive',
  'vimeo',
  'admin'
);

-- Add to content table
ALTER TABLE content
  ADD COLUMN status         content_status NOT NULL DEFAULT 'draft',
  ADD COLUMN publish_date   DATE,
  ADD COLUMN week_start     DATE,
  ADD COLUMN month_year     TEXT,
  ADD COLUMN source         content_source NOT NULL DEFAULT 'admin',
  ADD COLUMN source_ref     TEXT,
  ADD COLUMN admin_notes    TEXT,
  ADD COLUMN tier_min       subscription_tier,
  ADD COLUMN excerpt        TEXT;

-- Performance indexes
CREATE INDEX idx_content_publish_date ON content (publish_date) WHERE status = 'published';
CREATE INDEX idx_content_week_start   ON content (week_start)   WHERE status = 'published';
CREATE INDEX idx_content_month_year   ON content (month_year)   WHERE status = 'published';
CREATE INDEX idx_content_status_type  ON content (status, type);
```

### Full field reference

| Field | Type | Purpose |
|-------|------|---------|
| id | UUID | PK |
| title | TEXT | Member-facing title (admin-edited, may start as AI suggestion) |
| description | TEXT | Member-facing body |
| excerpt | TEXT | Short pull quote for card displays |
| type | content_type | daily_audio, weekly_principle, monthly_theme, library, workshop, event |
| status | content_status | draft → ready_for_review → published → archived |
| source | content_source | Where content originated |
| source_ref | TEXT | Drive file ID, Vimeo ID, or other source handle |
| vimeo_video_id | TEXT | Vimeo ID for embedded video |
| s3_audio_key | TEXT | S3 object key for audio file |
| castos_episode_url | TEXT | Castos episode URL once published |
| transcription | TEXT | Full transcript (AI-generated, admin-editable) |
| ai_generated_title | TEXT | Raw AI title suggestion |
| ai_generated_description | TEXT | Raw AI description suggestion |
| duration_seconds | INTEGER | Audio/video duration |
| publish_date | DATE | Exact publish date — admin-set — used for daily_audio lookup |
| week_start | DATE | Monday of target week — weekly_principle only |
| month_year | TEXT | YYYY-MM — monthly_theme only |
| tags | TEXT[] | Searchable tags |
| tier_min | subscription_tier | Minimum tier for access; NULL = all tiers |
| admin_notes | TEXT | Internal notes — never member-facing |

---

## 8. Daily Ingestion Workflow

### Recommended v1: semi-automated with admin review

Fully automated publishing without a review step is risky for a practice platform where tone and quality matter. The recommended v1 is: **pipeline does the heavy lifting, admin does 2 minutes of review per item**.

```
UPLOAD
Dr. Paul uploads audio to Google Drive: /Positives/Daily Audio

DETECT (automated — polling every 15–30 min in v1)
New file detected → file metadata extracted

COPY TO S3 (automated)
File downloaded → uploaded to S3:
  s3://positives-audio/daily/YYYY/MM/DD/<uuid>.mp3
Drive file ID stored as source_ref

TRANSCRIPTION + ENRICHMENT (automated)
Audio → transcription service (OpenAI Whisper or AWS Transcribe)
Transcript → AI generates:
  - Suggested title
  - Suggested description
  - Suggested excerpt
  - Tags

CREATE DRAFT RECORD (automated)
Supabase content record created:
  status = 'ready_for_review'
  type = 'daily_audio'
  title = ai_generated_title (admin edits before publish)
  publish_date = extracted from filename hint OR blank (admin sets)
  s3_audio_key = S3 path
  source = 'gdrive'
  source_ref = Drive file ID

NOTIFY ADMIN (automated)
Notification: "New daily ready for review — [filename]"

ADMIN REVIEW (manual — ~2 minutes)
Admin opens record in admin dashboard:
  - Confirm or edit title
  - Confirm or edit description/excerpt
  - Set publish_date
  - Add admin_notes if needed
  - Click "Publish"

PUBLISH (automated on admin click)
status = 'published'
Castos episode created via API (Sprint 5)
Record live — Today page picks it up on publish_date
```

### What waits for v2

- Drive webhook Push Notifications (v1 uses scheduled polling)
- Auto-publish with zero review
- Castos API integration (v1: admin publishes to Castos manually — Sprint 5 wires it)
- S3 audio waveform generation

---

## 9. Weekly & Monthly Workflow

### Why this differs from Daily

Weekly and Monthly content is not ingestion-heavy. The correct model here is **admin-created, admin-scheduled**.

### Weekly Principle workflow

```
CREATION (admin — once per week, ideally 1 week ahead)
Admin creates "New Weekly Principle" in admin dashboard:
  - title (e.g. "The Practice of Presence")
  - description (principle explanation)
  - excerpt (one line for Today card)
  - Vimeo video ID (paste from Vimeo if video exists)
  - week_start (the Monday when this goes live)
  - status = 'published'

ACTIVATION (automatic — no cron needed)
Today page query:
  week_start <= CURRENT_DATE ORDER BY week_start DESC LIMIT 1
The record with the most recent past Monday is always current.

ROLLOVER (automatic)
When a new week starts, the next record becomes active by its week_start date.
No cron, no trigger — the query handles it.
```

### Monthly Theme workflow

```
CREATION (admin — once per month, ideally the preceding month)
Admin creates Monthly Theme record:
  - title (e.g. "Your Relationship with Yourself")
  - description (theme content)
  - month_year (YYYY-MM, e.g. '2026-04')
  - vimeo_video_id (optional)
  - status = 'published'

ACTIVATION (automatic)
month_year = TO_CHAR(NOW(), 'YYYY-MM')
No cron needed.
```

### Vimeo-hosted Weekly video

- Admin pastes Vimeo video ID from vimeo.com/123456789
- Platform embeds via https://player.vimeo.com/video/{id}
- No Vimeo API credentials needed for basic embed in v1
- Vimeo videos should be "Unlisted" with domain restriction to positives-membership.vercel.app

### Fallback behavior if content is missing

| Missing content | Member-visible state |
|----------------|---------------------|
| No Daily for today | "Today's practice is being prepared. Check back shortly." |
| No Weekly for this week | "This week's principle is coming soon." |
| No Monthly for this month | "This month's theme will be here soon." |

Always calm, warm, implying intentionality — never apologetic or alarming.

---

## 10. Admin Requirements for Today Content

### Minimum viable admin for content operations

#### Daily content list view (/admin/content/daily)
- All daily_audio records, sorted by publish_date DESC
- Color-coded status: draft (gray) / ready_for_review (amber) / published (green) / archived (muted)
- Gap detection: dates with no published daily highlighted in red → "Missing: April 3"
- One-click publish/unpublish

#### Daily content edit view (/admin/content/[id])
- Title field (AI pre-filled, editable)
- Description, excerpt fields
- Publish date picker
- Audio preview (S3 URL as HTML audio element)
- Transcript textarea (AI-generated, fully editable)
- Admin notes field
- Status dropdown
- "Override Today" checkbox — forces record to appear on Today regardless of date

#### Weekly Principle form (/admin/content/weekly/new)
- Title, description, excerpt
- Vimeo video ID
- Week start (date picker snapping to Monday)
- Status

#### Monthly Theme form (/admin/content/monthly/new)
- Title, description
- Month/year selector
- Vimeo video ID
- Status

#### Upcoming content calendar (/admin/content/calendar)
- 4-week view of scheduled daily/weekly/monthly content
- Missing days shown as empty cells (gap detection visual)
- Click any day to edit or create

#### Ingestion queue (/admin/ingestion)
- Files ingested from Drive but not yet reviewed
- Quick-approve action (confirm AI title, set publish_date, publish)

### Admin capability rollout

| Capability | Sprint |
|-----------|--------|
| Review ingested daily items | Sprint 3 |
| Edit title/description/excerpt/transcript | Sprint 3 |
| Set publish date, publish/unpublish | Sprint 3 |
| Override today's item | Sprint 3 |
| Create/edit Weekly and Monthly records | Sprint 3 |
| Gap detection in list view | Sprint 4 |
| Calendar view | Sprint 5 |
| Ingestion queue | Sprint 5 (with pipeline) |

---

## 11. Reliability & Edge Cases

| Edge case | Handling |
|-----------|---------|
| No daily content for today | DailyPracticeCard renders "Coming soon" — already implemented |
| No weekly content | WeeklyPrincipleCard renders empty state |
| No monthly content | MonthlyThemeCard renders empty state |
| Duplicate daily uploads (same date, two records) | LIMIT 1 ORDER BY created_at DESC — latest wins. Admin notified. |
| Wrong publish_date | Admin corrects in admin dashboard. Immediately reflected. |
| Bad AI transcript | Admin edits in review step before publishing |
| Late upload (noon instead of overnight) | Content appears as soon as admin publishes. Morning visitors see "coming soon" state; afternoon refresh shows live content. Acceptable for v1. |
| Ingestion pipeline failure | Pipeline logs to ingestion_job table. Admin notified. Manual fallback: create record directly from S3 key. |
| Missing Vimeo link on Weekly | Weekly card renders principle text only — no video. Acceptable. |
| Admin override of Today | is_today_override boolean on content row. Today query checks this first. Expires at midnight. |
| Timezone edge cases | publish_date is date-only. US Eastern members see a different "today" than UTC. Recommendation: anchor publish_date to US Eastern calendar date; convert NOW() to Eastern in query. Sprint 4 concern. |
| S3 audio URL expiry | resolveAudioUrl handles Castos vs S3 fallback. Ensure S3 presigned URL TTL >= 3 hours. |

---

## 12. Backend & Data Model Implications

### Migrations roadmap

| Migration | Description | Sprint |
|-----------|-------------|--------|
| 0006_content_publishing.sql | Add status, publish_date, week_start, month_year, source, source_ref, excerpt, tier_min, admin_notes | Sprint 1 |
| 0007_progress_streak.sql | Index on progress; trigger to update member.practice_streak and last_practiced_at on progress insert | Sprint 1 |
| 0008_ingestion_jobs.sql | ingestion_job table for pipeline tracking | Sprint 5 |
| 0009_events.sql | Add event to content_type enum; event-specific fields | Sprint 4 |
| 0010_qa.sql | qa_thread and qa_reply tables | Sprint 4 |

### New lib/queries

| File | Query | Sprint |
|------|-------|--------|
| lib/queries/get-weekly-content.ts | Active weekly_principle | Sprint 1 |
| lib/queries/get-monthly-content.ts | Active monthly_theme | Sprint 1 |
| lib/queries/get-library-content.ts | Paginated library by type | Sprint 2 |
| lib/queries/get-member-progress.ts | Progress records for member | Sprint 2 |
| lib/queries/get-events.ts | Upcoming and past events | Sprint 4 |
| lib/queries/get-qa-threads.ts | Q&A threads paginated | Sprint 4 |

### New server actions

| Action | Description | Sprint |
|--------|-------------|--------|
| app/today/actions.ts: markListened | Write progress record, update streak | Sprint 1 |
| app/admin/content/actions.ts: publishContent | Set status to published | Sprint 3 |
| app/admin/content/actions.ts: createContent | Admin creates weekly/monthly record | Sprint 3 |
| app/qa/actions.ts: submitQuestion | Member submits Q&A question | Sprint 4 |
| app/journal/actions.ts: saveJournalEntry | Write journal entry | Sprint 2 |

### RLS additions

```sql
-- Members can read published content only
CREATE POLICY "published_content_readable_by_active_members"
ON content FOR SELECT
USING (
  status = 'published'
  AND auth.uid() IN (
    SELECT id FROM member WHERE subscription_status = 'active'
  )
);

-- Tier-gated content (events, Q&A at minimum level_2)
CREATE POLICY "tier_gated_content"
ON content FOR SELECT
USING (
  status = 'published'
  AND (
    tier_min IS NULL
    OR (
      SELECT subscription_tier FROM member WHERE id = auth.uid()
    ) >= tier_min
  )
);
```

---

## 13. Phased Implementation Roadmap

### Sprint 1 — Today Comes Alive (2–3 days)

**Goal:** Weekly and Monthly content wires to real data. Progress tracking starts.

- [ ] Run migration 0006_content_publishing.sql
- [ ] Update getTodayContent() to use publish_date = CURRENT_DATE instead of is_active + published_at order
- [ ] Create getWeeklyContent() query
- [ ] Create getMonthlyContent() query
- [ ] Wire WeeklyPrincipleCard and MonthlyThemeCard to real data with graceful empty states
- [ ] Run migration 0007_progress_streak.sql
- [ ] Add markListened server action (write progress, update last_practiced_at, update streak)
- [ ] Wire completion to AudioPlayer (fire at ~80% playback — client callback → server action)
- [ ] Seed 1 weekly and 1 monthly record in Supabase for smoke testing
- [ ] Update today/page.tsx to run all three queries in parallel (Promise.all)

**Deliverable:** Today page renders real Daily, Weekly, Monthly. Progress writes on audio completion. Streak increments.

---

### Sprint 2 — Library & Journal (3–4 days)

**Goal:** Members can browse their history and write reflections.

- [ ] Create /library route
- [ ] Create getLibraryContent() query with type filter and pagination
- [ ] Build LibraryCard component (title, date, duration, type badge)
- [ ] Build library filter tabs: All / Daily / Weekly / Monthly
- [ ] Show subtle "listened" indicator on library items where progress record exists
- [ ] Create /journal route
- [ ] Build JournalEntryForm client component (textarea, submit, optimistic UI)
- [ ] Create saveJournalEntry server action
- [ ] Build JournalEntryList (past entries, date-sorted)
- [ ] Link journal entry to content_id when written from Today page context

**Deliverable:** Full library browse + personal journal.

---

### Sprint 3 — Admin Content CRUD (3–4 days)

**Goal:** Admin can manage all Today content without touching the database directly.

- [ ] Build /admin/content list view — all content records, status badges, sortable
- [ ] Build /admin/content/[id] edit view — all fields, publish/unpublish toggle
- [ ] Build /admin/content/daily/new — manual daily record creation
- [ ] Build /admin/content/weekly/new form
- [ ] Build /admin/content/monthly/new form
- [ ] Implement gap detection in daily list view
- [ ] Implement "Override Today" feature
- [ ] Add Stripe Customer Portal link to /account
- [ ] Add profile editing (name) to /account
- [ ] Update MemberNav to show tier-appropriate items (pass tier prop)

**Deliverable:** Admin team can run daily content operations without engineering. Account page has billing management.

---

### Sprint 4 — Events & Q&A — Level 2+ (3–4 days)

**Goal:** Positives Plus tier delivers its core value.

- [ ] Run migration 0009_events.sql
- [ ] Create /events route — gated (Level 2+), upgrade prompt for Level 1
- [ ] Build EventCard — date, title, Vimeo player or "Join live" link
- [ ] Run migration 0010_qa.sql
- [ ] Create /qa route — gated (Level 2+)
- [ ] Build QAThread component
- [ ] Build SubmitQuestion form
- [ ] Admin: /admin/qa — question queue review
- [ ] Admin: /admin/events — event record creation with Vimeo ID
- [ ] Update tier-aware navigation
- [ ] Write RLS policies for events and Q&A

**Deliverable:** Plus tier members have Events and Q&A. Level 1 see calm upgrade prompts.

---

### Sprint 5 — Ingestion Pipeline (4–5 days)

**Goal:** Daily audio goes from Dr. Paul's computer to published member content with minimal admin friction.

- [ ] Run migration 0008_ingestion_jobs.sql
- [ ] Build Google Drive polling job (Vercel Cron + Drive API)
- [ ] Implement S3 upload function (lib/s3/upload.ts)
- [ ] Integrate transcription (OpenAI Whisper via lib/ai/transcribe.ts)
- [ ] Implement AI enrichment (title, description, excerpt)
- [ ] Build draft record creation in Supabase on ingestion
- [ ] Build admin notification on new ready_for_review record
- [ ] Build /admin/ingestion queue view
- [ ] Build quick-approve flow
- [ ] Build Castos API integration for private podcast publishing
- [ ] End-to-end test: Drive upload → review queue → publish → Today page live

**Deliverable:** Dr. Paul uploads audio. Admin reviews, clicks Publish. Content is live. Members receive it in podcast app.

---

### Sprint 6 — Retention & Milestones (2–3 days)

**Goal:** Reinforce the daily habit without pressure.

- [ ] Display streak count on Today header (subtle label)
- [ ] Define and build milestones (7, 30, 90 days)
- [ ] Inline milestone recognition on Today page (no popup — just a warm moment)
- [ ] Email trigger on milestone via ActiveCampaign
- [ ] Streak recovery grace period logic (1-day grace window)
- [ ] ActiveCampaign new member welcome sequence trigger on webhook activation

**Deliverable:** Members feel recognized for consistency. Daily habit gently reinforced.

---

## 14. Recommended Next Sprint

**Start with Sprint 1 — Today Comes Alive.**

### Why first

1. Today is what every member sees every day. Weekly and Monthly are currently hardcoded placeholder text — the most visible gap in the product.
2. Progress tracking needs to start writing data now, before you have real members practicing daily. The data accumulates from day one — missing this early means missing retention signal.
3. It requires zero new infrastructure — only schema additions, new queries, and component prop-wiring.
4. Completable in 2–3 focused days.

### First 5 steps

1. Write and run `0006_content_publishing.sql` (adds publish_date, week_start, month_year, status, excerpt)
2. Seed one weekly_principle and one monthly_theme record directly in Supabase (SQL insert) so the queries have data to return immediately
3. Write `getWeeklyContent()` and `getMonthlyContent()` in lib/queries/
4. Update today/page.tsx to call all three queries in parallel with `Promise.all`
5. Pass real props to WeeklyPrincipleCard and MonthlyThemeCard with graceful empty states

This sprint answers the most important open question: **does Positives feel like a real daily practice platform when you log in?**

---

## Appendix: Open Questions

| Question | Priority |
|---------|--------|
| What is the pricing/upgrade path for Plus, Circle, Executive? High — needed before tier gating can be tested | High |
| Does Dr. Paul approve AI-generated titles, or trust them by default? Impacts ingestion pipeline design | High |
| What timezone should publish_date be anchored to? Recommend US Eastern | Medium |
| Does Castos support API publishing, or must it be manual? Impacts Sprint 5 scope | Medium |
| What does "implementation support" mean in Circle tier, operationally? | Low |
| Will the Seven Key Relationships be the explicit structure for Monthly themes? | Low |

---

*Update this document at the end of each sprint to reflect what was built, what changed, and what the next phase looks like.*

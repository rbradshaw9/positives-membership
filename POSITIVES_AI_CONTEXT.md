# POSITIVES_AI_CONTEXT.md

*(Condensed AI Working Context — verified 2026-04-06)*

---

## 1. Platform Overview

**Positives** is a membership platform built around a daily personal
growth practice led by Dr. Paul Jenkins.

Members return daily to:

- listen to a short practice
- reflect with optional journaling
- engage with deeper weekly/monthly teachings

The product is designed to feel like a **gym for mindset practice**, not
a course platform.

Core principles:

- members never feel behind
- daily practice is always the center
- calm experience > feature complexity
- depth is optional, never forced

---

## 2. Core Technology Stack

| Layer | Technology | Status |
|---|---|---|
| Frontend | Next.js (App Router) | ✅ Active |
| Hosting | Vercel | ✅ Active |
| Database + Auth | Supabase (Postgres + Supabase Auth) | ✅ Active |
| Billing | Stripe (checkout, webhooks, portal) | ✅ Active |
| Video (primary) | **Mux** — `@mux/mux-node`, `@mux/mux-player-react`, `@mux/upchunk` | ✅ Active |
| Video (legacy) | Vimeo — `@vimeo/player` — fallback for pre-Mux content | ✅ Fallback |
| Audio hosting | S3 (presigned URLs via `resolveAudioUrl()`) | ✅ Active |
| Podcast feed | Castos — `castos_episode_url` column exists | ⚠️ Planned — no delivery code |
| Email transactional | Resend | ⚠️ Planned — no code |
| Email lifecycle | ActiveCampaign | ⚠️ Planned — no code |
| Vector / AI | pgvector + OpenAI embeddings | ⚠️ Schema only — tables empty, no embedding code |

---

## 3. Subscription Tiers

Level 1 — Core Practice\
Level 2 — Positives Plus\
Level 3 — Positives Circle\
Level 4 — Executive Coaching

Tier access is stored on:

```
member.subscription_tier
```

Content gating uses:

```
content.tier_min
```

Server-side rule:

```
tier_min IS NULL OR tier_min <= member.subscription_tier
```

Client UI **never enforces access control**.

---

## 4. Core Database Tables

### member

```
id
email
name
avatar_url
stripe_customer_id
subscription_status
subscription_tier
subscription_end_date
practice_streak
last_practiced_at
created_at
timezone
onboarding_token      -- one-time token for post-checkout magic link, cleared after use
password_set          -- bool; drives "secure your account" nudge banner
```

> **Note:** `onboarding_completed_at` does NOT exist. Use `onboarding_token` and `password_set`.

---

### content (primary publishing model)

All member-facing material is modeled here whenever possible.

```
id
type                         -- content_type enum (see below)
title
description
excerpt
body

status                       -- draft | ready_for_review | published | archived
publish_date                 -- for daily_audio
week_start                   -- for weekly_principle
month_year                   -- for monthly_theme ('YYYY-MM')

tier_min                     -- subscription_tier | NULL (NULL = all tiers)
starts_at                    -- TIMESTAMPTZ for coaching calls / events

s3_audio_key
castos_episode_url
vimeo_video_id               -- legacy; prefer Mux for new content
youtube_video_id
mux_playback_id              -- Mux streaming playback ID
mux_asset_id                 -- Mux asset ID (for deletion / dashboard lookup)
join_url                     -- coaching Zoom link (server-side only, never in client bundle)
download_url

reflection_prompt
resource_links               -- JSONB [{label, url, type?}]

transcription
search_vector                -- generated tsvector for FTS
tags

source                       -- gdrive | vimeo | admin
source_ref
ai_generated_title
ai_generated_description
admin_notes
duration_seconds
is_today_override
created_at
updated_at
```

**Current content types** (`content_type` enum):

```
daily_audio
weekly_principle
monthly_theme
library
workshop
coaching_call
```

> **Note:** `event` does NOT exist as a content type yet. Do not use it.

---

### journal

Stores member notes. Supports content-linked and freeform entries.

```
id
member_id
content_id (nullable)
entry_text
created_at
updated_at
```

---

### progress

Tracks practice completion.

```
member_id
content_id
listened_at          -- TIMESTAMPTZ
completed            -- BOOLEAN
reflection_text
```

> **Note:** The column is `listened_at`, not `completed_at`.

---

### activity_event

Append-only engagement log.

**Active event types** (`activity_event_type` enum):

```
session_start
daily_listened         -- WIRED: audio reaches 80% threshold
daily_started
weekly_viewed
monthly_viewed
note_created
note_updated
journal_opened
event_attended
qa_submitted
qa_viewed
milestone_reached
upgrade_prompt_seen
upgrade_clicked
coaching_attended
```

> **Note:** `event_rsvp` and `qa_posted` do NOT exist. Use `event_attended`, `qa_submitted`, `qa_viewed`.

---

### video_views

Tracks per-member video watch progress for resume, milestones, analytics.

```
id
user_id
content_id (nullable)
mux_asset_id (nullable)
mux_playback_id (nullable)
watch_percent
completed
resume_at_seconds
started_at
last_seen_at
session_count
```

---

### community_post

Community posts (feature-flagged behind `ENABLE_COMMUNITY_PREVIEW=true`).

```
id
member_id
content_id (nullable)
body
post_type            -- reflection | question | share
parent_id (nullable) -- for threading
is_pinned
is_admin_answer
created_at
```

---

### community_post_like

```
id
post_id
member_id
created_at
```

---

### content_embedding / content_chunk

Schema-only. Tables exist with pgvector columns. Zero data — no embedding pipeline built yet.

---

## 5. Core Product Features (All Sprints Complete)

**Authentication**
- Supabase auth — magic link + password login
- Stripe subscription lifecycle via webhooks
- `requireActiveMember()` server guard on all member pages
- `requireAdmin()` email allowlist guard on `/admin`
- Post-checkout onboarding token flow

**Today Page (`/today`)**
- Radial-gradient hero with time-aware greeting, date label, monthly theme subtitle, streak badge
- DailyPracticeCard — in-card audio player, 80% completion tracking, reflection prompt, note button
- WeeklyPrincipleCard — optional audio, markdown body, reflection prompt, note button
- MonthlyThemeCard — Mux (primary) or Vimeo video, expandable markdown body, resources, note button
- Audio/video coordination via `MemberAudioProvider` ("latest wins" pattern)
- MonthlyAudioArchive — inline playlist per month, play/pause/scrub/skip ±15s
- WeeklyArchive — past weeks' reflections this month
- PersistentAudioPlayer — sticky, hidden on `/today` (in-card player takes over)
- CMS preamble dedup via `stripCmsPreamble()`

**Library (`/library`)**
- Full-text search (weighted tsvector)
- Type filter tabs (All / Daily / Weekly / Monthly / + more)
- Pagination (20 items/page)
- Tier filtering (respects `tier_min`)
- Note indicators
- Library item detail page (`/library/[id]`) with Mux/Vimeo video

**My Practice (`/practice`)**
- Stats hero — streak, listens, notes count
- Heatmap — 3-state coloring: on_time / catch_up / none, 70-day grid
- Continue Listening, Recently Completed, Suggested Next
- Practice Collection tabs
- Archive route: `/practice/[monthYear]`

**Coaching (`/coaching`)**
- Level 3+ gated — Level 1/2 sees upgrade prompt
- Upcoming call card (starts_at, join_url from server only)
- Replay archive (past calls with Mux/Vimeo embed)

**Community Q&A (`/community`)**
- Level 2+ gated
- Feature-flagged (`ENABLE_COMMUNITY_PREVIEW=true`)
- Weekly thread, reply threading, likes (optimistic UI), admin pin/answer/delete

**Journal / Notes (`/journal`)**
- NoteSheet — slide-over desktop, bottom sheet mobile
- `NewJournalEntryButton` — opens NoteSheet with `contentId=null` for freeform entries
- Notes archive grouped by month with content-type left borders
- Server actions: `saveNote`, `getNoteForContent`, `getMemberNotes`

**Account (`/account`)**
- Membership status card
- Password management (`password_set` field, nudge banner for magic-link-only members)
- Timezone select + save
- Billing portal (Stripe customer portal)

**Admin (`/admin`)**
- Content list with type filters and status badges
- Content create/edit (all fields including `tier_min`, `starts_at`, Mux video panel)
- Months workspace — month list, detail page, daily audio grid with drag-to-reorder
- Member viewer — list and detail with subscription/activity data
- Content calendar — date-based content view
- Admin reskin: 100% on `admin-*` CSS system (2 minor pages remain: calendar, ingestion)

**Video System**
- `VideoUploadPanel` — admin drag-drop upload, 5MB chunked, Mux processing poll
- API: `/api/admin/video/upload`, `/api/admin/video/status`, `/api/admin/video/commit`, `/api/admin/video/remove`
- `VideoEmbed` — routes to MuxPlayer (primary), Vimeo iframe, or YouTube based on available IDs
- Video resume overlay (shows "You left off at X:XX" with Resume / Start Over)
- `video_views` tracking: milestone writes at 25/50/75/95%, session counting, resume position
- Audio/video coordination: playing video pauses audio and vice versa

**Design System**
- Member area: `.member-hero`, `.btn-primary`, `.member-input`, `shadow-medium`, `shadow-large`
- Admin area: full `admin-*` CSS system in `globals.css`
- Three accent tokens: primary (blue/daily), secondary (green/weekly), accent (amber/monthly)

---

## 6. Key Architecture Principles

### 1. Unified Content Model

Everything member-facing is a row in the `content` table. Coaching calls, replays, workshops — all content rows. Avoid creating parallel systems.

### 2. Server-Side Authorization

All gating happens server-side. `requireActiveMember()` at the top of every member page. `checkTierAccess()` for tier gates. Never trust client state.

### 3. Daily Practice is the Center

Today page hierarchy: Daily → Weekly → Monthly → Secondary cards. Never break this.

### 4. Calm UX

The platform should feel like a meditation app, not a SaaS dashboard.

### 5. Members Never Fall Behind

No course progress bars, completion percentages, or guilt-driven reminders. Practice is cyclical.

---

## 7. Coaching System

Weekly coaching calls for Level 3 + Level 4.

```
content.type = 'coaching_call'
content.tier_min = 'level_3'
content.starts_at = upcoming call datetime
content.join_url = Zoom URL (server-side only — never in client bundle)
```

Route: `/coaching`  
- Upcoming call → `UpcomingCallCard` (date, time, Zoom join)
- Past calls → `CoachingReplayCard` (Mux or Vimeo replay)
- Non-eligible → `CoachingUpgradePrompt`

---

## 8. Library System

Library shows all published content. Respects `tier_min` filtering.

**Active content types shown in library:**

```
daily_audio | weekly_principle | monthly_theme | library | workshop | coaching_call
```

Features: FTS, type filters, pagination (20/page), note indicators, Mux/Vimeo video on detail page.

**Planned (not built):** semantic search, AI recommendations, course collections.

---

## 9. Notes / Journal

Members write notes in two ways:

1. **Contextual** — from content card "Note" buttons (content_id linked)
2. **Freeform** — via `NewJournalEntryButton` on `/journal` (content_id = null)

Both use `NoteSheet` — slide-over on desktop, bottom sheet on mobile.

---

## 10. AI System (Planned — No Code)

Vector tables exist but are empty:

```
content_embedding  -- one per content item (OpenAI text-embedding-3-small)
content_chunk      -- chunked for RAG
```

Future: semantic search, content recommendations, AI assistant (RAG), auto-tagging from transcripts.

---

## 11. Email System (Planned — No Code)

**Transactional:** Resend — welcome, password reset, payment receipts, milestones, event reminders  
**Lifecycle:** ActiveCampaign — onboarding, engagement reminders, upgrade nurture, weekly digest

**Current state:** Zero integration code. No npm packages for either. No API keys used.

---

## 12. Next Development Phases

### Immediate (In Progress)
- Admin reskin: complete `content/calendar/page.tsx` + `ingestion/page.tsx`
- Write migration `0013_mux_video_tracking.sql` to capture Mux schema in version control

### Phase 1 — Revenue & Member Experience
- Multi-tier pricing on `/join` page (currently Level 1 only)
- Onboarding flow (first-login detection, welcome sequence)

### Phase 2 — Community
- Events (Level 2 differentiator)
- Email lifecycle (Resend + ActiveCampaign)

### Phase 3 — Content Ops
- Audio ingestion pipeline (Google Drive → S3 → transcription → AI metadata → review → publish → Castos)

### Phase 4 — AI Layer
- Semantic search, content recommendations, AI assistant

### Phase 5 — Growth
- Referrals, advanced analytics, mobile app

---

## 13. Sprint History

| Sprint | Focus | Status |
|---|---|---|
| 1–4 | Foundation: Auth, Today, Library, Journal, Admin | ✅ Complete |
| 5–6 | Media: video embeds, resource links, search polish | ✅ Complete |
| 7–8 | UI system: premium nav, hero, engagement tracking | ✅ Complete |
| 9 | Member UI: responsive layout, typed cards | ✅ Complete |
| 10 | Tier gating, coaching, journal new entry, admin coaching | ✅ Complete |
| 11 | Visual cohesion: `.member-hero`, `.btn-primary`, `.member-input` | ✅ Complete |
| Post-11 | Mux video migration, video tracking, months workspace, community Q&A, heatmap, CMS dedup | ✅ Complete |

---

## How to Use This File

When starting a new AI development thread, provide this file as context and begin:

> "Use POSITIVES_AI_CONTEXT.md as system context. We are continuing development of the Positives platform. All sprints through Sprint 11 + post-sprint polish are complete. See §12 for next development phases."

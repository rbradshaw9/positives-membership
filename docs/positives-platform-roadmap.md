# Positives Platform — Roadmap & System Architecture

> **Canonical planning document for ongoing development**
> Prepared April 2026 · Updated April 2026 (roadmap reality pass) · Supersedes all prior sprint-level plans
> Grounded in `PROJECT_BRIEF.md`, `CONTRIBUTING.md`, `member-experience-implementation-plan.md`, `sprint-1-build-plan.md`, and current repository source code

---

## Table of Contents

1. [Current System Overview](#1-current-system-overview)
2. [Development Phases Roadmap](#2-development-phases-roadmap)
3. [Admin System Completion Plan](#3-admin-system-completion-plan)
4. [Customer Support System](#4-customer-support-system)
5. [Email Infrastructure](#5-email-infrastructure)
6. [Content Automation / Ingestion Pipeline](#6-content-automation--ingestion-pipeline)
7. [AI Layer](#7-ai-layer)
8. [Community Features](#8-community-features)
9. [Operational Systems](#9-operational-systems)
10. [Product Vision](#10-product-vision)

---

## 1. Current System Overview

### What Positives Is

Positives is a practice-based membership platform built around a simple daily rhythm: listen to a short grounding audio from Dr. Paul Jenkins, engage with a weekly principle, and absorb a monthly theme. It is intentionally designed to feel like a gym for personal growth — members return to it daily; they do not complete it.

### Technology Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | Next.js 16 (App Router, Turbopack) | Server-rendered member + marketing pages |
| Hosting | Vercel | Edge deployment, serverless functions |
| Database & Auth | Supabase (Postgres + Auth) | Source of truth for members, content, progress, journaling |
| Payments | Stripe | Subscription billing, webhook-driven lifecycle |
| Video | Vimeo | Hosted video embeds for weekly/monthly content |
| Audio Input | Google Drive → S3 | Dr. Paul uploads → pipeline processes |
| Private Podcast | Castos | RSS feed delivery to podcast apps (planned) |
| Email Automation | ActiveCampaign (planned) | Lifecycle sequences, engagement reminders |

### Subsystem-by-Subsystem Status

#### 1.1 Authentication & Access Control ✅

| Component | Status | Notes |
|-----------|--------|-------|
| Supabase Auth (magic link + password) | Production | Email OTP with password-set flow |
| `requireActiveMember()` server guard | Production | Enforces `subscription_status = 'active'` |
| Stripe webhook handler | Production | `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed` |
| Member bootstrap trigger | Production | Creates `member` row on first auth (migration 0003) |
| Password nudge banner | Production | Prompts magic-link-only members to set a password |
| Login page | Production | Branded, redesigned in Sprint 7 |
| `/join` checkout flow | Production | Payment-first onboarding via Stripe Checkout |

#### 1.2 Today Page ✅

The primary member destination. Renders three content streams vertically:

| Slot | Component | Query | Content Source |
|------|-----------|-------|----------------|
| Daily Practice | `DailyPracticeCard` | `publish_date = effective_date_eastern` | `daily_audio` records |
| Weekly Principle | `WeeklyPrincipleCard` | `week_start <= effective_date DESC LIMIT 1` | `weekly_principle` records |
| Monthly Theme | `MonthlyThemeCard` | `month_year = YYYY-MM` | `monthly_theme` records |

**Key behaviors:**
- Personalized time-based greeting ("Good morning, Ryan") via `lib/greeting.ts`
- Canonical Eastern timezone resolution via `lib/dates/effective-date.ts`
- Audio player with 80% completion threshold → `markListened` server action
- Inline note/reflection sheet per content item
- "Listened today ✓" completion chip on Daily card
- Full-width hero section with radial gradient (Sprint 9)
- "Continue your practice" visual separator between daily and weekly/monthly

**Design language (Sprint 9):**
- Dark midnight-blue Daily card with dual-tone radial glow
- Warm tinted Weekly card with green accent audio tray
- Accent-bordered Monthly card with orange theme chip
- Type badges: `DAILY` (blue glass pill), `WEEKLY` (green pill), `MONTHLY` (amber pill)

#### 1.3 Content Schema ✅

The `content` table is the central publishing model. Accumulated across migrations 0001, 0006, 0009:

| Column Group | Key Fields | Purpose |
|-------------|-----------|---------|
| Identity | `id`, `title`, `description`, `excerpt`, `type` | Core metadata |
| Publishing | `status` (draft/ready_for_review/published/archived), `publish_date`, `week_start`, `month_year` | Temporal activation |
| Media | `s3_audio_key`, `castos_episode_url`, `vimeo_video_id`, `youtube_video_id`, `download_url` | Multi-format delivery |
| Rich content | `body` (markdown), `reflection_prompt`, `resource_links` (JSONB array) | Supporting material |
| AI/Search | `transcription`, `ai_generated_title`, `ai_generated_description`, `search_vector` (tsvector) | Enrichment + FTS |
| Metadata | `source`, `source_ref`, `admin_notes`, `is_today_override`, `tags`, `duration_seconds` | Operational |

**Indexes:** Partial indexes on `publish_date`, `week_start`, `month_year` (all filtered by `status = 'published'`), GIN index on `search_vector`.

#### 1.4 Library ✅

Browsable archive of all published content at `/library`.

| Feature | Status |
|---------|--------|
| Type filter tabs (All / Daily / Weekly / Monthly) | ✅ |
| Postgres full-text search with weighted tsvector | ✅ |
| Search result count, clear button | ✅ |
| Pagination (20 items per page) | ✅ |
| TypeBadge component for content type labeling | ✅ |
| Note existence indicator per item | ✅ |
| Empty state for search + browse | ✅ |
| **Library detail page** (`/library/[id]`) | ✅ |

**Query chain:** `getLibraryContent()` (browse mode) and `searchLibraryContent()` (FTS mode) in `lib/queries/`.

**Library detail page:** Each content item has a dedicated detail route (`/library/[id]`) rendering the full title, TypeBadge, description, body (with markdown), audio player or video embed, resource links, and inline NoteSheet. Shipped in the member UI stabilisation pass.

#### 1.5 Notes / Journal ✅

Two complementary views of the same underlying data:

| Route | Purpose | Component |
|-------|---------|-----------|
| **Inline on Today cards** | Contextual reflection attached to a specific content item | `NoteSheet` (client component, bottom drawer) |
| `/journal` | Chronological archive of all notes | `JournalList` with month-group dividers |

**Data model:** `journal` table with `member_id`, `content_id` (nullable FK to content), `entry_text`, `created_at`, `updated_at`. RLS policy restricts to own rows.

**Server actions:** `saveNote`, `getNoteForContent`, `getMemberNotes` in `app/(member)/notes/actions.ts`.

#### 1.6 Engagement & Activity Tracking ✅

| Table | Purpose | Key Events |
|-------|---------|-----------|
| `progress` | Content-specific listen/completion records | `completed = true` on daily audio finish |
| `activity_event` | Append-only general behavioral event log | `daily_listened`, `weekly_viewed`, `monthly_viewed`, `note_created`, `note_updated` |

**Enum vocabulary:** The `activity_event_type` enum includes 13 event types defined in migration 0006. Currently 5 are actively fired; the remainder are reserved for future sprints (event attendance, Q&A, milestones, upgrades).

**Streak system:** `member.practice_streak` and `member.last_practiced_at` are updated by `markListened`. Streak is reset if `last_practiced_at` is more than 1 day ago. Displayed in nav streak chip (desktop) and hero section (mobile).

#### 1.7 Admin Content Management ✅

| Feature | Status | Route |
|---------|--------|-------|
| Content list view | ✅ | `/admin/content` |
| Create new content | ✅ | `/admin/content/new` |
| Edit existing content | ✅ | `/admin/content/[id]/edit` |
| Resource Links Editor | ✅ | Integrated into create/edit forms |
| Media URL auto-detect | ✅ | YouTube/Vimeo ID extraction from pasted URLs |
| **Tiptap rich-text body editor** | ✅ | Inline WYSIWYG in create/edit forms |
| Ingestion queue (preview) | ✅ (UI shell only — pipeline not yet built) | `/admin/ingestion` |
| Admin layout guard | ✅ | `requireAdmin()` middleware |

**Server actions:** `createContent`, `updateContent` in `app/admin/content/actions.ts`. Handles JSON parsing of resource links, media URL normalization, and all content fields.

**Tiptap body editor:** Replaces raw textarea for the `body` field. Produces markdown-compatible output. Admin can write rich body copy with headings, bold, lists, and links directly in the edit form.

#### 1.8 Member Navigation, Layout & Account ✅ (Sprint 9 + content stabilisation pass)

| Component | Purpose |
|-----------|---------|
| `MemberTopNav` | Sticky top bar (desktop: wordmark + streak + nav links; mobile: bottom tab bar with icons) |
| `MemberLayout` | Server component shell — auth guard, streak fetch, password nudge banner |
| `.member-container` | CSS utility: `max-width: 52rem`, responsive horizontal padding |
| `PageHeader` | Display heading (`text-3xl/4xl`) + optional subtitle, used across all member pages |
| **Sign-out / logout** | ✅ — Sign-out action available from Account page and nav. Clears Supabase session server-side. |

#### 1.9a Markdown Rendering ✅ (Content stabilisation pass)

All `body` fields in content records are rendered as rich markdown (headings, bold, italic, lists, links, blockquotes) in both the Library detail page and any member-facing content view that exposes the body field. Uses a lightweight markdown-to-HTML renderer, not raw `dangerouslySetInnerHTML`. Consistent with brand typography.

#### 1.10a Vector-Ready Schema ✅ (Foundation Only)

Created in migration 0010, these tables are empty and await data (ingestion pipeline must run first):

| Table | Purpose |
|-------|---------|
| `content_embedding` | One embedding per content item (OpenAI `text-embedding-3-small`, 1536 dimensions) |
| `content_chunk` | Chunked text + embeddings for RAG retrieval |

The `pgvector` extension is enabled. IVFFlat indexes are deferred until tables have sufficient data.

#### 1.10 Marketing / Public Site ✅

| Page | Status | Notes |
|------|--------|-------|
| Homepage (`/`) | Production | Full marketing landing with hero, problem, practice, system, Dr. Paul, pricing, CTA sections |
| Join (`/join`) | Production | Stripe Checkout integration |
| Subscribe (`/subscribe`) | Production | Alternate entry point |
| Login (`/login`) | Production | Redesigned in Sprint 7 |
| Privacy / Terms | Production | Static legal pages |

---

## 1.11 Membership Tiers & Pricing (Canonical Reference)

> **This is the authoritative pricing and tier definition for all product, engineering, and design decisions.**
> Last updated: April 2026

### Level 1 — Membership ✅ Live
The foundation tier. All members begin here. No live interaction at this tier.

| | |
|---|---|
| **Includes** | Daily audio · Weekly reflections and practices · Monthly theme videos · Content library · Private podcast feed (Castos — planned) |
| **Monthly price** | $37/month |
| **Annual price** | $370/year (2 months free — 10 × monthly) |
| **Status** | Live in production |

### Level 2 — Membership + Events + Q&A ⏳ Planned
Introduces live interaction and the ability to ask questions. Q&A is structured and coach-moderated — not a general community forum.

| | |
|---|---|
| **Includes** | Everything in L1 · Q&A section access · Quarterly two-day live virtual events · Event replays · Annual Positives event (format TBD) |
| **Monthly price** | $97–$127/month (specific launch price TBD) |
| **Annual price** | 2 months free (10 × monthly) |
| **Status** | Planned — Phase 2 |

### Level 3 — Coaching Circle ✅ Live (coaching_call type)
Consistent live coaching and accountability. Coaches are certified by Dr. Paul in the Positives methodology — not licensed therapists.

| | |
|---|---|
| **Includes** | Everything in L1 & L2 · Weekly live group coaching · Coaching replays · Implementation support from certified coaches |
| **Monthly price** | $297–$397/month (specific launch price TBD) |
| **Annual price** | 2 months free (10 × monthly) |
| **Format TBD** | Cohort groups or one large weekly session |
| **Status** | Live (coaching_call content type active) |

### Level 4 — Executive Coaching (Price not publicly listed)
Highest-touch experience. Price is never shown publicly. Interested members book a Breakthrough Session to determine fit.

| | |
|---|---|
| **Includes** | Everything in L1–L3 · Bi-weekly 1:1 coaching calls · Personalized support |
| **Price** | $4,500 minimum / 90 days |
| **Public pricing** | ❌ Never shown — CTA is always "Book a Breakthrough Session" |
| **Status** | Planned — Phase 5 |

### Annual Pricing Rule
All tiers: **annual = 2 months free = 10 × monthly rate, billed once per year.** No exceptions.

---

## 2. Development Phases Roadmap


### Phase 1 — ✅ Core Product + Coaching + Tier Gating (Shipped)

**Status:** Complete. The items described here have been implemented.

#### What Shipped in This Phase

| Capability | Status | Notes |
|-----------|--------|-------|
| Tier-gated content access (`tier_min` column + query filter) | ✅ | All content queries enforce tier |
| `coaching_call` content type | ✅ | Uses existing `content` table |
| `/coaching` route (Level 3+) | ✅ | Server-side `requireTierAccess('level_3')` guard |
| Coaching card on Today (Level 3+) | ✅ | Upcoming call / join / replay states |
| Admin coaching management | ✅ | `coaching_call` type in content create/edit form |
| Tier-aware navigation | ✅ | Coaching link only visible to Level 3+ |
| Library detail page (`/library/[id]`) | ✅ | Full content detail with media + body + notes |
| Markdown body rendering | ✅ | All `body` fields render as rich markdown |
| Tiptap rich-text body editor (admin) | ✅ | WYSIWYG in content create/edit |
| Sign-out / logout | ✅ | Available from Account page and nav |
| Seed content for dev/QA | ✅ | Realistic daily/weekly/monthly/coaching records in place |

**Outcome:** Platform supports all 4 tiers with proper gating. Coaching calls are live for Level 3+. Content body renders as rich text. Admin can manage all content types end-to-end. Dev environment has realistic test data.

---

### Phase 1-Current — Admin Operations (Active Near-Term Work)

**Timeline:** Next 2–4 weeks
**Goal:** Complete the admin toolset so the team can operate the platform day-to-day without engineering support. The most important near-term work is **member management** and **admin operations** — not coaching or tier gating, which are already shipped.

#### 1-Current A. Admin Member Management (Highest Priority)

The team needs operational visibility into member status, subscription tier, and engagement to support members and make informed decisions.

| Feature | Description | Priority |
|---------|-------------|----------|
| **Member list view** | `/admin/members` — paginated list with search by email, tier filter, subscription status, streak, last active. | Critical |
| **Member detail view** | `/admin/members/[id]` — full profile: subscription status, tier, streak, last activity, notes count, activity timeline. | Critical |
| **Member status at a glance** | Active / Past Due / Canceled indicators. Current tier badge. | Critical |
| **Activity timeline** | Chronological list of `activity_event` records per member for support visibility. | High |
| **Notes count** | Total journal entries per member, visible in detail view. | High |

**Implementation approach:** Read-only operational view. No manual billing mutations — all billing changes go through Stripe Dashboard or Customer Portal. This is a support and visibility tool, not a CRM.

#### 1-Current B. Admin Content Operations

| Feature | Description | Priority |
|---------|-------------|----------|
| **Admin content calendar** | 4-week calendar view of scheduled daily/weekly/monthly content. Missing-day cells highlighted. Click to create. | High |
| **Gap detection** | Visual alert when a future day has no published `daily_audio`. | High |
| **Content preview** | "Preview as member" renders the content item in member-facing layout before publishing. | Medium |
| **Admin dashboard home** | Landing page with key metrics: active members, content published this week, engagement rates. | Medium |
| **Publish/unpublish toggle** | One-click status toggle in content list (currently requires full edit form). | Medium |

#### 1-Current C. Product Experience

| Feature | Description | Priority |
|---------|-------------|----------|
| **Streak milestone recognition** | Inline celebration on Today page at 7, 30, 90, 365 days. Warm, not gamified. | Medium |
| **Streak grace period** | 1-day grace window before streak resets. Prevents guilt over one missed day. | Medium |
| **Private podcast feed (Castos)** | Generate per-member private RSS feed URL. Display in Account page. | Medium |

**Outcome:** Admin team can look up any member's status, see their engagement history, manage the content calendar, and identify scheduling gaps — all without engineering involvement.

---

### Phase 1.5 — Member Onboarding

**Timeline:** 1–2 weeks after Phase 1
**Goal:** First-login and first-week experience that activates new members into the daily habit.

#### In-Product Onboarding (First Login)

| Step | Screen | Action |
|------|--------|--------|
| 1 | "Welcome to Positives" | Full-screen welcome card with Dr. Paul's message. |
| 2 | "Start your first practice" | Auto-scroll to Daily card with pulsing play indicator. |
| 3 | "Write your first reflection" | Open NoteSheet with gentle prompt after first listen. |

**Implementation:** `member.onboarding_completed_at` column (nullable TIMESTAMPTZ). If NULL on Today page load → render onboarding overlay. Set timestamp on completion.

#### First-Week Lifecycle (ActiveCampaign)

| Day | Email | Content |
|-----|-------|---------|
| Day 0 | Welcome | Getting started, how the practice works |
| Day 2 | Weekly principle intro | Explains how weekly content deepens the daily practice |
| Day 5 | Journal prompt | Encourages first reflection |
| Day 7 | Streak milestone | Celebrates 7-day streak (if achieved) |

**Outcome:** New members are guided into the daily habit within their first week. Activation rate measurably improves.

---

### Phase 2 — Community Features

**Timeline:** 2–3 weeks after Phase 1.5
**Goal:** Deliver the Level 2 (Positives Plus) tier value: live events, replays, and Q&A.

| Feature | Description |
|---------|-------------|
| **Events system** | `/events` route gated to Level 2+. Event records in content table with `type = 'event'`. Upcoming events show Zoom link; past events show Vimeo replay. |
| **Q&A system** | `/qa` route gated to Level 2+. `qa_thread` and `qa_reply` tables. Member submits question → admin review queue → coach/Dr. Paul responds → featured Q&A list. |
| **Upgrade prompt UX** | Guided upgrade component — shows value, never shows restriction. "This is included in Positives Plus" framing. |
| **Admin event management** | Create/edit events with Vimeo ID, Zoom link, date, status. |
| **Admin Q&A moderation** | Question review queue, answer composition, feature toggle. |

**Schema additions:**
- Add `event` to `content_type` enum
- Create `qa_thread` and `qa_reply` tables

**Outcome:** Positives Plus tier has differentiated value. Upgrade prompts create natural expansion revenue path.

---

### Phase 3 — Content Ingestion Automation

**Timeline:** 3–4 weeks after Phase 2
**Goal:** Automate the daily audio pipeline from Dr. Paul's upload to member delivery.

| Stage | Automation Level | Details |
|-------|-----------------|---------|
| Upload | Manual | Dr. Paul uploads to Google Drive `/Positives/Daily Audio` |
| Detection | Automated | Vercel Cron polls Drive every 15–30 min for new files |
| Storage | Automated | File copied to S3 bucket (`positives-audio/daily/YYYY/MM/DD/`) |
| Transcription | Automated | OpenAI Whisper transcription of audio file |
| Enrichment | Automated | AI generates suggested title, description, excerpt, tags |
| Draft creation | Automated | Content record created in Supabase with `status = 'ready_for_review'` |
| Admin notification | Automated | Email/Slack notification to admin |
| Review | Manual (~2 min) | Admin confirms/edits title, sets publish_date, clicks Publish |
| Podcast publishing | Automated | Castos episode created via API on publish |

**New tables:** `ingestion_job` — tracks each file through the pipeline (status, timestamps, error log).

**Admin tooling:** `/admin/ingestion` queue view with quick-approve action.

**Outcome:** Dr. Paul's daily workflow is: upload audio → done. Admin's daily workflow is: review AI suggestions → publish. Members receive content in both web player and podcast app.

---

### Phase 4 — AI Layer & Semantic Search

**Timeline:** 2–3 weeks after Phase 3
**Goal:** Enable semantic search, content recommendations, and lay the foundation for an AI assistant.

| Feature | Description | Depends On |
|---------|-------------|-----------|
| **Transcript embedding generation** | Backfill job processes all published content transcripts → generates embeddings → populates `content_embedding` and `content_chunk` tables | Phase 3 transcripts |
| **Semantic search** | Replace/augment current FTS with vector similarity search. Members search by meaning, not just keywords. | Embeddings |
| **Content recommendations** | "Related practices" section on Library items. Based on embedding similarity. | Embeddings |
| **AI assistant (RAG)** | Conversational interface: "What did Dr. Paul teach about forgiveness?" → retrieves relevant chunks → generates grounded answer | Embeddings + chunks |
| **Auto-tagging** | AI generates tags on content creation/ingestion. Improves library filtering. | Phase 3 pipeline |

**Index creation:** IVFFlat index on `content_chunk.embedding` created after initial backfill when table has >1000 rows.

**Outcome:** Members can find any practice, principle, or theme through natural language. The content library becomes exponentially more useful as the archive grows.

---

### Phase 5 — Growth Systems

**Timeline:** Ongoing after Phase 4
**Goal:** Revenue growth, retention optimization, and advanced tier delivery.

| Feature | Description |
|---------|-------------|
| **Executive Coaching (Level 4)** | Bi-weekly 1:1 sessions. Scheduling integration (Calendly or similar). Personalized coaching notes visible to member. |
| **Referral system** | Member referral codes tracked in Supabase. Reward discounts via Stripe coupons. Referral dashboard in Account. |
| **Annual billing** | Stripe Price for annual subscription. Toggle on Join page. Savings display. |
| **Churn prediction** | Activity event analysis: members with declining engagement flagged for re-activation email. |
| **Admin analytics dashboard** | Engagement trends, content performance, retention cohorts, revenue metrics. |
| **Mobile app wrapper** | PWA or Capacitor wrapper for iOS/Android store presence. Push notifications. |

**Outcome:** Positives scales from a single-tier daily practice into a multi-tier personal growth ecosystem with coaching, community, and AI guidance.

---

#### L4 Post-Expiry Automation Sequence *(Marketing Automation — pending platform selection)*

When a Level 4 coaching subscription ends (Stripe fires `customer.subscription.deleted` with `metadata.assigned_tier = "level_4"`), the following sequence should be triggered via the chosen marketing automation platform (ActiveCampaign or equivalent):

| Day | Action |
|-----|--------|
| **−14** | Sales team notified to schedule a renewal call before the package expires |
| **0** | Subscription ends → member tagged `l4_completed` in marketing platform |
| **1** | Email 1: "Your coaching package is ending — ready for another round?" + L4 renewal offer |
| **4** | Email 2: Follow-up with social proof / transformation story |
| **7** | Email 3: Final L4 renewal offer with deadline |
| **8** | If no renewal → email 4: Downsell offer to Level 3 (full access at $297/mo) |
| **14** | If still no action → automated downgrade to L3 via webhook callback to `/api/webhooks/automation` |

**Technical requirements (when building):**
- Stripe webhook handler (`customer.subscription.deleted`) detects L4 expiry and fires a tag/event to marketing automation platform
- Marketing automation platform calls back to a Positives API endpoint to execute the L3 downgrade
- Admin is notified of the downgrade so they can do a personal outreach
- L4 renewal is always manual (admin uses the Assign L4 tool) — never automated
- The priority order is always: **Renew L4 → Downsell to L3** — never drop below L3 without a conversation


---

## 3. Admin System Completion Plan

The admin system must be fully capable before scaling the product or onboarding a content operations team.

### Current State (Built)

| Capability | Status |
|-----------|--------|
| Content list view (all types) | ✅ |
| Create new content (all fields including resource links, media embeds) | ✅ |
| Edit existing content | ✅ |
| Tiptap rich-text body editor | ✅ |
| Resource Links Editor (repeatable label + URL) | ✅ |
| Media URL auto-detect (YouTube/Vimeo from pasted URL) | ✅ |
| Coaching call management (`coaching_call` type + `tier_min`) | ✅ |
| Ingestion queue shell | ✅ (UI only — live pipeline is Phase 3) |
| Admin layout with `requireAdmin()` guard | ✅ |

### Must Build Next (Before Phase 2)

**The most important near-term admin work is member management, then content calendar/gap detection.**

| Capability | Description | Priority |
|-----------|-------------|----------|
| **Member list view** | `/admin/members` — paginated list of all members with search, filter by tier, filter by status. Shows email, name, tier, streak, last active. | **Critical** |
| **Member detail view** | `/admin/members/[id]` — full member profile: subscription status, tier, streak, last activity, activity timeline, notes count. Read-only. | **Critical** |
| **Content calendar view** | 4-week grid showing scheduled daily/weekly/monthly. Missing-day cells highlighted. Click to create. | High |
| **Gap detection** | Visual alert in content list when a future day has no published `daily_audio`. | High |
| **Content preview** | "Preview as member" button renders the content item in a member-facing layout without publishing. | High |
| **Admin dashboard home** | Landing page with key metrics: members active today, content items published this week, streak distribution, latest engagement events. | Medium |
| **Publish/unpublish toggle** | One-click status toggle in content list (currently requires full edit form). | Medium |
| **Duplicate detection** | Warn admin when creating a `daily_audio` with a `publish_date` that already has a published record. | Medium |
| **Override Today** | Admin checkbox to force a content item onto Today regardless of publish_date. Auto-expires at midnight Eastern. | Medium |

### Admin Capability Rollout Timeline

```
Phase 1-Current (active):
  ├── ✅ Coaching call management (type + tier_min)  [DONE]
  ├── ✅ Tiptap body editor                          [DONE]
  ├── Member list + detail views                    [NEXT]
  ├── Content calendar view                         [NEXT]
  ├── Gap detection                                 [NEXT]
  ├── Content preview
  ├── Admin dashboard home
  ├── Publish/unpublish toggle
  └── Override Today

Phase 1.5:
  └── Onboarding overlay management

Phase 2:
  ├── Event management (create/edit events)
  ├── Q&A moderation queue
  └── Tier-gated content management

Phase 3:
  ├── Ingestion queue (live pipeline integration)   [NOT YET BUILT]
  ├── Quick-approve flow
  └── Ingestion job monitoring
```

---

## 4. Customer Support System

### Support Philosophy

Positives is a premium wellness product. Support interactions must feel warm, personal, and emotionally safe — never transactional or bureaucratic. The support system should scale gracefully from launch (low volume, primarily founder-handled) to growth (delegated to a small support team with AI augmentation).

### Recommended Stack

| Layer | Tool | When to Implement |
|-------|------|-------------------|
| **Primary support inbox** | Help Scout | Phase 1 (immediately) |
| **Knowledge base** | Help Scout Docs (built-in) | Phase 1 |
| **In-app help link** | Link to Help Scout KB from Account page | Phase 1 |
| **AI assistant for support** | Help Scout AI / custom RAG | Phase 4 (when AI layer exists) |

### Why Help Scout

- Clean, non-corporate UI that matches Positives' brand sensibility
- Built-in knowledge base (Docs) — no separate tool needed
- Beacon widget for in-app help (embeddable)
- Workflows for auto-tagging, assignment, SLA tracking
- API for future integration with Supabase member data
- Pricing appropriate for small team

### Support Channels

| Channel | Implementation | Timeline |
|---------|---------------|----------|
| `support@positives.com` | Help Scout mailbox | Phase 1 |
| In-app help link | "Need help?" link in Account page → KB or contact form | Phase 1 |
| Knowledge base | Help Scout Docs site with articles for common questions | Phase 1 |
| Beacon widget | Embedded Help Scout widget in member area (contextual help) | Phase 2 |
| AI-assisted replies | RAG-powered suggested replies for support agents | Phase 4 |

### Knowledge Base Articles (Initial Set)

- How to listen to your daily practice
- How to access your private podcast feed
- How to update your password
- How to manage your subscription / cancel
- How to write a note or journal entry
- How to search the content library
- What's included in each membership tier
- How to upgrade your membership
- FAQ: "I can't hear my audio" / "I missed a day"

---

## 5. Email Infrastructure

### Architecture: One Automation Brain, One Delivery Layer

Email in Positives is centered on ActiveCampaign automations with Postmark as the delivery layer.
Supabase Auth sends security emails via SMTP (Postmark).

#### 5.1 Lifecycle + Transactional (ActiveCampaign + Postmark)

**Recommended system:** ActiveCampaign automations sending through Postmark

**Purpose:** Time-sensitive, triggered, one-to-one messages plus lifecycle sequences.

| Email Type | Trigger | Owner |
|-----------|---------|-------|
| Welcome email | Stripe `checkout.session.completed` → AC tag/field | ActiveCampaign |
| Payment receipt | Stripe `invoice.payment_succeeded` → AC tag/field | ActiveCampaign |
| Payment failed | Stripe `invoice.payment_failed` → AC tag/field | ActiveCampaign |
| Trial ending | Stripe `customer.subscription.trial_will_end` → AC tag/field | ActiveCampaign |
| Onboarding drip | AC automation (days 3/7/14) | ActiveCampaign |
| Win-back / recovery | AC automation | ActiveCampaign |

**Integration pattern:**
```
Stripe webhook → app → ActiveCampaign tags/fields → AC automation → Postmark → member inbox
```

#### 5.2 Auth / Security (Supabase SMTP)

**Recommended system:** Supabase Auth SMTP (Postmark)

**Purpose:** Security-critical auth emails.

| Email Type | Trigger | Owner |
|-----------|---------|-------|
| Password reset | Member requests password change | Supabase |
| Magic link sign-in | Member requests login | Supabase |
| Email change confirmation | Member updates email | Supabase |

### Email Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     EMAIL INFRASTRUCTURE                         │
├──────────────────────────────────────────────────────────────────┤
│   Stripe webhooks → app → ActiveCampaign tags/fields             │
│   ActiveCampaign automations → Postmark → member inbox           │
│                                                                  │
│   Supabase Auth (SMTP) → Postmark → member inbox                 │
└──────────────────────────────────────────────────────────────────┘
```

### Implementation Timeline

| System | Phase | Scope |
|--------|-------|-------|
| ActiveCampaign: transactional + lifecycle | Phase 1 | Wire tags/fields to Stripe webhooks |
| ActiveCampaign: onboarding sequence | Phase 1 | 7-email welcome series |
| ActiveCampaign: engagement reminders | Phase 2 | Activity-gap automations |
| ActiveCampaign: upgrade nurture | Phase 3 | Level 1 → Plus journey |
| Supabase SMTP (Postmark) | Phase 1 | Auth email delivery |

---

## 6. Content Automation / Ingestion Pipeline

### Pipeline Overview

The ingestion pipeline transforms Dr. Paul's audio uploads into fully enriched, publishable content records with minimal admin friction.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CONTENT INGESTION PIPELINE                       │
│                                                                     │
│   Dr. Paul uploads audio                                           │
│           ↓                                                         │
│   Google Drive: /Positives/Daily Audio/                             │
│           ↓                                                         │
│   [DETECT] Vercel Cron polls Drive API (every 15–30 min)           │
│           ↓                                                         │
│   [COPY] Download → upload to S3                                    │
│         s3://positives-audio/daily/YYYY/MM/DD/<uuid>.mp3           │
│           ↓                                                         │
│   [TRANSCRIBE] OpenAI Whisper API → full transcript                │
│           ↓                                                         │
│   [ENRICH] AI generates:                                           │
│         • Suggested title                                           │
│         • Suggested description                                     │
│         • Suggested excerpt                                         │
│         • Suggested tags                                            │
│         • Duration extraction                                       │
│           ↓                                                         │
│   [DRAFT] Supabase content record created                          │
│         status = 'ready_for_review'                                │
│         type = 'daily_audio'                                       │
│         source = 'gdrive'                                          │
│         source_ref = <Drive file ID>                                │
│           ↓                                                         │
│   [NOTIFY] Admin receives notification (email or Slack)            │
│           ↓                                                         │
│   [REVIEW] Admin opens /admin/ingestion (~2 min)                   │
│         • Confirm or edit AI-suggested title                       │
│         • Confirm or edit description/excerpt                      │
│         • Set publish_date                                         │
│         • Click "Publish"                                          │
│           ↓                                                         │
│   [PUBLISH] status = 'published'                                   │
│         • Castos episode created via API                           │
│         • Content live on Today page at publish_date               │
│         • Members receive in podcast app                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Why Semi-Automated (Not Fully Automated)

For a practice platform where tone, accuracy, and emotional safety matter, fully automated publishing without review introduces risk. The v1 pipeline does the heavy lifting (transcription, AI suggestions, record creation) while the admin provides a 2-minute quality check.

Fully automated publishing ("Dr. Paul uploads → members see it with no review") may be enabled in a future phase once the AI enrichment proves consistently reliable.

### Pipeline Support for Search and AI

The ingestion pipeline is the primary data source for the AI features:

| Pipeline Output | AI Feature |
|----------------|-----------|
| Transcription text | Full-text search (immediate, via `search_vector` tsvector) |
| Transcription text | Embedding generation (Phase 4, via `content_embedding` and `content_chunk`) |
| AI-generated tags | Library filtering and recommendation clustering |
| AI-generated description | Semantic search enhancement |

Without the pipeline, transcriptions must be entered manually — impractical at scale. The pipeline is a prerequisite for the AI layer.

### New Schema Required

```sql
-- ingestion_job table (Phase 3 migration)
CREATE TABLE IF NOT EXISTS ingestion_job (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drive_file_id   TEXT NOT NULL,
  drive_file_name TEXT,
  status          TEXT NOT NULL DEFAULT 'detected',  -- detected, downloading, transcribing, enriching, draft_created, error
  s3_key          TEXT,
  content_id      UUID REFERENCES content(id) ON DELETE SET NULL,
  error_message   TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  metadata        JSONB
);
```

---

## 7. AI Layer

### Foundation Already in Place

The vector-ready schema created in migration 0010 provides the structural foundation:

| Table | Schema | Status |
|-------|--------|--------|
| `content_embedding` | `content_id` (PK, FK) + `embedding` (vector 1536) + `model` + `embedded_at` | ✅ Created, empty |
| `content_chunk` | `id` + `content_id` + `chunk_index` + `chunk_text` + `token_count` + `embedding` (vector 1536) | ✅ Created, empty |
| pgvector extension | Enabled | ✅ |

### AI Capability Roadmap

#### 7.1 Semantic Search

**What:** Members search the library using natural language. The system returns results ranked by meaning similarity, not just keyword match.

**How:**
1. Member enters query
2. Query text → OpenAI embedding API → query vector
3. Query vector compared against `content_embedding` using cosine similarity (`<=>` operator in pgvector)
4. Results ranked by similarity score, filtered by `status = 'published'`
5. Optionally blended with existing FTS results for hybrid search

**Prerequisite:** Content embeddings must be populated. This requires transcriptions, which require the ingestion pipeline (Phase 3).

#### 7.2 Content Recommendations

**What:** "Related practices" shown alongside Library items. "Members who listened to this also engaged with…"

**How:**
1. Compute nearest-neighbor embeddings for each content item
2. Cache top-5 similar items per content record
3. Display as "Related" section on Library detail view

#### 7.3 AI Assistant (RAG)

**What:** A conversational interface where members ask questions about Dr. Paul's teachings. "What has Dr. Paul said about handling fear?"

**Architecture:**

```
Member question
    ↓
Generate query embedding (OpenAI text-embedding-3-small)
    ↓
Vector similarity search against content_chunk
    (top-k chunks, k=10, cosine similarity)
    ↓
Retrieve chunk text + source content metadata
    ↓
Construct prompt:
    System: "You are a helpful assistant for Positives members.
             Answer based only on Dr. Paul's teachings below.
             Cite specific practices when possible."
    Context: [retrieved chunks with source dates]
    User: [member's question]
    ↓
LLM generates grounded answer (OpenAI GPT-4o)
    ↓
Return answer with source citations (links to Library items)
```

**Guardrails:**
- Answers are grounded exclusively in Dr. Paul's content — the LLM does not improvise
- If no relevant chunks are found, the assistant says so honestly
- Citations link to Library items so members can listen to the original teaching
- The assistant's tone matches Positives' brand voice: calm, supportive, clear

#### 7.4 Auto-Tagging

**What:** AI generates tags for each content item during ingestion. Improves Library filtering.

**How:** Part of the enrichment step in the ingestion pipeline. AI analyzes the transcript and generates a list of topic tags (e.g., "forgiveness", "relationships", "gratitude", "fear").

### Embedding Generation Strategy

Embeddings will be generated by a backfill job after the ingestion pipeline has produced transcripts:

1. **Initial backfill:** Process all existing published content with transcriptions
2. **Ongoing:** Embed new content automatically on publish
3. **Chunking strategy:** Split transcripts into ~500-token chunks with 50-token overlap
4. **IVFFlat index:** Created after initial backfill produces >1000 chunks

---

## 8. Community Features

### 8.1 Events System

**Access:** Level 2+ (Positives Plus, Circle, Executive)

**Model:** Events are content records with `type = 'event'` and event-specific metadata.

| Event State | Member Experience |
|------------|-------------------|
| Upcoming (future date) | Event card with date, time, description, and RSVP button. "Join live" Zoom link visible 30 min before start. |
| Live (during window) | Zoom link prominently displayed. "Happening now" badge. |
| Past (completed) | Vimeo replay player. Full replay available within 48h. |

**IA:**
```
/events
  → Upcoming Events       (next scheduled event with RSVP)
  → Past Events           (replay archive, paginated by date)
```

**Schema additions:**
- Add `event` to `content_type` enum
- Event-specific fields stored in existing columns:
  - `vimeo_video_id` → replay video
  - `body` → event description
  - `resource_links` → [{label: "Join Zoom", url: "..."}, ...]
  - `publish_date` → event date
  - `metadata` (new JSONB column or reuse `admin_notes`) → event time, Zoom link

**RSVP model:** Simple — `activity_event` with `event_type = 'event_rsvp'` links member to content. No complex registration system in v1.

### 8.2 Q&A System

**Access:** Level 2+

**Model:** Thread-based. A member submits a question; it enters a review queue; a coach or Dr. Paul responds; the Q&A becomes featured.

**Tables:**

```sql
CREATE TABLE qa_thread (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id     UUID NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending, reviewed, featured, archived
  featured_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE qa_reply (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id   UUID NOT NULL REFERENCES qa_thread(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  is_coach    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**IA:**
```
/qa
  → Featured Q&A        (Dr. Paul's recent answers, paginated)
  → All Questions        (all threads, sorted by date)
  → Ask a Question       (submit form → goes to review queue)
```

**Moderation:** Admin reviews pending questions at `/admin/qa`. Can approve, feature, or archive. Featured questions appear at top of the Q&A list.

**Tier-based posting:**
- Level 2+: Can submit questions and view all Q&A
- Level 1: Sees upgrade prompt if navigating to `/qa`
- No anonymous posting

---

## 9. Operational Systems

### 9.1 Notifications System

| Type | Implementation | Timeline |
|------|---------------|----------|
| Email notifications | ActiveCampaign automations (delivery via Postmark) | Phase 1–2 |
| In-app notifications | Notification bell in MemberTopNav with unread count | Phase 3 |
| Push notifications | PWA service worker or Capacitor plugin | Phase 5 |
| SMS notifications | Twilio (event reminders, payment failures) | Phase 3 |

**Notification types:**
- New weekly principle available
- Monthly theme released
- Event starting soon
- Q&A response received
- Streak milestone reached
- Payment action needed

### 9.2 Analytics & Dashboards

**Admin analytics (Phase 1–2):**
- Active members today / this week / this month
- Daily listen completion rate
- Content engagement by type (daily/weekly/monthly)
- Streak distribution histogram
- New member activations over time
- Churn indicators (members with declining activity)

**Implementation:** Server-side aggregate queries against `activity_event` and `progress` tables. Rendered in `/admin` dashboard. No external analytics tool required initially.

**External analytics (Phase 3+):**
- Vercel Analytics for page performance
- PostHog or Mixpanel for product analytics (if admin queries prove insufficient)

### 9.3 Moderation Tools

| Need | Implementation | Timeline |
|------|---------------|----------|
| Q&A question review | Admin queue at `/admin/qa` | Phase 2 |
| Community post moderation | Admin flag/remove at `/admin/community` | Phase 2 |
| Member account management | Admin member detail view with status controls | Phase 1 |
| Content reporting | "Report" link on community content → admin queue | Phase 2 |

### 9.4 Backups & Data Safety

| Layer | Strategy | Responsibility |
|-------|----------|----------------|
| Database | Supabase automated daily backups (included in Pro plan). Point-in-time recovery. | Supabase |
| Media (S3) | S3 versioning enabled. Cross-region replication for critical audio. | AWS |
| Code | Git (GitHub) with branch protection on `main`. | Team |
| Stripe data | Stripe retains all billing data. Webhook events stored in `activity_event`. | Stripe |

### 9.5 Compliance

| Requirement | Implementation | Timeline |
|-------------|---------------|----------|
| **Privacy policy** | ✅ Deployed at `/privacy` | Done |
| **Terms of service** | ✅ Deployed at `/terms` | Done |
| **GDPR data export** | Member data export endpoint: JSON dump of member row, progress, journal, activity events | Phase 2 |
| **GDPR right to erasure** | Account deletion flow: cascade delete member row (all FK cascades handle related data) | Phase 2 |
| **Cookie consent** | Not needed for auth-essential cookies. Required if adding analytics tracking cookies. | Phase 3 |
| **Unsubscribe mechanism** | ActiveCampaign handles marketing email unsubscribe. Transactional emails are non-unsubscribable. | Phase 1 |
| **Data retention policy** | Define how long activity_event and progress data is retained. Recommend: indefinite for members, purge 90d after account deletion. | Phase 2 |

### 9.6 Billing Workflows

| Workflow | Current State | Target State |
|----------|--------------|-------------|
| New subscription | ✅ Stripe Checkout → webhook → member activation | Done |
| Payment failure | ✅ Webhook marks member `past_due` | ActiveCampaign payment-failed automation |
| Cancellation | ✅ Webhook marks member `canceled` | Add exit survey + re-activation campaign |
| Upgrade | Not implemented | Stripe Customer Portal link with upgrade options |
| Downgrade | Not implemented | Stripe Customer Portal |
| Refund | Manual via Stripe Dashboard | Stripe Dashboard (no in-app flow needed) |
| Annual billing | Not implemented | Add annual Stripe Price + toggle on Join page |

---

## 10. Product Vision

### The Long-Term Arc

Positives begins as a daily audio practice platform. Over time, it evolves into a **daily mindset operating system** — a single destination where members build emotional resilience through guided practice, learning, community, coaching, and AI-powered guidance.

### Evolution Timeline

```
SHIPPED
├── ✅ Daily audio practice
├── ✅ Weekly principles
├── ✅ Monthly themes
├── ✅ Content library (browse + search + detail pages)
├── ✅ Notes / journal
├── ✅ Full-text search
├── ✅ Engagement tracking (streaks, activity events)
├── ✅ Tier-gated content access (tier_min)
├── ✅ Coaching system (Level 3+)
├── ✅ Library detail page (/library/[id])
├── ✅ Markdown body rendering
├── ✅ Tiptap admin body editor
├── ✅ Sign-out / logout
└── ✅ Seed content for dev/QA

PHASE 1-CURRENT (Active — Next 2–4 weeks)
├── ✚ Admin member list + detail views  ← HIGHEST PRIORITY
├── ✚ Admin content calendar
├── ✚ Gap detection
├── ✚ Content preview
├── ✚ Admin dashboard home
├── ✚ Streak milestone recognition
└── ✚ Today page secondary cards (coaching, milestone, journal prompt)

PHASE 1.5 (After admin ops are complete)
├── ✚ In-product onboarding (first login)
├── ✚ First-week email lifecycle (ActiveCampaign)
└── ✚ Streak grace period

PHASE 2 (Month 2–3)
├── ✚ Live events + replays (Level 2+)
├── ✚ Q&A with coaches (Level 2+)
├── ✚ Upgrade prompt UX
├── ✚ Support infrastructure (Help Scout)
└── ✚ Email lifecycle automation

PHASE 3 (Month 3–4) — Content Ingestion Engine
├── ✚ Google Drive → S3 audio ingestion pipeline
├── ✚ OpenAI Whisper transcription
├── ✚ AI metadata enrichment (title, description, tags)
├── ✚ Admin ingestion queue (live, not UI shell)
├── ✚ Castos publishing automation
├── ✚ Private podcast delivery per member
└── ✚ Notification system

PHASE 4 (Month 4–5)
├── ✚ AI-powered semantic search
├── ✚ Content recommendations
├── ✚ AI assistant (RAG)
└── ✚ Auto-tagging

PHASE 5+ (Month 6+)
├── ✚ 1:1 executive coaching
├── ✚ Referral program
├── ✚ Mobile app (PWA/Capacitor)
├── ✚ Annual billing
├── ✚ Churn prediction + intervention
└── ✚ Community content sharing
```

### Design Principles That Never Change

These hold true regardless of phase:

1. **Daily practice is always the center.** Every feature supports the habit of showing up daily. Nothing should compete with or distract from the daily audio.

2. **Members never feel behind.** No completion tracking, no curriculum progress bars, no "you missed 3 days" guilt messaging. The practice is cyclical — there is no falling behind.

3. **Calm over noise.** The product should feel like a meditation app, not a SaaS dashboard. Every screen should feel spacious, intentional, and emotionally safe.

4. **Simple by default, deep by choice.** The Today page is simple: listen, reflect, move on. Depth (library, journal, Q&A, coaching) is available but never imposed.

5. **Server-side truth.** Access control, subscription state, and content gating are always enforced server-side. Never trust the client for authorization.

### Success Metrics

| Metric | Target | Why It Matters |
|--------|--------|---------------|
| Daily listen rate | >60% of active members listen each day | The daily habit is the product's core value |
| 7-day streak rate | >40% of active members maintain a 7+ day streak | Habit formation indicator |
| Monthly retention | >85% month-over-month | Subscription health |
| Weekly principle engagement | >50% of listeners also view the weekly | Content depth engagement |
| Journal adoption | >25% of members write at least 1 note per month | Reflection layer value |
| NPS | >60 | Premium experience satisfaction |
| Upgrade rate (L1→L2) | >10% within 90 days | Tier expansion health |

---

## Appendix A: Sprint History

| Sprint | Title | Status |
|--------|-------|--------|
| Sprint 1 | Today Comes Alive · Daily/Weekly/Monthly live + progress tracking | ✅ Complete |
| Sprint 2 | Library + Journal · Browse archive + personal notes | ✅ Complete |
| Sprint 3 | Admin Content CRUD · Full content management | ✅ Complete |
| Sprint 4 | Account + Billing · Stripe portal, profile, timezone | ✅ Complete |
| Sprint 5 | Rich Content + Search + Vector Foundation · Body, reflection prompts, FTS, embeddings schema | ✅ Complete |
| Sprint 6 | Inline Media + Resource Rendering + Search Polish | ✅ Complete |
| Sprint 7 | Member UI Cleanup · Login redesign, MemberHeader, wider layout, shared components | ✅ Complete |
| Sprint 8 | Content Polish + Engagement Tracking · Resource links editor, weekly/monthly viewed tracking, journal month-grouping, TypeBadge | ✅ Complete |
| Sprint 9 | Member UI Visual System · Premium top nav, hero section, typed cards, responsive layout system | ✅ Complete |
| Sprint 10 | Platform Foundation + Live Activation · Vercel production env, Stripe live webhooks, auth + subscription access verified end-to-end | ✅ Complete |
| Sprint 11 | Content Experience Stabilisation · Markdown rendering, library detail page, Tiptap admin body editor, Reflect pill CTA, logout/sign-out, mobile layout fixes | ✅ Complete |
| Sprint 12 | Coaching + Tier Gating · coaching_call content type, /coaching route, tier_min column, coaching card on Today, seed content | ✅ Complete |

## Appendix B: Database Migration Index

| Migration | Description |
|-----------|------------|
| `0001_initial_schema.sql` | Core tables: member, content, progress, journal, community_post. Enums for subscription status/tier, content type, post type. |
| `0002_rls_policies.sql` | Row-level security policies for all tables |
| `0003_member_bootstrap_trigger.sql` | Auto-create member row on first auth |
| `0004_fix_updated_at_search_path.sql` | Fix `update_updated_at_column()` search path |
| `0005_add_onboarding_columns.sql` | Onboarding state columns on member |
| `0006_sprint1_today_foundation.sql` | Publishing workflow (status, publish_date, week_start, month_year), activity_event table, content indexes |
| `0007_activity_event_rls.sql` | RLS policies for activity_event table |
| `0008_journal_rls_and_index.sql` | Journal RLS policies and indexes |
| `0009_sprint5_rich_content_search_vector.sql` | Rich content fields (body, reflection_prompt, download_url, youtube_video_id, resource_links), FTS search_vector, content_embedding + content_chunk tables |
| `0010_sprint5_rls_vector_tables.sql` | RLS for vector/embedding tables |
| `0011_coaching_tier_gating.sql` | Add `coaching_call` to content_type enum; add `tier_min` column (subscription_tier, nullable) to content table; update partial indexes |

## Appendix C: Key File Index

| File | Purpose |
|------|---------|
| `app/(member)/layout.tsx` | Member area shell — auth guard, streak, nav |
| `app/(member)/today/page.tsx` | Primary member page — hero, content cards |
| `app/(member)/library/page.tsx` | Content archive with search and filters |
| `app/(member)/journal/page.tsx` | Notes archive with month grouping |
| `app/(member)/account/page.tsx` | Account settings, billing, security |
| `app/admin/content/actions.ts` | Content CRUD server actions |
| `components/member/MemberTopNav.tsx` | Unified top/bottom navigation |
| `components/today/DailyPracticeCard.tsx` | Primary daily audio card |
| `components/today/WeeklyPrincipleCard.tsx` | Weekly principle card |
| `components/today/MonthlyThemeCard.tsx` | Monthly theme card |
| `components/today/AudioPlayer.tsx` | Custom audio player with completion callback |
| `components/notes/NoteSheet.tsx` | Bottom-drawer note editor |
| `lib/dates/effective-date.ts` | Canonical Eastern timezone date resolver |
| `lib/queries/get-today-content.ts` | Daily content query |
| `lib/queries/get-weekly-content.ts` | Weekly content query |
| `lib/queries/get-monthly-content.ts` | Monthly content query |
| `lib/queries/get-library-content.ts` | Library browse + note existence queries |
| `lib/queries/search-library-content.ts` | FTS search query |
| `lib/media/resolve-audio-url.ts` | Castos → S3 fallback audio URL resolver |
| `lib/auth/require-active-member.ts` | Server-side member access guard |

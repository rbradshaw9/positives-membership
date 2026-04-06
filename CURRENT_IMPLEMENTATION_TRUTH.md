# CURRENT_IMPLEMENTATION_TRUTH.md

*Verified against codebase, TypeScript types, migration files, and git history.*\
*Last verified: 2026-04-06 (updated end-of-day)*

---

## What Is Actually Built

### Authentication & Billing

- Supabase Auth — magic link + password login
- Stripe checkout, webhooks (`checkout.session.completed`, `customer.subscription.*`), and customer portal
- `requireActiveMember()` — server guard on all member pages (checks `subscription_status = 'active'`)
- `requireAdmin()` — email allowlist guard for `/admin/*` routes
- Post-checkout onboarding token flow (`member.onboarding_token` — one-time magic link after purchase, cleared after use)
- `password_set` boolean on member — drives "secure your account" nudge banner

### Today Page (`/today`)

- Radial-gradient hero with time-aware greeting, Eastern date label, monthly theme subtitle, streak badge
- `DailyPracticeCard` — in-card audio player, 80% completion tracking, reflection prompt, NoteSheet trigger
- `WeeklyPrincipleCard` — optional audio, markdown body, reflection prompt, NoteSheet trigger
- `MonthlyThemeCard` — Mux (primary) or Vimeo video embed, expandable markdown body, resource links, NoteSheet trigger
- `MemberAudioProvider` — global audio/video coordination ("latest wins" — starting one pauses the other)
- `MonthlyAudioArchive` — inline playlist of all daily_audio records for the current month, with play/pause/scrub/±15s skip
- `WeeklyArchive` — this month's previous weeks' principle cards
- `PersistentAudioPlayer` — sticky mini-player in the layout; hidden on `/today` (in-card player takes over)
- `stripCmsPreamble()` — deduplicates title/excerpt preamble from Markdown body (prevents "Title\n\nTitle\n\nBody" display)
- Completion tracked in `progress` table (`listened_at`, `completed`); streak increment via `markListened()` server action

### Library (`/library`)

- Full-text search: weighted tsvector (title A, excerpt B, body/description C, transcription D) with GIN index
- Debounced search input
- Type filter tabs (All / Daily / Weekly / Monthly + more)
- Pagination (20 items/page)
- Tier filtering (respects `content.tier_min`)
- Note indicators (shows if member has a journal entry for that content item)
- Library item detail page (`/library/[id]`) — Mux/Vimeo/YouTube video, full body, resources

### My Practice (`/practice`)

- Stats hero — current streak, total listens, notes count
- Practice heatmap — 70-day grid, 3-state coloring (on_time / catch_up / none) driven by `activity_event`
- Continue Listening, Recently Completed, Suggested Next sections
- Practice Collection tabs
- Monthly archive route: `/practice/[monthYear]`

### Coaching (`/coaching`)

- Level 3+ gated — Level 1/2 see `CoachingUpgradePrompt`
- `UpcomingCallCard` — reads `starts_at` + `join_url` from `content` (server-side only; Zoom URL never in client bundle)
- Replay archive — past `coaching_call` content with Mux or Vimeo embed

### Community Q&A (`/community`)

- Level 2+ gated
- **Feature-flagged:** only visible when `ENABLE_COMMUNITY_PREVIEW=true` in env
- Weekly thread threading, reply threading
- Optimistic UI for likes
- Admin can pin posts, mark "admin answer" posts, and delete
- Schema: `community_post` + `community_post_like` tables

### Journal / Notes

- `NoteSheet` — slide-over on desktop (≥768px), bottom sheet on mobile
- `NewJournalEntryButton` — opens NoteSheet with `contentId=null` for freeform entries
- Notes archive on `/journal` — grouped by month, left borders color-coded by content type
- Server actions: `saveNote`, `getNoteForContent`, `getMemberNotes`

### Account (`/account`)

- Membership status card with subscription tier and status
- Password management — `password_set` nudge banner for magic-link-only members
- Timezone select and save (stored in `member.timezone`)
- Billing portal (Stripe customer portal redirect)

---

## Admin System

All admin routes are under `/admin/*` and require `requireAdmin()`.

| Page | Route | Status |
|---|---|---|
| Content list | `/admin/content` | ✅ admin-* CSS |
| Content new | `/admin/content/new` | ✅ admin-* CSS |
| Content edit | `/admin/content/[id]` | ✅ admin-* CSS |
| Months list | `/admin/months` | ✅ admin-* CSS |
| Month detail | `/admin/months/[yearMonth]` | ✅ admin-* CSS |
| Member list | `/admin/members` | ✅ admin-* CSS |
| Member detail | `/admin/members/[id]` | ✅ admin-* CSS |
| Content calendar | `/admin/content/calendar` | ✅ admin-* CSS |
| Ingestion | `/admin/ingestion` | ✅ admin-* CSS (planned pipeline placeholder) |

### Key Admin Features

- **Video upload panel** — drag-drop or file-picker, 5MB chunked upload to Mux via UpChunk, polling until ready, commit to DB
- **VideoUploadPanel component** — shows current Mux playback ID, warns if Vimeo-only, Replace/Remove flows
- **Drag-to-reorder** on daily audio grid in month detail
- **Auto-link** `monthly_practice_id` when creating/updating content with matching `month_year`
- **Content tags** — multi-select with tag badge creation
- All content fields: type, title, description, excerpt, body, reflection_prompt, resource_links, download_url, s3_audio_key, vimeo_video_id, youtube_video_id, join_url, starts_at, tier_min, status, publish_date, week_start, month_year

---

## Mux Video System (Fully Operational)

- **npm packages:** `@mux/mux-node`, `@mux/mux-player-react`, `@mux/upchunk`
- **DB columns:** `content.mux_playback_id`, `content.mux_asset_id` (exist in production; see §Schema Gaps below)
- **API routes:** `/api/admin/video/upload`, `/api/admin/video/status`, `/api/admin/video/commit`, `/api/admin/video/remove`
- **`VideoEmbed` component** — routes to MuxPlayer (priority 1), Vimeo iframe (priority 2), YouTube (priority 3)
- **Resume tracking:** `video_views` table stores `resume_at_seconds`; shown as overlay before playback begins ("You left off at 2:34")
- **Watch milestones:** wrote to `video_views` at 25/50/75/95% + on pause
- **Session counting:** `session_count` incremented when re-engaging after 10-minute gap
- **Mux Data analytics:** `viewer_user_id`, `video_id`, `video_title` sent per-view
- **Brand theming:** MuxPlayer styled with `--color-accent` (#2EC4B6 teal)
- **Playback speed control** on the persistent audio player

---

## Database Schema (Verified 2026-04-06)

### Tables (10 total)

| Table | Status |
|---|---|
| `member` | ✅ Active |
| `content` | ✅ Active |
| `journal` | ✅ Active |
| `progress` | ✅ Active |
| `activity_event` | ✅ Active |
| `community_post` | ✅ Active (feature-flagged) |
| `community_post_like` | ✅ Active (feature-flagged) |
| `video_views` | ✅ Active — watch progress, resume position, milestones |
| `content_embedding` | ⚠️ Schema only — empty, no embedding code |
| `content_chunk` | ⚠️ Schema only — empty, no embedding code |

### `member` table columns

```
id, email, name, avatar_url, stripe_customer_id,
subscription_status, subscription_tier, subscription_end_date,
practice_streak, last_practiced_at, created_at, timezone,
onboarding_token, password_set
```

> `onboarding_completed_at` does NOT exist.

### `content_type` enum

```
daily_audio | weekly_principle | monthly_theme | library | workshop | coaching_call
```

> `event` does NOT exist in this enum.

### `activity_event_type` enum (15 types)

```
session_start | daily_listened | daily_started | weekly_viewed | monthly_viewed |
note_created | note_updated | journal_opened | event_attended |
qa_submitted | qa_viewed | milestone_reached | upgrade_prompt_seen |
upgrade_clicked | coaching_attended
```

### Schema Gaps

All known schema objects are now captured in migration files. No untracked schema gaps.

---

## Migration File Inventory (14 migrations)

| File | What it does |
|---|---|
| `0001_initial_schema.sql` | Core tables: member, content, journal, progress, community_post |
| `0002_rls_policies.sql` | Row-level security |
| `0003_storage_bucket.sql` | S3/storage bucket setup |
| `0004_*` | Content enums expansion |
| `0005_add_onboarding_columns.sql` | `onboarding_token`, `password_set` on member |
| `0006_sprint1_today_foundation.sql` | content_status, content_source enums; status, publish_date, week_start, month_year, excerpt, source, source_ref, admin_notes, is_today_override on content; timezone on member |
| `0007_activity_event.sql` | `activity_event` table + `activity_event_type` enum |
| `0008_sprint3_content_fields.sql` | Additional content fields (join_url, duration_seconds, tags, etc.) |
| `0009_sprint5_rich_content_search_vector.sql` | body, reflection_prompt, download_url, youtube_video_id, resource_links, search_vector (generated tsvector), pgvector extension, content_embedding, content_chunk |
| `0010_*` | Progress and journal updates |
| `0011_tier_gating_coaching.sql` | tier_min, starts_at on content; subscription_tier enum; coaching_call in content_type |
| `0012_community_qa_schema.sql` | community_post_like table, post_type enum, is_pinned, is_admin_answer columns |
| `0013_mux_video_tracking.sql` | Mux columns on content, video_views table + RLS — ✅ applied 2026-04-06 |

---

## What Is NOT Built (Truthful)

| Feature | Status |
|---|---|
| Email — transactional (Resend) | ⚠️ Zero code. No npm packages. No API keys. |
| Email — lifecycle (ActiveCampaign) | ⚠️ Zero code. Not installed. |
| SMS (Twilio) | ⚠️ Zero code. Not discussed in recent planning. |
| Audio ingestion pipeline (Google Drive → S3) | ⚠️ Zero pipeline code. Manual upload via admin. |
| Castos podcast feed delivery | ⚠️ Zero code. `castos_episode_url` column exists but field is empty. |
| AI embeddings / semantic search | ⚠️ Tables exist, pgvector enabled, zero data. |
| Onboarding flow (first-login) | ✅ Built. `WelcomeModal` activates on `?welcome=1` (set by success page redirect). Strips param after mount. |
| Multi-tier pricing on `/join` page | ✅ Built. 4 tiers rendered. L1 live (Stripe). L2–L4 show "Notify me" until price IDs added to env. |
| Event system (`content_type = 'event'`) | ⚠️ Not an enum value. Events described in product docs but not implemented. |

---

## What's Next (Priority Stack)

1. **Email — transactional** — Resend integration: post-purchase confirmation, magic-link delivery, password-set confirmation
2. **Email — lifecycle** — ActiveCampaign: new member welcome sequence, weekly practice nudge, streak milestones
3. **Tier activation** — Add `STRIPE_PRICE_LEVEL_2/3/4_MONTHLY/ANNUAL` to `.env.local` + Vercel env once prices are finalized to go L2–L4 live
4. **Audio ingestion pipeline** — Google Drive → S3 → Whisper transcription → AI title/description → admin review queue
5. **AI embeddings** — Populate `content_embedding` + `content_chunk` tables; enable semantic search in Library
6. **Event system** — Add `event` to `content_type` enum; build event schedule + RSVP flow for L2+ members

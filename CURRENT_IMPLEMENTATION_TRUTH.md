# Current Implementation Truth

> Verified 2026-04-02 from code inspection + production browser audit. Not aspirational — only what exists and works.

---

## Production-Ready Systems

### Authentication & Access

- **Supabase Auth** — magic link + password login. Fully working.
- **`requireActiveMember()`** — server guard enforcing `subscription_status = 'active'`. Every member page uses it.
- **`requireAdmin()`** — email allowlist guard protecting `/admin`.
- **Auth callback** — `/auth/callback` route handles Supabase OTP exchange.
- **Password nudge** — `PasswordNudgeBanner` prompts magic-link-only members to set a password.

### Stripe Billing

- **Webhook handler** at `/api/webhooks/stripe` — verifies signatures, processes 5 event types.
- **Event handlers** — `checkout.session.completed`, `subscription.created/updated/deleted`, `invoice.payment_failed`.
- **Tier mapping** — canonical `mapTier()` in `handle-subscription.ts` maps 8 env var price IDs → 4 tiers × 2 intervals.
- **Guest checkout** — `create-guest-checkout.ts` for unauthenticated buyers.
- **Billing portal** — Stripe customer portal accessible from `/account`.
- **Join page** — `/join` with monthly/annual toggle, auth gate, check-email screen, value section, guarantee, CTA. **Currently Level 1 pricing only.**

### Today Page (`/today`)

- **Hero section** — radial gradient, time-aware greeting, date label, monthly theme subtitle, streak badge.
- **DailyPracticeCard** — in-card audio player (via MemberAudioProvider), 80% completion tracking, reflection prompt, note button.
- **WeeklyPrincipleCard** — optional audio player, markdown body with CMS preamble dedup, reflection prompt, note button. No video (monthly owns video).
- **MonthlyThemeCard** — Vimeo video embed (lazy-load poster + click-to-play), expandable markdown body with preamble dedup, resources, note button.
- **Video/Audio coordination** — `@vimeo/player` SDK for bidirectional "latest wins" pattern. Playing video pauses audio and vice versa.
- **MonthlyAudioArchive** — inline playlist grouped by month (current month only). Each row has play/pause, scrub bar, skip ±15s, equalizer animation, time remaining. Plays through MemberAudioProvider.
- **WeeklyArchive** — past weeks' reflections this month, collapsed accordion.
- **PersistentAudioPlayer** — hidden on `/today` (in-card player takes over). Visible on all other pages.
- **CMS preamble dedup** — `stripCmsPreamble()` in `lib/content/strip-cms-preamble.ts` strips title+excerpt from body text when the CMS bakes them in.

### Library (`/library`)

- **Full-text search** — FTS with weighted tsvector (title > excerpt > body > transcription).
- **Type filter tabs** — All / Daily / Weekly / Monthly.
- **Pagination** — 20 items/page with Previous/Next.
- **Note indicators** — shows which items have notes.
- **Tier filtering** — queries respect `tier_min` (Level 1 users don't see Level 3+ content).
- **Empty states** — distinct for no results, no search match, end of list.

### My Practice (`/practice`)

- **Stats hero** — streak, listens, notes count in dark card.
- **Heatmap** — 3-state coloring: `on_time` (full teal), `catch_up` (light teal), `none` (gray). 70-day grid with hover tooltips and legend. Data from `activity_event` join to `content.publish_date`.
- **Continue Listening** — resumes last track.
- **Recently Completed** — linked cards with type badges.
- **Suggested Next** — tinted CTA card.
- **Practice Collection tabs** — Daily / Weekly / Monthly with browse cards.
- **Quick Links** — Home, Journal, Account Settings, Coaching (for Level 3+).

### Practice Archive (`/practice/[monthYear]`)

- **Dynamic route** — e.g. `/practice/2026-03`.
- **Monthly archive** — all daily audios, weekly reflections for a given month.
- **Inline playback** — same MonthlyAudioArchive component.

### Coaching (`/coaching`)

- **Tier-gated** — Level 3+ sees content. Level 1/2 sees calm upgrade prompt with CTA → `/join`.
- **Upcoming call** — shows date, time, Zoom join button (server-rendered `<a>` tag from env var, never in client bundle).
- **Replay archive** — past coaching calls with Vimeo embeds.
- **`coaching_call` content type** — lives in unified `content` table.

### Community / Q&A (`/community`)

- **Level 2+ gated** — Level 1 sees upgrade prompt.
- **Weekly thread** — auto-loads current week's principle as discussion context.
- **Post types** — reflection / question / share.
- **Features** — reply threading, likes (optimistic UI), admin pin/answer/delete controls.
- **Feature flag** — nav link controlled by `ENABLE_COMMUNITY_PREVIEW=true`.
- **DB schema** — `community_post` (with `parent_id`, `is_pinned`, `is_admin_answer`) + `community_post_like` table with RLS.

### Journal / Notes (`/journal`)

- **NoteSheet** — slide-over on desktop, bottom sheet on mobile. Opens from content card buttons.
- **Server actions** — `saveNote` (upsert), `getNoteForContent`, `getMemberNotes`.
- **Notes archive** — month grouping, content-type left borders (primary/secondary/accent).
- **Freeform notes** — "New Entry" button opens NoteSheet with `content_id = null`.

### Account (`/account`)

- **Membership status** — elevated card with type indicator.
- **Password management** — set/change password form.
- **Timezone** — select + save.
- **Billing** — link to Stripe customer portal.

### Admin (`/admin`)

- **Content list** — `/admin/content` with type filters and status badges.
- **Content create/edit** — full form with all fields including `tier_min`, `starts_at`, media URL auto-detect, resource links editor.
- **Admin content calendar** — date-based content view.
- **Server actions** — `createContent` / `updateContent`.
- **Layout** — sidebar nav (Overview / Content / Ingestion).

### Audio System

- **MemberAudioProvider** — React context providing global audio state: `playTrack()`, `pause()`, `seekTo()`, `seekBy()`, `togglePlayback()`, `isCurrentTrack()`, `registerVideoPauser()`.
- **S3 audio** — primary audio storage via presigned URLs from `resolveAudioUrl()`.
- **Castos fallback** — `castos_episode_url` as secondary source.
- **PersistentAudioPlayer** — sticky bottom bar with expanded/mini modes. Mini state persists in sessionStorage. Hidden on `/today`.
- **CSS variable sync** — `--member-player-height` set on `.member-shell` for bottom padding coordination.

### Member UI System

- **MemberTopNav** — sticky dark top bar (wordmark + nav links + avatar+name dropdown). Mobile: bottom tab bar with active dot indicators.
- **Avatar** — initials from clean name (strips parenthetical suffixes like "(L1 Test)").
- **Nav links** — Home, Library, Community (feature-flagged), My Practice. Coaching shows for Level 3+.
- **Design tokens** — comprehensive CSS custom properties. Three accent colors: primary (blue/daily), secondary (green/weekly), accent (amber/monthly).
- **Utilities** — `.member-container`, `.member-hero`, `.btn-primary`, `.member-input`, `.surface-card--editorial`.
- **Heading no-wrap** — `.heading-balance` prevents orphan words in headings.

### Database Schema

Core tables with active code:

| Table | Status | Active Code |
|-------|--------|-------------|
| `member` | ✅ | Auth, billing, streak, profile |
| `content` | ✅ | Today queries, library, search, admin CRUD, coaching, archive |
| `journal` | ✅ | Notes from content cards + freeform entries |
| `progress` | ✅ | Listen tracking, heatmap |
| `activity_event` | ✅ | Engagement log (~15 event types), heatmap 3-state computation |
| `community_post` | ✅ | Q&A threading, likes, pins, admin answers |
| `community_post_like` | ✅ | Like tracking with RLS |
| `content_embedding` | ⚠️ Schema only | pgvector enabled, empty |
| `content_chunk` | ⚠️ Schema only | For future RAG |

### Content Type Enum (actual in database)

```
daily_audio | weekly_principle | monthly_theme | library | workshop | coaching_call
```

### Content Table Columns (verified)

```
id, type, title, description, excerpt, body, status, publish_date, week_start, month_year,
tier_min, starts_at, s3_audio_key, castos_episode_url, vimeo_video_id, youtube_video_id,
download_url, reflection_prompt, resource_links, transcription, search_vector, tags,
source, duration_seconds, ai_generated_title, ai_generated_description, join_url,
created_at, updated_at
```

---

## Partial / Scaffolded

| Feature | What Exists | What's Missing |
|---------|-------------|----------------|
| Admin ingestion | Route exists at `/admin/ingestion` | Static placeholder — no pipeline code |
| Multi-tier pricing | Stripe tier mapping works for all 4 levels | `/join` page only renders Level 1 monthly + annual |
| Vector tables | `content_embedding` + `content_chunk` with pgvector | No embedding code, no semantic search |
| AI metadata | `ai_generated_title`, `ai_generated_description` columns | No AI code writes to them |
| Content source | `source` enum (gdrive/vimeo/admin) | All content is `source = 'admin'`. No ingestion pipeline. |
| Video hosting | Vimeo iframes via `VideoEmbed` component | Mux migration planned but not started. No `mux_playback_id` column yet. |

---

## Does Not Exist

| Feature | Notes |
|---------|-------|
| **Mux video integration** | Planned. No `mux_playback_id` column, no `@mux/mux-player-react` installed. |
| **Onboarding flow** | No overlay, no first-login detection, no welcome sequence |
| **Google Drive ingestion** | No code |
| **Transcription pipeline** | No code |
| **AI content generation** | No code |
| **Semantic / vector search** | Only FTS exists |
| **ActiveCampaign integration** | No code |
| **Resend transactional email** | No code |
| **Castos podcast publishing** | No code |
| **Events system** | No code |
| **Error boundaries** | No `error.tsx` or `not-found.tsx` in member area |
| **Courses** | No code, no tables |
| **Mobile app** | No code |

---

## Key Technology Versions

- **Next.js** — App Router (latest)
- **Tailwind CSS** — v4 (CSS variables, not config-based)
- **Supabase** — Project `qdnojizzldilqpyocora`
- **Stripe** — webhook + checkout + portal
- **@vimeo/player** — installed, used for video/audio coordination
- **Vercel** — deployment target, automatic on push to `main`
- **MCP servers configured** — Stripe, Supabase, Vercel, Mux (tools pruned to ~25 VOD essentials)

---

## Sprint Completion History

| Sprint | Focus | Status |
|--------|-------|--------|
| 1–4 | Foundation: Auth, Today, Library, Journal, Admin | ✅ Complete |
| 5–6 | Media: video embeds, resource links, search polish | ✅ Complete |
| 7–8 | UI system: premium nav, hero, engagement tracking | ✅ Complete |
| 9 | Member UI: responsive layout, typed cards | ✅ Complete |
| 10 | Tier gating, coaching, journal new entry, admin coaching | ✅ Complete |
| 11 | Visual cohesion: `.member-hero`, `.btn-primary`, `.member-input`, hero standardization | ✅ Complete |
| Post-11 | Homepage redesign, Community Q&A, `/today` living document, inline audio, archive, video/audio coordination, heatmap 3-state, CMS dedup | ✅ Complete |
